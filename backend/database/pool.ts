import { Pool } from 'pg';
import { env } from '../src/config/env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
});