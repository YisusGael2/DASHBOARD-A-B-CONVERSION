# Seguridad implementada y límites del MVP

## Autenticación y roles

JWT HS256 dura 8 horas, con algoritmo permitido, emisor, audiencia y expiración comprobados. `sub` identifica la cuenta; la aplicación lee rol/estado/tienda de PostgreSQL en cada petición. Un cambio SQL de estado/rol afecta peticiones posteriores incluso con JWT anterior.

La contraseña se guarda como hash Argon2id. Login utiliza un hash ficticio cuando no encuentra la cuenta y responde con el mismo mensaje para cuenta inexistente/incorrecta/inactiva. La limitación es 30 intentos por IP cada 15 minutos, en memoria del proceso.

| Rol | Capacidades HTTP actuales | No implementado por esa descripción |
| --- | --- | --- |
| CLIENT | Leer perfil, tienda propia, dashboard, metadata e historial de integraciones | Escribir métricas, gestionar usuarios/tiendas, leer credenciales o auditoría |
| ADMIN | Leer todas las tiendas/auditoría, crear tiendas/clientes, conectar y sincronizar | Crear empleados, elevarse a Super Admin, editar/eliminar cuentas mediante API |
| SUPER_ADMIN | Todo lo anterior y crear cuentas de los 3 roles | No implica una pantalla de configuración global ni editor de roles existente |

La jerarquía no es herencia ilimitada automática: las rutas y RLS aplican condiciones concretas.

## Defensa por filas y claves

La cuenta DB de runtime no es dueña de tablas, superusuario ni BYPASSRLS. Se fuerza RLS; cada operación usa la misma conexión y contexto local de transacción. CLIENT no recibe tienda global desde el cuerpo/query. Claves compuestas impiden relaciones de tiendas diferentes aun cuando una FK simple de id sería válida.

SELECT directo sobre users excluye password_hash por grants de columnas. Metadata de usuarios puede ser visible a staff por SQL, pero GET/users reduce lo que un ADMIN recibe a CLIENT. La tabla de credenciales tiene cero acceso directo para dashboard_app; funciones SECURITY DEFINER guardadas permiten el uso interno a staff.

**Frontera de confianza:** el backend autentica y establece app.role/app.user_id/app.store_id. RLS limita consultas de ese backend ante filtros equivocados; no protege de alguien que ya controla el proceso, su cuenta DB o esas variables de sesión. Las funciones privadas de autenticación retornan hashes internamente y no deben exponerse como API genérica de SQL.

## Credenciales, cifrado y comunicación

Credenciales externas se cifran con AES-256-GCM, IV aleatorio y tag de autenticación; clave de 32 bytes fuera de PostgreSQL. Ciphertext, clave y token no forman parte de DTO público. El frontend conserva el secreto solo mientras el modal está abierto; no existe lectura de clave de vuelta.

En Docker se separa bootstrap privilegiado y app limitado. En desarrollo con Node, config.js puede cargar también la URL administrativa desde .env; ese proceso local es de confianza y esa separación no es idéntica a los contenedores.

Los adaptadores aceptan destinos fijos/canónicos, no siguen redirects y verifican TLS. Limitan tamaño y tiempo; sanitizan errores externos. El constructor `ProviderError` conserva códigos diagnósticos para pruebas/uso interno, pero el API devuelve mensaje y status.

publicSyncRun no publica error arbitrario guardado en PostgreSQL: entrega diagnóstico genérico controlado. publicAuditEvent proyecta metadata mediante campos/tipos permitidos por acción. Los joins de actor usan solo correo público; nunca hash. La exportación CSV protege strings que podrían interpretarse como fórmulas y conserva valores numéricos negativos como números.

El modo local usa HTTP en loopback. No es transporte apropiado para enviar credenciales por Internet; un despliegue público requiere HTTPS y una configuración de origen/sesión validada.

## Estado del navegador y cierre de sesión

JWT se guarda en localStorage y está disponible a JavaScript del origen. Logout elimina la copia local, no revoca un JWT copiado ni mantiene lista de revocación. No hay refresh token, cookies HttpOnly, MFA, recuperación de contraseña ni sesiones administrables.

Helmet aplica headers de seguridad. React escapa texto renderizado; no hay uso propio de dangerouslySetInnerHTML. Esto no convierte la aplicación en inmune a XSS ni sustituye proteger las dependencias y el origen.

## Demo: lo que controla y lo que no

DEMO_MODE controla la inserción del seed, los botones demo y la selección de fuentes. Poner false **no elimina ni deshabilita las cuatro cuentas demo previamente creadas**. Para una base real nueva se omite seed y se crea primer Super Admin propio. No reutilices un volumen demo como base pública suponiendo que false quita sus cuentas.

Guardar una credencial de cualquier proveedor mueve el dashboard entero de esa tienda a live; deja los ejemplos en DB. Un error real mantiene ese modo. Conectar no verifica que Clarity token corresponda al external_id introducido: esa correspondencia debe confirmarse externamente.

Sandbox utiliza token mock_/sandbox_ o MOCK_PROVIDERS=true, después de las mismas validaciones. Cifra/descifra e importa por los mismos permisos y RLS; los DTO exponen flags sandbox sin credenciales. Connected con sandbox:true significa importación sintética satisfactoria, no validación de la cuenta externa. La procedencia de la caché solo cambia tras una sync exitosa; guardar otra credencial no acredita datos nuevos.

## Límites observados que deben guiar el siguiente desarrollo

| Área | Comportamiento existente / trabajo pendiente |
| --- | --- |
| Integraciones | Los tres adaptadores están implementados y requieren validación con cuentas/documentación vigente; Intelligems sigue el contrato solicitado |
| Instalación Shopify | Token manual; OAuth, scopes comprobados, webhooks y revocación no implementados |
| Usuarios | Crear/listar; sin edición, eliminación, invitación enviada, recuperación ni pantalla para desactivar |
| Validación JSON | Parser y campos normales validados; cuerpos ausentes/null no se manejan uniformemente y pueden producir 500 |
| Contraseñas de alta | textValue recorta espacios externos; la contraseña resultante puede diferir de lo tecleado. Sin política más allá de longitud |
| Auditoría | Alta de usuario/tienda, configuración y sync exitosa; lectura/UI para empleados. No registra todas las operaciones |
| Sincronización | Manual, síncrona; sin cola, cron, bloqueo de concurrencia o recuperación de runs running |
| Reconfigurar integración | Puede conservar last_synced_at/resultados anteriores al reemplazar credencial; nueva lectura exitosa todavía debe comprobarse |
| Roles en ejecución larga | Se resuelven al inicio de petición; una sync ya en curso no vuelve a consultar permisos entre fases |
| Métricas | Variaciones exigen dos períodos completos; un período parcial muestra solo totales conocidos. Variantes usan último snapshot por fuente/moneda. La prueba z asume visitantes independientes/conversión binaria y no corrige múltiples comparaciones; revenue no es utilidad |
| Precisión | BigInt en adaptador, numeric(18,2) en DB, Number en agregado/JSON y sin decimales en UI |
| Estados | stores.paused no bloquea auth/sync; no lifecycle de tiendas implementado |
| Timestamps | No trigger updated_at ni actualización consistente por handlers |
| Migraciones | Esquema reinstalable actual, sin historial incremental versionado |
| Escala | Pool 10, limitador en memoria, GET/users 500 sin paginación; una sola agencia |
| Testing | Suites de proveedores, SQL/API, analítica/DTO y navegador; no una certificación completa ni pruebas de cuentas externas reales |

Esta lista describe la implementación actual y separa futuras tareas de funcionalidades existentes.
