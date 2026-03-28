#!/usr/bin/env bash
# Validate migration files follow Supabase conventions.
# Run: pnpm --filter dashboard db:validate
set -euo pipefail

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"
ERRORS=0

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

# Check migration files exist
FILES=$(find "$MIGRATIONS_DIR" -name '*.sql' -type f | sort)
if [ -z "$FILES" ]; then
  echo "ERROR: no migration files found"
  exit 1
fi

echo "Validating migrations in $MIGRATIONS_DIR"
echo "---"

# Validate naming convention: YYYYMMDDHHMMSS_name.sql
for f in $FILES; do
  BASENAME=$(basename "$f")
  if ! echo "$BASENAME" | grep -qE '^[0-9]{14}_[a-z][a-z0-9_]*\.sql$'; then
    echo "ERROR: '$BASENAME' does not match naming convention YYYYMMDDHHMMSS_name.sql"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check for duplicate timestamps
TIMESTAMPS=$(echo "$FILES" | xargs -I{} basename {} | cut -d_ -f1 | sort)
DUPES=$(echo "$TIMESTAMPS" | uniq -d)
if [ -n "$DUPES" ]; then
  echo "ERROR: duplicate migration timestamps: $DUPES"
  ERRORS=$((ERRORS + 1))
fi

# Check files are not empty
for f in $FILES; do
  if [ ! -s "$f" ]; then
    echo "ERROR: empty migration file: $(basename "$f")"
    ERRORS=$((ERRORS + 1))
  fi
done

# Report
COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
if [ "$ERRORS" -gt 0 ]; then
  echo "---"
  echo "FAILED: $ERRORS error(s) in $COUNT migration file(s)"
  exit 1
else
  echo "OK: $COUNT migration file(s) validated"
  exit 0
fi
