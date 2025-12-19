# GammonGuru – Guide Sécurité

Ce document décrit les garanties de sécurité mises en place pour le backend GammonGuru.

## 🔐 Authentification & Sessions

- **JWT Access Token** : durée de vie 15 minutes.
- **JWT Refresh Token** : durée de vie 7 jours, rotation via `jti` unique.
- **Stockage sécurisé** : refresh tokens hashés et persistés via Prisma (`refresh_tokens`).
- **Révocation** : suppression du refresh token lors du logout ou d’un refresh invalide.
- **Middleware typé** : `AuthRequest` enrichit `req.user` après validation JWT.
- **Sessions multiples** : chaque appareil conserve son refresh token dédié (remplacé à chaque rotation).

## 🌐 CORS

- Origines dynamiques :
  - Production : whitelist via `FRONTEND_URL` / `CORS_ORIGIN`.
  - Développement : `http://localhost:5173` et variantes.
- Headers : credentials activés, réponses 200 explicites pour OPTIONS.

## ⏱️ Rate Limiting & Throttling

- `POST /api/auth/login` → 5 tentatives / 15 min / IP.
- `POST /api/gnubg/*` → 10 requêtes / min / IP (analyse IA).
- `GET /api/*` par défaut → 120 requêtes / min / IP.
- `express-rate-limit` + `express-slow-down` pour la prévention d’abus.

## ✅ Validation (Zod)

### Endpoints couverts

- **Authentification** : `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`.
- **GNUBG AI** : `/api/gnubg/hint`, `/api/gnubg/evaluate`, `/api/gnubg/analyze`, `/api/gnubg/purchase`.
- **Tournois** : `/api/tournaments` (création), `/api/tournaments/:id/join`.

### Structure des schémas

- Champs requis explicitement typés (`string`, `number`, tableaux) avec trim automatique et contraintes de longueur.
- Validation des dés GNUBG (`dice` tableau de deux entiers 1-6), des états de plateau (`board` conforme aux structures backgammon), des listes de coups (`moves` tableau d'objets).
- Contrôle des valeurs hors plage (montant d'achat > 0, identifiants UUID non vides, nom de tournoi min. 1 caractère).
- Centralisation dans `src/validators/` pour réusage et cohérence entre contrôleurs.

### Comportement en cas d'erreur

- Rejets **HTTP 400** immédiats sur parsing Zod échoué ; aucune logique métier exécutée.
- Retour JSON normalisé : `{ success: false, error: "message explicite" }`.
- Journalisation côté contrôleur pour traçabilité (logger AuthController & GNUBG/Tournaments).

### Tests associés

- `tests/auth.test.ts` : scénarios d'inscription/connexion/refresh/logout valides & invalides.
- `tests/gnubgController.test.ts` : payloads GNUBG valides vs. `board/dice/moves` manquants ou mal typés.
- `tests/tournamentController.test.ts` : création de tournoi (admin requis, nom invalide) et inscription joueur.
- Chaque test vérifie code **400** et message lisible pour les cas limites (champs manquants, types incorrects, valeurs hors plage).

### Défenses complémentaires

- **Fallback** : quelques contrôleurs hérités conservent `express-validator`/`Joi` en attendant migration complète.
- **Sanitisation globale** : middleware `sanitizeInput`, protection HPP, headers sécurisés (Helmet).

## 🔑 Secrets & Config

Variables obligatoires (production) :

- `JWT_SECRET`
- `DATABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_URL`
- Variables IA (`GNUBG_BASE_URL`, etc. selon le provider).

Gestion :
- `.env` local, `.env.render` pour Render, variables Netlify pour le frontend.
- Prévoir rotation régulière des secrets sensibles.

## 🗄️ Base de données

- Supabase PostgreSQL.
- Connexions TLS/SSL.
- Row Level Security (RLS) activée côté Supabase sur les tables exposées.
- Backups quotidiens (gérés via Supabase / Render selon l’infrastructure).

## 📡 WebSocket

- Endpoint : `ws://{host}/ws/game?gameId={id}`.
- Authentification : JWT via header `Authorization` (fallback `Sec-WebSocket-Protocol`).
- Contrôle d’accès : vérification que `userId` ∈ {whitePlayerId, blackPlayerId} de la partie.
- Fermeture sécurisée : code 1008 (policy violation) si token invalide, gameId manquant ou non autorisé.
- Validation des messages : parsing JSON strict, réponse `{ success: false, error: 'Invalid message format' }`.

## 🛡️ Autres protections

- Helmet, compression, audit logging, timeout requête (30s).
- DDoS / brute-force : middleware `ddosProtection`, `speedLimit`.
- Monitoring : logs centralisés (Winston) et métriques GNUBG (timeouts, retries, circuit breaker).

## 🔄 Processus

- Tests Jest/Supertest couvrant auth, quotas, IA, WebSocket.
- CI recommandée : lint + tests + build avant déploiement.
- Revue de sécurité trimestrielle recommandée (rotation secrets, audit dépendances).
