#!/bin/bash

# EarnTrack Docker Initialization Script
# Run this after first docker-compose up to initialize the database

set -e

echo "=========================================="
echo "EarnTrack - Database Initialization"
echo "=========================================="
echo ""

# Detect which compose file is running
if docker ps --format '{{.Names}}' | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🔍 Detected PRODUCTION deployment"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔍 Detected DEVELOPMENT deployment"
fi

echo ""
echo "⏳ Waiting for services to be ready..."

# Wait for backend to be healthy
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose -f $COMPOSE_FILE exec -T backend curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Waiting for backend... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend did not become ready in time"
    echo "   Check logs: docker-compose -f $COMPOSE_FILE logs backend"
    exit 1
fi

echo ""
echo "🔄 Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T backend npx prisma migrate deploy

echo ""
echo "✅ Database initialized successfully!"
echo ""
echo "📍 Your application is ready:"
echo "   Frontend:  http://localhost:80"
echo "   Backend:   http://localhost:3001"
echo "   Health:    http://localhost:3001/health"
echo ""
echo "🎉 You can now create your first user account!"
echo ""
