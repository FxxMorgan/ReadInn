# **MVP: Alternativa Independiente para Lectores y Escritores (V2)**

Documento de especificación para el Minimum Viable Product (MVP) de una plataforma de lectura y escritura orientada a ofrecer una experiencia limpia, personalizable y justa. Desarrollada en Flutter.

## **1\. Visión General y Alcance**

El objetivo no es competir uno a uno con gigantes del sector, sino capturar un nicho de usuarios desencantados con la publicidad invasiva y la falta de transparencia. El sistema prioriza una interfaz de lectura inmersiva y un panel de control empoderador para los creadores de contenido.

## **2\. Arquitectura y Tech Stack Sugerido**

> * **Frontend Móvil/Web:** Flutter (permite compilar para Android, iOS y Web con una sola base de código).  
> * **Backend:** Node.js con PostgreSQL.  
> * **Almacenamiento (Storage):** Buckets para portadas de libros y avatares de perfil (comprimidos y optimizados).  
> * **Estado de la App:** Riverpod o BLoC para manejar el estado de la lectura y las preferencias del usuario sin caídas de rendimiento.

## **3\. Backend (Node.js)**

### **Auth & Seguridad**

> * \[ \] **Registro / Login** con JWT (access \+ refresh tokens).  
> * \[ \] **Hash de contraseñas** con bcrypt.  
> * \[ \] **Middleware de autenticación** para proteger rutas privadas.  
> * \[ \] **Roles**: reader, writer, admin.  
> * \[ \] **Validación de inputs** (Joi o Zod) en todos los endpoints.  
> * \[ \] **Rate limiting** (express-rate-limit / @fastify/rate-limit).

### **API Endpoints**

> * \[ \] POST /auth/register y POST /auth/login  
> * \[ \] GET /auth/me (perfil del usuario logueado)  
> * \[ \] GET /stories (listado público con filtros: género, reciente, popular)  
> * \[ \] GET /stories/:id (detalle de obra \+ capítulos publicados)  
> * \[ \] POST /stories (crear obra, solo escritores)  
> * \[ \] PUT /stories/:id (editar metadatos de obra)  
> * \[ \] POST /stories/:id/chapters (crear capítulo)  
> * \[ \] PUT /stories/:id/chapters/:chapterId (editar capítulo)  
> * \[ \] DELETE /stories/:id/chapters/:chapterId (borrador, no borrar publicados)  
> * \[ \] GET /stories/:id/chapters/:chapterId (contenido del capítulo)  
> * \[ \] POST /reading-log (registrar progreso: tiempo, completado)  
> * \[ \] GET /library (obras guardadas del lector)  
> * \[ \] POST /library/:storyId (guardar/quitar de biblioteca)  
> * \[ \] POST /follows/:authorId (seguir/dejar de seguir autor)  
> * \[ \] GET /dashboard/metrics (métricas del escritor logueado)  
> * \[ \] GET /dashboard/metrics/:storyId (métricas por obra)  
> * \[ \] POST /reports (reportar contenido inapropiado)

### **Lógica de Métricas (Dashboard del Escritor)**

> * \[ \] **Vistas por capítulo** (COUNT de reading\_logs WHERE chapter\_id \= X)  
> * \[ \] **Lectores únicos por capítulo** (COUNT DISTINCT user\_id)  
> * \[ \] **Tasa de retención** (usuarios que leyeron capítulo N y también N+1)  
> * \[ \] **Tiempo promedio de lectura** por capítulo  
> * \[ \] **Total de seguidores** del autor  
> * \[ \] **Obras más populares** del escritor

### **Storage / Archivos**

> * \[ \] **Endpoint de subida de imágenes** (portadas y avatares)  
> * \[ \] **Compresión de imágenes** con Sharp (redimensionar a 800x1200px máx, WebP)  
> * \[ \] **Validación:** solo imágenes, máximo 2MB  
> * \[ \] **Almacenamiento local** (en disco del servidor) o bucket

### **Caché & Performance**

> * \[ \] **Caché en memoria** (node-cache o Redis) para capítulos publicados, listado de obras populares, perfiles de usuario.  
> * \[ \] **Paginación** en todos los listados (?page=1\&limit=20)

## **4\. Base de Datos (PostgreSQL)**

| Tabla | Campos Adicionales / Nuevos   |
| :---- | :---- |
| Users | password\_hash, avatar\_url, bio, role, created\_at, updated\_at, is\_verified |
| Stories | genre, status, word\_count, views\_count, is\_mature |
| Chapters | status, word\_count, is\_premium |
| Genres | id, name, slug (Relación muchos-a-muchos: story\_genres) |
| Follows | id, follower\_id, following\_id, created\_at |
| Library | id, user\_id, story\_id, created\_at |
| Comments | id, user\_id, story\_id, chapter\_id, content, created\_at, updated\_at |
| Reports | id, reporter\_id, story\_id, chapter\_id, reason, status, created\_at |
| Reading\_Logs | progress\_percentage, last\_position |

## **5\. Frontend (Flutter)**

### **Módulo del Lector**

> * \[ \] **Pantalla de Explorar/Inicio:** Listado de obras recientes, Filtro por género, Búsqueda básica por título/autor.  
> * \[ \] **Pantalla de Detalle de Obra:** Portada, sinopsis, autor, género, estado, Lista de capítulos publicados, Botón "Guardar en biblioteca", Botón "Seguir autor".  
> * \[ \] **Visualizador de Lectura:** Tipografía: Serif, Sans Serif, OpenDyslexic, Slider de tamaño de fuente, Temas: Claro, Oscuro, Sepia, Ajuste de interlineado (lineHeight), Guardar preferencias localmente (SharedPreferences / Hive), Marcador automático (enviar reading\_log al backend), Botón "Continuar donde lo dejé".  
> * \[ \] **Biblioteca Personal:** Grid/lista de obras guardadas, Indicador de "nuevo capítulo", Botón de eliminar de biblioteca.  
> * \[ \] **Perfil de Autor (vista pública):** Avatar, bio, lista de obras publicadas, Botón de seguir, Link de donaciones (crypto o PayPal/Ko-fi).

### **Módulo del Escritor**

> * \[ \] **Pantalla "Mis Obras":** Lista de obras del escritor logueado, Estado de cada una (borrador / publicada), Contador de capítulos.  
> * \[ \] **Crear/Editar Obra:** Formulario: título, sinopsis, género, portada, Selector de género (dropdown con los de la DB), Toggle is\_mature.  
> * \[ \] **Editor de Capítulos:** Campo de título, Campo de contenido (texto plano o enriquecido básico), Guardar como borrador, Publicar capítulo (cambia status a 'published'), Vista previa antes de publicar.  
> * \[ \] **Dashboard de Métricas:** Gráfico de vistas por capítulo (fl\_chart o similar), Tabla de retención (capítulo 1 → 2 → 3), Tiempo promedio de lectura, Total de seguidores, Período de filtro (últimos 7 días, 30 días, todo).

### **Sistema de Navegación & UI Base**

> * \[ \] **BottomNavigationBar** o Drawer con: Inicio, Explorar, Biblioteca, Escritor (si aplica), Perfil.  
> * \[ \] **Pantalla de Login/Registro**  
> * \[ \] **Pantalla de Perfil de Usuario:** Editar avatar, username, bio, Configuración de lectura, Cerrar sesión.  
> * \[ \] **Manejo de estados de carga** (skeletons / spinners)  
> * \[ \] **Manejo de errores** (snackbars con mensajes claros)  
> * \[ \] **Modo offline básico:** cachear capítulos leídos recientemente en SQLite/Hive.

## **6\. Monetización & Donaciones**

> * \[ \] **Integración de pasarela de pagos** (Stripe o PayPal) para donaciones a escritores y mensuales a la plataforma.  
> * \[ \] **Lógica de comisión del 10%** en el backend (separar 10% para plataforma, 90% para escritor, Registrar transacciones en tabla donations).  
> * \[ \] **Nueva tabla: Donations:** id, donor\_id, recipient\_id (autor o plataforma), amount, platform\_fee, net\_amount, status, created\_at.  
> * \[ \] **Página/Widget de "Apoyar la plataforma":** Explicación transparente de para qué se usa el dinero, Lista de supporters.  
> * \[ \] **Campo de perfil para donaciones del autor:** crypto\_address, paypal\_email o kofi\_link.

## **7\. Moderación & Legal**

> * \[ \] **Flujo de revisión de obras:** Al crear obra (draft), Al "publicar" (pending o published).  
> * \[ \] **Botón de reporte** en cada obra y capítulo.  
> * \[ \] **Panel simple de moderación:** Ver reportes abiertos, Cambiar status de obra a 'archived'.  
> * \[ \] **Términos de Servicio** (ToS) básicos.  
> * \[ \] **Política de Privacidad** básica.  
> * \[ \] **Etiquetado de contenido maduro** (is\_mature) con advertencia previa.

## **8\. Infraestructura & DevOps**

> * \[ \] **PM2** (o similar) para mantener el proceso de Node vivo.  
> * \[ \] **Nginx** como reverse proxy (SSL con Let's Encrypt, Compresión gzip).  
> * \[ \] **Backups automáticos** de PostgreSQL (cron diario).  
> * \[ \] **Logs estructurados** (Winston o Pino) en el backend.  
> * \[ \] **Variables de entorno** (.env) para secrets (JWT\_SECRET, DB\_URL, etc.).  
> * \[ \] **Docker** (opcional, recomendado para portabilidad).

## **9\. Fases de Desarrollo (Orden Sugerido)**

> 1. **Fase 1: Fundación (Semana 1-2):** Auth completo, CRUD de obras y capítulos, Visualizador de lectura básico, Subida de portadas.  
> 2. **Fase 2: Experiencia del Lector (Semana 3):** Pantalla de explorar, Biblioteca personal, Seguir autores, Sistema de lectura con preferencias.  
> 3. **Fase 3: Escritor y Métricas (Semana 4):** Dashboard de métricas, Editor de capítulos funcional, Vista previa.  
> 4. **Fase 4: Social & Moderación (Semana 5):** Comentarios/reviews, Sistema de reportes, Moderación manual.  
> 5. **Fase 5: Monetización (Semana 6):** Integración de donaciones, Comisión del 10%, Campo de perfil para links.

## **Bonus: Después del MVP**

> * \[ \] Notificaciones push  
> * \[ \] Algoritmo de recomendación  
> * \[ \] Sistema de mensajería entre lectores y escritores  
> * \[ \] Capítulos de pago / suscripción premium  
> * \[ \] App nativa de escritorio  
> * \[ \] Traducción automática de obras  
> * \[ \] Foros o comunidades por obra  
> * \[ \] Modo "sin conexión" avanzado