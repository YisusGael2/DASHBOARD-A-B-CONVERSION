import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
pool.on('error', () => console.error('Se perdió una conexión PostgreSQL inactiva.'));

export async function withContext(user, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.role', $2, true), set_config('app.store_id', $3, true)", [user.id, user.role, user.store_id || '']);
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
