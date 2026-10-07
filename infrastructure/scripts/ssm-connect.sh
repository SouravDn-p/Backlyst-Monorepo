#!/usr/bin/env bash
# ==============================================================================
# Backlyst AWS EC2 SSM Connection Helper
# Connects securely to private EC2 instances without SSH keys or open port 22
# ==============================================================================

set -euo pipefail

# Default configuration
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_PROFILE="${AWS_PROFILE:-tom}"
PROJECT_NAME="backlyst"
ENVIRONMENT="${2:-dev}"

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
  echo "❌ Error: 'aws' CLI is not installed. Please install it first."
  exit 1
fi

# Check for AWS Session Manager Plugin
if ! command -v session-manager-plugin &> /dev/null; then
  echo "⚠️  Warning: AWS Session Manager Plugin is not installed on your machine."
  echo "   To install on macOS (Homebrew):"
  echo "     brew install --cask session-manager-plugin"
  echo "   To install on Linux:"
  echo "     curl \"https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb\" -o \"session-manager-plugin.deb\""
  echo "     sudo dpkg -i session-manager-plugin.deb"
  echo ""
fi

# Function to get instance ID by Tag Name
get_instance_id_by_name() {
  local target_name="$1"
  local profile_arg=""
  if [ -n "${AWS_PROFILE:-}" ]; then
    profile_arg="--profile ${AWS_PROFILE}"
  fi

  aws ec2 describe-instances \
    --region "${AWS_REGION}" \
    ${profile_arg} \
    --filters "Name=tag:Name,Values=${target_name}" "Name=instance-state-name,Values=running" \
    --query "Reservations[0].Instances[0].InstanceId" \
    --output text 2>/dev/null || echo "None"
}

# Resolve target instance
TARGET="${1:-}"

if [ -z "${TARGET}" ]; then
  echo "========================================================"
  echo "  Backlyst EC2 SSM Connector (${ENVIRONMENT})"
  echo "========================================================"
  echo "Select an instance to connect to:"
  echo "  1) Backend  (${PROJECT_NAME}-${ENVIRONMENT}-backend)"
  echo "  2) Frontend (${PROJECT_NAME}-${ENVIRONMENT}-frontend)"
  echo "  3) Enter Instance ID manually"
  echo "========================================================"
  read -rp "Enter choice [1-3]: " choice

  case "${choice}" in
    1) TARGET="backend" ;;
    2) TARGET="frontend" ;;
    3)
      read -rp "Enter EC2 Instance ID (e.g., i-0779d23cb21aa6489): " manual_id
      TARGET="${manual_id}"
      ;;
    *)
      echo "Invalid selection. Exiting."
      exit 1
      ;;
  esac
fi

INSTANCE_ID=""

if [[ "${TARGET}" =~ ^i-[0-9a-fA-F]+$ ]]; then
  INSTANCE_ID="${TARGET}"
elif [ "${TARGET}" == "backend" ]; then
  INSTANCE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend"
  echo "🔍 Looking up instance: ${INSTANCE_NAME}..."
  INSTANCE_ID=$(get_instance_id_by_name "${INSTANCE_NAME}")
  if [ "${INSTANCE_ID}" == "None" ] || [ -z "${INSTANCE_ID}" ]; then
    echo "⚠️  Could not find instance dynamically. Falling back to known dev backend ID..."
    INSTANCE_ID="i-00bf48d4ad48bac2c"
  fi
elif [ "${TARGET}" == "frontend" ]; then
  INSTANCE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
  echo "🔍 Looking up instance: ${INSTANCE_NAME}..."
  INSTANCE_ID=$(get_instance_id_by_name "${INSTANCE_NAME}")
  if [ "${INSTANCE_ID}" == "None" ] || [ -z "${INSTANCE_ID}" ]; then
    echo "⚠️  Could not find instance dynamically. Falling back to known dev frontend ID..."
    INSTANCE_ID="i-036db9583a4b796d1"
  fi
else
  INSTANCE_ID="${TARGET}"
fi

echo "🚀 Connecting to instance: ${INSTANCE_ID} (${AWS_REGION})..."
echo "💡 Once connected, you can switch to root or debian/admin user using:"
echo "   sudo -i"
echo "   cd /home"
echo "--------------------------------------------------------"

PROFILE_FLAG=()
if [ -n "${AWS_PROFILE:-}" ]; then
  PROFILE_FLAG=(--profile "${AWS_PROFILE}")
fi

aws ssm start-session \
  --target "${INSTANCE_ID}" \
  --region "${AWS_REGION}" \
  "${PROFILE_FLAG[@]}"
