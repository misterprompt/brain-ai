# Durable Reconnect Follow-Up Checklist

_Last updated: 15 November 2025_

Use this checklist to track the rollout tasks that follow the durable WebSocket reconnect refactor. Each item should be checked off once the corresponding action is completed in every deployment environment.

## Operational Hand-off
- [ ] Share `docs/WEBSOCKET_RECONNECT.md` with the on-call/ops rotation
- [ ] Link the reconnect guide inside the incident/runbook portal or equivalent knowledge base

## Configuration Audit
- [ ] Confirm `SESSION_TOKEN_SECRET` is configured for development
- [ ] Confirm `SESSION_TOKEN_SECRET` is configured for staging
- [ ] Confirm `SESSION_TOKEN_SECRET` is configured for production

## Observability Enhancements
- [ ] Metric published: resume attempts (success/failure counts)
- [ ] Metric published: invalid resume token rejects
- [ ] Metric published: replay queue depth / backlog size
- [ ] Structured logs emitted for resume/ACK flow milestones (handshake issued, replay streamed, ACK accepted/rejected)

## Monitoring & Alerting
- [ ] Alerts validated for elevated resume failure rate
- [ ] Alerts validated for abnormal ACK lag
- [ ] Alerts validated for excessive replay backlog

## Persistence & Scalability
- [ ] Decide on long-term persistence tuning for `GameSessionRegistry` (Redis vs Prisma configuration)
- [ ] Document scaling playbook for session registry (retention, purge thresholds, failover steps)

## Channel Parity
- [ ] Extend durable reconnect support to matchmaking channel
- [ ] Extend durable reconnect support to notifications channel

## Documentation & Governance
- [ ] Close remaining reconnect-related TODOs in `docs/VALIDATION_CHECKLIST.md`
- [ ] Update any sprint or project tracking boards with the completed reconnect deliverables
- [ ] Schedule follow-up review once observability hooks produce baseline metrics
