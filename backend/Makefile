.PHONY: up down restart logs build migrate generate docker-migrate docker-generate

# Start containers
up:
	@echo "🚀 Starting Docker containers..."
	docker compose up -d
	@echo "✅ Containers are up and running."

# Stop containers
down:
	@echo "🛑 Stopping Docker containers..."
	docker compose down
	@echo "✅ Containers stopped."

# Restart containers
restart:
	@echo "🔁 Restarting Docker containers..."
	docker compose down
	docker compose up -d
	@echo "✅ Containers restarted."

# Build containers
build:
	@echo "🏗️ Building Docker images..."
	docker compose build
	@echo "✅ Build completed."

# View logs
logs:
	@echo "📜 Showing logs..."
	docker compose logs -f


# Local Prisma
migrate:
	@echo "🔄 Running Prisma migrations locally..."
	npx prisma migrate dev && npx prisma generate
	@echo "✅ Migration completed."

generate:
	@echo "⚙️ Generating Prisma client locally..."
	npx prisma generate
	@echo "✅ Prisma client generated."


# Prisma inside Docker
docker-migrate:
	@echo "🐳 Running Prisma migrations inside Docker..."
	docker compose exec backend npx prisma migrate deploy
	@echo "✅ Docker migration completed."

docker-generate:
	@echo "🐳 Generating Prisma client inside Docker..."
	docker compose exec backend npx prisma generate
	@echo "✅ Prisma client generated inside Docker."