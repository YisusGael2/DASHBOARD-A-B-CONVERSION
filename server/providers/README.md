# Adaptadores del servidor

`syncProvider(provider, { store, integration, credentials, days })` recibe
credenciales descifradas exclusivamente en el backend y devuelve datos para una
transacción de persistencia. Un fallo nunca devuelve resultados parciales.
Los errores contienen `status`, `code` y un diagnóstico sin credenciales.

## Estado de compatibilidad

Se intentó consultar la documentación oficial de los tres proveedores durante
el desarrollo; este entorno respondió HTTP 403. Por ello no se verificaron
las versiones, los planes, los permisos actuales ni una conexión real. Las
pruebas automatizadas usan respuestas simuladas: no demuestran acceso real.

- **Shopify:** adaptador GraphQL implementado. Usa por defecto `2026-07`,
  configurable mediante `SHOPIFY_API_VERSION`. Confirma una versión estable
  soportada en tu tienda antes de producción. Requiere dominio canónico
  `nombre.myshopify.com` y `credentials.accessToken` de una aplicación con
  acceso de lectura a pedidos (`read_orders` y las autorizaciones adicionales
  que Shopify requiera para esos datos). La autorización/instalación OAuth
  pública y la gestión completa del ciclo de vida de la app no forman parte
  de este adaptador: el MVP permite introducir un token obtenido de una app
  propia autorizada para esa tienda.
- **Microsoft Clarity:** adaptador basado en el contrato conocido de Export
  API, endpoint fijo `https://www.clarity.ms/export-data/api/v1/project-live-insights`,
  autenticación Bearer mediante `credentials.apiKey`, ventana de 1 a 3 días.
  Debes confirmar disponibilidad, token y contrato en la documentación
  actual del proyecto. `integration.external_id` identifica el proyecto
  para la configuración; el token determina el proyecto autorizado y el
  adaptador no puede verificar que el identificador introducido coincida.
- **Intelligems:** la sincronización real devuelve `501
  INTELLIGEMS_NOT_IMPLEMENTED`. No se inventaron endpoints. Se necesitan
  documentación y permisos verificables de su API para completar esta
  integración. Los experimentos del modo de demostración son datos ficticios.

## Significado de los datos

Shopify se agrupa por fecha de creación del pedido en la zona horaria de la
tienda. Se suman importes exactos de `currentTotalPriceSet.shopMoney`: total
actual del pedido en moneda de la tienda, cuya definición incluye los ajustes
que Shopify refleje (descuentos, impuestos, envío y devoluciones/reembolsos
según su contrato). No representa ingresos netos contables ni cobros/payouts.
Se excluyen pedidos de prueba y cancelados; la cuenta de pedidos usa esa misma
población. Las devoluciones de pedidos antiguos solo actualizan su cohorte
cuando se vuelve a sincronizar su fecha de creación. Confirma esta definición
contra la documentación oficial antes de utilizarla para decisiones financieras.

Se sincronizan 14 días por defecto, máximo 31, hasta 5.000 pedidos y 60 segundos.
Si se excede el límite, reduce el período. Fechas vacías se devuelven como cero
para reemplazar la caché del período. No se suman monedas distintas. Sesiones
y conversión permanecen `null` porque pedidos no ofrecen el denominador.

Clarity guarda una **instantánea agregada del período** con fecha de captura,
`metadata.aggregation = period_snapshot` y `metadata.windowDays`. No debe
interpretarse como una serie diaria ni sumarse entre instantáneas solapadas.
Se conserva la respuesta como metadatos. Solo se leen sesiones y profundidad
de scroll si aparecen los campos compatibles en una única fila sin dimensiones.
Los porcentajes de sesiones con clics muertos, rage clicks o quick backs no
se convierten en conteos. No se generan URLs de grabaciones/heatmaps ni se
atribuye comportamiento a variantes A/B.

## Protección y pruebas

Los destinos son fijos; Shopify solo acepta subdominios canónicos
`myshopify.com`. No se siguen redirecciones. Se conserva la verificación HTTPS,
se limita el cuerpo recibido y se aplican tiempos máximos y reintentos
acotados para HTTP 429. Nunca se muestran cuerpos de errores del proveedor.

Ejecuta desde `server`:

```sh
node --test providers/*.test.js
```

Fuentes oficiales pendientes de verificación:

- https://shopify.dev/docs/api/admin-graphql/latest/queries/orders
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
- https://docs.intelligems.io/
