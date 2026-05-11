import { Pool } from 'pg';
import * as schema from './drizzle/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function audit() {
  console.log('--- Database Schema Audit ---');
  
  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  const dbTables = tablesResult.rows.map(r => r.table_name);

  const drizzleTables = Object.keys(schema).filter(k => (schema as any)[k]?.['_']?.['name']);
  
  for (const tableName of drizzleTables) {
    const table = (schema as any)[tableName];
    const dbName = table['_']['name'];
    
    if (!dbTables.includes(dbName)) {
      console.log(`[MISSING TABLE] ${dbName}`);
      continue;
    }

    const colsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [dbName]);
    const dbCols = colsResult.rows.map(r => r.column_name);

    const drizzleCols = Object.keys(table['_']['columns']);
    for (const colKey of drizzleCols) {
      const col = table['_']['columns'][colKey];
      const dbColName = col['name'];
      
      if (!dbCols.includes(dbColName)) {
        console.log(`[MISSING COLUMN] ${dbName}.${dbColName}`);
      }
    }
  }

  // Check constraints on deals
  const constraints = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND conname LIKE '%check%'
  `);
  console.log('\n--- Constraints ---');
  constraints.rows.forEach(r => console.log(`${r.conname}: ${r.pg_get_constraintdef}`));

  await pool.end();
}

audit().catch(console.error);
