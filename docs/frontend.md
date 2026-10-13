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
| `Experiment` | `{experiment,currency,detailed=false}` | Muestra estado, fechas, variantes, control, barras normalizadas por mayor conversión y confianza proporcionada. En modo detallado agrega visitantes/conversiones/ingresos y aviso estadístico. No determina ganador |
| `Overview` | `{data,navigate}` | Compone 4 métricas, gráfico, hasta 2 experimentos y comportamiento Clarity. Usa `data.store.currency`; periodos Clarity explícitos con `windowDays`; button “Ver pruebas” llama `navigate('experiments')` |
| `ExperimentsPage` | `{data}` | Filtra en memoria todas/en curso/finalizadas; considera completado `completed`, `ended` o `finished`. El backend actual solo emite draft/active/completed. Usa `Experiment` detallado y `Empty`; no solicita otro dataset |
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

### `ConnectForm({provider,storeId,token,onDone,onClose})`

Estado: `account`, `secret`, `busy`, `error`; obtiene etiquetas mediante `PROVIDERS[provider]`. La credencial se conserva temporalmente en estado React, no en localStorage, y se envía solo al guardar. No precarga ni recupera secretos existentes.

`ConnectForm.submit(e)` evita submit HTML, envía `storeId` y `externalAccountId`, más `accessToken` para Shopify o `apiKey` para otros, a `POST /integrations/:provider/connect`. En éxito notifica mediante `onDone` y cierra. En fallo conserva el modal y muestra error; siempre libera busy. El servidor valida pertenencia y cifra; guardar no prueba acceso externo.

### `IntegrationsPage({data,token,user,refresh,notify})`

Estado: `connecting` indica modal abierto; `syncing` el proveedor en curso; `error` registra fallo. Recorre `PROVIDERS` y busca su metadata en `data.integrations` mediante `.find`.

`IntegrationsPage.sync(provider)` hace `POST /integrations/:provider/sync` con tienda actual. En éxito llama `notify` y `refresh`; en fallo muestra mensaje; siempre limpia `syncing`. El callback `refresh` aumenta `Workspace.revision`, que dispara otra lectura del dashboard. En el código actual la rama de fallo no refresca el dashboard: el estado visual puede quedar desactualizado hasta otra lectura.

CLIENT ve metadata y texto “Tu agencia gestiona esta integración”; no ve botones de escritura. Para empleados, `Configurar` abre `ConnectForm`. Los estados se traducen a demo, credencial guardada, sincronizada/lista, atención o desconectada. Un status demo conserva su etiqueta aunque la tienda ya esté en modo live; no significa que sus muestras estén visibles. Intelligems muestra su limitación y deshabilita sync en modo no-demo.

### `UserForm({token,user,stores,onDone,onClose})`

Estado `form={name,email,password,role:'CLIENT',storeId:primeraTienda}`, `busy`, `error`.

- **`UserForm.update(key,value)`:** usa actualización funcional `setForm(previous => ({...previous,[key]:value}))`. Conectada con inputs/selects.
- **`UserForm.submit(e)`:** envía POST `/users`; usa tienda para CLIENT y null para empleados. En éxito llama `onDone`; en fallo deja error; siempre libera busy.
- El selector solo ofrece CLIENT para ADMIN; SUPER_ADMIN obtiene los 3 roles. El backend aplica la misma restricción aunque se manipule HTML. La contraseña inicial requiere 10 caracteres en la interfaz; no hay correo automático de invitación.

### `TeamPage({token,user,stores,notify})`

Estado: usuarios, loading, error y apertura del formulario.

`TeamPage.load()` ejecuta GET `/users`, actualiza lista o error y termina loading. Un efecto lo llama al cambiar token; el botón Reintentar lo llama también. El código no añade bandera de cancelación en este efecto. La tabla muestra rol, alcance y estado; buscar tienda usa `.find`. No permite editar, deshabilitar ni eliminar cuentas.

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
| `storesRevision` | Contador que permite reintentar lectura de tiendas; no polling automático |
| `notice` | Mensaje temporal de operación; desaparece a 6 segundos |
| `mobileOpen` | Visibilidad de sidebar móvil |
| `showStoreForm` | Apertura de alta de tienda |

### Efectos

1. **Tiendas** (`token`, `storesRevision`): GET `/stores`; actualiza lista, conserva selección previa o elige la primera, marca readiness. Un `401` llama `onLogout`; otro error se muestra. Cleanup cambia `cancelled` para ignorar respuesta tras desmontar/repetir.
2. **Dashboard** (`token`, `storeId`, `revision`, `storesReady`): espera tiendas; si no hay id termina loading. Limpia datos anteriores, GET `/dashboard?storeId=...` con `encodeURIComponent`, aplica resultado/error solo si sigue vigente. Un `401` cierra sesión. Cleanup invalida callbacks, no aborta la solicitud HTTP.
3. **Notificación** (`notice`): crea `setTimeout` de 6000 ms; cleanup usa `clearTimeout`.

### Funciones internas

| Función | Entrada / salida | Cómo / conexiones |
| --- | --- | --- |
| `Workspace.navigate(next)` | Clave de `pages` → sin retorno útil | Cambia página y cierra menú móvil. La llaman nav y `Overview` |
| `Workspace.storeCreated(created)` | Store creado → Promise sin resultado de negocio | GET `/stores`; actualiza lista y readiness; selecciona `created.id` o último; cierra modal y notifica. Callback de `StoreForm` |

Los callbacks JSX abren/cerran menú y modal, cambian tienda, incrementan contadores de reintento, limpian notificación o cierran sesión. `visiblePages` elimina Equipo para CLIENT; el selector de tiendas se sustituye por texto para ese rol. El ocultamiento visual complementa autorización del API; no la reemplaza.

`store` se busca en la lista; `period` proviene de las fechas presentes en `data.daily`, no de un calendario editable. La selección de vistas y la tienda no se guardan en URL ni localStorage.

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
