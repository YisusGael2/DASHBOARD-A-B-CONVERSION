import { randomBytes } from 'node:crypto';
import { writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
try {
  await access(envFile);
  console.log('.env ya existe; se conserva sin modificaciones.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const adminPassword = randomBytes(24).toString('hex');
  const appPassword = randomBytes(24).toString('hex');
  const contents = [
    '# Configuración local generada. No subir a Git ni reutilizar en producción.',
    'DEMO_MODE=true',
    'PORT=3001',
    'APP_PORT=8080',
    'DB_PORT=5432',
    `POSTGRES_PASSWORD=${adminPassword}`,
    `APP_DB_PASSWORD=${appPassword}`,
    `DATABASE_ADMIN_URL=postgresql://postgres:${adminPassword}@127.0.0.1:5432/centraliza`,
    `DATABASE_URL=postgresql://dashboard_app:${appPassword}@127.0.0.1:5432/centraliza`,
    `JWT_SECRET=${randomBytes(48).toString('hex')}`,
    `CREDENTIAL_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    'SHOPIFY_API_VERSION=2026-07',
    '',
  ].join('\n');
  await writeFile(envFile, contents, { mode: 0o600, flag: 'wx' });
  console.log('.env creado con claves aleatorias. No se han mostrado sus valores.');
}
