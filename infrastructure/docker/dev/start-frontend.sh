#!/usr/bin/env bash
# ==============================================================================
# Backlyst Frontend EC2 - Startup Script (DEV)
# Authenticates with ECR & starts Docker containers
# ==============================================================================
# Usage:
#   sudo bash /opt/backlyst/frontend/start-frontend.sh          # First-time or restart
#   sudo bash /opt/backlyst/frontend/start-frontend.sh --update # Pull new image & restart
# ==============================================================================

set -euo pipefail

WORKDIR="/opt/backlyst/frontend"
COMPOSE_FILE="$WORKDIR/docker-compose.frontend.yaml"
AWS_REGION="eu-west-2"
ECR_REGISTRY="622711945657.dkr.ecr.eu-west-2.amazonaws.com"

echo "========================================================"
echo "  Backlyst Frontend - Startup Script (DEV)"
echo "========================================================"

# 1. Authenticate Docker with AWS ECR using the EC2 IAM Instance Profile
echo "🔑 Authenticating Docker with AWS ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# 2. Pull latest images if --update flag is passed
if [[ "${1:-}" == "--update" ]]; then
  echo "📦 Pulling latest Docker images from ECR..."
  docker compose -f "$COMPOSE_FILE" pull
fi

# 3. Start or restart the containers
echo "🚀 Starting Frontend (Next.js + Admin Dashboard) containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --force-recreate
docker system prune -af
# 4. Show running container status
echo ""
echo "✅ Done! Container status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "📜 To view live logs:"
echo "   docker compose -f $COMPOSE_FILE logs -f"
echo ""
echo "📜 To view logs per service:"
echo "   docker compose -f $COMPOSE_FILE logs -f nextjs"
echo "   docker compose -f $COMPOSE_FILE logs -f admin"
