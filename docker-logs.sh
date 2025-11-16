#!/bin/bash

# EarnTrack Docker Logs Viewer

set -e

# Detect which compose file is running
if docker ps --format '{{.Names}}' | grep -q "prod"; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "=========================================="
echo "EarnTrack - View Logs"
echo "=========================================="
echo ""
echo "Select service to view logs:"
echo "1) All services"
echo "2) Backend only"
echo "3) Frontend only"
echo "4) Database only"
read -p "Enter choice [1-4] (default: 1): " choice
choice=${choice:-1}

echo ""

case $choice in
    1)
        echo "📋 Viewing ALL service logs (press Ctrl+C to exit)..."
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    2)
        echo "📋 Viewing BACKEND logs (press Ctrl+C to exit)..."
        docker-compose -f $COMPOSE_FILE logs -f backend
        ;;
    3)
        echo "📋 Viewing FRONTEND logs (press Ctrl+C to exit)..."
        docker-compose -f $COMPOSE_FILE logs -f frontend
        ;;
    4)
        echo "📋 Viewing DATABASE logs (press Ctrl+C to exit)..."
        docker-compose -f $COMPOSE_FILE logs -f postgres
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
