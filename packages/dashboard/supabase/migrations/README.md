# Database Migrations

This directory contains all Supabase schema migrations for the ccusage-ralphgrip dashboard.

## Directory structure

```
supabase/
├── config.toml                         ← Supabase CLI project config
└── migrations/
    ├── 20260324000000_baseline.sql     ← Full production schema snapshot
    ├── 20260325HHMMSS_next_change.sql  ← Example future migration
    └── README.md                       ← This file
```

## Naming convention

Migrations follow the Supabase CLI convention:

```
YYYYMMDDHHMMSS_short_description.sql
```

- **Timestamp**: UTC, 14 digits (e.g., `20260324153000`)
- **Description**: lowercase, underscores, no spaces (e.g., `add_user_roles`)
- Generate via CLI: `supabase migration new <name> --workdir packages/dashboard`
- Or create manually following the pattern

## Creating a new migration

### Option 1: Supabase CLI (preferred)

```bash
supabase migration new add_user_roles --workdir packages/dashboard
```

This creates an empty timestamped file. Write your SQL in it.

### Option 2: Manual

Create a file matching the naming convention:

```bash
touch packages/dashboard/supabase/migrations/$(date -u +%Y%m%d%H%M%S)_description.sql
```

### Guidelines

- Use `CREATE IF NOT EXISTS` / `CREATE OR REPLACE` for idempotency
- Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for additive changes
- One logical change per migration (don't mix table creation with data migration)
- Include comments explaining *why*, not just *what*
- Never modify a migration that has already been applied to production

## Applying migrations

### Via Supabase MCP (recommended for this project)

Use the `apply_migration` MCP tool from Claude Code:

```
mcp__supabase__apply_migration(name: "add_user_roles", query: "<SQL content>")
```

### Via Supabase SQL Editor

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Paste the migration SQL
3. Run

### Via Supabase CLI (if linked)

```bash
supabase db push --workdir packages/dashboard
```

> **Note**: `supabase link` with DB password is required first.

## Validating migrations

```bash
# Validate naming convention and file integrity
pnpm --filter dashboard db:validate

# CI runs this automatically on push/PR
```

## Rolling back

Supabase does not support automatic rollbacks. To undo a migration:

1. Write a new migration that reverses the change:
   ```sql
   -- 20260325160000_revert_add_user_roles.sql
   DROP TABLE IF EXISTS user_roles;
   ```
2. Apply the revert migration using the same process as above
3. **Never** delete or modify the original migration file in the repo

## Schema drift

If the production DB diverges from the migration files (e.g., someone made a
manual change in the SQL Editor), resolve by:

1. Identify the drift: compare `list_tables` output against the baseline
2. Write a migration that captures the manual change
3. Apply and commit

## What NOT to do

- **Don't modify applied migrations** — write a new one instead
- **Don't use destructive DDL without a migration** — all schema changes go through files
- **Don't add migrations to the deploy pipeline** — apply manually for safety
- **Don't commit `.supabase/`** — it contains local-only project link data
