#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-app}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health/internal}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-30}"
LOG_FILE="${LOG_FILE:-docker-health.txt}"

echo "[watchdog] Monitoring service '${SERVICE_NAME}' every ${INTERVAL_SECONDS}s" | tee -a "${LOG_FILE}"

BACKOFF_SECONDS=5
MAX_BACKOFF_SECONDS=60

while true; do
  timestamp="$(date --iso-8601=seconds 2>/dev/null || date)"
  status="unknown"

  if docker ps --format '{{.Names}}' | grep -q "^${SERVICE_NAME}$"; then
    health_json="$(docker inspect --format '{{json .State.Health}}' "${SERVICE_NAME}" 2>/dev/null || echo '')"
    if [[ -n "${health_json}" ]]; then
      status="$(echo "${health_json}" | grep -o '"Status":"[^"]*"' | cut -d':' -f2 | tr -d '"')"
    else
      status="no-healthcheck"
    fi
  else
    status="not-running"
  fi

  http_ok=0
  if docker compose -f "${COMPOSE_FILE}" exec -T "${SERVICE_NAME}" \
      curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    http_ok=1
  fi

  if [[ "${status}" == "healthy" && "${http_ok}" -eq 1 ]]; then
    echo "[watchdog] ${timestamp} ${SERVICE_NAME} healthy (docker=${status}, http=ok)" | tee -a "${LOG_FILE}"
    BACKOFF_SECONDS=5
  else
    echo "[watchdog] ${timestamp} ${SERVICE_NAME} unhealthy (docker=${status}, http=${http_ok}) – restarting with backoff ${BACKOFF_SECONDS}s" | tee -a "${LOG_FILE}"
    docker compose -f "${COMPOSE_FILE}" restart "${SERVICE_NAME}" || true
    sleep "${BACKOFF_SECONDS}"
    if [[ "${BACKOFF_SECONDS}" -lt "${MAX_BACKOFF_SECONDS}" ]]; then
      BACKOFF_SECONDS=$(( BACKOFF_SECONDS * 2 ))
      if [[ "${BACKOFF_SECONDS}" -gt "${MAX_BACKOFF_SECONDS}" ]]; then
        BACKOFF_SECONDS="${MAX_BACKOFF_SECONDS}"
      fi
    fi
  fi

  sleep "${INTERVAL_SECONDS}"
done

