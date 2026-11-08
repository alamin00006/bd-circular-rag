import type { ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';

import { env } from '../config/env.js';

/**
 * Connection config for BullMQ queues and workers.
 * BullMQ requires maxRetriesPerRequest = null for its blocking connections.
 */
export const bullConnection: ConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

/** Shared client for app use (health checks, caching). */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});