# NuCRM - Production Database Deployment Guide
# Industry Standard - Zero Data Loss Migration

## Overview

This guide covers the professional way to sync your database schema for deployment.
We use **Drizzle ORM** with proper migration tracking - no ad-hoc SQL.

---

## Step 1: Verify Schema Consistency

Before any deployment, verify that your Drizzle schema matches your code:

```bash
cd nucrm-lab-copy-by-opencode

# Check for TypeScript errors in schema
npx tsc --noEmit --skipLibCheck

# Verify all schema files are correct
npx drizzle-kit check
```

---

## Step 2: Create Database Backup

**CRITICAL:** Always backup before migrating!

### Option A: Full Database Dump (Recommended)
```bash
# Create timestamped backup
pg_dump "$DATABASE_URL" | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### Option B: Point-in-Time Recovery (PaaS)
If using Supabase, Railway, Render, etc.:
- Enable PITR in dashboard
- Create manual snapshot before migration

### Option C: Docker Volume Backup
```bash
docker exec nucrm-postgres pg_dump -U postgres nucrm > backup.sql
```

---

## Step 3: Run Migrations

### Method A: Safe Sequential Migration (Recommended)

```bash
# Uses the existing safe migration runner
npm run db:push

# Or directly:
npx tsx scripts/push-db.mts
```

This script:
- ✅ Checks database connection
- ✅ Creates migration tracking table
- ✅ Runs migrations in order (0000 → 0001 → 0002)
- ✅ Skips already-applied migrations
- ✅ Wraps each in transaction
- ✅ NEVER drops tables or deletes data
- ✅ Records each migration in `_migration_history`

### Method B: Drizzle Kit Push

```bash
# Preview changes without applying
npx drizzle-kit push --dry-run

# Apply changes
npx drizzle-kit push
```

### Method C: Apply SQL Migrations Manually

```bash
# Apply in order
psql "$DATABASE_URL" -f drizzle/migrations/0000_init.sql
psql "$DATABASE_URL" -f drizzle/migrations/0001_perpetual_the_stranger.sql
psql "$DATABASE_URL" -f drizzle/migrations/0002_billing_migration.sql
```

---

## Step 4: Verify Migration Success

```bash
# Check migration history
psql "$DATABASE_URL" -c "SELECT * FROM _migration_history ORDER BY applied_at;"

# Verify critical tables exist
psql "$DATABASE_URL" -c "\d lead_activities"
psql "$DATABASE_URL" -c "\d leads"
psql "$DATABASE_URL" -c "\d roles"

# Check for missing columns
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'lead_activities' ORDER BY ordinal_position;"
```

---

## Step 5: Test Application

```bash
# Start development server
npm run dev

# Or production build
npm run build && npm start
```

### Test Checklist:
- [ ] Visit `/auth/login` - Login form submits
- [ ] Visit `/auth/signup` - Create new account
- [ ] Create a lead - Verify no errors
- [ ] Check server logs for any errors
- [ ] Check browser console for errors

---

## Migration Files Explained

| File | Purpose | What It Does |
|------|---------|--------------|
| `0000_init.sql` | Initial schema | Creates all core tables |
| `0001_perpetual_the_stranger.sql` | Schema updates | Adds missing columns, indexes |
| `0002_billing_migration.sql` | Billing tables | Creates invoice/order tables |

---

## Troubleshooting

### Error: "relation does not exist"
The migration may not have run. Check:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM _migration_history;"
```

### Error: "column X does not exist"
The column was added in a migration. Ensure migrations ran:
```bash
npm run db:push
```

### Error: "permission denied"
Grant permissions:
```sql
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Error: "duplicate key value"
Migration was partially applied. Check `_migration_history`:
```sql
DELETE FROM _migration_history WHERE filename = 'problematic_migration.sql';
-- Then re-run the specific migration
```

---

## Rollback Procedure (If Needed)

### Option A: Restore from Backup
```bash
# Drop all tables (DANGER - deletes data!)
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE;"
psql "$DATABASE_URL" -c "CREATE SCHEMA public;"

# Restore from backup
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | psql "$DATABASE_URL"
```

### Option B: Manual Column Removal
```sql
-- Only if you know exactly what was added
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
```

---

## CI/CD Integration

### GitHub Actions Example:
```yaml
- name: Run Database Migration
  run: |
    npx tsx scripts/push-db.mts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Production Checklist:
- [ ] Run on staging first
- [ ] Verify backup exists
- [ ] Monitor error logs
- [ ] Have rollback plan ready
- [ ] Notify users of potential downtime

---

## Quick Reference

```bash
# Full deployment sequence
pg_dump "$DATABASE_URL" | gzip > backup.sql.gz  # Backup
npm run db:push                                    # Migrate
npm run build && npm start                        # Deploy

# Quick schema check
npx drizzle-kit check

# View current migrations
psql "$DATABASE_URL" -c "SELECT * FROM _migration_history;"

# Check table columns
psql "$DATABASE_URL" -c "\d table_name"
```

---

## Support

If migrations fail:
1. Check `_migration_history` table
2. Review error logs
3. Restore from backup if critical
4. Open issue with error details

---

*End of Deployment Guide*