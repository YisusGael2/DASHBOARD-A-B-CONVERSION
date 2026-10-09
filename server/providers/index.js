/**
 * Server-side provider adapters. Tokens must be supplied by the backend after
 * decrypting its credential store; never pass these options to the browser.
 */
const SHOPIFY_DEFAULT_VERSION = '2026-07';
const CLARITY_ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';
const PAGE_SIZE = 250;
const MAX_PAGES = 20;
const REQUEST_TIMEOUT_MS = 12_000;
const SYNC_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 2_000_000;

export class ProviderError extends Error {
  constructor(message, status = 502, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.code = code;
  }
}

function requiredToken(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 8192 || /[\r\n]/.test(value)) {
    throw new ProviderError('Falta una credencial válida para esta integración.', 400, 'MISSING_CREDENTIAL');
  }
  return value.trim();
}

function shopifyDomain(value) {
  const domain = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/.test(domain)) {
    throw new ProviderError('Configura el dominio canónico de Shopify: nombre.myshopify.com.', 400, 'INVALID_SHOPIFY_DOMAIN');
  }
  return domain;
}

function windowDays(value, maximum) {
  const days = value === undefined ? Math.min(14, maximum) : Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 31) {
    throw new ProviderError('El período debe ser un entero entre 1 y 31 días.', 400, 'INVALID_PERIOD');
  }
  return Math.min(days, maximum);
}

function localDate(date, timeZone = 'UTC') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = (name) => parts.find((part) => part.type === name)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    throw new ProviderError('La zona horaria configurada para la tienda no es válida.', 400, 'INVALID_TIMEZONE');
  }
}

function shiftDate(date, delta) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

// Exact decimal arithmetic: no floating-point rounding for Shopify money.
function toUnits(amount) {
  if (typeof amount !== 'string' || !/^\d{1,18}(?:\.\d{1,6})?$/.test(amount)) {
    throw new ProviderError('Shopify devolvió un importe no compatible. No se guardaron resultados parciales.', 502, 'INVALID_MONEY');
  }
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

function fromUnits(value) {
  const whole = value / 1_000_000n;
  const fraction = String(value % 1_000_000n).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}.00`;
}

async function readJson(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ProviderError('El proveedor devolvió una respuesta vacía.', 502, 'INVALID_RESPONSE');
  }
  let bytes = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new ProviderError('La respuesta del proveedor excede el límite permitido.', 502, 'RESPONSE_TOO_LARGE');
    }
    chunks.push(value);
  }
  const combined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(combined));
  } catch {
    throw new ProviderError('El proveedor devolvió datos JSON inválidos.', 502, 'INVALID_RESPONSE');
  }
}

async function requestJson(url, options, deadline) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new ProviderError('La sincronización excedió su tiempo máximo. Reduce el período y vuelve a intentar.', 504, 'TIMEOUT');
    }
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining)),
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after'));
        await response.body?.cancel();
        if (attempt === 2) {
          throw new ProviderError('El proveedor alcanzó su límite de solicitudes. Intenta más tarde.', 429, 'RATE_LIMITED');
        }
        const delay = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 5000) : 1000 * (attempt + 1);
        if (Date.now() + delay >= deadline) {
          throw new ProviderError('El proveedor alcanzó su límite de solicitudes. Intenta más tarde.', 429, 'RATE_LIMITED');
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 401 || response.status === 403) {
          throw new ProviderError('El proveedor rechazó la credencial o sus permisos. Revisa la integración.', 403, 'PROVIDER_AUTH');
        }
        throw new ProviderError('El proveedor no pudo completar la solicitud. Revisa su disponibilidad y la compatibilidad de la API.', 502, 'PROVIDER_HTTP');
      }
      return await readJson(response);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new ProviderError('El proveedor no respondió dentro del tiempo permitido.', 504, 'TIMEOUT');
      }
      // Never forward upstream bodies, request options or errors containing URLs/tokens.
      throw new ProviderError('No fue posible conectar con el proveedor mediante HTTPS.', 502, 'PROVIDER_NETWORK');
    }
  }
}

const ORDERS_QUERY = `query DashboardOrders($first: Int!, $after: String, $query: String!) {
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
    edges {
      cursor
      node {
        id
        createdAt
        cancelledAt
        test
        currentTotalPriceSet { shopMoney { amount currencyCode } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

async function syncShopify({ store = {}, credentials = {}, days }) {
  const domain = shopifyDomain(store.domain);
  const token = requiredToken(credentials.accessToken);
  const apiVersion = process.env.SHOPIFY_API_VERSION || SHOPIFY_DEFAULT_VERSION;
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) {
    throw new ProviderError('SHOPIFY_API_VERSION debe usar el formato YYYY-MM de una versión estable.', 500, 'INVALID_API_VERSION');
  }
  const count = windowDays(days, 31);
  const now = new Date();
  const today = localDate(now, store.timezone || 'UTC');
  const startDate = shiftDate(today, 1 - count);
  // One extra UTC day covers even UTC+14; local calendar dates are filtered below.
  const from = `${shiftDate(startDate, -1)}T00:00:00Z`;
  const query = `created_at:>='${from}' created_at:<='${now.toISOString()}'`;
  const deadline = Date.now() + SYNC_TIMEOUT_MS;
  const buckets = new Map();
  let currency = store.currency || null;
  for (let offset = 0; offset < count; offset += 1) {
    buckets.set(shiftDate(startDate, offset), { units: 0n, orders: 0 });
  }
  const seen = new Set();
  const cursors = new Set();
  let after = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await requestJson(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query: ORDERS_QUERY, variables: { first: PAGE_SIZE, after, query } }),
    }, deadline);
    if (payload.errors?.length) {
      const throttled = payload.errors.some((error) => error.extensions?.code === 'THROTTLED');
      throw new ProviderError(throttled
        ? 'Shopify alcanzó su límite de consultas. Intenta más tarde.'
        : 'Shopify rechazó la consulta. Revisa permisos read_orders y compatibilidad de la versión API.',
      throttled ? 429 : 502, throttled ? 'RATE_LIMITED' : 'SHOPIFY_QUERY');
    }
    const orders = payload.data?.orders;
    if (!Array.isArray(orders?.edges) || typeof orders.pageInfo?.hasNextPage !== 'boolean') {
      throw new ProviderError('Shopify devolvió una estructura inesperada. No se guardaron resultados parciales.', 502, 'INVALID_RESPONSE');
    }
    for (const { node } of orders.edges) {
      if (!node?.id || !node.createdAt || typeof node.test !== 'boolean') {
        throw new ProviderError('Shopify devolvió un pedido incompleto.', 502, 'INVALID_RESPONSE');
      }
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (node.test || node.cancelledAt) continue;
      const createdAt = new Date(node.createdAt);
      if (!Number.isFinite(createdAt.getTime())) {
        throw new ProviderError('Shopify devolvió una fecha no válida.', 502, 'INVALID_RESPONSE');
      }
      const date = localDate(createdAt, store.timezone || 'UTC');
      const bucket = buckets.get(date);
      if (!bucket) continue;
      const money = node.currentTotalPriceSet?.shopMoney;
      if (!money || typeof money.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(money.currencyCode)) {
        throw new ProviderError('Shopify devolvió una moneda no válida.', 502, 'INVALID_RESPONSE');
      }
      currency ||= money.currencyCode;
      if (money.currencyCode !== currency) {
        throw new ProviderError('La moneda de Shopify no coincide con la tienda. Actualiza la configuración antes de sincronizar.', 409, 'CURRENCY_MISMATCH');
      }
      bucket.units += toUnits(money.amount);
      bucket.orders += 1;
    }
    if (!orders.pageInfo.hasNextPage) {
      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        throw new ProviderError('Configura la moneda de la tienda antes de sincronizar.', 400, 'MISSING_CURRENCY');
      }
      return { daily: [...buckets].map(([date, bucket]) => ({
        date, revenue: fromUnits(bucket.units), orders: bucket.orders,
        currency, sessions: null, conversionRate: null,
      })) };
    }
    const nextCursor = orders.pageInfo.endCursor;
    if (typeof nextCursor !== 'string' || !nextCursor || cursors.has(nextCursor)) {
      throw new ProviderError('Shopify devolvió una paginación no válida.', 502, 'INVALID_PAGINATION');
    }
    cursors.add(nextCursor);
    after = nextCursor;
  }
  throw new ProviderError('El período supera 5.000 pedidos. Reduce el período; no se guardaron resultados parciales.', 422, 'ORDER_LIMIT');
}

function numeric(value, { integer = false, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > maximum || (integer && !Number.isSafeInteger(parsed))) return null;
  return parsed;
}

async function syncClarity({ store = {}, integration = {}, credentials = {}, days }) {
  const token = requiredToken(credentials.apiKey);
  const count = windowDays(days, 3);
  const url = new URL(CLARITY_ENDPOINT);
  url.searchParams.set('numOfDays', String(count));
  const payload = await requestJson(url.toString(), {
    method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }, Date.now() + SYNC_TIMEOUT_MS);
  if (!Array.isArray(payload) || payload.length > 100 || payload.some((metric) =>
    typeof metric?.metricName !== 'string' || !Array.isArray(metric.information))) {
    throw new ProviderError('Clarity devolvió una estructura no compatible. Revisa la documentación de Export API.', 502, 'INVALID_RESPONSE');
  }
  // Undimensioned export is a period snapshot. Percentages must not become counts.
  const traffic = payload.find((metric) => metric.metricName === 'Traffic')?.information;
  const scroll = payload.find((metric) => metric.metricName === 'ScrollDepth')?.information;
  const date = localDate(new Date(), store.timezone || 'UTC');
  return { clarity: [{
    date,
    sessions: traffic?.length === 1 ? numeric(traffic[0].totalSessionCount, { integer: true }) : null,
    deadClicks: null, rageClicks: null, quickBacks: null,
    scrollDepth: scroll?.length === 1 ? numeric(scroll[0].averageScrollDepth, { maximum: 100 }) : null,
    metadata: {
      aggregation: 'period_snapshot', windowDays: count,
      snapshotDate: date, projectId: integration.external_id || null,
      response: payload,
      attribution: 'No existe atribución a variantes A/B en este adaptador.',
    },
  }] };
}

export async function syncProvider(provider, options) {
  switch (String(provider).toLowerCase()) {
    case 'shopify': return syncShopify(options || {});
    case 'clarity': return syncClarity(options || {});
    case 'intelligems':
      throw new ProviderError('La sincronización real de Intelligems está pendiente de verificar su API y permisos. Usa los datos de demostración para probar el dashboard.', 501, 'INTELLIGEMS_NOT_IMPLEMENTED');
    default:
      throw new ProviderError('Proveedor de integración no soportado.', 400, 'UNKNOWN_PROVIDER');
  }
}
