# Evidencia de validación de la documentación

Código funcional de referencia: commit `e3d089d4842cc43475615afbfcf7e0a66748f7fa`. Esta actualización modifica documentación y corrige instrucciones del README; no cambia la lógica de la aplicación.

## Comprobaciones ejecutadas

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
