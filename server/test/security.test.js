import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicSyncRun, publicAuditEvent } from '../src/security.js';

const privateValue = 'credencial-privada-solo-para-prueba';
const runRow = {
  id: '11111111-1111-4111-8111-111111111111',
  integration_id: '22222222-2222-4222-8222-222222222222',
  provider: 'intelligems',
  status: 'completed',
  started_at: '2026-10-13T10:00:00.000Z',
  finished_at: '2026-10-13T10:00:02.000Z',
  records_processed: '6',
  error: null,
  api_key: privateValue,
  ciphertext: privateValue,
  password_hash: privateValue,
};
const auditRow = {
  id: '33333333-3333-4333-8333-333333333333',
  store_id: '11111111-1111-4111-8111-111111111111',
  store_name: 'Tienda de pruebas',
  actor_user_id: '44444444-4444-4444-8444-444444444444',
  actor_email: 'empleado@demo.local',
  action: 'integration.synced',
  metadata: { provider: 'intelligems', recordsProcessed: 6 },
  created_at: '2026-10-13T10:00:02.000Z',
  password_hash: privateValue,
  access_token: privateValue,
};

test('el DTO del historial solo publica su contrato y convierte filas procesadas', () => {
  assert.deepEqual(publicSyncRun(runRow), {
    id: runRow.id,
    integrationId: runRow.integration_id,
    provider: runRow.provider,
    status: runRow.status,
    startedAt: runRow.started_at,
    finishedAt: runRow.finished_at,
    recordsProcessed: 6,
    error: null,
  });
  assert.equal(publicSyncRun({ ...runRow, records_processed: null }).recordsProcessed, 0);
});

test('los diagnósticos públicos del historial nunca muestran errores SQL o upstream', () => {
  const safe = 'No se pudo completar la sincronización.';
  assert.equal(publicSyncRun({ ...runRow, status: 'failed', error: safe }).error, safe);
  for (const error of [
    `HTTP 401: Authorization: Bearer ${privateValue}`,
    `SQL INSERT falló: ciphertext=${privateValue}`,
    { detail: privateValue },
  ]) {
    const result = publicSyncRun({ ...runRow, status: 'failed', error });
    assert.equal(result.error, safe);
    assert.equal(JSON.stringify(result).includes(privateValue), false);
  }
});

test('el DTO de auditoría publica actor, tienda y campos seguros de la acción', () => {
  assert.deepEqual(publicAuditEvent(auditRow), {
    id: auditRow.id,
    storeId: auditRow.store_id,
    storeName: auditRow.store_name,
    actorUserId: auditRow.actor_user_id,
    actorEmail: auditRow.actor_email,
    action: auditRow.action,
    metadata: { provider: 'intelligems', recordsProcessed: 6 },
    createdAt: auditRow.created_at,
  });
  const result = publicAuditEvent({ ...auditRow, store_name: null, actor_email: null });
  assert.equal(result.storeName, null);
  assert.equal(result.actorEmail, null);
});

test('auditoría filtra metadatos por acción y descarta credenciales adicionales', () => {
  const cases = [
    ['user.created', { userId: auditRow.actor_user_id, role: 'CLIENT' }],
    ['store.created', { domain: 'pruebas.myshopify.com', currency: 'MXN' }],
    ['integration.connected', { provider: 'shopify' }],
    ['integration.synced', { provider: 'clarity', recordsProcessed: 1 }],
  ];
  for (const [action, metadata] of cases) {
    const result = publicAuditEvent({
      ...auditRow,
      action,
      metadata: { ...metadata, accessToken: privateValue, ciphertext: privateValue,
        passwordHash: privateValue, upstream: { secret: privateValue } },
    });
    assert.deepEqual(result.metadata, metadata);
    assert.equal(JSON.stringify(result).includes(privateValue), false);
  }
  assert.deepEqual(publicAuditEvent({ ...auditRow, action: 'unknown.event',
    metadata: { provider: 'shopify', arbitrary: privateValue } }).metadata, {});
});

test('auditoría no publica objetos anidados aunque usen nombres de campos permitidos', () => {
  const cases = [
    ['user.created', { userId: { secret: privateValue }, role: { secret: privateValue } }],
    ['store.created', { domain: { secret: privateValue }, currency: { secret: privateValue } }],
    ['integration.connected', { provider: { secret: privateValue } }],
    ['integration.synced', { provider: { secret: privateValue }, recordsProcessed: { secret: privateValue } }],
  ];
  for (const [action, metadata] of cases) {
    const result = publicAuditEvent({ ...auditRow, action, metadata });
    assert.deepEqual(result.metadata, {});
    assert.equal(JSON.stringify(result).includes(privateValue), false);
  }
  for (const metadata of [null, undefined, privateValue, [privateValue]]) {
    assert.deepEqual(publicAuditEvent({ ...auditRow, metadata }).metadata, {});
  }
});
