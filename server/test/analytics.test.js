import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateZTest } from '../src/analytics.js';

test('el z bilateral coincide con una comparación de proporciones de referencia', () => {
  // pControl = 0.10, pVariante = 0.12, pPool = 0.11 y Z ≈ 1.429.
  // La confianza es 100 * (1 - p bilateral), no la probabilidad de ganar.
  assert.deepEqual(calculateZTest(1000, 100, 1000, 120), {
    lift: 20,
    confidence: 84.7,
  });
});

test('el z conserva la confianza al intercambiar grupos y el lift usa el control', () => {
  const improving = calculateZTest(1000, 100, 1000, 120);
  const declining = calculateZTest(1000, 120, 1000, 100);
  assert.equal(declining.confidence, improving.confidence);
  assert.equal(improving.lift, 20);
  assert.equal(declining.lift, -16.7);
});

test('proporciones idénticas válidas dan lift cero y confianza cero', () => {
  assert.deepEqual(calculateZTest(1000, 100, 2000, 200), {
    lift: 0,
    confidence: 0,
  });
});

test('el z limita la confianza extrema a 99.9 y mantiene el lift observado', () => {
  assert.deepEqual(calculateZTest(10_000, 1000, 10_000, 2000), {
    lift: 100,
    confidence: 99.9,
  });
});

test('un control sin conversiones no permite lift pero sí comparar proporciones', () => {
  const result = calculateZTest(1000, 0, 1000, 100);
  assert.equal(result.lift, null);
  assert.equal(result.confidence, 99.9);
});

test('tasas degeneradas sin error estándar conservan lift y dejan confianza ausente', () => {
  assert.deepEqual(calculateZTest(100, 0, 100, 0), {
    lift: null,
    confidence: null,
  });
  assert.deepEqual(calculateZTest(100, 100, 200, 200), {
    lift: 0,
    confidence: null,
  });
});

test('el z rechaza conteos inválidos en cualquiera de los grupos', () => {
  const valid = [1000, 100, 1000, 120];
  const cases = [
    [0, 100, 1000, 120],
    [-1, 0, 1000, 120],
    [1000, -1, 1000, 120],
    [1000, 1001, 1000, 120],
    [1000, 100, 0, 0],
    [1000, 100, -1, 0],
    [1000, 100, 1000, -1],
    [1000, 100, 1000, 1001],
    [1000.5, 100, 1000, 120],
    [1000, 100.5, 1000, 120],
    [1000, 100, 1000.5, 120],
    [1000, 100, 1000, 120.5],
  ];
  for (const value of [null, undefined, '', '100', NaN, Infinity, -Infinity]) {
    for (let index = 0; index < valid.length; index += 1) {
      const counts = [...valid];
      counts[index] = value;
      cases.push(counts);
    }
  }
  for (const counts of cases) {
    assert.deepEqual(calculateZTest(...counts), { lift: null, confidence: null },
      `No se deben calcular resultados para ${counts.map(String).join(', ')}.`);
  }
});
