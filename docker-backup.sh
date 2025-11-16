#!/bin/bash

# EarnTrack Database Backup Script

set -e

echo "=========================================="
echo "EarnTrack - Database Backup"
echo "=========================================="
echo ""

# Create backups directory
mkdir -p backups

# Detect which compose file is running
if docker ps --format '{{.Names}}' | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
    CONTAINER_NAME="earntrack-postgres-prod"
else
    COMPOSE_FILE="docker-compose.yml"
    CONTAINER_NAME="earntrack-postgres"
fi

# Get database credentials from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USER=${POSTGRES_USER:-earntrack}
DB_NAME=${POSTGRES_DB:-earntrack}

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "📦 Creating backup..."
echo "   Database: $DB_NAME"
echo "   File: $BACKUP_FILE"
echo ""

# Create backup
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# Compress backup
echo "🗜️  Compressing backup..."
gzip $BACKUP_FILE

echo ""
echo "✅ Backup completed!"
echo "   File: ${BACKUP_FILE}.gz"
echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
echo ""

# Clean old backups (keep last 10)
echo "🧹 Cleaning old backups (keeping last 10)..."
ls -t backups/backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "✅ Backup complete!"
echo ""
echo "📝 To restore this backup, run:"
echo "   gunzip -c ${BACKUP_FILE}.gz | docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME"
echo ""
