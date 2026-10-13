# Cómo abrirlo y probarlo en tu equipo

Esta guía usa la demo local y no necesita cuentas reales de Shopify, Clarity ni Intelligems.

## 1. Abrir la aplicación

Abre Docker Desktop. Abre una terminal en la carpeta del proyecto — la que contiene package.json y compose.yaml. Comprueba:

```bash
node --version
docker --version
docker compose version
```

Se recomienda Node 24; mínimo 22.12. Ejecuta:

```bash
npm run local:up
docker compose ps
```

Espera que db y app aparezcan healthy. bootstrap termina, así que no necesita permanecer running; puedes verlo con `docker compose ps -a`. Abre en tu navegador:

```text
http://localhost:8080
```

En este camino no necesitas `npm ci` en tu equipo para iniciar la app: Docker instala sus propias dependencias. Sí lo necesitas para ejecutar los tests desde la terminal del host.

**Si ya tienes el proyecto con Git**, actualiza primero desde esa misma carpeta:

```bash
git pull origin main
npm run local:up
```

Recarga `http://localhost:8080` al terminar. local:up reconstruye la imagen con el código actualizado; conserva .env y la base local. Si descargaste un ZIP, descarga la nueva versión en otra carpeta y conserva tu configuración/datos de forma explícita: git pull requiere un checkout Git.

## 2. Cuentas y resultado esperado

Todas las cuentas demo nuevas usan **`Demo1234!`**.

| Cuenta | Rol | Qué debes ver |
| --- | --- | --- |
| super@demo.local | SUPER_ADMIN | Nómada Studio, Casa Botánica, alta de tiendas y accesos de empleados/clientes |
| admin@demo.local | ADMIN | Ambas tiendas; crear accesos únicamente CLIENT |
| cliente@demo.local | CLIENT | Nómada Studio; sin selector de otras tiendas ni administración de equipo |
| otro@demo.local | CLIENT | Casa Botánica; sin acceso a Nómada Studio |

Las pantallas deben indicar DEMO. Los importes y resultados son ficticios. La selección inicial de un empleado depende del orden alfabético de tiendas, no necesariamente Nómada.

## 3. Recorrido manual completo

1. **Super Admin:** entra, cambia tienda y comprueba dominio/valores diferentes. Abre Equipo y accesos; deben verse empleados y clientes. Abre Crear acceso y comprueba los 3 roles; al elegir empleado desaparece tienda. Cancela si solo quieres revisar.
2. **Admin:** cierra sesión y entra con admin@demo.local. Debe poder cambiar tienda. En Crear acceso solo debe aparecer CLIENT, con tienda obligatoria. No debe ofrecer crear un empleado.
3. **Cliente A:** entra con cliente@demo.local. Debe mostrar Nómada Studio y sus métricas; no selector global ni Equipo. Abre Integraciones: solo metadata, sin Configurar/Sincronizar.
4. **Cliente B:** entra con otro@demo.local. Debe mostrar Casa Botánica; cambiar la interfaz o parámetros no le concede otra tienda.
5. **Pruebas A/B:** abre las pruebas, alterna Todas/En curso/Finalizadas. Revisa control, variantes, visitantes y confianza demo. La tasa más alta no debe presentarse como ganador estadístico automático.
6. **Nueva tienda:** como empleado usa Añadir tienda, un dominio de prueba canónico como prueba-local-agencia.myshopify.com, moneda y zona. Debe aparecer vacía, con valores “No disponible”; crear tienda no importa datos ni contacta Shopify.
7. **Nuevo cliente:** crea un acceso CLIENT asignado a esa tienda con correo de prueba único y contraseña elegida localmente; entra con esa cuenta y comprueba que solo ve esa tienda vacía. Es una creación real en tu DB local, no se envía una invitación por correo.
8. **Móvil:** abre herramientas de desarrollador y viewport de 390 px. El menú debe abrir/cerrar y las pantallas no deben exigir scroll horizontal global. Revisa modales con Tab, Shift+Tab y Escape.
9. **Sesión:** recarga página para restaurarla; pulsa **Cerrar sesión** en la cabecera para eliminar token del navegador. Debe volver al login con un solo clic, también en una ventana baja. La vista vuelve a Resumen al recargar. Logout no revoca un token ya copiado; esa función de servidor está pendiente.

Al cambiar de tienda, comprueba que la lista se abra al pulsar la **flecha**, además del nombre; el control sigue permitiendo usar teclado.

Guardar cualquier credencial cambia toda esa tienda a fuente live y oculta sus muestras. Usa la nueva tienda de prueba para configurar Sandbox sin cambiar Nómada/Casa Botánica.

## 4. Recorrido Sandbox sin cuentas externas

1. Entra con **admin@demo.local** o Super Admin. Añade una tienda con nombre “Prueba Sandbox”, un dominio único como `prueba-sandbox-agencia.myshopify.com`, moneda MXN y zona America/Mexico_City. Usa otro dominio si ya lo creaste.
2. Abre **Integraciones → Shopify → Configurar**. Pulsa **Usar credencial Sandbox (mock_)**: el dominio debe coincidir con el de esa tienda y el token queda rellenado. Pulsa **Guardar configuración**; el estado debe ser “Credencial guardada”. Todavía no hay importación.
3. Pulsa **Sincronizar**. Debe aparecer estado Sandbox/sincronizada y una ejecución “Completada” con 28 filas. El resumen muestra ingresos/pedidos; sesiones y conversión Shopify permanecen “No disponible” porque el importador de pedidos no proporciona ese denominador.
4. Repite **Configurar → Usar credencial Sandbox → Guardar → Sincronizar** para Clarity. Debe registrar 1 fila y mostrar sesiones, clics, regresos y **Profundidad de scroll 68.5%**. La tarjeta indica snapshot de 3 días.
5. Repite para Intelligems. Debe registrar 6 filas: 2 experimentos y 4 métricas de variante. Pruebas A/B muestra una prueba En curso y otra Finalizada, cada una con Control/Variante B, tasas, lift y confianza con procedencia simulada. No declara ganador.
6. En Resumen selecciona **7D**, **14D** y **28D**. La API devuelve el período elegido y el gráfico cambia. El snapshot Clarity sigue con su propio período; los experimentos muestran su resultado acumulado. Con solo 28 días importados no existen 28 días anteriores completos para comparar esa ventana.
7. Pulsa **Exportar CSV** en Resumen y Pruebas A/B. Abre los archivos: deben conservar caracteres españoles, moneda y fuente Sandbox; el de experimentos contiene una fila por variante de todas las pruebas, independiente del filtro visual.
8. Regresa a Integraciones: el **Historial de sincronizaciones** muestra los tres proveedores, estados, hora, filas y diagnóstico. Repetir sync el mismo día añade una ejecución, pero reemplaza métricas de la misma clave; no duplica filas o visitantes.
9. En **Equipo y accesos → Registro de auditoría**, revisa creación de tienda, configuración y sincronización de cada integración con el correo del actor y la tienda.
10. Crea un CLIENT asignado a la tienda Sandbox. Al entrar con ese usuario podrá leer sus métricas e historial; no tendrá botones de escritura ni acceso a auditoría o a otras tiendas.

Sandbox no hace peticiones externas. Conserva el flujo real de cifrado, descifrado, upsert y RLS. Un token `mock_...` o `sandbox_...` lo activa por integración; no necesitas cambiar .env. La alternativa `MOCK_PROVIDERS=true` activa simulación global y requiere reiniciar el proceso/contenedor. Las credenciales vacías y dominios/ventanas/zonas inválidos siguen siendo errores.

## 5. Comprobar aislamiento desde la consola del navegador

Con cliente@demo.local autenticado, abre DevTools → Console. Este ejemplo usa el token que ya está en el navegador **sin imprimirlo**:

```javascript
const response = await fetch('/api/dashboard?storeId=22222222-2222-4222-8222-222222222222', {
  headers: { Authorization: `Bearer ${localStorage.getItem('centraliza_token')}` }
});
console.log(response.status); // Debe ser 403
console.log(await response.json()); // Mensaje de acceso denegado
```

Ese id es Casa Botánica. El id de Nómada es `11111111-1111-4111-8111-111111111111`. Invirtiendo cuenta e id también debe rechazarse. No publiques la pestaña Network ni copies JWT de usuarios reales al pedir ayuda.

También debe responder 403 a `/api/sync-runs?storeId=<otra-tienda>` y a `/api/audit-events` como CLIENT. No cambies el JWT ni el contexto RLS para probar estos rechazos.

## 6. Pruebas automáticas del backend y adaptadores

Con db arrancada y demo preparada:

```bash
npm ci
npm test
npm run build
```

Resultado esperado: todos los casos pasan,0 failed,0 skipped. El recuento actual de la ejecución verificada está en [Validación](validacion.md). Build debe generar client/dist sin errores. La suite de integración crea filas temporales y consulta con rol limitado/administrativo; usa una DB local de demo, no una de clientes reales.

Si aún no existe esquema/demo en esa DB, prepara antes:

```bash
npm run setup
docker compose up -d db
npm run db:migrate
npm run db:seed
```

No ejecutes setup después de borrar .env conservando un volumen cuya configuración necesitas recuperar. Para verificar solo adaptadores sin PostgreSQL:

```bash
node --test server/providers/providers.test.js
```

La suite usa fetch controlado y tokens Sandbox; no conecta cuentas externas.

## 7. Pruebas automáticas en navegador

Con app Docker healthy en el puerto predeterminado 8080 y `npm ci` ya ejecutado:

```bash
npx playwright install chromium
npm run test:e2e
```

Resultado esperado: todos los flujos pasan. El navegador es headless, por lo que no necesariamente verás una ventana. Para verlo durante la prueba:

```bash
npm run test:e2e -- --headed
```

Si quieres usar un Chromium ya instalado en Linux, por ejemplo:

```bash
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

En PowerShell define `PLAYWRIGHT_EXECUTABLE_PATH` con la ruta real de tu navegador instalado y después ejecuta el comando. No necesita contener una credencial.

Playwright usa por defecto 8080. Si no hay servidor, intenta iniciar npm start con NODE_ENV=production y PORT=8080; ese flujo necesita DB, demo y client/dist preparados. Si modificaste APP_PORT, conserva 8080 para el recorrido predeterminado o revisa la configuración completa, no solo E2E_BASE_URL.

## 8. Qué verifica cada caso

### PostgreSQL/API — `server/test/integration.test.js`

| Caso | Evidencia |
| --- | --- |
| Health/login | PostgreSQL responde; credencial errónea 401; recurso sin sesión 401 |
| Dos clientes | Cada cuenta recibe una tienda y no puede consultar la otra |
| Admin y cliente | Admin ve ambas; cliente no administra usuarios/tiendas/integraciones |
| JWT | Rechaza algoritmo, issuer o audience incorrectos; ignora rol enviado en claims |
| RLS directo | Consulta SQL sin filtro solo ve tenant; escritura cliente y lectura de credenciales denegadas |
| Pooling | Reutiliza el mismo PID DB y comprueba limpieza tras rollback; sin contexto no ve tiendas |
| Escalamiento | Admin no crea personal ni eleva CLIENT por SQL; Super Admin sí crea empleado |
| Cifrado/fuentes | Envelope no contiene token plano; DTO no lo devuelve; connect queda credential_saved y sync Sandbox queda connected con procedencia explícita |
| Importador Intelligems | Persiste pruebas, variantes y snapshots; cuenta filas, mantiene idempotencia y cambia control sin violar índice único |
| Períodos/scroll | days=7/28 responde 200 con periodDays correcto; days=15 responde 400; compara períodos completos y deja cambios null con cobertura parcial; scroll depth disponible se conserva |
| Históricos/roles | CLIENT consulta solo sus runs y recibe 403 para otra tienda/auditoría; empleados leen auditoría |
| Unicidad/relaciones | Repetir upsert no duplica; variante no puede apuntar a prueba de otra tienda |
| Permisos vigentes | JWT anterior no conserva rol antiguo; cuenta deshabilitada pierde acceso |

### Proveedores — `server/providers/providers.test.js`

| Caso | Evidencia |
| --- | --- |
| Dominio Shopify | Rechaza destino no canónico antes de fetch |
| Importes/población | Suma exacta, deduplica, excluye test/cancelados |
| Días sin pedidos | Conserva cero de días realmente consultados |
| Paginación | No retorna antes de leer las páginas |
| Cursor repetido | No entra en bucle ni retorna parcial |
| Monedas | Rechaza mezcla incompatible |
| Error HTTP | No revela cuerpo ni credenciales upstream |
| Error de red | No propaga mensaje que pueda contener secreto |
| HTTP429 | Reintentos acotados |
| Snapshot Clarity | Preserva ventana; no convierte porcentajes a conteos |
| Respuesta inesperada | Rechaza estructura no compatible |
| Intelligems | Normaliza experiences/experiments, variantes, fechas, importes y confianza; estructuras inválidas fallan sin publicar payload |
| Sandbox | mock_/sandbox_ y variable global generan datos deterministas sin fetch; siguen validando dominio/token/período/zona |
| Proveedor desconocido | Despacho no compatible responde 400 |

### Analítica y DTOs — `server/test/analytics.test.js`, `server/test/security.test.js`

La suite matemática compara la prueba z con un resultado de referencia, inversión de grupos, tasas iguales, base de control cero, tasas degeneradas, confianza extrema y conteos incompatibles. Las pruebas de DTO comprueban contrato público, diagnóstico genérico y filtrado de metadata por acción, incluidos secretos adicionales y objetos anidados. Estas suites no consultan cuentas externas ni requieren consultas propias de PostgreSQL.

### Navegador — `tests/browser/dashboard.spec.js`

| Caso | Evidencia |
| --- | --- |
| Login inválido | Error visible y sin navegación privada |
| Cliente | Tienda propia, API403 otra, tabs, persistencia y logout |
| Admin | Cambio de tienda y formulario con solo rol CLIENT |
| Flecha del selector | Clic en el dibujo alcanza el select nativo; abre el control, cambia opción y carga la tienda |
| Logout en ventana baja | Botón dentro de viewport 1280×540; clic en icono cierra, elimina token y no restaura sesión al recargar |
| Super Admin | Empleados visibles y formulario con 3 roles |
| Móvil | 390×540, menú funcional, ancho sin desbordamiento global y logout accesible |
| Nueva tienda/conexión | Alta por UI; cuatro valores no disponibles; credencial guardada no equivale a sincronización |
| Flujo Sandbox | Configura/sincroniza los 3 proveedores, conserva etiquetas sintéticas, carga métricas e históricos |
| Analítica/exportación | Selector de días, scroll, lift/procedencia de confianza y descargas CSV con BOM/escape |
| Auditoría | Sección disponible para empleados con acciones y actor; no aparece para CLIENT |

## 9. Funciones auxiliares de pruebas

| Archivo y función | Cómo / conexiones |
| --- | --- |
| integración `request(path,{token,body,method='GET'}={})` | Fetch al servidor efímero que abre la suite, añade headers/body y retorna `{status,body}`; llamada por todos los casos HTTP |
| integración `signIn(email)` | Usa request con contraseña demo; exige 200 y ausencia de hash; retorna JWT internamente |
| integración `before` | Valida config/demo, fuerza pool max1, abre Express en puerto efímero y autentica 4 cuentas |
| integración `after` | Borra solo fixtures registrados de prueba y sus dependencias; cierra server/pools; no es reset de la DB |
| proveedores `stubFetch(t,fn)` | Sustituye globalThis.fetch y registra t.after para restaurarlo |
| proveedores `response(value,status=200,headers={})` | Construye Response con JSON/Content-Type para fixtures |
| proveedores `order(id,amount,extras={})` | Crea edge/node de pedido, fecha actual, flags y moneySet; extras permite probar casos |
| proveedores `orders(edges,pageInfo=...)` | Envuelve edges/pageInfo en data.orders del contrato GraphQL |
| proveedores `environment(t,key,value)` | Guarda variable de entorno anterior, asigna/elimina el valor de prueba y registra restauración mediante t.after; aísla MOCK_PROVIDERS/versión entre casos |
| proveedores `experience(extras={})` | Fixture normalizado de payload Intelligems con variantes; extras permite probar alias, formatos y rechazos |
| navegador `signIn(page,email)` | Abre /, rellena login, envía, espera cabecera y fin de carga |
| navegador `nav(page,name)` | Localiza botón exacto dentro de navegación principal |

Los callbacks de cada test contienen sus aserciones y operaciones descritas en las matrices. El último caso de navegador limpia tienda e integración temporales con URL administrativa en finally. Las pruebas de JWT construyen tokens solo para la suite; no requieren tokens de proveedores reales.

## 10. Leer fallas, detener y pedir ayuda

```bash
docker compose logs --tail=80 app bootstrap
docker compose ps -a
npm run local:down
```

Down conserva datos. Una prueba fallida debe investigarse: no la saltes para declarar listo el entorno. Los rastros Playwright están en test-results/ y se conservan solo ante fallo; podrían contener sesión y datos, así que no los publiques sin revisión.

Para diagnosticar en tu máquina comparte el comando ejecutado, su mensaje de error y tu sistema operativo. No compartas .env, contraseñas, JWT o tokens reales. La validación realizada por el desarrollador no sustituye ejecutar estas comprobaciones en tu equipo.
