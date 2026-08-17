# Auditoría ReadInn — Checklist de remediación

**Fecha de actualización:** 2026-08-17
**Commit base auditado:** `a80fb15`
**Estado:** cambios implementados y verificados localmente; todavía no publicados en GitHub.

Este documento resume el trabajo realizado a partir de `01-CRITICO.md`, `02-MEJORAS.md` y
`03-MENORES.md`. Una casilla marcada significa que el riesgo descrito quedó corregido en el
código actual. Las casillas pendientes requieren infraestructura, integración externa o trabajo
adicional.

## Hallazgos críticos

- [x] **C1 — Bypass de autenticación:** eliminada la aceptación de tokens legacy sin firma; se validan firma, expiración y tipo de JWT.
- [x] **C1 — Secreto JWT:** `JWT_SECRET` es obligatorio fuera del modo fixture y se configura mediante el schema de entorno.
- [x] **C2 — Fallback inseguro por caída de PostgreSQL:** el modo fixture ahora es explícito y una falla de producción no activa autenticación simulada.
- [x] **C3 — IDOR de capítulos:** la consulta vincula siempre el capítulo con la obra indicada y mantiene el gate de contenido adulto.
- [x] **C4 — Moderación sin autenticación:** las rutas administrativas exigen un administrador real y los cambios de estado se persisten.
- [x] **C4 — Media pública:** intentos, carga y confirmación exigen sesión; se validan tamaño, tipo y firma de archivo.
- [x] **C5 — Estado de lector en RAM:** biblioteca, progreso, likes y follows se persisten en Prisma en producción.
- [x] **C5 — Aislamiento por usuario:** biblioteca y progreso requieren sesión y ya no comparten una identidad `guest`.
- [x] **C6 — Hash de contraseñas:** PBKDF2 usa 210.000 iteraciones, salt aleatorio y comparación constante, con rehash al iniciar sesión.
- [x] **C6 — Sesiones de refresco:** refresh tokens rotan, se almacenan mediante hash y pueden revocarse con logout/logout-all.
- [x] **C6 — Recuperación engañosa:** los endpoints aún no implementados responden `501` en lugar de fingir éxito.
- [ ] **C6 — Recuperación real y verificación de correo:** falta integrar proveedor de correo, tokens de recuperación y activación de cuenta.
- [x] **C7 — Catálogo cargado en memoria:** filtros, orden, conteo y paginación se ejecutan en PostgreSQL.
- [x] **C7 — Métricas del catálogo:** rating y lecturas se desnormalizan en `Story` para evitar agregaciones completas por petición.
- [x] **C8 — Caché sin límites:** memoria acotada, claves hasheadas, invalidación por tags y escritura atómica mediante archivo temporal.

## Mejoras recomendadas

- [x] **M1 — Probe de base por operación:** `checkDatabaseConnection()` ya no ejecuta `SELECT 1` en cada llamada.
- [x] **M2 — Listados ilimitados:** comentarios, perfiles y reportes tienen límites; comentarios admiten cursor y máximo de 100 por página.
- [x] **M3 — Métricas inventadas/manipulables:** métricas visibles salen de datos persistidos y la clave anónima usa un salt independiente.
- [ ] **M3 — Retención de eventos:** falta una política de retención o rollup periódico para `ReadingEvent`.
- [x] **M4 — IP en proxy Next:** se reenvía la IP del cliente conservando la cadena de proxies confiables.
- [x] **M5 — Contenido enriquecido sin esquema:** TipTap se valida recursivamente, con nodos, marcas, atributos, URLs y tamaños permitidos.
- [x] **M5 — Enlaces del editor:** sólo se aceptan `http`, `https` y `mailto` tanto en web como en API.
- [x] **M6 — Carrera al crear capítulos:** posición y creación usan transacción y advisory lock por obra.
- [x] **M6 — Taxonomía:** géneros/tags se validan contra catálogo cerrado, se resuelven en lote y dentro de la transacción.
- [x] **M7 — Separación fixture/producción:** el modo fixture depende de `READINN_FIXTURE_MODE`, no de errores de PostgreSQL.
- [ ] **M7 — Tests con PostgreSQL real:** la ruta Prisma compila, pero falta una base efímera de integración en CI.
- [x] **M8 — CORS:** origen limitado a `APP_WEB_URL` con credenciales coherentes.
- [x] **M8 — Rate limits por ruta:** límites dedicados para login, registro, comentarios, reportes y descargas.
- [ ] **M8 — Rate limit distribuido:** falta un store Redis para despliegues con múltiples réplicas.
- [x] **M9 — Suplantación en comentarios:** publicar y responder exige sesión; el nombre se obtiene del usuario autenticado.
- [x] **M9 — Comentarios ocultos:** `includeHidden=true` queda restringido a administradores.
- [x] **M9 — Profundidad de respuestas:** se persiste `depth` y se rechazan cadenas superiores a 8 niveles.
- [x] **M10 — Recargas del hilo:** publicar y votar actualizan estado local sin descargar todos los comentarios.
- [x] **M10 — Filtrado cuadrático:** comentarios por párrafo y respuestas se indexan una vez con `useMemo`.
- [x] **M10 — Carreras del lector:** el efecto usa cancelación y depende de campos estables del usuario.
- [x] **M11 — Tag `+18`:** fuerza clasificación `18` y activa el gate del servidor.
- [ ] **M11 — Verificación formal de edad:** la confirmación sigue siendo autodeclarada; falta definir fecha de nacimiento y política legal.

## Observaciones menores y deuda técnica

- [x] **O1 — Portada:** create/update aceptan el mismo contrato: color hexadecimal de seis dígitos o URL HTTP(S).
- [x] **O2 — Proxy de imágenes:** Next limita imágenes remotas al dominio de media configurado para ReadInn.
- [x] **O3 — SEO:** eliminado el fallback silencioso hacia producción; `READINN_API_URL` debe estar configurada.
- [x] **O4 — Sitemap:** endpoint dedicado evita recorrer hasta 100 páginas del catálogo.
- [x] **O5 — Importación `replace`:** actualiza la obra y capítulos existentes por posición, preservando IDs, ratings, likes, comentarios y analítica.
- [x] **O6 — Autores importados:** cuentas generadas se marcan como `isPlaceholder` y no pueden autenticarse con el hash interno.
- [x] **O7 — Salt de analítica:** añadido `ANALYTICS_SALT`, separado de `JWT_SECRET`.
- [x] **O8 — Confirmación de media inexistente:** un `mediaId` desconocido devuelve error en lugar de fabricar una URL.
- [x] **O9 — Estado de producción en módulos:** los datos de usuario y moderación se persisten; los mocks quedan limitados al modo fixture.
- [x] **O10 — Escritura de caché:** archivo temporal y `rename` atómico.
- [x] **O11 — Reordenamiento de capítulos:** eliminada la suposición de posiciones menores a 100.000.
- [x] **O12 — Conteo de palabras:** helper iterativo compartido, sin materializar un array por palabra.
- [x] **O13 — Docker local:** puertos ligados a `127.0.0.1` y credenciales exigidas mediante `.env`.
- [x] **O14 — Progreso móvil:** la clave local usa `userId` extraído del JWT, no el token rotatorio completo.
- [x] **O15 — Likes y follows:** ambos flujos usan persistencia Prisma en producción.
- [x] **O16 — `/v1/auth/me`:** ausencia o invalidez de sesión responde `401`, sin usuario ficticio.
- [x] **O17 — Contratos y tipos:** reducidos casts inseguros, extraídos guards/identificadores y validaciones compartidas.
- [x] **O18 — Descargas:** rate limit dedicado y máximo de 200 capítulos por exportación.
- [ ] **O18 — Exportación streaming:** EPUB/PDF todavía se construyen en memoria; falta streaming o artefactos precalculados en R2.

## Funcionalidad editorial adicional

- [x] Añadido `StoryCreationMethod` con valores `human`, `ai_assisted` y `ai_generated`.
- [x] **Creada por autor:** escrita completamente por una persona.
- [x] **Asistida por IA:** el autor escribió la historia y usó IA como apoyo.
- [x] **Generada por IA:** la mayor parte del contenido fue generado por IA.
- [x] Selector disponible al crear y editar historias en web y móvil.
- [x] Badge visible en tarjetas, detalle web y detalle móvil.
- [x] Filtro por origen editorial en el explorador.
- [x] API, fixtures, importación masiva y PATCH de historia preservan el valor.

## Verificación ejecutada

- [x] `pnpm prisma:generate`
- [x] `pnpm build:api`
- [x] `pnpm lint:api`
- [x] `pnpm typecheck:web`
- [x] `pnpm build:web`
- [x] `pnpm test:api -- --testTimeout=15000` — 25/25 pruebas.
- [x] `flutter analyze` — sin observaciones.
- [x] `docker compose config --quiet`
- [x] Comprobación HTTP de API, sitemap y frontend local.

## Antes del despliegue

- [ ] Revisar y definir las variables a partir de `.env.example`.
- [ ] Aplicar `apps/api/prisma/migrations/20260817130000_security_foundations/migration.sql`.
- [ ] Ejecutar pruebas de integración contra una instancia PostgreSQL desechable.
- [ ] Confirmar backup y plan de rollback antes de migrar producción.
- [ ] Crear commit y hacer push sólo después de revisar que `vps.md` y otros cambios locales pertenezcan al mismo lote.
