#!/usr/bin/env sh
set -eu

DB_PATH="${TDTD_DB_PATH:-/data/teacher_app.sqlite}"
BACKUP_DIR="${TDTD_BACKUP_DIR:-/data/backups}"
RETENTION_DAYS="${TDTD_BACKUP_RETENTION_DAYS:-14}"

if [ ! -f "$DB_PATH" ]; then
  echo "backup-sqlite: database not found at $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/teacher_app-${STAMP}.sqlite"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$DEST'"
else
  echo "backup-sqlite: sqlite3 not found; using checkpoint + copy" >&2
  WAL="${DB_PATH}-wal"
  SHM="${DB_PATH}-shm"
  cp "$DB_PATH" "$DEST"
  if [ -f "$WAL" ]; then
    cp "$WAL" "${DEST}-wal"
  fi
  if [ -f "$SHM" ]; then
    cp "$SHM" "${DEST}-shm"
  fi
fi

echo "backup-sqlite: wrote $DEST"

if command -v find >/dev/null 2>&1; then
  find "$BACKUP_DIR" -name 'teacher_app-*.sqlite' -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
fi
