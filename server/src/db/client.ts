import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';

// connectionTimeoutMillis keeps /health fast when the database is down:
// instead of hanging for the default 30s+, a dead DB fails in 2s.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
