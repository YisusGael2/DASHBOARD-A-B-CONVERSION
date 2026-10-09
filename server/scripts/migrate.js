import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { config } from '../src/config.js';

if (!config.databaseAdminUrl || !config.databaseUrl) throw new Error('La migración necesita DATABASE_ADMIN_URL y DATABASE_URL.');
const runtime = new URL(config.databaseUrl);
const username = decodeURIComponent(runtime.username);
const password = decodeURIComponent(runtime.password);
if (username !== 'dashboard_app' || !password) throw new Error('DATABASE_URL debe usar dashboard_app con una contraseña.');
const client = new pg.Client({ connectionString: config.databaseAdminUrl });
await client.connect();
try {
  const admin = await client.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user');
  if (!admin.rows[0]?.rolsuper) throw new Error('Ejecuta migraciones con la cuenta PostgreSQL de bootstrap (superusuario), nunca con dashboard_app.');
  const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [username]);
  // PostgreSQL DDL no acepta parámetros para PASSWORD: escape SQL literal, sin
  // interpolar shell ni imprimir las credenciales.
  const quotedPassword = `'${password.replaceAll("'", "''")}'`;
  if (!exists.rowCount) await client.query(`CREATE ROLE dashboard_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${quotedPassword}`);
  else await client.query(`ALTER ROLE dashboard_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD ${quotedPassword}`);
  const sql = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
  await client.query(sql);
  console.log('Esquema PostgreSQL y permisos instalados.');
} finally { await client.end(); }
