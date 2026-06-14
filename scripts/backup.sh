#!/bin/bash

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "═══════════════════════════════════════"
echo "  Backup Script"
echo "═══════════════════════════════════════"
echo ""
echo "Creating backup: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='backups' \
  --exclude='.git' \
  .

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
  echo "✅ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
  echo "❌ Backup failed"
  exit 1
fi

# Keep only last 7 backups
echo ""
echo "Cleaning old backups (keeping last 7)..."
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt 7 ]; then
  ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +8 | xargs -r rm
  REMOVED=$((BACKUP_COUNT - 7))
  echo "✅ Removed $REMOVED old backup(s)"
else
  echo "✅ No old backups to remove (total: $BACKUP_COUNT)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "Backup completed: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
