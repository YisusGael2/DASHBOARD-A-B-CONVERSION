# Adaptadores, fuentes y significado de métricas

Fuente: [server/providers/index.js](../server/providers/index.js). Los adaptadores no escriben SQL. Devuelven resultados al handler sync para persistirlos en una transacción. No retornan agregados parciales cuando falla una página o respuesta.

## Compatibilidad y contrato

| Proveedor | Estado implementado | Requisito / límite actual |
| --- | --- | --- |
| Shopify | Lectura GraphQL de pedidos | Dominio canónico y token autorizado; compatibilidad externa por validar |
| Clarity | Export API de comportamiento agregado | Token Bearer; contrato y plan externo por validar; 1–3 días |
| Intelligems | Demo y error explícito 501 | API y permisos reales pendientes; no hay endpoint inventado |

Las pruebas usan respuestas simuladas; no acreditan una cuenta real conectada. Durante la implementación original el acceso a documentación oficial devolvió 403. Verifica las fuentes oficiales enlazadas en [README de proveedores](../server/providers/README.md) al completar las conexiones.

`syncProvider(provider, {store,integration,credentials,days})` retorna promesa con `daily`, `clarity` o error. La forma prevista `experiments` no se importa todavía. `store` conserva nombres SQL (`timezone`, `currency`, `domain`); `integration` usa `external_id`. Credenciales son descifradas solamente en backend.

## Constantes de red

| Nombre | Valor | Uso |
| --- | --- | --- |
| `SHOPIFY_DEFAULT_VERSION` | 2026-07 | Default; process.env.SHOPIFY_API_VERSION puede reemplazarlo |
| `CLARITY_ENDPOINT` | https://www.clarity.ms/export-data/api/v1/project-live-insights | Destino fijo |
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
| `requiredToken(value)` | Texto → texto trim | Exige no vacío, <=8192 y sin CR/LF; `400 MISSING_CREDENTIAL`. Connect tiene límite más corto de 4096. Llamada por ambos adaptadores |
| `shopifyDomain(value)` | Texto → dominio lower/trim | Exige una etiqueta canónica de 1–63 caracteres y `.myshopify.com`, sin URLs, slash, puerto o dominios externos. `400 INVALID_SHOPIFY_DOMAIN`; llamada por Shopify |
| `windowDays(value,maximum)` | Días opcionales → entero limitado | Default min(14,maximum); exige entero 1..31, luego min con máximo del proveedor. `400 INVALID_PERIOD`; usada por Shopify y Clarity |
| `localDate(date,timeZone='UTC')` | Date y zona → YYYY-MM-DD | Intl formatToParts; helper local `localDate.get(name)` busca cada parte mediante `.find`. Zona no compatible produce `400 INVALID_TIMEZONE` |
| `shiftDate(date,delta)` | YYYY-MM-DD y desplazamiento → fecha | Construye mediodía UTC, cambia día y recorta ISO. Evita operar a medianoche en cambios de horario. Usada por ventana Shopify |
| `toUnits(amount)` | Decimal string → BigInt | Regex no negativa, hasta 18 dígitos enteros y 6 decimales; escala por 1000000 y completa fracción. Rechaza importe incompatible con `502 INVALID_MONEY` |
| `fromUnits(value)` | BigInt escalado → decimal string | Divide y conserva hasta 6 decimales, elimina ceros finales; entero se representa `.00`. No produce floats. Usada al retornar daily |
| `readJson(response)` | Fetch Response → promesa de objeto | Lee stream por chunks, cuenta bytes, cancela si excede 2 MB; concatena Uint8Array, TextDecoder y JSON.parse. Errores `INVALID_RESPONSE` o `RESPONSE_TOO_LARGE` |
| `requestJson(url,options,deadline)` | URL fija/validada, opciones y timestamp límite → JSON | Fetch con redirect:error y timeout min(12s, tiempo restante). HTTP429 puede reintentarse; rechaza otros no-2xx; pasa body a readJson; sanitiza errores. Usada por Shopify/Clarity |
| `syncShopify({store={},credentials={},days})` | Configuración tienda → `{daily:[...]}` | Valida dominio/token/version; construye ventana; pagina y agrega importes exactos por fecha local; excluye test/cancelados, deduplica ids, controla moneda/cursors/límites. No accede DB |
| `numeric(value,{integer=false,maximum=MAX_SAFE_INTEGER}={})` | Valor externo → número/null | Ausente, tipo no texto/número, no finito, negativo, exceso o entero inseguro da null. No lanza; convierte solo campos compatibles Clarity |
| `syncClarity({store={},integration={},credentials={},days})` | Configuración proyecto → `{clarity:[snapshot]}` | Bearer token, numOfDays<=3, valida array de métricas y filas information; mapea Traffic/ScrollDepth cuando tienen una sola fila; guarda metadata y respuesta |
| `syncProvider(provider,options)` | Nombre → promesa del adaptador | Convierte nombre a lower para despacho; Shopify/Clarity llaman funciones anteriores; Intelligems lanza `501 INTELLIGEMS_NOT_IMPLEMENTED`; desconocido `400 UNKNOWN_PROVIDER` |

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

El default interno es **14 días**; el endpoint del producto pasa **28** para mostrar últimos 14 y comparar los 14 anteriores. El máximo del helper es 31, pero la interfaz no ofrece modificarlo. El mensaje “reduce el período” de un límite requiere hoy cambiar el caller o llamar el adaptador directamente; no existe un selector HTTP de días.

Revenue es la suma del **total actual de los pedidos** agrupados por fecha de creación, según el contrato de currentTotalPriceSet. Puede incluir impuestos, envío y ajustes; no equivale a utilidad, payout ni ingreso neto contable. Confirmar tratamiento exacto de devoluciones depende del proveedor. Un pedido antiguo reembolsado no se revisita si su fecha de creación quedó fuera de la ventana. SQL guarda numeric(18,2); el agregado/JSON usa Number y la UI muestra cero decimales. No se garantiza precisión contable de extremo a extremo.

## Clarity: snapshot, no serie diaria

GET a endpoint fijo con `numOfDays`; el token determina proyecto. `integration.external_id` se guarda como projectId de referencia, pero el adaptador no verifica que coincida con el proyecto autorizado por el token.

La respuesta debe ser array de máximo 100 métricas, cada una con `metricName` string e `information` array. Traffic con una fila puede aportar `totalSessionCount`; ScrollDepth con una fila `averageScrollDepth` entre 0 y 100. No inventa conteos a partir de porcentajes: deadClicks, rageClicks y quickBacks permanecen null en real.

Metadata conserva aggregation=period_snapshot, windowDays, snapshotDate, projectId, response y aviso de falta de atribución. Repetir sync el mismo día reemplaza snapshot; el dashboard live usa el último y no suma capturas solapadas. Scroll depth queda persistido, aunque no se devuelve en la UI actual.

No hay heatmaps, grabaciones, joins entre sesiones/variantes ni verificación de exposición a experimento. Mostrar comportamiento de tienda junto a un experimento no demuestra causalidad.

## Intelligems y resultados A/B

Actualmente no hay llamada externa ni mapeo real de experimentos. `syncProvider('intelligems', ...)` siempre lanza 501. La demo genera controles/variantes y confianza sintética explícitamente marcada.

Para completar el importador: verificar API y permisos, fijar ids externos, definir si métricas son diarias o snapshots, evitar contar snapshots acumulados como días nuevos, conservar moneda/período y evidencia estadística, implementar upserts de experiments/variants/metrics y añadir fixtures oficiales. No basta con quitar el error501 del dispatcher.

La conversión presentada es observada; la aplicación no calcula significancia ni ganadores. Si un proveedor ofrece un resultado estadístico verificable debe guardarse con método, período y población, en lugar de concluir por la barra más alta.

## Fuente demo y fuente real

Demo tiene source=demo y conexiones status=demo. Al guardar una credencial de **cualquier proveedor** de una tienda, el dashboard de esa tienda deja de mostrar todas sus muestras y busca fuentes reales. No se borran filas demo. Las demás tiendas mantienen sus fuentes independientes.

Un fallo real se marca error y no vuelve a sustituirse por muestras. No es necesario introducir claves reales para probar login, permisos, gráficos ni resultados demo. Usa una tienda separada de prueba si quieres explorar configuración sin ocultar las muestras de Nómada/Casa Botánica.
