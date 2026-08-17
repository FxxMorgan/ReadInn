# Auditoría ReadInn — Mejora recomendada (M1–M11)

Volver a [`00-RESUMEN.md`](./00-RESUMEN.md) · Anterior: [`01-CRITICO.md`](./01-CRITICO.md) · Siguiente: [`03-MENORES.md`](./03-MENORES.md)

---

## M1 — `checkDatabaseConnection()` agrega un round-trip por llamada, en ~30 lugares

**Archivo:** `apps/api/src/shared/db.ts:5-12`

Cada invocación ejecuta `SELECT 1` contra Postgres. El grafo de llamadas muestra 30 call sites, y
varios se acumulan dentro de una misma petición. `GET /v1/stories/:storyId/download` de una obra
de 100 capítulos hace: 1 en `requireAdultAccess`, 1 en `getStoryByIdUncached`, y 1 por capítulo
en `getChapterByIdUncached` → ~102 round-trips extra, más el trabajo real.

Con el fallo cerrado de C2 esta función deja de decidir lógica de negocio y sólo queda como
health check. Para `/health/ready` está bien; en la ruta de petición conviene eliminarla y dejar
que Prisma falle, mapeando el error en `setErrorHandler`:

```ts
// app.ts, dentro de setErrorHandler
if (error instanceof Prisma.PrismaClientInitializationError
 || error instanceof Prisma.PrismaClientRustPanicError) {
  return reply.status(503).send({
    error: { code: 'DATABASE_UNAVAILABLE', message: 'Servicio temporalmente no disponible.', requestId: request.id, details: [] },
  });
}
```

Vale también manejar `PrismaClientKnownRequestError` con `code === 'P2002'` → 409, que hoy
produce un 500 genérico (ver M6).

---

## M2 — Listados sin tope: comentarios, perfiles públicos, dashboard admin

Cuatro consultas sin `take`, en un dominio de alto volumen de texto:

| Ubicación | Consulta | Riesgo |
|---|---|---|
| `reader-routes.ts:130-137` | `chapterComment.findMany` sin `take`, con `include: { author: { include: { profile: true } } }` | Un capítulo viral devuelve **todos** sus comentarios con autor y perfil embebidos |
| `social/routes.ts:111-126` | `/v1/users/:username` trae todas las obras del autor con author+profile+genres+tags | Un autor con 500 obras devuelve las 500 completas |
| `writer-repository.ts:28` | `getAllStories()` (vista admin) sin paginación | Crece con el catálogo entero |
| `analytics-routes.ts:87-101` | `readingEvent.findMany({ distinct: [...] })` sin `take`, dos veces | Una obra popular trae todos sus pares únicos a memoria |

Los comentarios son el caso más urgente porque se combina con M10: el lector recarga el hilo
completo tras **cada** voto y cada comentario publicado.

Fix para comentarios — paginación por cursor, que es la forma correcta en un hilo que crece:

```ts
const listQuerySchema = z.object({
  includeHidden: z.enum(['true','false','1','0']).optional().transform((v) => v === 'true' || v === '1'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

const comments = await prisma.chapterComment.findMany({
  where: { storyId, chapterId },
  orderBy: { createdAt: 'desc' },
  take: query.limit + 1,
  ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  select: {
    id: true, storyId: true, chapterId: true, parentId: true, authorId: true,
    authorName: true, body: true, paragraphIndex: true, likes: true, downvotes: true, createdAt: true,
    author: { select: { username: true, profile: { select: { avatarUrl: true } } } },
    ...(viewerId ? { votes: { where: { userId: viewerId }, select: { value: true } } } : {}),
  },
});
const hasMore = comments.length > query.limit;
```

---

## M3 — Métricas manipulables y parcialmente inventadas

**Archivo:** `apps/api/src/modules/stories/analytics-routes.ts`

### El cliente controla la clave de idempotencia

```ts
const eventId = body.eventId ?? crypto.randomUUID();
await prisma.readingEvent.upsert({ where: { eventId }, create: { ... }, update: {} });
```

`eventId` viene en el body (`eventSchema`, línea 13). Generando un UUID nuevo por petición se
inflan las vistas sin límite: 120/min de rate limit → ~172.000 vistas falsas por día por IP. Y
`activeSeconds` acepta hasta 3600 por evento, así que `avgReadMinutes` es igual de manipulable.

Mitigación: derivar el `eventId` en el servidor a partir de `(readerKey, chapterId, eventType,
ventana-de-tiempo)` en lugar de aceptarlo del cliente:

```ts
function serverEventId(readerKey: string, chapterId: string, eventType: string): string {
  const window = Math.floor(Date.now() / 60_000);         // una vista por lector/capítulo/minuto
  return crypto.createHash('sha256')
    .update(`${readerKey}|${chapterId}|${eventType}|${window}`)
    .digest('hex').slice(0, 64);
}
```

### Valores hardcodeados presentados como métricas

En `emptySummary` y en la respuesta real (líneas 141-154): `followers: 0`,
`viewsGrowthMonth: '0%'`, `readersGrowthMonth: '0%'`, `followersGrowthMonth: '0 este mes'`,
`chaptersRetention: []`. El dashboard de autor muestra ceros como si fueran datos. Mejor omitir
los campos no implementados que devolver ceros indistinguibles de un valor real.

`followers` es especialmente raro porque el dato existe: `prisma.userFollow.count({ where: { followingId: userId } })`.

### `ReadingEvent` sin retención ni agregación

Una fila por heartbeat, sin política de purga ni rollup, y consultada en cada carga del catálogo
(ver C7). Va a ser la tabla más grande de la base. Necesita:

1. Un rollup diario (`story_daily_metrics`) alimentado por un job, y que las lecturas usen eso.
2. Purga de eventos crudos con más de N días.
3. Que el contador `readCount` de C7 se incremente en la escritura, para que el catálogo nunca
   agregue esta tabla.

---

## M4 — El proxy de Next no reenvía la IP del cliente

**Archivo:** `apps/web/src/app/api/readinn/[...path]/route.ts:12-15`

```ts
const headers = new Headers();
const contentType = request.headers.get('content-type');
if (contentType) headers.set('Content-Type', contentType);
if (token) headers.set('Authorization', `Bearer ${token}`);
```

No se propaga `X-Forwarded-For`. Desde la API, **todo** el tráfico web parece venir de una sola
IP: la del servidor Next. Dos consecuencias distintas:

- **Rate limiting inservible.** Los 120 req/min de `app.ts:39-42` son un cupo compartido por
  todos los visitantes web simultáneamente. Con tráfico normal el sitio se auto-limita; y a la
  vez un atacante que pegue directo a la API tiene su propio cupo completo.
- **Analítica de lectores únicos colapsada.** `anonymousReaderKey`
  (`analytics-routes.ts:20-36`) hashea `${request.ip}|${userAgent}`. Con la IP constante, todos
  los lectores anónimos que compartan user-agent caen en la misma `readerKey`. El
  `uniqueReaders` del dashboard es basura.

Fix en el proxy:

```ts
const forwardedFor = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
if (forwardedFor) headers.set('X-Forwarded-For', forwardedFor);
const userAgent = request.headers.get('user-agent');
if (userAgent) headers.set('User-Agent', userAgent);
```

Y en la API, confiar en el proxy explícitamente — Fastify no lo hace por defecto:

```ts
const app = Fastify({ trustProxy: true, /* ... */ });
```

`trustProxy: true` sólo es seguro si la API no es alcanzable directamente desde internet; si lo
es, hay que pasar la lista de IPs de los proxies conocidos en lugar de `true`.

---

## M5 — XSS latente: el contenido enriquecido se guarda sin validación de esquema

**Archivos:** `apps/api/src/modules/stories/writer-routes.ts:33`, `apps/web/src/components/rich-editor.tsx:59`

```ts
const editorContentSchema = z.union([z.array(z.string()), z.record(z.unknown()), z.string()]);
```

`z.record(z.unknown())` acepta **cualquier** objeto. Ese valor va directo a `contentJson`
(`Json` en el schema) sin normalizar ni validar la forma del documento TipTap.

Hoy no es explotable en la web: el lector aplana el documento a nodos de texto
(`paragraphs()` en `chapters/[chapterId]/page.tsx:29-38`) y React escapa al renderizar; el
export EPUB escapa correctamente con `escapeXml` (`story-export.ts:18-25`); y el JSON-LD usa
`jsonLd()` que escapa `<` a `<` (`seo-api.ts:57-59`) — verificado, ahí no hay problema.

El riesgo es que el payload **se persiste** y el sink no existe todavía. Dos puntas concretas:

1. El editor no valida el protocolo de los enlaces:

```ts
{command('Enlace', <Link2 size={17}/>, () => {
  const href = window.prompt('URL del enlace');
  if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
})}
```

   `Link.configure({ openOnClick: false })` no restringe protocolos, así que un
   `javascript:` queda guardado en la base.

2. El día que alguien renderice ese JSON como HTML —`generateHTML` de TipTap para el SSR del
   lector, una vista previa, un export a HTML— es XSS almacenado con el payload ya sembrado.

Fix en dos capas. En el editor:

```ts
Link.configure({
  openOnClick: false,
  protocols: ['http', 'https', 'mailto'],
  validate: (href) => /^(https?:|mailto:)/i.test(href),
}),
```

Y en el servidor, validar la forma del documento en lugar de aceptar cualquier objeto:

```ts
const editorNodeSchema: z.ZodType<unknown> = z.lazy(() => z.object({
  type: z.enum(['doc','paragraph','text','heading','bulletList','orderedList','listItem',
                'blockquote','horizontalRule','hardBreak','image']),
  text: z.string().max(100_000).optional(),
  attrs: z.record(z.unknown()).optional(),
  marks: z.array(z.object({ type: z.enum(['bold','italic','underline','link']), attrs: z.record(z.unknown()).optional() })).max(8).optional(),
  content: z.array(editorNodeSchema).max(5_000).optional(),
}).strict());

const editorContentSchema = z.union([z.array(z.string().max(100_000)).max(5_000), editorNodeSchema, z.string().max(1_000_000)]);
```

Y sanear `attrs.href` / `attrs.src` server-side contra una allowlist de protocolos antes de
guardar. Nótese que `bulk-import-routes.ts:11-18` ya hace esto bien: `chapterSchema` es
`.strict()` con límites explícitos. Es el estándar a replicar en el editor.

---

## M6 — Condiciones de carrera en creación de capítulos y resolución de taxonomía

### Posición de capítulo calculada fuera de transacción

`writer-repository.ts:76`:

```ts
const position = (await prisma.chapter.count({ where: { storyId: params.storyId } })) + 1;
const chapter = await prisma.chapter.create({ data: { storyId, position, slug: `${slugify(title,'capitulo')}-${position}`, ... } });
```

`@@unique([storyId, position])` y `@@unique([storyId, slug])` en el schema. Dos creaciones
concurrentes obtienen el mismo `count()` → la segunda viola la restricción → `P2002` sin manejar
→ 500 genérico. Escenario realista: doble clic en "Añadir capítulo", o un cliente con reintentos.

```ts
return prisma.$transaction(async (tx) => {
  const last = await tx.chapter.findFirst({
    where: { storyId: params.storyId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const position = (last?.position ?? 0) + 1;
  return tx.chapter.create({ data: { /* ... */ position, slug: `${slugify(params.title,'capitulo')}-${position}` } });
}, { isolationLevel: 'Serializable' });
```

Con `Serializable`, una de las dos transacciones falla con error de serialización y se puede
reintentar; alternativamente, un `SELECT ... FOR UPDATE` sobre la obra, o un advisory lock por
`storyId` como el que ya se usa en el registro (`auth/routes.ts:84`).

### `resolveGenres` / `resolveTags`: N+1 y carrera

`writer-repository.ts:18-19`:

```ts
async function resolveTags(names: string[]) {
  return Promise.all([...new Set(names)].map(async (name) => {
    const kind = storyTagKind(name);
    if (!kind) throw new Error(`Etiqueta no permitida: ${name}`);
    const existing = await prisma.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    return existing ?? prisma.tag.create({ data: { name, kind, slug: `${slugify(name,'tag')}-${...}` } });
  }));
}
```

Tres problemas: una consulta por nombre (N+1, hasta 20 tags por obra); `check-then-create` racy
contra `Tag.name @unique` → `P2002` → 500; y `throw new Error` en lugar de `AppError`, así que una
etiqueta fuera de taxonomía devuelve 500 en vez de 422.

```ts
async function resolveTags(names: string[]) {
  const unique = [...new Set(names.map((n) => n.trim()))];
  for (const name of unique) {
    if (!storyTagKind(name)) {
      throw new AppError('INVALID_TAG', `La etiqueta no esta en la taxonomia: ${name}`, 422);
    }
  }
  // La taxonomía es cerrada y se siembra en el seed: leer todo de una vez.
  const existing = await prisma.tag.findMany({ where: { name: { in: unique, mode: 'insensitive' } } });
  const found = new Map(existing.map((tag) => [tag.name.toLocaleLowerCase('es'), tag]));
  const missing = unique.filter((name) => !found.has(name.toLocaleLowerCase('es')));
  for (const name of missing) {
    const kind = storyTagKind(name)!;
    const tag = await prisma.tag.upsert({          // upsert, no findFirst+create
      where: { name },
      create: { name, kind, slug: slugify(name, 'tag') },
      update: {},
    });
    found.set(name.toLocaleLowerCase('es'), tag);
  }
  return unique.map((name) => found.get(name.toLocaleLowerCase('es'))!);
}
```

### Los géneros se crean desde texto libre

`createStorySchema` valida `genres: z.array(z.string().trim().min(2).max(80))` y `resolveGenres`
crea la fila si no existe. A diferencia de los tags —que se validan contra `storyTagKind`— los
géneros no se contrastan con `STORY_GENRES`. Cualquier autor puede crear filas de género
permanentes con cualquier texto, y aparecen en los filtros del catálogo. Para una plataforma cuyo
eje es el filtrado por taxonomía, esto la degrada con el uso. Debería validarse contra
`STORY_GENRES` igual que los tags, y que los géneros nuevos sean una operación de admin.

### Efectos fuera de transacción

En `updateStory` (56-71), `resolveGenres`/`resolveTags` corren en la línea 59, **antes** del
`$transaction` de la línea 65. Si la transacción falla, los géneros y tags recién creados quedan
huérfanos. Deberían recibir el `tx` como parámetro, como hace `bulk-import-routes.ts:99-120`.

---

## M7 — El modo fixture está entrelazado con la lógica de producción, y los tests sólo cubren el fallback

Cada método de repositorio lleva su rama offline dentro. `writer-repository.ts` es el caso
extremo: 141 líneas donde casi todas las funciones tienen dos implementaciones completas, una
sobre Prisma y otra sobre `Map`s de módulo (`offlineStoriesByAuthor`, `offlineChapterMeta`,
`offlineRevisions`). Costos concretos:

- **Cada feature se escribe dos veces** y las dos divergen. `getStories` tiene un filtrado
  completo por géneros/tags/mature en fixtures (líneas 52-84) y otro en Prisma (88-136), con
  semánticas distintas.
- **La ruta de producción es la no testeada.** Los 23 tests corren contra fixtures porque no hay
  DB de test. Todo el código Prisma —incluidos los fixes de este informe— no tiene red de
  seguridad.
- **Los fixtures se resuelven antes que la DB** incluso conectada (`story-repository.ts:283`,
  `396`), lo que habilita la contaminación persistente descrita en C2.

Camino de salida, en orden:

1. `docker-compose.yml` ya levanta Postgres. Agregar un servicio de test o una base
   `readinn_test`, y en `vitest` un `globalSetup` que corra `prisma migrate deploy` y limpie entre
   tests.
2. Portar los tests existentes a la ruta real. Los casos ya escritos son buenos —
   "keeps writer drafts private until publishing", "caches book content on disk and invalidates
   it after an author edit"— y son exactamente los que hay que verificar contra Prisma.
3. Sacar el fallback de los repositorios detrás de una interfaz, activada por una variable
   explícita (`READINN_FIXTURE_MODE`), nunca por un error de conexión.

Antes de eso conviene agregar tests de regresión de los críticos, que no necesitan DB:

```ts
it('rechaza tokens sin firma', () => {
  const forged = Buffer.from(JSON.stringify({ userId: 'victima' })).toString('base64');
  expect(verifyToken(forged, 'access')).toBeNull();
});

it('no cruza capitulos entre obras', async () => {
  const response = await app.inject({ url: `/v1/stories/${otraObraId}/chapters/${chapterId}` });
  expect(response.statusCode).toBe(404);
});
```

---

## M8 — CORS contradictorio y rate limiting insuficiente

**Archivo:** `apps/api/src/app.ts:34-42`

```ts
await app.register(cors, { origin: '*', credentials: true });
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
```

- **`origin: '*'` con `credentials: true`** es una combinación que los navegadores rechazan: con
  wildcard no se permiten credenciales. Como la autenticación va por header `Authorization` y no
  por cookie de la API, no hay CSRF explotable acá, pero la configuración declara una intención
  que no se cumple. Corresponde una allowlist explícita:

```ts
await app.register(cors, {
  origin: [config.APP_WEB_URL, 'https://readinn.cypher.cl'],
  credentials: true,
});
```

- **Un solo límite global, sin límites por ruta.** `/v1/auth/login` acepta 120 intentos por
  minuto: fuerza bruta viable, más aún con contraseñas de mínimo 6 caracteres
  (`registerSchema`, línea 11). Los comentarios tienen el mismo cupo, sin captcha ni throttling
  por usuario, y `POST /v1/reports` también.

```ts
app.post('/v1/auth/login', {
  config: { rateLimit: { max: 8, timeWindow: '5 minutes', keyGenerator: (req) => `${req.ip}` } },
}, async (request) => { /* ... */ });
```

- **El limiter es in-process.** Con más de una réplica cada una lleva su propia cuenta, así que el
  límite efectivo se multiplica por el número de instancias. `@fastify/rate-limit` soporta un
  store Redis.

Aparte: `registerSchema` pide `password: z.string().min(6)` sin máximo. Conviene `.max(200)` —
sin tope, una contraseña de megabytes pasa por PBKDF2 con 210.000 iteraciones (M6) y se convierte
en un DoS de CPU.

---

## M9 — Comentarios anónimos con nombre libre, y ocultamiento por votos trivial de abusar

**Archivo:** `apps/api/src/modules/stories/reader-routes.ts`

### Suplantación de identidad

```ts
authorName: author?.profile?.displayName ?? body.authorName ?? 'Invitado',
```

Línea 223. Si no hay sesión válida, se usa el `authorName` que mandó el cliente
(`commentSchema`, línea 19: `z.string().trim().min(1).max(80).optional()`). Cualquiera publica
como "Marina Solís" sin autenticarse. El endpoint no requiere sesión en absoluto.

Como mínimo, marcar visualmente los comentarios sin `authorId` como invitados y no permitir que
un invitado use un `displayName` que coincida con el de un usuario registrado. La opción sana es
exigir sesión para comentar.

### Ocultamiento por negatividad sin barrera de entrada

`NEGATIVE_COMMENT_THRESHOLD = 3` (línea 33). Con el registro sin verificación de email (C6), tres
cuentas desechables ocultan cualquier comentario. Y el ocultamiento es puramente cosmético:
`?includeHidden=true` se respeta para **cualquier** llamante, sin comprobar rol
(`commentListQuerySchema`, líneas 24-27), y el propio frontend expone el botón
"Mostrar de todas maneras".

Si la intención es una señal blanda de la comunidad, está bien —pero entonces no es un control de
moderación y no debería contarse como tal. Si la intención es moderar, hace falta: verificación
de email, umbral relativo al volumen de votos en lugar de absoluto, y peso por antigüedad de
cuenta.

### Sin límite de profundidad en las respuestas

`parentCommentId` se valida contra la pertenencia al capítulo (líneas 191-208) pero no contra la
profundidad de la cadena. El frontend limita la sangría visual con
`Math.min(depth, 3)` (`page.tsx:342`) pero el árbol puede ser arbitrariamente profundo, y
`CommentItem` es recursivo — con una cadena de miles de niveles se desborda la pila del
renderizado. Conviene guardar `depth` en el modelo y rechazar más allá de, por ejemplo, 8.

---

## M10 — El lector recarga todo el hilo tras cada acción y filtra O(n·m) por render

**Archivo:** `apps/web/src/app/stories/[storyId]/chapters/[chapterId]/page.tsx`

### Recarga completa por voto y por comentario

```ts
async function voteComment(comment: ChapterComment, value: -1 | 1) {
  await apiFetch(`.../comments/${comment.id}/vote`, { method: 'POST', body: JSON.stringify({ value: nextValue }) });
  await loadComments();                       // vuelve a bajar el hilo entero
}
```

Y `loadComments` pega a un endpoint sin paginación (M2). Un upvote en un capítulo con 2.000
comentarios descarga los 2.000 con autor y avatar. La respuesta del voto ya trae
`upvotes/downvotes/score/currentVote`: alcanza con actualizar ese comentario en el estado local.

```ts
async function voteComment(comment: ChapterComment, value: -1 | 1) {
  const nextValue = comment.currentVote === value ? 0 : value;
  const result = await apiFetch<{ upvotes: number; downvotes: number; score: number; currentVote: number }>(
    `/v1/stories/${params.storyId}/chapters/${params.chapterId}/comments/${comment.id}/vote`,
    { method: 'POST', body: JSON.stringify({ value: nextValue }) },
  );
  setComments((current) => current.map((item) => (item.id === comment.id ? { ...item, ...result } : item)));
}
```

### Filtrado cuadrático dentro del render

```ts
{copy.map((paragraph, index) => {
  const inlineComments = comments.filter((c) => c.paragraphIndex === index && !c.parentCommentId);
```

Un `filter` sobre todos los comentarios **por cada párrafo**, en cada render. 500 párrafos × 2.000
comentarios = 1.000.000 de comparaciones por render, y el render se dispara con cada cambio de
tema, tamaño de fuente o voto. `CommentItem` hace lo mismo para buscar sus respuestas (línea 337),
recursivamente.

```ts
const commentsByParagraph = useMemo(() => {
  const map = new Map<number, ChapterComment[]>();
  const repliesByParent = new Map<string, ChapterComment[]>();
  for (const comment of comments) {
    if (comment.parentCommentId) {
      const list = repliesByParent.get(comment.parentCommentId) ?? [];
      list.push(comment);
      repliesByParent.set(comment.parentCommentId, list);
    } else if (comment.paragraphIndex !== undefined) {
      const list = map.get(comment.paragraphIndex) ?? [];
      list.push(comment);
      map.set(comment.paragraphIndex, list);
    }
  }
  return { commentsByParagraph: map, repliesByParent };
}, [comments]);
```

Un solo recorrido, y `CommentItem` recibe `repliesByParent` en lugar del array completo.

### Efecto sin cancelación, con `user` en las dependencias

```ts
useEffect(() => {
  async function loadProtectedChapter() { /* 3 fetches secuenciales */ }
  void loadProtectedChapter();
}, [params.chapterId, params.storyId, refresh, router, user]);
```

`user` es un objeto que cambia de referencia cuando `refresh()` reescribe el estado —y el propio
efecto llama a `refresh()` en el flujo de confirmación de edad (línea 89), lo que puede
re-disparar el efecto. Sin `AbortController` ni flag de cancelación, dos ejecuciones en carrera
pueden dejar el capítulo equivocado en el estado. Correcto: depender de
`user?.id` y `user?.adultConfirmed` en lugar del objeto, y cortar al desmontar:

```ts
useEffect(() => {
  const controller = new AbortController();
  let cancelled = false;
  async function load() {
    // ... if (cancelled) return; antes de cada setState
  }
  void load();
  return () => { cancelled = true; controller.abort(); };
}, [params.chapterId, params.storyId, user?.id, user?.adultConfirmed]);
```

---

## M11 — El tag `+18` no fuerza clasificación 18, y la confirmación de edad es un `confirm()`

**Archivo:** `apps/api/src/modules/stories/story-taxonomy.ts:110-121`

```ts
const tagMinimumAgeEntries: Array<[string, StoryAgeRating]> = [
  ['Violencia', '13'], ['Lenguaje fuerte', '13'], /* ... */
  ['Gore', '16'], ['Violencia gráfica', '16'], ['Drogas', '16'], ['Temas maduros', '16'],
  ['Contenido sexual', '18'],
];
```

El grupo `content` de `STORY_TAG_GROUPS` (líneas 46-53) incluye el tag literal **`'+18'`**, pero
no está en `tagMinimumAgeEntries`. Entonces una obra etiquetada `+18` + `Gore` +
`Violencia gráfica` queda clasificada **`'16'`**, y `requireAdultAccess`
(`stories/routes.ts:52`) sólo bloquea `ageRating === '18'`:

```ts
if (!story || story.ageRating !== '18') return;
```

Resultado: contenido que el propio autor marcó como +18 es accesible sin sesión ni confirmación.

```ts
const tagMinimumAgeEntries: Array<[string, StoryAgeRating]> = [
  // ...
  ['Contenido sexual', '18'],
  ['+18', '18'],                 // el tag explícito debe forzar la clasificación máxima
];
```

Vale revisar el conjunto completo contra el criterio editorial: `Zombies` y `Violencia` están en
el grupo `content` pero `Zombies` no tiene mínimo asignado.

### La confirmación de edad no verifica nada

`apps/web/.../page.tsx:80-90`: un `window.confirm()` y un `POST` a
`/v1/auth/me/adult-confirmation`, cuyo schema es `z.object({ confirmed: z.literal(true) })`. No
hay fecha de nacimiento, y una sola aceptación marca la cuenta permanentemente
(`adultConfirmedAt`). Para una plataforma con contenido explícito conviene registrar fecha de
nacimiento en el perfil y derivar el permiso, en lugar de un booleano autodeclarado — además de
que el gate del servidor sea la única fuente de verdad (hoy el chequeo del cliente en la línea 75
es redundante con `requireAdultAccess`, y el del servidor es el que tiene el agujero de C3).
