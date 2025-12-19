# GammonGuru – Fiche produit stratégique

## Résumé exécutif
GammonGuru est une plateforme SaaS de backgammon multijoueur, cloud‑native, qui combine un moteur d’IA (GNUBG), un gameplay temps réel et une architecture moderne (Express + Netlify Functions + Supabase). L’objectif est double :
- offrir aux joueurs un environnement compétitif et pédagogique (suggestions IA, évaluations d’équité/PR, historique) ;
- permettre aux organisateurs (clubs, fédérations) de déployer des tournois scalables avec une base technique robuste.

Le produit s’appuie sur une pile TypeScript de bout en bout, un ORM Prisma, et des capacités temps réel via WebSocket. Les quotas IA (free/premium/extra) alignent le coût d’usage sur la valeur perçue.

---

## Fonctionnalités clés
- **Multijoueur temps réel**
  - WebSocket sécurisé (bibliothèque `ws`) pour `join`, `move`, `resign`, `draw`.
  - Authentification JWT côté socket et contrôle d’accès par partie.
- **IA GNUBG (provider abstrait)**
  - Suggestions de coups et évaluation de positions (équité, PR, winrate).
  - Quotas IA journaliers avec persistance Prisma (`AnalysisQuota`) et achats d’analyses.
- **Quotas & monétisation**
  - Free : 5 analyses offertes (initial free).
  - Premium : 10 analyses/jour.
  - Achat d’analyses supplémentaires (`extraQuota`).
- **Authentification & sécurité**
  - JWT access (15 min) + refresh (7 jours) avec rotation et révocation en base (`RefreshToken`).
  - Rate limiting, CORS restrictif en production, sanitisation d’inputs, headers sécurité.
- **Architecture hybride**
  - API Express (Render), Frontend Vue 3 (Netlify), Fonctions Netlify pour tâches annexes IA/outil.
- **Base de données**
  - Supabase PostgreSQL + Prisma (modèles : `users`, `games`, `game_moves`, `analyses`, `analysis_quotas`, `subscriptions`, …).
- **Extensibilité**
  - Provider IA abstrait (GNUBG par défaut). Possibilité de brancher d’autres moteurs ultérieurement.

---

## Stack technique (synthèse)
- Backend : Node.js, Express, TypeScript, `ws` (WebSocket), Prisma ORM, Supabase PostgreSQL
- Frontend : Vue 3, Vite, Pinia, Vue Router (hébergé Netlify)
- Serverless : Netlify Functions (IA utilitaires, images, rapports)
- Déploiement : Render (Docker/Node), Netlify (CDN)
- Sécurité : helmet, rate‑limit, sanitize, HPP, CORS restreint (prod), JWT access/refresh
- Tests : Jest, Supertest (+ tests e2e WebSocket prévus)
- Observabilité : journalisation structurée (logger). Intégrations monitoring additionnelles planifiées.

---

## Positionnement et différenciation
Sans revendiquer d’exhaustivité sur le marché, on distingue plusieurs familles d’alternatives : 
- plates‑formes de jeu en ligne orientées UX et matchmaking ;
- logiciels d’analyse avancés orientés étude/évaluation ;
- solutions communautaires axées tournois et clubs.

La proposition GammonGuru se distingue par :
- **Architecture moderne et ouverte** : API REST/WS typées, ORM, déploiement cloud standard, permettant l’intégration et la contribution.
- **Pédagogie intégrée** : suggestions IA et évaluations directement exploitables en partie et post‑partie (persistance prévue).
- **Contrôle des coûts IA** : quotas intelligents (free/premium/extra) pour maîtriser l’usage.
- **Prêt pour les organisateurs** : base technique pour les tournois et la scalabilité (WS, base relationnelle, migrations).
- **Sécurité par défaut** : rate limiting, CORS, sanitation, JWT avec refresh et révocation.

Remarque : le marché évolue rapidement et chaque solution a ses atouts (communauté, moteur d’analyse, ergonomie, historique). GammonGuru privilégie une approche modulaire et ouverte, favorable à l’itération rapide et à l’industrialisation.

---

## Roadmap produit
- **Court terme (MVP étendu)**
  - Finaliser la robustesse du provider IA : timeout, retry/backoff, circuit‑breaker, cache optionnel.
  - Exposer l’état des quotas côté API/UI (feedback utilisateur clair, messages 429 pédagogiques).
  - Tests Jest/Supertest (auth, quotas, IA, WebSocket e2e) et pipeline CI.
- **Moyen terme (Bêta)**
  - Tournois & classement ELO (endpoints complets, UI tournoi, spectateurs).
  - Dashboard utilisateur (stats, historique d’analyses, progression).
  - Chat temps réel par partie et salon.
  - Intégration Stripe e2e (plans, facturation, portails).
  - Observabilité : traçage, alerting, métriques produit.
- **Long terme**
  - Partenariats clubs/fédérations (instances dédiées, multi‑tenant).
  - Licence B2B (white‑label, API contracts).
  - Ouverture à d’autres moteurs IA / niveaux pédagogiques.

---

## Ciblage et cas d’usage
- **Joueurs compétitifs** : entraînement avec feedback IA, parties rapides, suivi de progression.
- **Fédérations/organisateurs** : hébergement de tournois, formats multiples, scalabilité cloud.
- **Investisseurs** : modèle SaaS avec monétisation claire (abonnements + achats d’analyses), coûts IA maîtrisés par quotas.
- **Contributeurs techniques** : pile TypeScript, Prisma, WS – contributions ciblées (tests, sécurité, IA, UX, infra).

---

## Liens & documentation
- API (staging) : `https://gammon-guru-api.onrender.com` (health, endpoints REST/WS)
- Frontend (staging) : `https://gammon-guru.netlify.app`
- Docs techniques : `README.md`, `PROJECT_OVERVIEW.md`, `DEPLOYMENT.md`
- Points d’entrée API (extraits) :
  - Auth : `POST /api/auth/{register|login|logout|refresh}`
  - Games : `POST /api/games`, `POST /api/games/:id/{suggestions|evaluate}`
  - IA/quotas : `POST /api/gnubg/purchase`, (quota status exposé côté API)
  - WebSocket : `wss://…/ws/game/:id`

> Note : certaines fonctionnalités sont en cours d’intégration ou d’industrialisation. Se référer à la roadmap pour la visibilité planning.

---

## Appel à contribution
- Tests e2e WebSocket et couverture Jest.
- Intégration Stripe bout‑en‑bout et UI quotas.
- Tournois (endpoints + UX) et outils d’arbitrage.
- Observabilité (Sentry, métriques, traces) et CI/CD.
- Accessibilité et performance (budget perf, audit Lighthouse).
