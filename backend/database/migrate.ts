import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set. Configure it in the project root .env file.');
  }

  const { runner } = await import('node-pg-migrate');

  await runner({
    databaseUrl,
    dir: path.resolve(__dirname, 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
  });
}

migrate().catch((error: unknown) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});