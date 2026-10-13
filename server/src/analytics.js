/**
 * Prueba z bilateral de dos proporciones con estimador combinado.
 * confidence = 100 * (1 - valor p), no probabilidad de que gane una variante.
 * Requiere visitantes independientes y conversiones binarias; no elige ganadores.
 */
export function calculateZTest(controlVisitors, controlOrders, variantVisitors, variantOrders) {
  const values = [controlVisitors, controlOrders, variantVisitors, variantOrders];
  if (values.some((value) => !Number.isSafeInteger(value))
    || controlVisitors <= 0 || variantVisitors <= 0
    || controlOrders < 0 || variantOrders < 0
    || controlOrders > controlVisitors || variantOrders > variantVisitors) {
    return { lift: null, confidence: null };
  }
  const controlRate = controlOrders / controlVisitors;
  const variantRate = variantOrders / variantVisitors;
  const lift = controlRate > 0 ? Number(((variantRate - controlRate) / controlRate * 100).toFixed(1)) : null;
  const pooledRate = (controlOrders + variantOrders) / (controlVisitors + variantVisitors);
  if (pooledRate <= 0 || pooledRate >= 1) return { lift, confidence: null };
  const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlVisitors + 1 / variantVisitors));
  const z = Math.abs(variantRate - controlRate) / standardError;
  // Abramowitz y Stegun 26.2.17: error absoluto de la CDF menor que 7.5e-8.
  const t = 1 / (1 + 0.2316419 * z);
  const polynomial = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * polynomial;
  const confidence = Number(Math.max(0, Math.min(99.9, (2 * cdf - 1) * 100)).toFixed(1));
  return { lift, confidence };
}
