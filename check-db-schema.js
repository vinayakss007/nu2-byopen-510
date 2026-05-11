import { getPool } from './lib/db/client';

async function main() {
  const pool = getPool();
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'deals'");
    console.log('Deals columns:', res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
