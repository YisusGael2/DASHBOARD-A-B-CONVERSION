# Evidencia de validación de la documentación

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
