# ReadInn

Plataforma de lectura y publicación independiente. La implementación sigue la guía técnica de [GUIA_DE_IMPLEMENTACION_READINN.md](./GUIA_DE_IMPLEMENTACION_READINN.md).

## Workspace

- `apps/api`: API Fastify + TypeScript.
- `apps/mobile`: Flutter Android/Web.
- `apps/web`: Next.js para lectura y estudio de autor de escritorio.
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

Para ejecutar la web con la API local, crea `apps/web/.env.local` a partir de
`.env.example` y usa:

```powershell
pnpm --filter @readinn/web dev -- -p 3001
```

La web queda en `http://localhost:3001`. El estudio incluye borradores, autosave,
publicacion, historial de versiones, importacion/exportacion DOCX y Markdown,
imagenes dentro de capitulos y archivado/restauracion de obras.

Antes de desplegar la API, aplica las migraciones de Prisma y configura un
`JWT_SECRET` aleatorio de al menos 32 caracteres.

Para ejecutar Flutter:

```powershell
cd apps/mobile
flutter run -d chrome
```

La app usa `http://localhost:3000` en desarrollo Web. En un dispositivo físico se debe configurar la URL con la dirección accesible del equipo.

## Estado actual

El primer incremento vertical incluye health checks, catálogo fixture, pantalla de exploración, detalle de obra y lector personalizable. PostgreSQL y autenticación se integran en el siguiente incremento.


web :

• Sí: súbela al mismo VPS y crea un subdominio. La opción más clara sería readinn.cypher.cl para la web, manteniendo
  api.cypher.cl para la API. No necesitas comprar otro dominio.

  El acceso quedaría así:

  - https://readinn.cypher.cl → inicio de ReadInn.
  - https://readinn.cypher.cl/login → entrar o registrarse.
  - https://readinn.cypher.cl/studio → estudio de autor y edición.
  - https://api.cypher.cl → API; no es la página que usarán los lectores.

  La web ya está preparada para comunicarse con la API mediante un proxy del servidor Next, así que el navegador usa /
  api/readinn y las cookies HttpOnly siguen en el mismo dominio de la web. Eso es preferible a conectar el navegador
  directamente a la API.

  1. DNS

  En el proveedor DNS de cypher.cl, crea:

  Tipo: A
  Nombre: readinn
  Valor: 159.112.141.10
  TTL: 300

  Conserva el registro actual de api.cypher.cl.

  2. Variables de producción

  En el VPS, dentro de apps/api/.env:

  NODE_ENV=production
  HOST=0.0.0.0
  PORT=3000
  DATABASE_URL=postgresql://...
  APP_WEB_URL=https://readinn.cypher.cl
  JWT_SECRET=<una-cadena-aleatoria-de-al-menos-32-caracteres>
  LOG_LEVEL=info

  En apps/web/.env.production:

  READINN_API_URL=https://api.cypher.cl
  NEXT_PUBLIC_READINN_API_URL=/api/readinn

  No subas esos archivos al repositorio si contienen contraseñas.

  3. Construcción y procesos

  Ejemplo suponiendo que el proyecto queda en /var/www/readinn:

  cd /var/www/readinn
  pnpm install --frozen-lockfile
  pnpm --filter @readinn/api exec prisma generate
  pnpm --filter @readinn/api exec prisma migrate deploy
  pnpm build:api
  pnpm build:web

  Mantén dos procesos Node:

  pnpm --filter @readinn/api start       # API en 127.0.0.1:3000
  pnpm --filter @readinn/web start -- -p 3001  # web en 127.0.0.1:3001

  Lo normal es administrarlos con PM2 o systemd para que se reinicien si el VPS se reinicia. Con PM2, por ejemplo:

  pm2 start "pnpm --filter @readinn/api start" --name readinn-api
  pm2 start "pnpm --filter @readinn/web start -- -p 3001" --name readinn-web
  pm2 save
  pm2 startup

  Ejecuta pm2 startup con el comando exacto que te muestre la terminal.

  4. Nginx

  Crea /etc/nginx/sites-available/readinn:

  server {
      listen 80;
      server_name readinn.cypher.cl;

      location / {
          proxy_pass http://127.0.0.1:3001;
          proxy_http_version 1.1;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
      }
  }

  Actívalo y solicita HTTPS:

  sudo ln -s /etc/nginx/sites-available/readinn /etc/nginx/sites-enabled/readinn
  sudo systemctl reload nginx
  sudo certbot --nginx -d readinn.cypher.cl

  Si api.cypher.cl ya tiene su propio bloque Nginx y certificado, déjalo separado. No conviene mezclar la web y la API
  en el mismo server block.

  5. Orden recomendado de actualización

  Primero despliega la API nueva y aplica la migración Prisma. Comprueba:

  curl https://api.cypher.cl/health/live
  curl https://api.cypher.cl/health/ready

  Después construye y reinicia la web. Finalmente abre https://readinn.cypher.cl, crea una cuenta de prueba y entra a
  /studio.

  La publicación de una obra desde la web se hace entrando a /studio, abriendo una obra y pulsando Publicar obra. Una
  obra creada desde el móvil se publica directamente al crearla en la versión corregida del APK.

  Para que esto quede accesible públicamente todavía faltan acciones en el VPS: crear el registro DNS, copiar/desplegar
  el código, configurar variables, levantar los dos procesos y añadir Nginx/HTTPS. No las ejecuté porque requieren
  acceso y credenciales del servidor.
