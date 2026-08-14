# ReadInn

Plataforma de lectura y publicación independiente. La implementación sigue la guía técnica de [GUIA_DE_IMPLEMENTACION_READINN.md](./GUIA_DE_IMPLEMENTACION_READINN.md).

## Workspace

- `apps/api`: API Fastify + TypeScript.
- `apps/mobile`: Flutter Android/Web.
- `infra`: infraestructura local y futura.
- `docs`: ADRs, contratos y runbooks.

## Primer arranque

Requisitos: Node 22+, pnpm 11+, Flutter estable y Docker Desktop para los servicios locales.

```powershell
pnpm install
docker compose up -d postgres minio mailpit
pnpm dev:api
```

La API queda en `http://localhost:3000`. Health check: `http://localhost:3000/health/live`.

Para ejecutar Flutter:

```powershell
cd apps/mobile
flutter run -d chrome
```

La app usa `http://localhost:3000` en desarrollo Web. En un dispositivo físico se debe configurar la URL con la dirección accesible del equipo.

## Estado actual

El primer incremento vertical incluye health checks, catálogo fixture, pantalla de exploración, detalle de obra y lector personalizable. PostgreSQL y autenticación se integran en el siguiente incremento.
