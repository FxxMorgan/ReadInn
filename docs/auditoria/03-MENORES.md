# Auditoría ReadInn — Observación menor (O1–O18)

Volver a [`00-RESUMEN.md`](./00-RESUMEN.md) · Anterior: [`02-MEJORAS.md`](./02-MEJORAS.md)

Deuda menor, inconsistencias de contrato y detalles operativos. Ninguno bloquea, pero varios son
arreglos de una línea que evitan confusión futura.

---

## O1 — `coverColor` mezcla color hexadecimal y URL en una sola columna, con schemas incompatibles

`createStorySchema` acepta `coverColor: z.string().optional()` (`writer-routes.ts:16`), pero
`updateStorySchema` exige `z.string().url().nullable().optional()` (línea 29). Se puede **crear**
una obra con `#855300` y nunca volver a asignarle un hex: el `PATCH` responde 422.

El valor se guarda en la columna `coverUrl` y el frontend discrimina por prefijo:
`story.coverColor?.startsWith('http') ? <img src={...}> : { backgroundColor: ... }`
(`book-card.tsx:6-10`). Funciona, pero conviene separar en dos campos (`coverUrl` y `coverColor`)
o normalizar con un union explícito:

```ts
const coverSchema = z.union([
  z.string().regex(/^#[0-9a-fA-F]{6}$/),
  z.string().url().refine((v) => v.startsWith('https://'), 'Solo https'),
]);
```

Nota lateral: un valor como `httpfoo` pasa el `startsWith('http')` y produce un `<img>` roto.

---

## O2 — `next.config.mjs` deja el optimizador de imágenes como proxy abierto

```js
images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] }
```

`/_next/image?url=...` acepta cualquier host https: tercero puede usar tu servidor como CDN de
imágenes gratis, o para enmascarar el origen del tráfico. Restringir al dominio de R2:

```js
images: { remotePatterns: [{ protocol: 'https', hostname: 'read.cypher.cl' }] }
```

---

## O3 — `seo-api.ts` cae a la URL de producción hardcodeada

`apps/web/src/lib/seo-api.ts:6`:

```ts
const candidates = [...new Set([apiBase, 'https://api.cypher.cl'])];
```

Si `READINN_API_URL` no está seteado, o si la API local responde con error, el build de desarrollo
lee **producción** en silencio. El fallback debería ser un fallo visible, no un cambio de entorno.

---

## O4 — El sitemap recorre hasta 100 páginas secuenciales

`getPublicStories()` (`seo-api.ts:26-35`) itera `page` de 1 a 100 con `await` dentro del bucle,
hasta 5.000 obras. Cada iteración es un round-trip a la API que a su vez ejecuta la consulta de
C7. Con el fix de C7 esto mejora, pero conviene un endpoint dedicado
(`GET /v1/stories/sitemap`) que devuelva sólo `{ id, slug, updatedAt }` en una consulta.

---

## O5 — `conflictMode: 'replace'` en la importación masiva destruye datos de usuarios

`bulk-import-routes.ts:185`:

```ts
if (existing) await tx.story.delete({ where: { id: existing.id } });
```

Todas las relaciones tienen `onDelete: Cascade`, así que reimportar una obra borra sus
comentarios, calificaciones y eventos de lectura junto con los capítulos. Para actualizar el texto
de una obra existente conviene reemplazar sólo los capítulos y preservar `ChapterComment`,
`StoryRating` y `ReadingEvent`, o al menos advertirlo en la respuesta.

---

## O6 — `resolveAuthor` crea cuentas con un hash de contraseña imposible de verificar

`bulk-import-routes.ts:134`:

```ts
const passwordHash = crypto.createHash('sha256').update(`author_pass_${Date.now()}_${Math.random()}`).digest('hex');
```

Un digest hex sin `:` ni `$`, así que `verifyPassword` nunca lo va a parsear: la cuenta no puede
iniciar sesión. Probablemente intencional, pero queda como cuenta `active` con
`emailVerifiedAt` seteado ocupando un email `@readinn.app`. Cuando se implemente el reset de
contraseña real (C6), estas cuentas se vuelven tomables si alguien controla ese dominio de correo.
Conviene un campo explícito (`isPlaceholder`) o `accountStatus: 'pending_verification'`.

---

## O7 — `anonymousReaderKey` reutiliza `JWT_SECRET` como salt

`analytics-routes.ts:29`:

```ts
const salt = process.env['JWT_SECRET'] ?? 'readinn-anonymous-reader';
```

Reutilizar la clave de firma para pseudonimizar lectores mezcla dos propósitos criptográficos: si
rotás `JWT_SECRET` (algo que querrás hacer al arreglar C1) toda la analítica histórica de lectores
anónimos se desvincula. Usar una variable propia (`ANALYTICS_SALT`), y considerar rotarla
periódicamente para que el hash IP+UA no sea un identificador persistente indefinido.

---

## O8 — `media/:mediaId/confirm` fabrica una URL para IDs desconocidos

`media/routes.ts:104-113`: si el `mediaId` no está en `mockMediaStore`, se devuelve
`status: 'ready'` con `${publicDomain}/covers/${mediaId}.png`. El cliente cree que la carga se
completó y guarda una URL que no resuelve. Como `mockMediaStore` se pierde al reiniciar, este
camino se activa en operación normal. Debería ser un 404.

---

## O9 — Estado de módulo sin tope en seis archivos

Además de lo cubierto en C5, todos estos crecen sin límite y se pierden al reiniciar:

| Variable | Archivo |
|---|---|
| `mockMediaStore` | `media/routes.ts:25` |
| `mockReportsQueue` | `moderation-routes.ts:26` |
| `mockComments`, `mockCommentVotes`, `mockRatings`, `mockLikes`, `mockFollowers`, `mockReads` | `reader-routes.ts:56-85` |
| `mockFollows`, `mockWallPosts` | `social/routes.ts:22-23` |
| `offlineStoriesByAuthor`, `offlineChapterMeta`, `offlineRevisions` | `writer-repository.ts:6-8` |

`mockReportsQueue` y `mockComments` son escribibles sin autenticación, así que además de fuga de
memoria son vector de agotamiento.

---

## O10 — La escritura de caché no es atómica

`content-cache.ts:103-110` hace `writeFile` directo sobre el archivo final. Dos peticiones
concurrentes sobre la misma clave pueden dejar JSON truncado. El `JSON.parse` está protegido y
degrada a recarga, así que no rompe, pero corresponde escribir a `.tmp` y `rename`:

```ts
const target = this.filename(record.key);
const temporary = `${target}.${crypto.randomUUID()}.tmp`;
await writeFile(temporary, JSON.stringify(record), 'utf8');
await rename(temporary, target);
```

---

## O11 — El reordenamiento de posiciones en `deleteChapter` asume posiciones < 100000

`writer-repository.ts:112-119` usa un desplazamiento en dos pasos (`+100000`, luego `-100001`)
para evitar colisiones transitorias con `@@unique([storyId, position])`. La técnica es correcta
—Postgres valida unicidad fila por fila, así que un `decrement: 1` directo fallaría— pero si
alguna posición llegara a superar 100000 el segundo `updateMany` afectaría filas equivocadas. Un
comentario explicando la técnica y una aserción del rango evitarían que alguien la "simplifique"
más adelante.

---

## O12 — `metrics()` materializa todas las palabras del capítulo

`writer-repository.ts:17`:

```ts
function metrics(plainText: string) {
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  ...
}
```

`split` crea un array con cada palabra sólo para contarlas, y esto corre en cada guardado y cada
autosave de un capítulo que puede tener cientos de miles de caracteres. Contar con un match
iterativo evita el array:

```ts
function countWords(text: string): number {
  let count = 0;
  for (const _ of text.matchAll(/\S+/g)) count += 1;
  return count;
}
```

El mismo patrón está duplicado en `bulk-import-routes.ts:79-82` (`chapterMetrics`); conviene
unificar en un helper compartido.

---

## O13 — `docker-compose.yml` trae credenciales por defecto

`readinn_dev_password` para Postgres y para MinIO (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`), con
puertos publicados a `0.0.0.0` (`5432`, `9000`, `9001`). En una máquina de desarrollo con IP
pública eso es acceso directo a la base. Conviene ligar a `127.0.0.1:5432:5432` y leer las
credenciales de un `.env` no versionado.

---

## O14 — El móvil usa el token dentro de la clave de `SharedPreferences`

`apps/mobile/lib/services/api_service.dart:32-33`:

```dart
String _progressKey(String storyId, String? token) =>
    'reading_progress_${token ?? 'guest'}_$storyId';
```

El access token rota cada hora, así que todo el progreso guardado localmente queda inaccesible en
cada refresh. Debe usarse el `userId` (que el cliente ya tiene en `UserAccount.id`), no el token.

---

## O15 — Dos implementaciones de "seguir" y de "me gusta" compitiendo

| Endpoint | Almacenamiento |
|---|---|
| `POST /v1/follows/:authorId` (`reader-routes.ts:492`) | `mockFollowers` en RAM |
| `POST /v1/users/:username/follow` (`social/routes.ts:155`) | `UserFollow` en Prisma |

`GET /v1/stories/:storyId/engagement` lee el conteo desde Prisma
(`prisma.userFollow.count`, `reader-routes.ts:421`), así que seguir a alguien por el primer
endpoint no cambia nada visible. Hay que eliminar el mock y dejar el endpoint real.

En la rama de fixtures del mismo handler, `followers: mockFollowers.size` (línea 427) devuelve el
**total global** de pares seguidor-seguido, no los seguidores de ese autor.

Igual con `POST /v1/stories/:storyId/like` (línea 388): es un `Set` en memoria que no tiene
contraparte persistente, mientras `StoryRating` sí existe. Hay que decidir si "me gusta" y
"calificación" son la misma cosa o dos, y modelar sólo lo que se use.

---

## O16 — `/v1/auth/me` devuelve 200 con un usuario falso en lugar de 401

`auth/routes.ts:245-292`. Sin header devuelve un `user-guest` inventado; con un token válido cuyo
usuario no existe devuelve 200 con `id: userId` y datos vacíos. El cliente no puede distinguir
"invitado", "sesión expirada" y "usuario borrado". El proxy web ya emite 401 para este caso cuando
falta la cookie (`api/readinn/[...path]/route.ts:7-9`), así que los dos contratos discrepan.
Corresponde 401 y que el cliente trate la ausencia de sesión como tal.

---

## O17 — Inconsistencias menores de estilo y contrato

- `app.ts:31` usa el `crypto` global para `genReqId` mientras el resto del proyecto importa
  `node:crypto`. Funciona en Node 19+, pero conviene unificar.
- `auth/routes.ts:207` captura la excepción en un `catch (e)` que descarta `e` y siempre lanza
  `INVALID_TOKEN`; el `verifyToken` ya devuelve `null` en vez de lanzar, así que el `try/catch`
  es inerte.
- `story-repository.ts:88` declara `const where: any = {}`, perdiendo el tipado de
  `Prisma.StoryWhereInput` justo en la consulta más compleja del repositorio. Con el tipo puesto,
  varios de los problemas de C7 serían errores de compilación.
- `story-repository.ts:189` hace `status: story.status as any` y la línea 188
  `as NonNullable<StorySummary['ageRating']>`: los `as` están tapando que `StorySummary` y los
  enums de Prisma divergieron.
- `getStoryByIdUncached` (280-319) tiene la búsqueda en fixtures duplicada: una vez antes del
  chequeo de conexión (283) y otra idéntica dentro de la rama sin DB (303).
- `writer-repository.ts` tiene líneas de 400+ caracteres con múltiples sentencias (por ejemplo
  las líneas 51-53, 86-87). Es el archivo con la lógica de negocio más delicada —control de
  versiones, métricas, revisiones— y el más difícil de revisar. Formatearlo es barato y reduce
  riesgo real.

---

## O18 — `/v1/stories/:storyId/download` construye el libro completo en memoria, sin autenticación

`stories/routes.ts:99-132`. `Promise.all` sobre todos los capítulos, cada uno cacheado con su
texto íntegro, y luego el EPUB o PDF se arma en un `Buffer` completo antes de enviarlo. Una obra de
200 capítulos son cientos de MB residentes por petición concurrente, y el endpoint es público con
sólo el rate limit global de 120/min.

No lo clasifico como crítico porque requiere que existan obras largas para tener impacto, pero
conviene: `pipeline` en streaming hacia la respuesta en lugar de `Buffer.concat`, un límite de
capítulos por descarga, rate limit dedicado, y un `Cache-Control` con el archivo generado
persistido en R2 en lugar de regenerarlo por petición.
