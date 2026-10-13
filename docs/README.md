# Documentación de Centraliza

Esta documentación describe la implementación del **Dashboard de Centralización de Datos** para una sola agencia. Explica el código existente, sus entradas y salidas, sus conexiones y las funciones pendientes. No presenta las integraciones simuladas como conexiones externas verificadas.

## Ruta de lectura

| Documento | Qué responde |
| --- | --- |
| [Pruebas locales](pruebas-locales.md) | Cómo abrirlo en tu equipo, qué probar con cada rol y cómo ejecutar las 30 pruebas |
| [Arquitectura y archivos](arquitectura.md) | Cómo se conectan interfaz, API, PostgreSQL, Docker y proveedores; responsabilidad de cada archivo |
| [Backend y funciones](backend.md) | Nombre, firma, mecanismo, dependencias y errores de cada función del servidor |
| [Frontend y funciones](frontend.md) | Componentes, funciones internas, estado, efectos y conexión de cada pantalla con la API |
| [Contrato HTTP](api.md) | Todas las rutas, permisos, cuerpos de petición, respuestas y errores |
| [Base de datos](base-de-datos.md) | Las 11 tablas, todas sus columnas, claves, restricciones, funciones SQL y políticas RLS |
| [Integraciones y métricas](integraciones.md) | Funciones de los adaptadores, límites, definición de cada métrica y separación demo/real |
| [Operación y configuración](operacion.md) | Scripts, variables, Docker, CI, mantenimiento y resolución de errores |
| [Seguridad y límites](seguridad.md) | Qué protege el sistema, alcance real de cada rol y funcionalidades aún pendientes |
| [Inventario de funciones](inventario-funciones.md) | Índice exhaustivo de funciones nombradas y callbacks, con ubicación, firma y llamadas directas |
| [Inventario de estilos](inventario-estilos.md) | Todos los selectores CSS, sus propiedades, overrides responsive y animaciones |
| [Evidencia de validación](validacion.md) | Qué se comprobó, qué pasó y qué no ha sido verificado en tu equipo o con cuentas externas |

## Convenciones

- `CLIENT`, `ADMIN` y `SUPER_ADMIN` son roles de la aplicación; `dashboard_app` es un rol diferente de PostgreSQL.
- `store_id` es el nombre SQL; `storeId` es su representación JSON. El usuario autenticado interno conserva los nombres SQL.
- Las firmas en los catálogos usan los nombres del código. Los handlers HTTP y callbacks sin nombre llevan una **etiqueta documental**, no un nombre nuevo en la aplicación.
- Los enlaces `#L...` llevan a líneas del código en GitHub. El inventario debe actualizarse cuando cambie la ubicación de una función.
- `null` significa dato no disponible. `0` significa un valor medido o sintético igual a cero.
- Un estado `credential_saved` confirma almacenamiento cifrado; `connected` indica una sincronización satisfactoria. Ninguno sustituye comprobar permisos y significado de la información recibida.
- Las dependencias exactas instaladas están en `package-lock.json`; los rangos admitidos están en los tres `package.json`.

## Mantener la documentación

Al añadir una función, documenta propósito, parámetros, resultado, algoritmo, efectos secundarios, errores y quién la llama. Al añadir una ruta, actualiza el contrato HTTP y su matriz de permisos. Al modificar SQL, actualiza columnas, restricciones, RLS y diagrama de relaciones. Cambiar una métrica requiere explicar su fuente, período, moneda y denominador.

Las pruebas se describen por lo que realmente ejecutan: las pruebas de proveedores usan `fetch` simulado; las de integración usan PostgreSQL real; las de navegador ejercitan la interfaz y el backend. El estado de una ejecución anterior no garantiza el de una máquina nueva.
