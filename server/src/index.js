import { createApp } from './app.js';
import { config, validateConfig } from './config.js';
import { pool } from './db.js';

validateConfig();
const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => console.log(`API disponible en http://localhost:${config.port}`));

async function shutdown() {
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
