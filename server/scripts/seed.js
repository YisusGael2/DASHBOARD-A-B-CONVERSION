import pg from 'pg';
import argon2 from 'argon2';
import { config } from '../src/config.js';

if (!config.demoMode) { console.log('Demo omitida: DEMO_MODE=false. Crea la cuenta inicial con db:bootstrap.'); process.exit(0); }
if (!config.databaseAdminUrl) throw new Error('El seed necesita DATABASE_ADMIN_URL.');
const client = new pg.Client({ connectionString: config.databaseAdminUrl });
const storeA = '11111111-1111-4111-8111-111111111111';
const storeB = '22222222-2222-4222-8222-222222222222';
await client.connect();
try {
  await client.query('BEGIN');
  for (const [id, name, domain, currency, timezone] of [
    [storeA, 'Nómada Studio', 'demo-nomada-studio.myshopify.com', 'MXN', 'America/Mexico_City'],
    [storeB, 'Casa Botánica', 'demo-casa-botanica.myshopify.com', 'MXN', 'America/Mexico_City'],
  ]) {
    await client.query("INSERT INTO public.stores(id,name,domain,currency,timezone) VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING", [id, name, domain, currency, timezone]);
  }
  const passwordHash = await argon2.hash('Demo1234!', { type: argon2.argon2id });
  for (const [id, name, email, role, store] of [
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Sofía · Super Admin', 'super@demo.local', 'SUPER_ADMIN', null],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Alex · Agencia', 'admin@demo.local', 'ADMIN', null],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'Mariana · Nómada', 'cliente@demo.local', 'CLIENT', storeA],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Diego · Casa Botánica', 'otro@demo.local', 'CLIENT', storeB],
  ]) {
    await client.query('INSERT INTO public.users(id,name,email,password_hash,role,store_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING', [id, name, email, passwordHash, role, store]);
  }
  for (const [store, factor] of [[storeA, 1], [storeB, 0.62]]) {
    for (const provider of ['shopify', 'clarity', 'intelligems']) {
      await client.query("INSERT INTO public.api_integrations(store_id,provider,status,external_id,last_synced_at,metadata) VALUES($1,$2,'demo',$3,now(),'{\"synthetic\":true}') ON CONFLICT(store_id,provider) DO NOTHING", [store, provider, `demo-${provider}`]);
    }
    for (let daysAgo = 27; daysAgo >= 0; daysAgo--) {
      const day = new Date(); day.setUTCDate(day.getUTCDate() - daysAgo);
      const date = day.toISOString().slice(0, 10);
      const sessions = Math.round((1450 + (27 - daysAgo) * 28 + Math.sin(daysAgo * 1.7) * 240) * factor);
      const orders = Math.round(sessions * (daysAgo < 14 ? 0.0315 : 0.0278));
      const revenue = (orders * (daysAgo < 14 ? 1198.4 : 1146.2)).toFixed(2);
      await client.query("INSERT INTO public.daily_metrics(store_id,date,currency,revenue,orders,sessions,conversion_rate,source) VALUES($1,$2,'MXN',$3,$4,$5,$6,'demo') ON CONFLICT(store_id,date,currency,source) DO UPDATE SET revenue=EXCLUDED.revenue,orders=EXCLUDED.orders,sessions=EXCLUDED.sessions,conversion_rate=EXCLUDED.conversion_rate", [store, date, revenue, orders, sessions, orders / sessions]);
      await client.query("INSERT INTO public.clarity_metrics(store_id,date,sessions,dead_clicks,rage_clicks,quick_backs,scroll_depth,source,metadata) VALUES($1,$2,$3,$4,$5,$6,67.4,'demo','{\"synthetic\":true}') ON CONFLICT(store_id,date,source) DO UPDATE SET sessions=EXCLUDED.sessions,dead_clicks=EXCLUDED.dead_clicks,rage_clicks=EXCLUDED.rage_clicks,quick_backs=EXCLUDED.quick_backs", [store, date, sessions, Math.round(sessions * .044), Math.round(sessions * .018), Math.round(sessions * .027)]);
    }
    for (const [testIndex, name, status, confidence] of [[0, 'Precio del producto principal', 'active', 94.2], [1, 'Umbral de envío gratuito', 'completed', 97.6]]) {
      const started = new Date(); started.setUTCDate(started.getUTCDate() - (testIndex === 0 ? 12 : 25));
      const experiment = (await client.query("INSERT INTO public.experiments(store_id,external_id,name,status,started_at,ended_at,source,metadata) VALUES($1,$2,$3,$4,$5,$6,'demo',$7) ON CONFLICT(store_id,source,external_id) DO UPDATE SET name=EXCLUDED.name RETURNING id", [store, `demo-test-${testIndex}`, name, status, started, testIndex === 1 ? new Date() : null, JSON.stringify({ confidence, synthetic: true })])).rows[0];
      for (const [variantIndex, variantName, control] of [[0, 'Original', true], [1, testIndex === 0 ? 'Precio optimizado' : 'Envío desde $999', false]]) {
        const variant = (await client.query('INSERT INTO public.experiment_variants(store_id,experiment_id,external_id,name,is_control) VALUES($1,$2,$3,$4,$5) ON CONFLICT(experiment_id,external_id) DO UPDATE SET name=EXCLUDED.name RETURNING id', [store, experiment.id, `variant-${variantIndex}`, variantName, control])).rows[0];
        const visitors = Math.round((testIndex === 0 ? 6432 : 8102) * factor + variantIndex * 17);
        const orders = Math.round(visitors * (variantIndex === 0 ? .027 : .034));
        // La demo muestra un snapshot acumulado por variante, no nuevos visitantes
        // diarios. Sustituir solo muestras evita duplicarlos al sembrar otro día.
        await client.query("DELETE FROM public.variant_metrics WHERE variant_id=$1 AND source='demo'", [variant.id]);
        await client.query("INSERT INTO public.variant_metrics(store_id,variant_id,date,visitors,orders,revenue,currency,source) VALUES($1,$2,CURRENT_DATE,$3,$4,$5,'MXN','demo') ON CONFLICT(variant_id,date,currency,source) DO UPDATE SET visitors=EXCLUDED.visitors,orders=EXCLUDED.orders,revenue=EXCLUDED.revenue", [store, variant.id, visitors, orders, (orders * (variantIndex === 0 ? 1198 : 1149)).toFixed(2)]);
      }
    }
  }
  await client.query('COMMIT');
  console.log('Demo preparada: dos tiendas aisladas y cuatro cuentas. Todos los datos son sintéticos.');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
