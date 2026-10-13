# Dashboard de Centralización de Datos — Centraliza

Dashboard para **una sola agencia e-commerce** y sus clientes Shopify. Centraliza ventas, pruebas A/B y comportamiento con usuarios Super Admin, Admin y Cliente. Cada tienda es un tenant en PostgreSQL.

## Documentación completa

Consulta el [índice de documentación](docs/README.md) para arquitectura, funciones, componentes, API, esquema SQL, integraciones, seguridad, operación y el inventario de callbacks. Para empezar en tu equipo, sigue la [guía de pruebas locales](docs/pruebas-locales.md), con el recorrido por roles y las 28 pruebas automáticas.

## Abrir en local

Necesitas **Node.js 24 LTS** (mínimo 22.12), **Docker Desktop** con Docker Compose y Git. Inicia Docker Desktop antes de ejecutar los comandos. También puedes descargar el ZIP desde el botón **Code → Download ZIP** de GitHub y abrir una terminal en la carpeta descomprimida.

```bash
git clone https://github.com/YisusGael2/DASHBOARD-A-B-CONVERSION.git
cd DASHBOARD-A-B-CONVERSION
npm run local:up
```

El comando genera `.env` con claves aleatorias, construye la aplicación, arranca PostgreSQL, aplica las migraciones y carga la demostración. La primera construcción puede tardar unos minutos.

Abre en tu navegador local:

```text
http://localhost:8080
```

Las claves generadas y `.env` no se suben a Git. El comando conserva un `.env` existente.

## Cuentas de demostración

Contraseña de las cuatro cuentas: **`Demo1234!`**. Solo se crean cuando `DEMO_MODE=true`; nunca utilices estas cuentas en un despliegue público.

| Email | Rol | Acceso |
| --- | --- | --- |
| `super@demo.local` | Super Admin | Todas las tiendas y gestión de empleados |
| `admin@demo.local` | Admin | Todas las tiendas y gestión de clientes |
| `cliente@demo.local` | Cliente | Solo su tienda |
| `otro@demo.local` | Cliente | La segunda tienda |

Los datos de ejemplo están identificados como **demostración**. Las conexiones de ejemplo no realizan peticiones a cuentas externas ni representan datos reales.

## Qué puedes probar

- Iniciar sesión y cerrar sesión con cada rol.
- Consultar ventas, pedidos, sesiones, experimentos y variantes de ejemplo.
- Cambiar de tienda como empleado; acceder solo a la tienda propia como cliente.
- Crear tiendas y usuarios con los permisos correspondientes.
- Configurar las credenciales de cada integración sin devolverlas al navegador.
- Comprobar las restricciones de acceso del backend y de PostgreSQL.

## Integraciones reales y límites

La demostración funciona sin claves de Shopify, Clarity ni Intelligems. Para datos reales necesitas autorizaciones de cada tienda y acceso al proveedor correspondiente.

- **Shopify:** adaptador de lectura de pedidos mediante GraphQL Admin API. Requiere dominio canónico `*.myshopify.com` y un access token válido con acceso a pedidos. El token se introduce desde la sección Integraciones. La instalación OAuth completa y la actualización programada quedan fuera de este MVP. Las ventas de pedidos no proporcionan por sí solas sesiones ni conversión.
- **Clarity:** adaptador de Data Export API para las métricas admitidas por la respuesta del proveedor. Requiere autenticación y disponibilidad de la API en el proyecto. No importa grabaciones ni heatmaps, ni atribuye automáticamente sesiones a variantes A/B.
- **Intelligems:** los experimentos funcionan con datos de demostración. La sincronización real está pendiente de verificar el endpoint y el acceso de tu cuenta; el backend responde explícitamente que esa capacidad aún no está implementada.

Los adaptadores de Shopify y Clarity tienen pruebas con respuestas simuladas. No están validados contra tus cuentas ni contra una API externa en este entorno. Los errores de autenticación, permisos o compatibilidad se muestran como errores de sincronización; no se sustituyen por datos de ejemplo. Revisa [la documentación de los adaptadores](server/providers/README.md) antes de usar datos reales.

No se mezclan datos demo y reales de una misma fuente. Una métrica no disponible se muestra sin valor. Los ingresos tienen una definición documentada en el adaptador y conservan su moneda. No se calcula un ganador A/B a partir de una simple diferencia observada.

## Desarrollo con Node.js

```bash
npm ci
npm run setup
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

La interfaz de desarrollo usa el puerto `5173` y hace proxy de `/api` al backend en `3001`. Para servir la versión compilada:

```bash
npm run build
NODE_ENV=production npm start
```

El backend sirve la interfaz compilada y la API en el puerto `3001` cuando `NODE_ENV=production`. En PowerShell usa `$env:NODE_ENV = "production"` y después `npm start`; consulta [Operación](docs/operacion.md). Sin ese modo, `npm start` sirve la API y la interfaz de desarrollo se abre por Vite.

## Pruebas

Con PostgreSQL migrado y los datos demo cargados:

```bash
npm test
npm run build
```

Las pruebas de integración ejercitan autenticación, acceso cruzado entre tiendas, RLS, conexiones reutilizadas, permisos de escritura y elevación de roles. Las pruebas de proveedores usan respuestas controladas y no necesitan credenciales externas.

Para las pruebas de navegador, con la aplicación Docker arrancada en `8080`:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

## Detener, diagnosticar y conservar datos

```bash
npm run local:down
docker compose logs app bootstrap
docker compose ps
```

`local:down` conserva la base de datos. Para volver a arrancar, usa `npm run local:up`.

Si el puerto `8080` o `5432` está ocupado, cambia `APP_PORT` o `DB_PORT` en `.env`. Al cambiar `DB_PORT`, actualiza también el puerto en `DATABASE_URL` y `DATABASE_ADMIN_URL` para el desarrollo con Node. La configuración dentro de Docker usa siempre el puerto interno `5432`.

No regeneres las contraseñas de `.env` mientras conservas el volumen existente: PostgreSQL mantiene la contraseña inicial. Hacer `docker compose down -v` elimina todos los datos locales; úsalo solamente si deseas empezar desde cero.

## Arquitectura y seguridad

- React + Vite; Node.js + Express; PostgreSQL 17.
- UUID, restricciones de roles y claves foráneas para preservar la pertenencia a tiendas.
- JWT firmado y con expiración; permisos consultados en el servidor; contraseñas Argon2id.
- RLS forzado, rol de ejecución sin `SUPERUSER` ni `BYPASSRLS` y contexto local a cada transacción.
- Credenciales cifradas con AES-256-GCM y clave fuera de PostgreSQL.
- El contenedor de la aplicación recibe credenciales limitadas; el contenedor de migración recibe las de administración.

Consulta [el esquema SQL](db/schema.sql) y [las instrucciones para colaboradores](AGENTS.md).

## Antes de un despliegue público

Este repositorio entrega un MVP para desarrollo local, no un servicio de producción terminado. Usa una base nueva con `DEMO_MODE=false`, crea tu primer Super Admin mediante el script de bootstrap y define claves propias. Añade HTTPS, almacenamiento seguro de secretos, copias de seguridad, recuperación de contraseñas, gestión de sesiones y el flujo OAuth de Shopify antes de atender clientes reales. No publiques los puertos locales directamente en Internet.

Para iniciar una base nueva sin demostración, establece `DEMO_MODE=false` y añade `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` (mínimo 12 caracteres) en tu `.env` local. Después de `npm run local:up`, ejecuta:

```bash
docker compose run --rm bootstrap npm run db:bootstrap
```

El bootstrap se niega a sobrescribir un Super Admin existente. Elimina las variables `ADMIN_*` de `.env` después de crear la cuenta. Para desarrollo con Node y dependencias instaladas, el comando equivalente es `npm run db:bootstrap`.
