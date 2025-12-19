# GammonGuru – Validation Checklist

Utilisez cette checklist pour vérifier rapidement l’état du projet. Elle est pensée pour une double validation: (1) automatique via `npm run validate`, (2) revue assistée par IA (Claude/GPT) grâce au prompt fourni ci‑dessous.

## 1) Sécurité & Auth
- [ ] JWT access (15 min) + refresh (7j, rotation jti) actifs
- [ ] Révocation refresh en DB (logout/refresh invalide)
- [ ] CORS restrictif en production (FRONTEND_URL/CORS_ORIGIN)
- [ ] Helmet, rate limiting par domaines, sanitize, HPP, audit logs
- [ ] Zod sur endpoints critiques (auth, IA, quotas)

## 2) IA GNUBG & Quotas
- [ ] Provider GNUBG avec timeout / retry / circuit breaker / logs
- [ ] AIService expose `getBestMove`, `evaluatePosition`
- [ ] Quotas IA: free (5 initial), premium (10/j), `extraQuota` achetable
- [ ] Endpoints: `GET /api/gnubg/quota`, `POST /api/gnubg/purchase`
- [x] Tests: quotas et provider (timeout/retry/circuit breaker)

## 3) Jeux & WebSocket
- [x] REST cycle jeux: create/status/join/roll/move/resign/draw (couvert + tests de régression matchmaking)
- [x] WS jeu: `ws://…/ws/game?gameId=…` (join/move/resign/draw), auth JWT, contrôle d’accès
- [x] Tests WebSocket: connexions valides, broadcast, cas négatifs (token invalide, gameId manquant)
- [x] Matchmaking REST: `/api/games/matchmaking/{join|leave|status}` + Jest (service/controller)
- [x] Matchmaking WS: `/ws/matchmaking` (status + found) avec diffusion SocketService

## 4) Tournois (socle)
- [x] Prisma: `tournaments`, `tournament_participants`, `tournament_matches`
- [x] REST: create/join/leave/get/participants/leaderboard/start/report/standings/bracket/overview
- [x] WS: `ws://…/ws/tournament?tournamentId=…` + `playerJoined/matchCreated/matchFinished/tournamentUpdated`
- [x] Tests REST/WS de base (Supertest, WS client)

## 5) Leaderboard & Dashboard (à étendre)
- [x] Endpoints leaderboard (global/pays/saison) + pagination (tests Jest service/controller)
- [x] ELO/winrate calculés et visibles (global/country/season)
- [x] Dashboard utilisateur: historiques, analyses, quotas (service + contrôleur + tests)
- [x] Documentation API leaderboard/dashboard + scénarios de tests

## 6) Rules Engine & Cube (à implémenter)
- [x] Cube actions: double/take/pass/redouble (persistées + exposées REST/WS/replay)
- [x] Résignations: single/gammon/backgammon (service + tests Jacoby/Cube)
- [ ] Options match: Crawford/Jacoby/Beaver/Raccoon
- [ ] Scoreboard match, pip count, horloge
- [ ] Export SGF/JSON

## 7) Documentation & Déploiement
- [ ] README.md: endpoints, WS, quotas, GNUBG résilience
- [ ] SECURITY.md: garanties sécurité
- [ ] docs/PROJECT_GUIDE.md: guide complet
- [ ] docs/WEBSOCKET_RECONNECT.md: protocole de reconnexion, replays, ACKs
- [ ] DEPLOYMENT.md: Render/Netlify

## 8) Plan d’action CODEX (validation point par point)

### Sprint 0 — Hardening & Prod readiness
- [ ] Quotas atomiques: transactions Prisma + `decrement`/`increment` en DB
- [x] Tests de concurrence quotas: 20+ appels parallèles, aucun double débit
- [ ] TTL JWT unifié (seconds) via `config` uniquement (pas de parsing côté controller)
- [ ] Sécurité prod: Helmet, CORS restrictif, rate‑limit, HPP, sanitation, audit logs
- [ ] Observabilité: métriques (quota consumed/extras/429/latences IA), request‑id, logs warn/error
- [ ] Docs: README sécurité, runbook quotas (spikes 429, reset, rollback)

### Sprint 1 — Tournois
- [x] Modèle Prisma: `tournaments`, `tournament_participants`, `tournament_matches`
- [x] Endpoints: create/join/leave/get/participants/leaderboard/start/report/standings/bracket/overview
- [x] Bracket single‑elimination (seed + standings)
- [x] Permissions: admin/organisateur/joueur/spectateur
- [x] Tests REST/WS + documentation OpenAPI

### Sprint 2 — Scoring/ELO & Leaderboards
- [x] ELO paramétrable (K-factor configurable, mise à jour saisonnelle)
- [x] Endpoints leaderboards: global/pays/saison (+ pagination)
- [x] Tests service/controller (cas limites) + affichage Dashboard
- [x] Documentation API (exemples JSON)

### Sprint 3 — Partie temps réel
- [x] Validation coups légaux (règles backgammon) — `tests/gameService.makeMove.test.ts` & `tests/backgammonEngine.test.ts`
- [x] Cube transport: snapshot + historique disponibles REST/WS/replay (double/take/pass/redouble)
- [x] Time control: presets, incréments, flag-fall persistés + rejoués via résumés/replay
- [ ] Cube avancé: Crawford/Beaver/Raccoon
- [ ] Reconnexions WS (grâce période, pause horloge)
- [ ] Tests e2e partie (latence perçue, résilience)

### Sprint 4 — Notifications & Upsell
- [x] 429 Quota → payload upsell (extras/premium) + tracking
- [ ] Victoire/défaite, invitation tournoi (WS/email)
- [ ] Préférences notifications utilisateur
- [ ] Tests d’intégration + microcopy cohérente

### Sprint 5 — Docs & Runbooks & E2E
- [ ] OpenAPI complet (quotas/parties/tournois/scoring)
- [ ] Runbooks incidents (quotas, timeouts IA, pics 429) + SLO/SLI
- [ ] E2E parcours free/premium/admin (signup→partie→IA→429→upsell)
- [ ] Smoke tests staging + plan de rollback

### Gates / Definition of Done (toutes features)
- [ ] `npx tsc --noEmit` clean, lints/format OK
- [ ] Tests unitaires + intégration verts (CI)
- [ ] Couverture ≥ seuil projet
- [ ] Déploiement staging + smoke tests OK
- [ ] Docs à jour (README, OpenAPI, CHECKLIST)

### Liens de référence (GNUBG)
- [ ] README quotas GNUBG (flux et logs)
- [ ] tests/gnubgQuota.test.ts (7 scénarios verts)
- [ ] VALIDATION_CHECKLIST tenue à jour

---

## Prompt IA (revue assistée)

Copiez/collez ce prompt dans Claude/GPT après avoir exécuté `npm run validate` et collé le rapport:

```
Contexte: Projet GammonGuru (backend Express + Prisma + WS, IA GNUBG + quotas).

Objectif: Passer en revue le rapport d’auto‑validation et pointer:
- anomalies, manques par rapport à la checklist jointe (sécurité, IA quotas, WS, tournois),
- écarts aux règles officielles backgammon (cube, Crawford/Jacoby/Beaver/Raccoon, resignations),
- recommandations concrètes par priorité.

Rends:
1) Résumé (OK/KO par section)
2) Manques critiques + fixes proposées
3) Quick wins (3 à 5)
4) Roadmap brève (Sprints A/B/C)
```

Lien: voir `npm run validate` pour générer un rapport synthétique. 

## Test Matrix — Sprint 3 Focus

| Domaine | Cas clés | Couverture | Statut |
| --- | --- | --- | --- |
| Horloge / time control | Présets BLITZ/NORMAL/LONG + incréments, flag-fall auto-resign | `tests/gameService.makeMove.test.ts`, `tests/timeControl/*.test.ts` *(à compléter)* | ✅
| Cube mécanique | Double → Take/Pass, Redouble avec historique | `tests/gameService.makeMove.test.ts`, `tests/replay/cubeEvents.test.ts` *(nouveau)* | ✅
| Snapshot & replay | REST `GET /games/:id/status`, WS `GAME_CUBE`, replays `GAME_REPLAY` | Integration tests `tests/websocket.test.ts`, `tests/replay/snapshots.test.ts` *(nouveau)* | ✅
