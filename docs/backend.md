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

Lee `req.user.role`. Permite `ADMIN` y `SUPER_ADMIN`; cualquier otro rol recibe `HttpError(403)`. Asume que `authenticate` ya se ejecutó. Está en lectura/creación de usuarios, creación de tiendas, auditoría y configuración/sincronización de integraciones. No decide por sí solo si un Admin puede crear otro empleado: el handler de usuarios agrega esa regla.

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
| `publicIntegration(row)` | Fila SQL → `{id,provider,status,lastSyncedAt,externalAccountId,sandbox}` | Traduce campos SQL; `sandbox` solo es true si metadata.mock es true. No devuelve ciphertext, metadata completa ni `last_error` | Dashboard y `connect` |
| `publicSyncRun(row)` | Fila SQL → DTO de ejecución | Selecciona id, integración, proveedor, estado y timestamps; convierte records_processed a número. Error no vacío se reemplaza por diagnóstico genérico controlado; no serializa texto arbitrario | `GET /api/sync-runs` |
| `publicAuditEvent(row)` | Fila SQL/join → DTO de auditoría | Selecciona ids, acción, timestamp, nombre de tienda y correo de actor. Copia solo claves/tipos permitidos por acción; números deben ser finitos. Metadata desconocida se omite | `GET /api/audit-events` |
| `storeIdFor(user, requested)` | Usuario + id opcional → id autorizado | CLIENT usa siempre su `store_id`; si recibió uno diferente, `403`. Un empleado debe enviar un UUID válido. Compara strings del cliente literalmente | Dashboard e historial sync; después RLS y `requireStore` |

### Proyección de auditoría

`publicAuditEvent` acepta únicamente `{userId,role}` para user.created, `{domain,currency}` para store.created, `{provider}` para integration.connected y `{provider,recordsProcessed}` para integration.synced. La selección explícita evita publicar un secreto añadido por otro proceso a JSONB. La consulta del actor usa columnas públicas de users; no consulta password_hash.

## `server/src/analytics.js`: `calculateZTest`

`calculateZTest(controlVisitors,controlOrders,variantVisitors,variantOrders)` es una función pura: recibe cuatro conteos, no toca DB ni reloj, y retorna `{lift:number/null,confidence:number/null}`. La llama el mapeo de variantes del dashboard y se prueba mediante fixtures matemáticos.

1. Exige enteros seguros, visitantes positivos y conversiones entre 0 y visitantes para ambos grupos. Cualquier entrada incompatible retorna ambos campos null.
2. Calcula `pc = controlOrders/controlVisitors` y `pv = variantOrders/variantVisitors`. Si pc>0, lift es `(pv-pc)/pc ×100`, redondeado a un decimal; con base 0 queda null.
3. La proporción combinada es `p = (controlOrders+variantOrders)/(controlVisitors+variantVisitors)`. Si p es 0 o 1 no hay error estándar útil y confidence queda null.
4. Calcula `SE = sqrt(p*(1-p)*(1/controlVisitors+1/variantVisitors))` y `Z = abs(pv-pc)/SE`.
5. Aproxima la CDF normal con el polinomio Abramowitz/Stegun 26.2.17. La confianza bilateral es `(2*CDF(Z)-1)*100`, equivalente a `100*(1-valor p)`, limitada a 0..99.9 y redondeada a un decimal.

Requiere exposiciones independientes y conversiones binarias por visitante. No corrige por múltiples comparaciones ni por consultar continuamente un test, y no demuestra causalidad ni probabilidad de ganador. Si orders supera visitantes, el resumen observado puede existir, pero la prueba z rechaza esos conteos. La aplicación no declara ganador ni detiene experimentos automáticamente.

## `server/src/app.js`: helpers

| Función | Entrada → salida | Cómo lo hace y conexiones |
| --- | --- | --- |
| `asyncRoute(fn)` | Handler async → middleware `(req,res,next)` | Invoca `fn`, transforma su resultado en promesa y reenvía rechazo a `next`. La función retornada es un callback sin nombre. Se usa en handlers de IO |
| `numberOrNull(value)` | Dato pg → `null` o `Number` | Mantiene null/undefined/vacío y valores no finitos como null; convierte strings numéricos de PostgreSQL. Usada para agregados, variantes, confianza y Clarity |
| `ratio(part, whole)` | Numerador/denominador → porcentaje o null | Si `whole>0`, calcula `part/whole*100` y redondea a dos decimales; de otro modo null. Usada en resumen y variantes |
| `delta(current, previous)` | Valores actuales/anteriores → cambio porcentual o null | Exige actual no null y anterior >0; calcula `(current-previous)/previous*100` a un decimal. No calcula variación con base cero |
| `providerName(value)` | Nombre → mismo nombre | Comprueba el Set exacto `shopify`, `clarity`, `intelligems`; ruta no acepta mayúsculas. Error `400` | `connect`, `sync` |
| `requireStore(client, id)` | Conexión con contexto + UUID → fila de tienda | `SELECT * ... WHERE id=$1`; RLS se aplica; ausencia genera `404` | Dashboard, alta de cliente e integraciones |
| `storeDate(timeZone)` | Zona IANA → `YYYY-MM-DD` actual | `Intl.DateTimeFormat` y `formatToParts`; helper local `storeDate.value(type)` busca año/mes/día mediante un callback `.find` | Ventana temporal del dashboard |
| `createApp.aggregate(items)` | Filas diarias → `{revenue,orders,sessions,conversion}` | Lista vacía produce nulls. Suma ingresos/pedidos; sesiones solo si todas las filas tienen dato. Redondea ingreso a dos decimales y usa `ratio`. Es función local del handler dashboard | Períodos actual/anterior de 7/14/28 días; no llama APIs externas |

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
| `GET /api/sync-runs` | `storeIdFor` → `withContext` → `requireStore` → últimos 25 runs con proveedor → `.map(publicSyncRun)` |
| `GET /api/audit-events` | `requireStaff` → UUID opcional → `withContext` → últimos 50 eventos con joins de actor/tienda → `.map(publicAuditEvent)` |
| `GET /api/users` | `requireStaff` → `withContext` → columnas públicas; ADMIN solo CLIENT, SUPER_ADMIN todos; máximo 500 |
| `POST /api/users` | Valida y decide rol → hash Argon2id fuera de transacción → `withContext` → valida tienda si cliente → INSERT usuario + auditoría → `publicUser` |
| `POST /api/stores` | Valida nombre/dominio/moneda/timeZone → INSERT tienda + evento store.created dentro de `withContext` → `publicStore` |
| `POST /api/integrations/:provider/connect` | Valida proveedor y pertenencia → cifra → upsert metadata + `store_credential` + evento de auditoría → `publicIntegration` |
| `POST /api/integrations/:provider/sync` | Transacción de preparación → descifrado → HTTPS fuera del pool → transacción de persistencia o registro de fallo |
| `404 de /api` | Devuelve JSON para rutas API no registradas, después de autenticar |
| `Fallback SPA /{*path}` | En producción envía `client/dist/index.html` para rutas fuera de `/api` |
| `Handler central de errores` | Respeta headers ya enviados; traduce errores HTTP/pg; no envía stack ni consulta SQL |

### Construcción del dashboard

1. Lee las integraciones de la tienda. Si alguna tiene `credential_saved`, `connected` o `error`, o el proceso no está en demo, el dashboard entra en `live`. En otro caso utiliza `demo`.
2. Selecciona fuente de ventas y experimentos según el modo. Las muestras siguen en DB, pero se ocultan en **toda esa tienda** después de guardar cualquier credencial, incluida Sandbox. `sandbox` identifica simulación sin cambiar mode.
3. Valida `days` como 7/14/28, por defecto 14. Obtiene hoy en la zona de tienda; consulta `2*days` fechas inclusivas con `date >= hoy-(2*days-1)` y moneda/fuente correctas; separa últimos days y los days anteriores. No rellena días ausentes en el handler.
4. Usa aggregate sobre los datos disponibles. Solo publica cambios con delta si ambas ventanas tienen exactamente days filas; cobertura incompleta conserva los totales actuales conocidos y deja todos los campos *Change en null. El cálculo de conversión usa pedidos/sesiones disponibles; Shopify entrega sesiones null y no genera una conversión inventada.
5. Obtiene experimentos de la fuente elegida. Un LEFT JOIN LATERAL elige el último snapshot de cada variante, limitado por tenant, fuente y moneda. Metadata.variantIds filtra variantes vigentes tras una nueva importación. Localiza control, aplica calculateZTest a no-control y añade lift/calculatedConfidence. Confianza válida 0..100 de metadata tiene prioridad; si falta usa la primera no-control. Comunica confidenceSource y sandbox, sin declarar ganador.
6. En demo suma conteos Clarity de los days seleccionados y calcula AVG(scroll_depth) redondeado a un decimal. En live usa el último snapshot sin sumar ventanas solapadas y comunica windowDays, scrollDepth y sandbox. Ese período Clarity es independiente del selector de ventas.
7. `updatedAt` es el máximo `last_synced_at` de las integraciones disponibles. No es el timestamp de modificación de todas las tablas.

Limitaciones observables: un período incompleto muestra los totales de sus filas conocidas, sin variación contra otro período; el selector no amplía la importación de ventas ni recorta métricas acumuladas de experimentos; las sumas del handler usan `Number` de JavaScript. El ingreso no representa utilidad.

### Ciclo de sincronización

Primera transacción: verifica tienda y estado; recupera ciphertext mediante `read_credential`; lo descifra; crea `sync_runs(status='running')`. Termina esa transacción antes de la solicitud externa.

`syncProvider` usa **28 días para Shopify/Intelligems y 3 para Clarity** cuando lo llama este endpoint. Shopify también usa 28 por defecto si su caller omite el período. Las validaciones ocurren antes de retornar Sandbox; la rama mock no llama a la red.

La transacción final hace upserts de daily_metrics, clarity_metrics o experiments/experiment_variants/variant_metrics. En Intelligems persiste metadata.confidence y la lista de ids vigentes, libera el control previo antes de reasignarlo y conserva métricas históricas. Conflictos únicos reemplazan la captura del mismo día sin duplicar. `recordsProcessed` cuenta cada experimento y cada métrica de variante, o cada fila diaria/snapshot Clarity.

Finalmente marca integración connected y run completed, actualiza metadata.mock con la procedencia efectiva e inserta audit_events integration.synced con provider/recordsProcessed. Todo pertenece a la misma transacción: no se publica un éxito si falla una parte del SQL. Los DTO exponen sandbox sin publicar credencial, envelope ni metadata privada.

Para evitar mezclar datos sintéticos y externos, la persistencia bloquea la fila de integración con FOR UPDATE. Si Shopify cambia metadata.mock respecto del payload, borra solo su caché source=shopify de esa tienda y la repuebla dentro de la transacción exitosa. En Intelligems/Clarity se conservan históricos y la lectura filtra metadata.mock según la última sync satisfactoria. Reconfigurar una credencial mantiene la procedencia de la caché previa hasta ese momento.

Al fallar, otra transacción marca integración `error` y run `failed`, con diagnósticos sanitizados. Un fallo de persistencia revierte sus cambios. Un cierre abrupto entre las transacciones puede dejar un run `running`; no hay recuperación automática de jobs pendientes.

## `server/src/index.js`

El código de nivel superior ejecuta `validateConfig`, construye Express mediante `createApp` y abre el puerto en `0.0.0.0`. El callback de `listen` solo escribe el mensaje de arranque; no constituye una prueba funcional.

`shutdown()` se registra en `SIGTERM` y `SIGINT`. Llama `server.close`; su callback termina el pool y sale con código 0. Un callback de `setTimeout` fuerza salida 1 después de 10 segundos, con `unref()` para no prolongar el proceso. Las señales provienen de Docker, la terminal o el gestor de procesos.

Las funciones de scripts de instalación están documentadas en [Operación](operacion.md), y las de adaptadores en [Integraciones](integraciones.md). El [inventario](inventario-funciones.md) incluye también cada callback local de estos archivos.
