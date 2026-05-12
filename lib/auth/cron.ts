import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Verify the cron secret from the request header
 */
export async function verifyCronSecret(req: NextRequest): Promise<boolean> {
  const cronSecret = req.headers.get('x-cron-secret');
  const envSecret = process.env.CRON_SECRET;
  if (!cronSecret || !envSecret) {
    return false;
  }
  const a = Buffer.from(cronSecret);
  const b = Buffer.from(envSecret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
