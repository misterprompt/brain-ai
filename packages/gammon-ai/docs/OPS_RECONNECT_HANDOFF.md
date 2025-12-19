# WebSocket Reconnect – Ops Handoff

_Last updated: 15 November 2025_

This note summarizes the operational follow-up required after landing the durable WebSocket reconnect refactor.

## 1. Documentation Dissemination
- Share `docs/WEBSOCKET_RECONNECT.md` with the on-call rotation and incident response mailing list.
- Link the document inside the incident/runbook portal under **Session Recovery** → **Game WebSocket**.
- Reference `docs/DURABLE_RECONNECT_CHECKLIST.md` for the full rollout task list.

## 2. Configuration Verification
- Confirm `SESSION_TOKEN_SECRET` is set and identical across:
  - [ ] Development
  - [ ] Staging
  - [ ] Production
- Validate token expiry and TTL values match the configuration described in `src/config/index.ts`.

## 3. Metrics & Monitoring
- Expose the following Prometheus metrics on dashboards:
  - `ws_resume_attempts_total{outcome}`
  - `ws_resume_invalid_token_total`
  - `ws_replay_backlog_size{gameId}`
- Configure alerts for:
  - Elevated invalid token count (`ws_resume_invalid_token_total` derivative > threshold)
  - Resume attempts labeled `resumed` dropping to zero in production
  - Replay backlog gauge exceeding expected size
- Ensure structured logs emitted by `WebSocketServer` are collected (resume acceptance/rejection, ACK processing, backlog size).

## 4. Rollout Checklist
- Use `docs/DURABLE_RECONNECT_CHECKLIST.md` to track completion of:
  - Observability hook validation
  - Persistence tuning decisions
  - Extension of reconnect parity to other channels
- Schedule a post-rollout review once baseline metrics are available.

---
Prepared for the ops team by Cascade following the reconnect refactor.
