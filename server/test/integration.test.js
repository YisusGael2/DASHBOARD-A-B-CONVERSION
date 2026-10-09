import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { config, validateConfig } from '../src/config.js';
import { pool, withContext } from '../src/db.js';
import { encryptCredentials, decryptCredentials } from '../src/security.js';

let server, baseUrl, adminToken, superToken, clientToken, otherToken, testStore, testUser;
const storeA = '11111111-1111-4111-8111-111111111111';
const storeB = '22222222-2222-4222-8222-222222222222';
const adminPool = new pg.Pool({ connectionString: config.databaseAdminUrl });

async function request(path, { token, body, method = 'GET' } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

async function signIn(email) {
  const result = await request('/api/auth/login', { method: 'POST', body: { email, password: 'Demo1234!' } });
  assert.equal(result.status, 200, 'Ejecuta db:migrate y db:seed con DEMO_MODE=true antes de las pruebas.');
  assert.equal(result.body.user.password_hash, undefined);
  return result.body.token;
}

before(async () => {
  validateConfig();
  assert.equal(config.demoMode, true, 'La suite de integración necesita una base local de demostración.');
  // Una única conexión hace observable cualquier fuga entre transacciones.
  pool.options.max = 1;
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  superToken = await signIn('super@demo.local');
  adminToken = await signIn('admin@demo.local');
  clientToken = await signIn('cliente@demo.local');
  otherToken = await signIn('otro@demo.local');
});

after(async () => {
  if (testUser) await adminPool.query('DELETE FROM public.audit_events WHERE actor_user_id=$1::uuid OR metadata->>\'userId\'=$1::text', [testUser]);
  if (testStore) {
    await adminPool.query('DELETE FROM public.audit_events WHERE store_id=$1', [testStore]);
    await adminPool.query('DELETE FROM public.sync_runs WHERE store_id=$1', [testStore]);
    await adminPool.query('DELETE FROM public.api_integrations WHERE store_id=$1', [testStore]);
    await adminPool.query('DELETE FROM public.users WHERE store_id=$1 OR id=$2', [testStore, testUser || null]);
    await adminPool.query('DELETE FROM public.stores WHERE id=$1', [testStore]);
  }
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end(); await adminPool.end();
});

test('health confirma PostgreSQL y el login rechaza credenciales erróneas', async () => {
  assert.equal((await request('/api/health')).body.database, 'connected');
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'cliente@demo.local', password: 'incorrecta' } })).status, 401);
  assert.equal((await request('/api/stores')).status, 401);
});

test('CLIENT ve solo su tienda y las dos cuentas no comparten dashboard', async () => {
  const mine = await request('/api/stores', { token: clientToken });
  const other = await request('/api/stores', { token: otherToken });
  assert.deepEqual(mine.body.stores.map((s) => s.id), [storeA]);
  assert.deepEqual(other.body.stores.map((s) => s.id), [storeB]);
  const dashboard = await request(`/api/dashboard?storeId=${storeA}`, { token: clientToken });
  assert.equal(dashboard.status, 200); assert.equal(dashboard.body.mode, 'demo');
  assert.equal(dashboard.body.store.id, storeA); assert.ok(dashboard.body.daily.length);
  assert.equal((await request(`/api/dashboard?storeId=${storeB}`, { token: clientToken })).status, 403);
  assert.equal((await request(`/api/dashboard?storeId=${storeA}`, { token: otherToken })).status, 403);
  for (const integration of dashboard.body.integrations) {
    assert.equal(integration.apiKey, undefined); assert.equal(integration.accessToken, undefined); assert.equal(integration.ciphertext, undefined);
  }
});

test('ADMIN ve todas las tiendas y CLIENT no administra usuarios, tiendas ni integraciones', async () => {
  const stores = await request('/api/stores', { token: adminToken });
  assert.ok(stores.body.stores.some((s) => s.id === storeA)); assert.ok(stores.body.stores.some((s) => s.id === storeB));
  assert.equal((await request('/api/users', { token: clientToken })).status, 403);
  assert.equal((await request('/api/users', { token: adminToken })).body.users.some((u) => u.role !== 'CLIENT'), false);
  for (const path of ['/api/users', '/api/stores', '/api/integrations/shopify/connect', '/api/integrations/shopify/sync']) {
    assert.equal((await request(path, { token: clientToken, method: 'POST', body: { storeId: storeA } })).status, 403);
  }
});

test('JWT no acepta otro algoritmo, emisor, audiencia o permisos enviados en claims', async () => {
  const user = jwt.decode(clientToken);
  for (const options of [{ algorithm: 'HS384', issuer: config.issuer, audience: config.audience }, { algorithm: 'HS256', issuer: 'otro', audience: config.audience }, { algorithm: 'HS256', issuer: config.issuer, audience: 'otra' }]) {
    const token = jwt.sign({}, config.jwtSecret, { ...options, subject: user.sub, expiresIn: '1m' });
    assert.equal((await request('/api/stores', { token })).status, 401);
  }
  const forgedRole = jwt.sign({ role: 'SUPER_ADMIN', storeId: storeB }, config.jwtSecret, { algorithm: 'HS256', subject: user.sub, issuer: config.issuer, audience: config.audience, expiresIn: '1m' });
  assert.equal((await request('/api/users', { token: forgedRole })).status, 403);
});

test('RLS bloquea consulta y escritura cruzada aun sin filtro del controlador', async () => {
  const client = (await pool.query('SELECT * FROM public.auth_lookup($1)', ['cliente@demo.local'])).rows[0];
  const results = await withContext(client, async (connection) => ({
    all: (await connection.query('SELECT DISTINCT store_id FROM public.daily_metrics')).rows,
    other: (await connection.query('SELECT * FROM public.daily_metrics WHERE store_id=$1', [storeB])).rows,
    update: (await connection.query('UPDATE public.daily_metrics SET orders=orders+1 WHERE store_id=$1 RETURNING id', [storeB])).rowCount,
  }));
  assert.deepEqual(results.all.map((r) => r.store_id), [storeA]); assert.equal(results.other.length, 0); assert.equal(results.update, 0);
  await assert.rejects(withContext(client, (connection) => connection.query("INSERT INTO public.daily_metrics(store_id,date,currency,revenue,orders,source) VALUES($1,'2000-01-01','MXN',1,1,'demo')", [storeA])), { code: '42501' });
  await assert.rejects(withContext(client, (connection) => connection.query('SELECT * FROM public.integration_credentials')), { code: '42501' });
  await assert.rejects(withContext(client, (connection) => connection.query('SELECT public.read_credential(gen_random_uuid())')), { code: '42501' });
});

test('la conexión reutilizada limpia contexto incluso después de ROLLBACK', async () => {
  const a = (await pool.query('SELECT * FROM public.auth_lookup($1)', ['cliente@demo.local'])).rows[0];
  const b = (await pool.query('SELECT * FROM public.auth_lookup($1)', ['otro@demo.local'])).rows[0];
  const first = await withContext(a, async (connection) => ({ pid: (await connection.query('SELECT pg_backend_pid() pid')).rows[0].pid, ids: (await connection.query('SELECT id FROM public.stores')).rows.map((s) => s.id) }));
  await assert.rejects(withContext(a, async () => { throw new Error('rollback de prueba'); }));
  const second = await withContext(b, async (connection) => ({ pid: (await connection.query('SELECT pg_backend_pid() pid')).rows[0].pid, ids: (await connection.query('SELECT id FROM public.stores')).rows.map((s) => s.id) }));
  assert.equal(first.pid, second.pid); assert.deepEqual(first.ids, [storeA]); assert.deepEqual(second.ids, [storeB]);
  assert.equal((await pool.query('SELECT id FROM public.stores')).rowCount, 0);
});

test('ADMIN no eleva privilegios ni por API ni por SQL; Super Admin crea personal', async () => {
  const body = { name: 'Prueba de permisos', email: `test-${randomUUID()}@example.local`, password: 'Password12345!', role: 'ADMIN' };
  assert.equal((await request('/api/users', { token: adminToken, method: 'POST', body })).status, 403);
  const admin = (await pool.query('SELECT * FROM public.auth_lookup($1)', ['admin@demo.local'])).rows[0];
  await assert.rejects(withContext(admin, (connection) => connection.query("UPDATE public.users SET role='SUPER_ADMIN',store_id=NULL WHERE email='cliente@demo.local'")), { code: '42501' });
  const created = await request('/api/stores', { token: adminToken, method: 'POST', body: { name: 'Tienda de prueba', domain: `test-${randomUUID()}.myshopify.com`, currency: 'MXN', timeZone: 'America/Mexico_City' } });
  assert.equal(created.status, 201); testStore = created.body.store.id;
  const employee = await request('/api/users', { token: superToken, method: 'POST', body });
  assert.equal(employee.status, 201); testUser = employee.body.user.id;
  assert.equal(employee.body.user.role, 'ADMIN'); assert.equal(employee.body.user.storeId, null);
});

test('credenciales cifradas no se devuelven, conectar exige sincronización e Intelligems informa límite', async () => {
  const secret = 'fake-credential-only-test-no-provider-request';
  const connected = await request('/api/integrations/intelligems/connect', { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: 'test-project', apiKey: secret } });
  assert.equal(connected.status, 200); assert.equal(connected.body.integration.status, 'credential_saved');
  assert.equal(JSON.stringify(connected.body).includes(secret), false);
  const stored = (await adminPool.query('SELECT ciphertext FROM public.integration_credentials WHERE store_id=$1', [testStore])).rows[0];
  assert.ok(stored); assert.equal(stored.ciphertext.includes(secret), false); assert.equal(decryptCredentials(stored.ciphertext).apiKey, secret);
  const sync = await request('/api/integrations/intelligems/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } });
  assert.equal(sync.status, 501); assert.equal(JSON.stringify(sync.body).includes(secret), false);
  const dashboard = await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken });
  assert.equal(dashboard.body.mode, 'live'); assert.equal(dashboard.body.summary.revenue, null); assert.equal(dashboard.body.summary.conversionRate, null);
  const ciphertext = encryptCredentials({ apiKey: secret });
  const tampered = JSON.parse(ciphertext); tampered.tag = Buffer.alloc(16).toString('base64');
  assert.throws(() => decryptCredentials(JSON.stringify(tampered)));
});

test('reintentos de upsert no duplican métricas; relaciones cruzadas son rechazadas', async () => {
  const staff = (await pool.query('SELECT * FROM public.auth_lookup($1)', ['admin@demo.local'])).rows[0];
  await withContext(staff, async (connection) => {
    for (let i = 0; i < 2; i++) await connection.query("INSERT INTO public.daily_metrics(store_id,date,currency,revenue,orders,source) VALUES($1,'2000-01-01','MXN',10,1,'demo') ON CONFLICT(store_id,date,currency,source) DO UPDATE SET revenue=EXCLUDED.revenue", [testStore]);
    assert.equal((await connection.query("SELECT count(*)::int n FROM public.daily_metrics WHERE store_id=$1 AND date='2000-01-01'", [testStore])).rows[0].n, 1);
    await connection.query('DELETE FROM public.daily_metrics WHERE store_id=$1', [testStore]);
  });
  const experiment = (await adminPool.query('SELECT id FROM public.experiments WHERE store_id=$1 LIMIT 1', [storeA])).rows[0].id;
  await assert.rejects(withContext(staff, (connection) => connection.query('INSERT INTO public.experiment_variants(store_id,experiment_id,name,is_control) VALUES($1,$2,$3,false)', [storeB, experiment, 'Cruce inválido'])), { code: '23503' });
});

test('permisos y estado vigentes se consultan incluso con un JWT anterior', async () => {
  const user = (await adminPool.query('SELECT id,email FROM public.users WHERE id=$1', [testUser])).rows[0];
  const session = await request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Password12345!' } });
  assert.equal(session.status, 200);
  await adminPool.query("UPDATE public.users SET role='CLIENT',store_id=$2 WHERE id=$1", [testUser, testStore]);
  assert.equal((await request('/api/users', { token: session.body.token })).status, 403);
  await adminPool.query("UPDATE public.users SET status='disabled' WHERE id=$1", [testUser]);
  assert.equal((await request('/api/stores', { token: session.body.token })).status, 401);
});
