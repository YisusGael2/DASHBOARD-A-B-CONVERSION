# Instrucciones de desarrollo

- Producto para una sola agencia; cada tienda es un tenant. CLIENT pertenece a una tienda; ADMIN y SUPER_ADMIN son empleados con alcance global según permisos.
- Usa el checkout existente. Las tareas en la nube ya están aisladas; no crees worktrees salvo petición explícita.
- No publiques secretos, tokens, `.env` ni respuestas crudas que puedan contener credenciales. Las cuentas demo son públicas y solo se crean con DEMO_MODE=true.
- Mantén la autorización en servidor y RLS. Usa una conexión y una transacción para establecer el contexto y ejecutar cada operación; nunca uses SET persistente.
- No presentes demostraciones como conexiones reales, ni inventes capacidades de APIs. Conserva datos ausentes como null.
- No atribuyas Clarity a una variante A/B sin una unión verificable. No declares ganadores estadísticos sin evidencia del proveedor o un método validado.
- Comprueba `npm test` contra PostgreSQL y `npm run build` al modificar permisos, consultas o interfaz. Usa `npm run test:e2e` para los flujos de navegador.
- Instalación local: `npm run setup`, `docker compose up -d db`, `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`.
