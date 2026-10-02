import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
	throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure the database.');
}

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
	throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = { databaseUrl, port };