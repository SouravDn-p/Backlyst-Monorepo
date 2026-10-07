# ==============================================================================
# Backlyst - Local Development Makefile
# Strictly for running and managing the local development environment
# ==============================================================================

.PHONY: help dev dev-infra dev-build dev-down dev-clean dev-logs dev-ps

COMPOSE_FILE = docker-compose.dev.yaml

# Default target: show help
help:
	@echo "======================================================================"
	@echo "                   Backlyst Local Development Commands                "
	@echo "======================================================================"
	@echo "  make dev            - Start all services (DB, Redis, MinIO, Backend, Frontend, Admin)"
	@echo "  make dev-infra      - Start infrastructure only (Postgres, Redis, MinIO)"
	@echo "  make dev-build      - Build images from source and start all services"
	@echo "  make dev-down       - Stop all local containers"
	@echo "  make dev-clean      - Stop containers and delete volumes (fresh database)"
	@echo "  make dev-logs       - Follow live logs for all running containers"
	@echo "  make dev-ps         - Show running local container status"
	@echo "----------------------------------------------------------------------"
	@echo "  make dev-logs-be    - Follow Backend live logs"
	@echo "  make dev-logs-fe    - Follow Frontend (Next.js) live logs"
	@echo "  make dev-logs-admin - Follow Admin Dashboard live logs"
	@echo "======================================================================"

# Start full local development stack
dev:
	@echo "🚀 Starting full local development environment..."
	docker compose -f $(COMPOSE_FILE) up -d

# Start only infrastructure (Postgres, Redis, MinIO)
dev-infra:
	@echo "🚀 Starting local infrastructure (Postgres, Redis, MinIO)..."
	docker compose -f $(COMPOSE_FILE) up -d postgres redis minio minio-init

# Rebuild images from source code and start
dev-build:
	@echo "📦 Building and starting local development environment..."
	docker compose -f $(COMPOSE_FILE) up -d --build

# Stop all local development containers
dev-down:
	@echo "🛑 Stopping local development containers..."
	docker compose -f $(COMPOSE_FILE) down

# Stop containers and wipe database volumes (clean reset)
dev-clean:
	@echo "⚠️  Stopping containers and removing all local data volumes..."
	docker compose -f $(COMPOSE_FILE) down -v

# Live container logs
dev-logs:
	docker compose -f $(COMPOSE_FILE) logs -f

dev-logs-be:
	docker compose -f $(COMPOSE_FILE) logs -f backend

dev-logs-fe:
	docker compose -f $(COMPOSE_FILE) logs -f frontend

dev-logs-admin:
	docker compose -f $(COMPOSE_FILE) logs -f dashboard

# Container status
dev-ps:
	docker compose -f $(COMPOSE_FILE) ps

# ---------- Individual App Shortcuts ---------- #
admin-%:
	$(MAKE) -C ./admin-dashboard $*

backend-%:
	$(MAKE) -C ./backend $*

frontend-%:
	$(MAKE) -C ./frontend $*
