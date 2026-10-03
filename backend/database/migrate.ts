import path from 'node:path';
import { env } from '../src/config/env';

async function migrate(): Promise<void> {
  const { runner } = await import('node-pg-migrate');

  await runner({
    databaseUrl: env.databaseUrl,
    dir: path.resolve(__dirname, 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
  });
}

migrate().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});