package com.ivan.mibiblioteca

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
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
import androidx.documentfile.provider.DocumentFile
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
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
    private var cbCarpeta: String? = null
    private var cbRafaga: String? = null
    private var tengoRafaga: ArrayList<String> = ArrayList()
    private val prefs by lazy { getSharedPreferences("copia", MODE_PRIVATE) }
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
                cbRafaga?.let { resolver(it, null); cbRafaga = null }
            }
        }

    private val rafaga =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
            val cb = cbRafaga ?: return@registerForActivityResult
            cbRafaga = null
            val lista = r.data?.getStringArrayListExtra("codigos") ?: arrayListOf()
            resolver(cb, JSONArray(lista).toString())
        }

    private val elegirCarpeta =
        registerForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
            val cb = cbCarpeta ?: return@registerForActivityResult
            cbCarpeta = null
            if (uri == null) { resolver(cb, null); return@registerForActivityResult }
            try {
                contentResolver.takePersistableUriPermission(uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            } catch (e: Exception) { resolver(cb, "error"); return@registerForActivityResult }
            // Suelta la carpeta anterior, si había otra
            prefs.getString("carpeta", null)?.let { vieja ->
                if (vieja != uri.toString()) try {
                    contentResolver.releasePersistableUriPermission(Uri.parse(vieja),
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                } catch (_: Exception) { }
            }
            prefs.edit().putString("carpeta", uri.toString()).apply()
            hilos.execute { resolver(cb, if (copiaAutomatica(forzar = true)) "ok" else "error") }
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

    private var textoPendiente: String? = null
    private val crearCsv =
        registerForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
            val cb = cbCopia ?: return@registerForActivityResult
            cbCopia = null
            val texto = textoPendiente; textoPendiente = null
            if (uri == null || texto == null) { resolver(cb, null); return@registerForActivityResult }
            hilos.execute {
                val ok = try {
                    contentResolver.openOutputStream(uri)!!.use { it.write(texto.toByteArray(Charsets.UTF_8)) }; true
                } catch (e: Exception) { false }
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

    /** Al salir de la app, si ha habido cambios, se guarda la copia del día en la carpeta elegida. */
    override fun onStop() {
        super.onStop()
        if (prefs.getBoolean("pendiente", false) && prefs.getString("carpeta", null) != null) {
            hilos.execute { copiaAutomatica(forzar = false) }
        }
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
        contentResolver.openOutputStream(uri, "wt")!!.use { salida ->
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

    private val bloqueoCopia = Any()

    /** Escribe mi-biblioteca-AAAA-MM-DD.json en la carpeta elegida y conserva solo las 7 últimas. */
    private fun copiaAutomatica(forzar: Boolean): Boolean = synchronized(bloqueoCopia) {
        val carpeta = prefs.getString("carpeta", null) ?: return false
        if (!forzar && !prefs.getBoolean("pendiente", false)) return true
        try {
            val arbol = DocumentFile.fromTreeUri(this, Uri.parse(carpeta))
            if (arbol == null || !arbol.canWrite()) { prefs.edit().putBoolean("sinAcceso", true).apply(); return false }
            val hoy = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            val nombre = "mi-biblioteca-$hoy.json"
            val archivo = arbol.findFile(nombre) ?: arbol.createFile("application/json", nombre) ?: return false
            prefs.edit().putBoolean("pendiente", false).apply()
            escribirCopia(archivo.uri)
            arbol.listFiles()
                .filter { (it.name ?: "").matches(Regex("mi-biblioteca-\\d{4}-\\d{2}-\\d{2}\\.json")) }
                .sortedByDescending { it.name }
                .drop(7)
                .forEach { it.delete() }
            prefs.edit().putLong("ultima", System.currentTimeMillis()).putBoolean("sinAcceso", false).apply()
            true
        } catch (e: Exception) {
            prefs.edit().putBoolean("pendiente", true).apply()
            false
        }
    }

    private fun infoCopia(): String {
        val carpeta = prefs.getString("carpeta", null)
        var nombre = ""
        var acceso = false
        if (carpeta != null) {
            val uri = Uri.parse(carpeta)
            acceso = contentResolver.persistedUriPermissions.any { it.uri == uri && it.isWritePermission }
            nombre = try { DocumentFile.fromTreeUri(this, uri)?.name ?: "" } catch (e: Exception) { "" }
        }
        return JSONObject()
            .put("activa", carpeta != null && acceso)
            .put("carpeta", nombre)
            .put("ultima", prefs.getLong("ultima", 0))
            .put("pendiente", prefs.getBoolean("pendiente", false))
            .toString()
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
        fun saveData(json: String): Boolean = synchronized(this) {
            val ok = guardarDatos(json)
            if (ok) prefs.edit().putBoolean("pendiente", true).apply()
            ok
        }

        // ----- Copia automática -----
        @JavascriptInterface
        fun backupInfo(): String = infoCopia()

        @JavascriptInterface
        fun chooseBackupFolder(cb: String) {
            principal.post { cbCarpeta = cb; elegirCarpeta.launch(null) }
        }

        @JavascriptInterface
        fun backupNow(cb: String) {
            hilos.execute { resolver(cb, if (copiaAutomatica(forzar = true)) "ok" else "error") }
        }

        @JavascriptInterface
        fun disableBackup() {
            prefs.getString("carpeta", null)?.let {
                try {
                    contentResolver.releasePersistableUriPermission(Uri.parse(it),
                        Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                } catch (_: Exception) { }
            }
            prefs.edit().remove("carpeta").remove("ultima").apply()
        }

        // ----- Escaneo en ráfaga -----
        @JavascriptInterface
        fun scanBurst(cb: String, tengoJson: String) {
            principal.post {
                cbRafaga = cb
                tengoRafaga = try {
                    val a = JSONArray(tengoJson); ArrayList((0 until a.length()).map { a.getString(it) })
                } catch (e: Exception) { ArrayList() }
                conCamara {
                    rafaga.launch(Intent(this@MainActivity, EscanerRafaga::class.java)
                        .putStringArrayListExtra("tengo", tengoRafaga))
                }
            }
        }

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
        fun exportCsv(cb: String, nombre: String, texto: String) {
            principal.post { cbCopia = cb; textoPendiente = texto; crearCsv.launch(nombre) }
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
