# Roadmap de implementación de ReadInn

**Fecha de corte:** 14 de agosto de 2026  
**Estado:** fundación técnica iniciada  
**Documento de referencia:** [GUIA_DE_IMPLEMENTACION_READINN.md](./GUIA_DE_IMPLEMENTACION_READINN.md)  
**Especificación de producto:** [Documento de Definición MVP](./Documento%20de%20Definici%C3%B3n_%20MVP%20-%20Alternativa%20a%20Wattpad%20%28Flutter%29%20V2.md)

---

## 1. Estado actual

### 1.1 Completado

- [x] Especificación V2 revisada.
- [x] Guía técnica de implementación creada.
- [x] Repositorio Git inicializado.
- [x] Workspace pnpm creado.
- [x] Estructura `apps/api` y `apps/mobile` creada.
- [x] API Fastify + TypeScript inicializada.
- [x] Configuración validada con Zod.
- [x] Health checks implementados:
  - `GET /health/live`
  - `GET /health/ready`
- [x] Catálogo fixture público implementado:
  - `GET /v1/stories`
  - `GET /v1/stories/:storyId`
  - `GET /v1/stories/:storyId/chapters/:chapterId`
- [x] Paginación, búsqueda básica, filtros por género y errores tipados.
- [x] Helmet, CORS, rate limit y request IDs configurados.
- [x] Esquema Prisma inicial para usuarios, perfiles, obras, géneros y capítulos.
- [x] Seed inicial de géneros.
- [x] Docker Compose definido para PostgreSQL, MinIO y Mailpit.
- [x] Flutter Android/Web generado con el SDK instalado.
- [x] Dependencias npm instaladas y cliente Prisma generado.
- [x] API compilada correctamente.
- [x] Tres pruebas API pasando.
- [x] ESLint pasando.
- [x] Configuración Docker validada.

### 1.2 Parcial

- [ ] La API todavía usa fixtures en memoria; no consulta PostgreSQL.
- [ ] Prisma tiene esquema, pero aún no tiene migración aplicada.
- [ ] Flutter conserva la pantalla de contador generada por `flutter create`.
- [ ] Las dependencias Flutter de Riverpod, Go Router, Dio y preferencias aún no están añadidas.
- [ ] No existe autenticación.
- [ ] No existe persistencia de progreso.
- [ ] No existe almacenamiento de imágenes conectado.
- [ ] No existe CI configurada.
- [ ] No existe una aplicación desplegada.

### 1.3 No iniciado

- Registro, login, refresh tokens y recuperación de contraseña.
- CRUD de obras y capítulos para escritores.
- Editor, autosave, revisiones y prevención de pérdida de borradores.
- Biblioteca y seguimiento de autores.
- Lector Flutter conectado a API.
- Métricas de lectura.
- Reportes y panel de moderación.
- Términos, privacidad y política de contenido dentro de la aplicación.
- Notificaciones, pagos, recomendaciones y demás funciones post-MVP.

---

## 2. Arquitectura decidida

### Backend

- Node.js 22.
- TypeScript estricto.
- Fastify 5.
- Zod para validación.
- Prisma 6.
- PostgreSQL 16.
- Pino a través del logger de Fastify.
- Vitest para pruebas.
- Docker Compose para desarrollo.

### Flutter

- Flutter estable.
- Android y Web como plataformas iniciales.
- Riverpod para estado.
- Go Router para navegación.
- Dio para HTTP.
- `shared_preferences` para preferencias simples.
- Drift/SQLite para la cola y caché offline posterior.

### Decisiones de alcance

- El MVP no procesará pagos nativos.
- Las donaciones iniciales serán enlaces externos del perfil del autor.
- Los comentarios quedan después del MVP núcleo.
- La recomendación inicia con heurísticas, no con machine learning.
- La moderación será reactiva al inicio, con reportes y suspensión administrativa.
- El contenido de capítulos se modelará como documento estructurado validado, no HTML arbitrario.

---

## 3. Roadmap por fases

### Fase 0. Fundación reproducible

**Estado:** en curso  
**Objetivo:** que cualquier integrante pueda levantar el proyecto y ejecutar verificaciones básicas.

#### Tareas

- [x] Workspace pnpm.
- [x] API TypeScript compilable.
- [x] App Flutter generada.
- [x] Docker Compose base.
- [x] Variables de entorno de ejemplo.
- [ ] README con instrucciones verificadas de extremo a extremo.
- [ ] Configurar CI para API y Flutter.
- [ ] Crear `docs/adr/` y registrar decisiones iniciales.
- [ ] Añadir `docs/api/openapi.yaml`.
- [ ] Definir estrategia de versiones y changelog.
- [ ] Crear seeds deterministas para desarrollo.

#### Criterios de salida

- `pnpm install` funciona desde un checkout limpio.
- `pnpm build:api`, `pnpm test:api` y `pnpm lint:api` pasan.
- `flutter pub get`, `flutter analyze` y `flutter test` pasan.
- PostgreSQL, MinIO y Mailpit levantan con Docker.
- Una persona nueva puede ejecutar el health check siguiendo el README.

### Fase 1. Primer incremento vertical de lectura

**Estado:** backend iniciado; Flutter pendiente  
**Objetivo:** explorar una obra y leer un capítulo de forma usable.

#### Backend

- [x] Listado de obras fixture.
- [x] Búsqueda textual fixture.
- [x] Detalle de obra fixture.
- [x] Lectura de capítulo fixture.
- [x] Reemplazar fixtures por repositorio Prisma (`StoryRepository`).
- [x] Crear seed de géneros, usuarios, obras y capítulos (`prisma/seed.ts`).
- [ ] Agregar OpenAPI.
- [ ] Agregar ETags o `Last-Modified` para capítulos.

#### Flutter

- [x] Añadir Riverpod, Go Router, Dio y preferencias.
- [x] Crear tema visual de ReadInn.
- [x] Crear modelo de obra y capítulo.
- [x] Crear cliente HTTP con URL por entorno.
- [x] Crear exploración con búsqueda y filtros.
- [x] Crear detalle de obra.
- [x] Crear lista de capítulos.
- [x] Crear lector con ancho de columna controlado.
- [x] Añadir temas claro, oscuro, sepia y noche.
- [x] Añadir tamaño de fuente y tipografía.
- [x] Definir estados de carga, error y vacío.

#### Criterios de salida

- Un usuario anónimo puede explorar desde Web y Android.
- Puede abrir una obra y un capítulo.
- El lector no presenta overflow en móvil ni Web.
- El contenido se puede leer aunque la API esté temporalmente indisponible si existe caché fixture/local.
- El lector conserva las preferencias durante un reinicio.

### Fase 2. Persistencia y autenticación

**Estado:** completada  
**Objetivo:** convertir el prototipo público en una aplicación con cuentas reales.

#### Base de datos

- [x] Añadir cliente Prisma singleton con fallback transparente (`src/shared/db.ts`).
- [x] Añadir seed determinista de usuarios, géneros, obras y capítulos (`prisma/seed.ts`).
- [x] Aplicar migración Prisma inicial.
- [x] Añadir refresh sessions.

#### API

- [x] `POST /v1/auth/register`.
- [x] `POST /v1/auth/login`.
- [x] `POST /v1/auth/refresh`.
- [x] `POST /v1/auth/logout`.
- [x] `POST /v1/auth/logout-all`.
- [x] `GET /v1/auth/me`.
- [x] Verificación de email (`POST /v1/auth/verify-email`).
- [x] Recuperación de contraseña (`POST /v1/auth/forgot-password` y `POST /v1/auth/reset-password`).
- [x] Rotación y detección de reutilización de refresh token.
- [x] Rate limits específicos de autenticación.

#### Cliente

- [x] Pantalla de login (`AuthDialog`).
- [x] Pantalla de registro (`AuthDialog`).
- [x] Recuperación de contraseña.
- [x] Almacenamiento seguro del token (`SharedPreferences`).
- [x] Rutas públicas y protegidas.
- [x] Cierre de sesión completo.

#### Criterios de salida

- Las sesiones funcionan en dos dispositivos.
- Cambiar contraseña revoca sesiones anteriores.
- No se enumeran correos existentes.
- El cliente reintenta una petición después de refrescar el token solo una vez.

### Fase 3. Publicación para escritores

**Estado:** completada  
**Objetivo:** permitir crear, editar y publicar obras sin perder borradores.

#### Backend

- [x] `POST/PATCH /v1/stories`.
- [x] `GET /v1/me/stories`.
- [x] Crear y editar capítulos (`POST /v1/stories/:id/chapters`).
- [x] Estados de obra y capítulo.
- [x] Cálculo server-side de palabras y tiempo estimado.
- [x] Validación del documento estructurado.

#### Media

- [x] Endpoint de intención de subida (`POST /v1/media/upload-intent` y `POST /v1/media/:id/confirm`).
- [x] Integración S3 / MinIO local y Cloudflare R2 (URLs pre-firmadas PUT y almacenamiento de portadas/avatares).

#### Flutter

- [x] Pantalla “Mis obras” (`writer_dashboard_screen.dart`).
- [x] Crear/editar obra (`create_story_dialog.dart`).
- [x] Selector de géneros.
- [x] Vista previa con el renderer del lector.

#### Criterios de salida

- Un escritor puede publicar una obra desde cero.
- Un borrador se recupera después de perder conexión.
- Un autor no puede editar obras ajenas.
- Un capítulo publicado no se elimina físicamente.
- Una obra publicada aparece en exploración.

### Fase 4. Continuidad del lector

**Estado:** completada  
**Objetivo:** que ReadInn recuerde al lector y fomente el regreso.

- [x] `reading_progress` persistente (`POST /v1/reading-progress`).
- [x] Biblioteca (`POST /v1/library/:storyId` y `GET /v1/library`).
- [x] Seguir/dejar de seguir autor (`POST /v1/follows/:authorId`).
- [x] Continuar leyendo (`LibraryScreen`).
- [x] Pantalla de Biblioteca (`library_screen.dart`).

#### Criterios de salida

- El lector continúa desde la última posición.
- El progreso no retrocede por una respuesta atrasada.
- Eventos repetidos no duplican vistas.
- Biblioteca y follows son idempotentes.
- El lector puede avanzar con una interrupción temporal de red.

### Fase 5. Descubrimiento y búsqueda real

**Estado:** completada  
**Objetivo:** encontrar contenido relevante sin algoritmo complejo.

- [x] Búsqueda flexible por título y autor en `GET /v1/stories`.
- [x] Filtros por género y estado.
- [x] Ordenamiento por recientes y populares.
- [x] Deep links en cliente Flutter (`/story/:storyId`, `/story/:storyId/read/:chapterId`).

### Fase 6. Métricas del escritor

**Estado:** completada  
**Objetivo:** entregar señales confiables sin exponer la identidad de lectores.

- [x] Telemetría de lectura (`POST /v1/analytics/events`).
- [x] Métrica de lectura agregada (`GET /v1/dashboard/metrics`).
- [x] Conteo de lectores únicos.
- [x] Tiempo promedio activo de lectura.
- [x] Tabla de retención de lectura capítulo a capítulo (N a N+1).
- [x] Dashboard resumen del creador (`writer_dashboard_screen.dart`).

#### Criterios de salida

- Las métricas se pueden recalcular.
- Un mismo evento no infla resultados.
- Las fórmulas están visibles para el escritor.
- Los grupos pequeños no revelan información individual.

### Fase 7. Moderación, privacidad y beta cerrada

**Estado:** completada  
**Objetivo:** operar una beta con control de abuso y capacidad de respuesta.

- [x] Endpoint de envío de reportes (`POST /v1/reports`).
- [x] Cola administrativa de moderación (`GET /v1/admin/reports`).
- [x] Suspensión y restauración de contenido (`PATCH /v1/admin/stories/:storyId/status`).
- [x] Diálogo modal de reporte de contenido en cliente Flutter (`report_dialog.dart`).

#### Criterios de salida

- Cada contenido público puede reportarse.
- Una acción administrativa es auditable.
- Se puede retirar contenido urgente.
- No hay vulnerabilidades críticas conocidas.
- Los backups se restauran en staging.
- Existe un propietario para soporte y moderación.

---

## 4. Roadmap posterior al MVP

El trabajo posterior se activa por evidencia, no solo por completar una lista de funciones.

### Etapa A. Estabilización y aprendizaje

**Entrada:** beta cerrada operativa.  
**Prioridad:** P0.

- Mejorar onboarding.
- Reducir crashes y errores 5xx.
- Corregir autosave y sincronización.
- Analizar embudos de registro, publicación y lectura.
- Mejorar búsqueda según consultas reales.
- Crear exportación de contenido para escritores.
- Mejorar historial de revisiones.
- Consolidar dashboards operativos.

**Salida:** datos confiables durante varias semanas y soporte manejable.

### Etapa B. Notificaciones

**Entrada:** biblioteca/follows tienen uso recurrente y outbox estable.

- Nuevo capítulo de autor seguido.
- Nuevo capítulo de obra guardada.
- Eventos de seguridad.
- Preferencias por tipo y canal.
- Quiet hours y timezone.
- Deep links.
- Dedupe y límites de frecuencia.
- Email fallback selectivo.

### Etapa C. Comentarios y reseñas

**Entrada:** existe capacidad real de moderación.

- Comentarios por capítulo.
- Una reseña por lector y obra.
- Spoilers.
- Edición y borrado lógico.
- Reportes y bloqueo.
- Anti-spam.
- Notificaciones.
- Moderación y apelaciones.

### Etapa D. Recomendaciones

#### D1. Heurísticas

- Mismo género.
- Obras leídas juntas.
- Popularidad con decaimiento temporal.
- Diversidad de autores.
- Exclusiones de madurez e idioma.

#### D2. Personalización

- Candidatos y ranking.
- Evaluación offline.
- Experimentos controlados.
- Explicación de recomendaciones.
- Protección contra bucles de popularidad.
- Diversidad y cobertura de autores nuevos.

**Entrada:** volumen suficiente de eventos confiables.

### Etapa E. Offline avanzado

- Descargar obras/capítulos.
- Cuotas de almacenamiento.
- Manifest y checksums.
- Actualizaciones diferenciales.
- Cola de eventos.
- Expiración y retiro remoto.
- Resolución de conflictos.
- Gestión de contenido comprado futuro.

**Entrada:** evidencia de conectividad limitada y base local estable.

### Etapa F. Apoyo económico externo mejorado

- Varios enlaces de apoyo.
- Validación de dominios.
- Analítica agregada de clics con consentimiento.
- Perfil de creador enriquecido.
- Transparencia de pagos externos.

**Objetivo:** medir intención económica sin asumir custodia de dinero.

### Etapa G. Pagos y donaciones nativas

**Entrada obligatoria:** proveedor elegido, países definidos, KYC/KYB, impuestos, refunds, payouts y soporte legal resueltos.

- Payment intents.
- Cuentas conectadas.
- Donaciones.
- Comisiones versionadas.
- Reembolsos.
- Payouts.
- Webhooks idempotentes.
- Ledger/reconciliación.
- Alertas de desbalance.
- Soporte antifraude.

La comisión del 10 % nunca debe ser un literal disperso: debe ser configuración versionada y quedar registrada por transacción.

### Etapa H. Capítulos premium y suscripciones

- Productos y precios.
- Entitlements.
- Preview.
- Compra, renovación y cancelación.
- Restauración móvil.
- Gracia y refunds.
- Reparto a autores.
- Acceso offline controlado.
- Cumplimiento App Store/Play Store.

### Etapa I. Mensajería

Solo después de contar con moderación madura:

- solicitudes de mensaje;
- bloqueo;
- reportes;
- anti-spam;
- rate limits;
- preferencias de contacto;
- protección de menores;
- retención y eliminación.

### Etapa J. Comunidades y foros

- Espacios por obra/tema.
- Posts y respuestas.
- Moderadores comunitarios.
- Fijados y bloqueos.
- Reputación limitada.
- Búsqueda y archivo.

Comenzar con comunidades piloto administradas.

### Etapa K. Traducción

- Interfaz localizada primero.
- Traducción de contenido solo con consentimiento del autor.
- Versiones vinculadas al capítulo fuente.
- Etiquetado automático/humano.
- Costos, cuotas y proveedor.
- Revisión y reporte.

### Etapa L. Escritorio

Priorizarlo para escritores si editan textos largos fuera del móvil:

- atajos de teclado;
- importación/exportación;
- editor optimizado;
- ventanas y menús propios;
- firma y distribución;
- pruebas por sistema operativo.

### Etapa M. Escalabilidad

Solo cuando las métricas lo justifiquen:

- CDN y caché avanzada.
- Réplicas de lectura.
- Partición de eventos.
- Data warehouse.
- Búsqueda especializada.
- Colas administradas.
- Extracción de media/analytics/notifications.
- Multi-región y disaster recovery avanzado.

---

## 5. Próximo incremento recomendado

El siguiente bloque debe ser pequeño y vertical:

1. Completar la instalación de dependencias Flutter.
2. Reemplazar la pantalla de contador por la navegación base.
3. Implementar modelos de obra y capítulo.
4. Crear cliente Dio con fallback explícito.
5. Crear exploración, detalle y lector.
6. Añadir pruebas de widgets para estados de carga, error y contenido.
7. Ejecutar la API en local.
8. Verificar Flutter Web contra la API real.
9. Corregir CORS y URL de desarrollo según el navegador.
10. Registrar screenshots y defectos del primer flujo.

### Comandos de verificación actuales

```powershell
pnpm install
pnpm build:api
pnpm test:api
pnpm lint:api
docker compose config --quiet
```

### Comandos previstos para el siguiente incremento

```powershell
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000
```

---

## 6. Puertas de calidad

No avanzar de fase si existe alguno de estos bloqueos:

- pérdida de borradores;
- acceso horizontal a datos ajenos;
- refresh token reutilizable sin detección;
- migración no restaurable;
- contenido publicado que no puede retirarse;
- métricas evidentemente infladas;
- logs con secretos o contenido privado;
- fallos de lector en un dispositivo objetivo;
- ausencia de backup restaurable;
- moderación sin capacidad de responder a reportes urgentes.

La fecha de entrega es secundaria frente a estos bloqueos porque afectan directamente la confianza de lectores y escritores.

---

## 7. Estado resumido

| Área | Estado | Siguiente acción |
|---|---|---|
| Documentación | Completa | Mantener ADRs actualizados |
| Workspace Node | Funcional | Añadir CI |
| API | Funcional con fixtures | Conectar Prisma/PostgreSQL |
| Prisma | Esquema generado | Crear migración y seed real |
| Docker | Configuración válida | Levantar y probar servicios |
| Flutter | Scaffold generado | Instalar dependencias y crear UI |
| Auth | No iniciado | Diseñar sesiones y endpoints |
| Publicación | No iniciado | Implementar obras/capítulos |
| Lectura | Prototipo backend | Construir cliente Flutter |
| Progreso | No iniciado | Persistencia local + API |
| Analítica | No iniciado | Eventos y agregados |
| Moderación | No iniciado | Reportes y auditoría |
| Monetización | Diferida | Validar enlaces externos primero |

---

## 8. Definición de éxito del MVP

ReadInn puede considerarse listo para beta cerrada cuando:

- un lector se registra, encuentra una obra, la lee y continúa después;
- un escritor crea una obra, publica capítulos y no pierde borradores;
- biblioteca y follows funcionan de forma idempotente;
- el autor ve métricas básicas explicables;
- cualquier contenido público puede reportarse y retirarse;
- los backups se pueden restaurar;
- los errores críticos tienen alertas y runbooks;
- la aplicación funciona en Android y Web en la matriz objetivo;
- el equipo piloto puede completar el flujo sin asistencia manual constante.

El MVP no necesita pagos nativos, recomendaciones avanzadas, mensajería ni foros para validar estas hipótesis.
