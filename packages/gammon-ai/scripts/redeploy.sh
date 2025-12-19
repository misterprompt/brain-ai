#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"

echo "[redeploy] Building images..."
docker compose -f "${COMPOSE_FILE}" build

echo "[redeploy] Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "[redeploy] Current services:"
docker compose -f "${COMPOSE_FILE}" ps

echo "[redeploy] Checking internal health endpoint..."
docker compose -f "${COMPOSE_FILE}" exec -T app \
  curl -fsS http://localhost:3000/health/internal || {
    echo "[redeploy] Internal healthcheck failed"
    exit 1
  }
