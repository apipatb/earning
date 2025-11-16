#!/bin/bash

# EarnTrack Docker Start Script
# This script helps you start the EarnTrack application using Docker

set -e

echo "=========================================="
echo "EarnTrack Docker Deployment"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install it and try again."
    exit 1
fi

echo "🔍 Checking Docker setup..."
echo "   Docker version: $(docker --version)"
echo "   Docker Compose version: $(docker-compose --version)"
echo ""

# Ask for deployment type
echo "Select deployment type:"
echo "1) Development (default)"
echo "2) Production"
read -p "Enter choice [1-2] (default: 1): " choice
choice=${choice:-1}

if [ "$choice" == "2" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🚀 Starting PRODUCTION deployment..."
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🔧 Starting DEVELOPMENT deployment..."
fi

echo ""
echo "📦 Building and starting services..."
docker-compose -f $COMPOSE_FILE up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "📊 Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T backend npx prisma migrate deploy || {
    echo "⚠️  Migration failed or database not ready. You may need to run migrations manually:"
    echo "   docker-compose exec backend npx prisma migrate deploy"
}

echo ""
echo "=========================================="
echo "✅ EarnTrack is starting up!"
echo "=========================================="
echo ""
echo "📍 Access your application:"
echo "   Frontend:  http://localhost:80"
echo "   Backend:   http://localhost:3001"
echo "   Health:    http://localhost:3001/health"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        docker-compose -f $COMPOSE_FILE logs -f"
echo "   Stop services:    docker-compose -f $COMPOSE_FILE down"
echo "   Restart:          docker-compose -f $COMPOSE_FILE restart"
echo "   Database backup:  ./docker-backup.sh"
echo ""
echo "📖 For more information, see DOCKER_DEPLOYMENT.md"
echo ""
