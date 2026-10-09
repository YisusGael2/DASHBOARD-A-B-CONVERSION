import test from 'node:test';
import assert from 'node:assert/strict';
import { syncProvider } from './index.js';

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

test('Intelligems clearly reports pending implementation and unknown providers are rejected', async () => {
  await assert.rejects(syncProvider('intelligems', {}), (error) => error.status === 501 && error.code === 'INTELLIGEMS_NOT_IMPLEMENTED');
  await assert.rejects(syncProvider('https://evil.test', {}), (error) => error.status === 400 && error.code === 'UNKNOWN_PROVIDER');
});
