#!/usr/bin/env bash
# NBV CRM backup — run nightly via cron. Keeps 35 days.
# Dev (SQLite): copies dev.db + uploads/. Production (Postgres): use pg_dump variant below.
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# SQLite + uploads (encrypt with: gpg --symmetric --cipher-algo AES256)
tar -czf "$BACKUP_DIR/nbv-$STAMP.tar.gz" -C "$APP_DIR" prisma/dev.db uploads 2>/dev/null
echo "backup written: $BACKUP_DIR/nbv-$STAMP.tar.gz ($(du -h "$BACKUP_DIR/nbv-$STAMP.tar.gz" | cut -f1))"

# retention: 35 days
find "$BACKUP_DIR" -name "nbv-*.tar.gz" -mtime +35 -delete

# ── PRODUCTION (PostgreSQL) variant ──
# pg_dump "$DATABASE_URL" -Fc -f "$BACKUP_DIR/nbv-$STAMP.dump"
# aws s3 cp "$BACKUP_DIR/nbv-$STAMP.dump" "s3://nbv-backups-ca-central-1/db/" --sse aws:kms
# Quarterly: test restore with pg_restore into a scratch database.
