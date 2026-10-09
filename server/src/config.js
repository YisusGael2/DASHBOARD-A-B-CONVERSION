import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  databaseAdminUrl: process.env.DATABASE_ADMIN_URL,
  jwtSecret: process.env.JWT_SECRET,
  encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY,
  demoMode: process.env.DEMO_MODE === 'true',
  port: Number(process.env.PORT || 3001),
  issuer: 'dashboard-centralizacion',
  audience: 'dashboard-client',
};

export function validateConfig() {
  if (!config.databaseUrl) throw new Error('Falta DATABASE_URL. Consulta las instrucciones de instalación.');
  if (!config.jwtSecret || Buffer.byteLength(config.jwtSecret) < 32) throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
  if (!config.encryptionKey || credentialKey().length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY debe ser una clave de 32 bytes en hexadecimal o base64.');
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('PORT inválido.');
}

export function credentialKey() {
  return /^[a-f0-9]{64}$/i.test(config.encryptionKey || '') ? Buffer.from(config.encryptionKey, 'hex') : Buffer.from(config.encryptionKey || '', 'base64');
}
