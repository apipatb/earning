#!/bin/bash

# EarnTrack Docker Stop Script

set -e

echo "=========================================="
echo "EarnTrack - Stopping Services"
echo "=========================================="
echo ""

# Ask what to stop
echo "Select action:"
echo "1) Stop services (keep data)"
echo "2) Stop and remove everything (including volumes/data)"
read -p "Enter choice [1-2] (default: 1): " choice
choice=${choice:-1}

# Detect which compose file is running
if docker ps --format '{{.Names}}' | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🔍 Detected PRODUCTION deployment"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔍 Detected DEVELOPMENT deployment"
fi

echo ""

if [ "$choice" == "2" ]; then
    read -p "⚠️  This will DELETE all data including the database. Are you sure? (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
        echo "🗑️  Stopping and removing all containers, networks, and volumes..."
        docker-compose -f $COMPOSE_FILE down -v
        echo "✅ Everything removed!"
    else
        echo "❌ Cancelled."
        exit 0
    fi
else
    echo "⏹️  Stopping services..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ Services stopped (data preserved)"
fi

echo ""
echo "📝 To start again, run: ./docker-start.sh"
echo ""
