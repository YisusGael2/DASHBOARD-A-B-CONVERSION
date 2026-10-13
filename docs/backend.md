# Backend: funciones y conexiones

Código principal: [server/src](../server/src). Todas las consultas reciben parámetros; el contexto de autorización proviene del usuario obtenido del servidor.

## `server/src/config.js`

Al importar el módulo, `dotenv.config` lee `.env` en la raíz mediante una ruta basada en `import.meta.url`. No depende del directorio desde el que se ejecutó Node. Las variables ya inyectadas en el proceso tienen prioridad porque dotenv no usa `override`.

`config` contiene `databaseUrl`, `databaseAdminUrl`, `jwtSecret`, `encryptionKey`, `demoMode`, `port`, `issuer` y `audience`. Solo la cadena exacta `true` activa demo. El issuer es `dashboard-centralizacion`; audience es `dashboard-client`.

| Función | Entrada y salida | Cómo funciona | Conectada con |
| --- | --- | --- | --- |
| `validateConfig()` | Sin parámetros; retorna `undefined` o lanza `Error` | Exige URL limitada, JWT de al menos 32 bytes, clave de cifrado decodificada de 32 bytes y puerto entero entre 1 y 65535. No comprueba conectividad ni calidad estadística de claves elegidas manualmente | `index.js`, preparación de pruebas, `credentialKey` |
| `credentialKey()` | Sin parámetros; retorna `Buffer` | Si la clave es hexadecimal de 64 caracteres, decodifica hex; en otro caso decodifica base64. La longitud se valida en `validateConfig` | Cifrado/descifrado en `security.js` |

## `server/src/db.js`

`pool` es un `pg.Pool` con `DATABASE_URL`, máximo 10 conexiones, 5 segundos de espera al conectar y 10 segundos de inactividad. El callback `pool.on('error', ...)` informa una pérdida de conexión inactiva sin imprimir parámetros ni secretos.

### `withContext(user, operation)`

- **Entrada:** usuario interno con `id`, `role`, `store_id`; callback `operation(client)` que devuelve un valor o una promesa.
- **Salida:** `Promise` con el resultado del callback.
- **Algoritmo:** reserva una conexión; ejecuta `BEGIN`; usa `set_config` parametrizado para `app.user_id`, `app.role`, `app.store_id` con tercer argumento `true`; ejecuta el callback en esa conexión; confirma con `COMMIT`.
- **Error:** intenta `ROLLBACK`, conserva el error original y lo lanza. En `finally` libera la conexión. La prueba de pooling comprueba que otra petición no herede el contexto después de rollback.
- **Conexiones:** todos los handlers con datos de tenant en `app.js`; funciones y políticas RLS del esquema. `login` y `authenticate` hacen el lookup autorizado mediante funciones SQL fijas, fuera de este contexto inicial.
- **Regla:** el callback debe usar `client.query`, no `pool.query`; una consulta en otra conexión no comparte la transacción ni sus variables locales.

## `server/src/auth.js`

### `login(req, res)`

Lee `email` y `password` de un cuerpo JSON. Normaliza email a minúsculas y sin espacios externos, limita correo a 320 y contraseña a 1024 caracteres, y exige ambos. Llama `auth_lookup(email)`. Genera y conserva un `dummyHash` Argon2id para verificar también contraseñas cuando el correo no existe, reduciendo diferencias obvias de trabajo entre cuentas existentes y ausentes.

Verifica el hash mediante `argon2.verify`. Cuenta ausente, deshabilitada o contraseña incorrecta generan el mismo `401`. Firma un JWT HS256 con `sub = user.id`, issuer/audience establecidos y expiración de **8 horas**; no incorpora el rol como fuente de autorización. Responde `{token, user: publicUser(user)}`.

Conectada con `POST /api/auth/login`, `loginLimiter`, PostgreSQL, Argon2 y `publicUser`. El cuerpo debe ser un objeto JSON: la validación actual no cubre uniformemente un cuerpo ausente o `null`; esos casos pueden terminar en `500` y están registrados como límite en [Seguridad](seguridad.md).

### `authenticate(req, res, next)`

Exige el encabezado `Authorization: Bearer ...`. Ejecuta `jwt.verify` con algoritmos permitidos `['HS256']`, issuer y audience esperados. Comprueba `sub` y `exp`; la librería valida expiración y firma. Consulta `auth_user(sub::uuid)` y exige `status='active'`. Asigna el usuario SQL vigente a `req.user` y llama `next()`.

Ausencia de Bearer, verificación fallida o cuenta inactiva producen `401`. Un rol enviado en el JWT o en el cuerpo no sustituye el dato SQL. Los errores se transmiten mediante `next(error)` al handler central. Se instala para todas las rutas `/api` después de health y login.

### `requireStaff(req, res, next)`

Lee `req.user.role`. Permite `ADMIN` y `SUPER_ADMIN`; cualquier otro rol recibe `HttpError(403)`. Asume que `authenticate` ya se ejecutó. Está en lectura/creación de usuarios, creación de tiendas y configuración/sincronización de integraciones. No decide por sí solo si un Admin puede crear otro empleado: el handler de usuarios agrega esa regla.

### `loginLimiter`

Es middleware construido por `express-rate-limit`, no una función nombrada propia. Limita a 30 intentos por IP cada 15 minutos dentro del proceso, publica headers `draft-8` y responde `429` con JSON. No usa un almacén distribuido ni configuración explícita de `trust proxy`.

## `server/src/security.js`

| Función o clase | Entrada → salida | Mecanismo y errores | Conexiones |
| --- | --- | --- | --- |
| `encryptCredentials(value)` | Objeto JSON → string JSON cifrado | Obtiene clave de `credentialKey`; IV aleatorio de 12 bytes; AES-256-GCM. Devuelve `{v:1, iv, tag, data}` con campos binarios en base64. IV distinto por cifrado. No registra el objeto | Handler `connect`, función SQL `store_credential` |
| `decryptCredentials(value)` | Envelope string u objeto → objeto original | Parsea si es string, exige `v=1`, configura IV/tag, descifra y parsea JSON. JSON inválido, versión no compatible o autenticidad fallida lanzan error | Handler `sync`, función SQL `read_credential` |
| `HttpError.constructor(status, message)` | Código y mensaje → instancia `Error` | Conserva `status` para el middleware HTTP. No añade datos de DB ni credenciales | Validadores, auth y handlers; handler central |
| `uuid(value, label='Identificador')` | String → mismo string | Regex de formato hexadecimal `8-4-4-4-12`; no verifica existencia, versión ni normaliza mayúsculas. Error `400` con etiqueta | Identificadores de tiendas y `storeIdFor` |
| `textValue(value, label, max=200)` | String → string recortado | Exige tipo string, contenido tras `trim` y longitud original <= max. Error `400`. No es un sanitizador HTML ni una política completa de contraseñas | Creación de usuarios/tiendas y `connect` |
| `publicUser(user)` | Fila SQL → `{id,name,email,role,storeId,status}` | Selección explícita y cambio `store_id` → `storeId`; excluye hash | Login, `/auth/me`, usuarios |
| `publicStore(store)` | Fila SQL → `{id,name,domain,currency,timeZone,status}` | Traduce `timezone` → `timeZone`; excluye timestamps internos | Tiendas y dashboard |
| `publicIntegration(row)` | Fila SQL → `{id,provider,status,lastSyncedAt,externalAccountId}` | Traduce `last_synced_at` y `external_id`; no devuelve ciphertext, metadata ni `last_error` | Dashboard y `connect` |
| `storeIdFor(user, requested)` | Usuario + id opcional → id autorizado | CLIENT usa siempre su `store_id`; si recibió uno diferente, `403`. Un empleado debe enviar un UUID válido. Compara strings del cliente literalmente | `GET /api/dashboard`; después RLS y `requireStore` |

## `server/src/app.js`: helpers

| Función | Entrada → salida | Cómo lo hace y conexiones |
| --- | --- | --- |
| `asyncRoute(fn)` | Handler async → middleware `(req,res,next)` | Invoca `fn`, transforma su resultado en promesa y reenvía rechazo a `next`. La función retornada es un callback sin nombre. Se usa en handlers de IO |
| `numberOrNull(value)` | Dato pg → `null` o `Number` | Mantiene null/undefined como null; convierte strings numéricos de PostgreSQL. Usada para agregados, variantes y Clarity |
| `ratio(part, whole)` | Numerador/denominador → porcentaje o null | Si `whole>0`, calcula `part/whole*100` y redondea a dos decimales; de otro modo null. Usada en resumen y variantes |
| `delta(current, previous)` | Valores actuales/anteriores → cambio porcentual o null | Exige actual no null y anterior >0; calcula `(current-previous)/previous*100` a un decimal. No calcula variación con base cero |
| `providerName(value)` | Nombre → mismo nombre | Comprueba el Set exacto `shopify`, `clarity`, `intelligems`; ruta no acepta mayúsculas. Error `400` | `connect`, `sync` |
| `requireStore(client, id)` | Conexión con contexto + UUID → fila de tienda | `SELECT * ... WHERE id=$1`; RLS se aplica; ausencia genera `404` | Dashboard, alta de cliente e integraciones |
| `storeDate(timeZone)` | Zona IANA → `YYYY-MM-DD` actual | `Intl.DateTimeFormat` y `formatToParts`; helper local `storeDate.value(type)` busca año/mes/día mediante un callback `.find` | Ventana temporal del dashboard |
| `createApp.aggregate(items)` | Filas diarias → `{revenue,orders,sessions,conversion}` | Lista vacía produce nulls. Suma ingresos/pedidos; sesiones solo si todas las filas tienen dato. Redondea ingreso a dos decimales y usa `ratio`. Es función local del handler dashboard | Dos períodos de 14 días; no llama APIs externas |

### `createApp()`

Devuelve la instancia Express sin abrir puerto. Deshabilita `x-powered-by`, instala Helmet y JSON con máximo 16 KB, registra health/login, luego autentica `/api`, registra handlers, agrega el `404` API y sirve archivos compilados solo cuando `NODE_ENV='production'`. Finalmente instala el handler central de errores.

No crea las tablas ni inicializa usuarios: esas tareas pertenecen a scripts de instalación. Se conecta con todos los módulos anteriores y con `syncProvider`.

### Handlers registrados dentro de `createApp`

Los callbacks HTTP no tienen un nombre de función en el código; se identifican por método y ruta. Sus cuerpos, entradas, respuestas y permisos se detallan en [Contrato HTTP](api.md).

| Etiqueta del handler | Proceso interno y dependencias |
| --- | --- |
| `GET /api/health` | `pool.query('SELECT 1')`; responde salud DB y flag demo. No verifica proveedores ni login |
| `GET /api/auth/me` | Serializa `req.user` obtenido por `authenticate` con `publicUser` |
| `GET /api/stores` | `withContext` → SELECT tiendas ordenadas por nombre → `.map(publicStore)` |
| `GET /api/dashboard` | `storeIdFor` → `withContext` → `requireStore` → consultas y agregados → DTO compuesto |
| `GET /api/users` | `requireStaff` → `withContext` → columnas públicas; ADMIN solo CLIENT, SUPER_ADMIN todos; máximo 500 |
| `POST /api/users` | Valida y decide rol → hash Argon2id fuera de transacción → `withContext` → valida tienda si cliente → INSERT usuario + auditoría → `publicUser` |
| `POST /api/stores` | Valida nombre/dominio/moneda/timeZone → INSERT dentro de `withContext` → `publicStore` |
| `POST /api/integrations/:provider/connect` | Valida proveedor y pertenencia → cifra → upsert metadata + `store_credential` + evento de auditoría → `publicIntegration` |
| `POST /api/integrations/:provider/sync` | Transacción de preparación → descifrado → HTTPS fuera del pool → transacción de persistencia o registro de fallo |
| `404 de /api` | Devuelve JSON para rutas API no registradas, después de autenticar |
| `Fallback SPA /{*path}` | En producción envía `client/dist/index.html` para rutas fuera de `/api` |
| `Handler central de errores` | Respeta headers ya enviados; traduce errores HTTP/pg; no envía stack ni consulta SQL |

### Construcción del dashboard

1. Lee las integraciones de la tienda. Si alguna tiene `credential_saved`, `connected` o `error`, o el proceso no está en demo, el dashboard entra en `live`. En otro caso utiliza `demo`.
2. Selecciona fuente de ventas y experimentos según el modo. Las muestras siguen en DB, pero se ocultan en **toda esa tienda** después de guardar una credencial real.
3. Obtiene la fecha actual de la zona horaria de la tienda. Consulta 28 días de ventas con la moneda de la tienda; separa últimos 14 días y los 14 anteriores. No rellena días ausentes en el handler.
4. Usa `aggregate` y `delta`. El cálculo de conversión usa pedidos/sesiones disponibles; Shopify real entrega sesiones null, por lo que no genera una conversión real inventada.
5. Obtiene experimentos de la fuente elegida; suma métricas de sus variantes y lee `metadata.confidence`. No calcula significancia ni declara ganador.
6. En demo suma Clarity de 14 días. En live usa el último snapshot de Clarity, sin sumar ventanas solapadas, y comunica `windowDays`.
7. `updatedAt` es el máximo `last_synced_at` de las integraciones disponibles. No es el timestamp de modificación de todas las tablas.

Limitaciones observables: períodos incompletos pueden compararse; el SUM de variantes no limita período/moneda/fuente; las sumas del handler usan `Number` de JavaScript; `scroll_depth` se almacena pero no se devuelve en `behavior`.

### Ciclo de sincronización

Primera transacción: verifica tienda y estado; recupera ciphertext mediante `read_credential`; lo descifra; crea `sync_runs(status='running')`. Termina esa transacción antes de la solicitud externa.

`syncProvider` usa **28 días para Shopify y 3 para Clarity** cuando lo llama este endpoint. El valor por defecto interno del adaptador Shopify es 14 solo cuando su caller no proporciona período.

La transacción final hace upserts de `daily_metrics` o `clarity_metrics`, marca integración `connected` y el run `completed`. Si hubiera experimentos reales en el payload, la importación lanza `501`: todavía no está implementada.

Al fallar, otra transacción marca integración `error` y run `failed`, con diagnósticos sanitizados. Un fallo de persistencia revierte sus cambios. Un cierre abrupto entre las transacciones puede dejar un run `running`; no hay recuperación automática de jobs pendientes.

## `server/src/index.js`

El código de nivel superior ejecuta `validateConfig`, construye Express mediante `createApp` y abre el puerto en `0.0.0.0`. El callback de `listen` solo escribe el mensaje de arranque; no constituye una prueba funcional.

`shutdown()` se registra en `SIGTERM` y `SIGINT`. Llama `server.close`; su callback termina el pool y sale con código 0. Un callback de `setTimeout` fuerza salida 1 después de 10 segundos, con `unref()` para no prolongar el proceso. Las señales provienen de Docker, la terminal o el gestor de procesos.

Las funciones de scripts de instalación están documentadas en [Operación](operacion.md), y las de adaptadores en [Integraciones](integraciones.md). El [inventario](inventario-funciones.md) incluye también cada callback local de estos archivos.
