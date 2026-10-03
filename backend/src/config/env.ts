import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Scripts can start from the repository root or the backend workspace; prefer the
// current directory and then its parent while retaining the compiled app fallback.
const envFile = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(__dirname, '../..', '.env'),
  path.resolve(__dirname, '../../..', '.env'),
  path.resolve(__dirname, '../../../..', '.env'),
].find(existsSync);

if (envFile) dotenv.config({ path: envFile });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure the database.');
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

// Validate origins during startup so CORS cannot silently fall back to a broad policy.
function parseWebOrigins(value: string): string[] {
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) {
    throw new Error('WEB_ORIGIN must contain at least one allowed origin.');
  }

  for (const origin of origins) {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(origin);
    } catch {
      throw new Error('WEB_ORIGIN contains an invalid URL.');
    }

    if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== origin) {
      throw new Error('WEB_ORIGIN entries must be HTTP(S) origins without paths.');
    }
  }

  return [...new Set(origins)];
}

const webOrigins = parseWebOrigins(process.env.WEB_ORIGIN ?? 'http://localhost:5173');

export const env = { databaseUrl, port, webOrigins };