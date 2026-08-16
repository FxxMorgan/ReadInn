# Cambios implementados en ReadInn

Fecha de implementación: 15 de agosto de 2026
Fecha de documentación: 16 de agosto de 2026

## Resumen

Esta tanda incorpora las correcciones solicitadas para la API, la web de Next.js y la aplicación Flutter. Los cambios están implementados y verificados localmente, pero todavía no han sido desplegados en el entorno live.

## 1. Portadas con imágenes

Se reemplazó la selección limitada a un color por la posibilidad de elegir una imagen real de portada al crear una obra.

### Web

- Selector de archivo dentro del formulario de creación de obras.
- Vista previa de la portada antes de guardar.
- Posibilidad de cambiar o quitar la imagen seleccionada.
- Validación de formatos JPG, PNG, WebP y GIF.
- Límite de 5 MB por imagen.
- La obra conserva el color de respaldo cuando no tiene una imagen.

### Flutter

- Selección de imágenes desde la galería mediante `image_picker`.
- Vista previa, cambio y eliminación de la portada antes de crear la obra.
- Validación de formato y tamaño máximo de 5 MB.
- Visualización de portadas remotas en explorar, biblioteca, detalle de obra, perfil público, perfil personal y panel del autor.

### API y Cloudflare R2

- Se mantuvo la configuración real de Cloudflare R2 presente en `.env`.
- Se agregó un flujo de carga de imágenes a través de la API para evitar el bloqueo CORS de las cargas directas desde el navegador hacia R2.
- Nuevas operaciones:
  - `POST /v1/media/upload-intent`
  - `PUT /v1/media/:mediaId/upload`
  - `POST /v1/media/:mediaId/confirm`
- La intención de carga ahora devuelve `uploadPath` además de la URL pública.
- El servicio S3/R2 puede recibir el archivo en la API y subirlo al bucket.
- Las imágenes se guardan con `Cache-Control: public, max-age=31536000, immutable`.
- Se corrigió el arranque de la API para leer `.env` antes de inicializar el cliente de almacenamiento.

## 2. Tipografías del lector

La elección de tipografía ahora cambia realmente el texto del capítulo y ofrece más variedad.

### Web

Se agregaron cinco perfiles de lectura:

- Literaria.
- Clásica.
- Humanista.
- Accesible.
- Monoespaciada.

La tipografía, el tamaño del texto y el tema se guardan en `localStorage` para conservar la preferencia del lector.

### Flutter

Se agregaron seis familias:

- Merriweather.
- Lora.
- Libre Baskerville.
- Source Sans 3.
- Atkinson Hyperlegible.
- JetBrains Mono.

La selección y el tamaño de texto se guardan con `SharedPreferences`.

## 3. Descarga de capítulos

- Se agregó `GET /v1/stories/:storyId/chapters/:chapterId/download`.
- La API genera un archivo Markdown con el título y el contenido del capítulo.
- La respuesta incluye `Content-Disposition: attachment` para descargar el archivo.
- La web muestra un botón de descarga en el lector.
- Flutter muestra la opción de descarga tanto en el detalle de la obra como en el menú del lector.
- El proxy de Next.js ahora conserva encabezados necesarios como `Content-Disposition`, `Cache-Control` y `ETag`.

## 4. Perfiles públicos y funciones sociales

Se agregó la posibilidad de entrar al perfil público de otro usuario y consultar su actividad visible.

### Funciones disponibles

- Ver nombre, usuario, biografía y avatar.
- Ver cantidad de seguidores y usuarios seguidos.
- Ver las obras publicadas por el usuario.
- Seguir o dejar de seguir a un usuario.
- Escribir mensajes en su muro.
- Ver los mensajes existentes del muro.
- Abrir perfiles desde nombres de autores en comentarios y publicaciones.

### Rutas nuevas de API

- `GET /v1/users/:username`
- `POST /v1/users/:username/follow`
- `GET /v1/users/:username/wall`
- `POST /v1/users/:username/wall`

### Interfaces nuevas

- Web: `/users/[username]`.
- Flutter: `/users/:username` y pantalla de perfil público.

### Persistencia

Se añadieron las tablas:

- `user_follows`.
- `wall_posts`.
- `chapter_comments`.

La migración correspondiente está en:

`apps/api/prisma/migrations/20260815233000_social_comments_cache/migration.sql`

## 5. Eliminación de capítulos por el autor

- Se agregó `DELETE /v1/me/stories/:storyId/chapters/:chapterId`.
- La API verifica que la obra pertenezca al autor autenticado.
- Al eliminar un capítulo se actualizan las métricas de la obra.
- La web muestra un botón de papelera con confirmación.
- Flutter muestra una acción de eliminación con diálogo de confirmación.
- Se invalida la caché asociada a la obra y al capítulo eliminado.

## 6. Comentarios generales e inline

La web ahora permite comentar en ambos niveles:

- Comentario general al final del capítulo.
- Comentario inline asociado a un párrafo específico.

También se completó el flujo equivalente en Flutter, con hilos por párrafo y comentarios generales.

### API

- `GET /v1/stories/:storyId/chapters/:chapterId/comments`
- `POST /v1/stories/:storyId/chapters/:chapterId/comments`
- Los comentarios pueden incluir `paragraphIndex` para identificar el párrafo.
- Los comentarios se guardan en PostgreSQL cuando la base está disponible.
- Las métricas de la obra incluyen la cantidad real de comentarios.

## 7. Icono y presentación móvil

- El logotipo del encabezado móvil aumentó de 28 × 28 a 38 × 38 píxeles.
- Se actualizó el recurso principal del logo.
- Se actualizaron los iconos Android para densidades `mdpi`, `hdpi`, `xhdpi`, `xxhdpi` y `xxxhdpi`.
- El logo ocupa más espacio dentro de su caja y se distingue mejor en pantallas pequeñas.

## 8. Caché de libros y capítulos

Se implementó una caché híbrida en memoria y disco para el contenido de lectura.

### Contenido almacenado

- Catálogo de obras.
- Detalle de una obra.
- Títulos y sinopsis devueltos por la API.
- Metadatos y contenido de capítulos.
- URLs de portada incluidas en las respuestas.

Las imágenes se mantienen en Cloudflare R2 y aprovechan el caché HTTP de larga duración configurado al subirlas.

### Invalidación

La caché usa etiquetas como:

- `catalog`.
- `story:<storyId>`.
- `chapter:<chapterId>`.

Se invalida automáticamente cuando el autor:

- Crea, edita, publica, archiva o restaura una obra.
- Crea, edita, publica, restaura o elimina un capítulo.

### Variables de entorno

```env
CACHE_ENABLED=true
CACHE_DIR=.cache/readinn
CACHE_TTL_SECONDS=900
```

Si el disco no está disponible, la API continúa consultando PostgreSQL; un fallo de caché no deja los libros inaccesibles.

## Correcciones adicionales

- Se corrigieron solicitudes `POST` vacías de Dio enviando `{}` en las operaciones que lo requieren, como seguir usuarios, likes, biblioteca y publicación.
- Se ampliaron los modelos y tipos compartidos para portadas, comentarios, perfiles públicos, muro y métricas.
- Se añadieron enlaces desde autores y comentarios hacia los perfiles públicos.
- Se preserva un modo fallback con fixtures cuando PostgreSQL no está disponible.
- Las pruebas de API aíslan la comprobación de PostgreSQL para evitar depender de la base real.

## Archivos y módulos principales modificados

### API

- `apps/api/src/modules/media/routes.ts`
- `apps/api/src/modules/media/s3-storage.ts`
- `apps/api/src/modules/social/routes.ts`
- `apps/api/src/modules/stories/routes.ts`
- `apps/api/src/modules/stories/reader-routes.ts`
- `apps/api/src/modules/stories/writer-routes.ts`
- `apps/api/src/modules/stories/story-repository.ts`
- `apps/api/src/modules/stories/writer-repository.ts`
- `apps/api/src/shared/content-cache.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/server.ts`

### Web

- `apps/web/src/app/studio/page.tsx`
- `apps/web/src/app/studio/[storyId]/page.tsx`
- `apps/web/src/app/stories/[storyId]/page.tsx`
- `apps/web/src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`
- `apps/web/src/app/users/[username]/page.tsx`
- `apps/web/src/app/api/readinn/[...path]/route.ts`
- `apps/web/src/components/rich-editor.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/types.ts`
- `apps/web/src/app/globals.css`

### Flutter

- `apps/mobile/lib/screens/create_story_dialog.dart`
- `apps/mobile/lib/screens/public_profile_screen.dart`
- `apps/mobile/lib/screens/reader_screen.dart`
- `apps/mobile/lib/screens/manage_story_screen.dart`
- `apps/mobile/lib/screens/story_detail_screen.dart`
- `apps/mobile/lib/services/api_service.dart`
- `apps/mobile/lib/models/story.dart`
- `apps/mobile/lib/providers/story_providers.dart`
- `apps/mobile/lib/theme/app_theme.dart`
- `apps/mobile/lib/widgets/readinn_widgets.dart`
- `apps/mobile/pubspec.yaml`

## Verificación realizada

- API: 11 de 11 pruebas aprobadas.
- API: compilación TypeScript aprobada.
- Web: typecheck aprobado.
- Web: build de producción aprobado.
- Flutter: pruebas aprobadas.
- Flutter: `flutter analyze` sin incidencias.
- `git diff --check` aprobado.
- Carga real desde la API local hacia Cloudflare R2 verificada.
- Carga mediante el proxy web hacia la API y R2 verificada.
- URLs públicas de los objetos cargados verificadas.
- Los objetos temporales usados durante la prueba fueron eliminados.
- `docker-compose.yml` no conserva cambios accidentales.

## Estado del entorno live

Durante la revisión se comprobó:

- `https://readinn.cypher.cl/api/readinn/health/live`: `200 OK`.
- `https://readinn.cypher.cl/api/readinn/health/ready`: `200 OK`.
- `https://api.cypher.cl/health/live`: `200 OK`.
- `https://api.cypher.cl/health/ready`: `200 OK` y PostgreSQL conectado.

Estos resultados corresponden a la versión actualmente publicada. Los cambios descritos en este documento siguen en el repositorio local y requieren commit, migración y despliegue para aparecer en live.

## Consideraciones antes del despliegue

1. Crear un respaldo de PostgreSQL.
2. Incluir en el commit las migraciones nuevas, los módulos sociales y los archivos de caché.
3. Ejecutar `prisma migrate status` en el VPS antes de `prisma migrate deploy`.
4. No aplicar a ciegas la migración `20260814000000_initial_schema` sobre una base que ya contiene las tablas iniciales. Si la base fue creada previamente mediante `db push`, debe marcarse como aplicada con `prisma migrate resolve --applied 20260814000000_initial_schema`.
5. Aplicar después la migración `20260815233000_social_comments_cache` mediante `prisma migrate deploy`.
6. Mantener en producción las credenciales existentes de Cloudflare R2; MinIO es solamente para desarrollo local.
7. Configurar `CACHE_DIR` en una ruta persistente y escribible por el proceso de la API.
8. Reconstruir y reiniciar primero la API y después la web.
9. Generar un APK nuevo para publicar los cambios de Flutter.
10. La configuración Android todavía firma la build release con la clave de debug; debe configurarse una firma release antes de distribuirla oficialmente.
