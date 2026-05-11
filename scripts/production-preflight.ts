/**
 * NuCRM — Production Preflight Check (Drizzle Edition)
 * Final verification before going live.
 */

import { db } from '../drizzle/db';
import * as schema from '../drizzle/schema';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';

async function checkNodeVersion() {
  const current = process.version;
  const required = 'v22'; // Latest major 22
  console.log(`📡 Node Version: ${current}`);
  if (!current.startsWith(required)) {
    console.warn(`  ⚠️ Warning: Recommended Node version is ${required}.x`);
  } else {
    console.log('  ✅ OK');
  }
}

async function checkDatabase() {
  console.log('📡 Checking Database...');
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    console.log(`  ✅ Connection OK (${Date.now() - start}ms)`);

    const tables = [
      { name: 'plans', schema: schema.plans },
      { name: 'tenants', schema: schema.tenants },
      { name: 'users', schema: schema.users },
      { name: 'contacts', schema: schema.contacts },
      { name: 'leads', schema: schema.leads },
      { name: 'deals', schema: schema.deals },
    ];

    for (const t of tables) {
      const [countRes] = await db.select({ count: sql<number>`count(*)::int` }).from(t.schema);
      console.log(`  📊 Table "${t.name}": ${countRes.count} records`);
    }
  } catch (err: any) {
    console.error('  ❌ Database Error:', err.message);
    return false;
  }
  return true;
}

async function checkRedis() {
  console.log('📡 Checking Redis...');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Create client with low retry count for fast check
  let redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
  
  try {
    const start = Date.now();
    await redis.ping();
    console.log(`  ✅ Connection OK (${Date.now() - start}ms)`);
    await redis.quit();
  } catch (err: any) {
    // If it's a DNS issue with 'redis' hostname, try localhost
    if (redisUrl.includes('//redis') || redisUrl.includes('@redis')) {
      const fallbackUrl = redisUrl.replace('//redis', '//localhost').replace('@redis', '@localhost');
      console.log(`  ⚠️  Primary Redis failed, trying fallback: ${fallbackUrl}`);
      const fallbackRedis = new Redis(fallbackUrl, { maxRetriesPerRequest: 1 });
      try {
        await fallbackRedis.ping();
        console.log('  ✅ Fallback OK');
        await fallbackRedis.quit();
        return true;
      } catch (fErr: any) {
        console.error('  ❌ Redis Error:', fErr.message);
      }
    } else {
      console.error('  ❌ Redis Error:', err.message);
    }
    return false;
  }
  return true;
}

async function main() {
  console.log('\n🔍 NuCRM Production Preflight Check\n');
  console.log('====================================');
  
  await checkNodeVersion();
  const dbOk = await checkDatabase();
  const redisOk = await checkRedis();
  
  console.log('====================================');
  if (dbOk && redisOk) {
    console.log('\n🚀 PREFLIGHT PASSED: System is production-ready!\n');
    process.exit(0);
  } else {
    console.log('\n🚨 PREFLIGHT FAILED: Please check the errors above.\n');
    process.exit(1);
  }
}

main();
