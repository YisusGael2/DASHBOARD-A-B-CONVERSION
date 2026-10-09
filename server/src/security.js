import crypto from 'node:crypto';
import { credentialKey } from './config.js';

export function encryptCredentials(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') });
}

export function decryptCredentials(value) {
  const encrypted = typeof value === 'string' ? JSON.parse(value) : value;
  if (encrypted.v !== 1) throw new Error('Formato de credenciales no soportado.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'base64')), decipher.final()]).toString('utf8'));
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function uuid(value, label = 'Identificador') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, `${label} inválido.`);
  return value;
}

export function textValue(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, `${label} inválido.`);
  return value.trim();
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, storeId: user.store_id, status: user.status };
}

export function publicStore(store) {
  return { id: store.id, name: store.name, domain: store.domain, currency: store.currency, timeZone: store.timezone, status: store.status };
}

export function publicIntegration(row) {
  return { id: row.id, provider: row.provider, status: row.status, lastSyncedAt: row.last_synced_at, externalAccountId: row.external_id };
}

export function storeIdFor(user, requested) {
  if (user.role === 'CLIENT') {
    if (requested && requested !== user.store_id) throw new HttpError(403, 'No tienes acceso a esta tienda.');
    return user.store_id;
  }
  return uuid(requested, 'Tienda');
}
