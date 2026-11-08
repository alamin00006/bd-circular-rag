import pg from 'pg';

import { env } from '../config/env.js';

// Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date,
// so dates are never shifted by the server timezone (Asia/Dhaka vs UTC).
const DATE_OID = 1082;
pg.types.setTypeParser(DATE_OID, (value) => value);

export const pool = new pg.Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  max: env.POSTGRES_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});