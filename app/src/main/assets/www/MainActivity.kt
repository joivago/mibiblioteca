package com.ivan.mibiblioteca

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.JsonReader
import android.util.JsonWriter
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowInsetsControllerCompat
import androidx.exifinterface.media.ExifInterface
import androidx.webkit.WebViewAssetLoader
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import kotlin.math.max
import kotlin.math.roundToInt

private const val AGENTE = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private val hilos = Executors.newFixedThreadPool(3)
    private val principal = Handler(Looper.getMainLooper())

    private val dirPortadas by lazy { File(filesDir, "covers").apply { mkdirs() } }
    private val archivoDatos by lazy { File(filesDir, "biblioteca.json") }

    // Peticiones pendientes (id de la promesa en JavaScript)
    private var cbEscaner: String? = null
    private var cbImagen: String? = null
    private var cbCopia: String? = null
    private var archivoFoto: File? = null
    private var accionTrasPermiso: (() -> Unit)? = null

    // ---------- Lanzadores ----------

    private val permisoCamara =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
            val accion = accionTrasPermiso
            accionTrasPermiso = null
            if (ok) accion?.invoke() else {
                aviso("Sin permiso de cámara no puedo usarla")
                cbEscaner?.let { resolver(it, null); cbEscaner = null }
                cbImagen?.let { resolver(it, null); cbImagen = null }
            }
        }

    private val escaner = registerForActivityResult(ScanContract()) { r ->
        cbEscaner?.let { resolver(it, r.contents) }
        cbEscaner = null
    }

    private val hacerFoto =
        registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
            val cb = cbImagen ?: return@registerForActivityResult
            cbImagen = null
            val f = archivoFoto
            if (ok && f != null && f.length() > 0) procesarImagen(Uri.fromFile(f), cb)
            else resolver(cb, null)
        }

    private val elegirImagen =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            val cb = cbImagen ?: return@registerForActivityResult
            cbImagen = null
            if (uri != null) procesarImagen(uri, cb) else resolver(cb, null)
        }

    private val crearCopia =
        registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
            val cb = cbCopia ?: return@registerForActivityResult
            cbCopia = null
            if (uri == null) { resolver(cb, null); return@registerForActivityResult }
            hilos.execute {
                val ok = try { escribirCopia(uri); true } catch (e: Exception) { false }
                resolver(cb, if (ok) "ok" else "error")
            }
        }

    private val abrirCopia =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            val cb = cbCopia ?: return@registerForActivityResult
            cbCopia = null
            if (uri == null) { resolver(cb, null); return@registerForActivityResult }
            hilos.execute {
                val ok = try { leerCopia(uri) } catch (e: Exception) { false }
                if (ok) principal.post { web.reload() } else resolver(cb, "error")
            }
        }

    // ---------- Arranque ----------

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)

        val cargador = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/covers/", WebViewAssetLoader.InternalStoragePathHandler(this, dirPortadas))
            .build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            mediaPlaybackRequiresUserGesture = true
        }
        web.setBackgroundColor(Color.parseColor("#EADBC3"))
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                cargador.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.host != "appassets.androidplatform.net"
        }
        web.addJavascriptInterface(Puente(), "Android")
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("(window.handleBack && window.handleBack()) ? 'si' : 'no'") { r ->
                    if (r?.contains("si") != true) finish()
                }
            }
        })
    }

    override fun onDestroy() {
        hilos.shutdown()
        super.onDestroy()
    }

    // ---------- Utilidades ----------

    private fun resolver(id: String, valor: String?) {
        val js = "window.__resolve(${JSONObject.quote(id)}, ${if (valor == null) "null" else JSONObject.quote(valor)})"
        principal.post { web.evaluateJavascript(js, null) }
    }

    private fun aviso(texto: String) = principal.post {
        Toast.makeText(this, texto, Toast.LENGTH_SHORT).show()
    }

    private fun conCamara(accion: () -> Unit) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) accion()
        else { accionTrasPermiso = accion; permisoCamara.launch(Manifest.permission.CAMERA) }
    }

    private fun nombreNuevo() = "c_${System.currentTimeMillis()}_${(1000..9999).random()}.jpg"

    /** Reduce la imagen, la gira según la foto y la guarda como portada. Devuelve "covers/xxx.jpg". */
    private fun guardarBitmap(original: Bitmap): String {
        val maxAlto = 1200
        var bmp = original
        if (bmp.height > maxAlto) {
            val ancho = (bmp.width * maxAlto.toFloat() / bmp.height).roundToInt()
            bmp = Bitmap.createScaledBitmap(bmp, max(1, ancho), maxAlto, true)
        }
        val nombre = nombreNuevo()
        File(dirPortadas, nombre).outputStream().use { bmp.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        return "covers/$nombre"
    }

    private fun decodificar(bytes: ByteArray, rotacion: Int = 0): Bitmap? {
        val opc = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, opc)
        if (opc.outWidth <= 0) return null
        var muestra = 1
        while (opc.outHeight / (muestra * 2) >= 1200) muestra *= 2
        val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size,
            BitmapFactory.Options().apply { inSampleSize = muestra }) ?: return null
        if (rotacion == 0) return bmp
        val m = Matrix().apply { postRotate(rotacion.toFloat()) }
        return Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, m, true)
    }

    private fun leerTodo(entrada: InputStream): ByteArray = entrada.use { it.readBytes() }

    private fun procesarImagen(uri: Uri, cb: String) {
        hilos.execute {
            val ruta = try {
                val bytes = leerTodo(contentResolver.openInputStream(uri)!!)
                val rot = try {
                    when (ExifInterface(bytes.inputStream()).getAttributeInt(
                        ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                        ExifInterface.ORIENTATION_ROTATE_90 -> 90
                        ExifInterface.ORIENTATION_ROTATE_180 -> 180
                        ExifInterface.ORIENTATION_ROTATE_270 -> 270
                        else -> 0
                    }
                } catch (e: Exception) { 0 }
                decodificar(bytes, rot)?.let { guardarBitmap(it) }
            } catch (e: Exception) { null }
            archivoFoto?.delete()
            resolver(cb, ruta)
        }
    }

    private fun descargar(url: String): ByteArray? {
        var con: HttpURLConnection? = null
        return try {
            con = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 10000
                readTimeout = 15000
                instanceFollowRedirects = true
                setRequestProperty("User-Agent", AGENTE)
            }
            var codigo = con.responseCode
            var saltos = 0
            // Sigue redirecciones entre dominios (Open Library manda a archive.org)
            while ((codigo == 301 || codigo == 302 || codigo == 303 || codigo == 307 || codigo == 308) && saltos < 5) {
                val destino = con!!.getHeaderField("Location") ?: break
                con.disconnect()
                con = (URL(URL(url), destino).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 10000; readTimeout = 15000
                    setRequestProperty("User-Agent", AGENTE)
                }
                codigo = con.responseCode
                saltos++
            }
            if (codigo != 200) null else leerTodo(con!!.inputStream)
        } catch (e: Exception) { null } finally { con?.disconnect() }
    }

    // ---------- Copia de seguridad ----------

    private fun escribirCopia(uri: Uri) {
        contentResolver.openOutputStream(uri)!!.use { salida ->
            JsonWriter(OutputStreamWriter(salida, Charsets.UTF_8)).use { w ->
                w.beginObject()
                w.name("app").value("mibiblioteca")
                w.name("version").value(1)
                w.name("data").value(if (archivoDatos.exists()) archivoDatos.readText() else "")
                w.name("covers").beginObject()
                dirPortadas.listFiles()?.forEach { f ->
                    w.name(f.name).value(Base64.encodeToString(f.readBytes(), Base64.NO_WRAP))
                }
                w.endObject()
                w.endObject()
            }
        }
    }

    private fun leerCopia(uri: Uri): Boolean {
        var datos: String? = null
        val portadas = mutableMapOf<String, ByteArray>()
        var esNuestra = false
        contentResolver.openInputStream(uri)!!.use { entrada ->
            JsonReader(InputStreamReader(entrada, Charsets.UTF_8)).use { r ->
                r.beginObject()
                while (r.hasNext()) {
                    when (r.nextName()) {
                        "app" -> esNuestra = r.nextString() == "mibiblioteca"
                        "data" -> datos = r.nextString()
                        "covers" -> {
                            r.beginObject()
                            while (r.hasNext()) {
                                val nombre = File(r.nextName()).name // sin rutas
                                portadas[nombre] = Base64.decode(r.nextString(), Base64.DEFAULT)
                            }
                            r.endObject()
                        }
                        else -> r.skipValue()
                    }
                }
                r.endObject()
            }
        }
        val d = datos
        if (!esNuestra || d.isNullOrBlank()) return false
        JSONObject(d) // comprueba que es válido antes de borrar nada
        dirPortadas.listFiles()?.forEach { it.delete() }
        portadas.forEach { (n, b) -> File(dirPortadas, n).writeBytes(b) }
        guardarDatos(d)
        return true
    }

    private fun guardarDatos(json: String): Boolean = try {
        val tmp = File(filesDir, "biblioteca.tmp")
        tmp.writeText(json)
        if (!tmp.renameTo(archivoDatos)) { archivoDatos.writeText(json); tmp.delete() }
        true
    } catch (e: Exception) { false }

    // ---------- Puente con la interfaz ----------

    inner class Puente {

        @JavascriptInterface
        fun loadData(): String = if (archivoDatos.exists()) archivoDatos.readText() else ""

        @JavascriptInterface
        fun saveData(json: String): Boolean = synchronized(this) { guardarDatos(json) }

        @JavascriptInterface
        fun toast(texto: String) { aviso(texto) }

        @JavascriptInterface
        fun setBarColor(hex: String, clara: Boolean) {
            principal.post {
                try {
                    val c = Color.parseColor(hex)
                    window.statusBarColor = c
                    window.navigationBarColor = c
                    WindowInsetsControllerCompat(window, window.decorView).apply {
                        isAppearanceLightStatusBars = clara
                        isAppearanceLightNavigationBars = clara
                    }
                } catch (_: Exception) { }
            }
        }

        /** Prueba las direcciones en orden y guarda la primera portada válida. */
        @JavascriptInterface
        fun downloadCover(cb: String, urlsJson: String) {
            hilos.execute {
                var ruta: String? = null
                try {
                    val urls = JSONArray(urlsJson)
                    for (i in 0 until urls.length()) {
                        val bytes = descargar(urls.getString(i)) ?: continue
                        if (bytes.size < 1500) continue
                        val bmp = decodificar(bytes) ?: continue
                        if (bmp.width < 50 || bmp.height < 70) continue
                        ruta = guardarBitmap(bmp)
                        break
                    }
                } catch (_: Exception) { }
                resolver(cb, ruta)
            }
        }

        /** Descarga una página de todostuslibros.com (la web no deja leerla desde la interfaz). */
        @JavascriptInterface
        fun httpGet(cb: String, url: String) {
            hilos.execute {
                val host = try { URL(url).host } catch (e: Exception) { "" }
                val texto = if (host == "todostuslibros.com" || host.endsWith(".todostuslibros.com"))
                    descargar(url)?.toString(Charsets.UTF_8) else null
                resolver(cb, texto)
            }
        }

        @JavascriptInterface
        fun deleteCover(ruta: String) {
            val f = File(dirPortadas, File(ruta).name)
            if (f.exists()) f.delete()
        }

        @JavascriptInterface
        fun scanBarcode(cb: String) {
            principal.post {
                cbEscaner = cb
                conCamara {
                    escaner.launch(ScanOptions().apply {
                        setDesiredBarcodeFormats(ScanOptions.EAN_13, ScanOptions.EAN_8, ScanOptions.UPC_A)
                        setPrompt("Apunta al código de barras de la contraportada")
                        setBeepEnabled(true)
                        setOrientationLocked(true)
                        setCaptureActivity(EscanerVertical::class.java)
                    })
                }
            }
        }

        @JavascriptInterface
        fun takePhoto(cb: String) {
            principal.post {
                cbImagen = cb
                conCamara {
                    val dir = File(cacheDir, "fotos").apply { mkdirs() }
                    val f = File(dir, "foto_${System.currentTimeMillis()}.jpg")
                    archivoFoto = f
                    val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", f)
                    hacerFoto.launch(uri)
                }
            }
        }

        @JavascriptInterface
        fun pickImage(cb: String) {
            principal.post { cbImagen = cb; elegirImagen.launch("image/*") }
        }

        @JavascriptInterface
        fun exportBackup(cb: String, nombre: String) {
            principal.post { cbCopia = cb; crearCopia.launch(nombre) }
        }

        @JavascriptInterface
        fun importBackup(cb: String) {
            principal.post { cbCopia = cb; abrirCopia.launch(arrayOf("application/json", "application/octet-stream", "text/plain", "*/*")) }
        }

        /** Para recortar: guarda una imagen ya preparada por la interfaz (data URL JPEG). */
        @JavascriptInterface
        fun saveCoverData(dataUrl: String): String? = try {
            val b64 = dataUrl.substringAfter(",")
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            decodificar(bytes)?.let { guardarBitmap(it) }
        } catch (e: Exception) { null }
    }
}
