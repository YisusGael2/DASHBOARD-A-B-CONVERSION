# Frontend: componentes, funciones y estado

Implementación principal: [client/src/App.jsx](../client/src/App.jsx). React usa funciones y hooks, sin React Router ni un almacén global adicional. El componente raíz decide entre login y workspace.

## Entrada y constantes

`client/index.html` define idioma español, viewport responsive, color del tema, descripción, título, favicon y `#root`. `main.jsx` importa estilos, ejecuta `createRoot` y monta `<App />` dentro de `React.StrictMode`. En desarrollo StrictMode puede montar/limpiar efectos nuevamente; las banderas de cancelación evitan aplicar ciertas respuestas obsoletas.

| Constante | Contenido | Consumidores |
| --- | --- | --- |
| `ROLE` | Etiquetas españolas de los 3 roles | Sidebar, cabecera, equipo |
| `PROVIDERS` | Nombre, inicial, color, descripción, etiqueta y placeholder de cuenta, etiqueta de secreto de cada proveedor | Login, sidebar, integraciones y `ConnectForm` |
| `demoUsers` | 4 correos públicos y descripción de acceso demo | Botones del login, solo si health indica demo |
| `pages` | Clave, título, subtítulo, etiqueta e icono de Resumen, Pruebas, Integraciones y Equipo | `Workspace.navigate`, cabecera y navegación |

## Funciones de IO y presentación

| Función y firma | Entrada / resultado | Implementación y conexiones |
| --- | --- | --- |
| `request(path, token, options={})` | Ruta sin `/api`, token opcional, opciones fetch → promesa de JSON | Prefija `/api`; añade JSON y Bearer si hay token; mezcla headers opcionales. Error de red produce mensaje de servidor inaccesible. Parsea JSON o usa `{}` si falla; status no-2xx lanza `Error` con `status`. Usada por todas las pantallas con IO; proxy Vite o Express sirven el endpoint |
| `number(value, maximumFractionDigits=0)` | Número/null → texto | Null/undefined retorna “No disponible”; usa `Intl.NumberFormat('es-MX')`. Otros valores no numéricos caen a cero mediante `Number(value)||0`: no sustituye validación de payload |
| `money(value, currency='MXN', compact=false)` | Importe y moneda → texto | Null se conserva como no disponible; formato moneda es-MX, **cero decimales visuales**, opción de notación compacta para eje. No modifica el importe almacenado |
| `percent(value, decimals=1)` | Porcentaje ya multiplicado por 100 → texto | Null se conserva; usa `number` y sufijo %. No vuelve a multiplicar por 100; `2.8` se ve como 2.8% |
| `shortDate(date)` | String fecha/timestamp → texto o raya | Recorta primeros 10 caracteres; crea fecha local al mediodía y muestra día/mes es-MX. No representa la hora ni convierte un timestamp completo a zona de la tienda |
| `timeAgo(date)` | Timestamp/null → texto relativo | Sin timestamp: “Sin sincronizar”; calcula minutos no negativos; muestra momento, minutos, horas o `shortDate`. Conectada con integraciones y pie de página |
| `downloadCsv(filename,headers,rows)` | Nombre, encabezados y matriz → descarga del navegador | Escapa comillas duplicándolas, encierra celdas entre comillas, une con coma/CRLF y antepone BOM UTF-8. Null/no finito pasa a celda vacía. Protege strings que empiezan por =,+,-,@ con apóstrofo para evitar fórmulas. Blob text/csv → URL temporal → enlace download/click/remove → revokeObjectURL diferido. No llama al backend |
| `downloadCsv.escape(value)` | Celda → string CSV | Callback local que implementa conversión, protección de fórmula y escape de comillas. Usado por map de cada fila |
| `confidenceLabel(source)` | Procedencia → etiqueta española | calculated se muestra “Confianza estimada (z)”; demo/sandbox “Confianza simulada”; provider “Confianza del proveedor”. Usada por Experiment y exportación |
| `initials(name)` | Nombre opcional → hasta dos iniciales mayúsculas | Divide por espacios, elimina vacíos, toma dos palabras y une primera letra. Callbacks `filter`/`map` hacen esa selección. Conectada con avatares |

## Componentes de presentación

Estas funciones retornan JSX; no llaman directamente a la base de datos.

| Componente | Props | Qué hace / cómo / conexiones |
| --- | --- | --- |
| `Icon` | `{name,size=20,...props}` | Selecciona paths SVG de un diccionario, fallback `grid`. Transfiere atributos y marca `aria-hidden`. Usado por pantallas, botones y estados |
| `Brand` | `{light=false}` | Logotipo tipográfico y tres barras CSS; variante clara mediante clase. Usado en login, sidebar y carga raíz |
| `Metric` | `{label,value,change,icon,description}` | Tarjeta con valor ya formateado, icono y variación positiva/negativa; sin variación muestra “Sin comparación”. Usa `percent` e `Icon`; llamada desde `Overview` |
| `RevenueChart` | `{daily,currency}` | Gráfico SVG de ingresos con ejes, polilínea, área con gradiente y hover. `useState(hover)` indica día señalado; `useId` identifica gradiente sin colisiones. Si no hay filas usa `Empty`. Consume `money`, `shortDate`, `number` |
| `RevenueChart.x(i)` | Índice → coordenada X | Escala índice al ancho disponible; denominador mínimo 1 permite un solo día. Llamada al construir puntos, ticks y zonas de hover |
| `RevenueChart.y(value)` | Ingreso → coordenada Y | Invierte la escala respecto del máximo (`max*1.15`, mínimo 1) entre margen superior e inferior. Llamada por ejes, puntos y círculo activo |
| `Empty` | `{icon='grid',title,text}` | Estado vacío con icono, título y explicación. Usado cuando no hay datos, experimento, tienda o ante error |
| `Experiment` | `{experiment,currency,detailed=false}` | Muestra estado, fechas, variantes/control, barras y confianza con procedencia. No-control con lift muestra +/− porcentaje vs control; detallado añade conteos, ingreso y calculatedConfidence. Sandbox se etiqueta. No determina ganador |
| `Overview` | `{data,navigate}` | Compone 4 métricas, gráfico, exportación diaria, hasta 2 pruebas y Clarity. Scroll depth se formatea con percent(value,1); windowDays y sandbox explican origen/período. “Ver pruebas” llama navigate |
| `Overview.exportDaily()` | Sin parámetros → descarga CSV | Usa downloadCsv con fecha, ingresos, pedidos, sesiones, moneda y fuente de todas las filas data.daily. Nombre incluye dominio y periodDays; sin filas el botón queda deshabilitado |
| `ExperimentsPage` | `{data}` | Filtra en memoria todas/en curso/finalizadas; considera completed/ended/finished. Usa Experiment detallado; explica snapshots acumulados y supuestos de prueba z. No solicita otro dataset |
| `ExperimentsPage.exportExperiments()` | Sin parámetros → descarga CSV | flatMap genera una fila por variante de todos los experimentos, con fechas/estado/control, conteos, ingreso/moneda, conversión, lift, confianza/origen y fuente. Exporta todas las pruebas del dataset, aunque el filtro visual muestre una parte |
| `Loading` | `{text='Preparando tus datos…'}` | Indicador de espera CSS + texto; sin IO. Usado por login raíz, workspace y equipo |

Los callbacks de `RevenueChart` convierten filas en puntos, etiquetas y rectángulos interactivos; `onMouseEnter` cambia hover y `onMouseLeave` lo limpia. Las barras de la sección decorativa de Clarity son ilustrativas, no una serie temporal recibida de su API.

## `Login({onLogin})`

Estado: `email`, `password`, `busy`, `error`, `demoAvailable`.

- **Efecto inicial:** llama `request('/health', null)`. Si `demoMode===true`, habilita botones de las cuentas demo. La bandera `active` se desactiva al desmontar. Un fallo de health oculta esos botones; no bloquea intentar login.
- **`Login.submit(event)`:** evita submit HTML, marca busy, limpia error, envía `{email,password}` a `/auth/login`. En éxito llama `onLogin(result)` — implementación `App.login`. En fallo muestra `err.message`; siempre libera busy.
- **Callbacks de inputs:** `onChange` actualiza cada campo. Los botones demo rellenan email y contraseña pública, pero no ejecutan login automáticamente.
- **Conexión:** `App` → `Login` → `request` → `POST /api/auth/login` → Argon2/JWT/SQL → `App.login`.

## `Modal({title,onClose,children})`

Mantiene una referencia DOM `dialog`. El efecto guarda foco anterior, enfoca el primer input/select/button y registra `keydown` en `document`.

**`Modal.onKey(e)`:** Escape llama `onClose`. Tab obtiene controles habilitados y mantiene el foco entre primero/último; Shift+Tab en el primero vuelve al último. El cleanup elimina el listener y restaura foco si el elemento anterior sigue conectado.

Click en backdrop cierra; click dentro de la sección usa `stopPropagation`. La sección tiene `role='dialog'`, `aria-modal` y etiqueta. Se conecta con formularios de usuarios, tiendas e integraciones. `onClose` es callback del padre; el efecto depende de su identidad y puede repetirse si esa identidad cambia.

## Formularios y pantallas con IO

### `ConnectForm({provider,store,token,onDone,onClose})`

Estado: `account`, `secret`, `busy`, `error`; obtiene etiquetas mediante `PROVIDERS[provider]`. La credencial se conserva temporalmente en estado React, no en localStorage, y se envía solo al guardar. No precarga ni recupera secretos existentes.

`ConnectForm.submit(e)` evita submit HTML, envía `storeId:store.id` y `externalAccountId`, más `accessToken` para Shopify o `apiKey` para otros, a `POST /integrations/:provider/connect`. En éxito notifica mediante `onDone` y cierra. En fallo conserva el modal y muestra error; siempre libera busy. El servidor valida pertenencia y cifra; guardar no prueba acceso externo.

`ConnectForm.useSandbox()` rellena el identificador con `store.domain` para Shopify o `sandbox-<provider>-<store.id>` para Clarity/Intelligems, y el secreto con `mock_<provider>_sandbox_token`. Limpia error, sin enviar todavía ninguna petición. El empleado revisa y guarda el formulario; después pulsa Sincronizar. El botón queda deshabilitado mientras se guarda.

### `IntegrationsPage({data,token,user,refresh,notify,syncError,onSyncError})`

Estado: connecting/modal y syncing/proveedor; syncError viene del workspace, asociado a la tienda actual. syncRuns, historyLoading, historyError e historyRevision controlan la tabla. Recorre PROVIDERS y busca DTO en data.integrations mediante find.

`IntegrationsPage.sync(provider)` limpia el error de esa tienda mediante onSyncError y hace POST `/integrations/:provider/sync`. En éxito notifica; en fallo pasa el mensaje HTTP seguro a onSyncError. Finalmente limpia syncing, incrementa historyRevision y llama refresh incluso al fallar. Workspace.integrationErrors conserva el mensaje por tienda aunque recargar dashboard desmonte IntegrationsPage; no muestra el error de otra tienda. refresh aumenta Workspace.revision y dispara otra lectura del dashboard.

El efecto de historial depende de token, data.store.id y historyRevision. Limpia la tabla/error anterior, marca carga y consulta GET `/sync-runs?storeId=...`; aplica resultado solo mientras active sigue true. Cleanup invalida la respuesta de una tienda anterior. Actualizar incrementa historyRevision. La tabla muestra proveedor, estado traducido, timeAgo de inicio con timestamp completo en title, filas procesadas y diagnóstico seguro.

CLIENT ve metadata, historial de su tienda y texto “Tu agencia gestiona esta integración”; no ve botones de escritura. Configurar abre ConnectForm para empleados. Los estados se traducen a demo, credencial guardada, sincronizada/lista, atención o desconectada. Sync se habilita para credential_saved/connected/error en los tres proveedores y se bloquea mientras otro sync está en curso. Un status demo conserva su etiqueta aunque la tienda ya esté live; no significa muestras visibles. sandbox:true añade etiqueta explícita Sandbox.

### `UserForm({token,user,stores,onDone,onClose})`

Estado `form={name,email,password,role:'CLIENT',storeId:primeraTienda}`, `busy`, `error`.

- **`UserForm.update(key,value)`:** usa actualización funcional `setForm(previous => ({...previous,[key]:value}))`. Conectada con inputs/selects.
- **`UserForm.submit(e)`:** envía POST `/users`; usa tienda para CLIENT y null para empleados. En éxito llama `onDone`; en fallo deja error; siempre libera busy.
- El selector solo ofrece CLIENT para ADMIN; SUPER_ADMIN obtiene los 3 roles. El backend aplica la misma restricción aunque se manipule HTML. La contraseña inicial requiere 10 caracteres en la interfaz; no hay correo automático de invitación.

### `TeamPage({token,user,stores,notify})`

Estado: usuarios, auditoría, loading, errores independientes, revision y apertura del formulario. Solo ADMIN/SUPER_ADMIN renderizan contenido.

`TeamPage.load()` incrementa revision para repetir el efecto. Este depende de token/rol/revision y consulta `/users` y `/audit-events` en paralelo con Promise.allSettled: conserva el error de cada sección por separado y aplica resultados únicamente si active sigue true. Cleanup invalida respuestas tras desmontar. Actualizar, Reintentar y alta exitosa vuelven a cargar ambos datasets.

La tabla de usuarios muestra rol, alcance y estado; buscar tienda usa find. Auditoría muestra etiqueta española de acción, código original, correo del actor, tienda/agencia y fecha relativa con timestamp completo en title. Las etiquetas de auditActions contemplan user.created, store.created, integration.connected e integration.synced. No permite editar, deshabilitar ni eliminar cuentas o eventos.

`onDone` de `UserForm` cierra el modal, vuelve a llamar `load` y publica notificación. La función `notify` llega de `Workspace.setNotice`.

### `StoreForm({token,onDone,onClose})`

Estado inicial: `{name:'',domain:'',currency:'MXN',timeZone:'America/Mexico_City'}`, busy y error.

`StoreForm.update(key,value)` actualiza el formulario como el de usuarios. `StoreForm.submit(e)` envía POST `/stores`; espera `onDone(result.store)` para refrescar/seleccionar la tienda; conserva error si falla. No inicia conexión Shopify ni crea un usuario cliente automáticamente.

El input de dominio tiene pattern canónico; backend también lo valida. El selector admite MXN, USD, EUR, COP, ARS, CLP, PEN, CAD y GBP; el API admite cualquier código de tres mayúsculas, sin catálogo económico adicional.

## `Workspace({token,user,onLogout})`

### Estado y procedencia

| Estado | Propósito / fuente |
| --- | --- |
| `page` | Vista actual, comienza `overview` |
| `stores`, `storesReady` | Tiendas permitidas devueltas por API y preparación de su carga |
| `storeId` | Tienda seleccionada; para CLIENT comienza con `user.storeId` |
| `data` | Último dashboard de esa tienda, no datos globales |
| `loading`, `error` | Estado de lectura de datos |
| `revision` | Contador que fuerza nueva lectura del dashboard |
| `periodDays` | Ventana seleccionada 7/14/28, comienza 14 |
| `integrationErrors` | Mensajes HTTP de sync por storeId; conserva el diagnóstico al refrescar/desmontar IntegrationsPage |
| `storesRevision` | Contador que permite reintentar lectura de tiendas; no polling automático |
| `notice` | Mensaje temporal de operación; desaparece a 6 segundos |
| `mobileOpen` | Visibilidad de sidebar móvil |
| `showStoreForm` | Apertura de alta de tienda |

### Efectos

1. **Tiendas** (`token`, `storesRevision`): GET `/stores`; actualiza lista, conserva selección previa o elige la primera, marca readiness. Un `401` llama `onLogout`; otro error se muestra. Cleanup cambia `cancelled` para ignorar respuesta tras desmontar/repetir.
2. **Dashboard** (`token`, `storeId`, `periodDays`, `revision`, `storesReady`): espera tiendas; si no hay id termina loading. Limpia datos anteriores, GET `/dashboard?storeId=...&days=<periodDays>` con encodeURIComponent, aplica resultado/error solo si sigue vigente. Un 401 cierra sesión. Cleanup invalida callbacks, no aborta la solicitud HTTP.
3. **Notificación** (`notice`): crea `setTimeout` de 6000 ms; cleanup usa `clearTimeout`.

### Funciones internas

| Función | Entrada / salida | Cómo / conexiones |
| --- | --- | --- |
| `Workspace.navigate(next)` | Clave de `pages` → sin retorno útil | Cambia página y cierra menú móvil. La llaman nav y `Overview` |
| `Workspace.storeCreated(created)` | Store creado → Promise sin resultado de negocio | GET `/stores`; actualiza lista y readiness; selecciona `created.id` o último; cierra modal y notifica. Callback de `StoreForm` |

Los callbacks JSX abren/cerran menú y modal, cambian tienda, incrementan contadores de reintento, limpian notificación o cierran sesión. `visiblePages` elimina Equipo para CLIENT; el selector de tiendas se sustituye por texto para ese rol. El ocultamiento visual complementa autorización del API; no la reemplaza.

Para empleados, el select nativo y su flecha viven juntos en `store-select-control`. La flecha tiene `pointer-events:none`, por lo que el clic atraviesa el dibujo y llega al select, incluida su zona de padding. Se conserva la navegación por teclado del control nativo.

El botón explícito **Cerrar sesión** está en la cabecera sticky y llama directamente a `onLogout` (`App.logout`). El perfil de la barra lateral muestra identidad y rol, sin ser un botón oculto de logout. La barra lateral tiene scroll y sus hijos no se comprimen: las ventanas de poca altura no dejan acciones fuera de alcance.

`store` se busca en la lista; `period` describe las fechas presentes en data.daily. En overview-toolbar un control segmented ofrece 7D/14D/28D, marca aria-pressed y actualiza periodDays; el efecto vuelve a consultar API. No ofrece fechas arbitrarias. Las vistas, tienda y período no se guardan en URL ni localStorage.

El banner del workspace diferencia demo de live y, si data.sandbox es true, señala la simulación. Cada integración, experimento y snapshot Clarity mantiene su propia etiqueta, porque una tienda puede combinar fuentes sintéticas y externas.

## `App()` y sesión

Estado: `token` leído de `localStorage.centraliza_token`, `user`, `checking`, `connectionError`.

- **`App.login(result)`:** guarda el token en localStorage y actualiza token/usuario con el resultado del login. El efecto de token vuelve a confirmar usuario vigente mediante `/auth/me`.
- **`App.logout()`:** elimina token del navegador y limpia estado. **No invalida el JWT en el servidor**; no existe endpoint de revocación.
- **Efecto de sesión** (`token`): sin token termina checking; con token GET `/auth/me`, aplica usuario o error usando bandera `cancelled`. `401/403` llama logout; otra falla muestra pantalla de conexión con reintento. Cleanup invalida callbacks pendientes.
- Renderiza carga, error de conexión, Workspace o Login según el estado. Reintentar conexión recarga la página mediante `window.location.reload`.

## CSS y accesibilidad

`styles.css` organiza login, sidebar, topbar, métricas, SVG, experimentos, comportamiento, integraciones, tabla, modales, formularios, toast, loaders y variantes responsive. Tokens principales: `--ink`, `--muted`, `--teal`, `--line`, `--navy`. Los iconos usan currentColor. Hay focus-visible, etiquetas de inputs, estados `role='alert'`, notificaciones `role='status'`, navegación etiquetada y control de foco del modal.

Las fuentes DM Sans y Manrope se solicitan con `@import` de Google Fonts; si no hay acceso, se usa sans-serif. Esto es una petición externa de presentación, independiente de Shopify/Clarity/Intelligems. El [inventario de estilos](inventario-estilos.md) registra todos los selectores, propiedades y reglas responsive.

El [inventario de funciones](inventario-funciones.md) registra también todos los callbacks anónimos de render, eventos, promesas, efectos y limpieza, con firma y llamadas directas.
