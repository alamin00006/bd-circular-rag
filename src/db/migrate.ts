/**
 * Minimal SQL migration runner.
 * - Applies migrations/*.sql in filename order, each in its own transaction.
 * - Records applied files in schema_migrations (with a checksum).
 * - Uses a Postgres advisory lock so two instances never migrate at once.
 *
 * Usage: npm run migrate
 */
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { pool } from './pool.js';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);
const LOCK_ID = 727_001; // arbitrary, unique to this app

export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        checksum    TEXT NOT NULL,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM schema_migrations',
    );
    const done = new Map(rows.map((r) => [r.name, r.checksum]));

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');

      if (done.has(file)) {
        if (done.get(file) !== checksum) {
          throw new Error(
            `Migration ${file} was modified after being applied. Create a new migration instead.`,
          );
        }
        continue;
      }

      console.log(`Applying migration ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
          file,
          checksum,
        ]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`, { cause: err });
      }
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

// Run directly: `tsx src/db/migrate.ts` or `node dist/db/migrate.js`
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runMigrations()
    .then((applied) => {
      console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
    })
    .catch((err: unknown) => {
      console.error('Migration failed:', err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}