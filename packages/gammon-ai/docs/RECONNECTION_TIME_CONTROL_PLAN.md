# WebSocket Reconnection & Time Control – Sprint 4 Groundwork

_Last updated: 14 November 2025_

This document captures the initial design and task breakdown for Sprint 4, focusing on WebSocket reconnection resiliency and time-control support for real-time games.

## Objectives
1. **Resilient reconnection** for game, matchmaking, and notifications channels with state resync on rejoin.
2. **Turn-based time control** (blitz/normal/long presets) enforced server-side with client-visible countdowns.
3. **Persistence hooks** so pauses, disconnects, or forfeits due to flag-fall are auditable.

## Current State Summary
- Frontend clients already implement exponential backoff reconnection (`frontend/src/services/websocket.client.js`, `socketClient.ts`).
- Backend `src/websocket/server.ts` authenticates connections but does not track reconnection context or missed messages.
- Game state persistence (`GameService.makeMove`) exists, but no turn timers or pause events are stored.

## Proposed Architecture
### 1. Connection Registry & Resume Tokens
- Issue a **connection resume token** (`connectionId`, `sessionNonce`) upon successful `join` event.
- Maintain `GameSessionRegistry` (in-memory + Redis fallback) storing:
  - `userId`, `gameId`, last acknowledged move number
  - current dice/board snapshot hash
  - pending events queue (max N for replays)
- On reconnect, client presents token via querystring or protocol header. Server replays missed events, syncs turn state, and resumes countdown.

### 2. Heartbeats & Idle Detection
- Add heartbeat ping (every 10s) and mark connection as stale after 3 missed heartbeats.
- Persist `lastHeartbeatAt` per connection to support graceful disconnect detection.

### 3. Time Control Engine
- Extend `GameState` serialization with `timeControl` config (per side total time, increment/delay).
- Introduce `TurnTimerService`:
  - Tracks remaining time per player
  - Starts/stops timers on move/auto-pass events
  - Emits `timeUpdate` WS messages (throttled)
  - Triggers `flagFall` events -> auto-resign when time <= 0
- Persist timer snapshots alongside board/dice in `persistGameSnapshot`.

### 4. API & Schema Updates
- Prisma: add `time_control` (enum) + `white_time_ms`, `black_time_ms`, `last_move_at` columns to `games`.
- REST: extend `POST /api/games` payload with `timeControl` preset; expose remaining clock in GET responses.
- WS: new message types `timeUpdate`, `reconnectAck`, `flagFall`.

### 5. Testing Strategy
- Unit tests for `TurnTimerService` (advance timers, pause/resume, flag fall).
- Integration tests simulating disconnect/reconnect with event replay assertions.
- E2E scenario: blitz preset -> enforce loss on timeout.

## Task Breakdown
1. **Schema & Types**
   - Prisma migration for time control fields.
   - Update `src/types/game.ts` & DTOs.
2. **Server Infrastructure**
   - Implement `GameSessionRegistry` (memory + optional Redis adapter).
   - Enhance `SocketService` to handle `resume` handshake and event replay.
   - Add heartbeat ping/pong to `src/websocket/server.ts`.
3. **TurnTimerService**
   - Create service managing per-player clocks.
   - Wire into `GameService.makeMove` and auto-pass branch.
4. **API Surface**
   - Augment game creation endpoints with time-control presets.
   - Surface remaining time in responses and WS payloads.
5. **Client Coordination** (handoff notes)
   - Frontend to send `resumeToken` on reconnect & display countdown.
   - Handle `timeUpdate` and `flagFall` messages.
6. **Testing & Observability**
   - Jest suites for registry/timer.
   - Add metrics: reconnect count, average latency, timeouts.

## Open Questions
- Should timers continue running during disconnection grace period? (Proposal: 15s grace before pause.)
- Choose persistence store for session registry (Redis recommended for horizontal scaling).
- Evaluate whether to push time updates per second or only on move + every 5 seconds.

## Immediate Next Steps
1. Spike `GameSessionRegistry` interface + memory implementation.
2. Design Prisma migration for time-control columns.
3. Draft heartbeat/resume protocol changes in `websocket/server.ts` (feature-flagged).

---
Prepared by Cascade to bootstrap Sprint 4 workstream.
