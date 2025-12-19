# WebSocket Reconnect Lifecycle

_Last updated: 15 November 2025_

This document explains the durable reconnect protocol implemented for game-channel WebSocket clients. It covers the resume handshake, replay delivery semantics, acknowledgement flow, heartbeat expectations, and failure paths now backed by the `GameSessionRegistry`.

## Overview

- **Durable session registry** – Each authenticated connection resolves to a persisted session containing `gameId`, `userId`, issued-at timestamp, last acknowledged sequence, and heartbeat metadata. The registry issues and validates signed resume tokens for reconnects and stores a rolling event log per game session.@src/websocket/server.ts#262-347
- **Typed socket helpers** – Outbound messages use `SocketService` helpers for `GAME_RESUME`, `GAME_REPLAY`, `GAME_ACK`, and gameplay events, ensuring consistent payload shapes and sender context.@src/websocket/server.ts#169-347
- **Deterministic sequencing** – Persisted events increment monotonically per game. Clients track the highest sequence number seen and include it in acknowledgements so the server can prune delivered payloads.@src/websocket/server.ts#143-318

## Connection & Resume Lifecycle

1. **Initial connect**
   - Client opens `ws://<host>/ws/game?gameId=<id>` with a bearer access token.
   - Server authenticates, provisions/refreshes a session via `GameSessionRegistry`, and attaches the connection state.@src/websocket/server.ts#548-690

2. **Resume handshake (server → client)**
   - Server emits a `GAME_RESUME` envelope containing:
     - `token`: signed resume token bound to session id.
     - `issuedAt`: epoch milliseconds when the token was minted.
     - `lastSequence`: latest sequence acknowledged (defaults to 0 on first join).
     - `timer` (optional): serialized turn-timer snapshot if available.
     - `summary` (optional): current game summary/cube snapshot to speed UI hydration.@src/websocket/server.ts#350-365

3. **Live play**
   - Client sends gameplay messages (`move`, `resign`, `draw`, `cube`, etc.) which the server persists and broadcasts with sequence numbers when applicable.@src/websocket/server.ts#169-227
   - Server updates session heartbeat on each persisted event.@src/websocket/server.ts#262-317

4. **Client acknowledgement**
   - Client sends a `GAME_ACK` message with the highest `sequence` processed.
   - Server validates monotonicity, updates session state, persists the ACK, emits `GAME_ACK` confirmation, and prunes replay buffers through the minimum acknowledged sequence for all active participants.@src/websocket/server.ts#283-317

5. **Reconnect**
   - Client reconnects with `?resume=<token>` (or supplies token via header) and replays `GAME_ACK` on completion.
   - Server validates resume token, rehydrates connection state, streams any events with `sequence > lastSequence`, and re-issues heartbeat watchers.@src/websocket/server.ts#320-347

## Message Reference

| Message | Direction | Purpose | Key fields |
|---------|-----------|---------|------------|
| `GAME_RESUME` | server → client | Announces connection readiness and resume context | `token`, `issuedAt`, `lastSequence`, optional `timer`, `summary` |
| `GAME_REPLAY` | server → client | Replays missed events in order | `gameId`, `sequence`, nested `message` with `type`, `payload` |
| `GAME_ACK` | bidirectional | Client acknowledges sequences; server echoes confirmation | `gameId`, `userId`, `sequence` |
| Gameplay (`move`, `resign`, `draw`, `cube`) | bidirectional | Real-time game events with sequencing when persisted | `gameId`, `userId`, event-specific payload |

See integration tests for end-to-end examples covering handshake, replay delivery, ACK pruning, and invalid message handling.@tests/websocket.test.ts#463-558

## Turn Timer Snapshot Restore

When a reconnection occurs, the server embeds an optional `timer` field in the resume payload. This snapshot originates from `buildTimerSnapshot` and gives the client remaining clock values without waiting for incremental updates.@src/websocket/server.ts#350-365

## Heartbeat Expectations

- Each socket gets `attachHeartbeat` applied. The server pings every 10 seconds and terminates connections that miss successive pongs, preventing stale sessions from lingering.@src/websocket/server.ts#367-416
- Clients should respond with `pong` frames promptly to avoid forced termination.

## Failure Handling

- **Invalid resume token** – Server closes the connection with 1008 (policy violation) if token validation fails or the session is missing.@src/websocket/server.ts#548-690
- **Malformed client messages** – Non-JSON or unexpected payloads trigger an `Invalid message` frame, preserving server stability.@tests/websocket.test.ts#545-558
- **Out-of-order acknowledgements** – ACKs lower than the stored `lastAck` are ignored without affecting session state, preventing regressions under packet reordering.@src/websocket/server.ts#289-299

## Redis Read-Through Cache

- **Feature flag** – Cache usage is gated behind `config.session.redisReadThroughEnabled`, controlled via the `SESSION_REDIS_READTHROUGH_ENABLED` environment variable.@src/config/index.ts#188-203
- **Session snapshots** – Issued and validated sessions are serialized to Redis using keys `gsr:session:<gameId>:<userId>` and `gsr:sessionId:<sessionId>`, with TTL aligned to the session expiration.@src/services/gameSessionRegistry.ts#329-362
- **Replay buffers** – Recent replay events stream from Redis list keys `gsr:events:<gameId>` when present; database fetches automatically hydrate and prune the cache to match the configured retention limit.@src/services/gameSessionRegistry.ts#329-646
- **Fallback semantics** – When Redis is unavailable or returns a miss, the server transparently falls back to PostgreSQL before re-populating the cache, ensuring durability-first behavior.@src/services/gameSessionRegistry.ts#605-631

## Testing & Observability

- `tests/websocket.test.ts` exercises handshake, replay resumption, cache-enabled replay delivery, ACK handling with prune synchronization, invalid message rejection, and timer heartbeat lifecycle using mocked registry/timer services.@tests/websocket.test.ts#463-626
- Cache hit/miss/error counters are exported as Prometheus metrics (`game_session_cache_hits_total`, `game_session_cache_misses_total`, `game_session_cache_errors_total`) with operation labels for dashboarding and alerting.@src/metrics/gameSessionMetrics.ts#19-38
- Operational dashboards and alert rules for the cache live in `docs/OBSERVABILITY_GAME_SESSION_CACHE.md` and should be validated before enabling the feature flag in production.@docs/OBSERVABILITY_GAME_SESSION_CACHE.md#1-147

## Operational Notes

- Resume tokens are JWTs signed with `config.session.tokenSecret`; ensure the secret is set in production to avoid insecure fallbacks.@src/config/index.ts#191-219
- `GameSessionRegistry` now integrates Redis as an optional read-through cache layered on top of Prisma, exposing helpers for fetching, acknowledging, and pruning sequences while keeping the database authoritative.@src/services/gameSessionRegistry.ts#333-646
- Provision Redis connection details via `SESSION_REDIS_URL` or `SESSION_REDIS_HOST`/`SESSION_REDIS_PORT`, and use `SESSION_REDIS_NAMESPACE` to avoid key collisions between environments.@src/services/redisClient.ts#8-77
- Retention caps (`REPLAY_LIMIT`) protect against unbounded replay buffers; adjust as needed alongside client retention strategies.@src/websocket/server.ts#320-347

---
Prepared by Cascade after implementing the durable reconnect flow.
