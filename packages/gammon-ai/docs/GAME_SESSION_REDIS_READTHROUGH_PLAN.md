# GameSessionRegistry Redis Read-Through Prototype

_Last updated: 15 November 2025_

## 1. Purpose
The durable reconnect system already persists authoritative session and replay data in PostgreSQL via Prisma. This prototype evaluates a Redis-backed read-through cache to improve reconnect latency during high activity while keeping PostgreSQL as the source of truth.

## 2. Objectives
- **Latency:** Serve recent replay payloads and session metadata without waiting on PostgreSQL round-trips.
- **Load shedding:** Reduce spikes on the primary database when multiple games reconnect simultaneously.
- **Safety:** Avoid data loss by never accepting Redis as the source of truth for writes.
- **Observability:** Produce metrics and logs to compare cache hit ratio versus DB fallback.

## 3. Proposed Architecture
```
Client reconnect -> WebSocket server
  -> check Redis (read-through)
      -> hit: return cached resume payload + replay events
      -> miss: fetch from PostgreSQL, hydrate Redis asynchronously
  -> on ACK prune: update DB, then trim Redis list (best-effort)
```

### Redis keys
| Key | Type | TTL | Description |
| --- | --- | --- | --- |
| `gsr:session:<gameId>:<userId>` | Hash | `config.session.ttlSeconds` | Session snapshot: lastAckSequence, issuedAt, expiresAt, metadata, resumeTokenHash. |
| `gsr:events:<gameId>` | List | `config.session.ttlSeconds` | Recent replay events (JSON payload per list element). |
| `gsr:metrics` | Hash | Persist | Optional: rolling counters for replay hits/misses if Prometheus unavailable. |

### Serialization format
- Use JSON stringified payloads to keep implementation simple.
- Store sequence number, event type, payload, createdAt for each list item.
- Maintain a max length equal to `config.session.replayRetention` to prevent unbounded memory usage.

## 4. Data Flow
1. **Event Recording**
   - Continue writing events to PostgreSQL inside the existing transaction.
   - After successful DB write, append the event to `gsr:events:<gameId>` and trim to `replayRetention`.

2. **Session Issue / Validation**
   - After issuing a session, cache the session hash keyed by `gsr:session:<gameId>:<userId>` with TTL aligned to session expiration.
   - Validation first checks Redis; on miss, query DB and repopulate cache.

3. **Replay Fetch**
   - Attempt to serve from Redis by filtering events with `sequence > lastAck`.
   - If cache miss or stale data detected (sequence gap), fall back to DB and refresh Redis.

4. **ACK Pruning**
   - PostgreSQL remains the authority for pruning.
   - After DB pruning, trim Redis list to only keep events with sequence greater than `minimumAck`.
   - If trimming fails, log warn metric; rely on TTL as fallback.

## 5. Failure Handling
- **Redis connection failure:** Log error, increment `redis_errors_total`, and proceed with DB-only flow.
- **Stale cache detection:** If the highest cached sequence is lower than DB baseline, refresh by querying DB.
- **Consistency drift:** Add `cache_version` stamp (timestamp) to session hash; refresh when delta exceeds threshold (e.g., 10 minutes).

## 6. Observability
- Extend `gameSessionMetrics` with:
  - `game_session_cache_hits_total{operation}`
  - `game_session_cache_misses_total{operation}`
  - `game_session_cache_errors_total{operation}`
- Structured logs for:
  - Cache miss reason (`not_found`, `stale`, `error`).
  - Redis trim failures during ACK pruning.

## 7. Implementation Plan
1. **Foundations**
   - Add Redis client factory that reuses existing ioredis connection pool.
   - Gate all cache usage behind feature flag `SESSION_REDIS_READTHROUGH_ENABLED`.

2. **Session caching**
   - Cache session snapshots on `issueSession` and `validateToken` flows.
   - Introduce helper to hydrate from DB when cache miss occurs.

3. **Replay caching**
   - On `recordEvent`, push to Redis list.
   - On `fetchEventsSince`, attempt cache read, fall back to DB, and repopulate list.

4. **ACK pruning sync**
   - After `purgeEventsThrough`, trim Redis list to maintain consistency.

5. **Metrics & logging**
   - Emit Prometheus counters and structured logs around hit/miss scenarios.

6. **Resilience hardening**
   - Add circuit breaker / backoff when Redis is unhealthy to avoid excessive log noise.

7. **Evaluation**
   - Capture benchmarks: reconnect latency, DB query counts, cache hit ratio.
   - Decide on production rollout based on observed savings.

## 8. Rollout & Validation Checklist
- [ ] Feature flag defaults to `false`; only enabled in staging.
- [ ] Integration tests covering cache hit/miss and fallback scenarios.
- [ ] Prometheus dashboards updated to include new cache metrics.
- [ ] Run load test comparing DB-only vs read-through latency.
- [ ] Document operational playbook (flush instructions, metrics interpretation).

---
Prepared by Cascade to guide the Redis read-through prototype for `GameSessionRegistry`.
