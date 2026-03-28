# Database Migrations

Run these SQL files in the **Supabase SQL Editor** in order.
Each file is idempotent (safe to re-run).

1. `001_initial_schema.sql` — Core tables, indexes, RPC functions
2. `002_auth_tables.sql` — OAuth device flow and refresh tokens

The full schema is also available in `src/lib/schema.ts` as a single exportable string.
