#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DUMP_FILE="${1:?usage: db-restore.sh <dump-file> [target-database-url]}"
TARGET_URL="${2:-$DATABASE_URL}"

[[ -f "$DUMP_FILE" ]] || { echo "Backup file not found: $DUMP_FILE" >&2; exit 1; }

# Restore is destructive by design; require an explicit confirmation token.
[[ "${CONFIRM_DESTRUCTIVE_RESTORE:-}" == "YES" ]] || { echo 'Set CONFIRM_DESTRUCTIVE_RESTORE=YES to run a destructive restore.' >&2; exit 1; }

pg_restore --clean --if-exists --no-owner --no-acl --dbname="$TARGET_URL" "$DUMP_FILE"
