pull:
	@echo "🚀 Pulling Production Environment"
	docker compose --profile prod pull
	@echo "🚀 Pulling Development Environment"
down:
	@echo "🚀 Stopping Production Environment"
	docker compose --profile prod down
	@echo "🚀 Stopping Development Environment"
up:
	@echo "🚀 Starting Production Environment"
	docker compose --profile prod up -d
	@echo "🚀 Starting Development Environment"
clear:
	@echo "🚀 Clearing Production Environment"
	docker system prune -af
	@echo "🚀 Clearing Development Environment"
