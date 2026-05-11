import { drizzle } from 'drizzle-orm/node-postgres';
import { getPool } from '../lib/db/pool';
import * as schema from './schema';

// This is the clean, future-proof Drizzle instance
// It uses the singleton pool managed in lib/db/pool.ts
export const db = drizzle(getPool(), { schema });

export type DbClient = typeof db;
