import pg from 'pg';
import argon2 from 'argon2';
import { config } from '../src/config.js';

if (config.demoMode) throw new Error('El bootstrap real exige DEMO_MODE=false.');
if (!config.databaseAdminUrl) throw new Error('El bootstrap necesita DATABASE_ADMIN_URL.');
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const name = (process.env.ADMIN_NAME || '').trim();
const password = process.env.ADMIN_PASSWORD || '';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || password.length < 12) throw new Error('Define ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD (mínimo 12 caracteres) de forma segura.');
const client = new pg.Client({ connectionString: config.databaseAdminUrl });
await client.connect();
try {
  await client.query('BEGIN');
  const exists = await client.query('SELECT 1 FROM public.users WHERE role=$1 LIMIT 1', ['SUPER_ADMIN']);
  if (exists.rowCount) throw new Error('Ya existe un Super Admin. El bootstrap no sobrescribe cuentas existentes.');
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  await client.query("INSERT INTO public.users(name,email,password_hash,role) VALUES($1,$2,$3,'SUPER_ADMIN')", [name, email, hash]);
  await client.query('COMMIT');
  console.log('Super Admin inicial creado.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
