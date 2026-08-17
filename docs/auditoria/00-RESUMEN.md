# Auditoría ReadInn — Resumen ejecutivo

**Fecha:** 2026-08-17
**Alcance:** `apps/api` (Fastify + Prisma), `apps/web` (Next.js App Router), `apps/mobile` (Flutter)
**Commit base:** `a80fb15` (branch `master`)

## Índice

| Documento | Contenido |
|---|---|
| `00-RESUMEN.md` | Este archivo: resumen, conteos, orden de remediación |
| `01-CRITICO.md` | C1–C8 — bypass de auth, IDOR, endpoints sin proteger, DoS |
| `02-MEJORAS.md` | M1–M11 — rendimiento, concurrencia, arquitectura, XSS latente |
| `03-MENORES.md` | O1–O18 — deuda menor y observaciones |
| `04-CHECKLIST-RESUELTO.md` | Estado de remediación, verificaciones y pendientes de despliegue |

## Conteo

| Severidad | Cantidad |
|---|---|
| Crítico | 8 |
| Mejora recomendada | 11 |
| Observación menor | 18 |

## Estado general

La base tiene decisiones acertadas: validación con Zod en el borde, `AppError` tipado con
`requestId`, control de concurrencia optimista en capítulos vía `expectedVersion`, revisiones
con poda a 30 versiones, taxonomía de tags cerrada con clasificación de edad automática, y un
módulo de importación masiva (`bulk-import-routes.ts`) que es el mejor escrito del repo —
esquemas `.strict()`, transacción, slugs deterministas, chequeo de admin real.

El problema no es el estilo del código sino **dónde está la frontera de confianza**. Tres
patrones sistémicos generan la mayoría de los hallazgos críticos:

1. **Rutas de compatibilidad que nunca se cerraron.** La rama "legacy" de `verifyToken` acepta
   tokens sin firma. Es un bypass total de autenticación, verificado ejecutándolo (ver C1).

2. **El fallback de base de datos falla *abierto*.** `checkDatabaseConnection()` se come
   cualquier error y cada módulo interpreta ese `false` como "seguí sin validar". El resultado
   es que un pool agotado convierte el login en "cualquier contraseña sirve", le da acceso de
   escritor a peticiones anónimas y desactiva el gate +18 (ver C2).

3. **Estado de producción en memoria de módulo.** Biblioteca, progreso de lectura, likes,
   follows, reportes de moderación y registros de media viven en `Map`/`Set`/arrays a nivel de
   módulo — incluso con la DB conectada. Se pierde en cada deploy, se rompe con más de una
   instancia, y en el caso de biblioteca y progreso **filtra datos entre usuarios anónimos**
   porque todos comparten la clave `'guest'` (ver C5).

Sobre rendimiento: el catálogo (`GET /v1/stories`) trae 5.000 filas con todas sus relaciones y
pagina en JavaScript, más dos `groupBy` sobre tablas que crecen sin límite. No es un problema de
N+1 clásico sino de haber movido el trabajo del planificador de Postgres al event loop de Node
(ver C7). La caché que lo envuelve tiene claves controladas por el cliente sin tope, lo que la
vuelve un vector de DoS y a la vez una fuente de contenido obsoleto (ver C8).

## Nota sobre la cobertura de tests

Los 23 tests existentes (`src/app.test.ts`, `src/modules/stories/story-taxonomy.test.ts`) corren
**todos** contra la rama de fixtures, porque no hay base de datos de test. La ruta Prisma —la que
corre en producción— no tiene cobertura. Esto es relevante para priorizar: cualquier fix de los
de abajo se puede romper sin que ningún test lo note. Ver M7.

## Orden de remediación sugerido

### Ahora (mismo día)

- **C1** — Bypass de autenticación. Cualquiera puede ser admin en este momento y sólo necesita
  leer un perfil público para obtener el UUID. Es un borrado de 3 líneas.
- **C2** — Fallar cerrado cuando la DB no responde. Devolver 503 en lugar de emitir credenciales.

### Esta semana

- **C3** — IDOR en lectura de capítulos + bypass del gate +18. Una línea en el `where`.
- **C4** — Autenticación en moderación y media. Hoy `PATCH /v1/admin/stories/:id/status` no tiene
  auth *y* no hace nada: suspender una obra es puramente cosmético.
- **C6** — Rotación del hashing de contraseñas (con re-hash en el próximo login exitoso) y
  eliminar los stubs de `forgot-password` / `reset-password` que reportan éxito sin actuar.

### Próximo sprint

- **C5** — Modelos Prisma para biblioteca y progreso, y exigir autenticación en esos endpoints.
- **C7 + C8** — Van juntos: bajar la paginación a la DB y acotar la caché es el mismo refactor.
  Incluye desnormalizar `averageRating` / `ratingCount` / `readCount` en `Story`.

### Antes de seguir agregando features

- **M7** — Levantar una DB de test y cubrir la ruta Prisma. Mientras la ruta de producción no
  esté testeada, todo lo anterior es frágil.
- **M3** — Retención y rollup de `ReadingEvent`. Es la tabla que va a dominar la base y hoy se
  consulta en cada carga del catálogo.

## Verificación realizada

Los hallazgos C1 y C3 se confirmaron empíricamente, no por lectura. C1 se validó ejecutando
`verifyToken` con un token forjado (salida completa en `01-CRITICO.md`). El resto se derivó de
lectura del código con las referencias `archivo:línea` incluidas en cada hallazgo.
