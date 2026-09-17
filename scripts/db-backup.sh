#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="$OUTPUT_DIR/prodx-pos-$STAMP.dump"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$OUTPUT"
pg_restore --list "$OUTPUT" >/dev/null
printf '%s\n' "$OUTPUT"
