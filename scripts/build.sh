#!/usr/bin/env bash
# ===================================================================
# Docker Image Build & Tagging Script
# Builds multi-stage production image with immutable tags
# ===================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

cd "${ROOT_DIR}"

DOCKER_USER="${DOCKER_USERNAME:-devopsdemo}"
IMAGE_NAME="${DOCKER_IMAGE_NAME:-minesweeper-clone}"
IMAGE_REPO="${DOCKER_USER}/${IMAGE_NAME}"

# Determine Git SHA and Build Number
GIT_SHA="${GIT_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo 'localdev')}"
BUILD_NUM="${BUILD_NUMBER:-1}"

echo "=================================================="
echo " Building Docker Image: ${IMAGE_REPO}"
echo " Git Commit SHA: ${GIT_SHA}"
echo " Jenkins Build: ${BUILD_NUM}"
echo "=================================================="

# Build Docker image
docker build \
  -t "${IMAGE_REPO}:latest" \
  -t "${IMAGE_REPO}:${GIT_SHA}" \
  -t "${IMAGE_REPO}:build-${BUILD_NUM}" \
  -f Dockerfile .

echo "=================================================="
echo " [SUCCESS] Docker images successfully built:"
echo " - ${IMAGE_REPO}:latest"
echo " - ${IMAGE_REPO}:${GIT_SHA}"
echo " - ${IMAGE_REPO}:build-${BUILD_NUM}"
echo "=================================================="
