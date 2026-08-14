# Guía de implementación de ReadInn

**Versión:** 1.0  
**Documento fuente revisado:** `Documento de Definición_ MVP - Alternativa a Wattpad (Flutter) V2.md`  
**Estado:** guía técnica y de producto para iniciar el proyecto desde cero  
**Plataformas objetivo iniciales:** Android y Web responsive  
**Plataformas posteriores:** iOS y escritorio  

---

## 1. Propósito de esta guía

Esta guía convierte la especificación funcional V2 en un plan implementable. Define qué construir, en qué orden, con qué arquitectura, cómo comprobar que cada parte funciona y qué condiciones deben cumplirse antes de avanzar desde el MVP hacia funciones de crecimiento y monetización.

No reemplaza los documentos legales, el diseño visual final ni las decisiones comerciales. Sí debe actuar como referencia principal para:

- planificación de producto;
- diseño de base de datos y API;
- estructura del backend y la aplicación Flutter;
- seguridad, pruebas, despliegue y observabilidad;
- definición de entregables y criterios de aceptación;
- priorización posterior al MVP.

### 1.1 Supuestos de partida

1. El repositorio aún no contiene código.
2. El equipo puede ser una persona o un equipo pequeño de dos a cuatro integrantes.
3. El presupuesto inicial es limitado y se priorizan servicios administrados de bajo costo.
4. El producto debe poder evolucionar sin rediseñar por completo autenticación, publicación, progreso de lectura o métricas.
5. El contenido inicial será texto con formato limitado, no un editor editorial completo.
6. El lanzamiento inicial será para una comunidad controlada o beta, no para tráfico masivo.
7. El idioma inicial de la interfaz será español, dejando preparada la internacionalización.

---

## 2. Revisión crítica de la especificación V2

### 2.1 Fortalezas

La especificación original tiene una dirección de producto coherente:

- identifica un nicho concreto: lectores y escritores que buscan una experiencia limpia y transparente;
- da prioridad a la experiencia de lectura;
- incluye herramientas útiles para autores;
- reconoce desde el inicio necesidades de seguridad, moderación y operación;
- propone una tecnología razonable para un equipo pequeño;
- incorpora una evolución posterior al MVP.

### 2.2 Vacíos que deben resolverse antes de programar

| Área | Vacío original | Decisión de esta guía |
|---|---|---|
| Alcance | El MVP mezcla lectura, analítica avanzada, social, pagos y moderación completa | Separar MVP núcleo, beta pública, crecimiento y monetización |
| Roles | `reader`, `writer`, `admin` parecen excluyentes | Un usuario puede leer y escribir; `admin` es un privilegio adicional |
| Publicación | No se define el ciclo exacto de estados | Definir estados y transiciones de obras y capítulos |
| Borrado | Se indica no borrar publicados, pero no se define archivado o retiro | Usar borrado lógico y estados `unpublished`/`archived` |
| Métricas | `reading_logs` mezcla progreso, vistas y tiempo | Separar progreso actual de eventos analíticos |
| Vistas | No se define qué cuenta como una vista | Contabilizar una vista válida con reglas anti-duplicación |
| Retención | La fórmula es conceptual, no operacional | Definir cohortes por lector y secuencia de capítulos publicados |
| Comentarios | La tabla existe, pero faltan endpoints y reglas | Diferir comentarios hasta después del MVP núcleo |
| Pagos | No se consideran KYC, disputas, impuestos ni webhooks | Diferir pagos nativos; comenzar con enlaces externos de apoyo |
| Archivos | Se permite disco local o bucket sin criterio | Bucket S3 compatible en producción; MinIO/local solo en desarrollo |
| API | Faltan formatos de error, paginación, idempotencia y versionado | Estándares transversales definidos en esta guía |
| Offline | No se define sincronización ni conflictos | MVP: caché de lectura; post-MVP: descargas y cola de sincronización |
| Privacidad | Métricas y logs no tienen política de retención | Minimización, agregación y retención explícita |
| Calendario | Seis semanas es muy agresivo para una persona | Estimación realista por capacidad y puertas de calidad |

### 2.3 Alcance recomendado

#### MVP núcleo

El MVP debe validar tres hipótesis:

1. Los lectores valoran una experiencia de lectura personalizable y regresan a continuar obras.
2. Los escritores pueden publicar sin fricción y entienden el desempeño básico de sus capítulos.
3. Existe suficiente interacción entre publicación, descubrimiento y lectura para sostener una beta.

Incluye:

- registro, inicio de sesión, cierre de sesión y recuperación de contraseña;
- perfil básico;
- creación y edición de obras;
- creación, edición, previsualización, publicación y retiro de capítulos;
- exploración, búsqueda básica y filtros;
- detalle de obra y perfil público de autor;
- lector personalizable;
- progreso de lectura y “continuar leyendo”;
- biblioteca personal;
- seguimiento de autores;
- métricas básicas y confiables para escritores;
- enlaces externos de donación en el perfil del autor;
- reporte de contenido;
- moderación administrativa mínima;
- caché local de capítulos abiertos recientemente;
- despliegue, backups, logs y monitoreo esenciales.

#### Fuera del MVP núcleo

- comentarios y reseñas;
- pagos procesados por la plataforma;
- comisión del 10 %;
- algoritmo personalizado de recomendación;
- mensajería privada;
- capítulos premium;
- suscripciones;
- foros;
- traducción automática;
- sincronización offline completa;
- aplicación de escritorio;
- editor enriquecido complejo;
- notificaciones push segmentadas.

Estos elementos no se descartan. Se incorporan en la hoja de ruta posterior con condiciones de entrada.

---

## 3. Objetivos, métricas y límites de producto

### 3.1 Métrica principal del MVP

**Lectores activos semanales que completan al menos un capítulo o avanzan de forma significativa en una obra.**

Esta métrica evita optimizar solo registros o aperturas accidentales.

### 3.2 Métricas de validación

| Métrica | Definición inicial | Señal saludable para una beta pequeña |
|---|---|---|
| Activación de lector | Abre un capítulo y registra al menos 25 % de progreso durante las primeras 24 h | >= 40 % de lectores registrados |
| Continuación | Regresa a la misma obra dentro de siete días | >= 25 % |
| Finalización de capítulo | Llega a >= 90 % del capítulo | Medir por longitud; objetivo inicial >= 35 % |
| Activación de escritor | Crea una obra y publica un capítulo | >= 30 % de usuarios que inician el flujo de escritor |
| Tiempo a publicación | Tiempo desde creación de obra a primer capítulo publicado | Mediana < 48 h |
| Obras con lectura | Obra publicada que obtiene al menos tres lectores válidos | Tendencia creciente |
| Reportes válidos | Reportes confirmados / reportes totales | Sirve para ajustar moderación, sin objetivo inicial rígido |

### 3.3 Indicadores de calidad técnica

- disponibilidad mensual del API en beta: objetivo >= 99,5 %;
- percentil 95 de lecturas del API: < 500 ms sin contar subida de archivos;
- tasa de respuestas 5xx: < 1 %;
- inicio sin errores de la app: > 99 % de sesiones;
- restauración de backup ensayada al menos una vez antes de beta pública;
- cero vulnerabilidades críticas conocidas en dependencias al liberar;
- cero pérdida conocida de capítulos publicados o borradores guardados.

### 3.4 Restricciones explícitas

- No almacenar datos de tarjetas.
- No exponer correos electrónicos de usuarios.
- No usar contenido privado o borradores para recomendaciones.
- No mostrar analítica individual identificable a escritores.
- No prometer protección absoluta contra copia del contenido publicado.
- No permitir HTML arbitrario en capítulos.
- No depender del caché como fuente de verdad.

---

## 4. Decisiones tecnológicas de referencia

La especificación permite varias alternativas. Para evitar decisiones repetidas durante la implementación, esta guía fija una opción principal. Puede cambiarse mediante un registro de decisión arquitectónica antes de escribir módulos dependientes.

### 4.1 Backend

- **Runtime:** Node.js LTS.
- **Lenguaje:** TypeScript con modo estricto.
- **Framework HTTP:** Fastify.
- **Validación y esquemas:** Zod.
- **ORM:** Prisma.
- **Base de datos:** PostgreSQL 16 o superior.
- **Autenticación:** JWT de acceso corto y sesiones de refresh token rotativas.
- **Hash de contraseñas:** Argon2id. Si el entorno no lo permite, bcrypt con costo mínimo 12.
- **Logs:** Pino con salida JSON.
- **Documentación de API:** OpenAPI generada desde esquemas.
- **Pruebas:** Vitest y pruebas de integración contra PostgreSQL real en contenedor.
- **Trabajos asíncronos iniciales:** tabla de jobs y proceso worker; Redis/BullMQ solo cuando el volumen lo justifique.

Fastify ofrece buen rendimiento y un modelo explícito de plugins. Prisma reduce fricción al iniciar y facilita migraciones tipadas. Zod puede compartirse conceptualmente con los contratos, aunque el cliente Flutter consumirá el OpenAPI generado y no código TypeScript.

### 4.2 Aplicación Flutter

- **SDK:** última versión estable de Flutter fijada en el repositorio.
- **Estado e inyección:** Riverpod.
- **Navegación:** `go_router`.
- **HTTP:** `dio`.
- **Modelos inmutables:** `freezed` y `json_serializable`.
- **Persistencia segura:** `flutter_secure_storage` para tokens.
- **Preferencias simples:** `shared_preferences`.
- **Base local:** Drift/SQLite para caché, progreso pendiente y descargas futuras.
- **Gráficos:** `fl_chart` cuando el dashboard lo requiera.
- **Fuentes:** paquetes con licencias verificadas; OpenDyslexic puede empaquetarse si su licencia se documenta.
- **Pruebas:** unitarias, widgets, golden selectivas e integración.

### 4.3 Infraestructura

- **Contenedores:** Docker para API, worker y entorno local.
- **Proxy:** Nginx o proxy administrado equivalente.
- **Objetos:** almacenamiento S3 compatible.
- **Desarrollo local:** PostgreSQL y MinIO mediante Docker Compose.
- **CI:** GitHub Actions o equivalente.
- **Producción inicial:** un proveedor administrado para PostgreSQL y un servicio de contenedores o VPS endurecido.
- **Errores de cliente y servidor:** Sentry o alternativa compatible.
- **Métricas:** OpenTelemetry más proveedor administrado, o Prometheus/Grafana si existe capacidad operativa.

### 4.4 Decisiones que deben quedar en ADR

Crear `docs/adr/` y registrar al menos:

1. ADR-001: Fastify + TypeScript.
2. ADR-002: Prisma y política de migraciones.
3. ADR-003: Riverpod y organización por features.
4. ADR-004: JWT de acceso y refresh sessions rotativas.
5. ADR-005: almacenamiento S3 compatible.
6. ADR-006: texto estructurado permitido en capítulos.
7. ADR-007: separación entre progreso y eventos analíticos.
8. ADR-008: estrategia de despliegue y proveedores.

Cada ADR debe contener contexto, decisión, alternativas, consecuencias y fecha.

---

## 5. Arquitectura general

### 5.1 Vista de componentes

```text
Flutter Android/Web
        |
        | HTTPS + JSON
        v
Reverse proxy / Load balancer
        |
        v
Node.js API --------------------> Object Storage
   |       |                           |
   |       +--> Worker de imágenes ---+
   |
   +--> PostgreSQL
   |
   +--> Cache/Redis (opcional al inicio)
   |
   +--> Proveedor de email
   |
   +--> Observabilidad
```

### 5.2 Estilo arquitectónico

Usar un **monolito modular**. No comenzar con microservicios.

Razones:

- el dominio aún cambiará;
- las transacciones entre obras, capítulos y publicación son más simples;
- un equipo pequeño puede desplegar y observar un solo servicio;
- los límites modulares permiten extraer componentes posteriormente si existe evidencia.

Módulos de backend:

- `auth`;
- `users`;
- `authors`;
- `stories`;
- `chapters`;
- `discovery`;
- `library`;
- `follows`;
- `reading`;
- `analytics`;
- `media`;
- `reports`;
- `moderation`;
- `notifications`;
- `admin`.

Cada módulo debe exponer servicios de aplicación y ocultar su persistencia. Ningún handler HTTP debe consultar Prisma directamente.

### 5.3 Capas del backend

```text
HTTP route / controller
        |
        v
Application service / use case
        |
        v
Domain rules and policies
        |
        v
Repository interfaces
        |
        v
Prisma repositories / external adapters
```

Reglas:

- los handlers traducen HTTP a comandos y resultados;
- los servicios controlan transacciones y autorización de negocio;
- las reglas de dominio validan transiciones de estado;
- los repositorios encapsulan consultas;
- los adaptadores encapsulan email, storage, métricas y proveedores externos;
- los errores de infraestructura no se exponen directamente al cliente.

### 5.4 Estructura propuesta del repositorio

```text
ReadInn/
  apps/
    api/
      prisma/
        migrations/
        schema.prisma
        seed.ts
      src/
        app.ts
        server.ts
        config/
        plugins/
        shared/
        modules/
          auth/
          users/
          stories/
          chapters/
          discovery/
          library/
          follows/
          reading/
          analytics/
          media/
          reports/
          moderation/
      test/
    mobile/
      lib/
        app/
        core/
        features/
        l10n/
        main.dart
      test/
      integration_test/
  packages/
    api-contract/
      openapi.yaml
  infra/
    docker/
    nginx/
    scripts/
  docs/
    adr/
    api/
    product/
    runbooks/
  .github/
    workflows/
  docker-compose.yml
  README.md
```

### 5.5 Convenciones transversales

- IDs públicos: UUID v7 o UUID v4. No exponer IDs incrementales.
- Tiempos: UTC en base de datos y API; conversión local en cliente.
- Fechas API: ISO 8601.
- Dinero futuro: enteros en la unidad monetaria menor y código ISO de moneda.
- Slugs: únicos, normalizados y reservables, pero nunca usados como única referencia interna.
- Borrado: lógico para contenido publicado y cuentas; físico solo tras período de retención.
- Auditoría: registrar actor, acción, entidad, fecha y metadatos relevantes para acciones administrativas.
- Texto: UTF-8, límites explícitos y normalización razonable.
- Configuración: validada al arrancar; la aplicación debe fallar de forma clara si falta una variable obligatoria.

---

## 6. Modelo de dominio

### 6.1 Usuario y capacidades

No modelar `reader` y `writer` como roles mutuamente excluyentes. Todo usuario autenticado puede leer. La capacidad de escribir se activa cuando crea su primera obra o acepta las condiciones de publicación.

Usar:

- `account_status`: `pending_verification`, `active`, `suspended`, `deleted`;
- `is_admin`: booleano o sistema de permisos administrativos;
- perfil público opcional;
- `writer_onboarded_at`: fecha nullable.

### 6.2 Ciclo de vida de una obra

```text
draft -> published -> completed
  |          |
  |          +-> archived
  +-> archived
```

Estados:

- `draft`: visible solo para propietario y administradores autorizados;
- `published`: visible públicamente si tiene al menos un capítulo publicado;
- `completed`: publicada, pero marcada como finalizada por el autor;
- `archived`: no aparece en descubrimiento; puede conservar acceso para biblioteca según política;
- `suspended`: estado administrativo separado si se necesita distinguir sanción de archivado voluntario.

Reglas:

1. Una obra no se publica sin título, sinopsis, autor, clasificación madura y al menos un género.
2. Para ser visible al público debe tener al menos un capítulo publicado.
3. Cambiar a `completed` no impide correcciones, pero debe generar un evento.
4. Una obra suspendida no puede ser republicada por el autor.
5. Archivar no borra capítulos, métricas ni entradas de biblioteca.

### 6.3 Ciclo de vida de un capítulo

```text
draft -> scheduled -> published -> unpublished
   |                       |
   +-----------------------+-> archived
```

Para el MVP, `scheduled` puede existir en base de datos pero no tener interfaz hasta una fase posterior.

Reglas:

- un borrador puede editarse libremente;
- publicar requiere título, contenido no vacío y orden válido;
- un capítulo publicado conserva `published_at` original;
- una edición significativa crea una revisión o al menos un snapshot recuperable;
- `unpublished` retira el acceso público sin destruir el contenido;
- el orden de capítulos debe actualizarse en una transacción;
- no se permite eliminar físicamente un capítulo que tenga eventos de lectura.

### 6.4 Contenido del capítulo

Para el MVP elegir uno de estos formatos y no mezclarlos:

**Opción recomendada:** documento JSON estructurado con un conjunto limitado de nodos:

- párrafo;
- encabezado nivel 2 o 3;
- negrita;
- cursiva;
- separador;
- cita;
- salto de escena.

Ventajas: evita HTML arbitrario, permite renderizado consistente y facilita futuras exportaciones. El backend valida tamaño, profundidad y nodos permitidos.

Guardar también:

- `plain_text` derivado para búsqueda y conteo;
- `word_count` calculado en servidor;
- `content_version` para migraciones de formato;
- checksum opcional para detectar cambios.

### 6.5 Biblioteca y seguimiento

- Biblioteca: relación única entre usuario y obra.
- Seguir: relación única entre usuario seguidor y usuario autor.
- No permitir seguirse a sí mismo.
- Agregar y quitar debe ser idempotente.
- “Nuevo capítulo” se calcula comparando el último capítulo publicado con el último capítulo leído o visto por el usuario.

### 6.6 Progreso y eventos de lectura

Separar dos conceptos:

1. `reading_progress`: estado actual para continuar leyendo.
2. `reading_events`: eventos append-only para analítica.

El progreso puede sobrescribirse con la posición más reciente. Los eventos no deben modificarse salvo procesos explícitos de privacidad o limpieza.

Eventos iniciales:

- `chapter_opened`;
- `reading_heartbeat`;
- `progress_updated`;
- `chapter_completed`;
- `chapter_closed`.

El cliente no decide por sí solo el tiempo válido. El servidor limita heartbeats, descarta duraciones imposibles y deduplica mediante `event_id`.

---

## 7. Modelo de datos detallado

### 7.1 Tablas del MVP

#### `users`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | PK |
| `email` | citext/varchar | único, normalizado, no público |
| `username` | citext/varchar | único, 3-30 caracteres |
| `password_hash` | varchar | nunca retornar |
| `account_status` | enum | índice |
| `is_admin` | boolean | false por defecto |
| `email_verified_at` | timestamptz nullable | |
| `writer_onboarded_at` | timestamptz nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | borrado lógico |

#### `user_profiles`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `user_id` | UUID | PK y FK |
| `display_name` | varchar | 1-80 |
| `bio` | varchar/text | máximo 500 |
| `avatar_media_id` | UUID nullable | FK media |
| `donation_url` | varchar nullable | lista de hosts o protocolos permitidos |
| `locale` | varchar | `es` inicialmente |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `auth_sessions`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | PK, también `sid` del token |
| `user_id` | UUID | FK, índice |
| `refresh_token_hash` | varchar | token nunca en texto claro |
| `device_name` | varchar nullable | valor mostrado al usuario |
| `user_agent_hash` | varchar nullable | minimizar datos |
| `ip_prefix` | varchar nullable | no guardar más precisión de la necesaria |
| `expires_at` | timestamptz | índice |
| `last_used_at` | timestamptz | |
| `revoked_at` | timestamptz nullable | |
| `created_at` | timestamptz | |

#### `password_reset_tokens` y `email_verification_tokens`

Guardar hash del token, usuario, expiración, fecha de consumo y creación. Un token es de un solo uso.

#### `media_assets`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | PK |
| `owner_user_id` | UUID | FK |
| `kind` | enum | `avatar`, `story_cover` |
| `storage_key` | varchar | único, no aceptar del cliente |
| `mime_type` | varchar | WebP/AVIF/JPEG permitido según salida |
| `width`, `height` | int | positivos |
| `size_bytes` | bigint | límite |
| `status` | enum | `pending`, `ready`, `failed`, `deleted` |
| `created_at` | timestamptz | |

#### `stories`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | PK |
| `author_id` | UUID | FK, índice |
| `slug` | varchar | único |
| `title` | varchar | 1-150 |
| `synopsis` | text | 1-3000 |
| `status` | enum | índice compuesto con publicación |
| `is_mature` | boolean | obligatorio |
| `cover_media_id` | UUID nullable | FK |
| `language_code` | varchar | `es` inicialmente |
| `word_count` | int | derivado |
| `published_chapter_count` | int | derivado |
| `published_at` | timestamptz nullable | |
| `completed_at` | timestamptz nullable | |
| `created_at`, `updated_at` | timestamptz | |
| `archived_at` | timestamptz nullable | |

No usar `views_count` como única fuente de verdad. Puede existir como contador materializado reconstruible.

#### `genres` y `story_genres`

`genres`: `id`, `name`, `slug`, `is_active`, `sort_order`.  
`story_genres`: PK compuesta `story_id`, `genre_id`; máximo recomendado de tres géneros por obra.

#### `chapters`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | PK |
| `story_id` | UUID | FK, índice |
| `slug` | varchar | único dentro de obra |
| `title` | varchar | 1-150 |
| `status` | enum | índice |
| `position` | int | único dentro de obra para capítulos activos |
| `content_json` | jsonb | validado |
| `plain_text` | text | derivado |
| `content_version` | int | inicia en 1 |
| `word_count` | int | derivado |
| `estimated_read_minutes` | int | derivado |
| `published_at` | timestamptz nullable | |
| `created_at`, `updated_at` | timestamptz | |
| `archived_at` | timestamptz nullable | |

#### `chapter_revisions`

Guardar `chapter_id`, número de revisión, título, contenido, texto plano, autor del cambio y fecha. En MVP puede conservarse solo la última versión publicada y un número limitado de revisiones recientes.

#### `library_entries`

PK o unique compuesto `user_id`, `story_id`; incluir `created_at`. Agregar índice por usuario y fecha descendente.

#### `follows`

Unique compuesto `follower_id`, `following_id`; incluir `created_at` y constraint para impedir IDs iguales.

#### `reading_progress`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `user_id` | UUID | parte de PK |
| `chapter_id` | UUID | parte de PK |
| `story_id` | UUID | redundancia controlada para consultas |
| `progress_percentage` | numeric | 0-100 |
| `last_position` | varchar/jsonb | ancla estable, no solo píxeles |
| `completed_at` | timestamptz nullable | >= 90 % o acción explícita válida |
| `last_read_at` | timestamptz | índice |
| `updated_at` | timestamptz | |

#### `reading_events`

| Campo | Tipo conceptual | Reglas |
|---|---|---|
| `id` | UUID | provisto por cliente para idempotencia |
| `user_id` | UUID | FK; definir tratamiento al borrar cuenta |
| `story_id`, `chapter_id` | UUID | índices |
| `session_id` | UUID | agrupa sesión de lectura |
| `event_type` | enum | |
| `progress_percentage` | numeric nullable | validado |
| `duration_seconds` | int nullable | límite por evento |
| `occurred_at` | timestamptz | tiempo cliente acotado |
| `received_at` | timestamptz | tiempo servidor |
| `metadata` | jsonb | esquema estricto y mínimo |

Particionar esta tabla solo cuando el volumen lo requiera. Definir desde el inicio un job de retención o agregación.

#### `reports`

Campos: `id`, `reporter_id`, `target_type`, `target_id`, `reason_code`, `details`, `status`, `assigned_admin_id`, `resolution_code`, `resolved_at`, `created_at`, `updated_at`.

Estados: `open`, `in_review`, `resolved`, `dismissed`.

#### `moderation_actions`

Campos: actor administrador, acción, objetivo, motivo, payload anterior opcional, payload posterior opcional y fecha. Debe ser append-only.

#### `audit_logs`

Reservar para acciones sensibles: publicación, retiro, suspensión, cambios administrativos, rotación/revocación de sesiones y cambios futuros de pagos.

### 7.2 Índices mínimos

- `users(lower(email))` único o `citext` único;
- `users(lower(username))` único;
- `stories(author_id, updated_at desc)`;
- `stories(status, published_at desc)`;
- `stories(status, is_mature, published_at desc)`;
- índice de búsqueda de título y texto según estrategia;
- `chapters(story_id, position)` único para activos;
- `chapters(story_id, status, position)`;
- `library_entries(user_id, created_at desc)`;
- `follows(follower_id, created_at desc)` y `follows(following_id)`;
- `reading_progress(user_id, last_read_at desc)`;
- `reading_events(chapter_id, received_at)`;
- `reading_events(user_id, chapter_id, event_type)`;
- `reports(status, created_at)`.

### 7.3 Búsqueda inicial

Para el MVP usar PostgreSQL:

- búsqueda por título con `pg_trgm`;
- búsqueda por autor usando username/display name;
- filtro por género, estado e idioma;
- ranking simple por similitud y publicación reciente.

No incorporar Elasticsearch/Algolia antes de observar límites reales. Extraer un servicio de búsqueda solo si la latencia, relevancia o escala lo exige.

### 7.4 Migraciones

Reglas:

1. Toda modificación del esquema entra mediante migración versionada.
2. No editar migraciones ya aplicadas en entornos compartidos.
3. Separar cambios destructivos en expandir, migrar datos y contraer.
4. Probar migraciones hacia adelante sobre una copia sanitizada antes de producción.
5. Mantener seed determinista para géneros y cuentas de prueba no productivas.
6. Documentar rollback lógico; Prisma no genera automáticamente una reversión segura.

---

## 8. Contrato de API

### 8.1 Convenciones

- Prefijo: `/v1`.
- Contenido: `application/json; charset=utf-8`.
- Autenticación: `Authorization: Bearer <access-token>`.
- ID de correlación: aceptar o generar `X-Request-Id`.
- Paginación inicial: `page` y `limit`, con máximo 100; migrar endpoints de alto volumen a cursor sin romper `/v1`.
- Ordenamiento: lista cerrada por endpoint, nunca nombres de columna libres.
- Idempotencia: `Idempotency-Key` para operaciones que puedan duplicarse; eventos de lectura usan ID propio.
- Versionado optimista: `updatedAt` o `version` en actualizaciones sensibles para evitar sobrescrituras silenciosas.

Respuesta exitosa simple:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

Respuesta paginada:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 128,
    "totalPages": 7
  }
}
```

Error:

```json
{
  "error": {
    "code": "STORY_NOT_FOUND",
    "message": "No se encontró la obra.",
    "requestId": "uuid",
    "details": []
  }
}
```

El cliente decide cómo traducir `code`; el backend no debe filtrar mensajes de SQL, stack traces ni datos internos.

### 8.2 Códigos HTTP

- `200`: consulta o actualización exitosa;
- `201`: recurso creado;
- `204`: acción idempotente sin cuerpo;
- `400`: solicitud mal formada;
- `401`: no autenticado o token inválido;
- `403`: autenticado sin permiso;
- `404`: recurso inexistente o no visible;
- `409`: conflicto de unicidad, versión o transición;
- `422`: validación semántica;
- `429`: límite excedido;
- `500`: error inesperado con ID de correlación.

### 8.3 Endpoints de autenticación

| Método y ruta | Propósito | Notas |
|---|---|---|
| `POST /v1/auth/register` | Crear cuenta | Normalizar email y username; enviar verificación |
| `POST /v1/auth/login` | Crear sesión | Rate limit por IP y cuenta; respuesta genérica ante fallo |
| `POST /v1/auth/refresh` | Rotar refresh token | Detectar reutilización y revocar familia de sesión |
| `POST /v1/auth/logout` | Revocar sesión actual | Idempotente |
| `POST /v1/auth/logout-all` | Revocar todas las sesiones | Requiere autenticación reciente |
| `GET /v1/auth/me` | Usuario y capacidades | No retornar datos sensibles |
| `POST /v1/auth/verify-email` | Consumir token | Token de un uso |
| `POST /v1/auth/forgot-password` | Solicitar recuperación | Siempre responder de forma neutral |
| `POST /v1/auth/reset-password` | Cambiar contraseña | Revocar sesiones existentes |

Access token recomendado: 10-15 minutos. Refresh session: 30 días, rotativa y revocable.

### 8.4 Usuarios y autores

| Método y ruta | Acceso | Propósito |
|---|---|---|
| `GET /v1/users/me` | autenticado | Perfil privado y configuración |
| `PATCH /v1/users/me` | autenticado | Username, display name, bio y locale |
| `DELETE /v1/users/me` | autenticado | Iniciar borrado de cuenta |
| `GET /v1/authors/:username` | público | Perfil público y agregados permitidos |
| `GET /v1/authors/:username/stories` | público | Obras públicas paginadas |
| `PUT /v1/authors/:authorId/follow` | autenticado | Seguir idempotentemente |
| `DELETE /v1/authors/:authorId/follow` | autenticado | Dejar de seguir |

### 8.5 Obras

| Método y ruta | Acceso | Propósito |
|---|---|---|
| `GET /v1/stories` | público | Explorar con búsqueda y filtros |
| `GET /v1/stories/:storyId` | público/propietario | Detalle según visibilidad |
| `POST /v1/stories` | autenticado | Crear borrador y activar escritor |
| `PATCH /v1/stories/:storyId` | propietario | Actualizar metadatos con control de versión |
| `POST /v1/stories/:storyId/publish` | propietario | Validar reglas y publicar |
| `POST /v1/stories/:storyId/complete` | propietario | Marcar finalizada |
| `POST /v1/stories/:storyId/archive` | propietario/admin | Archivar sin borrar |
| `GET /v1/me/stories` | escritor | Listar todas sus obras y estados |

Filtros de `GET /stories`: `query`, `genre`, `status`, `mature`, `sort`, `page`, `limit`. Para usuarios anónimos, el contenido maduro debe ocultarse o requerir confirmación según política.

### 8.6 Capítulos

| Método y ruta | Acceso | Propósito |
|---|---|---|
| `GET /v1/stories/:storyId/chapters` | público/propietario | Lista filtrada por visibilidad |
| `GET /v1/stories/:storyId/chapters/:chapterId` | público/propietario | Contenido y navegación adyacente |
| `POST /v1/stories/:storyId/chapters` | propietario | Crear borrador |
| `PATCH /v1/stories/:storyId/chapters/:chapterId` | propietario | Guardar contenido y metadatos |
| `POST /v1/stories/:storyId/chapters/:chapterId/preview` | propietario | Obtener render validado |
| `POST /v1/stories/:storyId/chapters/:chapterId/publish` | propietario | Publicar |
| `POST /v1/stories/:storyId/chapters/:chapterId/unpublish` | propietario/admin | Retirar |
| `POST /v1/stories/:storyId/chapters/reorder` | propietario | Reordenar en transacción |
| `GET /v1/stories/:storyId/chapters/:chapterId/revisions` | propietario | Historial limitado |

La respuesta de lectura debe incluir anterior/siguiente, progreso del usuario cuando esté autenticado y versión del contenido para caché.

### 8.7 Biblioteca y progreso

| Método y ruta | Propósito |
|---|---|
| `GET /v1/me/library` | Biblioteca con progreso y nuevos capítulos |
| `PUT /v1/me/library/:storyId` | Guardar idempotentemente |
| `DELETE /v1/me/library/:storyId` | Quitar de biblioteca |
| `GET /v1/me/continue-reading` | Obras ordenadas por última lectura |
| `PUT /v1/me/reading-progress/:chapterId` | Upsert de progreso |
| `POST /v1/me/reading-events/batch` | Enviar eventos idempotentes en lote |

Ejemplo de progreso:

```json
{
  "progressPercentage": 43.5,
  "lastPosition": {
    "blockId": "paragraph-18",
    "offset": 122
  },
  "clientUpdatedAt": "2026-08-14T15:30:00Z",
  "contentVersion": 3
}
```

El servidor rechaza o reconcilia una posición incompatible con la versión actual.

### 8.8 Métricas del escritor

| Método y ruta | Propósito |
|---|---|
| `GET /v1/me/dashboard/summary` | Seguidores, obras, lectores y lecturas agregadas |
| `GET /v1/me/dashboard/stories/:storyId` | Métricas por obra |
| `GET /v1/me/dashboard/stories/:storyId/chapters` | Tabla por capítulo |
| `GET /v1/me/dashboard/stories/:storyId/retention` | Continuación secuencial |

Parámetros: `from`, `to`, `timezone`. Limitar intervalo máximo y ofrecer presets.

No devolver datos individuales de lectores. Aplicar umbral mínimo de agregación cuando una métrica pudiera identificar a una persona.

### 8.9 Reportes y moderación

| Método y ruta | Acceso | Propósito |
|---|---|---|
| `POST /v1/reports` | autenticado | Reportar obra, capítulo o perfil |
| `GET /v1/admin/reports` | moderador/admin | Cola filtrable |
| `GET /v1/admin/reports/:id` | moderador/admin | Detalle y contexto |
| `POST /v1/admin/reports/:id/assign` | moderador/admin | Asignar revisión |
| `POST /v1/admin/reports/:id/resolve` | moderador/admin | Resolver con código y nota |
| `POST /v1/admin/content/:type/:id/suspend` | admin | Suspender con auditoría |
| `POST /v1/admin/content/:type/:id/restore` | admin | Restaurar con auditoría |

### 8.10 Media

Flujo recomendado:

1. Cliente solicita intención de subida.
2. API valida tipo de recurso, propiedad y cuota.
3. Cliente sube archivo temporal o lo envía al API según proveedor.
4. Worker inspecciona tipo real, dimensiones, malware cuando aplique, redimensiona y convierte.
5. Asset pasa a `ready`.
6. Cliente asocia el asset a perfil u obra.

Endpoints:

- `POST /v1/media/uploads`;
- `POST /v1/media/uploads/:id/complete`;
- `GET /v1/media/:id/status`;
- `DELETE /v1/media/:id`.

Nunca confiar en extensión, MIME del cliente ni nombre original.

---

## 9. Implementación del backend

### 9.1 Inicialización

1. Crear el proyecto TypeScript y fijar versiones de Node y gestor de paquetes.
2. Activar `strict`, `noUncheckedIndexedAccess` y reglas de lint consistentes.
3. Crear `app.ts` como composición testeable y `server.ts` como proceso de arranque.
4. Validar variables de entorno con Zod antes de construir la aplicación.
5. Registrar plugins compartidos: Prisma, autenticación, request ID, CORS, rate limit, serialización y manejo de errores.
6. Agregar endpoints `/health/live` y `/health/ready`.
7. Preparar migración inicial y seed de géneros.
8. Generar OpenAPI durante CI y detectar cambios no confirmados.

La aplicación no debe conectarse a servicios externos al importar módulos. La construcción de dependencias ocurre explícitamente al iniciar, lo que facilita pruebas y cierre ordenado.

### 9.2 Configuración

Separar:

- configuración obligatoria común;
- secretos;
- valores ajustables por entorno;
- feature flags.

Variables iniciales:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_ACCESS_PRIVATE_KEY=...
JWT_ACCESS_PUBLIC_KEY=...
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
APP_WEB_URL=https://...
API_PUBLIC_URL=https://...
STORAGE_ENDPOINT=...
STORAGE_REGION=...
STORAGE_BUCKET=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
EMAIL_FROM=...
EMAIL_PROVIDER_API_KEY=...
SENTRY_DSN=...
LOG_LEVEL=info
```

No incluir valores reales en el repositorio. Proveer `.env.example` con nombres y comentarios seguros.

### 9.3 Patrón de un módulo

Ejemplo para `stories`:

```text
stories/
  domain/
    story.ts
    story-status.ts
    story-policy.ts
    errors.ts
  application/
    create-story.ts
    update-story.ts
    publish-story.ts
    archive-story.ts
    ports.ts
  infrastructure/
    prisma-story-repository.ts
  http/
    schemas.ts
    routes.ts
    presenters.ts
  index.ts
```

No es necesario crear clases para todo. Mantener funciones puras donde sean suficientes. La separación importa porque evita que reglas de publicación se repliquen en rutas, jobs y panel administrativo.

### 9.4 Autorización

Aplicar autorización en dos niveles:

1. Middleware: verifica identidad y capacidades globales.
2. Servicio de aplicación: verifica propiedad, visibilidad y transición permitida.

Matriz mínima:

| Acción | Anónimo | Usuario | Propietario | Admin |
|---|---:|---:|---:|---:|
| Ver obra publicada | Sí | Sí | Sí | Sí |
| Ver borrador | No | No | Sí | Sí con motivo/auditoría |
| Crear obra | No | Sí | Sí | Sí |
| Editar obra | No | No | Sí | Solo flujo administrativo explícito |
| Publicar capítulo | No | No | Sí | No por defecto |
| Guardar biblioteca | No | Sí | Sí | Sí |
| Reportar | No | Sí | Sí, excepto contenido propio según política | Sí |
| Ver métricas | No | No | Sí | Solo soporte autorizado y auditado |
| Suspender contenido | No | No | No | Sí |

Evitar reglas implícitas como “si es admin puede hacer cualquier cosa”. El acceso administrativo a borradores y datos debe ser intencional y auditable.

### 9.5 Transacciones críticas

Usar transacciones para:

- publicar el primer capítulo y hacer visible la obra;
- reordenar capítulos;
- rotar refresh token y revocar token anterior;
- archivar o suspender contenido relacionado;
- actualizar contadores materializados junto con el evento fuente cuando corresponda;
- resolver reporte y crear acción de moderación;
- operaciones futuras de dinero y webhooks.

No mantener una transacción abierta mientras se llama email, storage o servicios externos. Registrar un evento/outbox y procesarlo después del commit.

### 9.6 Patrón outbox

Crear una tabla `outbox_events` antes de integrar emails importantes o notificaciones:

- `id`;
- `event_type`;
- `aggregate_type`;
- `aggregate_id`;
- `payload`;
- `created_at`;
- `processed_at`;
- `attempt_count`;
- `last_error`.

El worker reclama eventos con bloqueo, procesa y marca. Esto evita publicar un capítulo sin emitir la notificación o enviar email para una transacción que finalmente falló.

### 9.7 Caché

No agregar Redis por anticipación. Comenzar con:

- headers HTTP `ETag`/`Last-Modified` para capítulos;
- CDN para imágenes;
- caché en memoria solo para catálogos pequeños y reconstruibles;
- consultas e índices medidos.

Agregar Redis cuando exista al menos una necesidad comprobada:

- múltiples instancias requieren rate limit compartido;
- consultas de catálogo superan objetivos pese a optimización;
- jobs necesitan una cola de mayor rendimiento;
- invalidación de caché puede definirse con precisión.

Claves deben incluir versión de esquema y parámetros relevantes. Toda escritura que afecte una clave debe invalidarla después del commit.

### 9.8 Procesamiento de imágenes

Validaciones:

- máximo de entrada: 2 MB para avatar y 5 MB para portada si la investigación de uso lo necesita;
- máximo de píxeles para prevenir bombas de descompresión;
- decodificación real con Sharp;
- eliminar EXIF y metadatos sensibles;
- bloquear SVG para subidas de usuario en MVP;
- generar variantes de portada, por ejemplo 200x300, 400x600 y 800x1200;
- generar avatar cuadrado en tamaños necesarios;
- nombres de objeto generados por servidor;
- `Cache-Control` largo para assets inmutables versionados.

Si falla el procesamiento, mantener el recurso anterior y mostrar estado recuperable al usuario.

### 9.9 Tareas programadas

Iniciales:

- eliminar uploads temporales expirados;
- purgar sesiones expiradas;
- agregar métricas diarias;
- recalcular contadores inconsistentes;
- limpiar eventos analíticos según retención;
- comprobar estado de backups;
- enviar correos pendientes y reintentos;
- eliminar físicamente cuentas tras período legal, cuando corresponda.

Cada job debe ser idempotente, tener timeout, máximo de reintentos, logs con ID y métrica de última ejecución exitosa.

---

## 10. Implementación Flutter

### 10.1 Organización por features

```text
lib/
  app/
    app.dart
    router.dart
    theme.dart
    bootstrap.dart
  core/
    api/
    auth/
    database/
    errors/
    logging/
    widgets/
    utils/
  features/
    authentication/
      data/
      domain/
      presentation/
    discovery/
    story_detail/
    reader/
    library/
    author_profile/
    writer_stories/
    story_editor/
    chapter_editor/
    writer_dashboard/
    profile/
    reports/
  l10n/
```

Cada feature contiene solo las capas que realmente necesita. Evitar un directorio global de servicios que se transforme en dependencia circular.

### 10.2 Estado remoto y local

Clasificar el estado:

- **estado remoto:** obras, capítulos, biblioteca, perfil, métricas;
- **estado de sesión:** usuario, tokens y capacidades;
- **estado efímero:** pestaña, modal, formulario en edición;
- **estado persistente local:** preferencias de lectura, caché y cola offline.

Riverpod administra dependencias y estado de vista. Drift es la fuente local para datos persistentes. No duplicar una misma responsabilidad en Riverpod, singleton y base local.

### 10.3 Cliente HTTP

Implementar:

- base URL por flavor;
- timeout de conexión y respuesta;
- adjuntar access token;
- un único refresh concurrente cuando varias peticiones reciben `401`;
- reintentar una vez tras refresh exitoso;
- cerrar sesión si el refresh falla definitivamente;
- mapear códigos de error del API a errores de dominio;
- request ID en logs sanitizados;
- cancelación al abandonar búsquedas o pantallas;
- backoff solo para operaciones idempotentes.

No registrar tokens, contraseñas, contenido de capítulos privados ni PII.

### 10.4 Flavors

Crear `development`, `staging` y `production` con:

- identificadores de aplicación distintos;
- URL de API distinta;
- proyecto de observabilidad distinto;
- nombre/icono distinguible en desarrollo;
- flags de depuración desactivados en producción.

### 10.5 Navegación

Rutas conceptuales:

```text
/
/explore
/stories/:storyId
/stories/:storyId/chapters/:chapterId
/library
/authors/:username
/writer/stories
/writer/stories/new
/writer/stories/:storyId/edit
/writer/stories/:storyId/chapters/:chapterId/edit
/writer/dashboard
/profile
/settings/reading
/login
/register
```

Reglas de redirección:

- rutas públicas no fuerzan login;
- biblioteca, escritor y perfil requieren sesión;
- al iniciar sesión se regresa a la intención anterior;
- deep links a capítulos validan visibilidad;
- la Web debe mantener URLs compartibles para obra, autor y capítulo.

### 10.6 Sistema visual base

Definir tokens antes de construir pantallas:

- colores semánticos claros y oscuros;
- tipografía de interfaz distinta de preferencias del lector;
- escala de espaciado;
- radios de borde discretos;
- tamaños estables de controles;
- estados de foco, hover, presionado y deshabilitado;
- contrastes WCAG AA;
- anchos máximos de lectura y contenido en Web.

El lector es una superficie especial y puede usar sus propios temas claro, oscuro y sepia. El resto de la aplicación no debe adoptar automáticamente el tema sepia del lector.

### 10.7 Pantalla de autenticación

Estados:

- formulario vacío;
- validación local;
- envío;
- credenciales inválidas;
- rate limit;
- error de red;
- verificación de email pendiente;
- recuperación solicitada;
- sesión expirada.

Criterios:

- el botón evita doble envío;
- errores de campo se muestran junto al campo;
- el backend sigue siendo autoridad de validación;
- password manager y autocompletado funcionan;
- mostrar/ocultar contraseña es accesible;
- login redirige a la ruta original;
- cierre de sesión limpia tokens y datos privados locales.

### 10.8 Inicio y exploración

Secciones iniciales, basadas en consultas explícitas y no en un algoritmo personalizado:

- continuar leyendo para usuario autenticado;
- publicaciones recientes;
- populares del período con fórmula documentada;
- filtros por género;
- búsqueda por título o autor.

Estados:

- carga inicial con skeleton estable;
- contenido;
- lista vacía por filtro;
- sin resultados de búsqueda;
- error recuperable;
- conexión offline con caché disponible;
- paginación en curso y fin de lista.

En móvil usar listas verticales y carruseles solo cuando faciliten comparación. En Web usar grillas responsivas con anchos definidos. Una tarjeta de obra muestra portada, título, autor, género principal, estado y madurez cuando corresponda.

### 10.9 Detalle de obra

Contenido:

- portada real sin recorte destructivo;
- título, autor y sinopsis;
- géneros, estado, idioma y madurez;
- botón de leer/continuar;
- guardar/quitar de biblioteca;
- seguir/dejar de seguir autor;
- lista numerada de capítulos publicados;
- progreso individual;
- fecha de actualización;
- reporte en menú secundario.

Reglas:

- acciones optimistas deben revertirse si falla el API;
- un capítulo retirado muestra un estado claro sin filtrar contenido;
- un usuario no confirmado para contenido maduro ve advertencia antes de acceder;
- el autor propietario puede entrar al editor sin contaminar la vista pública.

### 10.10 Lector

#### Diseño

- ancho de columna: aproximadamente 45-75 caracteres por línea;
- márgenes adaptables;
- barra superior que desaparece al leer y reaparece con interacción;
- progreso visible sin tapar texto;
- controles en panel inferior o lateral según viewport;
- navegación anterior/siguiente al final;
- soporte de teclado en Web;
- no justificar texto si produce espaciado difícil de leer.

#### Preferencias

- fuente serif;
- fuente sans serif;
- OpenDyslexic;
- tamaño dentro de un rango seguro;
- interlineado;
- ancho de columna en pantallas grandes;
- tema claro, oscuro y sepia;
- opcional posterior: espaciado entre párrafos.

Guardar preferencia inmediatamente en local. La sincronización en cuenta puede añadirse después sin bloquear el MVP.

#### Progreso

1. Al abrir, cargar contenido desde local si la versión coincide y refrescar en segundo plano.
2. Restaurar una posición basada en bloque y offset.
3. Emitir `chapter_opened` una vez por sesión.
4. Actualizar progreso local con debounce.
5. Enviar progreso al servidor cada intervalo razonable, al cambiar de capítulo y al salir.
6. Enviar heartbeats solo mientras la app está visible y existe interacción o avance.
7. Marcar completado al superar el umbral y llegar al final.
8. Si no hay red, encolar evento y progreso con ID idempotente.

Nunca depender únicamente del callback de cierre de pantalla; el proceso móvil puede terminar sin ejecutarlo.

#### Accesibilidad

- lector de pantalla recibe orden semántico correcto;
- controles tienen etiquetas;
- escalado de texto no produce solapamientos;
- foco visible en Web;
- áreas táctiles mínimas;
- animaciones respetan reducción de movimiento;
- temas mantienen contraste;
- no usar solo color para progreso o estado.

### 10.11 Biblioteca

Permitir:

- alternar grilla/lista si aporta valor después de pruebas;
- ordenar por lectura reciente, agregado reciente y actualización;
- continuar desde última posición;
- mostrar capítulos nuevos;
- retirar una obra con confirmación no intrusiva;
- conservar progreso aunque se retire de biblioteca.

La biblioteca local puede mostrarse offline, indicando cuándo se sincronizó por última vez.

### 10.12 Perfil público de autor

- avatar, nombre, username y bio;
- obras públicas;
- seguidores agregados;
- botón seguir;
- enlace externo de apoyo validado;
- compartir;
- reportar perfil.

Abrir enlaces de donación fuera de la app o mediante navegador seguro. Mostrar claramente que el pago externo no es procesado ni garantizado por ReadInn.

### 10.13 Mis obras

Mostrar una tabla/lista operativa, no un escaparate:

- título y miniatura;
- estado;
- capítulos publicados/borradores;
- última edición;
- métricas resumidas;
- acciones editar, agregar capítulo, vista pública y menú secundario.

Filtros: todas, borradores, publicadas, finalizadas y archivadas. El botón primario crea una obra.

### 10.14 Editor de obra

Campos:

- título;
- sinopsis con contador;
- uno a tres géneros;
- idioma;
- portada;
- clasificación madura;
- estado de obra mediante acciones explícitas, no un dropdown libre.

Comportamiento:

- guardar borrador manual y autosave con indicador;
- advertir cambios no guardados;
- comprimir/previsualizar portada;
- validar en cliente y servidor;
- publicación muestra checklist de requisitos;
- conflicto de versión ofrece recargar o conservar contenido local para recuperación.

### 10.15 Editor de capítulos

MVP recomendado:

- título;
- editor por bloques limitado;
- contador de palabras;
- tiempo estimado;
- autosave local frecuente;
- autosave remoto con debounce y versión optimista;
- estado claro: guardando, guardado, sin conexión, conflicto, error;
- vista previa con el renderer real del lector;
- publicar y retirar como acciones separadas;
- reordenamiento fuera del contenido.

Prevención de pérdida:

1. Persistir borrador local antes de la primera llamada remota.
2. Enviar versión base en cada guardado.
3. Ante `409`, no sobrescribir ninguna versión.
4. Guardar snapshots locales recientes.
5. Permitir recuperar el texto después de un crash.
6. Probar cierre de pestaña, suspensión móvil, pérdida de red y token expirado mientras se edita.

### 10.16 Dashboard del escritor

MVP:

- rango de 7, 30 días y todo el período;
- lectores únicos estimados;
- vistas válidas;
- capítulos completados;
- tiempo activo de lectura agregado;
- seguidores;
- tabla por capítulo;
- retención entre capítulos cuando el tamaño de cohorte permita mostrarla.

Mostrar definiciones mediante ayuda contextual. Evitar falsa precisión: si el volumen es pequeño, usar mensajes como “datos insuficientes” y ocultar porcentajes identificables.

### 10.17 Manejo global de estados

Toda pantalla remota debe definir:

- carga inicial;
- actualización silenciosa;
- error inicial;
- error de actualización conservando datos anteriores;
- estado vacío real;
- estado vacío por filtros;
- modo offline;
- sesión expirada;
- permiso insuficiente;
- contenido retirado.

Los errores deben ofrecer una acción concreta cuando existe: reintentar, iniciar sesión, actualizar app o volver. No mostrar excepciones técnicas.

---

## 11. Analítica de lectura y métricas

### 11.1 Definiciones operacionales

#### Vista válida de capítulo

Contar como vista cuando:

- el capítulo se renderiza correctamente;
- el usuario permanece activo al menos un umbral, por ejemplo 10 segundos, o avanza un porcentaje mínimo;
- no se ha contado otra vista para el mismo usuario, capítulo y ventana definida, por ejemplo 24 horas.

La ventana exacta debe documentarse y mantenerse estable para comparar períodos.

#### Lector único

Usuario autenticado distinto con una vista válida en el período. Para usuarios anónimos, el MVP puede no entregar métricas de unicidad o usar un identificador efímero con política de privacidad explícita.

#### Tiempo de lectura

Suma de intervalos heartbeat aceptados:

- intervalo máximo por heartbeat;
- descartar tiempo con aplicación en background;
- limitar sesiones anormalmente largas;
- no inferir tiempo total únicamente entre apertura y cierre.

#### Capítulo completado

Primera vez que un lector alcanza >= 90 % o la última ancla del documento. Relecturas no aumentan completados únicos, aunque pueden contar como sesiones separadas.

#### Retención N a N+1

```text
lectores únicos que tuvieron vista válida en N y luego en N+1
----------------------------------------------------------------
lectores únicos con vista válida en N que tuvieron oportunidad de continuar
```

Excluir lectores que leyeron N antes de que N+1 estuviera publicado durante toda la ventana, o analizarlos como una cohorte diferente. Definir una ventana de continuación, por ejemplo 14 días.

### 11.2 Agregados

Crear tablas diarias reconstruibles:

- `chapter_metrics_daily`;
- `story_metrics_daily`;
- `author_metrics_daily`.

Campos típicos: fecha, entidad, vistas válidas, lectores únicos, completados, segundos activos. Mantener versión de definición métrica si cambia la fórmula.

### 11.3 Integridad y abuso

- IDs de eventos únicos;
- timestamps de cliente aceptados dentro de una tolerancia;
- rate limit por usuario y sesión;
- orden no garantizado, procesamiento idempotente;
- detección de progreso regresivo sin bloquear relectura legítima;
- excluir al autor de métricas de su propia obra o etiquetarlo consistentemente;
- filtrar administradores y pruebas internas;
- registrar versión de app para detectar instrumentación defectuosa.

### 11.4 Privacidad

- métricas de escritor solo agregadas;
- umbral mínimo recomendado de cinco lectores para porcentajes sensibles;
- eventos crudos con retención limitada, por ejemplo 90 días;
- agregados anonimizados con retención más larga;
- proceso para eliminación o anonimización al borrar cuenta;
- declarar finalidades en Política de Privacidad;
- no usar eventos para publicidad dirigida en MVP.

---

## 12. Seguridad

### 12.1 Modelo de amenazas mínimo

Amenazas relevantes:

- toma de cuentas;
- enumeración de usuarios;
- robo/reutilización de refresh tokens;
- acceso horizontal a borradores de otro autor;
- inyección en búsqueda o contenido;
- XSS en Flutter Web mediante contenido no sanitizado;
- subida de archivos maliciosos;
- spam de registros, reportes y eventos;
- manipulación de métricas;
- scraping y copia masiva;
- abuso administrativo;
- filtración en logs o backups;
- pérdida de datos por migración o fallo operativo.

### 12.2 Controles de autenticación

- Argon2id con parámetros medidos en infraestructura real;
- requisito razonable de longitud de contraseña, permitiendo gestores;
- comparar credenciales en tiempo constante mediante librería;
- mensajes genéricos en login y recuperación;
- refresh token aleatorio fuerte o JWT opaco tratado como secreto;
- almacenar solo hash del refresh token;
- rotación en cada uso;
- revocar familia ante reutilización;
- access token firmado con clave asimétrica si simplifica rotación y verificación;
- claves con `kid` para rotación;
- expiración y audiencia validadas;
- sesión segura en Flutter Web: evaluar cookie HttpOnly frente a almacenamiento; evitar guardar refresh token accesible a JavaScript.

La estrategia Web merece una decisión específica. Para móvil, `flutter_secure_storage`; para Web, cookie `HttpOnly`, `Secure`, `SameSite` emitida por el backend es preferible para refresh token.

### 12.3 Validación y contenido

- límites de longitud en todos los campos;
- listas cerradas para enums;
- JSON de capítulo validado recursivamente con límites de nodos y profundidad;
- renderizador no interpreta scripts, estilos ni URLs arbitrarias;
- URLs externas permiten solo `https` y hosts/patrones definidos;
- consultas parametrizadas mediante ORM;
- CORS con orígenes explícitos;
- headers de seguridad, incluido CSP estricta en Web;
- no usar `innerHTML` con contenido de usuario.

### 12.4 Rate limits iniciales

| Acción | Ejemplo de política inicial |
|---|---|
| Login | 5 intentos/min por IP y límites progresivos por cuenta |
| Registro | 3/h por IP, ajustado para redes compartidas |
| Recuperación | respuesta uniforme; 3/h por cuenta/IP |
| Crear obra | 20/día por usuario |
| Publicar capítulo | 30/día por usuario |
| Subir imagen | 20/h por usuario y cuota total |
| Reportar | 10/día por usuario |
| Eventos de lectura | lotes limitados por minuto y tamaño |
| Búsqueda | límite generoso por IP/usuario con caché |

Son valores de partida. Medir falsos positivos y abuso antes de endurecer.

### 12.5 Secretos y dependencias

- secretos solo en gestor de secretos del entorno;
- rotación documentada;
- permisos mínimos por servicio;
- escaneo de dependencias y secretos en CI;
- lockfiles versionados;
- actualizaciones periódicas y controladas;
- imágenes Docker fijadas por versión y, donde sea viable, digest;
- usuario no root en contenedores;
- SBOM para releases públicos cuando el proceso madure.

### 12.6 Administración

- MFA obligatorio para administradores antes de beta pública;
- cuentas administrativas separadas o elevación explícita;
- toda acción sensible con motivo y auditoría;
- sesiones administrativas más cortas;
- acceso restringido por rol/capacidad;
- alertas ante suspensiones masivas o cambios anómalos;
- no permitir modificar auditoría desde el panel.

---

## 13. Moderación, privacidad y legal

### 13.1 Política de contenido

Antes de permitir publicación pública, definir:

- contenido prohibido;
- tratamiento de contenido sexual y clasificación madura;
- acoso, odio, explotación y amenazas;
- copyright y procedimiento de retiro;
- spam y suplantación;
- contenido generado con IA, si requiere etiquetado;
- edades mínimas y restricciones territoriales;
- reincidencia y apelaciones.

La interfaz de reporte debe usar códigos alineados con esta política.

### 13.2 Flujo de reporte

```text
Usuario reporta
    -> validación y deduplicación
    -> cola abierta
    -> asignación
    -> revisión de contexto
    -> resolver / descartar / escalar
    -> acción de contenido o cuenta
    -> auditoría
    -> notificación cuando corresponda
    -> apelación posterior al MVP
```

El MVP puede ser reactivo: no se requiere aprobar manualmente cada publicación. Una cola previa para toda obra impediría escalar y retrasaría autores; usarla solo si la política o el riesgo legal lo exige.

### 13.3 Contenido maduro

- el autor debe declarar `is_mature`;
- el sistema puede reclasificar administrativamente;
- ocultar portadas/contenido sensible antes de confirmación;
- no mostrar contenido maduro en superficies públicas no autenticadas si la política lo determina;
- almacenar aceptación de advertencia y configuración;
- considerar verificación de edad según jurisdicción antes de lanzar ampliamente.

### 13.4 Documentos legales mínimos

- Términos de Servicio;
- Política de Privacidad;
- Política de Contenido;
- Política de Copyright/retiro;
- Política de Cookies para Web si aplica;
- términos específicos de apoyo externo;
- proceso de eliminación de cuenta y exportación de datos.

Los textos deben ser revisados por asesoría jurídica relevante para los países de operación. Una plantilla generada no es validación legal.

### 13.5 Derechos de datos

Preparar operaciones para:

- exportar datos de perfil y contenido propio;
- eliminar o anonimizar cuenta;
- revocar sesiones;
- corregir perfil;
- consultar consentimientos/aceptaciones;
- conservar lo estrictamente necesario por obligaciones y seguridad.

---


## 14. Estrategia de pruebas

### 14.1 Pirámide de pruebas

1. **Unitarias:** reglas de dominio, validadores, mapeos, cálculos y controladores de estado.
2. **Integración:** repositorios, transacciones, autenticación, jobs y endpoints contra infraestructura real efímera.
3. **Contrato:** OpenAPI, serialización y compatibilidad entre API y cliente.
4. **Widgets:** estados y comportamiento de componentes Flutter.
5. **End-to-end:** recorridos críticos completos.
6. **No funcionales:** seguridad, accesibilidad, rendimiento, restauración y resiliencia.

No buscar un porcentaje de cobertura aislado. Exigir cobertura alta en reglas críticas y pruebas de comportamiento para flujos que podrían perder contenido o acceso.

### 14.2 Pruebas unitarias del backend

Casos mínimos:

- normalización de email y username;
- política de contraseña;
- transición de estados de obra;
- requisitos de publicación;
- transición de estados de capítulo;
- cálculo de palabras y tiempo estimado;
- validación del documento JSON;
- autorización de propietario;
- deduplicación de eventos;
- cálculo de vista válida;
- completado y retención;
- validación de URL de donación;
- códigos de resolución de reportes;
- reconciliación de progreso.

### 14.3 Pruebas de integración del backend

Usar PostgreSQL real en un contenedor por suite o worker. No reemplazar toda la persistencia por mocks: constraints, aislamiento y SQL son parte del comportamiento.

Casos:

- registrar usuario y rechazar email duplicado concurrente;
- login, refresh, rotación y detección de reutilización;
- revocar sesiones al cambiar contraseña;
- impedir acceso a borrador ajeno;
- crear obra y publicar solo con requisitos cumplidos;
- concurrencia al reordenar capítulos;
- conflicto de versión al editar;
- retirar capítulo conservando datos;
- biblioteca y follows idempotentes;
- lote de eventos duplicado no duplica métricas;
- transacción de moderación genera auditoría;
- media inválida no se asocia a perfil;
- paginación estable y filtros combinados;
- borrado de cuenta respeta política de datos.

### 14.4 Pruebas del cliente Flutter

#### Unitarias

- repositorios y mapeos;
- refresh concurrente;
- controladores de login;
- estado del editor;
- cola offline;
- cálculo/restauración de posición;
- preferencias de lectura;
- lógica de paginación y búsqueda.

#### Widgets

- formularios y errores;
- tarjetas en tamaños mínimos y máximos;
- estados vacíos, error y carga;
- selector de tema/fuente;
- advertencia de contenido maduro;
- indicador de autosave;
- conflicto del editor;
- dashboard sin datos suficientes;
- navegación por teclado y semántica básica.

#### Golden tests selectivas

Usar para superficies de alto valor visual:

- lector en tres temas;
- tarjeta de obra;
- detalle de obra en móvil y escritorio;
- editor y estados de guardado;
- dashboard vacío y con datos.

No convertir cada píxel de la aplicación en un golden frágil.

### 14.5 End-to-end obligatorias antes del MVP

1. Registro -> verificación -> login -> logout -> refresh.
2. Escritor crea obra -> carga portada -> crea capítulo -> previsualiza -> publica.
3. Lector explora -> abre obra -> guarda -> lee -> cierra -> continúa desde posición.
4. Lector sigue autor -> autor publica otro capítulo -> biblioteca indica novedad.
5. Escritor consulta métricas luego de eventos válidos.
6. Usuario pierde red durante lectura -> progreso se sincroniza al volver.
7. Escritor pierde red durante edición -> borrador local se recupera.
8. Dos dispositivos editan el mismo capítulo -> conflicto sin pérdida silenciosa.
9. Usuario reporta contenido -> admin resuelve -> contenido cambia de estado.
10. Cuenta cambia contraseña -> sesiones anteriores quedan revocadas.

### 14.6 Seguridad automatizada y manual

- análisis estático;
- auditoría de dependencias;
- detección de secretos;
- prueba de autorización horizontal para cada recurso;
- fuzzing básico de esquemas y documentos de capítulo;
- prueba de límites de subida;
- headers y CSP;
- revisión OWASP ASVS de controles relevantes;
- análisis dinámico en staging antes de beta pública;
- revisión manual de logs para comprobar ausencia de secretos.

### 14.7 Accesibilidad

Comprobar:

- WCAG 2.2 AA en Web para flujos principales;
- navegación completa por teclado;
- foco lógico y visible;
- lectores de pantalla Android y Web;
- zoom de navegador al 200 %;
- texto grande del sistema;
- contraste en todos los temas;
- etiquetas y nombres accesibles;
- reducción de movimiento;
- orientación y tamaños de pantalla soportados.

### 14.8 Rendimiento

Backend:

- carga de listado, detalle y capítulo;
- escritura de progreso/eventos;
- dashboard con datos realistas;
- consultas sin N+1;
- explain plans de consultas críticas.

Flutter:

- tiempo de arranque;
- scroll del lector y listas sin jank perceptible;
- memoria con capítulos largos;
- tamaño de imágenes y caché;
- tamaño de bundle Web;
- comportamiento en un dispositivo Android de gama media/baja.

Dataset de prueba mínimo para rendimiento:

- 10.000 usuarios;
- 2.000 obras;
- 40.000 capítulos;
- varios millones de eventos sintéticos;
- distribución sesgada, con algunas obras populares.

### 14.9 Criterio para una prueba estable

- controla sus datos;
- no depende del orden de ejecución;
- no usa sleeps arbitrarios;
- limpia o aísla estado;
- reporta causa útil;
- se ejecuta igual localmente y en CI;
- no oculta intermitencias con reintentos ilimitados.

---

## 15. DevOps, despliegue y operación

### 15.1 Entornos

#### Local

- API y Flutter en modo desarrollo;
- PostgreSQL y MinIO en Docker Compose;
- proveedor de email local/capturador;
- datos seed;
- observabilidad opcional.

#### Staging

- arquitectura cercana a producción;
- datos sintéticos o anonimizados;
- dominio y certificados reales;
- integraciones en modo sandbox;
- acceso restringido;
- despliegue automático desde rama principal o tag de staging.

#### Producción

- secretos separados;
- base administrada o respaldada;
- storage privado con CDN;
- alertas activas;
- acceso humano mínimo;
- migraciones controladas;
- rollback probado.

### 15.2 Pipeline de CI para cada pull request

1. Instalar dependencias desde lockfile.
2. Formato y lint.
3. Typecheck backend.
4. Analizador Flutter.
5. Pruebas unitarias.
6. Pruebas de integración con PostgreSQL.
7. Pruebas de widgets.
8. Generar OpenAPI y verificar que no haya diff inesperado.
9. Escanear secretos y dependencias.
10. Construir API y Flutter Web.
11. Construir imagen Docker sin publicarla o publicarla con tag efímero.

### 15.3 Pipeline de release

1. Verificar tag/versiones.
2. Ejecutar suite completa.
3. Construir artefactos reproducibles.
4. Generar y firmar checksums cuando aplique.
5. Publicar imagen por digest.
6. Respaldar o confirmar backup reciente.
7. Ejecutar migraciones compatibles hacia adelante.
8. Desplegar API con estrategia rolling o blue/green.
9. Ejecutar smoke tests.
10. Publicar Flutter Web y/o paquete móvil.
11. Monitorear errores, latencia y negocio durante ventana definida.
12. Registrar release y cambios.

### 15.4 Migraciones en despliegue

Para cambios incompatibles:

1. **Expandir:** agregar campos/tablas compatibles.
2. Desplegar código que escribe ambos formatos si hace falta.
3. **Backfill:** migrar datos fuera de la transacción de despliegue.
4. Cambiar lecturas al nuevo formato.
5. Observar.
6. **Contraer:** eliminar lo anterior en otra release.

Nunca ejecutar una migración destructiva automática junto con código que aún depende de la estructura eliminada.

### 15.5 Backups

- backup automático diario como mínimo;
- point-in-time recovery si el proveedor y presupuesto lo permiten;
- cifrado en tránsito y reposo;
- retención, por ejemplo 7 diarios, 4 semanales y 6 mensuales, ajustada a política;
- copia en ubicación/cuenta separada cuando sea viable;
- prueba de restauración trimestral y antes de beta pública;
- runbook con RPO y RTO.

Objetivos iniciales sugeridos:

- RPO: <= 24 h en beta cerrada; mejorar a <= 1 h antes de monetización;
- RTO: <= 8 h en beta cerrada; mejorar a <= 2 h en operación madura.

### 15.6 Observabilidad

#### Logs

Campos mínimos:

- timestamp;
- nivel;
- servicio y versión;
- entorno;
- request ID;
- route template;
- status code;
- duración;
- user ID pseudonimizado cuando sea necesario;
- error code;
- job ID.

No registrar bodies completos por defecto.

#### Métricas técnicas

- solicitudes por ruta y código;
- latencia p50/p95/p99;
- errores 5xx;
- conexiones y consultas lentas de DB;
- uso de pool;
- jobs pendientes/fallidos;
- uploads fallidos;
- refresh token reuse detectado;
- cache hit rate cuando exista caché;
- recursos de CPU, memoria y disco.

#### Métricas de negocio operativas

- registros/verificaciones;
- publicaciones;
- lectores activos;
- sesiones de lectura;
- progreso sincronizado con error;
- reportes abiertos y antigüedad;
- borradores con fallos de guardado.

No usar métricas de negocio como sustituto de analítica de producto bien gobernada.

### 15.7 Alertas iniciales

- API no disponible durante más de 5 minutos;
- tasa 5xx por encima de umbral;
- p95 degradado durante ventana sostenida;
- base de datos cerca de conexiones máximas;
- backup fallido o demasiado antiguo;
- almacenamiento cerca de cuota;
- cola de imágenes/jobs acumulada;
- error de login/refresh anómalo;
- ninguna métrica/evento recibido por un período inesperado;
- cola de moderación sin atender por encima del SLA interno.

Cada alerta debe apuntar a un runbook y tener propietario.

### 15.8 Runbooks mínimos

- API caída;
- base de datos no disponible;
- rollback de release;
- migración fallida;
- restauración de backup;
- storage/CDN caído;
- proveedor de email caído;
- refresh tokens comprometidos;
- secreto filtrado;
- contenido ilegal/urgente;
- error que amenaza borradores;
- degradación del pipeline de eventos.

### 15.9 Escalabilidad

Orden recomendado de optimización:

1. medir;
2. corregir N+1 e índices;
3. ajustar pool y consultas;
4. cachear lecturas reconstruibles;
5. mover trabajo pesado a worker;
6. escalar API horizontalmente;
7. usar réplica de lectura para analítica si es necesario;
8. particionar eventos;
9. extraer servicios solo si límites organizacionales o técnicos lo justifican.

---

## 16. Plan de ejecución del MVP

### 16.1 Estimación realista

La propuesta original de seis semanas solo es viable con alcance reducido, diseño previo, infraestructura preparada y varias personas trabajando en paralelo. Estimaciones de referencia:

| Capacidad | MVP núcleo | Beta pública estabilizada |
|---|---:|---:|
| 1 desarrollador full-time | 14-20 semanas | 20-28 semanas |
| 2 desarrolladores full-time | 9-13 semanas | 14-18 semanas |
| 3-4 personas multidisciplinarias | 7-10 semanas | 11-15 semanas |

No son compromisos. Deben recalibrarse tras el primer incremento vertical.

### 16.2 Fase 0: descubrimiento y fundación

**Objetivo:** eliminar decisiones bloqueantes y dejar un entorno reproducible.

Tareas:

- confirmar personas objetivo y recorridos prioritarios;
- definir política de contenido y edad;
- validar wireframes de lector y publicación;
- decidir formato de capítulos;
- crear ADR iniciales;
- inicializar estructura del repositorio;
- configurar formatter, lint, análisis y hooks opcionales;
- levantar PostgreSQL, MinIO y capturador de email local;
- configurar CI mínima;
- definir esquema de errores y OpenAPI;
- preparar entornos y gestión de secretos;
- crear backlog con criterios de aceptación.

Salida:

- una persona nueva puede levantar el proyecto siguiendo README;
- CI valida un cambio vacío/ejemplo;
- decisiones críticas están documentadas;
- los recorridos MVP tienen diseños revisables;
- no quedan dudas sobre qué está fuera de alcance.

### 16.3 Fase 1: incremento vertical de lectura

**Objetivo:** probar el recorrido más importante de punta a punta con datos seed.

Backend:

- modelos mínimos de usuario, obra y capítulo;
- endpoint público de listado, detalle y capítulo;
- seed con obras y capítulos;
- headers de caché;
- health checks y logs.

Flutter:

- navegación base;
- inicio con obras seed;
- detalle;
- lector con texto real;
- temas y tipografía local;
- errores y carga.

Pruebas:

- contrato de listado/detalle/capítulo;
- widget del lector;
- navegación E2E pública;
- rendimiento con capítulo largo;
- accesibilidad inicial.

Salida:

- un usuario anónimo puede descubrir y leer una obra publicada;
- el lector funciona en Android y Web;
- contenido inválido no rompe el renderer;
- métricas técnicas básicas están visibles.

### 16.4 Fase 2: identidad y perfiles

Backend:

- registro, verificación, login, refresh y logout;
- recuperación de contraseña;
- sesiones y revocación;
- perfil privado y público;
- rate limits;
- email asíncrono mediante outbox.

Flutter:

- formularios completos;
- almacenamiento seguro por plataforma;
- refresh concurrente;
- perfil y edición;
- rutas protegidas y retorno a intención.

Salida:

- ciclo de sesión probado en múltiples dispositivos;
- cambio de contraseña revoca sesiones;
- no existe enumeración evidente;
- observabilidad permite investigar fallos sin exponer secretos.

### 16.5 Fase 3: publicación del escritor

Backend:

- CRUD de obras y capítulos;
- estados y políticas;
- revisiones;
- subida/procesamiento de portadas;
- publicación, retiro y reordenamiento;
- control optimista de concurrencia.

Flutter:

- Mis obras;
- editor de obra;
- editor de capítulos;
- autosave local/remoto;
- preview;
- checklist de publicación;
- recuperación de conflicto y crash.

Salida:

- un escritor publica sin intervención administrativa;
- un borrador no se pierde en las pruebas de interrupción;
- un usuario no accede al borrador ajeno;
- la obra publicada aparece correctamente en exploración.

### 16.6 Fase 4: progreso, biblioteca y follows

Backend:

- biblioteca idempotente;
- follows idempotentes;
- progreso actual;
- eventos por lote;
- continuar leyendo;
- detección de capítulos nuevos.

Flutter:

- guardar obra y seguir autor;
- biblioteca;
- restaurar posición;
- caché local;
- cola offline;
- estado de capítulo nuevo.

Salida:

- progreso coherente entre dos dispositivos bajo reglas definidas;
- pérdida de red no pierde el avance;
- eventos duplicados no inflan datos;
- continuar leyendo conduce a la posición esperada.

### 16.7 Fase 5: descubrimiento y búsqueda

Backend:

- filtros y ordenamientos;
- búsqueda PostgreSQL;
- ranking popular transparente;
- paginación estable;
- protección de contenido maduro.

Flutter:

- búsqueda con debounce/cancelación;
- filtros;
- estados sin resultados;
- secciones recientes/populares;
- deep links compartibles.

Salida:

- resultados relevantes con dataset representativo;
- filtros combinados producen URLs/estado reproducible;
- consultas cumplen objetivo de latencia;
- no se filtran borradores ni suspendidos.

### 16.8 Fase 6: métricas del escritor

Backend:

- definición versionada de métricas;
- jobs de agregación;
- tablas diarias;
- endpoints de dashboard;
- umbral de privacidad;
- exclusión de tráfico interno.

Flutter:

- resumen;
- filtros de período;
- tabla por capítulo;
- retención;
- estados sin datos suficientes;
- ayuda sobre definiciones.

Salida:

- números reconciliados contra dataset controlado;
- jobs pueden repetirse sin duplicar;
- ningún autor obtiene identidad individual de lectores;
- cambios de fórmula quedan documentados.

### 16.9 Fase 7: reportes, administración y legal

Backend:

- crear reportes;
- cola administrativa;
- acciones y auditoría;
- suspensión/restauración;
- límites antiabuso;
- endpoints de eliminación/exportación necesarios.

Interfaces:

- reportar desde obra/capítulo/perfil;
- panel administrativo web responsive o interfaz interna separada;
- estados y resolución;
- enlaces legales y aceptación versionada.

Salida:

- todo contenido público tiene vía de reporte;
- suspensión retira acceso según política;
- cada acción administrativa queda auditada;
- proceso urgente y SLA interno están documentados.

### 16.10 Fase 8: endurecimiento y beta cerrada

Tareas:

- ejecutar E2E completa;
- revisar accesibilidad;
- carga y consultas;
- threat modeling y seguridad;
- ensayo de restore;
- prueba de rollback;
- revisar dashboards y alertas;
- pruebas con autores/lectores reales;
- corregir bloqueos de activación;
- revisar textos legales;
- preparar soporte y canal de feedback;
- congelar cambios de alcance durante estabilización.

Salida:

- todos los criterios de release de la sección siguiente cumplidos;
- incidentes críticos conocidos cerrados;
- soporte sabe reproducir y escalar problemas;
- existe decisión explícita de go/no-go.

---

## 17. Criterios de aceptación y salida del MVP

### 17.1 Funcionales

- usuario puede crear, verificar, recuperar y eliminar su cuenta;
- sesión rota y se revoca correctamente;
- escritor crea y publica obra/capítulo;
- borradores sobreviven interrupciones probadas;
- lector descubre, guarda, lee y continúa;
- preferencias persisten;
- progreso se sincroniza de forma idempotente;
- autor ve métricas básicas válidas;
- usuario reporta contenido;
- admin resuelve y audita;
- contenido maduro sigue política;
- enlace externo de apoyo funciona y está claramente delimitado.

### 17.2 Técnicos

- CI verde desde un checkout limpio;
- staging reproduce arquitectura esencial;
- OpenAPI coincide con implementación;
- migraciones probadas;
- backup y restore probados;
- rollback de una release ensayado;
- alertas críticas verificadas;
- logs sin secretos;
- objetivos de latencia alcanzados con carga prevista;
- cero vulnerabilidades críticas conocidas;
- análisis de autorización completo;
- app estable en matriz mínima de dispositivos/navegadores.

### 17.3 Producto y operación

- al menos un grupo piloto de lectores y escritores completó recorridos;
- soporte, moderación e incidentes tienen propietarios;
- políticas publicadas y aceptaciones versionadas;
- eventos de analítica son verificables;
- se puede medir activación y continuación;
- existe un canal de feedback y proceso de priorización;
- no hay dependencia manual oculta para publicar o leer.

### 17.4 Defectos bloqueantes

No liberar si existe:

- pérdida o corrupción de borradores;
- acceso a contenido privado ajeno;
- bypass de suspensión o madurez relevante;
- refresh token reutilizable sin detección;
- migración no recuperable;
- backup no restaurable;
- crash frecuente del lector;
- métricas evidentemente infladas o identificables;
- falta de capacidad para retirar contenido urgente;
- secretos o PII en logs.

---

## 18. Hoja de ruta posterior al MVP

El orden posterior debe responder a evidencia. Cada etapa tiene condiciones de entrada; no se activa solo porque estaba en la lista original.

### 18.1 Etapa A: estabilización y aprendizaje

**Horizonte:** primeras 4-8 semanas después de beta.

Objetivos:

- mejorar activación y retención;
- reducir errores y soporte;
- estabilizar publicación y medición;
- identificar comunidades y géneros con mayor tracción.

Trabajo:

- embudos de registro, publicación y lectura;
- feedback dentro de la app sin interrumpir lectura;
- mejoras de onboarding;
- reintentos y diagnósticos de sincronización;
- búsqueda y filtros basados en consultas reales;
- herramientas de soporte seguras;
- panel de salud de contenido y jobs;
- exportación básica del contenido del escritor;
- historial de revisiones más usable;
- optimización de accesibilidad y rendimiento.

Puerta de salida:

- datos confiables durante varias semanas;
- tasa de crashes y 5xx controlada;
- no existe cola operativa insostenible;
- escritores piloto publican sin asistencia frecuente.

### 18.2 Etapa B: notificaciones

Empezar con notificaciones de alto valor:

- nuevo capítulo de autor seguido u obra en biblioteca;
- respuesta administrativa sobre reporte;
- seguridad de cuenta;
- recordatorio de borrador solo con consentimiento.

Arquitectura:

- preferencias por canal y tipo;
- tabla de dispositivos/tokens;
- outbox y workers;
- deduplicación;
- quiet hours y timezone;
- deep link válido;
- métricas de entrega, apertura y desuscripción;
- email fallback selectivo.

No enviar campañas masivas sin controles de consentimiento, frecuencia y cancelación.

Condición de entrada: follows/biblioteca usados de forma recurrente y pipeline de eventos estable.

### 18.3 Etapa C: comentarios y reseñas

Separar:

- comentarios por capítulo;
- reseña de obra con una por usuario;
- respuestas;
- reacciones opcionales posteriores.

Necesidades:

- edición y borrado lógico;
- reportes;
- rate limit y detección de spam;
- bloqueo de usuarios antes o junto con mensajería;
- ordenamiento;
- notificaciones;
- política de spoilers;
- moderación y apelaciones;
- conteos materializados reconstruibles.

Condición de entrada: capacidad de moderación con SLA aceptable. No lanzar interacción social si el equipo no puede atender abuso.

### 18.4 Etapa D: recomendaciones

#### Fase D1: recomendación editorial y heurística

- mismo género;
- obras leídas juntas;
- popularidad con decaimiento temporal;
- diversidad de autores;
- exclusión de contenido ya descartado o no elegible;
- controles explícitos de madurez e idioma.

#### Fase D2: personalización

- eventos de impresión, clic, apertura, progreso y finalización;
- separación entrenamiento/evaluación temporal;
- candidatos y ranking;
- evaluación offline y experimento controlado;
- explicabilidad simple: “porque sigues a...” o “similar a...”;
- opción para reiniciar/personalizar historial;
- protección contra bucles de popularidad.

Métricas:

- apertura por impresión;
- lectura significativa, no solo clic;
- diversidad y cobertura;
- repetición/ocultamiento;
- impacto en continuación semanal;
- exposición justa de autores nuevos.

Condición de entrada: suficiente volumen de eventos confiables. Sin volumen, las heurísticas serán más efectivas y transparentes.

### 18.5 Etapa E: offline avanzado

Capacidades:

- descargar obra o capítulos seleccionados;
- cuotas y administración de almacenamiento;
- cifrado local razonable para contenido premium futuro;
- manifest con versiones/checksums;
- actualización diferencial;
- cola de progreso/eventos;
- resolución de contenido retirado;
- políticas de expiración;
- indicador de última sincronización.

Conflictos:

- progreso: gana la actualización más reciente válida, conservando máximo significativo si timestamps son dudosos;
- biblioteca/follows: operaciones idempotentes con orden lógico;
- borradores: nunca usar last-write-wins silencioso; conservar ambas versiones;
- contenido publicado: servidor es autoridad y el cliente mantiene snapshot legible según política.

Condición de entrada: evidencia de usuarios con conectividad limitada y una base local estable.

### 18.6 Etapa F: monetización externa mejorada

Antes de pagos nativos:

- múltiples enlaces de apoyo permitidos;
- analítica agregada de clics con consentimiento;
- verificación de dominios;
- advertencias antifraude;
- perfil de creador más rico;
- transparencia sobre relación externa.

Ventaja: valida intención de apoyo sin asumir KYC, custodia, disputas, impuestos ni payouts.

### 18.7 Etapa G: pagos y donaciones nativas

Esta etapa es un proyecto propio, no un endpoint adicional.

Decisiones previas:

- países y monedas;
- merchant of record o marketplace;
- proveedor con cuentas conectadas;
- KYC/KYB;
- edad mínima;
- impuestos y facturación;
- comisiones, devoluciones y chargebacks;
- payout schedule;
- contenido prohibido por proveedor;
- soporte financiero y reconciliación.

Modelo mínimo:

- `connected_accounts`;
- `payment_intents`;
- `donations`;
- `platform_fees`;
- `refunds`;
- `payouts`;
- `webhook_events`;
- ledger de doble entrada o proveedor/abstracción contable sólida.

Reglas técnicas:

- webhooks autenticados e idempotentes;
- estado del proveedor es autoridad para pago;
- nunca confirmar por retorno del navegador solamente;
- importes enteros y moneda explícita;
- reconciliación diaria;
- auditoría inmutable;
- alertas por desbalance;
- pruebas sandbox y casos de fallo;
- política de reembolso visible.

La comisión del 10 % debe ser configuración versionada y registrada por transacción, no un literal disperso.

Condición de entrada: intención de pago demostrada, asesoría legal/tributaria y capacidad de soporte.

### 18.8 Etapa H: capítulos premium y suscripciones

Requiere:

- catálogo de productos/precios;
- derechos de acceso (`entitlements`);
- preview;
- compra, renovación, cancelación y gracia;
- restaurar compras móviles;
- reglas App Store/Play Store;
- reparto al autor;
- devoluciones;
- acceso offline;
- retiro de contenido comprado;
- portabilidad y soporte.

No basar autorización en un booleano `is_premium`. Consultar entitlement vigente y mantener un snapshot verificable.

### 18.9 Etapa I: mensajería

Riesgo alto de abuso. Incluir desde el primer release:

- opt-in y quién puede contactar;
- bloqueo;
- reportes;
- rate limits;
- solicitudes de mensaje;
- anti-spam;
- moderación y retención;
- protección de menores;
- notificaciones configurables;
- eliminación y exportación.

Arquitectura inicial puede ser HTTP + polling/notificación; WebSocket solo si la experiencia realmente requiere tiempo real.

Condición de entrada: moderación madura y demanda comprobada que comentarios no resuelvan.

### 18.10 Etapa J: comunidades y foros

Componentes:

- espacios por obra o tema;
- posts y respuestas;
- roles de moderación comunitaria;
- fijados y bloqueos;
- reportes;
- reputación limitada;
- búsqueda;
- anti-spam;
- archivo y retención.

Comenzar con comunidades piloto administradas. La operación y seguridad importan más que el editor de posts.

### 18.11 Etapa K: traducción

Dos productos distintos:

1. Interfaz localizada.
2. Traducción de contenido de usuarios.

Para contenido:

- consentimiento explícito del autor;
- atribución de traducción automática/humana;
- costos y cuotas;
- versiones ligadas al capítulo fuente;
- invalidación al editar fuente;
- glosario y nombres propios;
- revisión humana opcional;
- almacenamiento por idioma;
- copyright y términos del proveedor;
- reporte de traducción problemática.

Condición de entrada: demanda multilingüe medida y modelo de costos sostenible.

### 18.12 Etapa L: escritorio

Flutter Desktop puede compartir gran parte del código, pero requiere:

- navegación, menús y atajos propios;
- ventanas y tamaños adaptables;
- integración de archivos para importación/exportación;
- actualizaciones;
- firma y distribución;
- almacenamiento seguro por OS;
- pruebas Windows/macOS/Linux definidas;
- editor optimizado para teclado.

Priorizar escritorio para escritores si las entrevistas muestran que editan textos largos fuera del móvil.

### 18.13 Etapa M: escala y arquitectura avanzada

Solo con evidencia:

- CDN para contenido público cacheable;
- read replicas;
- partición de eventos;
- data warehouse para analítica;
- servicio dedicado de búsqueda;
- colas administradas;
- extracción de media/notifications/analytics;
- multi-región;
- disaster recovery más estricto;
- feature flags y experimentación;
- SLOs por servicio.

La extracción se decide por carga, aislamiento de fallos, propiedad de equipo o ritmo de despliegue, no por moda.

---

## 19. Registro de riesgos

| Riesgo | Probabilidad | Impacto | Mitigación inicial | Señal de alerta |
|---|---|---|---|---|
| Alcance excesivo | Alta | Alto | MVP núcleo y control de cambios | Historias nuevas entran sin retirar otras |
| Pérdida de borradores | Media | Crítico | autosave local/remoto, versiones, E2E | reportes de contenido desaparecido |
| Métricas incorrectas | Alta | Alto | eventos idempotentes y datasets controlados | autores ven saltos imposibles |
| Abuso/moderación | Media | Alto | política, reportes, auditoría, rate limits | cola crece sobre SLA |
| Costos de storage/eventos | Media | Medio | cuotas, compresión, retención | crecimiento por usuario no controlado |
| Auth Web insegura | Media | Crítico | cookie HttpOnly para refresh, CSP | token accesible o filtrado |
| Búsqueda pobre | Media | Medio | telemetría y PostgreSQL trigram | muchas búsquedas sin apertura |
| Calendario irreal | Alta | Alto | estimación por throughput y gates | calidad se difiere para cumplir fecha |
| Dependencia de proveedor | Media | Medio | adaptadores y exportación | cambio de precio/SLA |
| Pagos prematuros | Alta | Alto | enlaces externos primero | soporte/legal sin resolver |
| Falta de contenido inicial | Alta | Alto | programa piloto de autores | catálogo vacío en beta |
| Scraping/copia | Alta | Medio | rate limit, detección, términos | tráfico automatizado anómalo |
| Migración destructiva | Baja/Media | Crítico | expand/backfill/contract y backups | locks o errores en staging |
| Una sola persona operando | Alta | Alto | runbooks, automatización, alcance | incidentes sin respuesta |

Revisar el registro en cada hito y asignar propietario a riesgos altos/críticos.

---

## 20. Gestión de trabajo y calidad

### 20.1 Definition of Ready

Una tarea está lista cuando:

- tiene objetivo de usuario o técnico;
- alcance y no-alcance explícitos;
- diseño o contrato suficiente;
- dependencias identificadas;
- criterios de aceptación verificables;
- implicaciones de seguridad/privacidad revisadas;
- estrategia de prueba definida;
- no depende de una decisión comercial abierta.

### 20.2 Definition of Done

Una tarea está terminada cuando:

- código revisado e integrado;
- formato, lint y typecheck pasan;
- pruebas proporcionales al riesgo pasan;
- contratos/documentación actualizados;
- migraciones probadas si existen;
- accesibilidad revisada en UI;
- logs, métricas y errores relevantes existen;
- no se registran datos sensibles;
- feature flag/configuración documentada;
- criterios de aceptación demostrados en entorno adecuado;
- no deja TODO crítico sin ticket propietario.

### 20.3 Control de cambios de alcance

Para una nueva función durante MVP:

1. describir hipótesis que valida;
2. indicar qué métrica cambia;
3. estimar dependencias y riesgo;
4. decidir qué trabajo sale del hito;
5. actualizar contratos y criterios;
6. registrar decisión.

La frase “es pequeño” no sustituye análisis. Una función de interfaz puede implicar modelo, permisos, migración, moderación, offline, analítica y soporte.

### 20.4 Pull requests

- pequeñas y con un objetivo;
- descripción del comportamiento;
- riesgos y migraciones;
- evidencia de prueba;
- capturas solo cuando ayudan a revisar UI;
- checklist de privacidad y accesibilidad cuando aplica;
- sin refactors no relacionados;
- contratos cambiados claramente señalados.

### 20.5 Bugs

Clasificación sugerida:

- P0: pérdida de datos, compromiso, indisponibilidad general;
- P1: flujo crítico bloqueado o acceso incorrecto;
- P2: degradación importante con workaround;
- P3: defecto menor o cosmético.

Todo bug debe incluir entorno, versión, pasos, esperado, observado, evidencia y alcance. Para pérdida de borradores, preservar logs y snapshots sin exponer contenido a personal no autorizado.

---

## 21. Backlog inicial sugerido

Orden de las primeras tareas técnicas:

1. Crear ADR de stack, auth, contenido y analítica.
2. Crear monorepo/directorios y README de desarrollo.
3. Crear Docker Compose con PostgreSQL, MinIO y email local.
4. Inicializar Fastify/TypeScript y health checks.
5. Inicializar Flutter, flavors y navegación.
6. Configurar CI, lint, typecheck y pruebas mínimas.
7. Definir esquema OpenAPI base y formato de errores.
8. Modelar géneros, usuarios, perfiles, obras y capítulos.
9. Crear seed y endpoint público de obras.
10. Implementar detalle y lectura de capítulo.
11. Construir lector Flutter con preferencias locales.
12. Validar el incremento vertical en Android y Web.
13. Implementar autenticación y sesiones.
14. Construir publicación con autosave y revisiones.
15. Incorporar media, progreso, biblioteca y follows.
16. Agregar búsqueda, métricas y moderación.
17. Endurecer y liberar beta.

Cada ítem debe dividirse en tareas que puedan completarse y validarse dentro de pocos días. Evitar ramas de varias semanas.

---

## 22. Decisiones pendientes antes de comenzar

Aunque esta guía ofrece una referencia, el equipo debe confirmar:

1. Países y edad mínima del lanzamiento.
2. Android + Web como plataformas iniciales o inclusión de iOS.
3. Formato exacto del documento de capítulos.
4. Política de contenido maduro.
5. Si la verificación de email es obligatoria para leer, escribir o solo publicar.
6. Proveedor de hosting, PostgreSQL, storage y email.
7. Política de nombres de usuario y cambios.
8. Retención de eventos y backups.
9. Licencias de fuentes y dependencias.
10. Quién atiende moderación e incidentes.
11. Alcance del panel administrativo.
12. Métricas objetivo de la beta y tamaño del grupo piloto.

Estas decisiones deben resolverse en la Fase 0. Las que afecten seguridad, legal o modelo de datos deben registrarse.

---

## 23. Conclusión de la revisión

La visión original es viable, pero el listado V2 no debe tratarse como una única entrega de seis semanas. El núcleo valioso es más pequeño: publicar con seguridad, descubrir contenido, leer de forma excelente, conservar progreso y ofrecer señales básicas al escritor.

La secuencia recomendada reduce los riesgos principales:

1. validar primero la experiencia de lectura;
2. construir identidad y publicación sin pérdida de datos;
3. incorporar continuidad, biblioteca y descubrimiento;
4. medir con definiciones confiables;
5. operar moderación y seguridad antes de abrir el crecimiento social;
6. demostrar intención económica antes de asumir pagos nativos;
7. escalar arquitectura solo a partir de evidencia.

El MVP se considera exitoso no por contener todas las funciones de la especificación, sino por demostrar que lectores regresan, escritores publican y el sistema puede operar de forma segura y sostenible.

---

## Apéndice A. Checklist de release

### Producto

- [ ] Recorridos críticos aprobados.
- [ ] Textos y estados vacíos revisados.
- [ ] Deep links verificados.
- [ ] Contenido maduro validado.
- [ ] Feedback piloto revisado.

### Backend

- [ ] Migraciones aplicadas en staging.
- [ ] OpenAPI actualizado.
- [ ] Rate limits activos.
- [ ] Jobs monitoreados.
- [ ] Consultas críticas medidas.
- [ ] Backfill terminado si aplica.

### Flutter

- [ ] Android en dispositivos objetivo.
- [ ] Web en navegadores objetivo.
- [ ] Flavors y endpoints correctos.
- [ ] Tokens y datos privados protegidos.
- [ ] Offline y recuperación probados.
- [ ] Accesibilidad crítica aprobada.

### Seguridad y legal

- [ ] Dependencias sin vulnerabilidades críticas conocidas.
- [ ] Escaneo de secretos limpio.
- [ ] Autorización horizontal revisada.
- [ ] Administradores con MFA.
- [ ] Políticas publicadas y versionadas.
- [ ] Procedimiento de reporte operativo.

### Operación

- [ ] Backup reciente confirmado.
- [ ] Restore ensayado.
- [ ] Rollback ensayado.
- [ ] Dashboards y alertas activos.
- [ ] Runbooks accesibles.
- [ ] Responsables de guardia/soporte definidos.

---

## Apéndice B. Plantilla de historia implementable

```markdown
# [Título]

## Objetivo
Como [persona], quiero [capacidad] para [resultado].

## Alcance
- ...

## Fuera de alcance
- ...

## Reglas
1. ...

## Contrato/API/datos
- ...

## Estados de interfaz
- carga
- contenido
- vacío
- error
- offline
- permiso/sesión

## Seguridad y privacidad
- ...

## Criterios de aceptación
- Dado ..., cuando ..., entonces ...

## Pruebas
- unitarias
- integración
- E2E

## Observabilidad
- logs
- métricas
- alertas

## Rollout y rollback
- ...
```

---

## Apéndice C. Glosario

- **Obra:** publicación principal que agrupa capítulos.
- **Capítulo publicado:** versión visible a lectores.
- **Borrador:** contenido visible solo para su propietario y acceso administrativo autorizado.
- **Progreso:** posición actual usada para continuar lectura.
- **Evento de lectura:** señal inmutable e idempotente usada para analítica.
- **Vista válida:** apertura que cumple umbral de actividad/progreso y deduplicación.
- **Lector único:** usuario distinto con vista válida en el período.
- **Retención de capítulo:** proporción de lectores que continúa de N a N+1 bajo una ventana definida.
- **Outbox:** tabla transaccional de eventos pendientes para efectos externos.
- **Entitlement:** derecho verificable a acceder a contenido premium futuro.
- **RPO:** máxima pérdida de datos tolerable medida en tiempo.
- **RTO:** tiempo objetivo para restaurar el servicio.
- **ADR:** registro de una decisión arquitectónica y sus consecuencias.

---

## Apéndice D. Trazabilidad con la especificación V2

| Requisito o propuesta V2 | Tratamiento en esta guía | Momento recomendado |
|---|---|---|
| Flutter Android/iOS/Web | Android y Web primero; iOS se habilita tras estabilizar el núcleo | MVP / posterior según capacidad |
| Node.js + PostgreSQL | Fastify + TypeScript + Prisma + PostgreSQL | MVP |
| Riverpod o BLoC | Riverpod como decisión de referencia | Fundación |
| Access + refresh JWT | Access JWT corto y refresh sessions rotativas y revocables | MVP |
| bcrypt | Argon2id recomendado; bcrypt costo 12 como fallback | MVP |
| Roles reader/writer/admin | Leer y escribir son capacidades; admin es privilegio separado | MVP |
| Validación Joi/Zod | Zod y OpenAPI | MVP |
| Rate limiting | Políticas por acción, identidad e IP | MVP |
| Registro/login/me | Contrato ampliado con verificación, refresh, logout y recuperación | MVP |
| Listado y detalle de obras | API `/v1`, filtros, visibilidad y paginación | MVP |
| CRUD de obras | Estados y acciones explícitas de publicar/completar/archivar | MVP |
| CRUD de capítulos | Guardado versionado, preview, publicación, retiro y revisiones | MVP |
| No borrar publicados | Borrado lógico y `unpublished`/`archived` | MVP |
| Reading log | Separado en progreso mutable y eventos append-only | MVP |
| Biblioteca | Operaciones idempotentes y detección de capítulo nuevo | MVP |
| Follows | Operaciones idempotentes y base para notificaciones futuras | MVP |
| Dashboard general/por obra | Endpoints agregados, privacidad y definiciones métricas | MVP |
| Reportes | Flujo completo con cola, resolución y auditoría | MVP |
| Vistas por capítulo | Vista válida deduplicada, no apertura bruta | MVP |
| Lectores únicos | Usuarios distintos con política para anónimos | MVP |
| Retención N a N+1 | Cohortes y ventana de oportunidad definidas | MVP |
| Tiempo promedio | Heartbeats activos validados por servidor | MVP |
| Seguidores y popularidad | Agregados reconstruibles | MVP |
| Subida de portadas/avatares | Assets con estados, validación real y worker | MVP |
| Sharp, WebP, 800x1200 | Variantes, eliminación de metadatos y límites de píxeles | MVP |
| Disco local o bucket | MinIO/local en desarrollo; S3 compatible en producción | MVP |
| Cache node-cache/Redis | HTTP/CDN e índices primero; Redis solo con evidencia | MVP / evolución |
| Page/limit | Se mantiene con límites; cursor futuro para alto volumen | MVP |
| Users, Stories, Chapters | Esquema ampliado con estados, timestamps y constraints | MVP |
| Genres/story_genres | Catálogo seed y máximo de géneros recomendado | MVP |
| Comments | Requiere moderación, bloqueo y notificaciones | Post-MVP etapa C |
| Reports | Modelo polimórfico y acciones auditadas | MVP |
| Reading_Logs | Reemplazado por `reading_progress` + `reading_events` | MVP |
| Explorar, filtros y búsqueda | PostgreSQL trigram, recientes y popularidad transparente | MVP |
| Detalle de obra | Estados, madurez, progreso y acciones completas | MVP |
| Lector personalizable | Diseño, persistencia, progreso, offline y accesibilidad detallados | MVP |
| Continuar leyendo | Endpoint y restauración por ancla/versionado | MVP |
| Biblioteca personal | Progreso, novedades y caché local | MVP |
| Perfil público y donaciones | Enlace externo validado con advertencia | MVP |
| Mis obras | Superficie operativa para autores | MVP |
| Editor de obra/capítulo | Autosave, conflictos, recuperación y preview real | MVP |
| Texto enriquecido básico | JSON estructurado con nodos permitidos | MVP |
| Dashboard con gráficos | Resumen, tabla y retención con estados de datos insuficientes | MVP |
| Navegación base | Rutas, guards y deep links definidos | MVP |
| Carga y errores | Matriz global de estados por pantalla | MVP |
| Offline básico | Caché reciente y cola de progreso/eventos | MVP |
| Pagos Stripe/PayPal | No procesar pagos en MVP; validar apoyo externo primero | Post-MVP etapa G |
| Comisión 10 % | Configuración versionada y ledger, no literal fijo | Post-MVP etapa G |
| Donations | Modelo financiero ampliado con intents, refunds y payouts | Post-MVP etapa G |
| Supporters de plataforma | Depende de consentimiento y estado real del pago | Post-MVP etapa G |
| Moderación previa al publicar | Moderación reactiva por defecto; premoderación solo con razón legal/riesgo | MVP |
| Panel simple de moderación | Cola, asignación, resolución, suspensión y restauración | MVP |
| ToS y privacidad | Se amplía a contenido, copyright, cookies y derechos de datos | Antes de beta pública |
| PM2 | No necesario dentro de contenedor; usar supervisor del entorno | Infraestructura |
| Nginx/SSL/gzip | Proxy o servicio administrado equivalente | MVP |
| Backups cron | Backup administrado, retención, restore y RPO/RTO | MVP |
| Pino/Winston | Pino JSON y correlación | MVP |
| `.env` | Esquema validado y gestor de secretos | MVP |
| Docker opcional | Recomendado para entorno reproducible y despliegue | Fundación |
| Notificaciones push | Preferencias, outbox, deduplicación y quiet hours | Post-MVP etapa B |
| Algoritmo de recomendación | Heurísticas primero; personalización solo con volumen fiable | Post-MVP etapa D |
| Mensajería | Incluye bloqueo, solicitudes, anti-spam y protección de menores | Post-MVP etapa I |
| Capítulos premium | Entitlements, tiendas móviles, refunds y acceso offline | Post-MVP etapa H |
| Escritorio | Priorización orientada a escritores y flujo con teclado | Post-MVP etapa L |
| Traducción automática | Consentimiento, versiones, costos y revisión | Post-MVP etapa K |
| Foros/comunidades | Moderación comunitaria, reputación y anti-spam | Post-MVP etapa J |
| Offline avanzado | Descargas, manifest, cuotas y resolución de conflictos | Post-MVP etapa E |
