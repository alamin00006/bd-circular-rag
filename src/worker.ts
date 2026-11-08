/** BullMQ worker entrypoint. Run with: npm run worker */
import { type Job, Worker } from 'bullmq';

import { pool } from './db/pool.js';
import { bullConnection } from './lib/redis.js';
import {
  INGESTION_QUEUE,
  type IngestionJobName,
  type IngestionJobs,
} from './queues/ingestion.queue.js';

type Handlers = {
  [N in IngestionJobName]: (job: Job<IngestionJobs[N]>) => Promise<unknown>;
};

// One handler per job name; TypeScript forces every job in IngestionJobs to have one.
const handlers: Handlers = {
  async ping(job) {
    console.log(`[ping] job ${job.id}`, job.data);
    return 'pong';
  },
};

function isJobName(name: string): name is IngestionJobName {
  return Object.hasOwn(handlers, name);
}

const worker = new Worker(
  INGESTION_QUEUE,
  async (job: Job) => {
    if (!isJobName(job.name)) throw new Error(`No handler for job "${job.name}"`);
    return handlers[job.name](job);
  },
  { connection: bullConnection, concurrency: 4 },
);

worker.on('ready', () => console.log(`Worker listening on queue "${INGESTION_QUEUE}"`));
worker.on('completed', (job) => console.log(`Job ${job.id} (${job.name}) completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} (${job?.name}) failed:`, err));
// Connection-level errors (e.g. Redis down). BullMQ reconnects automatically.
worker.on('error', (err) => console.error('Worker error:', err.message));

const shutdown = async (signal: string): Promise<void> => {
  console.log(`${signal} received, closing worker...`);
  await worker.close(); // waits for running jobs to finish
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));