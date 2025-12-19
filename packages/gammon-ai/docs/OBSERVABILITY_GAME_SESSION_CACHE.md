# GameSessionRegistry Cache Observability Playbook

_Last updated: 15 November 2025_

This playbook describes how to operationalize the Redis read-through cache metrics added to the `GameSessionRegistry`. It covers the Prometheus signals, suggested Grafana panels, and alerting rules so operators can validate cache efficiency during rollout.

## 1. Prometheus Metrics

All metrics are registered with the `gammon-guru-backend` namespace and expose an `operation` label.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `game_session_cache_hits_total` | Counter | `operation` | Incremented whenever a cache lookup succeeds. |
| `game_session_cache_misses_total` | Counter | `operation` | Incremented when Redis does not return data and the code falls back to PostgreSQL. |
| `game_session_cache_errors_total` | Counter | `operation` | Incremented when Redis operations fail (timeouts, serialization errors, etc.). |

Operations map to the following flows:

- `session_by_game_user`: Lookup keyed by `(gameId, userId)` inside `issueSession`.
- `session_by_id`: Lookup via session ID during `validateToken`.
- `session_snapshot`: Writes that hydrate both `gameId:userId` and `sessionId` cache entries.
- `replay_fetch`: Reads of the replay event list.
- `replay_append`: Appends triggered after `recordEvent` writes to PostgreSQL.
- `replay_hydrate`: Replacements executed after a database fallback hydrates the cache.
- `replay_prune`: Cache trimming performed after ACK pruning.

## 2. Grafana Dashboard

Create (or extend) a Grafana dashboard named **Game Session Cache** with the panels below. Each query expects Prometheus as the data source.

1. **Cache Hit Rate (Stat)**
   ```promql
   sum(rate(game_session_cache_hits_total[5m])) /
   clamp_min(sum(rate(game_session_cache_hits_total[5m])) + sum(rate(game_session_cache_misses_total[5m])), 1)
   ```
   - Format: Percentage, min 0, max 1 (Grafana display transform to %).
   - Thresholds: >=0.8 green, 0.5–0.8 yellow, <0.5 red.

2. **Cache Misses by Operation (Bar Chart)**
   ```promql
   sum by (operation)(rate(game_session_cache_misses_total[5m]))
   ```
   - Use a stacked bar to show which flow is causing misses.

3. **Cache Errors (Table)**
   ```promql
   sum by (operation)(rate(game_session_cache_errors_total[5m]))
   ```
   - Display as table with conditional formatting (red when >0.01 ops/s).

4. **Event Replay Hydration vs Prune (Time Series)**
   ```promql
   sum(rate(game_session_cache_hits_total{operation=~"replay_(hydrate|prune)"}[5m]))
   ```
   - Helps visualize prune/refresh activity during reconnect storms.

5. **Session Snapshot Hydration Latency (Panel Annotation)**
   - Overlay with existing DB duration histogram (`game_session_db_duration_seconds_bucket`) filtered by `operation="upsert_session"` to correlate cache churn with DB cost:
   ```promql
   histogram_quantile(0.95, sum by (le) (rate(game_session_db_duration_seconds_bucket{operation="upsert_session"}[5m])))
   ```

### Import Snippet

If you prefer provisioning via JSON, add a panel similar to the snippet below (omit outer dashboard boilerplate for brevity):
```json
{
  "type": "stat",
  "title": "Cache Hit Rate",
  "targets": [
    {
      "expr": "sum(rate(game_session_cache_hits_total[5m])) / clamp_min(sum(rate(game_session_cache_hits_total[5m])) + sum(rate(game_session_cache_misses_total[5m])), 1)",
      "legendFormat": "hit_rate"
    }
  ],
  "options": {
    "reduceOptions": { "calcs": ["last"] },
    "colorMode": "value",
    "graphMode": "none",
    "fieldOptions": {
      "defaults": {
        "unit": "percentunit",
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "color": "red", "value": 0 },
            { "color": "yellow", "value": 0.5 },
            { "color": "green", "value": 0.8 }
          ]
        }
      }
    }
  }
}
```

## 3. Alerting Rules

Configure Prometheus alert rules (or Grafana alerting) with the following templates:

- **Cache Hit Rate Degradation**
  ```yaml
  - alert: GameSessionCacheHitRateLow
    expr: (
      sum(rate(game_session_cache_hits_total[10m])) /
      clamp_min(sum(rate(game_session_cache_hits_total[10m])) + sum(rate(game_session_cache_misses_total[10m])), 1)
    ) < 0.6
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "GameSession cache hit rate below 60%"
      description: "Investigate Redis connectivity or stale data."
  ```

- **Replay Cache Errors**
  ```yaml
  - alert: GameSessionCacheReplayErrorsHigh
    expr: sum(rate(game_session_cache_errors_total{operation=~"replay_.*"}[5m])) > 0.05
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "Replay cache experiencing errors"
      description: "Check Redis health and GameSessionRegistry logs for failures."
  ```

- **Session Snapshot Miss Surge**
  ```yaml
  - alert: GameSessionCacheSessionMissSpike
    expr: sum(rate(game_session_cache_misses_total{operation="session_by_game_user"}[5m])) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Session cache misses are spiking"
      description: "Validate Redis availability and token TTL alignment."
  ```

## 4. Operational Checklist

1. Import the **Game Session Cache** Grafana dashboard and share it with the WebSocket on-call rotation.
2. Add the three alert rules above to the `game-session` Prometheus rule group (or Grafana unified alerting).
3. Ensure logs tagged with `GameSessionRegistryRedis` are indexed—errors are already structured for quick triage.
4. Validate metrics in staging by enabling `SESSION_REDIS_READTHROUGH_ENABLED` and simulating reconnect flows.
5. Document dashboard/alert URLs inside `docs/DURABLE_RECONNECT_CHECKLIST.md` once validated.

## 5. Staging Validation Runbook

Follow this sequence when turning on the feature flag in staging. Capture screenshots of dashboards and attach them to the release ticket.

1. **Pre-flight configuration**
   - Confirm `NODE_ENV=staging` (or explicitly set `SESSION_REDIS_READTHROUGH_ENABLED=true`).
   - Set Redis connection variables (`SESSION_REDIS_URL` or `SESSION_REDIS_HOST`/`PORT`) in the staging environment.
   - Deploy the build so `config.session.redisReadThroughEnabled` resolves to `true` on startup.@src/config/index.ts#188-207

2. **Warm up cache paths**
   - Launch two WebSocket clients against staging using the QA harness or `npm run test:websocket` with `SESSION_REDIS_READTHROUGH_ENABLED=true`.
   - Drive the following sequence to generate cache traffic:
     1. Player A joins game, Player B joins with resume token to exercise session snapshot hits.
     2. Send at least three moves to populate replay cache.
     3. Disconnect Player B and reconnect using the last resume token to trigger replay fetch.
     4. Send `GAME_ACK` to prune events and observe Redis trimming.

3. **Dashboard verification**
   - In Grafana, confirm `game_session_cache_hits_total` and `game_session_cache_misses_total` show recent activity for operations `session_by_game_user`, `replay_fetch`, and `replay_prune`.
   - Check `game_session_cache_errors_total` remains flat; investigate any non-zero rate before rollout.
   - Review WebSocket backlog gauge to ensure ACK pruning reduces the backlog after reconnect tests.@src/websocket/server.ts#262-355

4. **Log inspection**
   - Tail logs filtered by `context:"GameSessionRegistryRedis"` to ensure there are no warnings about cache hydration/pruning failures.
   - Verify resume acceptance logs include `Accepted resume token` entries with expected session IDs.@src/websocket/server.ts#548-690

5. **Sign-off**
   - Annotate `docs/DURABLE_RECONNECT_CHECKLIST.md` with dashboard URLs, alert IDs, and validation timestamps.
   - If any Redis outage occurs during validation, toggle the flag off (`SESSION_REDIS_READTHROUGH_ENABLED=false`), redeploy, and file an incident note with findings.

---
Prepared to guide observability for the GameSessionRegistry Redis read-through rollout.
