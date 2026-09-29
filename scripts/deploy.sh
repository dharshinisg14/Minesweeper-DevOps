#!/usr/bin/env bash
# ===================================================================
# Kubernetes Continuous Deployment & Rollout Script
# Handles zero-downtime rolling update with automatic rollback
# ===================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
K8S_DIR="${ROOT_DIR}/k8s"

NAMESPACE="minesweeper"
DEPLOYMENT_NAME="minesweeper"
CONTAINER_NAME="minesweeper"

# Identify image tag
DOCKER_USER="${DOCKER_USERNAME:-devopsdemo}"
IMAGE_NAME="${DOCKER_IMAGE_NAME:-minesweeper-clone}"
IMAGE_TAG="${IMAGE_TAG:-${GIT_COMMIT:-latest}}"
FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_TAG}"

export KUBECONFIG="${KUBECONFIG:-${ROOT_DIR}/kubeconfig}"

echo "=================================================="
echo " Initiating Kubernetes Deployment"
echo " Target Namespace: ${NAMESPACE}"
echo " Deployment:       ${DEPLOYMENT_NAME}"
echo " Target Image:     ${FULL_IMAGE}"
echo "=================================================="

# 1. Apply baseline manifests (Namespace, ConfigMap, Service, Ingress, HPA)
echo "[1/4] Applying Kubernetes Manifests via Kustomize..."
kubectl apply -k "${K8S_DIR}"

# 2. Update image to immutable tag
echo "[2/4] Updating Deployment Image to ${FULL_IMAGE}..."
kubectl set image deployment/"${DEPLOYMENT_NAME}" \
  "${CONTAINER_NAME}=${FULL_IMAGE}" \
  -n "${NAMESPACE}" --record || true

# 3. Monitor Rolling Update with 120s timeout
echo "[3/4] Awaiting Zero-Downtime Rollout Completion..."
if ! kubectl rollout status deployment/"${DEPLOYMENT_NAME}" -n "${NAMESPACE}" --timeout=120s; then
    echo "[!] ROLLOUT FAILED OR TIMED OUT! Triggering automatic rollback..."
    kubectl rollout undo deployment/"${DEPLOYMENT_NAME}" -n "${NAMESPACE}"
    echo "[!] Rolled back to previous stable release."
    exit 1
fi

# 4. Display cluster deployment state
echo "[4/4] Rollout Succeeded! Cluster status:"
kubectl get pods -n "${NAMESPACE}" -l app=minesweeper -o wide
kubectl get services -n "${NAMESPACE}"
kubectl get ingress -n "${NAMESPACE}"

echo "=================================================="
echo " [SUCCESS] Deployment completed successfully! "
echo "=================================================="
