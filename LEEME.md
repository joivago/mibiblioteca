# Mi biblioteca

App Android para gestionar tu colección de libros: estantería con portadas o lomos,
ficha con sinopsis y datos, leído/pendiente, puntuación con medias estrellas y reseña.

## Compilar (igual que tus otras apps)

1. Crea un repositorio en GitHub (mejor privado) y sube **todo el contenido** de esta carpeta,
   incluida la carpeta oculta `.github`.
2. GitHub compila solo al subir. Ve a la pestaña **Actions**, entra en la última ejecución
   de «Compilar APK» y descarga **MiBiblioteca-APK** (abajo, en *Artifacts*).
3. Descomprime el zip y abre `MiBiblioteca.apk` en el móvil para instalarla.

Las versiones nuevas se instalan encima de la anterior sin perder los libros, porque la
app va firmada siempre con la misma clave (`app/mibiblioteca.jks`). No borres ese archivo.

## Dónde se cambia cada cosa

- `app/src/main/assets/www/estilos-editoriales.js` — colores y diseño de cada editorial.
  También se pueden cambiar desde la propia app: Ajustes → Estilos de editorial.
- `app/src/main/assets/www/estilo.css` — temas de la estantería.
- `app/src/main/assets/www/app.js` — funcionamiento de la interfaz.
- `app/src/main/java/.../MainActivity.kt` — parte nativa: guardar datos, escáner, cámara, copias.

## Datos

Los libros se guardan solo en el móvil. Haz de vez en cuando una copia desde
Ajustes → Guardar copia (incluye portadas y reseñas).
Los datos de los libros vienen de Google Books y Open Library (gratis, sin cuenta).
