import test from 'node:test';
import assert from 'node:assert/strict';
import { syncProvider } from './index.js';

function environment(t, key, value) {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  t.after(() => {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
}

test.beforeEach((t) => { environment(t, 'MOCK_PROVIDERS', undefined); });

function stubFetch(t, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => { globalThis.fetch = previous; });
}

function response(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function order(id, amount, extras = {}) {
  return { cursor: id, node: {
    id, createdAt: new Date().toISOString(), cancelledAt: null, test: false,
    currentTotalPriceSet: { shopMoney: { amount, currencyCode: 'USD' } },
    ...extras,
  } };
}

function orders(edges, pageInfo = { hasNextPage: false, endCursor: null }) {
  return { data: { orders: { edges, pageInfo } } };
}

const shopifyOptions = {
  store: { domain: 'example.myshopify.com', currency: 'USD', timezone: 'UTC' },
  credentials: { accessToken: 'test-only-provider-token' }, days: 1,
};

test('Shopify accepts only canonical myshopify.com hosts and never fetches invalid domains', async (t) => {
  let requests = 0;
  stubFetch(t, async () => { requests += 1; throw new Error('unexpected fetch'); });
  for (const domain of [
    'localhost', '127.0.0.1', 'https://example.myshopify.com',
    'example.myshopify.com.evil.test', 'example.myshopify.com:443',
    'example.myshopify.com/path', 'token@example.myshopify.com',
    'example.myshopify.com\n.evil.test',
  ]) {
    await assert.rejects(syncProvider('shopify', {
      ...shopifyOptions, store: { ...shopifyOptions.store, domain },
    }), (error) => error.status === 400 && error.code === 'INVALID_SHOPIFY_DOMAIN');
  }
  assert.equal(requests, 0);
});

test('Shopify sums money exactly, deduplicates orders, and excludes test/cancelled orders', async (t) => {
  stubFetch(t, async (url, options) => {
    assert.match(url, /^https:\/\/example\.myshopify\.com\/admin\/api\/20\d{2}-(01|04|07|10)\/graphql\.json$/);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['X-Shopify-Access-Token'], 'test-only-provider-token');
    return response(orders([
      order('one', '0.10'), order('two', '0.20'), order('two', '0.20'),
      order('test', '200', { test: true }), order('cancelled', '300', { cancelledAt: new Date().toISOString() }),
    ]));
  });
  const result = await syncProvider('shopify', shopifyOptions);
  assert.equal(result.daily.length, 1);
  assert.equal(result.daily[0].revenue, '0.3');
  assert.equal(result.daily[0].orders, 2);
  assert.equal(result.daily[0].sessions, null);
  assert.equal(result.daily[0].conversionRate, null);
});

test('Shopify returns zero dates so a refreshed window can replace stale cached totals', async (t) => {
  stubFetch(t, async () => response(orders([])));
  const result = await syncProvider('shopify', { ...shopifyOptions, days: 3 });
  assert.equal(result.daily.length, 3);
  assert.ok(result.daily.every((day) => day.orders === 0 && day.revenue === '0.00'));
});

test('Shopify paginates before returning any aggregate', async (t) => {
  let calls = 0;
  stubFetch(t, async (_url, options) => {
    const variables = JSON.parse(options.body).variables;
    calls += 1;
    if (calls === 1) {
      assert.equal(variables.after, null);
      return response(orders([order('one', '12.34')], { hasNextPage: true, endCursor: 'page-one' }));
    }
    assert.equal(variables.after, 'page-one');
    return response(orders([order('two', '0.01')]));
  });
  const result = await syncProvider('shopify', shopifyOptions);
  assert.equal(calls, 2);
  assert.equal(result.daily[0].revenue, '12.35');
  assert.equal(result.daily[0].orders, 2);
});

test('Shopify detects pagination loops rather than returning partial results', async (t) => {
  stubFetch(t, async () => response(orders([order('one', '1')], { hasNextPage: true, endCursor: 'same' })));
  await assert.rejects(syncProvider('shopify', shopifyOptions), (error) => error.code === 'INVALID_PAGINATION');
});

test('Shopify rejects mixed currencies instead of adding incompatible amounts', async (t) => {
  stubFetch(t, async () => response(orders([
    order('one', '1'),
    order('two', '2', { currentTotalPriceSet: { shopMoney: { amount: '2', currencyCode: 'MXN' } } }),
  ])));
  await assert.rejects(syncProvider('shopify', shopifyOptions), (error) => error.status === 409 && error.code === 'CURRENCY_MISMATCH');
});

test('Provider failures never expose upstream text or credentials', async (t) => {
  const token = 'sensitive-test-string';
  stubFetch(t, async () => response({ detail: `Unauthorized token: ${token}` }, 403));
  await assert.rejects(syncProvider('shopify', {
    ...shopifyOptions, credentials: { accessToken: token },
  }), (error) => {
    assert.equal(error.status, 403);
    assert.ok(!error.message.includes(token));
    return true;
  });
});

test('Provider network errors never leak fetch errors that may contain tokens', async (t) => {
  stubFetch(t, async () => { throw new Error('network failed with test-only-provider-token'); });
  await assert.rejects(syncProvider('shopify', shopifyOptions), (error) => {
    assert.equal(error.code, 'PROVIDER_NETWORK');
    assert.ok(!error.message.includes('test-only-provider-token'));
    return true;
  });
});

test('HTTP rate limits retry a bounded number of times', async (t) => {
  let calls = 0;
  stubFetch(t, async () => {
    calls += 1;
    return response({}, 429, { 'retry-after': '0.001' });
  });
  await assert.rejects(syncProvider('shopify', shopifyOptions), (error) => error.status === 429);
  assert.equal(calls, 3);
});

test('Clarity saves a period snapshot and never turns percentages into click counts', async (t) => {
  const payload = [
    { metricName: 'Traffic', information: [{ totalSessionCount: '123' }] },
    { metricName: 'DeadClickCount', information: [{ sessionsWithMetricPercentage: '8.4' }] },
    { metricName: 'RageClickCount', information: [{ sessionsWithMetricPercentage: '2' }] },
    { metricName: 'ScrollDepth', information: [{ averageScrollDepth: '61.5' }] },
  ];
  stubFetch(t, async (url, options) => {
    assert.equal(url, 'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3');
    assert.equal(options.headers.Authorization, 'Bearer test-only-clarity-token');
    return response(payload);
  });
  const result = await syncProvider('clarity', {
    store: { timezone: 'UTC' }, integration: { external_id: 'project-test' },
    credentials: { apiKey: 'test-only-clarity-token' }, days: 14,
  });
  const metric = result.clarity[0];
  assert.equal(metric.sessions, 123);
  assert.equal(metric.scrollDepth, 61.5);
  assert.equal(metric.deadClicks, null);
  assert.equal(metric.rageClicks, null);
  assert.equal(metric.quickBacks, null);
  assert.equal(metric.metadata.aggregation, 'period_snapshot');
  assert.equal(metric.metadata.windowDays, 3);
  assert.deepEqual(metric.metadata.response, payload);
});

test('Clarity rejects an unexpected response instead of manufacturing metrics', async (t) => {
  stubFetch(t, async () => response({ response: 'unknown schema' }));
  await assert.rejects(syncProvider('clarity', {
    credentials: { apiKey: 'test-only-clarity-token' },
  }), (error) => error.code === 'INVALID_RESPONSE');
});

const intelligemsOptions = {
  store: { domain: 'example.myshopify.com', currency: 'MXN', timezone: 'Pacific/Kiritimati' },
  integration: { external_id: 'test-account' }, credentials: { apiKey: 'test-only-intelligems-key' }, days: 28,
};

function experience(extras = {}) {
  return {
    id: ' experiment-one ', name: ' Precio del producto ', status: 'active',
    started_at: '2026-01-01T10:00:00Z', confidence: '96.7',
    variants: [
      { id: ' control ', name: ' Precio actual ', is_control: true, visitors: '1200', orders: '36', revenue: '10123.40' },
      { externalId: 'variant-b', name: 'Precio nuevo', visitors: 1100, conversions: 44, revenue: '12567.89' },
    ], ...extras,
  };
}

test('Intelligems fetches the fixed endpoint and normalizes experiments and exact amounts', async (t) => {
  stubFetch(t, async (url, options) => {
    assert.equal(url, 'https://api.intelligems.io/v1/experiences');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['x-api-key'], 'test-only-intelligems-key');
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal);
    return response({ experiences: [experience()] });
  });
  const result = await syncProvider('intelligems', intelligemsOptions);
  assert.equal(result.mock, undefined);
  assert.equal(result.experiments.length, 1);
  const experiment = result.experiments[0];
  assert.equal(experiment.externalId, 'experiment-one');
  assert.equal(experiment.name, 'Precio del producto');
  assert.equal(experiment.startedAt, '2026-01-01T10:00:00Z');
  assert.equal(experiment.endedAt, null);
  assert.equal(experiment.confidence, 96.7);
  const control = experiment.variants[0];
  assert.equal(control.externalId, 'control');
  assert.equal(control.isControl, true);
  assert.equal(control.visitors, 1200);
  assert.equal(control.orders, 36);
  assert.equal(control.revenue, '10123.4');
  assert.equal(control.currency, 'MXN');
  assert.equal(control.date, new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Kiritimati', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()));
  assert.equal(experiment.variants[1].orders, 44);
});

test('Intelligems supports experiments and externalId aliases with defined fallback values', async (t) => {
  stubFetch(t, async () => response({ experiments: [{
    externalId: 'alias', status: 'unknown', confidence: 101,
    variants: [{ externalId: 'variant', visitors: -1, orders: 1.5 }],
  }] }));
  const result = await syncProvider('intelligems', { credentials: { apiKey: 'valid-key' } });
  const experiment = result.experiments[0];
  assert.equal(experiment.externalId, 'alias');
  assert.equal(experiment.name, 'Experimento');
  assert.equal(experiment.status, 'active');
  assert.equal(experiment.confidence, null);
  assert.equal(experiment.startedAt, null);
  assert.deepEqual(experiment.variants[0], {
    externalId: 'variant', name: 'Variante', isControl: false,
    date: new Date().toISOString().slice(0, 10), visitors: 0, orders: 0, revenue: '0.00', currency: 'USD',
  });
});

test('Intelligems rejects malformed payloads, missing variants, duplicated identifiers and controls', async (t) => {
  let payload;
  stubFetch(t, async () => response(payload));
  for (payload of [
    {}, null, [], { experiences: {} }, { experiments: 'invalid' },
    { experiences: [null] },
    { experiences: [experience({ id: undefined })] },
    { experiences: [experience({ id: ' ' })] },
    { experiences: [experience({ variants: [] })] },
    { experiences: [experience({ variants: [null] })] },
    { experiences: [experience({ variants: [{ id: ' ' }] })] },
    { experiences: [experience({ variants: [{ id: 'same' }, { id: 'same' }] })] },
    { experiences: [experience(), experience()] },
    { experiences: [experience({ variants: [{ id: 'one', isControl: true }, { id: 'two', is_control: true }] })] },
    { experiences: [experience({ startedAt: 'not-a-date' })] },
    { experiences: [experience({ startedAt: '2026-02-31T10:00:00Z' })] },
    { experiences: [experience({ ended_at: '2025-12-31T00:00:00Z' })] },
  ]) {
    await assert.rejects(syncProvider('intelligems', intelligemsOptions), (error) => {
      assert.equal(error.status, 502);
      assert.equal(error.code, 'INVALID_RESPONSE');
      assert.equal(error.message, 'Intelligems devolvió un formato no compatible.');
      return true;
    });
  }
});

test('Intelligems rejects unsupported monetary values without forwarding the response', async (t) => {
  stubFetch(t, async () => response({ experiences: [experience({ variants: [{ id: 'one', revenue: 'credential-in-malformed-money' }] })] }));
  await assert.rejects(syncProvider('intelligems', intelligemsOptions), (error) => {
    assert.equal(error.code, 'INVALID_MONEY');
    assert.ok(!error.message.includes('credential-in-malformed-money'));
    return true;
  });
});

test('Shopify Sandbox generates deterministic local calendar days and respects the store currency', async (t) => {
  stubFetch(t, async () => { assert.fail('Sandbox must never call fetch'); });
  const options = { ...shopifyOptions, store: { ...shopifyOptions.store, currency: 'MXN', timezone: 'Pacific/Kiritimati' }, credentials: { accessToken: 'mock_shpat_test' }, days: undefined };
  const result = await syncProvider('shopify', options);
  assert.equal(result.mock, true);
  assert.equal(result.daily.length, 28);
  assert.deepEqual(result, await syncProvider('shopify', options));
  const shorter = await syncProvider('shopify', { ...options, days: 7 });
  assert.deepEqual(shorter.daily, result.daily.slice(-7));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: options.store.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  assert.equal(result.daily.at(-1).date, today);
  for (const [index, row] of result.daily.entries()) {
    assert.equal(row.currency, 'MXN');
    assert.ok(Number.isInteger(row.orders) && row.orders > 0);
    assert.ok(Number(row.revenue) > 0);
    assert.equal(row.sessions, null);
    assert.equal(row.conversionRate, null);
    if (index) assert.equal(Date.parse(`${row.date}T12:00:00Z`) - Date.parse(`${result.daily[index - 1].date}T12:00:00Z`), 86_400_000);
  }
});

test('Clarity Sandbox keeps an explicit period snapshot and all behavior metrics', async (t) => {
  stubFetch(t, async () => { assert.fail('Sandbox must never call fetch'); });
  const options = { store: { domain: 'test.myshopify.com', timezone: 'UTC' }, integration: { external_id: 'sandbox-project' }, credentials: { apiKey: 'sandbox_clarity_test' }, days: 14 };
  const result = await syncProvider('clarity', options);
  assert.equal(result.mock, true);
  assert.deepEqual(result, await syncProvider('clarity', options));
  const snapshot = result.clarity[0];
  assert.ok(snapshot.sessions > 0 && snapshot.deadClicks > 0 && snapshot.rageClicks > 0 && snapshot.quickBacks > 0);
  assert.equal(snapshot.scrollDepth, 68.5);
  assert.deepEqual(snapshot.metadata, {
    aggregation: 'period_snapshot', windowDays: 3, snapshotDate: snapshot.date, projectId: 'sandbox-project', mock: true,
  });
});

test('Intelligems Sandbox returns two reproducible experiments without a network request', async (t) => {
  stubFetch(t, async () => { assert.fail('Sandbox must never call fetch'); });
  const options = { ...intelligemsOptions, credentials: { apiKey: 'mock_ig_test' } };
  const result = await syncProvider('intelligems', options);
  assert.equal(result.mock, true);
  assert.deepEqual(result, await syncProvider('intelligems', options));
  assert.deepEqual(result.experiments.map((experiment) => experiment.status), ['active', 'completed']);
  for (const experiment of result.experiments) {
    assert.equal(experiment.variants.length, 2);
    assert.equal(experiment.variants.filter((variant) => variant.isControl).length, 1);
    assert.deepEqual(experiment.variants.map((variant) => variant.name), ['Control', 'Variante B']);
    assert.ok(experiment.variants.every((variant) => variant.currency === 'MXN' && variant.visitors > variant.orders && variant.orders > 0 && Number(variant.revenue) > 0));
  }
});

test('Sandbox still rejects invalid domains, blank tokens, windows, currencies and timezones before fetch', async (t) => {
  stubFetch(t, async () => { assert.fail('Validation must happen before fetch'); });
  await assert.rejects(syncProvider('shopify', { ...shopifyOptions, store: { domain: 'localhost' }, credentials: { accessToken: 'mock_shopify_test' } }), (error) => error.code === 'INVALID_SHOPIFY_DOMAIN');
  for (const provider of ['shopify', 'clarity', 'intelligems']) {
    const store = { domain: 'test.myshopify.com', currency: 'USD', timezone: 'UTC' };
    const key = provider === 'shopify' ? 'accessToken' : 'apiKey';
    await assert.rejects(syncProvider(provider, { store, credentials: { [key]: '   ' } }), (error) => error.code === 'MISSING_CREDENTIAL');
    for (const days of [0, 32, 1.5, 'invalid']) {
      await assert.rejects(syncProvider(provider, { store, credentials: { [key]: 'mock_validation_test' }, days }), (error) => error.code === 'INVALID_PERIOD');
    }
    await assert.rejects(syncProvider(provider, { store: { ...store, timezone: 'Invalid/Timezone' }, credentials: { [key]: 'mock_validation_test' } }), (error) => error.code === 'INVALID_TIMEZONE');
    if (provider !== 'clarity') await assert.rejects(syncProvider(provider, { store: { ...store, currency: 'bad' }, credentials: { [key]: 'mock_validation_test' } }), (error) => error.code === 'MISSING_CURRENCY');
  }
});

test('MOCK_PROVIDERS=true enables Sandbox for valid normal tokens but cannot bypass credential validation', async (t) => {
  // The beforeEach hook restores the original environment after this case.
  process.env.MOCK_PROVIDERS = 'true';
  stubFetch(t, async () => { assert.fail('Global Sandbox must never call fetch'); });
  for (const provider of ['shopify', 'clarity', 'intelligems']) {
    const key = provider === 'shopify' ? 'accessToken' : 'apiKey';
    const options = { store: { domain: 'test.myshopify.com', currency: 'USD' }, credentials: { [key]: 'normal-valid-token' } };
    assert.equal((await syncProvider(provider, options)).mock, true);
    await assert.rejects(syncProvider(provider, { ...options, credentials: { [key]: '' } }), (error) => error.code === 'MISSING_CREDENTIAL');
  }
});

test('Unknown providers remain rejected', async () => {
  await assert.rejects(syncProvider('https://evil.test', {}), (error) => error.status === 400 && error.code === 'UNKNOWN_PROVIDER');
});
