# EarnTrack Docker Makefile
# Simplifies common Docker operations

.PHONY: help build up down logs clean restart ps health setup-env test-build

# Default target
help:
	@echo "EarnTrack Docker Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  make setup-env    - Copy .env.docker.example to .env"
	@echo "  make build        - Build all Docker images"
	@echo "  make build-no-cache - Build all images without cache"
	@echo ""
	@echo "Running:"
	@echo "  make up           - Start all services in detached mode"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-f       - Follow logs from all services"
	@echo ""
	@echo "Individual Services:"
	@echo "  make build-frontend   - Build frontend image only"
	@echo "  make build-backend    - Build backend image only"
	@echo "  make logs-frontend    - View frontend logs"
	@echo "  make logs-backend     - View backend logs"
	@echo "  make logs-db          - View database logs"
	@echo ""
	@echo "Status & Health:"
	@echo "  make ps           - Show running containers"
	@echo "  make health       - Check health of all services"
	@echo "  make stats        - Show resource usage"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-studio    - Open Prisma Studio"
	@echo "  make db-reset     - Reset database (development only!)"
	@echo "  make db-backup    - Backup database"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Stop services and remove volumes"
	@echo "  make clean-all    - Remove all containers, images, and volumes"
	@echo "  make prune        - Clean up Docker system"
	@echo ""
	@echo "Testing:"
	@echo "  make test-build   - Test build without starting services"
	@echo ""

# Setup environment
setup-env:
	@if [ ! -f .env ]; then \
		cp .env.docker.example .env; \
		echo "✓ Created .env file from .env.docker.example"; \
		echo "⚠ Please edit .env and update the values before running 'make up'"; \
	else \
		echo "✓ .env file already exists"; \
	fi

# Build all images
build:
	docker-compose build

# Build without cache
build-no-cache:
	docker-compose build --no-cache

# Build individual services
build-frontend:
	docker-compose build frontend

build-backend:
	docker-compose build backend

# Start services
up:
	@if [ ! -f .env ]; then \
		echo "⚠ .env file not found. Run 'make setup-env' first."; \
		exit 1; \
	fi
	docker-compose up -d
	@echo ""
	@echo "✓ Services started!"
	@echo "  Frontend: http://localhost"
	@echo "  Backend:  http://localhost:3001"
	@echo ""
	@echo "Run 'make logs' to view logs"
	@echo "Run 'make health' to check service health"

# Start services in foreground
up-foreground:
	docker-compose up

# Stop services
down:
	docker-compose down

# Restart services
restart:
	docker-compose restart

# View logs
logs:
	docker-compose logs

# Follow logs
logs-f:
	docker-compose logs -f

# Individual service logs
logs-frontend:
	docker-compose logs -f frontend

logs-backend:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f postgres

# Show running containers
ps:
	docker-compose ps

# Check health
health:
	@echo "Checking service health..."
	@echo ""
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' earntrack-frontend 2>/dev/null || echo "earntrack-frontend: not running"
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' earntrack-backend 2>/dev/null || echo "earntrack-backend: not running"
	@docker inspect --format='{{.Name}}: {{.State.Health.Status}}' earntrack-postgres 2>/dev/null || echo "earntrack-postgres: not running"

# Show resource usage
stats:
	docker stats

# Database operations
db-migrate:
	docker-compose exec backend npx prisma migrate deploy

db-studio:
	docker-compose exec backend npx prisma studio

db-reset:
	@echo "⚠ WARNING: This will delete all data!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose exec backend npx prisma migrate reset --force

db-backup:
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U earntrack earntrack > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "✓ Backup created in backups/"

db-shell:
	docker-compose exec postgres psql -U earntrack earntrack

# Clean up
clean:
	docker-compose down -v
	@echo "✓ Services stopped and volumes removed"

clean-all: clean
	@echo "Removing images..."
	docker rmi earntrack-frontend earntrack-backend 2>/dev/null || true
	@echo "✓ All cleaned up"

prune:
	docker system prune -a
	@echo "✓ Docker system cleaned"

# Test build
test-build:
	@echo "Testing frontend build..."
	cd app/frontend && docker build --no-cache -t earntrack-frontend-test .
	@echo ""
	@echo "Testing backend build..."
	cd app/backend && docker build --no-cache -t earntrack-backend-test .
	@echo ""
	@echo "✓ All builds successful!"
	@echo ""
	@echo "Cleaning up test images..."
	docker rmi earntrack-frontend-test earntrack-backend-test
	@echo "✓ Done"

# Development helpers
dev-frontend:
	cd app/frontend && npm run dev

dev-backend:
	cd app/backend && npm run dev

dev-all:
	@echo "Starting development servers..."
	@echo "Note: This requires PostgreSQL to be running"
	@echo ""
	@echo "Starting backend in background..."
	cd app/backend && npm run dev &
	@echo "Starting frontend..."
	cd app/frontend && npm run dev
