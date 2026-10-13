# Evidencia de validación del proyecto

La documentación inicial se elaboró sobre el código funcional del commit `e3d089d4842cc43475615afbfcf7e0a66748f7fa`. Las correcciones posteriores de interfaz y su validación se registran por separado abajo.

## Comprobaciones de la documentación inicial

| Comprobación | Resultado observado | Alcance |
| --- | --- | --- |
| `npm test` | 22 passed, 0 failed, 0 skipped | 10 casos de integración con PostgreSQL real y 12 de adaptadores simulados |
| `npm run build` | Compilación Vite exitosa | Interfaz del código de referencia |
| `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 6 passed | Login, permisos, cambio de tienda, móvil y alta/configuración contra aplicación Docker |
| Inventario AST | 315 funciones: 90 nombradas/métodos y 225 callbacks | 19 archivos JavaScript/JSX propios; no cuenta SQL ni código de terceros |
| Inventario CSS | 473 reglas | Selectores, overrides y pasos de animación |
| Enlaces locales | Destinos y líneas de código comprobados | Enlaces de la documentación y READMEs; no verifica disponibilidad de URLs externas |
| Esquema | 11 tablas y 6 funciones SQL cubiertas | Diccionario y políticas cotejados con schema.sql |

Las pruebas se ejecutaron en el entorno de desarrollo de este repositorio, con la demo local y PostgreSQL 17. **No se ejecutaron en tu equipo** ni verificaron tus cuentas externas. La pestaña Actions de GitHub tiene resultados independientes; este documento no certifica una ejecución remota de CI.

## Correcciones documentales

- El compilado con Node necesita NODE_ENV=production; se añadió el ejemplo correspondiente para Bash y PowerShell.
- El adaptador Shopify tiene default interno de 14 días, pero el endpoint de la aplicación solicita 28. Se explicó la diferencia.
- Se documentó que DEMO_MODE=false no elimina cuentas demo ya creadas y que no existen todavía endpoints de edición/eliminación.
- Los callbacks anónimos conservan etiquetas de referencia; no fueron renombrados ni se alteró su implementación.

## Reproducir

Sigue [Pruebas locales](pruebas-locales.md). Los fixtures de integración y navegador son temporales; no ejecutes estas suites en una base de clientes reales. Verifica que una nueva ejecución complete todos los casos: un resultado anterior no garantiza un nuevo arranque, y una suite sin tests no valida el producto.

## Corrección de flecha y cierre de sesión

Se reprodujeron ambos problemas antes del cambio: la flecha recibía el clic como SVG sin activar select; el logout de Super Admin quedaba debajo del viewport, alrededor de y=795 en una ventana de 540 px. Los dos nuevos casos de regresión fallaron con el código anterior.

La flecha ahora pertenece al control nativo y deja pasar el clic; el logout es un botón explícito de la cabecera sticky, y la barra lateral permite scroll. Se conserva la función de cierre local y la autorización existente.

Validación posterior: **22 pruebas del backend/adaptadores y 8 de navegador pasaron**, además de compilación Vite y arranque Docker. Se comprobó clic físico en la flecha, cambio de tienda, cierre con un clic en el icono, eliminación de token y recarga sin sesión. La prueba móvil usa 390×540.

El inventario actual se actualizó para el código corregido; las cifras de la tabla inicial corresponden a su revisión histórica. No se han realizado pruebas en el equipo del usuario ni conexiones nuevas con cuentas externas.

## Fases 1, 2, 4 y 5 — 13 de octubre de 2026

Se implementaron el adaptador/importador Intelligems, Sandbox de los tres proveedores, períodos 7/14/28, profundidad de scroll, lift y prueba z bilateral, exportaciones CSV, historial y auditoría. La documentación e inventarios reflejan esas funciones y sus conexiones.

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `npm test` | 50 aprobadas; 0 fallidas, omitidas o pendientes | 21 proveedores, 17 integración PostgreSQL, 7 matemáticas y 5 DTOs de seguridad |
| `npm run build` | Exitosa; código de salida 0 | React/Vite sin dependencias nuevas |
| `npm run local:up` | Construcción y arranque exitosos | PostgreSQL 17 y aplicación saludables; migraciones y seed completados |
| `PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 10 aprobadas | Las 8 regresiones anteriores y 2 casos nuevos de períodos/CSV y flujo Sandbox completo |
| Manifiestos y lockfile | Sin cambios | Se conservaron las dependencias existentes |

Las pruebas verifican persistencia real en PostgreSQL de experimentos y variantes, reintentos sin duplicados, cambio de variante control, última instantánea sin sumar acumulados y ocultamiento de variantes retiradas. También verifican RLS de historial por tienda, auditoría exclusiva de empleados, DTOs sin secretos y diagnósticos seguros. Un desbordamiento SQL deliberado revierte toda la importación, conserva métricas anteriores, registra fallo y no registra éxito en auditoría.

Los cambios Sandbox/cuenta externa se prueban con respuestas controladas: Shopify renueva únicamente su caché cuando cambia procedencia; Intelligems y Clarity filtran sus históricos. Las variaciones entre períodos requieren dos ventanas completas; el caso de períodos comprueba cobertura, totales y deltas contra consultas independientes a PostgreSQL usando la fecha local de la tienda.

En navegador se configuraron y sincronizaron los tres proveedores mediante el botón Sandbox, se consultaron métricas, lift, scroll e historiales y se exportaron ambos CSV. Se comprobaron BOM UTF-8, escape de comillas y neutralización de una fórmula dentro de un nombre de experimento. Los casos anteriores siguen cubriendo login, aislamiento, flecha del selector, logout, permisos, móvil y configuración de credenciales sin inventar métricas.

Todas estas comprobaciones se realizaron en el entorno de desarrollo con datos de prueba. Los adaptadores externos usan fixtures `fetch` y Sandbox; **no se validaron conexiones contra cuentas reales de Shopify, Clarity ni Intelligems**. Tampoco se ejecutaron pruebas en el equipo del usuario.
