import { type Job, Queue } from 'bullmq';

import { bullConnection } from '../lib/redis.js';

export const INGESTION_QUEUE = 'ingestion';

/**
 * Job name → payload map. Real jobs (scrape, download, parse, embed)
 * get added here in the next steps; `ping` is a smoke test.
 */
export interface IngestionJobs {
  ping: { message?: string };
}
export type IngestionJobName = keyof IngestionJobs;

export const ingestionQueue = new Queue(INGESTION_QUEUE, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

/** Type-safe enqueue: the payload must match the job name. */
export function enqueue<N extends IngestionJobName>(
  name: N,
  data: IngestionJobs[N],
): Promise<Job<IngestionJobs[N]>> {
  return ingestionQueue.add(name, data);
}