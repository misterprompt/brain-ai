# GammonGuru – Guide complet du projet

Ce document présente l’architecture, les modules clés, la base de données, les endpoints API/WS, la sécurité, les tests et le déploiement. Il sert d’entrée unique pour comprendre et contribuer au projet.

---

## 1. Vue d’ensemble

- Plateforme SaaS de backgammon multijoueur avec IA (GNUBG) et temps réel (WebSocket).
- Backend Express + Prisma (Supabase Postgres), Frontend Vue 3 (Netlify), fonctions serverless.
- Sécurité renforcée (JWT access/refresh, CORS, rate limiting, sanitisation, audit logs).
- Modules compétitifs: Tournois (socle), Leaderboard (à étendre), Matchmaking (à venir).

---

## 2. Architecture et codebase

```
root/
├─ src/
│  ├─ controllers/          # Handlers REST
│  ├─ routes/                # Déclarations routes Express
│  ├─ services/              # Logique domaine (AI, game, rules*, tournament*, etc.)
│  ├─ websocket/             # Serveurs WS (jeu, tournois)
│  ├─ middleware/            # Auth, sécurité, log
│  ├─ utils/                 # Outils (logger, etc.)
│  └─ server.ts              # Bootstrap Express + WebSocket
├─ prisma/                   # Schéma et migrations Prisma
├─ functions/                # Netlify Functions (IA/rapports/outils)
├─ tests/                    # Suites Jest/Supertest
├─ frontend/                 # SPA Vue 3
└─ docs/                     # Documentation projet
```

Points clés
- `src/server.ts` démarre Express, applique la sécurité, attache les routes et initialise WebSocket.
- `src/websocket/server.ts` gère `/ws/game?gameId=...` et délègue `/ws/tournament?...` à `tournamentServer`.
- `src/services/aiService.ts` encapsule provider GNUBG + quotas IA.
- `prisma/schema.prisma` définit les modèles (users, games, analyses, quotas, tournaments...).

---

## 3. Base de données (Prisma / Supabase)

Modèles principaux
- `users`: profils, ELO, stats, abonnement.
- `games`: état de partie (joueurs, board_state, scores, dice, mode, tournamentId?).
- `game_moves`: coups joués (+ PR/équité si renseigné).
- `analyses` + `game_analyses`: analyses IA (équité, PR, rapport JSON).
- `AnalysisQuota` (`analysis_quotas`): quotas IA journaliers (count/extra/initialFree).
- `subscriptions`: plans et statuts.
- Tournois:
  - `tournaments`: métadonnées (status, createdBy, dates, participants relation)
  - `tournament_participants`: inscription (registered_at, current_position)

---

## 4. API REST – points d’entrée

Back-end Express (`/api/...`)
- Auth
  - `POST /api/auth/register|login|logout|refresh`
- Games
  - `POST /api/games`
  - `GET /api/games/:id/status`
  - `POST /api/games/:id/{join|roll|move|resign|draw}`
  - `POST /api/games/:id/{suggestions|evaluate}`
- IA & quotas
  - `GET  /api/gnubg/quota`
  - `POST /api/gnubg/purchase`
- Tournois (socle)
  - `POST /api/tournaments` (admin)
  - `POST /api/tournaments/:id/join`
  - `GET  /api/tournaments/:id`
  - `GET  /api/tournaments/:id/participants`
  - `GET  /api/tournaments/:id/leaderboard`

À venir / recommandé
- Cube: `POST /api/games/:id/cube/{double|take|pass|redouble}`
- Export: `POST /api/games/:id/export (sgf|json)`
- Leaderboard global/pays/saisons
- Dashboard utilisateur: `GET /api/user/dashboard`

---

## 5. WebSocket – temps réel

Serveurs WS
- Jeu: `ws://{host}/ws/game?gameId=...`
  - Événements: `join`, `move`, `resign`, `draw`
  - Auth: JWT (header Authorization ou Sec-WebSocket-Protocol)
  - Contrôle d’accès: seuls les joueurs de la partie
- Tournoi: `ws://{host}/ws/tournament?tournamentId=...`
  - Événements: `playerJoined`, `tournamentUpdated` (à enrichir), `matchStarted`, `tournamentEnded`
  - Auth: JWT + inscription requise au tournoi

Message type (exemple move)
```json
{
  "type": "move",
  "payload": { "from": 6, "to": 1, "diceUsed": [3,5] }
}
```

👉 Pour la gestion complète de la reconnexion (handshake, replays, acknowledgements, heartbeat), consultez [docs/WEBSOCKET_RECONNECT.md](./WEBSOCKET_RECONNECT.md).

---

## 6. IA GNUBG et quotas

- Provider GNUBG résilient (timeout, retry/backoff, circuit breaker), logs structurés.
- Quotas IA journaliers: free (5 initial), premium (10/jour), `extraQuota` achetable.
- Endpoints: `GET /api/gnubg/quota`, `POST /api/gnubg/purchase`.
- Coaching IA (proposition): endpoint `POST /api/analysis/:id/coach` (Claude/GPT) pour explication pédagogique post-analyse.

---

## 7. Sécurité

- Auth: JWT access 15 min + refresh 7 jours (rotation `jti`, stockage hashé et révocation en DB).
- CORS restrictif en prod (whitelist FRONTEND_URL), Helmet, rate limiting par domaines de routes.
- Validation Zod sur endpoints critiques, sanitisation, HPP, audit logging.
- WebSocket: fermeture 1008 si token invalide / accès non autorisé (jeu/tournoi).
- Détails: voir `SECURITY.md`.

---

## 8. Tests

- Jest/Supertest
  - Auth: register/login/refresh/logout
  - Games: cycle de partie, IA suggestions/evaluate (mocks AIService)
  - Quotas: free/premium/extra + endpoint quota
  - GNUBG Provider: timeout, retry, circuit breaker
  - WebSocket: jeu (`join/move/resign/draw`) & tournoi (`playerJoined`) – cas négatifs inclus
- Mock Prisma mémoire pour isolation (`tests/utils/prismaMock.ts`).

Commandes utiles
```
npm run test -- --runTestsByPath tests/auth.test.ts
npm run test -- --runTestsByPath tests/quota.test.ts
npm run test -- --runTestsByPath tests/aiProvider.test.ts
npm run test -- --runTestsByPath tests/websocket.test.ts
```

---

## 9. Déploiement

- Backend: Render (Node/Express)
  - ENV nécessaires: `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, variables GNUBG
- Frontend: Netlify (Vite)
  - ENV: `VITE_API_BASE_URL`, `VITE_WS_BASE_URL`
- Fonctions: Netlify Functions pour intégrations IA auxiliaires
- Voir `DEPLOYMENT.md`.

---

## 10. Roadmap (résumé)

- Essentiel: Cube + Rules Engine (Crawford/Jacoby basiques), Leaderboard global, Tournoi socle + WS.
- Avancé: Pip count, Export JSON/SGF, Leaderboard pays/saison, Dashboard complet.
- Expert: Beaver/Raccoon, Horloge, Analytics avancées, Coaching IA complet.

---

## 11. Contribution

- PRs bienvenues (tests + lint requis).
- Respecter la séparation domaine/transport/persistance.
- Ajouter des tests pour toute logique métier ajoutée.

---

## 12. Annexes – Variables d’environnement

Backend (exemples)
```
JWT_SECRET=...
DATABASE_URL=postgres://...
FRONTEND_URL=https://gammon-guru.netlify.app
GNUBG_BASE_URL=https://gammon-guru-gnu.onrender.com
GNUBG_TIMEOUT_MS=8000
GNUBG_MAX_RETRIES=2
GNUBG_CIRCUIT_THRESHOLD=3
GNUBG_CIRCUIT_COOLDOWN_MS=60000
```
Frontend
```
VITE_API_BASE_URL=https://gammon-guru-api.onrender.com
VITE_WS_BASE_URL=wss://gammon-guru-api.onrender.com
```

---

Liens utiles
- `README.md` (survol rapide)
- `SECURITY.md` (garanties sécurité)
- `DEPLOYMENT.md` (déploiement Render/Netlify)
- `PROJECT_OVERVIEW.md` (jalons produit)
- `PRODUCT_OVERVIEW.md` (fiche produit stratégique)
