# Statut global du projet GuruGammon + bgammon

## ✅ Ce qui est en place et fonctionnel

- **Serveur GuruGammon backend**
  - API Express.js + Prisma sur Supabase/PostgreSQL (endpoints jeux, tournois, IA GNUBG, stats, etc.).
  - Authentification JWT (access/refresh tokens) et WebSockets temps réel (partie, matchmaking, tournois, notifications).
  - Monitoring Prometheus exposé via `/metrics`.
- **Frontend React (SPA)**
  - Application monopage (Vite + React) avec plateau `GameBoard.tsx` et vues multiplayer (`MultiplayerGameView.tsx`, `GameChat.tsx`).
  - Mode **Jouer contre l'IA** (GNUBG) activé et fonctionnel.
- **Intégration dans GameBoard.tsx**
  - Le plateau lit `state.board` via l'API backend.
  - Les dés et les coups sont validés par le backend (Node.js).
- **Tests Jest / Supertest**
  - Suites de tests couvrant les jeux, quotas IA, matchmaking, tournois, WebSockets backend.

## 🟡 Ce qui reste à connecter / améliorer – Roadmap priorisée

### P1 – Bloquants immédiats

- **Mapping complet `state.board`**
  - Assurer la synchronisation parfaite entre l'état backend (Prisma) et le plateau React.
- **UX de partie complète**
  - Finaliser les écrans de fin de partie (victoire, défaite, stats).

### P2 – Alignement et robustesse

- **Alignement avec le matchmaking GuruGammon**
  - Synchroniser le lobby et les invitations.
- **UX d’erreurs et reconnexions automatiques**
  - Afficher des messages clairs côté UI en cas d’erreur réseau.
  - Implémenter des stratégies de reconnexion WebSocket.

### P3 – Fonctionnalités avancées

- **Règles de cube avancées**
  - Implémenter la règle Jacoby et autres options (beaver, raccoon, etc.).
- **Dashboard utilisateur enrichi**
  - Étendre le dashboard pour afficher quotas IA, leaderboards complets et historiques.

## 🔴 Dépendances critiques et prérequis

- **Environnement backend**
  - Node.js 20+ (cf. `"node": "20.11.1"` dans `package.json`).
  - Base de données PostgreSQL (Supabase) et migrations Prisma appliquées.
- **Environnement frontend**
  - Vite/React avec `VITE_API_BASE_URL` configuré.
- **Dépendances réseau**
  - Ports ouverts en local :
    - `3000` pour le backend GuruGammon,
    - `5173` (ou équivalent) pour le frontend Vite.
- **Déploiement**
  - Configuration Render / Netlify alignée avec `render.yaml` et `netlify.toml` pour les environnements hébergés.
