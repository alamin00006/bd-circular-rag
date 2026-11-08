import { Router } from 'express';

import { env } from '../../config/env.js';
import { pool } from '../../db/pool.js';
import { redis } from '../../lib/redis.js';

export const healthRouter = Router();

async function check(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

healthRouter.get('/', async (_req, res) => {
  const [database, redisOk] = await Promise.all([
    check(() => pool.query('SELECT 1')),
    check(() => redis.ping()),
  ]);
  const ok = database && redisOk;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    database,
    redis: redisOk,
    version: env.APP_VERSION,
  });
});