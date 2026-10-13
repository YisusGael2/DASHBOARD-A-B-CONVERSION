# Adaptadores, fuentes y significado de métricas

Fuente: [server/providers/index.js](../server/providers/index.js). Los adaptadores no escriben SQL. Devuelven resultados al handler sync para persistirlos en una transacción. No retornan agregados parciales cuando falla una página o respuesta.

## Compatibilidad y contrato

| Proveedor | Estado implementado | Requisito / límite actual |
| --- | --- | --- |
| Shopify | Lectura GraphQL de pedidos | Dominio canónico y token autorizado; compatibilidad externa por validar |
| Clarity | Export API de comportamiento agregado | Token Bearer; contrato y plan externo por validar; 1–3 días |
| Intelligems | GET experiences + importador transaccional | `x-api-key`; contrato solicitado y acceso externo por validar |

Las pruebas usan respuestas simuladas; no acreditan una cuenta real conectada. Durante la implementación original el acceso a documentación oficial devolvió 403. Verifica las fuentes oficiales enlazadas en [README de proveedores](../server/providers/README.md) al completar las conexiones.

`syncProvider(provider, {store,integration,credentials,days})` retorna una promesa con `daily`, `clarity` o `experiments`. Sandbox añade `mock:true` al resultado interno. `store` conserva nombres SQL (`timezone`, `currency`, `domain`); `integration` usa `external_id`. Credenciales son descifradas solamente en backend. Los resultados internos nunca se devuelven directamente como respuesta HTTP.

## Constantes de red

| Nombre | Valor | Uso |
| --- | --- | --- |
| `SHOPIFY_DEFAULT_VERSION` | 2026-07 | Default; process.env.SHOPIFY_API_VERSION puede reemplazarlo |
| `CLARITY_ENDPOINT` | https://www.clarity.ms/export-data/api/v1/project-live-insights | Destino fijo |
| `INTELLIGEMS_ENDPOINT` | https://api.intelligems.io/v1/experiences | Destino fijo para el contrato solicitado |
| `PAGE_SIZE` | 250 | Máximo pedido de nodos Shopify por página |
| `MAX_PAGES` | 20 | Hasta 5000 nodos consultados; se rechaza un resultado mayor |
| `REQUEST_TIMEOUT_MS` | 12000 | Máximo por solicitud y lectura de cuerpo mediante AbortSignal |
| `SYNC_TIMEOUT_MS` | 60000 | Deadline global entre peticiones/reintentos |
| `MAX_RESPONSE_BYTES` | 2000000 | Cuerpo JSON máximo por respuesta |
| `ORDERS_QUERY` | Consulta GraphQL DashboardOrders | id, createdAt, cancelledAt, test, total actual, moneda y pageInfo |

## Catálogo de todas las funciones

| Función / firma | Entrada → salida | Cómo trabaja, dependencias y errores |
| --- | --- | --- |
| `ProviderError.constructor(message,status=502,code='PROVIDER_ERROR')` | Mensaje/código → Error | Añade name, status y code. El API conserva status/mensaje mediante HttpError, pero no expone code |
| `requiredToken(value)` | Texto → texto trim | Exige no vacío, <=8192 y sin CR/LF; `400 MISSING_CREDENTIAL`. Connect tiene límite más corto de 4096. Llamada por los tres adaptadores antes de decidir Sandbox |
| `isMockToken(token)` | Token ya validado → boolean | Reconoce prefijos `mock_`/`sandbox_` o `process.env.MOCK_PROVIDERS === 'true'`. Se evalúa después de validaciones; no acepta un token vacío por activar la variable |
| `mockSeed(value)` | Información pública de tienda → entero determinista | Hash de 32 bits con XOR y `Math.imul`, sin material secreto. Alimenta conteos/ingresos sintéticos; no es un hash para seguridad |
| `storeCurrency(store)` | Tienda → código de moneda | Default USD; exige tres letras mayúsculas. Rechaza moneda incompatible con `400 MISSING_CURRENCY`. Se usa en Shopify Sandbox e Intelligems |
| `shopifyDomain(value)` | Texto → dominio lower/trim | Exige una etiqueta canónica de 1–63 caracteres y `.myshopify.com`, sin URLs, slash, puerto o dominios externos. `400 INVALID_SHOPIFY_DOMAIN`; llamada por Shopify |
| `windowDays(value,maximum)` | Días opcionales → entero limitado | Default min(14,maximum); exige entero 1..31, luego min con máximo del proveedor. `400 INVALID_PERIOD`; Shopify pasa 28 si no recibió período; Clarity limita a 3 e Intelligems a 28 |
| `localDate(date,timeZone='UTC')` | Date y zona → YYYY-MM-DD | Intl formatToParts; helper local `localDate.get(name)` busca cada parte mediante `.find`. Zona no compatible produce `400 INVALID_TIMEZONE` |
| `shiftDate(date,delta)` | YYYY-MM-DD y desplazamiento → fecha | Construye mediodía UTC, cambia día y recorta ISO. Evita operar a medianoche en cambios de horario. Usada por ventana Shopify |
| `toUnits(amount)` | Decimal string → BigInt | Regex no negativa, hasta 18 dígitos enteros y 6 decimales; escala por 1000000 y completa fracción. Rechaza importe incompatible con `502 INVALID_MONEY` |
| `fromUnits(value)` | BigInt escalado → decimal string | Divide y conserva hasta 6 decimales, elimina ceros finales; entero se representa `.00`. No produce floats. Usada al retornar daily |
| `readJson(response)` | Fetch Response → promesa de objeto | Lee stream por chunks, cuenta bytes, cancela si excede 2 MB; concatena Uint8Array, TextDecoder y JSON.parse. Errores `INVALID_RESPONSE` o `RESPONSE_TOO_LARGE` |
| `requestJson(url,options,deadline)` | URL fija/validada, opciones y timestamp límite → JSON | Fetch con redirect:error y timeout min(12s, tiempo restante). HTTP429 puede reintentarse; rechaza otros no-2xx; pasa body a readJson; sanitiza errores. Usada por los tres proveedores reales |
| `syncShopify({store={},credentials={},days})` | Configuración tienda → `{daily:[...]}` | Valida dominio/token/version; construye ventana; pagina y agrega importes exactos por fecha local; excluye test/cancelados, deduplica ids, controla moneda/cursors/límites. No accede DB |
| `numeric(value,{integer=false,maximum=MAX_SAFE_INTEGER}={})` | Valor externo → número/null | Ausente, tipo no texto/número, no finito, negativo, exceso o entero inseguro da null. No lanza; convierte campos compatibles de Clarity/Intelligems |
| `syncClarity({store={},integration={},credentials={},days})` | Configuración proyecto → `{clarity:[snapshot]}` | Bearer token, numOfDays<=3, valida array de métricas y filas information; mapea Traffic/ScrollDepth cuando tienen una sola fila; guarda metadata y respuesta |
| `intelligemsResponseError()` | Ninguna → ProviderError | Construye diagnóstico fijo en español: `502 INVALID_RESPONSE`. Ningún campo externo se incorpora al mensaje |
| `externalId(value)` | String/número finito → string trim | Exige tipo compatible y resultado no vacío; error mediante `intelligemsResponseError`. Se usa para ids de pruebas/variantes y detección de duplicados |
| `experimentDate(value)` | Timestamp opcional → ISO/null | Ausente/null/vacío produce null; exige string interpretable y normaliza mediante `toISOString`. Rechaza fechas incompatibles antes del SQL |
| `mockExperiments(store,integration,today,count,currency)` | Tienda y calendario → 2 pruebas normalizadas | Genera prueba active/completed, Control/Variante B, ids estables, fechas locales de referencia, visitantes, conversiones e ingresos exactos con BigInt. La confianza del caso completado es sintética |
| `syncIntelligems({store={},integration={},credentials={},days})` | Cuenta → `{experiments:[...]}` | Valida token, ventana, zona/fecha y moneda. En Sandbox retorna `mock:true` y `mockExperiments`; en externo usa GET/x-api-key, valida y normaliza la respuesta completa. No accede DB |
| `syncProvider(provider,options)` | Nombre → promesa del adaptador | Convierte nombre a lower y despacha Shopify, Clarity o Intelligems; desconocido `400 UNKNOWN_PROVIDER` |

Los callbacks `.some` de errores GraphQL detectan THROTTLED; `.map` transforma buckets en daily; `.find` identifica métricas Clarity y partes de fecha; el callback de `setTimeout` resuelve la espera de reintento. Todos aparecen con ubicación en el [inventario](inventario-funciones.md).

## HTTP, reintentos y sanitización

`requestJson` hace como máximo 3 intentos. Solo reintenta **HTTP 429**. Si Retry-After es un número positivo lo limita a 5 segundos; si no, usa 1 segundo y luego 2. No interpreta Retry-After como fecha HTTP. Si la espera excedería deadline, retorna error de límite.

HTTP 401/403 se traduce a error de permisos `403`; otros HTTP fallidos a `502`. Un timeout da `504`; un fallo de red genérico `502`. GraphQL puede responder HTTP200 con `errors`; Shopify identifica THROTTLED y devuelve `429` sin reintento GraphQL automático.

No sigue redirects; las URLs de destino no provienen de un campo arbitrario del navegador. La verificación TLS permanece habilitada. Los errores nunca incluyen headers, cuerpos upstream o opciones que contienen tokens.

## Shopify: algoritmo y población

1. La versión debe tener forma `20YY-01/04/07/10`; esto verifica formato, no que Shopify la soporte.
2. Determina hoy en `store.timezone`, crea buckets para la ventana y consulta desde un día UTC adicional para cubrir desfases de zona; filtra luego por fecha local de creación.
3. POST al dominio canónico `/admin/api/<version>/graphql.json` con `X-Shopify-Access-Token` y variables GraphQL (`first`, `after`, `query`).
4. Valida edges/pageInfo; excluye `test=true` y pedidos cancelados; deduplica por id.
5. `currentTotalPriceSet.shopMoney.amount` se suma con BigInt de precisión 6 decimales. La moneda debe coincidir con la tienda.
6. Continúa con endCursor; detectar cursor repetido/inválido evita bucle y datos parciales.
7. Retorna todos los días de la ventana, incluidos días realmente consultados sin pedidos con cero. Sesiones y conversión son null.

El adaptador Shopify usa **28 días** por defecto; el endpoint del producto también solicita 28. El selector del dashboard admite 7/14/28 días y consulta el doble para comparación, pero no amplía la ventana importada. Para una ventana de 28 sin datos previos, la variación queda sin comparación. El máximo del helper es 31 y no existe un parámetro HTTP de sync para cambiarlo.

Revenue es la suma del **total actual de los pedidos** agrupados por fecha de creación, según el contrato de currentTotalPriceSet. Puede incluir impuestos, envío y ajustes; no equivale a utilidad, payout ni ingreso neto contable. Confirmar tratamiento exacto de devoluciones depende del proveedor. Un pedido antiguo reembolsado no se revisita si su fecha de creación quedó fuera de la ventana. SQL guarda numeric(18,2); el agregado/JSON usa Number y la UI muestra cero decimales. No se garantiza precisión contable de extremo a extremo.

## Clarity: snapshot, no serie diaria

GET a endpoint fijo con `numOfDays`; el token determina proyecto. `integration.external_id` se guarda como projectId de referencia, pero el adaptador no verifica que coincida con el proyecto autorizado por el token.

La respuesta debe ser array de máximo 100 métricas, cada una con `metricName` string e `information` array. Traffic con una fila puede aportar `totalSessionCount`; ScrollDepth con una fila `averageScrollDepth` entre 0 y 100. No inventa conteos a partir de porcentajes: deadClicks, rageClicks y quickBacks permanecen null en real.

Metadata conserva aggregation=period_snapshot, windowDays, snapshotDate, projectId, response y aviso de falta de atribución. Repetir sync el mismo día reemplaza snapshot; el dashboard live usa el último y no suma capturas solapadas. La API devuelve `behavior.scrollDepth`; la UI muestra “Profundidad de scroll”. En demo se promedia scroll_depth sobre los días seleccionados; en live/Sandbox la ventana Clarity sigue siendo la del snapshot, normalmente 3 días.

No hay heatmaps, grabaciones, joins entre sesiones/variantes ni verificación de exposición a experimento. Mostrar comportamiento de tienda junto a un experimento no demuestra causalidad.

## Intelligems y resultados A/B

GET a `INTELLIGEMS_ENDPOINT` con `x-api-key` y `Accept: application/json`, usando el deadline global. La respuesta debe contener un arreglo `experiences` o `experiments`. Cada experimento requiere id externo no vacío, al menos una variante y como máximo un control. Se rechazan ids duplicados, fechas incompatibles y fin anterior al inicio.

Normaliza `name` con fallback, estados draft/active/completed (otro valor pasa a active), fechas camelCase/snake_case y confianza 0..100 o null. Cada variante normaliza id/nombre, control, visitantes y orders/conversions, ingreso decimal exacto y moneda de la tienda. Los conteos ausentes/incompatibles pasan a 0 conforme al contrato solicitado; no representan una medición certificada. La fecha es la fecha local de captura.

El handler persiste en una transacción experiments → experiment_variants → variant_metrics mediante conflictos únicos por ids externos/fecha/moneda/fuente. La confianza y lista de variantes vigentes se guardan en metadata. Antes de asignar el nuevo control libera el flag anterior, evitando violar el índice único al cambiar de control. Las variantes antiguas permanecen como historial y la lectura muestra solo las vigentes del payload.

Las métricas se tratan como **snapshots acumulados del experimento**. Se conserva la captura de cada fecha, pero el dashboard escoge la última por variante, fuente y moneda; no suma visitantes repetidos entre capturas. El período 7/14/28 del dashboard filtra ventas y comportamiento demo, no convierte estos totales en resultados de ese período.

La conversión es observada. El backend calcula lift contra control y confianza mediante prueba z bilateral de dos proporciones cuando los conteos son válidos. La confianza es `100 × (1 − valor p)`, limitada a 99.9%; no es una probabilidad de ganador. Si el proveedor ofrece confianza numérica compatible se conserva; de otro modo se usa la de la primera variante no-control. Se expone su procedencia (`provider`, `calculated`, `sandbox` o `demo`) y no se declara ganador automático. Consulta la fórmula y supuestos en [Backend](backend.md#serversrcanalyticsjs-calculateztest).

El endpoint implementa el contrato indicado para el proyecto. Las pruebas verifican ese contrato con fixtures y Sandbox; la compatibilidad, permisos, paginación disponible y definición estadística del proveedor deben comprobarse contra una cuenta externa antes de interpretar resultados reales.

Al alternar Sandbox/cuenta externa, Intelligems filtra los experimentos por metadata.mock de la última importación satisfactoria. Clarity filtra sus snapshots con la misma procedencia. Los históricos se conservan; una captura del mismo día reemplaza la clave única existente. En Shopify daily_metrics no tiene metadata por fila: la primera sync exitosa que cambia procedencia renueva únicamente la caché source=shopify de esa tienda, en la misma transacción que los nuevos datos. No elimina filas demo ni métricas de otras tiendas. Un fallo revierte esa renovación.

## Sandbox: mismo flujo SQL, sin red

Una credencial validada con prefijo `mock_` o `sandbox_` activa simulación solo en esa integración. `MOCK_PROVIDERS=true` la activa globalmente en ese proceso; incluso así token vacío, dominio Shopify inválido, ventana inválida o zona incompatible fallan antes del retorno sintético.

- Shopify genera los días solicitados en la zona local, con pedidos enteros e ingresos estables basados en dominio/fecha; sesiones/conversión siguen null.
- Clarity genera un snapshot con sesiones, clics muertos, rage clicks, quick backs y scroll 68.5; metadata incluye `mock:true`, período y proyecto.
- Intelligems genera dos pruebas y cuatro variantes normalizadas en la moneda de la tienda.

`ConnectForm` ofrece “Usar credencial Sandbox (mock_)”. Rellena `mock_<provider>_sandbox_token` y el identificador externo; Shopify usa el dominio registrado. Guardar cifra el token; sync lo descifra internamente y ejecuta los mismos upserts/RLS. Los DTO públicos exponen `sandbox`, nunca el token o ciphertext. Una sync satisfactoria queda connected aunque sea sintética: la etiqueta Sandbox distingue su origen.

## Fuentes demo, sincronizadas y Sandbox

Demo tiene source=demo y conexiones status=demo. Al guardar una credencial de **cualquier proveedor** de una tienda, el dashboard de esa tienda deja de mostrar todas sus muestras y busca fuentes reales. No se borran filas demo. Las demás tiendas mantienen sus fuentes independientes.

Un fallo real se marca error y no vuelve a sustituirse por muestras. No es necesario introducir claves reales para probar login, permisos, gráficos ni resultados demo. Usa una tienda separada de prueba si quieres explorar configuración sin ocultar las muestras de Nómada/Casa Botánica.
