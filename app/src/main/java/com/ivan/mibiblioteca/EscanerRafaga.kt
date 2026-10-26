package com.ivan.mibiblioteca

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.BeepManager
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory

/**
 * Escáner continuo: se van leyendo códigos de barras uno detrás de otro
 * y al pulsar «Terminar» se devuelven todos a la app.
 */
class EscanerRafaga : ComponentActivity() {

    private lateinit var vista: DecoratedBarcodeView
    private lateinit var beep: BeepManager
    private lateinit var contador: TextView
    private lateinit var ultimo: TextView
    private val codigos = LinkedHashSet<String>()
    private var tengo: Set<String> = emptySet()
    private var ultimoAviso = ""

    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        tengo = intent.getStringArrayListExtra("tengo")?.toSet() ?: emptySet()
        beep = BeepManager(this).apply { isBeepEnabled = true; isVibrateEnabled = false }

        vista = DecoratedBarcodeView(this)
        vista.barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.EAN_13))
        vista.statusView?.visibility = View.GONE
        vista.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult) { recibido(result.text ?: "") }
        })

        val raiz = FrameLayout(this)
        raiz.setBackgroundColor(Color.BLACK)
        raiz.addView(vista, FrameLayout.LayoutParams(-1, -1))

        val ayuda = TextView(this).apply {
            text = "Pasa los libros uno tras otro por delante de la cámara"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
            gravity = Gravity.CENTER
            setPadding(dp(20f), dp(14f), dp(20f), dp(14f))
            setBackgroundColor(0x99000000.toInt())
        }
        raiz.addView(ayuda, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20f), dp(16f), dp(20f), dp(20f))
            setBackgroundColor(0xE6141414.toInt())
        }
        contador = TextView(this).apply {
            text = "Ningún libro escaneado"
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 21f)
            typeface = Typeface.DEFAULT_BOLD
        }
        ultimo = TextView(this).apply {
            text = "Cuando oigas el pitido, pasa al siguiente"
            setTextColor(0xFFCFCFCF.toInt())
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14.5f)
            setPadding(0, dp(4f), 0, dp(14f))
        }
        val boton = Button(this).apply {
            text = "Terminar"
            isAllCaps = false
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply { cornerRadius = dp(14f).toFloat(); setColor(0xFF9A5B2C.toInt()) }
            setOnClickListener { terminar() }
        }
        panel.addView(contador)
        panel.addView(ultimo)
        panel.addView(boton, LinearLayout.LayoutParams(-1, dp(54f)))
        raiz.addView(panel, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))

        // Respeta la barra de estado y la de navegación
        ViewCompat.setOnApplyWindowInsetsListener(raiz) { _, ins ->
            val b = ins.getInsets(WindowInsetsCompat.Type.systemBars())
            ayuda.setPadding(dp(20f), dp(14f) + b.top, dp(20f), dp(14f))
            panel.setPadding(dp(20f), dp(16f), dp(20f), dp(20f) + b.bottom)
            ins
        }
        setContentView(raiz)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() = terminar()
        })
    }

    private fun recibido(texto: String) {
        val c = texto.filter { it.isDigit() }
        if (c.length != 13 || !(c.startsWith("978") || c.startsWith("979"))) {
            if (c != ultimoAviso) { ultimoAviso = c; ultimo.text = "Ese código no es de un libro (busca el que empieza por 978)" }
            return
        }
        if (c in codigos) return
        if (c in tengo) {
            if (c != ultimoAviso) { ultimoAviso = c; ultimo.text = "Ese ya está en tu estantería ($c)" }
            return
        }
        codigos.add(c)
        ultimoAviso = c
        beep.playBeepSoundAndVibrate()
        val n = codigos.size
        contador.text = if (n == 1) "1 libro escaneado" else "$n libros escaneados"
        ultimo.text = "Último: $c"
    }

    private fun terminar() {
        setResult(RESULT_OK, Intent().putStringArrayListExtra("codigos", ArrayList(codigos)))
        finish()
    }

    override fun onResume() { super.onResume(); vista.resume() }
    override fun onPause() { super.onPause(); vista.pause() }
}
