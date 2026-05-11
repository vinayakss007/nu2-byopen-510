import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:nucrm_pass_2026@localhost:5432/nucrm",
  },
} satisfies Config;
