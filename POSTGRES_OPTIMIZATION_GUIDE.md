# PostgreSQL Optimization Guide for Low Load & Fast Performance

This guide provides recommended PostgreSQL settings and practices to ensure the NuCRM database remains fast and consistent even under load, while keeping the resource footprint minimal.

## 1. Recommended `postgresql.conf` Settings
*Optimized for 4GB-8GB RAM environments.*

| Parameter | Recommended Value | Why? |
| :--- | :--- | :--- |
| `max_connections` | `100` | Keep connection overhead low. Use `pgbouncer` if more are needed. |
| `shared_buffers` | `1GB` (for 4GB RAM) or `2GB` (for 8GB RAM) | 25% of total RAM for caching active data. |
| `work_mem` | `16MB` | Allocated per sort/join. Prevents disk-swapping for standard queries. |
| `maintenance_work_mem` | `256MB` | Speeds up index creation and vacuuming. |
| `effective_cache_size` | `3GB` (for 4GB RAM) or `6GB` (for 8GB RAM) | Helps the optimizer know how much memory is available for caching. |
| `random_page_cost` | `1.1` | Optimized for SSD storage. |
| `effective_io_concurrency` | `200` | Optimized for SSD storage. |
| `bgwriter_delay` | `200ms` | Background writer frequency. |
| `bgwriter_lru_maxpages` | `100` | Max pages to write to disk. |

## 2. Indexing Strategy for Performance
- **Partial Indexes:** We use `WHERE deleted_at IS NULL` on indices for `contacts`, `leads`, and `deals`. This keeps indices small and ensures "active" data is found instantly.
- **Composite Indexes:** We lead with `tenant_id` combined with `status` or `type` (e.g., `(tenant_id, lead_status)`). This ensures the DB can filter by tenant and status in a single operation.
- **JSONB Path Ops:** We use `jsonb_path_ops` for AI metadata GIN indexes. They are smaller and 2-3x faster than the default GIN operator for existence (`?`) and containment (`@>`) queries.

## 3. Maintenance Practices
- **Auto-Vacuum:** Ensure auto-vacuum is tuned to keep statistics fresh without spiking CPU.
- **Explain Analyze:** Always test new queries with `EXPLAIN ANALYZE` to ensure they are using the intended indices.
- **Connection Pooling:** The app already uses a `pg.Pool` with a configurable size. Keep `DATABASE_POOL_SIZE` around 20-30 for a single app instance.

## 4. SQL Performance Scripts
Run these periodically to find slow spots:

### Find Missing Indexes (Sequential Scans)
```sql
SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC;
```

### Find Unused Indexes (Wasted Load)
```sql
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND NOT indisunique;
```
