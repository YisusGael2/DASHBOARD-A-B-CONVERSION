import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { config, validateConfig } from '../src/config.js';
import { pool, withContext } from '../src/db.js';
import { encryptCredentials, decryptCredentials } from '../src/security.js';

let server, baseUrl, adminToken, superToken, clientToken, otherToken, testStore, testUser, storeClientToken;
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
    await adminPool.query('DELETE FROM public.experiments WHERE store_id=$1', [testStore]);
    await adminPool.query('DELETE FROM public.daily_metrics WHERE store_id=$1', [testStore]);
    await adminPool.query('DELETE FROM public.clarity_metrics WHERE store_id=$1', [testStore]);
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

test('dashboard acepta 7, 14 y 28 días, compara ventanas consecutivas y devuelve profundidad de scroll', async () => {
  const defaults = await request(`/api/dashboard?storeId=${storeA}`, { token: clientToken });
  assert.equal(defaults.body.periodDays, 14);
  const today = (await adminPool.query('SELECT (now() AT TIME ZONE timezone)::date::text today FROM public.stores WHERE id=$1', [storeA])).rows[0].today;
  for (const days of [7, 14, 28]) {
    const result = await request(`/api/dashboard?storeId=${storeA}&days=${days}`, { token: clientToken });
    assert.equal(result.status, 200); assert.equal(result.body.periodDays, days);
    assert.equal(result.body.behavior.windowDays, days);
    assert.ok(Number.isFinite(result.body.behavior.scrollDepth));
    const totals = (await adminPool.query(`
      SELECT sum(revenue)::numeric AS revenue,sum(orders)::int AS orders,count(*)::int daily_count
      FROM public.daily_metrics WHERE store_id=$1 AND source='demo' AND currency=$2
      AND date BETWEEN $3::date - ($4::int - 1) AND $3::date`, [storeA, result.body.store.currency, today, days])).rows[0];
    assert.equal(result.body.daily.length, totals.daily_count);
    assert.ok(result.body.daily.every((row) => row.date <= today));
    assert.equal(result.body.summary.revenue, Number(totals.revenue));
    assert.equal(result.body.summary.orders, totals.orders);
    const previous = (await adminPool.query(`
      SELECT sum(revenue)::numeric revenue,count(*)::int daily_count
      FROM public.daily_metrics WHERE store_id=$1 AND source='demo' AND currency=$2
      AND date BETWEEN $3::date - ($4::int * 2 - 1) AND $3::date - $4::int`, [storeA, result.body.store.currency, today, days])).rows[0];
    const expectedChange = totals.daily_count === days && previous.daily_count === days && Number(previous.revenue) > 0
      ? Number(((Number(totals.revenue) - Number(previous.revenue)) / Number(previous.revenue) * 100).toFixed(1)) : null;
    assert.equal(result.body.summary.revenueChange, expectedChange);
    if (totals.daily_count < days || previous.daily_count < days) {
      for (const field of ['revenueChange', 'ordersChange', 'conversionChange', 'sessionChange']) assert.equal(result.body.summary[field], null);
    }
  }
  for (const invalid of ['15', '0', '7.0', '7&days=14']) {
    const result = await request(`/api/dashboard?storeId=${storeA}&days=${invalid}`, { token: clientToken });
    assert.equal(result.status, 400); assert.equal(result.body.error, 'El período debe ser de 7, 14 o 28 días.');
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

test('Intelligems Sandbox cifra credenciales, importa experimentos y reintenta sin duplicados', async () => {
  const secret = 'mock_ig_integration_test';
  const connected = await request('/api/integrations/intelligems/connect', { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: 'test-project', apiKey: secret } });
  assert.equal(connected.status, 200); assert.equal(connected.body.integration.status, 'credential_saved');
  assert.equal(JSON.stringify(connected.body).includes(secret), false);
  const stored = (await adminPool.query('SELECT ciphertext FROM public.integration_credentials WHERE store_id=$1', [testStore])).rows[0];
  assert.ok(stored); assert.equal(stored.ciphertext.includes(secret), false); assert.equal(decryptCredentials(stored.ciphertext).apiKey, secret);
  const sync = await request('/api/integrations/intelligems/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } });
  assert.equal(sync.status, 200); assert.equal(sync.body.recordsProcessed, 6); assert.equal(sync.body.sandbox, true);
  assert.equal(JSON.stringify(sync.body).includes(secret), false);
  assert.equal((await request('/api/integrations/intelligems/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } })).status, 200);
  const counts = (await adminPool.query(`SELECT
    (SELECT count(*)::int FROM public.experiments WHERE store_id=$1 AND source='intelligems') experiments,
    (SELECT count(*)::int FROM public.experiment_variants WHERE store_id=$1) variants,
    (SELECT count(*)::int FROM public.variant_metrics WHERE store_id=$1 AND source='intelligems') metrics`, [testStore])).rows[0];
  assert.deepEqual(counts, { experiments: 2, variants: 4, metrics: 4 });
  const dashboard = await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken });
  assert.equal(dashboard.body.mode, 'live'); assert.equal(dashboard.body.summary.revenue, null); assert.equal(dashboard.body.summary.conversionRate, null);
  assert.equal(dashboard.body.sandbox, true); assert.equal(dashboard.body.experiments.length, 2);
  const integration = dashboard.body.integrations.find((row) => row.provider === 'intelligems');
  assert.equal(integration.status, 'connected'); assert.equal(integration.sandbox, true);
  for (const experiment of dashboard.body.experiments) {
    assert.equal(experiment.variants.length, 2); assert.equal(experiment.variants.filter((variant) => variant.isControl).length, 1);
    assert.equal(experiment.sandbox, true);
    assert.ok(experiment.variants.find((variant) => !variant.isControl).lift !== null);
  }
  // Una captura acumulada de ayer no debe sumarse a la captura actual.
  const variant = (await adminPool.query("SELECT * FROM public.variant_metrics WHERE store_id=$1 AND source='intelligems' LIMIT 1", [testStore])).rows[0];
  await adminPool.query("INSERT INTO public.variant_metrics (store_id,variant_id,date,visitors,orders,revenue,currency,source) VALUES ($1,$2,$3::date-1,999999,9999,99999,$4,'intelligems')", [testStore, variant.variant_id, variant.date, variant.currency]);
  assert.deepEqual((await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body.experiments, dashboard.body.experiments);
  const ciphertext = encryptCredentials({ apiKey: secret });
  const tampered = JSON.parse(ciphertext); tampered.tag = Buffer.alloc(16).toString('base64');
  assert.throws(() => decryptCredentials(JSON.stringify(tampered)));
});

test('Shopify y Clarity Sandbox recorren el flujo cifrado y SQL con moneda y ventana de la tienda', async () => {
  const domain = (await adminPool.query('SELECT domain FROM public.stores WHERE id=$1', [testStore])).rows[0].domain;
  for (const provider of ['shopify', 'clarity']) {
    const result = await request(`/api/integrations/${provider}/connect`, { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: provider === 'shopify' ? domain : 'mock-project', [provider === 'shopify' ? 'accessToken' : 'apiKey']: `mock_${provider}_integration_test` } });
    assert.equal(result.status, 200);
    const sync = await request(`/api/integrations/${provider}/sync`, { token: adminToken, method: 'POST', body: { storeId: testStore } });
    assert.equal(sync.status, 200); assert.equal(sync.body.sandbox, true);
    assert.equal(sync.body.recordsProcessed, provider === 'shopify' ? 28 : 1);
  }
  const dashboard = await request(`/api/dashboard?storeId=${testStore}&days=28`, { token: adminToken });
  assert.equal(dashboard.body.daily.length, 28); assert.equal(dashboard.body.store.currency, 'MXN');
  assert.ok(dashboard.body.summary.revenue > 0); assert.equal(dashboard.body.summary.sessionCount, null); assert.equal(dashboard.body.summary.conversionRate, null);
  assert.equal(dashboard.body.behavior.scrollDepth, 68.5); assert.equal(dashboard.body.behavior.sandbox, true); assert.equal(dashboard.body.behavior.windowDays, 3);
});

test('historial por tenant y auditoría exclusiva del personal respetan RLS y proyectan DTOs seguros', async () => {
  const email = `tenant-test-${randomUUID()}@example.local`;
  const created = await request('/api/users', { token: adminToken, method: 'POST', body: { name: 'Cliente del historial', email, password: 'Password12345!', role: 'CLIENT', storeId: testStore } });
  assert.equal(created.status, 201);
  const signed = await request('/api/auth/login', { method: 'POST', body: { email, password: 'Password12345!' } });
  assert.equal(signed.status, 200); storeClientToken = signed.body.token;
  const own = await request(`/api/sync-runs?storeId=${testStore}`, { token: storeClientToken });
  assert.equal(own.status, 200); assert.ok(own.body.syncRuns.length >= 4);
  assert.ok(own.body.syncRuns.every((run) => run.status === 'completed' && run.recordsProcessed > 0));
  assert.equal((await request('/api/sync-runs', { token: storeClientToken })).status, 200);
  assert.equal((await request(`/api/sync-runs?storeId=${storeA}`, { token: storeClientToken })).status, 403);
  assert.equal((await request(`/api/sync-runs?storeId=${testStore}`, { token: clientToken })).status, 403);
  const user = (await pool.query('SELECT * FROM public.auth_user($1)', [created.body.user.id])).rows[0];
  await withContext(user, async (connection) => {
    assert.deepEqual((await connection.query('SELECT DISTINCT store_id FROM public.sync_runs')).rows.map((row) => row.store_id), [testStore]);
    assert.equal((await connection.query('SELECT * FROM public.audit_events')).rows.length, 0);
  });
  assert.equal((await request('/api/audit-events', { token: clientToken })).status, 403);
  assert.equal((await request('/api/audit-events', { token: storeClientToken })).status, 403);
  for (const token of [adminToken, superToken]) {
    const result = await request(`/api/audit-events?storeId=${testStore}`, { token });
    assert.equal(result.status, 200); assert.ok(result.body.auditEvents.every((event) => event.storeId === testStore));
    const actions = result.body.auditEvents.map((event) => event.action);
    for (const action of ['store.created', 'user.created', 'integration.connected', 'integration.synced']) assert.ok(actions.includes(action));
    assert.ok(result.body.auditEvents.every((event) => event.actorEmail));
    assert.equal(JSON.stringify(result.body).includes('mock_ig_integration_test'), false);
  }
  assert.equal((await request('/api/audit-events?storeId=no-es-uuid', { token: adminToken })).status, 400);
});

test('importación real con fetch simulado admite cambios de control y variantes retiradas sin perder historial', async (t) => {
  const originalFetch = globalThis.fetch;
  let experience = { id: 'api-control-swap', name: 'Control intercambiable', status: 'active', confidence: 0,
    variants: [{ id: 'a', name: 'Variante A', isControl: true, visitors: 1000, orders: 100, revenue: '1000.00' }, { id: 'b', name: 'Variante B', isControl: false, visitors: 1000, orders: 120, revenue: '1200.00' }] };
  globalThis.fetch = (url, options) => String(url).startsWith('https://api.intelligems.io/')
    ? Promise.resolve(new Response(JSON.stringify({ experiences: experience ? [experience] : [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })) : originalFetch(url, options);
  t.after(() => { globalThis.fetch = originalFetch; });
  const connect = await request('/api/integrations/intelligems/connect', { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: 'account-with-stubbed-fetch', apiKey: 'local-intelligems-key-stubbed-network' } });
  assert.equal(connect.status, 200);
  const sync = () => request('/api/integrations/intelligems/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } });
  const initialExperience = experience; experience = null;
  assert.equal((await sync()).status, 200);
  assert.equal((await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body.experiments.length, 0, 'La respuesta real vacía no debe mostrar los experimentos Sandbox históricos.');
  experience = initialExperience;
  assert.equal((await sync()).status, 200);
  const first = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body;
  assert.equal(first.experiments.length, 1); assert.equal(first.experiments[0].sandbox, false);
  assert.equal(first.experiments[0].confidence, 0); assert.equal(first.experiments[0].confidenceSource, 'provider');
  // La nueva variante de control llega primero: sin reset transaccional choca con el índice parcial.
  experience = { ...experience, confidence: null, variants: [{ ...experience.variants[1], isControl: true }, { ...experience.variants[0], isControl: false }] };
  const swapped = await sync(); assert.equal(swapped.status, 200); assert.equal(swapped.body.recordsProcessed, 3);
  const second = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body.experiments[0];
  assert.equal(second.id, first.experiments[0].id); assert.equal(second.variants.find((variant) => variant.isControl).name, 'Variante B');
  assert.equal(second.confidenceSource, 'calculated'); assert.equal(second.confidence, 84.7);
  experience = { ...experience, variants: [experience.variants[0]] };
  assert.equal((await sync()).status, 200);
  assert.equal((await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body.experiments[0].variants.length, 1);
  assert.equal((await adminPool.query('SELECT count(*)::int n FROM public.experiment_variants WHERE experiment_id=$1', [first.experiments[0].id])).rows[0].n, 2);
  assert.ok((await adminPool.query("SELECT count(*)::int n FROM public.experiments WHERE store_id=$1 AND metadata->>'mock'='true'", [testStore])).rows[0].n >= 2);
});

test('Shopify renueva su caché al pasar de Sandbox a datos reales sin contaminar el período previo', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => /^https:\/\/[^/]+\.myshopify\.com\/admin\/api\//.test(String(url))
    ? Promise.resolve(new Response(JSON.stringify({ data: { orders: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } }), { status: 200 })) : originalFetch(url, options);
  t.after(() => { globalThis.fetch = originalFetch; });
  const store = (await adminPool.query('SELECT domain,(now() AT TIME ZONE timezone)::date::text today FROM public.stores WHERE id=$1', [testStore])).rows[0];
  await adminPool.query("INSERT INTO public.daily_metrics (store_id,date,currency,revenue,orders,source) VALUES ($1,$2::date-40,'MXN',999999,9999,'shopify')", [testStore, store.today]);
  assert.equal((await request('/api/integrations/shopify/connect', { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: store.domain, accessToken: 'local-real-shopify-key-stubbed-fetch' } })).status, 200);
  const before = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body;
  assert.equal(before.integrations.find((row) => row.provider === 'shopify').sandbox, true, 'Reconectar conserva la procedencia de la caché anterior hasta sincronizar.');
  assert.equal((await request('/api/integrations/shopify/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } })).status, 200);
  const after = (await request(`/api/dashboard?storeId=${testStore}&days=28`, { token: adminToken })).body;
  assert.equal(after.integrations.find((row) => row.provider === 'shopify').sandbox, false);
  assert.equal(after.summary.revenue, 0); assert.equal(after.summary.orders, 0); assert.equal(after.summary.revenueChange, null);
  assert.equal((await adminPool.query("SELECT count(*)::int n FROM public.daily_metrics WHERE store_id=$1 AND source='shopify' AND date<$2::date-27", [testStore, store.today])).rows[0].n, 0);
});

test('Clarity conserva historial Sandbox pero selecciona la última captura de la procedencia actual', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) => String(url).startsWith('https://www.clarity.ms/')
    ? Promise.resolve(new Response(JSON.stringify([{ metricName: 'Traffic', information: [{ totalSessionCount: '777' }] }, { metricName: 'ScrollDepth', information: [{ averageScrollDepth: '34.2' }] }]), { status: 200 })) : originalFetch(url, options);
  t.after(() => { globalThis.fetch = originalFetch; });
  const today = (await adminPool.query('SELECT (now() AT TIME ZONE timezone)::date::text today FROM public.stores WHERE id=$1', [testStore])).rows[0].today;
  await adminPool.query("INSERT INTO public.clarity_metrics (store_id,date,sessions,scroll_depth,source,metadata) VALUES ($1,$2::date+1,999999,99.9,'clarity','{\"mock\":true,\"windowDays\":3}')", [testStore, today]);
  assert.equal((await request('/api/integrations/clarity/connect', { token: adminToken, method: 'POST', body: { storeId: testStore, externalAccountId: 'real-project-with-stubbed-fetch', apiKey: 'local-real-clarity-key-stubbed-fetch' } })).status, 200);
  assert.equal((await request('/api/integrations/clarity/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } })).status, 200);
  const dashboard = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body;
  assert.equal(dashboard.behavior.sessions, 777); assert.equal(dashboard.behavior.scrollDepth, 34.2); assert.equal(dashboard.behavior.sandbox, false);
  assert.equal(dashboard.integrations.find((row) => row.provider === 'clarity').sandbox, false);
  assert.ok((await adminPool.query("SELECT count(*)::int n FROM public.clarity_metrics WHERE store_id=$1 AND metadata->>'mock'='true'", [testStore])).rows[0].n >= 1);
});

test('un error SQL revierte toda la importación, registra un historial seguro y no audita éxito', async (t) => {
  const originalFetch = globalThis.fetch;
  const experiences = [
    { id: 'api-control-swap', name: 'Actualización que debe revertirse', status: 'active', confidence: 99.9,
      variants: [{ id: 'a', name: 'Control que debe revertirse', isControl: true, visitors: 1000, orders: 300, revenue: '3000.00' }] },
    { id: 'rollback-after-one-exp', name: 'Importe fuera de rango SQL', status: 'active', variants: [{ id: 'a', name: 'Control', isControl: true, visitors: 1000, orders: 100, revenue: '999999999999999999.00' }] },
  ];
  globalThis.fetch = (url, options) => String(url).startsWith('https://api.intelligems.io/')
    ? Promise.resolve(new Response(JSON.stringify({ experiences }), { status: 200 })) : originalFetch(url, options);
  t.after(() => { globalThis.fetch = originalFetch; });
  const before = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body.experiments;
  const successfulEvents = async () => (await adminPool.query("SELECT count(*)::int n FROM public.audit_events WHERE store_id=$1 AND action='integration.synced'", [testStore])).rows[0].n;
  const auditCount = await successfulEvents();
  const result = await request('/api/integrations/intelligems/sync', { token: adminToken, method: 'POST', body: { storeId: testStore } });
  assert.equal(result.status, 502); assert.equal(JSON.stringify(result.body).includes('999999999999999999'), false);
  const dashboard = (await request(`/api/dashboard?storeId=${testStore}`, { token: adminToken })).body;
  assert.deepEqual(dashboard.experiments, before); assert.equal(dashboard.integrations.find((row) => row.provider === 'intelligems').status, 'error');
  assert.equal(await successfulEvents(), auditCount);
  assert.equal((await adminPool.query("SELECT count(*)::int n FROM public.experiments WHERE store_id=$1 AND external_id='rollback-after-one-exp'", [testStore])).rows[0].n, 0);
  const runs = (await request(`/api/sync-runs?storeId=${testStore}`, { token: storeClientToken })).body.syncRuns;
  assert.equal(runs[0].status, 'failed'); assert.equal(runs[0].recordsProcessed, 0); assert.equal(runs[0].error, 'No se pudo completar la sincronización.');
  assert.equal(JSON.stringify(runs).includes('numeric field overflow'), false);
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
