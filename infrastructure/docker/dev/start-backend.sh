#!/usr/bin/env bash
# ==============================================================================
# Backlyst Backend EC2 - Startup Script (DEV)
# Fetches secrets from AWS Secrets Manager & starts Docker containers
# ==============================================================================
# Usage:
#   sudo bash /opt/backlyst/backend/start.sh          # First-time or restart
#   sudo bash /opt/backlyst/backend/start.sh --update # Pull new image & restart
# ==============================================================================

set -euo pipefail

WORKDIR="/opt/backlyst/backend"
COMPOSE_FILE="$WORKDIR/docker-compose.backend.yaml"
SECRET_NAME="/dev/backlyst/backend"
AWS_REGION="eu-west-2"
ECR_REGISTRY="622711945657.dkr.ecr.eu-west-2.amazonaws.com"
ENV_FILE="$WORKDIR/.env"

echo "========================================================"
echo "  Backlyst Backend - Startup Script (DEV)"
echo "========================================================"

# 1. Authenticate Docker with AWS ECR using the EC2 IAM Instance Profile
echo "🔑 Authenticating Docker with AWS ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY"

# 2. Fetch ALL secrets from AWS Secrets Manager and write to .env
echo "🔐 Fetching secrets from AWS Secrets Manager ($SECRET_NAME)..."
aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$AWS_REGION" \
  --query SecretString \
  --output text | \
  python3 -c "
import sys, json
secrets = json.load(sys.stdin)
for key, value in secrets.items():
    # Escape any double quotes in values
    safe_value = str(value).replace('\"', '\\\\\"')
    print(f'{key}={safe_value}')
" > "$ENV_FILE"

echo "✅ Secrets written to .env ($(wc -l < "$ENV_FILE") keys loaded)"

# 3. Pull latest image if --update flag is passed
if [[ "${1:-}" == "--update" ]]; then
  echo "📦 Pulling latest Docker images from ECR..."
  docker compose -f "$COMPOSE_FILE" pull
fi

# 4. Start or restart the containers
echo "🚀 Starting Backend container..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans --force-recreate
docker system prune -af
# 5. Show running container status
echo ""
echo "✅ Done! Container status:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "📜 To view live logs:"
echo "   docker compose -f $COMPOSE_FILE logs -f"
