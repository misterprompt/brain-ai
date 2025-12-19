# GameSessionRegistry Persistence Strategy

_Last updated: 15 November 2025_

The durable reconnect flow relies on the `GameSessionRegistry` for issuing resume tokens, storing connection heartbeats, and persisting replay events. This note evaluates persistence options and recommends a path forward for production scale.

## 1. Current Baseline (PostgreSQL via Prisma)
- **Data model**: `gameSession` (per user/game) stores resume token hash, last ack sequence, heartbeat timestamps; `gameEvent` stores ordered replay payloads.
- **Access patterns**:
  - Token issuance/validation: point lookups by `gameId_userId` and `id`.
  - Replay fetch: range queries ordered by `sequence` with capped limit.
  - ACK pruning: delete many `gameEvent` rows `<= sequence`.
- **Strengths**:
  - ACID transactions keep event sequencing consistent across multiple app servers.
  - Prisma migrations already manage schema.
  - Fits existing backup/retention policies.
- **Constraints**:
  - Writes contend on `gameEvent` when multiple moves land concurrently; requires tuned indexes.
  - Replay fetch/delete round-trips may load the main DB when many games reconnect simultaneously.
  - TTL cleanup (`cleanupExpiredSessions`) must be scheduled externally (cron/worker) to avoid residue rows.

### Recommended hardening (PostgreSQL path)
1. **Indexes**
   - Composite index on `game_event (game_id, sequence)` to accelerate range scans.
   - Unique index enforce existing constraints (`game_session (game_id, user_id)` already covered by Prisma).
2. **Partitioning / retention**
   - Optionally partition `game_event` by `game_id` hash or time window if volume rises.
   - Scheduled job to prune old `gameSession` rows where `expires_at < now()`.
3. **Connection pooling**
   - Ensure replay-heavy operations use Prisma transaction with minimal round-trips.

## 2. Redis-backed Session Cache (Hybrid)
- **Idea**: Keep PostgreSQL as the source of truth; add Redis for low-latency replay caching and heartbeat tracking.
- **Flow**:
  - On `recordEvent`, append to Redis list keyed by `gameId`; background worker flushes to Postgres.
  - On reconnect, check Redis first for recent events; fall back to DB.
  - Resume tokens continue to be minted/validated against Postgres (durable).
- **Benefits**:
  - Reduced DB load for hot games; near-real-time replay delivery.
  - Natural TTL support (`EXPIRE`) for sessions without custom cleanup.
- **Risks**:
  - Requires ops managing Redis cluster (failover, persistence).
  - Complexity in ensuring Redis flush does not lose events (need write-ahead or pipeline ack).
  - Additional moving parts for consistency (must avoid divergent sequence numbers).

### Hybrid recommendation
- Use Redis as **read-through cache** only (no write-behind):
  - Store last N events per game with TTL (`config.session.replayRetention`).
  - After DB fetch, populate cache; after ACK prune, trim Redis list.
  - On reconnect, serve from cache if present; else hit DB.
- Heartbeats remain in Postgres to maintain single source of truth.

## 3. Redis-only Persistence
- Pros: ultra-low latency, built-in TTL.
- Cons: complicated durability requirements (RDB/AOF), additional work to survive restarts.
- Not recommended unless DB access becomes bottleneck and durable backing is reimplemented elsewhere.

## 4. Recommended Path Forward
1. **Short term (now → launch)**
   - Stay on PostgreSQL with the hardening steps above.
   - Add background job (cron/worker) invoking `GameSessionRegistry.cleanupExpiredSessions()`.
   - Add migration for `CREATE INDEX CONCURRENTLY idx_game_event_game_sequence ON "gameEvent" ("gameId", sequence);`.
2. **Medium term**
   - Instrument DB load: track `game_event` query latency vs traffic using existing metrics.
   - Implement Redis read-through cache if reconnect volume increases (feature-flagged).
   - Evaluate storing replay payloads in compressed JSON to reduce DB size.
3. **Long term**
   - If horizontal scaling requires cross-region replication, consider migrating replay log to event-stream service (Kafka/SQS) with consumer to Prisma, while keeping registry metadata in Postgres.

## 5. Next Actions
- [ ] Draft Prisma migration adding the `(gameId, sequence)` index.
- [ ] Schedule ops job for `cleanupExpiredSessions` (daily).
- [ ] Extend observability to capture DB latency for `recordEvent` / `fetchEventsSince`.
- [ ] Revisit Redis caching decision after observing production reconnect metrics for a full sprint.

---
Prepared by Cascade to guide GameSessionRegistry persistence decisions.
