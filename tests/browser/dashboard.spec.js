import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from '../../server/src/config.js';

const storeA = '11111111-1111-4111-8111-111111111111';
const storeB = '22222222-2222-4222-8222-222222222222';

async function signIn(page, email) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar al dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'El panorama completo.' })).toBeVisible();
  await expect(page.locator('.loading')).toHaveCount(0);
}

function nav(page, name) {
  return page.getByRole('navigation').getByRole('button', { name, exact: true });
}

test('login rechaza una contraseña incorrecta', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('cliente@demo.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('password-incorrecta');
  await page.getByRole('button', { name: 'Entrar al dashboard' }).click();
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('cliente navega su tienda y el servidor bloquea otra tienda', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await signIn(page, 'cliente@demo.local');
  await expect(page.locator('.store-picker')).toContainText('Nómada Studio');
  await expect(page.getByRole('combobox', { name: 'Seleccionar tienda' })).toHaveCount(0);
  await expect(nav(page, 'Equipo y accesos')).toHaveCount(0);
  await expect(page.locator('.demo-banner')).toContainText('datos de ejemplo');
  const token = await page.evaluate(() => localStorage.getItem('centraliza_token'));
  const forbidden = await page.request.get(`/api/dashboard?storeId=${storeB}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(forbidden.status()).toBe(403);
  await nav(page, 'Pruebas A/B').click();
  await expect(page.getByRole('heading', { name: 'Cada prueba, un aprendizaje.' })).toBeVisible();
  await expect(page.locator('.experiment-detailed')).toHaveCount(2);
  await nav(page, 'Integraciones').click();
  await expect(page.locator('.integration-card')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Configurar', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'El panorama completo.' })).toBeVisible();
  await page.getByTitle('Cerrar sesión').click();
  await expect(page.getByRole('button', { name: 'Entrar al dashboard' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('centraliza_token'))).toBeNull();
  expect(errors).toEqual([]);
});

test('admin cambia de tienda y solo puede crear clientes', async ({ page }) => {
  await signIn(page, 'admin@demo.local');
  const picker = page.getByRole('combobox', { name: 'Seleccionar tienda' });
  await picker.selectOption(storeB);
  await expect(page.locator('.store-domain')).toContainText('demo-casa-botanica.myshopify.com');
  await picker.selectOption(storeA);
  await expect(page.locator('.store-domain')).toContainText('demo-nomada-studio.myshopify.com');
  await nav(page, 'Equipo y accesos').click();
  await expect(page.getByRole('cell', { name: 'cliente@demo.local', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Crear acceso', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Rol').locator('option')).toHaveCount(1);
  await expect(dialog.getByLabel('Tienda')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toHaveCount(0);
});

test('super admin ve empleados y los tres roles disponibles', async ({ page }) => {
  await signIn(page, 'super@demo.local');
  await nav(page, 'Equipo y accesos').click();
  await expect(page.getByRole('cell', { name: 'admin@demo.local', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Crear acceso', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Rol').locator('option')).toHaveCount(3);
  await dialog.getByLabel('Rol').selectOption('ADMIN');
  await expect(dialog.getByLabel('Tienda', { exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
});

test('dashboard y navegación funcionan en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'otro@demo.local');
  await expect(page.locator('.store-picker')).toContainText('Casa Botánica');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await nav(page, 'Pruebas A/B').click();
  await expect(page.getByRole('heading', { name: 'Cada prueba, un aprendizaje.' })).toBeVisible();
  await expect(page.locator('.sidebar')).not.toHaveClass(/sidebar-open/);
});

test('crear tienda y guardar integración no inventa métricas ni conexión verificada', async ({ page }) => {
  const domain = `e2e-${randomUUID()}.myshopify.com`;
  let createdId;
  try {
    await signIn(page, 'admin@demo.local');
    await page.getByRole('button', { name: 'Añadir tienda', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nombre de la tienda').fill('Tienda temporal E2E');
    await dialog.getByLabel('Dominio de Shopify').fill(domain);
    const created = page.waitForResponse(response => response.url().endsWith('/api/stores') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Crear tienda', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    createdId = (await response.json()).store.id;
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Seleccionar tienda' })).toHaveValue(createdId);
    await expect(page.locator('.loading')).toHaveCount(0);
    await expect(page.locator('.metric-value')).toHaveText(['No disponible', 'No disponible', 'No disponible', 'No disponible']);
    await nav(page, 'Integraciones').click();
    const shopify = page.locator('.integration-card').filter({ has: page.getByRole('heading', { name: 'Shopify', exact: true }) });
    await shopify.getByRole('button', { name: 'Configurar', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Dominio de Shopify').fill(domain);
    await page.getByRole('dialog').getByLabel('Token de acceso').fill('fake-local-e2e-token-no-provider-request');
    await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(shopify).toContainText('Credencial guardada');
    await expect(shopify).not.toContainText('Sincronizada');
    await expect(page.locator('.demo-banner')).toHaveCount(0);
    await nav(page, 'Resumen').click();
    await expect(page.locator('.metric-value')).toHaveText(['No disponible', 'No disponible', 'No disponible', 'No disponible']);
  } finally {
    if (createdId) {
      const connection = new pg.Client({ connectionString: config.databaseAdminUrl });
      await connection.connect();
      try {
        await connection.query('DELETE FROM public.audit_events WHERE store_id=$1', [createdId]);
        await connection.query('DELETE FROM public.api_integrations WHERE store_id=$1', [createdId]);
        await connection.query('DELETE FROM public.stores WHERE id=$1', [createdId]);
      } finally { await connection.end(); }
    }
  }
});
