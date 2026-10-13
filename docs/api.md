# Contrato HTTP

Implementación: [server/src/app.js](../server/src/app.js). Base local Docker: `http://localhost:8080`; base Node directo: `http://localhost:3001`. En Vite usa `/api` bajo el puerto 5173.

## Convenciones y autorización

Los cuerpos son JSON con `Content-Type: application/json`. Máximo global: 16 KB. Excepto health y login, se exige `Authorization: Bearer <JWT>`. El token dura 8 horas; permisos y estado del usuario se consultan de nuevo en PostgreSQL.

| Método y ruta | Público | CLIENT | ADMIN | SUPER_ADMIN |
| --- | --- | --- | --- | --- |
| `GET /api/health` | Sí | Sí | Sí | Sí |
| `POST /api/auth/login` | Sí | Sí | Sí | Sí |
| `GET /api/auth/me` | No | Propio usuario | Propio usuario | Propio usuario |
| `GET /api/stores` | No | Solo su tienda | Todas | Todas |
| `GET /api/dashboard` | No | Su tienda | Tienda seleccionada | Tienda seleccionada |
| `GET /api/users` | No | Denegado | Solo usuarios CLIENT | Todos, hasta 500 |
| `POST /api/users` | No | Denegado | Solo crear CLIENT | Crear cualquiera de los 3 roles |
| `POST /api/stores` | No | Denegado | Permitido | Permitido |
| `POST /api/integrations/:provider/connect` | No | Denegado | Permitido | Permitido |
| `POST /api/integrations/:provider/sync` | No | Denegado | Permitido | Permitido |

No existen PUT, PATCH ni DELETE de estas entidades. Tampoco existe un endpoint de logout o lectura de credenciales.

## DTO comunes

| DTO | Campos y tipos |
| --- | --- |
| `User` | `id:string(UUID)`, `name:string`, `email:string`, `role:CLIENT/ADMIN/SUPER_ADMIN`, `storeId:UUID/null`, `status:active/disabled` |
| `Store` | `id:UUID`, `name:string`, `domain:string`, `currency:string(3)`, `timeZone:string`, `status:active/paused` |
| `Integration` | `id:UUID`, `provider:shopify/clarity/intelligems`, `status:disconnected/demo/credential_saved/connected/error`, `lastSyncedAt:ISO timestamp/null`, `externalAccountId:string/null` |

No incluyen hash, ciphertext, token del proveedor ni clave API.

## Health y autenticación

### `GET /api/health`

Sin cuerpo. Ejecuta `SELECT 1`. Éxito `200`:

```json
{"status":"ok","database":"connected","demoMode":true}
```

Una falla DB se convierte en error del servidor. Este endpoint no verifica tablas, cuentas, RLS ni conectividad externa.

### `POST /api/auth/login`

```json
{"email":"cliente@demo.local","password":"Demo1234!"}
```

Éxito `200`: `{ "token": "<JWT firmado>", "user": User }`. No copies un token real a documentación, capturas o logs. Errores usuales: `400` por campos inválidos, `401` por acceso rechazado, `429` tras exceder el límite por IP.

### `GET /api/auth/me`

Sin cuerpo. Éxito `200`: `{ "user": User }`. Usa los datos vigentes de la cuenta, no una copia del rol guardada en el navegador.

## Tiendas y usuarios

### `GET /api/stores`

Sin parámetros. Éxito `200`: `{ "stores": [Store] }`, ordenado por nombre. La consulta se ejecuta dentro de RLS. CLIENT recibe una tienda; un empleado puede recibir lista vacía o varias.

### `POST /api/stores`

```json
{
  "name":"Mi tienda",
  "domain":"mi-tienda.myshopify.com",
  "currency":"MXN",
  "timeZone":"America/Mexico_City"
}
```

`name`: obligatorio, hasta 160 caracteres. `domain`: obligatorio, hasta 253, normalizado a minúsculas; debe coincidir con patrón canónico `.myshopify.com`. `currency`: tres letras mayúsculas, default `USD`. `timeZone`: validada con `Intl.DateTimeFormat`, default `UTC`.

Éxito `201`: `{ "store": Store }`; `status` comienza en `active`. No crea automáticamente usuarios, credenciales ni métricas. Dominio duplicado genera `409`. El validador del adaptador Shopify es más estricto en longitud de etiqueta que el del alta de tienda.

### `GET /api/users`

Éxito `200`: `{ "users": [User] }`, ordenado por nombre, máximo 500. ADMIN ve clientes de todas las tiendas; SUPER_ADMIN ve también empleados. No tiene paginación ni filtro HTTP de tienda.

### `POST /api/users`

```json
{
  "name":"Cliente de ejemplo",
  "email":"cliente@example.com",
  "password":"<contraseña elegida localmente>",
  "role":"CLIENT",
  "storeId":"11111111-1111-4111-8111-111111111111"
}
```

`name`: hasta 160. `email`: hasta 320, normalizado y validado por regex. `password`: de 10 a 128 caracteres después de `trim`; el límite mínimo del bootstrap inicial es distinto: 12. `role`: default CLIENT. Un CLIENT requiere tienda existente. Para crear empleado, SUPER_ADMIN usa rol ADMIN/SUPER_ADMIN y `storeId:null` o lo omite.

Éxito `201`: `{ "user": User }`. Se persiste hash Argon2id y un evento `user.created` en la misma transacción. ADMIN pidiendo rol de empleado recibe `403`; correo duplicado `409`; tienda inexistente `404`. No se envía correo de invitación aunque el modal use la palabra “Invitar”.

## Dashboard

### `GET /api/dashboard?storeId=<UUID>`

CLIENT puede omitir `storeId`; se usa su tienda. Si envía otro id, recibe `403`. ADMIN/SUPER_ADMIN deben enviar un UUID; falta o formato incorrecto produce `400`. Tienda inexistente produce `404`.

Respuesta `200`:

```json
{
  "store": {"id":"11111111-1111-4111-8111-111111111111","name":"Nómada Studio","domain":"demo-nomada-studio.myshopify.com","currency":"MXN","timeZone":"America/Mexico_City","status":"active"},
  "summary": {"revenue":null,"orders":null,"conversionRate":null,"sessionCount":null,"revenueChange":null,"ordersChange":null,"conversionChange":null,"sessionChange":null},
  "daily": [],
  "experiments": [],
  "behavior": {"sessions":null,"deadClicks":null,"rageClicks":null,"quickBacks":null,"source":"clarity","windowDays":null},
  "integrations": [],
  "mode":"live",
  "updatedAt":null
}
```

Este ejemplo ilustra la estructura sin datos; no es la respuesta de la tienda demo sembrada.

| Campo | Significado |
| --- | --- |
| `summary.revenue` | Suma de ingresos de las filas actuales, en moneda de la tienda; número JSON/null |
| `summary.orders` | Suma de pedidos actuales; entero/null |
| `summary.sessionCount` | Suma solo si todas las filas del período tienen sesiones; entero/null |
| `summary.conversionRate` | Pedidos/sesiones ×100, dos decimales; `2.8` significa 2.8%, no fracción 0.028 |
| `*Change` | Cambio relativo ×100 frente al período anterior, un decimal; null si no puede calcularse |
| `daily[]` | `{date:YYYY-MM-DD,revenue:number,orders:integer,sessions:integer/null}`; hasta 14 días presentes |
| `experiments[]` | `{id,name,status,startedAt,visitors,confidence,variants}` |
| `variants[]` | `{id,name,isControl,visitors,conversions,revenue,conversionRate}` |
| `confidence` | Valor `metadata.confidence` del experimento; en demo es sintético. No calculado por el backend |
| `behavior` | Clarity general de la tienda; períodos distintos de ventas se explicitan con `windowDays` |
| `integrations[]` | DTO públicos de integraciones existentes |
| `mode` | Fuente elegida para el dashboard entero: `demo` o `live` |
| `updatedAt` | Mayor timestamp de sincronización registrado en integraciones, o null |

El endpoint no acepta filtros de fecha ni calcula ganador A/B. Consulta [Backend](backend.md) para ver consultas y limitaciones de los agregados.

## Integraciones

### `POST /api/integrations/:provider/connect`

`provider`: minúsculas, uno de los tres admitidos.

Shopify:

```json
{"storeId":"<UUID>","externalAccountId":"mi-tienda.myshopify.com","accessToken":"<token obtenido de la tienda>"}
```

Clarity/Intelligems:

```json
{"storeId":"<UUID>","externalAccountId":"<identificador de proyecto o cuenta>","apiKey":"<credencial del proveedor>"}
```

Credencial: texto obligatorio, hasta 4096 caracteres. Identificador externo: obligatorio, hasta 253. Shopify exige que el identificador sea exactamente el dominio registrado en la tienda. El endpoint cifra y guarda; **no llama al proveedor**.

Éxito `200`: `{ "integration": Integration, "message": "..." }`; status `credential_saved`. El upsert reemplaza una credencial previa y registra el evento `integration.connected` — ese nombre del evento histórico no significa conexión HTTPS verificada. Guardar una credencial cambia el dashboard entero de esa tienda a `live` y oculta muestras; no borra muestras ni elimina automáticamente resultados reales antiguos.

### `POST /api/integrations/:provider/sync`

```json
{"storeId":"<UUID>"}
```

Éxito `200`: `{ "message":"Sincronización completada.", "recordsProcessed": 28, "warnings": [] }`. `recordsProcessed` cuenta filas persistidas, no pedidos descargados. Shopify pide 28 días; Clarity 3. No existe parámetro HTTP para cambiar esa ventana.

`409` si falta conexión, falta credencial o es integración demo. `501` para Intelligems real. Las fallas HTTPS, timeout, permisos o límites se traducen desde el adaptador y se registran sin secretos. La llamada es síncrona: no devuelve un job para consultar más tarde.

## Errores y respuestas especiales

Formato habitual: `{"error":"mensaje"}`. El API no devuelve el `code` interno de `ProviderError`.

| Código | Cuándo aparece |
| --- | --- |
| `400` | Validación, JSON malformado, FK/check/tipo inválido (`23503`, `23514`, `22P02`) |
| `401` | Falta JWT, firma/issuer/audience/expiración rechazados o cuenta inactiva |
| `403` | Permiso de rol, acceso a otra tienda, RLS (`42501`) o proveedor rechazando credencial |
| `404` | Tienda no encontrada o ruta API desconocida para usuario autenticado |
| `409` | Unicidad (`23505`), integración no preparada o moneda Shopify distinta |
| `413` | Cuerpo excede el límite del parser JSON |
| `422` | Shopify supera límite de pedidos del adaptador |
| `429` | Rate limit de login o proveedor |
| `500` | Error interno inesperado o configuración de versión API no válida |
| `501` | Sincronización real Intelligems/importación de experimentos pendiente |
| `502` | Red, respuesta o disponibilidad del proveedor no compatible |
| `504` | Tiempo máximo de proveedor/sync excedido |

Una ruta desconocida bajo `/api` sin JWT recibe `401` porque la autenticación se ejecuta antes del `404`. Una ruta fuera de `/api` devuelve HTML de la SPA en producción. No interpretes un HTTP 200 de ese HTML como éxito de una API.
