# Auditoría ReadInn — Crítico (C1–C8)

Volver a [`00-RESUMEN.md`](./00-RESUMEN.md) · Siguiente: [`02-MEJORAS.md`](./02-MEJORAS.md)

---

## C1 — Bypass total de autenticación: suplantación de cualquier usuario, incluido admin

**Archivo:** `apps/api/src/shared/auth.ts:16`

`verifyToken` tiene una rama de compatibilidad que se activa cuando el token **no** tiene tres
partes separadas por punto. Esa rama decodifica base64 y confía en el JSON resultante sin
verificar ninguna firma:

```ts
// Transitional support for mobile sessions issued before signed tokens.
const legacy = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as Partial<AuthClaims>;
if (!legacy.userId) return null;
return { userId: legacy.userId, ..., type: legacy.type ?? 'access', exp: Math.floor(Date.now()/1000) + 300 };
```

### Verificado ejecutándolo

```
forged token   : eyJ1c2VySWQiOiIxMTExMTExMS0yMjIyLTMzMzMtNDQ0NC01NTU1NTU1NTU1NTUifQ==
verify(access) : {"userId":"11111111-2222-3333-4444-555555555555","type":"access","exp":1786980106}
verify(refresh): {"userId":"11111111-2222-3333-4444-555555555555","type":"access","exp":1786980106}
expired legacy : {"userId":"11111111-2222-3333-4444-555555555555","type":"access","exp":1786980106}
tampered JWT   : null
```

Tres fallas en una:

- **Sin firma.** El token forjado se acepta. No hace falta conocer `JWT_SECRET`.
- **`expectedType` se ignora.** Se pidió `'refresh'` y devolvió claims con `type: 'access'`, pero
  el retorno es no-nulo, así que `bearerClaims(auth, 'refresh')` lo acepta.
- **`exp` se ignora.** Un `exp: 1` se sobrescribe con `now + 300`. No hay expiración.

La última línea confirma que la verificación de firma **sí funciona** para tokens de 3 partes
bien formados: la rama legacy es el único agujero.

### Cadena de explotación completa

1. `GET /v1/users/<cualquier-username>` devuelve `id` con el UUID real del usuario
   (`apps/api/src/modules/social/routes.ts:142`). Los comentarios también exponen `authorId`
   (`apps/api/src/modules/stories/reader-routes.ts:144`).
2. `Buffer.from(JSON.stringify({userId: '<uuid>'})).toString('base64')`
3. `Authorization: Bearer <ese-string>` → sos esa persona.

El primer usuario registrado en la instancia es admin
(`apps/api/src/modules/auth/routes.ts:104`, `isAdmin: isFirstUser`), así que el paso 1 sobre ese
username da control administrativo, incluyendo `POST /v1/admin/stories/bulk-import`.

### Fix

```ts
export function verifyToken(token: string, expectedType?: AuthClaims['type']): AuthClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;              // se elimina la ruta legacy
    const unsigned = `${parts[0]}.${parts[1]}`;
    const signature = Buffer.from(parts[2] ?? '', 'base64url');
    const expected = Buffer.from(sign(unsigned), 'base64url');
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(signature, expected)) return null;
    const claims = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as AuthClaims;
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!claims.userId) return null;
    if (expectedType && claims.type !== expectedType) return null;
    return claims;
  } catch { return null; }
}
```

Las sesiones móviles emitidas antes de la firma quedan inválidas: los usuarios vuelven a iniciar
sesión una vez. Es el precio correcto.

### Problema adyacente en el mismo archivo

`secret()` (línea 5) lee `process.env` directo, sin pasar por el schema validado de
`config/env.ts`, y cae al default `'readinn-development-secret-change-me'` cuando
`NODE_ENV !== 'production'`. Un deploy sin `NODE_ENV=production` exportado deja el secreto
público en el repo. Debería exigirse siempre y leerse de `AppConfig`:

```ts
// config/env.ts — JWT_SECRET pasa de optional a requerido
JWT_SECRET: z.string().min(32),
```

---

## C2 — Si la base de datos no responde, el login acepta cualquier contraseña

**Archivos:** `apps/api/src/modules/auth/routes.ts:139-157`, `apps/api/src/shared/db.ts:5-12`

```ts
const isDbConnected = await checkDatabaseConnection();
if (!isDbConnected) {
  const username = body.email.split('@')[0] || 'lector';
  const token = accessToken(`user-${username}`, body.email);
  return { data: { user: { id: `user-${username}`, ... }, token, refreshToken: ... } };
}
```

No se valida contraseña. Y el disparador no requiere que Postgres esté caído:
`checkDatabaseConnection()` captura **cualquier** excepción y devuelve `false`, así que un pool
agotado, un timeout de red o un `too many connections` bajo carga bastan. Es decir: el modo
"cualquiera entra como cualquiera" se activa precisamente cuando el sitio está bajo presión.

### El mismo patrón en otros tres lugares

| Ubicación | Consecuencia |
|---|---|
| `writer-routes.ts:68` (`requireWriter`) | Devuelve `{userId:'guest'}` a peticiones **sin autenticar** → acceso de escritor anónimo |
| `stories/routes.ts:47` (`requireAdultAccess`) | `return` temprano → el gate +18 se desactiva por completo |
| `writer-routes.ts:76` (`storyAuthorId`) | Devuelve `access.userId` sin verificar |

### Contaminación persistente del catálogo

Encadenado con lo anterior: en modo offline, `createStory` hace
`storyFixtures.unshift(story)` (`writer-repository.ts:51`), y `getStoryByIdUncached` consulta
fixtures **antes** que la DB, incluso cuando está conectada (`story-repository.ts:283`, con el
comentario "Fixture IDs are part of the public demo contract"). Secuencia:

1. Blip de DB → `requireWriter` deja pasar a un anónimo.
2. `POST /v1/stories` con `status: 'published'` → la obra entra en el array `storyFixtures`.
3. La DB vuelve. La obra inyectada **sigue sirviéndose** a todos los lectores hasta reiniciar el
   proceso, porque los fixtures se resuelven primero.

### Fix

Fallar cerrado. El fallback de fixtures tiene sentido como demo local, no como modo degradado en
producción:

```ts
// shared/db.ts
import { AppError } from './errors.js';

export async function requireDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new AppError('DATABASE_UNAVAILABLE', 'Servicio temporalmente no disponible.', 503);
  }
}
```

Y en el login, eliminar la rama por completo:

```ts
app.post('/v1/auth/login', async () => {
  const body = loginSchema.parse(request.body);
  await requireDatabase();
  const user = await prisma.user.findUnique({ where: { email: body.email }, include: { profile: true } });
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    throw new AppError('INVALID_CREDENTIALS', 'Credenciales incorrectas.', 401);
  }
  // ...
});
```

Para el modo demo, la vía limpia es una variable explícita (`READINN_FIXTURE_MODE=true`) que
nunca se setea en producción, en lugar de inferirlo de un error de conexión. Ver también M7.

---

## C3 — IDOR en lectura de capítulos y bypass del gate +18

**Archivo:** `apps/api/src/modules/stories/story-repository.ts:413-424`

```ts
const chapter = await prisma.chapter.findFirst({
  where: {
    status: 'published',
    story: { status: 'published' },
    OR: [{ id: chapterId }, { slug: chapterId }],
  },
  include: { story: { select: { title: true, id: true } } },
});
```

El parámetro `storyId` que recibe la función **no aparece en el `where`**. El capítulo devuelto es
el que corresponda al `chapterId`, sin importar en qué obra esté.

### Consecuencia 1: bypass del gate de contenido adulto

`requireAdultAccess(request, request.params.storyId)` (`stories/routes.ts:46-62`) valida la
clasificación de la obra **de la URL**. Con el `where` roto, la obra de la URL y la obra del
capítulo devuelto pueden ser distintas:

```
GET /v1/stories/<uuid-obra-clasificada-all>/chapters/<uuid-capítulo-de-obra-+18>
```

El gate mira la obra `all`, pasa, y la respuesta contiene el capítulo +18. Sin sesión, sin
confirmación de edad.

### Consecuencia 2: lectores reciben el capítulo equivocado

`Chapter.slug` sólo es único **por obra**: `@@unique([storyId, slug])` en
`prisma/schema.prisma:182`. Y `bulk-import-routes.ts:200` genera slugs como
`${slugify(title)}-${index+1}`, así que prácticamente todas las obras importadas tienen un
capítulo con slug `capitulo-1`. Un `findFirst` por slug devuelve uno arbitrario entre todos.

### Consecuencia 3: la caché guarda el resultado equivocado

`getChapterById` cachea bajo `chapter:${storyId}:${chapterId}` usando el `storyId` de la URL
(`story-repository.ts:376`), así que el capítulo cruzado queda persistido en disco y en memoria
bajo una clave que parece legítima.

### Fix

```ts
const chapter = await prisma.chapter.findFirst({
  where: {
    status: 'published',
    story: {
      status: 'published',
      OR: [{ id: storyId }, { slug: storyId }],   // la obra de la URL manda
    },
    OR: [{ id: chapterId }, { slug: chapterId }],
  },
  include: { story: { select: { title: true, id: true } } },
});
```

Además conviene normalizar la clave de caché a los IDs reales resueltos, no a lo que vino en la
URL — ver C8, donde el mismo desajuste causa contenido obsoleto.

---

## C4 — Endpoints de moderación y media sin autenticación

### Moderación: `apps/api/src/modules/stories/moderation-routes.ts`

El archivo no importa nada de `shared/auth.js`. Ninguna de sus tres rutas verifica identidad.

| Ruta | Problema |
|---|---|
| `GET /v1/admin/reports` | Sin auth. Expone la cola completa de reportes, con `details` de texto libre, a cualquiera |
| `PATCH /v1/admin/stories/:storyId/status` | Sin auth **y no hace nada**: devuelve `{storyId, status, updatedAt}` fabricado sin tocar la DB |
| `POST /v1/reports` | Guarda en `mockReportsQueue` (array en RAM), se pierde al reiniciar, y responde "Nuestro equipo de moderación lo revisará a la brevedad" |

La segunda es la más grave en términos de producto: **suspender una obra es puramente
cosmético**. El admin ve éxito, la obra sigue publicada. Dado que moderación de contenido es uno
de los ejes declarados del proyecto, esto es una falla funcional además de una de seguridad.

Y el proxy web (`apps/web/src/app/api/readinn/[...path]/route.ts`) reenvía cualquier path, así
que estos endpoints son alcanzables desde el navegador de cualquier visitante.

### Media: `apps/api/src/modules/media/routes.ts`

Tampoco importa auth. `POST /v1/media/upload-intent` y `PUT /v1/media/:mediaId/upload` son
públicos: cualquiera genera URLs prefirmadas y sube objetos a tu bucket R2/S3 — costo de
almacenamiento y ancho de banda a tu cuenta, más contenido arbitrario alojado en tu dominio.

Detalles adicionales:

- El `Content-Type` con que se guarda el objeto sale del *intent declarado*
  (`record.mimeType`), nunca se valida contra los bytes recibidos. No hay chequeo de magic bytes.
- `sizeBytes` lo declara el cliente y `z.number().max(5MB)` acepta negativos.
- `mockMediaStore` es un `Map` sin tope y se pierde al reiniciar, dejando cargas
  inconfirmables.
- `POST /v1/media/:mediaId/confirm` con un `mediaId` desconocido **fabrica** una `publicUrl`
  (`${publicDomain}/covers/${mediaId}.png`) y responde `status: 'ready'`. El cliente cree que
  subió algo que no existe.

### Fix

Extraer los guards a helpers compartidos y aplicarlos. `bulk-import-routes.ts:84-97` ya tiene la
implementación correcta de `requireAdmin`; conviene moverla a `shared/auth-guards.ts` y reusarla:

```ts
// shared/auth-guards.ts
export async function requireUser(request: FastifyRequest): Promise<{ id: string; isAdmin: boolean }> {
  const claims = bearerClaims(request.headers.authorization);
  if (!claims) throw new AppError('AUTH_REQUIRED', 'Inicia sesion para continuar.', 401);
  await requireDatabase();
  const user = await prisma.user.findFirst({
    where: { id: claims.userId, accountStatus: 'active', deletedAt: null },
    select: { id: true, isAdmin: true },
  });
  if (!user) throw new AppError('AUTH_REQUIRED', 'La sesion ya no es valida.', 401);
  return user;
}

export async function requireAdmin(request: FastifyRequest): Promise<{ id: string }> {
  const user = await requireUser(request);
  if (!user.isAdmin) throw new AppError('ADMIN_REQUIRED', 'Requiere permisos de administrador.', 403);
  return user;
}
```

Y hacer que `PATCH /v1/admin/stories/:storyId/status` escriba de verdad:

```ts
app.patch<{ Params: { storyId: string } }>('/v1/admin/stories/:storyId/status', async (request) => {
  await requireAdmin(request);
  const body = updateStatusSchema.parse(request.body);
  const story = await prisma.story.update({
    where: { id: request.params.storyId },
    data: {
      status: body.status,
      ...(body.status === 'archived' ? { archivedAt: new Date() } : { archivedAt: null }),
    },
    select: { id: true, status: true, updatedAt: true },
  });
  await contentCache.invalidateTags(storyCacheTags(story.id));
  return { data: { storyId: story.id, status: story.status, updatedAt: story.updatedAt.toISOString() } };
});
```

Los reportes necesitan un modelo Prisma; hoy no existe ninguno en el schema.

---

## C5 — Biblioteca, progreso, likes y follows viven sólo en RAM, incluso con DB conectada

**Archivo:** `apps/api/src/modules/stories/reader-routes.ts`

En `POST /v1/library/:storyId` (líneas 500-523) la rama "con DB conectada" hace exactamente lo
mismo que la rama offline:

```ts
const isDbConnected = await checkDatabaseConnection();
if (!isDbConnected) {
  const isSaved = mockLibraryKeys.has(key);
  if (isSaved) mockLibraryKeys.delete(key); else mockLibraryKeys.add(key);
  return { data: { saved: !isSaved, storyId } };
}
// "con DB": idéntico
if (mockLibraryKeys.has(key)) mockLibraryKeys.delete(key); else mockLibraryKeys.add(key);
return { data: { saved: mockLibraryKeys.has(key), storyId } };
```

Lo mismo para progreso de lectura (570-617), likes (388-394) y follows (492-497). No existe
ningún modelo Prisma para nada de esto — `schema.prisma` no tiene `Bookmark` ni
`ReadingProgress`. Consecuencias: se pierde en cada deploy, y con más de una instancia detrás de
un balanceador cada réplica tiene su propia biblioteca.

### Fuga de datos entre usuarios anónimos

Peor que la volatilidad. `requestUserId()` (líneas 87-93):

```ts
function requestUserId(request): string {
  const claims = bearerClaims(request.headers.authorization);
  if (claims) return claims.userId;
  const token = typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : undefined;
  return token ? `token:${token}` : 'guest';
}
```

- **Anónimos:** todos devuelven `'guest'`, así que **comparten un único bucket** de biblioteca y
  progreso. Los favoritos de un visitante aparecen para el siguiente.
- **Token no verificable:** devuelve `token:<token crudo>`. Como el access token rota cada hora,
  el progreso se huerfaniza en cada refresh. El móvil tiene el mismo bug: `_progressKey` en
  `apps/mobile/lib/services/api_service.dart:32` usa el token dentro de la clave de
  `SharedPreferences`.

Nótese la incoherencia de identidad dentro del mismo handler: `GET /v1/stories/:storyId/engagement`
usa `authenticatedUserId()` para `userRating` pero `requestUserId()` para `liked` y `saved`.

### Amplificación de memoria sin autenticar

`progressSchema` (línea 14) declara `seenChapterIds: z.array(z.string()).optional()` **sin
`.max()`**, y el handler hace unión con lo previamente guardado:

```ts
const seenChapterIds = Array.from(new Set([...(previous?.seenChapterIds ?? []), ...(body.seenChapterIds ?? []), body.chapterId]));
```

Un `POST` anónimo con 100.000 IDs se acumula indefinidamente en `mockProgress`, que nunca se
purga. No requiere sesión.

### Fix

Modelos reales:

```prisma
model Bookmark {
  userId    String   @map("user_id") @db.Uuid
  storyId   String   @map("story_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  story     Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@id([userId, storyId])
  @@index([userId, createdAt(sort: Desc)])
  @@map("bookmarks")
}

model ReadingProgress {
  userId             String   @map("user_id") @db.Uuid
  storyId            String   @map("story_id") @db.Uuid
  chapterId          String   @map("chapter_id") @db.Uuid
  progressPercentage Int      @default(0) @map("progress_percentage")
  isCompleted        Boolean  @default(false) @map("is_completed")
  updatedAt          DateTime @updatedAt @map("updated_at")
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  story              Story    @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@id([userId, storyId])
  @@index([userId, updatedAt(sort: Desc)])
  @@map("reading_progress")
}
```

Y exigir sesión — no hay forma correcta de guardar una biblioteca anónima en el servidor:

```ts
app.post<{ Params: { storyId: string } }>('/v1/library/:storyId', async (request) => {
  const user = await requireUser(request);          // 401 si es anónimo
  const existing = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId: user.id, storyId: request.params.storyId } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { userId_storyId: { userId: user.id, storyId: request.params.storyId } } });
    return { data: { saved: false, storyId: request.params.storyId } };
  }
  await prisma.bookmark.create({ data: { userId: user.id, storyId: request.params.storyId } });
  return { data: { saved: true, storyId: request.params.storyId } };
});
```

Para lectores no logueados, la biblioteca local ya existe en el cliente
(`apps/web/src/lib/offline-library.ts` sobre IndexedDB); ese es el lugar correcto.

Y acotar el schema: `seenChapterIds: z.array(z.string().uuid()).max(500).optional()`.

`likes` merece una decisión de producto: hoy `POST /v1/stories/:storyId/like` y
`POST /v1/follows/:authorId` son mocks que compiten con `StoryRating` y `UserFollow` reales.
Ver O15.

---

## C6 — Hash de contraseñas con 1.000 iteraciones, comparación no constante, y recuperación falsa

**Archivo:** `apps/api/src/modules/auth/routes.ts:43-54`

```ts
const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
// ...
return hash === originalHash;
```

- **1.000 iteraciones.** OWASP recomienda ~210.000 para PBKDF2-HMAC-SHA512. Estás dos órdenes de
  magnitud por debajo: un dump de la tabla `users` se crackea con hardware de consumo.
- **`hash === originalHash`** es comparación de strings, no de tiempo constante.

### Fix con migración

```ts
const PBKDF2_ITERATIONS = 210_000;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha512');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return verifyLegacyPassword(password, stored);
  const [, iterations, salt, hash] = parts;
  const candidate = crypto.pbkdf2Sync(password, Buffer.from(salt!, 'hex'), Number(iterations), 64, 'sha512');
  const expected = Buffer.from(hash!, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/** Formato viejo `salt:hash` con 1000 iteraciones. Sólo para migrar en el próximo login. */
function verifyLegacyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const candidate = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  const expected = Buffer.from(originalHash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function needsRehash(stored: string): boolean {
  return !stored.startsWith(`pbkdf2$${PBKDF2_ITERATIONS}$`);
}
```

Y en el handler de login, después de validar:

```ts
if (needsRehash(user.passwordHash)) {
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.password) } });
}
```

Si podés agregar una dependencia, `argon2id` es preferible a PBKDF2 para contraseñas nuevas.

### Recuperación de contraseña y logout son stubs que reportan éxito

```ts
app.post('/v1/auth/reset-password', async (request) => {
  const body = resetPasswordSchema.parse(request.body);
  return { data: { success: true, message: 'Tu contraseña ha sido actualizada correctamente.' } };
});
```

No toca la base. El usuario cree que cambió su contraseña y no lo hizo — queda con la anterior
sin saberlo. `forgot-password` (223), `logout` (213) y `logout-all` (218) son igualmente vacíos.
Mejor devolver `501 NOT_IMPLEMENTED` que mentir, hasta que estén implementados.

### Tokens de refresco irrevocables

`POST /v1/auth/refresh` (189-210) emite un refresh token nuevo **sin invalidar el anterior**, no
hay `jti` almacenado, no hay detección de reuso, y `logout` no revoca nada. Con TTL de 30 días
(`auth.ts:11`), **un refresh token filtrado da acceso permanente** y se puede bifurcar
infinitamente. Requiere una tabla de sesiones:

```prisma
model RefreshSession {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash")
  expiresAt  DateTime  @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, revokedAt])
  @@map("refresh_sessions")
}
```

### Registro sin verificación de email

`accountStatus: 'active'` se asigna directo en el registro (línea 103) y `emailVerifiedAt` nunca
se escribe, pese a que el enum tiene `pending_verification` y el schema tiene el campo. Cuentas
desechables ilimitadas, lo que habilita el brigading descrito en M9.

---

## C7 — `GET /v1/stories` trae 5.000 filas con todas sus relaciones y pagina en JavaScript

**Archivo:** `apps/api/src/modules/stories/story-repository.ts:138-216`

```ts
const stories = await prisma.story.findMany({
  where,
  take: 5000,
  orderBy: { publishedAt: 'desc' },
  include: {
    author: { include: { profile: true } },
    genres: { include: { genre: true } },
    tags:   { include: { tag: true } },
  },
});
// + storyRating.groupBy sobre los 5000 ids
// + readingEvent.groupBy sobre los 5000 ids  ← siempre, incluso si sort !== 'popular'
data.sort(...)                                 // ordena en JS
const pagedData = filteredData.slice((page - 1) * limit, page * limit);   // pagina en JS
```

Cada visita al catálogo o al explorador ejecuta esto. Problemas, en orden de gravedad:

1. **La página 1 cuesta lo mismo que la 250.** No hay `skip`/`take` por página; se materializan
   5.000 obras con autor, perfil, géneros y tags, y se descartan 4.980.
2. **`readingEvent.groupBy` sobre 5.000 IDs en cada request**, incondicionalmente (línea 201).
   `ReadingEvent` recibe una fila por heartbeat y no tiene retención (ver M3): es la tabla que va
   a crecer más rápido, y se agrega completa en la ruta más caliente.
3. **Resultados silenciosamente incorrectos.** El `take: 5000` recorta por `publishedAt desc`
   *antes* de reordenar en JS. Pasando las 5.000 obras publicadas, `sort=title`, `sort=rating` y
   `sort=chapters` sólo consideran las 5.000 más recientes, sin señal alguna al cliente.
4. **`minRating` filtra en JS** (línea 214), después de traer todo.

`getFeaturedStory` (230-270) es peor: llama `getStories({limit: 5000})` y luego
`readingEvent.findMany` trayendo **filas completas** de las últimas 24 horas, no un conteo.

### Fix

Bajar filtrado, orden y paginación a Postgres:

```ts
function orderByFor(sort: GetStoriesParams['sort']): Prisma.StoryOrderByWithRelationInput[] {
  switch (sort) {
    case 'title':    return [{ title: 'asc' }];
    case 'chapters': return [{ publishedChapterCount: 'desc' }];
    case 'rating':   return [{ averageRating: 'desc' }, { ratingCount: 'desc' }];
    case 'popular':  return [{ readCount: 'desc' }];
    default:         return [{ publishedAt: 'desc' }];
  }
}

const [rows, total] = await prisma.$transaction([
  prisma.story.findMany({
    where,
    orderBy: orderByFor(sort),
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true, title: true, synopsis: true, slug: true, languageCode: true,
      ageRating: true, status: true, isMature: true, coverUrl: true, updatedAt: true,
      publishedChapterCount: true, averageRating: true, ratingCount: true,
      attributionName: true, sourceUrl: true, sourceLicense: true,
      author: { select: { username: true, profile: { select: { displayName: true } } } },
      genres: { select: { genre: { select: { name: true } } } },
      tags:   { select: { tag: { select: { name: true, kind: true } } } },
    },
  }),
  prisma.story.count({ where }),
]);
```

Dos requisitos para que `sort=rating` y `sort=popular` sean un `ORDER BY` indexado en lugar de un
`groupBy` sobre toda la tabla — desnormalizar en `Story`:

```prisma
model Story {
  // ...
  averageRating Float @default(0) @map("average_rating")
  ratingCount   Int   @default(0) @map("rating_count")
  readCount     Int   @default(0) @map("read_count")

  @@index([status, averageRating(sort: Desc)])
  @@index([status, readCount(sort: Desc)])
  @@index([status, title])
}
```

`averageRating`/`ratingCount` se recalculan en el handler de `POST /v1/stories/:storyId/rating`
(dentro de la misma transacción que el upsert); `readCount` se incrementa en
`POST /v1/analytics/events` cuando el `eventType` es `chapter_opened`.

Nota sobre búsqueda de texto: los siete `contains` con `mode:'insensitive'` de las líneas 99-107
son `ILIKE '%...%'`, que no usan índice. Cuando el catálogo crezca, esto necesita `tsvector` con
índice GIN o `pg_trgm`. Es la vía natural para el requisito de indexación y filtrado por
etiquetas complejas.

### `select` en lugar de `include`, en todo el repo

`include` trae **todas** las columnas escalares. En `Chapter` eso incluye `contentJson` y
`plainText` — el texto completo del capítulo. Vale revisar cada `include` del repositorio;
`getChapterByIdUncached` (413) trae ambos y sólo usa uno de los dos según el tipo.

---

## C8 — Caché con claves controladas por el cliente: DoS sin autenticar y contenido obsoleto

**Archivos:** `apps/api/src/shared/content-cache.ts`, `story-repository.ts:40-44`

### Crecimiento ilimitado en memoria y disco

```ts
return contentCache.remember(
  `stories:${JSON.stringify(normalized)}`,
  ['catalog'],
  () => this.getStoriesUncached({ ...params, sort: normalized.sort }),
);
```

La clave incluye `query` (texto libre, hasta 100 caracteres) y `page`, que en
`listQuerySchema` (`stories/routes.ts:29`) es `z.coerce.number().int().min(1).default(1)` — **sin
máximo**. Cada combinación distinta crea:

- una entrada permanente en el `Map` de memoria, que **nunca desaloja entradas expiradas** ni
  tiene tope de tamaño (`content-cache.ts:25`); las expiradas sólo se sobrescriben si alguien
  vuelve a pedir la misma clave;
- un archivo JSON en `CACHE_DIR`.

Cada entrada guarda hasta 50 resúmenes completos de obra, o el texto íntegro de un capítulo. Con
el rate limit global de 120/min, un cliente genera ~170.000 entradas por día. Sin autenticación.

### Desajuste clave/consulta

La clave se construye con `normalized` (trim, `toLocaleLowerCase`, `sort`) pero al loader se le
pasan los **params crudos**. Dos peticiones que normalizan igual comparten clave aunque ejecuten
consultas distintas: `?query=%20Foo%20` y `?query=foo` producen la misma clave, pero
`contains: '  Foo '` y `contains: 'foo'` no dan el mismo resultado. La primera que llegue define
lo que ve la segunda.

### Contenido obsoleto en URLs por slug

`getStoryById(storyId)` (272-278) cachea bajo `story:${storyId}` y etiqueta
`[story:${storyId}]`, donde `storyId` puede ser un ID **o un slug** — la consulta acepta ambos
(línea 324). Los escritores invalidan con `storyCacheTags(request.params.storyId)`
(`writer-routes.ts:149`), que es el ID real. Entonces:

1. Un lector abre `/v1/stories/mi-obra-a1b2c3` → se cachea bajo `story:mi-obra-a1b2c3`.
2. El autor edita → se invalida `story:<uuid>`.
3. La entrada por slug **no se toca**: sigue sirviendo la versión vieja hasta el TTL (15 min por
   defecto).

Lo mismo aplica a capítulos, agravado por C3.

### Invalidación O(n) en disco

`invalidateTags` (61-83) hace `readdir` del directorio completo y lee **cada** archivo `.json`
para inspeccionar sus tags. Con decenas de miles de entradas, cada publicación de capítulo
recorre todo el directorio.

### Fix

Normalizar una sola vez y usar el mismo objeto para clave y consulta:

```ts
async getStories(params: GetStoriesParams) {
  const normalized = normalizeListParams(params);          // única fuente de verdad
  // La cola larga no se cachea: evita claves ilimitadas por page/query arbitrarios.
  if (normalized.page > 5 || normalized.query.length > 0) {
    return this.getStoriesUncached(normalized);
  }
  return contentCache.remember(listCacheKey(normalized), ['catalog'], () =>
    this.getStoriesUncached(normalized),
  );
}
```

Acotar el `Map` con LRU y desalojo de expirados:

```ts
private readonly memory = new Map<string, CacheRecord<unknown>>();
private static readonly MAX_ENTRIES = 500;

private touch(key: string, record: CacheRecord<unknown>): void {
  this.memory.delete(key);                    // reinserta al final = orden de uso
  this.memory.set(key, record);
  while (this.memory.size > ContentCache.MAX_ENTRIES) {
    const oldest = this.memory.keys().next().value;
    if (oldest === undefined) break;
    this.memory.delete(oldest);
  }
}
```

Y agregar `page: z.coerce.number().int().min(1).max(200).default(1)` en `listQuerySchema`.

Para la invalidación, mantener un índice tag → claves en un solo archivo, en lugar de escanear el
directorio. A mediano plazo, con más de una instancia de API esta caché en proceso + disco local
deja de ser coherente entre réplicas: el destino natural es Redis.

### Escritura no atómica

`write` (103-110) hace `writeFile` directo. Dos peticiones concurrentes sobre la misma clave
pueden dejar un JSON truncado. El `JSON.parse` está en un `try/catch` que devuelve `null`, así
que degrada a recarga en lugar de fallar — pero conviene escribir a `.tmp` y `rename`.
