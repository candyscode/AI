#!/bin/bash
# Staging-Deploy-Skript für VPS
# Baut aus aktuellem Branch, ohne GHCR

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="${1:-$(git -C "${SCRIPT_DIR}" rev-parse --abbrev-ref HEAD)}"

echo "=== Staging Deploy ==="
echo "Branch: ${BRANCH}"
echo ""

# Git pull
git -C "${SCRIPT_DIR}" fetch origin
git -C "${SCRIPT_DIR}" checkout "${BRANCH}"
git -C "${SCRIPT_DIR}" pull origin "${BRANCH}"

# Alte Container stoppen
docker compose -f "${SCRIPT_DIR}/docker-compose.staging.yml" down 2>/dev/null || true

# Neu bauen und starten
docker compose -f "${SCRIPT_DIR}/docker-compose.staging.yml" up -d --build

echo ""
echo "=== Deploy fertig ==="
echo "Frontend: http://$(curl -s ifconfig.me 2>/dev/null || echo 'VPS-IP'):8080"
echo "Backend:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'VPS-IP'):3001"
