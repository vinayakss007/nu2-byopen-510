import { db } from './drizzle/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'invitations'
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
