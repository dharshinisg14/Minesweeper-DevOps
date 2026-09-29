#!/usr/bin/env bash
# ===================================================================
# Post-Deployment Health Check & Verification Script
# Verifies Pods, Deployments, Services, Ingress, and HTTP Endpoints
# ===================================================================

set -eo pipefail

NAMESPACE="minesweeper"
DEPLOYMENT_NAME="minesweeper"
SERVICE_NAME="minesweeper-service"
INGRESS_NAME="minesweeper-ingress"
TARGET_HOST="${APP_HOST:-minesweeper.local}"
TARGET_IP="${INGRESS_IP:-127.0.0.1}"

echo "=================================================="
echo " Starting Post-Deployment Verification"
echo " Target Namespace: ${NAMESPACE}"
echo " Endpoint Host:    ${TARGET_HOST} (${TARGET_IP})"
echo "=================================================="

# Check 1: Verify Deployment Availability
echo "[1/5] Checking Kubernetes Deployment Availability..."
AVAILABLE_REPLICAS=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.availableReplicas}' 2>/dev/null || echo "0")
if [ "${AVAILABLE_REPLICAS:-0}" -lt 1 ]; then
    echo "[FAIL] Deployment '${DEPLOYMENT_NAME}' has no available replicas!"
    exit 1
fi
echo "       [PASS] Available Replicas: ${AVAILABLE_REPLICAS}"

# Check 2: Verify All Pods are in 'Running' State
echo "[2/5] Checking Pod States..."
NOT_RUNNING=$(kubectl get pods -n "${NAMESPACE}" -l app=minesweeper --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
if [ "${NOT_RUNNING}" -gt 0 ]; then
    echo "[FAIL] Detected ${NOT_RUNNING} pods not in 'Running' state:"
    kubectl get pods -n "${NAMESPACE}" -l app=minesweeper
    exit 1
fi
echo "       [PASS] All application pods are healthy and running."

# Check 3: Verify Service & Endpoints
echo "[3/5] Verifying Service & Endpoint Registration..."
if ! kubectl get service "${SERVICE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
    echo "[FAIL] Service '${SERVICE_NAME}' not found in namespace '${NAMESPACE}'!"
    exit 1
fi
ENDPOINTS=$(kubectl get endpoints "${SERVICE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || true)
if [ -z "${ENDPOINTS}" ]; then
    echo "[FAIL] Service '${SERVICE_NAME}' has no registered backend endpoints!"
    exit 1
fi
echo "       [PASS] Service registered with endpoints: ${ENDPOINTS}"

# Check 4: Verify Ingress Resource
echo "[4/5] Verifying Ingress Resource..."
if ! kubectl get ingress "${INGRESS_NAME}" -n "${NAMESPACE}" &> /dev/null; then
    echo "[FAIL] Ingress '${INGRESS_NAME}' not found!"
    exit 1
fi
echo "       [PASS] Ingress '${INGRESS_NAME}' is present and configured."

# Check 5: HTTP Health Check via Port Forward or Direct Probe
echo "[5/5] Performing HTTP GET /healthz Endpoint Probe..."
# Port-forward to temporary local port for direct HTTP verification
TEMP_PORT=$(( 40000 + RANDOM % 10000 ))
kubectl port-forward service/"${SERVICE_NAME}" -n "${NAMESPACE}" "${TEMP_PORT}:80" &
PF_PID=$!

# Ensure background port-forward process is killed upon exit
trap "kill -9 ${PF_PID} 2>/dev/null || true" EXIT

# Give port-forward a moment to establish
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${TEMP_PORT}/healthz" || echo "000")

if [ "${HTTP_CODE}" -eq 200 ]; then
    echo "       [PASS] HTTP Probe returned 200 OK! Application is fully operational."
else
    echo "       [FAIL] HTTP Probe failed with status code: ${HTTP_CODE}"
    exit 1
fi

echo "=================================================="
echo " [SUCCESS] All 5 health checks passed! "
echo "=================================================="
