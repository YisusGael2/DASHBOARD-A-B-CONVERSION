# Operación, instalación y configuración

Todos los comandos se ejecutan en la raíz `DASHBOARD-A-B-CONVERSION`, salvo indicación. Requisitos: Node 24 LTS recomendado (mínimo 22.12), npm, Docker con Compose y Git para actualizar el checkout. Docker Desktop debe estar iniciado.

## Comandos del workspace raíz

| Comando | Implementación | Resultado |
| --- | --- | --- |
| `npm run setup` | node scripts/setup.mjs | Crea .env si falta, sin sobrescribirlo |
| `npm run local:up` | node scripts/local-up.mjs | Setup, imagen compilada y Compose en background |
| `npm run local:down` | docker compose down | Detiene/elimina contenedores y red; conserva volumen |
| `npm run dev` | concurrently --kill-others, scripts dev de server/client | Express 3001 con watch y Vite 5173 |
| `npm run build` | npm run build --workspace client | Genera client/dist; no arranca servicios ni modifica DB |
| `npm start` | npm start --workspace server | Arranca API; sirve interfaz solo con NODE_ENV=production |
| `npm run db:migrate` | server/scripts/migrate.js | Instala rol, esquema y políticas |
| `npm run db:seed` | server/scripts/seed.js | Demo si habilitada; de otro modo termina sin crear muestras |
| `npm run db:bootstrap` | server/scripts/bootstrap.js | Primer Super Admin sin demo |
| `npm test` | node --test test/*.test.js providers/*.test.js en server | 10 casos de integración y 12 de adaptadores |
| `npm run test:e2e` | playwright test | 8 flujos de navegador |

En el workspace cliente existen además `dev`, `build` y `preview`; preview sirve únicamente el compilado y no configura el proxy API de desarrollo. No es el comando principal para probar el producto completo. Los comandos del workspace servidor son dev/start/db:migrate/db:seed/db:bootstrap/test.

## Variables: todas las utilizadas por el proyecto

No hay valores reales en esta referencia. Los ejemplos de `.env.example` son placeholders y deben sustituirse mediante setup o configuración segura.

| Variable | Consumidores | Significado / origen |
| --- | --- | --- |
| `DEMO_MODE` | config, seed, bootstrap, Compose, Playwright | Solo `true` activa demo; setup genera true; controla muestras nuevas, UI y selección de fuentes, no elimina cuentas demo existentes |
| `PORT` | config/index, Playwright | Puerto Express, default 3001; dentro de Docker siempre 3001 |
| `APP_PORT` | Compose | Puerto publicado del app, default 8080; enlazado a 127.0.0.1 |
| `DB_PORT` | Compose | Puerto PostgreSQL publicado, default 5432; interno siempre 5432 |
| `POSTGRES_PASSWORD` | db y bootstrap Compose | Contraseña administrativa local; setup genera 24 bytes hex |
| `APP_DB_PASSWORD` | app/bootstrap Compose | Contraseña de dashboard_app; setup genera otra distinta |
| `DATABASE_ADMIN_URL` | config, migrate, seed, bootstrap, pruebas | Conexión privilegiada. Local Node apunta 127.0.0.1; bootstrap Docker la construye con host db. App Docker no la recibe |
| `DATABASE_URL` | config/pool, migrate, pruebas, Compose | Conexión de ejecución dashboard_app. Migrador extrae nombre/password de esta URL |
| `JWT_SECRET` | config, auth, pruebas | Firma JWT; setup genera 48 bytes en hex; mínimo válido 32 bytes de texto |
| `CREDENTIAL_ENCRYPTION_KEY` | config, security, Compose | Clave AES de 32 bytes, hex de 64 caracteres o base64; setup genera hex |
| `SHOPIFY_API_VERSION` | adaptador, app Compose | Versión YYYY-MM, default 2026-07; formato no acredita disponibilidad externa |
| `ADMIN_EMAIL` | bootstrap y su contenedor | Correo del primer Super Admin sin demo |
| `ADMIN_NAME` | bootstrap y su contenedor | Nombre de esa cuenta |
| `ADMIN_PASSWORD` | bootstrap y su contenedor | Contraseña inicial de mínimo 12 caracteres; retirar después |
| `NODE_ENV` | app.js, Dockerfile/Compose/Playwright | Si es exactamente production, Express sirve client/dist |
| `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, `https_proxy` | local-up / Docker build | Proxy de instalación heredado del proceso; no se guarda su valor en fuente |
| `NO_PROXY`, `no_proxy` | construcción Docker | local-up los deja vacíos para solicitudes de instalación cuando existe proxy; no cambia el runtime local |
| `NODE_EXTRA_CA_CERTS` | local-up y herramientas Node | Archivo público de CA adicional; se monta como secreto BuildKit solo en instalación |
| `DOCKER_CONFIG` | Docker CLI | Directorio de configuración/cache del cliente Docker; útil si HOME no es escribible en la nube; no generado por setup |
| `PLAYWRIGHT_EXECUTABLE_PATH` | playwright.config.js | Ruta opcional a navegador ya instalado; sustituye el navegador descargado |
| `E2E_BASE_URL` | playwright.config.js | Base de peticiones de navegador; default 127.0.0.1:8080. No cambia health/puerto de webServer, que permanecen 8080 |
| `CI` | playwright.config.js | Activa un reintento y desactiva reutilización de servidor existente |

Issuer y audience JWT son constantes del código, no variables configurables. `POSTGRES_DB=centraliza` y `POSTGRES_USER=postgres` se definen en Compose, no se leen de `.env` por el backend.

## Scripts: cómo funcionan

### `scripts/setup.mjs` — ejecución de nivel superior

No declara función propia. Resuelve `.env` relativa al script y llama `access`. Si existe, termina conservándolo. Solo ante ENOENT genera claves con crypto.randomBytes; otros errores se propagan.

Escribe .env con flag `wx` (creación exclusiva) y modo 0600 en sistemas que respetan permisos POSIX. Genera DEMO_MODE, puertos, dos passwords, ambas URLs, JWT, clave AES y versión Shopify. No imprime valores. Se conecta al filesystem, no a PostgreSQL ni a un proveedor.

Crear .env no crea una base ni actualiza una contraseña de un volumen existente. `.env` está excluido de Git y de Docker build.

### `scripts/local-up.mjs` y `run(args)`

Importa setup antes de construir. Determina cwd raíz por import.meta.url y crea argumentos Docker mediante arrays, sin shell.

`run(args)` llama `spawnSync('docker', args, {cwd,env:process.env,stdio:'inherit'})`. Error al iniciar Docker muestra diagnóstico; código no cero se conserva como salida del script. Así, un build o bootstrap fallido no se presenta como éxito.

Si hay proxy, pasa nombres de sus build args, no valores interpolados. Resuelve sus hostnames en el host con dns.lookup IPv4 y usa add-host para BuildKit; si lookup falla mantiene fallback del resolver Docker. Vacía las exclusiones de proxy para instalar dependencias públicas del lockfile.

Si existe NODE_EXTRA_CA_CERTS, exige archivo accesible y lo monta como secreto build_ca. Dockerfile usa esa CA para npm sin desactivar TLS. No copia CA/proxy a la imagen de runtime.

Finalmente construye `centraliza-local:latest` y ejecuta `docker compose up -d --no-build`. Los callbacks `.map/.filter` construyen la lista de hostnames de proxies; no consultan proveedores ni credenciales de tiendas.

### `server/scripts/migrate.js` — ejecución de nivel superior

Exige ambas URLs. Parsea DATABASE_URL y exige usuario dashboard_app con contraseña. Conecta por URL administrativa y verifica que sea superusuario. Crea o altera el rol con LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOBYPASSRLS y password de la URL limitada.

PostgreSQL no acepta parámetro de password en ese DDL; escapa comillas del literal SQL antes de usarlo. No lo imprime. Lee schema.sql y lo ejecuta, luego cierra client en finally. El rol es global al cluster: usa el cluster local dedicado a este proyecto.

Repetir script restaura configuración actual de rol/policies. No es una migración incremental versionada que adapte automáticamente cualquier esquema antiguo.

### `server/scripts/seed.js` — ejecución de nivel superior

Si demo no está activa imprime “Demo omitida” y sale 0. En demo exige URL administrativa, conecta e inicia transacción. Inserta dos tiendas y cuatro cuentas; Argon2id produce hashes de contraseña demo. Cuentas con correo existente se conservan, no se resetea su password/status.

Inserta tres conexiones demo por tienda sin reemplazar integraciones existentes. Genera 28 días de ventas/Clarity sintéticos y hace upserts de filas source=demo. Genera dos experimentos y dos variantes por experimento; reemplaza snapshots demo de métricas de variante para no duplicar visitantes acumulados al repetir otro día. No elimina filas de fuente real.

Confirma o revierte y cierra. Fechas diarias se generan con UTC; el dashboard selecciona fechas en zona de tienda, por lo que cerca de un cambio de día puede diferir una fecha. Activar DEMO_MODE=false posteriormente no borra las muestras ni desactiva cuentas que ya existían.

### `server/scripts/bootstrap.js` — ejecución de nivel superior

Exige DEMO_MODE=false, URL administrativa y ADMIN_* válidos. Dentro de transacción verifica si ya hay cualquier SUPER_ADMIN; si existe se niega a sobrescribir. Hashea password con Argon2id e inserta una cuenta sin store_id; confirma o revierte y cierra.

No es una recuperación de contraseña ni una invitación. En Docker se ejecuta explícitamente con `docker compose run --rm bootstrap npm run db:bootstrap`; Compose transmite ADMIN_* solo al contenedor de instalación.

## Docker: archivos, puertos y permisos

La imagen usa node:24-bookworm-slim; copia primero manifiestos/lock para reutilizar cache de dependencias, ejecuta npm ci, copia fuentes con propietario node y compila Vite. Ejecuta finalmente npm start como node; no necesita ejecutar el servidor como root. Incluye dependencias de desarrollo en esta versión del Dockerfile, aunque la UI servida esté compilada.

| Servicio | Datos/credenciales | Condición de inicio | Estado esperado |
| --- | --- | --- | --- |
| db | PostgreSQL 17, usuario postgres, volumen postgres_data | Ninguna | running/healthy |
| bootstrap | URLs administrativa/limitada; claves; ADMIN_* opcionales | db healthy | exited 0 tras migrate/seed |
| app | Solo URL limitada, JWT/AES, demo, versión Shopify | bootstrap completed successfully | running/healthy |

La comprobación db es pg_isready cada 3s, timeout3s, 20 intentos. La de app hace fetch a /api/health interno cada 10s, timeout3s, 10 intentos. Healthcheck no cubre OAuth, proveedores ni todos los endpoints.

Las URLs del contenedor usan host `db`; las de Node en el host usan 127.0.0.1. Cambiar DB_PORT en .env exige actualizar el puerto de ambas URLs del host; no el puerto interno de Compose. Cambiar APP_PORT no altera PORT interno del app.

## Desarrollo y compilado fuera de Docker

```bash
npm ci
npm run setup
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Abre `http://localhost:5173`. Cambios de UI se recargan con Vite; server usa node --watch. Vite usa strictPort: si 5173 está ocupado no selecciona otro silenciosamente. Su proxy espera backend en 3001; cambiar PORT requiere actualizar también vite.config.js.

Para servir compilado con Node, después de `npm run build`, establece NODE_ENV=production:

PowerShell:

```powershell
$env:NODE_ENV = "production"
npm start
```

Bash/zsh:

```bash
NODE_ENV=production npm start
```

Abre `http://localhost:3001` si PORT es 3001. `npm start` sin ese modo sirve API, pero no index.html. Los puertos 5173 y 3001 escuchan 0.0.0.0 en desarrollo; su exposición real depende de red/firewall del equipo.

## CI: pasos y alcance

GitHub Actions se dispara en push y pull_request con permiso contents:read. Usa Ubuntu, PostgreSQL 17 con credenciales efímeras, Node 24 y cache npm.

Orden: checkout → setup-node → npm ci → setup → migrate → seed → npm test → build → instalar Chromium con dependencias → test:e2e. Variables del job de DB tienen prioridad frente a URLs escritas por setup en .env. Playwright CI arranca su propio servidor en 8080 y puede reintentar una vez.

La existencia del workflow no demuestra que un run remoto haya pasado. Consulta el resultado en la pestaña Actions de GitHub. No se hace despliegue, push ni publicación desde ese workflow.

## Datos persistentes y respaldo

`local:down` conserva volumen. `local:up` puede volver a sembrar filas demo, pero conserva usuarios existentes y conexiones reales. No regeneres .env al conservar la DB: password de postgres persistido, URL runtime, clave AES y JWT deben corresponder.

Para backup local multiplataforma, sin redirección binaria de PowerShell:

```bash
node -e "require('node:fs').mkdirSync('.local/backups',{recursive:true})"
docker compose exec -T db pg_dump -U postgres -d centraliza -Fc -f /tmp/centraliza-backup.dump
docker compose cp db:/tmp/centraliza-backup.dump .local/backups/centraliza-backup.dump
```

El archivo contiene datos sensibles, hashes y ciphertext; `.local/` está ignorado. Usa nombres distintos para conservar versiones. Guarda la clave AES original de forma segura por separado: DB sin esa clave no permite recuperar tokens cifrados. Un dump de una DB no incluye los roles globales del cluster.

Restaura con pg_restore en **una base de destino vacía y separada**, prepara dashboard_app y reaplica instalación/permisos cuando corresponda; después valida login, RLS y descifrado. No ejecutes un reset ni una restauración sobre la única copia de tus datos para probar esta documentación.

## Diagnóstico

| Síntoma | Comprobación / corrección |
| --- | --- |
| docker no encontrado o daemon sin conexión | docker --version, docker compose version; inicia Docker Desktop |
| bootstrap exited distinto de 0 | docker compose logs bootstrap; revisa URL, password, esquema y permisos |
| app sin salud | docker compose logs app; consulta /api/health y la DB |
| puerto ocupado | docker compose ps; usa APP_PORT/DB_PORT y actualiza URLs host si corresponde |
| login demo rechazado | Comprueba DEMO_MODE=true y seed; usuarios existentes conservan password/status anteriores |
| Docker password authentication failed | La contraseña del volumen es la inicial; conserva/restaura configuración correspondiente, no regeneres claves a ciegas |
| inicio vacío con Node | Para compilado necesitas build y NODE_ENV=production; para desarrollo abre Vite |
| fuentes no cargan | Google Fonts es opcional; sans-serif mantiene interfaz funcional |
| Playwright no tiene navegador | npx playwright install chromium, o configura navegador instalado |
| muestras desaparecen al guardar credencial | Es el cambio a fuente live de toda la tienda, documentado; otra tienda demo permanece intacta |
| Intelligems 501 | Funcionalidad real pendiente, no es un problema de contraseña |
| Docker build TLS/proxy | Usa el proxy/CA legítimos del entorno; local-up preserva verificación TLS y resolución de proxy |

`docker compose down -v` elimina el volumen y sus datos. No forma parte de la instalación normal, diagnóstico ni actualización recomendada.
