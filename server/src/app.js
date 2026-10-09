import express from 'express';
import helmet from 'helmet';
import argon2 from 'argon2';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { pool, withContext } from './db.js';
import { authenticate, requireStaff, login, loginLimiter } from './auth.js';
import { HttpError, uuid, textValue, publicUser, publicStore, publicIntegration, storeIdFor, encryptCredentials, decryptCredentials } from './security.js';
import { syncProvider } from '../providers/index.js';

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const numberOrNull = (value) => value === null || value === undefined ? null : Number(value);
const ratio = (part, whole) => whole > 0 ? Number((part / whole * 100).toFixed(2)) : null;
const delta = (current, previous) => current !== null && previous > 0 ? Number(((current - previous) / previous * 100).toFixed(1)) : null;
const providerNames = new Set(['shopify', 'clarity', 'intelligems']);

function providerName(value) {
  if (!providerNames.has(value)) throw new HttpError(400, 'Proveedor no válido.');
  return value;
}

async function requireStore(client, id) {
  const { rows } = await client.query('SELECT * FROM public.stores WHERE id=$1', [id]);
  if (!rows[0]) throw new HttpError(404, 'Tienda no encontrada.');
  return rows[0];
}

function storeDate(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', asyncRoute(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', demoMode: config.demoMode });
  }));
  app.post('/api/auth/login', loginLimiter, asyncRoute(login));
  app.use('/api', authenticate);
  app.get('/api/auth/me', (req, res) => res.json({ user: publicUser(req.user) }));

  app.get('/api/stores', asyncRoute(async (req, res) => {
    const stores = await withContext(req.user, async (client) => {
      const { rows } = await client.query('SELECT * FROM public.stores ORDER BY name');
      return rows.map(publicStore);
    });
    res.json({ stores });
  }));

  app.get('/api/dashboard', asyncRoute(async (req, res) => {
    const id = storeIdFor(req.user, req.query.storeId);
    const dashboard = await withContext(req.user, async (client) => {
      const store = await requireStore(client, id);
      const integrations = (await client.query('SELECT id,provider,status,last_synced_at,external_id FROM public.api_integrations WHERE store_id=$1 ORDER BY provider', [id])).rows;
      // Conectar una cuenta real elimina las muestras del dashboard de esa tienda.
      const mode = integrations.some((item) => ['credential_saved', 'connected', 'error'].includes(item.status)) || !config.demoMode ? 'live' : 'demo';
      const dailySource = mode === 'demo' ? 'demo' : 'shopify';
      const today = storeDate(store.timezone);
      const daily = (await client.query('SELECT date::text,revenue,orders,sessions FROM public.daily_metrics WHERE store_id=$1 AND source=$2 AND currency=$4 AND date >= $3::date - 27 AND date <= $3::date ORDER BY date', [id, dailySource, today, store.currency])).rows;
      const cutoff = new Date(`${today}T12:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - 13);
      const cutoffText = cutoff.toISOString().slice(0, 10);
      const current = daily.filter((row) => row.date >= cutoffText);
      const previous = daily.filter((row) => row.date < cutoffText);
      const aggregate = (items) => {
        if (!items.length) return { revenue: null, orders: null, sessions: null, conversion: null };
        const revenue = items.reduce((n, item) => n + Number(item.revenue), 0);
        const orders = items.reduce((n, item) => n + Number(item.orders), 0);
        const sessions = items.every((item) => item.sessions !== null) ? items.reduce((n, item) => n + Number(item.sessions), 0) : null;
        return { revenue: Number(revenue.toFixed(2)), orders, sessions, conversion: sessions === null ? null : ratio(orders, sessions) };
      };
      const now = aggregate(current), before = aggregate(previous);
      const tests = (await client.query('SELECT * FROM public.experiments WHERE store_id=$1 AND source=$2 ORDER BY started_at DESC NULLS LAST', [id, mode === 'demo' ? 'demo' : 'intelligems'])).rows;
      const variants = (await client.query('SELECT v.id,v.experiment_id,v.name,v.is_control,sum(m.visitors) AS visitors,sum(m.orders) AS conversions,sum(m.revenue) AS revenue FROM public.experiment_variants v LEFT JOIN public.variant_metrics m ON m.variant_id=v.id AND m.store_id=v.store_id WHERE v.store_id=$1 GROUP BY v.id ORDER BY v.is_control DESC,v.name', [id])).rows;
      const experiments = tests.map((test) => {
        const testVariants = variants.filter((variant) => variant.experiment_id === test.id).map((variant) => ({ id: variant.id, name: variant.name, isControl: variant.is_control, visitors: numberOrNull(variant.visitors), conversions: numberOrNull(variant.conversions), revenue: numberOrNull(variant.revenue), conversionRate: ratio(Number(variant.conversions), Number(variant.visitors)) }));
        return { id: test.id, name: test.name, status: test.status, startedAt: test.started_at, visitors: testVariants.length && testVariants.every((v) => v.visitors !== null) ? testVariants.reduce((n, v) => n + v.visitors, 0) : null, confidence: numberOrNull(test.metadata?.confidence), variants: testVariants };
      });
      const behaviorRows = mode === 'demo'
        ? (await client.query("SELECT sum(sessions) sessions,sum(dead_clicks) dead_clicks,sum(rage_clicks) rage_clicks,sum(quick_backs) quick_backs FROM public.clarity_metrics WHERE store_id=$1 AND source='demo' AND date >= $2::date - 13 AND date <= $2::date", [id, today])).rows[0]
        : (await client.query("SELECT sessions,dead_clicks,rage_clicks,quick_backs,metadata FROM public.clarity_metrics WHERE store_id=$1 AND source='clarity' ORDER BY date DESC LIMIT 1", [id])).rows[0] || {};
      const dates = integrations.map((i) => i.last_synced_at).filter(Boolean);
      return {
        store: publicStore(store),
        summary: { revenue: now.revenue, orders: now.orders, conversionRate: now.conversion, sessionCount: now.sessions, revenueChange: delta(now.revenue, before.revenue), ordersChange: delta(now.orders, before.orders), conversionChange: delta(now.conversion, before.conversion), sessionChange: delta(now.sessions, before.sessions) },
        daily: current.map((row) => ({ date: row.date, revenue: Number(row.revenue), orders: Number(row.orders), sessions: numberOrNull(row.sessions) })),
        experiments,
        behavior: { sessions: numberOrNull(behaviorRows.sessions), deadClicks: numberOrNull(behaviorRows.dead_clicks), rageClicks: numberOrNull(behaviorRows.rage_clicks), quickBacks: numberOrNull(behaviorRows.quick_backs), source: mode === 'demo' ? 'demo' : 'clarity', windowDays: mode === 'demo' ? 14 : behaviorRows.metadata?.windowDays || null },
        integrations: integrations.map(publicIntegration), mode, updatedAt: dates.length ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString() : null,
      };
    });
    res.json(dashboard);
  }));

  app.get('/api/users', requireStaff, asyncRoute(async (req, res) => {
    const users = await withContext(req.user, async (client) => {
      const { rows } = await client.query('SELECT id,name,email,role,store_id,status FROM public.users WHERE ($1::text = \'SUPER_ADMIN\' OR role = \'CLIENT\') ORDER BY name LIMIT 500', [req.user.role]);
      return rows.map(publicUser);
    });
    res.json({ users });
  }));

  app.post('/api/users', requireStaff, asyncRoute(async (req, res) => {
    const name = textValue(req.body.name, 'Nombre', 160);
    const email = textValue(req.body.email, 'Correo', 320).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Correo inválido.');
    const password = textValue(req.body.password, 'Contraseña', 128);
    if (password.length < 10) throw new HttpError(400, 'La contraseña debe tener al menos 10 caracteres.');
    const role = req.body.role || 'CLIENT';
    if (!['CLIENT', 'ADMIN', 'SUPER_ADMIN'].includes(role)) throw new HttpError(400, 'Rol inválido.');
    if (req.user.role === 'ADMIN' && role !== 'CLIENT') throw new HttpError(403, 'Solo Super Admin puede crear empleados.');
    const storeId = role === 'CLIENT' ? uuid(req.body.storeId, 'Tienda') : null;
    if (role !== 'CLIENT' && req.body.storeId) throw new HttpError(400, 'Los empleados no pertenecen a una única tienda.');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await withContext(req.user, async (client) => {
      if (storeId) await requireStore(client, storeId);
      const { rows } = await client.query('INSERT INTO public.users (name,email,password_hash,role,store_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,store_id,status', [name, email, passwordHash, role, storeId]);
      await client.query('INSERT INTO public.audit_events (store_id,actor_user_id,action,metadata) VALUES ($1,$2,$3,$4)', [storeId, req.user.id, 'user.created', JSON.stringify({ userId: rows[0].id, role })]);
      return publicUser(rows[0]);
    });
    res.status(201).json({ user });
  }));

  app.post('/api/stores', requireStaff, asyncRoute(async (req, res) => {
    const name = textValue(req.body.name, 'Nombre', 160);
    const domain = textValue(req.body.domain, 'Dominio', 253).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) throw new HttpError(400, 'Usa el dominio canónico tienda.myshopify.com.');
    const currency = req.body.currency || 'USD';
    if (!/^[A-Z]{3}$/.test(currency)) throw new HttpError(400, 'Moneda inválida.');
    const timezone = req.body.timeZone || 'UTC';
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw new HttpError(400, 'Zona horaria inválida.'); }
    const store = await withContext(req.user, async (client) => {
      const { rows } = await client.query('INSERT INTO public.stores (name,domain,currency,timezone) VALUES ($1,$2,$3,$4) RETURNING *', [name, domain, currency, timezone]);
      return publicStore(rows[0]);
    });
    res.status(201).json({ store });
  }));

  app.post('/api/integrations/:provider/connect', requireStaff, asyncRoute(async (req, res) => {
    const provider = providerName(req.params.provider);
    const storeId = uuid(req.body.storeId, 'Tienda');
    const secret = textValue(provider === 'shopify' ? req.body.accessToken : req.body.apiKey, 'Credencial', 4096);
    const externalId = textValue(req.body.externalAccountId, 'Identificador externo', 253);
    if (provider === 'shopify' && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(externalId)) throw new HttpError(400, 'Usa el dominio canónico tienda.myshopify.com.');
    const encrypted = encryptCredentials(provider === 'shopify' ? { accessToken: secret } : { apiKey: secret });
    const integration = await withContext(req.user, async (client) => {
      const store = await requireStore(client, storeId);
      if (provider === 'shopify' && externalId !== store.domain) throw new HttpError(400, 'El dominio debe coincidir con el dominio registrado de la tienda.');
      const { rows } = await client.query("INSERT INTO public.api_integrations (store_id,provider,status,external_id) VALUES ($1,$2,'credential_saved',$3) ON CONFLICT (store_id,provider) DO UPDATE SET status='credential_saved',external_id=EXCLUDED.external_id,last_error=NULL RETURNING *", [storeId, provider, externalId]);
      await client.query('SELECT public.store_credential($1::uuid,$2::text)', [rows[0].id, encrypted]);
      await client.query('INSERT INTO public.audit_events (store_id,actor_user_id,action,metadata) VALUES ($1,$2,$3,$4)', [storeId, req.user.id, 'integration.connected', JSON.stringify({ provider })]);
      return publicIntegration(rows[0]);
    });
    res.json({ integration, message: 'Credencial guardada de forma cifrada. Sincroniza para comprobar el acceso; conectar no valida los permisos del proveedor.' });
  }));

  app.post('/api/integrations/:provider/sync', requireStaff, asyncRoute(async (req, res) => {
    const provider = providerName(req.params.provider);
    const storeId = uuid(req.body.storeId, 'Tienda');
    const data = await withContext(req.user, async (client) => {
      const store = await requireStore(client, storeId);
      const integration = (await client.query('SELECT * FROM public.api_integrations WHERE store_id=$1 AND provider=$2', [storeId, provider])).rows[0];
      if (!integration || integration.status === 'disconnected') throw new HttpError(409, 'Conecta esta integración antes de sincronizar.');
      if (integration.status === 'demo') throw new HttpError(409, 'Estos datos son de demostración. Conecta una cuenta real para sincronizar.');
      const credential = (await client.query('SELECT public.read_credential($1::uuid) AS ciphertext', [integration.id])).rows[0].ciphertext;
      if (!credential) throw new HttpError(409, 'Faltan credenciales para esta integración.');
      const run = (await client.query("INSERT INTO public.sync_runs (store_id,integration_id,status) VALUES ($1,$2,'running') RETURNING id", [storeId, integration.id])).rows[0];
      return { store, integration, credentials: decryptCredentials(credential), runId: run.id };
    });
    try {
      const payload = await syncProvider(provider, { ...data, days: provider === 'clarity' ? 3 : 28 });
      let count = 0;
      await withContext(req.user, async (client) => {
        for (const row of payload.daily || []) {
          await client.query("INSERT INTO public.daily_metrics (store_id,date,currency,revenue,orders,sessions,conversion_rate,source) VALUES ($1,$2,$3,$4,$5,$6,$7,'shopify') ON CONFLICT (store_id,date,currency,source) DO UPDATE SET revenue=EXCLUDED.revenue,orders=EXCLUDED.orders,sessions=EXCLUDED.sessions,conversion_rate=EXCLUDED.conversion_rate", [storeId, row.date, row.currency || data.store.currency, row.revenue, row.orders, row.sessions ?? null, row.conversionRate ?? null]); count++;
        }
        for (const row of payload.clarity || []) {
          await client.query("INSERT INTO public.clarity_metrics (store_id,date,sessions,dead_clicks,rage_clicks,quick_backs,scroll_depth,source,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,'clarity',$8) ON CONFLICT (store_id,date,source) DO UPDATE SET sessions=EXCLUDED.sessions,dead_clicks=EXCLUDED.dead_clicks,rage_clicks=EXCLUDED.rage_clicks,quick_backs=EXCLUDED.quick_backs,scroll_depth=EXCLUDED.scroll_depth,metadata=EXCLUDED.metadata", [storeId, row.date, row.sessions ?? null, row.deadClicks ?? null, row.rageClicks ?? null, row.quickBacks ?? null, row.scrollDepth ?? null, JSON.stringify(row.metadata || {})]); count++;
        }
        // Intelligems requiere un adaptador verificado; nunca generamos resultados.
        if ((payload.experiments || []).length) throw new HttpError(501, 'La importación de experimentos todavía requiere un adaptador validado.');
        await client.query("UPDATE public.api_integrations SET status='connected',last_synced_at=now(),last_error=NULL WHERE id=$1", [data.integration.id]);
        await client.query("UPDATE public.sync_runs SET status='completed',finished_at=now(),records_processed=$2 WHERE id=$1", [data.runId, count]);
      });
      res.json({ message: 'Sincronización completada.', recordsProcessed: count, warnings: payload.warnings || [] });
    } catch (error) {
      // No persistir errores externos que puedan contener encabezados o secretos.
      await withContext(req.user, async (client) => {
        await client.query("UPDATE public.api_integrations SET status='error',last_error='La sincronización falló; revisa permisos y configuración.' WHERE id=$1", [data.integration.id]);
        await client.query("UPDATE public.sync_runs SET status='failed',finished_at=now(),error='No se pudo completar la sincronización.' WHERE id=$1", [data.runId]);
      });
      if (error.status) throw new HttpError(error.status, error.message);
      throw new HttpError(502, 'No se pudo completar la sincronización. Revisa los permisos y la configuración del proveedor.');
    }
  }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  if (process.env.NODE_ENV === 'production') {
    const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
    app.use(express.static(clientDist));
    app.get('/{*path}', (req, res) => res.sendFile(`${clientDist}index.html`));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
    if (['23503', '23514', '22P02'].includes(error.code)) return res.status(400).json({ error: 'Los datos no cumplen las restricciones.' });
    if (error.code === '42501') return res.status(403).json({ error: 'No tienes permisos para esta operación.' });
    if (!error.status) console.error('Error interno de API:', error.code || error.name);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo completar la operación.' });
  });
  return app;
}
