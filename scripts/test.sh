#!/usr/bin/env bash
# ===================================================================
# Test Execution Script
# Runs static code linting and Jest unit tests
# ===================================================================

set -eo pipefail

echo "=================================================="
echo " Starting Automated Test Suite: Minesweeper Clone"
echo "=================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}/../app"

cd "${APP_DIR}"

# Check for npm and node
if ! command -v npm &> /dev/null; then
    echo "[!] Error: npm is required to execute tests."
    exit 1
fi

echo "[1/3] Checking Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm ci --quiet || npm install --quiet
fi

echo "[2/3] Running Static Linter / Code Analysis..."
npm run lint

echo "[3/3] Running Jest Unit Tests with Code Coverage..."
npm run test:coverage

echo "=================================================="
echo " [SUCCESS] All unit tests and code checks passed! "
echo "=================================================="
