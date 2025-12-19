# Prompts GPT 5.1 – GuruGammon Antigravity

Ce document liste des prompts prêts à l’emploi pour piloter GPT 5.1 (ou tout assistant avancé) sur le projet **GuruGammon Antigravity**.

Les prompts sont organisés par priorités :
- **Phase 1 :** Cœur de jeu (backend)
- **Phase 2 :** Intégration Front–Back
- **Phase 3 :** IA & GNUBG
- **Phase 4 :** UI/UX & polish
- **Phase 5 :** DevOps, tests & sécurité

---

## Phase 1 – Logique de jeu & règles (Backend)

**✅ Prompt 1 – Validation de base des coups**

> Analyse `src/services/gameService.ts` et implémente la validation stricte des mouvements dans la fonction ou le module de validation (par ex. `validateMove`). Assure-toi que les pions ne peuvent pas atterrir sur une pointe adverse occupée par plus d’un pion. Ajoute ou adapte les tests Jest nécessaires.

**✅ Prompt 2 – Gestion de la barre (hit)**

> Modifie la logique de mouvement dans `gameService.ts` pour gérer correctement la prise d’un pion (hit). Si un pion atterrit sur une pointe contenant exactement un pion adverse, ce pion adverse doit être déplacé sur la barre (`bar`) et le compteur approprié mis à jour dans l’état de jeu et en base.

**✅ Prompt 3 – Rentrée depuis la barre**

> Implémente la logique de rentrée des pions depuis la barre : tant qu’un joueur a des pions dans la barre, il doit obligatoirement les jouer avant tout autre coup. Intègre cette règle dans `gameService.ts` et bloque les autres mouvements dans l’API si `bar > 0`. Ajoute des tests qui couvrent les cas bloqués.

**✅ Prompt 4 – Sortie de pions (bearing off)**

> Ajoute la logique de bearing-off dans le moteur de jeu (module ou fonctions associées à `GameState`). Un joueur ne peut sortir des pions que si tous ses pions sont dans son home board. Gère les cas où le dé est supérieur à la distance restante (règles standard) et ajoute des tests Jest pour ces scénarios.

**✅ Prompt 5 – Détection de fin de partie**

> Implémente une fonction `checkWinCondition` (ou équivalent) dans `gameService.ts` qui est appelée après chaque mouvement. Si un joueur a sorti ses 15 pions, marque la partie comme `FINISHED`, enregistre le vainqueur dans la BDD via Prisma, et retourne un état de jeu cohérent à l’API.

**✅ Prompt 6 – Gestion du cube de double (doubling cube)**

> Finalise la logique du cube de double dans `src/services/rules/cubeLogic.ts` et son intégration dans `gameService.ts`. Assure-toi que les endpoints liés au cube (double, take, pass, redouble) appliquent correctement les règles de propriété du cube, de valeur et de mise à jour du match.

**✅ Prompt 7 – Règle de Crawford**

> Vérifie et complète l’implémentation de la règle de Crawford dans les matchs de tournoi (modules `matchEngine` et services de tournoi). Ajoute des tests pour garantir que le cube ne peut pas être utilisé pendant la partie Crawford et que le comportement redevient normal ensuite.

---

## Phase 2 – Intégration Frontend (React ↔ API)

**✅ Prompt 8 – Client API côté front**

> Dans `guru-react`, crée un module `src/api/client.ts` qui encapsule Axios (ou fetch) avec une baseURL pointant sur l’API backend. Ajoute un intercepteur pour ajouter automatiquement le JWT stocké dans le localStorage aux en-têtes `Authorization`. Fournis des fonctions de haut niveau pour `login`, `register`, `getGames`, `createGame`, `makeMove`, etc.

**✅ Prompt 9 – Écrans d’authentification**

> Implémente des composants `LoginForm` et `RegisterForm` dans `guru-react` (par ex. dans `src/components/auth/`). Connecte-les aux endpoints `/api/auth/login` et `/api/auth/register`. Gère les erreurs (format email invalide, mot de passe trop court, email déjà utilisé) et stocke le token JWT côté client.

**✅ Prompt 10 – Connexion WebSocket de partie**

> Crée un hook `useGameSocket` dans `guru-react` qui se connecte à `/ws/game?gameId={id}`. Il doit : gérer l’ouverture/fermeture, écouter les messages `GAME_UPDATE` et `GAME_MOVE`, mettre à jour l’état local de la partie, et exposer une fonction `sendMove` au reste de l’app.

**✅ Prompt 11 – Synchronisation état front avec backend**

> Refactorise `useBackgammon` dans `guru-react` pour ne plus simuler les coups entièrement en local, mais déléguer la validation au backend. À chaque action de l’utilisateur, envoie la demande de coup à l’API (`/api/games/:id/move`) et mets à jour l’état local avec la réponse serveur. Gère les erreurs (coup illégal, partie terminée, tour de l’adversaire).

**✅ Prompt 12 – Lobby et liste de parties**

> Ajoute une page ou une vue `Lobby` dans `guru-react` qui liste les parties disponibles (via un endpoint comme `GET /api/games?status=WAITING` ou similaire). Permets de créer une nouvelle partie et de rejoindre une partie existante via des boutons clairs.

**✅ Prompt 13 – Indicateurs visuels de dernier coup**

> Améliore le composant `GameBoard` pour pouvoir afficher le dernier coup joué (par exemple en surlignant la pointe de départ et d’arrivée). Consomme une information `lastMove` depuis l’état de jeu et adapte les classes CSS pour rendre ce feedback visuel clair.

---

## Phase 3 – IA & GNUBG

**✅ Prompt 14 – Robustesse GNUBGProvider**

> Analyse `src/providers/gnubgProvider.ts` (ou fichier équivalent) et renforce la robustesse de l’intégration : gestion des timeouts, des erreurs réseau ou de process, des retours invalides. Assure-toi qu’un crash ou blocage de GNUBG ne fasse jamais planter le serveur Express.

**✅ Prompt 15 – Endpoint de suggestions IA**

> Finalise l’endpoint `/api/games/:id/suggestions` pour qu’il retourne le meilleur coup proposé par GNUBG pour l’état actuel. Intègre la gestion de quota (`AIService` / `checkQuota`) et renvoie des erreurs 429 quand les limites sont atteintes.

**✅ Prompt 16 – Bouton de suggestion côté front**

> Dans `guru-react`, ajoute un bouton "Hint" ou "Suggestion IA" sur l’écran de partie. Quand l’utilisateur clique, appelle l’endpoint de suggestion et affiche le coup recommandé sous forme de surbrillance ou d’animation de trajectoire sur le plateau.

**✅ Prompt 17 – Bar d’évaluation (Win Probability)**

> Crée un composant `WinProbabilityBar` qui reçoit les probabilités de victoire (`whiteWinProb`, `blackWinProb`) depuis l’API `/api/games/:id/evaluate`. Affiche une barre horizontale ou un indicateur clair montrant l’avantage actuel.

**Prompt 18 – Mode "Jouer contre l’IA"** _(en attente / nécessite un refactor backend)_

> Implémente un mode de jeu contre l’IA. Lors de la création de partie, si `opponentType = 'AI'`, configure le backend pour appeler automatiquement GNUBG après chaque coup du joueur humain et jouer le coup de l’IA, en mettant à jour l’état et en notifiant le client via WebSocket ou API.
>
> **État actuel :** l’analyse du code a montré que le backend de partie (`GameService` + contrôleurs `/api/games`) est encore en transition vers le nouveau schéma Prisma (`games` / `users`) et largement stubé. L’implémentation propre du mode `AI_VS_PLAYER` nécessite un refactor backend important (aligner `GameService` sur Prisma, exposer de vraies méthodes `createGame` / `makeMove` / `getGame`, puis brancher `AIService`/GNUBG pour jouer automatiquement les coups IA et notifier le client). Le prompt est donc planifié mais **mis en attente** en attendant cette phase backend dédiée.

---

## Phase 4 – UI/UX & polish

**✅ Prompt 19 – Animations de déplacement des pions**

> Utilise `framer-motion` (déjà présent dans les dépendances) pour animer le déplacement des pions dans `GameBoard`. Les pions doivent se déplacer en glissant d’une pointe à l’autre, plutôt que de téléporter instantanément. Gère les mouvements multiples (doubles, suites de coups).

**✅ Prompt 20 – Animation des dés**

> Ajoute une animation de roulage de dés dans l’UI : quand l’utilisateur clique sur "Roll Dice", affiche une animation (rotation, shake, etc.) pendant ~1 seconde avant de montrer les valeurs finales. Assure-toi que l’état logique (backend) reste la source de vérité pour le résultat.

**✅ Prompt 21 – Responsive design du plateau**

> Améliore les feuilles de style `GameBoard` et globales pour que l’interface soit confortable sur mobile (petits écrans en mode portrait). Ajuste la taille des pions, des triangles et des marges, et vérifie que les actions principales restent facilement accessibles.

**✅ Prompt 22 – Effets sonores**

> Intègre quelques effets sonores légers (placement de pion, roulage de dés, fin de partie). Crée un petit service `soundService` côté front pour centraliser la lecture des sons et évite les doublons ou glitchs audio.

**✅ Prompt 23 – Chat en cours de partie**

> Ajoute un composant `GameChat` qui se connecte au même WebSocket de partie ou à un canal dédié. Permets l’échange de messages texte entre les deux joueurs pendant la partie, avec anti-flood simple et filtrage de base.

**✅ Prompt 24 – Historique des coups**

> Implémente un panneau d’historique des coups affichant les mouvements en notation texte (par ex. "24/21 13/9"). Mets cet historique à jour à chaque coup, aussi bien côté front que côté backend (pour pouvoir le recharger après reconnexion).
>
> **État actuel :** un composant `MoveHistory` a été ajouté côté frontend, alimenté par un `moveHistory` dans l’état local du hook `useBackgammon`. L’historique est mis à jour à chaque coup joué en mode local, avec une notation simple `FROM/TO` (1–24). La persistance complète dans la table `game_moves` et l’exposition d’un historique côté API seront traitées en même temps que le refactor du moteur de partie (`GameService`) déjà identifié pour le Prompt 18.

---

## Phase 5 – DevOps, tests & sécurité

**✅ Prompt 25 – Tests unitaires sur gameService**

> Écris ou complète une suite de tests Jest pour `src/services/gameService.ts`. Couvre au minimum : coups légaux/illégaux, prise (hit), entrée depuis la barre, bearing-off, fin de partie, et interactions de base avec les règles de match.
>
> **État actuel :** la batterie de tests Jest existante couvre déjà les règles essentielles du moteur de jeu : validations avancées dans `BackgammonEngine` (coups illégaux, priorités de dés, entrée depuis la barre, bearing-off) et scénarios complets dans `GameService.makeMove` (hit + barre, entrée depuis la barre, auto-pass, détection de victoire, persistance de l’état et notifications). Les règles de match/Crawford sont testées via `tests/rules/matchEngine.test.ts`.

**✅ Prompt 26 – Tests E2E du frontend**

> Ajoute Playwright ou Cypress au projet frontend `guru-react`. Crée un scénario de bout en bout qui couvre : inscription → connexion → création d’une partie → jouer au moins un coup → déconnexion.
>
> **État actuel :** Playwright a été ajouté comme framework E2E dans `guru-react` (`@playwright/test`, scripts `npm run test:e2e` et `npm run test:e2e:ui`, fichier `playwright.config.ts`). Un premier scénario E2E minimal vérifie que l’application se charge, que l’en-tête "GuruGammon" est visible, que le bouton "Roll Dice" fonctionne et que l’on peut interagir avec le plateau en mode local. Le flux complet avec authentification/lobby restera à affiner une fois l’UI de navigation et le backend de parties stabilisés.

**✅ Prompt 27 – Tests de charge (load testing)**

> Crée un script de tests de charge (par ex. avec k6 ou autocannon) qui simule des dizaines de parties simultanées utilisant les endpoints critiques (`/api/games`, `/move`, WebSocket). Mesure la latence moyenne et identifie les goulets d’étranglement.
>
> **État actuel :** un script k6 a été ajouté dans `load-tests/games_load_test.k6.js`. Il simule un flux simple "création de partie" (`POST /api/games`), "coup" (`POST /api/games/:id/move`) et connexion WebSocket à `/ws/game?gameId=...`, avec des métriques de latence (`http_create_game_duration`, `http_move_duration`, `ws_connect_duration`) et un compteur d’erreurs WebSocket. Le script est paramétrable via les variables d’environnement `BASE_URL`, `AUTH_TOKEN`, `VUS` et `DURATION`.

**✅ Prompt 28 – Audit de sécurité des endpoints**

> Passe en revue les routes `/api/games`, `/api/user`, `/api/gnubg` et `/api/tournaments` pour t’assurer qu’aucun utilisateur ne peut agir au nom d’un autre. Vérifie systématiquement que `req.user.id` correspond toujours bien au joueur ou à l’utilisateur visé par l’action.
>
> **État actuel :**
> - `/api/games` : toutes les routes passent par `authMiddleware`. Les endpoints actifs les plus sensibles (`/status`, `/suggestions`, `/evaluate`) utilisent `req.user.id` et la fonction `ensurePlayerInGame` pour vérifier que l’utilisateur est bien un des joueurs de la partie avant de renvoyer un état ou une analyse IA. Les actions de partie (création, move, roll, resign, draw, etc.) sont actuellement stubées, et devront réutiliser ce même pattern lors du refactor de `GameService`.
> - `/api/user` : le router applique `authMiddleware` globalement. `getProfile` et `updateProfile` ne travaillent que sur `req.user.id` (profil de l’utilisateur connecté), il n’est pas possible de mettre à jour un autre utilisateur par simple modification de payload.
> - `/api/gnubg` : toutes les routes sont protégées par `authMiddleware` + un rate limiter dédié. Les contrôleurs associent systématiquement les appels IA à `req.user.id` (quota/check, analyse de position, achat de quota), ce qui évite qu’un utilisateur consomme ou voie le quota d’un autre; aucune route ne permet de cibler un autre userId arbitraire.
> - `/api/tournaments` : le router applique également `authMiddleware`. Les actions sensibles (création de tournoi, démarrage, report de résultat) vérifient le rôle via `req.user.id` (organisateur ou admin) et/ou l’appartenance au tournoi. Les endpoints de lecture (détails, participants, standings, bracket) restent publics mais ne permettent pas d’agir au nom d’un autre utilisateur.

**✅ Prompt 29 – Environnement Docker de dev**

> Configure un environnement Docker de développement unifié : un `docker-compose.yml` qui lance Postgres, le backend Express (`gurugammon-antigravity`) et éventuellement le frontend React en mode dev ou pré-build. Documente la procédure dans `DEPLOYMENT.md`.
>
> **État actuel :** un environnement Docker de dev est fourni via `docker-compose.dev.yml`, qui démarre un conteneur Postgres (`db`) et le backend Express (`app`) construit à partir du `Dockerfile` du projet, exposé sur le port 3000. La procédure de lancement (préparer `.env`, puis `docker compose -f docker-compose.dev.yml up --build`) est décrite dans `DEPLOYMENT.md`. Le frontend React (`guru-react`) reste lancé en local via Vite (`npm run dev`) en pointant `VITE_API_BASE_URL` sur `http://localhost:3000`.

**✅ Prompt 30 – CI/CD (lint, tests, build)**

> Ajoute un pipeline CI (ex : GitHub Actions) qui exécute linter, tests backend, tests frontend et build (front + back) à chaque push sur la branche principale. Le pipeline doit échouer si les tests ou le lint échouent.
>
> **État actuel :** un workflow GitHub Actions a été ajouté dans `.github/workflows/ci.yml`. Il s’exécute sur les pushes et pull requests vers `main` et réalise les étapes suivantes : installation des dépendances backend et frontend, `npm run lint` + `npm test` côté backend, `npm run lint` côté frontend, installation des navigateurs Playwright, exécution des tests E2E (`npm run test:e2e`), puis build du backend (`npm run build`) et du frontend (`npm run build` dans `guru-react`). Le workflow échoue automatiquement si l’une de ces étapes échoue, ce qui bloque l’intégration de code cassé sur la branche principale.

**Prompt 31 – Déploiement Netlify unifié pour `guru-react` (V1)**

> Tu es un assistant "V1" qui travaille **dans ce repo**. Ta mission est de rendre le déploiement du frontend React `guru-react` **simple, fiable et standardisé via Netlify**, en utilisant le backend déjà déployé sur Render (`https://gurugammon.onrender.com`). Procède étape par étape :
>
> 1. **Vérifier la configuration API côté React**
>    - Confirme que `guru-react/src/api/client.ts` utilise `import.meta.env.VITE_API_BASE_URL` comme base et qu’aucune URL `localhost` n’est hard-codée pour la production.
>    - Garde un fallback raisonnable pour le dev local (ex. `http://localhost:3000`), mais assure-toi qu’en build Netlify ce soit bien `VITE_API_BASE_URL` qui est utilisé.
>
> 2. **Standardiser la configuration Netlify**
>    - Vérifie s’il existe déjà un `netlify.toml` pertinent pour `guru-react`. Sinon, crée-en un adapté.
>    - Objectif : que Netlify, pour ce projet, exécute `npm run build` **dans `guru-react/`** et publie le dossier `guru-react/dist`.
>    - Nettoie ou marque comme legacy toute config Netlify qui pointe encore vers l’ancien frontend Vue (`frontend/`).
>
> 3. **Variables d’environnement Netlify**
>    - Documente et configure les variables nécessaires pour le front React :
>      - `VITE_API_BASE_URL = https://gurugammon.onrender.com` (ou autre URL Render choisie).
>    - Ajoute ces infos dans `DEPLOYMENT.md` et/ou `docs/PROJECT_STATUS.md` (section Déploiement) en expliquant où les saisir dans l’UI Netlify.
>
> 4. **Netlify process de déploiement**
>    - Décris et/ou scripts le processus Netlify recommandé :
>      - Déploiement auto via Git : push sur `main` → Netlify pull + build `guru-react` → publication.
>      - Déploiement manuel via CLI : `npm run build` puis `netlify deploy --prod --dir=dist` lancé dans `guru-react/`.
>    - Si nécessaire, adapte les scripts `package.json` ou ajoute une section dédiée dans `DEPLOYMENT.md`.
>
> 5. **Nettoyage & documentation finale**
>    - Supprime ou archive les anciens scripts/notes de déploiement qui parlent de l’intégration Vue/bgammon obsolète.
>    - Mets à jour `docs/PROJECT_STATUS.md` pour refléter clairement :
>      - L’URL Netlify active pour le frontend React.
>      - L’URL Render active pour le backend.
>      - Le flux de déploiement Netlify (quelles commandes, quels dossiers, quelles variables d’env).

---

## Conseils d’utilisation

- Utilise ces prompts **un par un** ou par petits groupes (2–3) pour garder le contrôle sur les changements.
- Après chaque prompt appliqué, exécute les tests et vérifie le comportement en local.
- Garde ce fichier à jour en cochant/annotant les prompts déjà traités ou en ajoutant des variantes plus spécifiques si besoin.

---

## Phase 6 – Meta-prompt d’audit global & roadmap (GPT 5.1)

Ce bloc est un **meta-prompt** à utiliser avec une IA plus puissante (par ex. GPT 5.1) pour réaliser un audit complet (produit + backend + frontend + DevOps) et produire une feuille de route détaillée (prompts) à exécuter ensuite.

### META-PROMPT À DONNER À UNE AUTRE IA (EN)

> You are a **principal engineer / architect / product designer** tasked with doing a **full audit and roadmap** for a backgammon SaaS app.
>
> You will work **inside my repo**, and your job is NOT to implement changes, but to:
> - Understand the **full concept** (product, gameplay, AI, UX, monetization).
> - Analyze **backend, frontend, and infrastructure** at a high level.
> - Identify missing pieces / inconsistencies.
> - Produce a **prioritized list of ~50 prompts/tasks** I can give to **another coding assistant** to execute.
>
> Do not assume anything is “out of scope”: you are allowed to consider product, UX, architecture, and DevOps.
>
> ---
>
> ## 1. Project context
>
> - OS used by developer: Windows.
> - Monorepo root (on my machine):
>   `C:\Users\8888v\CascadeProjects\gurugmon-v2`  
> - **Backend project:**
>   `C:\Users\8888v\CascadeProjects\gurugmon-v2\gurugammon-antigravity`  
> - **Frontend (React) project:**
>   `C:\Users\8888v\CascadeProjects\gurugmon-v2\gurugammon-antigravity\guru-react`
>
> This repo was originally built around a more complex Vue frontend and then migrated toward a React/Vite frontend (`guru-react`). Some Jest tests still reference old Vue files.
>
> ### Product concept (what the app is about)
>
> - Online backgammon platform (“GammonGuru”).
> - Key features:
>   - Human vs Human games (online matchmaking).
>   - Human vs AI games using GNUBG or similar backgammon engine.
>   - Tournaments and leaderboards.
>   - Rating / Elo, time controls, match settings (Crawford, cube, etc.).
>   - AI coach / analysis features: suggestions and evaluations of positions.
>   - Modern, premium‑looking board UI with dice, doubling cube, move history, and chat.
>
> Backend exposes APIs (REST) and WebSockets for real‑time updates; frontend is a React SPA consuming those.
>
> ---
>
> ## 2. Tech stack (high level)
>
> **Backend:**
> - Node.js + Express + TypeScript.
> - Prisma ORM with PostgreSQL (`prisma/schema.prisma`).
> - WebSockets via `ws` (`src/websocket/server.ts`).
> - AI integration via `src/services/aiService.ts` and `src/providers/gnubgProvider.ts`.
> - Game engine / rules in `src/services/gameEngine.ts` and `src/services/gameService.ts`.
> - Rate limiting, security middlewares (`src/security-middleware.ts`, `src/middleware/rateLimiter.ts`).
> - Metrics & monitoring code under `src/metrics/`.
>
> **Frontend:**
> - React + Vite (TypeScript) in `guru-react`.
> - Main app entry: `guru-react/src/App.tsx`.
> - Game board UI: `guru-react/src/components/GameBoard/...` (Board, Points, Dice, DoublingCube CSS).
> - Game state hook: `guru-react/src/hooks/useBackgammon.ts`.
> - WebSocket hook: `guru-react/src/hooks/useGameSocket.ts`.
> - API client: `guru-react/src/api/client.ts`.
>
> **Tests:**
> - Jest tests for backend logic (game, tournaments, quotas, WebSocket).
> - Some legacy frontend Jest tests that still reference `frontend/src` and Vue components, which no longer exist in the React app.
>
> ---
>
> ## 3. Current code status (as far as I know)
>
> You should **verify** these points by reading the code:
>
> - Backend TypeScript builds cleanly using `tsconfig.prod.json`.
> - Prisma client and JSON types have been cleaned up in `src/services/gameService.ts`.
> - `GameService` supports:
>   - `createGame` with `GameMode.AI_VS_PLAYER`.
>   - `rollDice` and `makeMove` with AI auto‑move for AI vs Player.
> - WebSocket server:
>   - Receives internal game events via `gameEventEmitter`.
>   - Emits:
>     - `'join'` → `SocketService.onGameJoin` → `GAME_JOIN`.
>     - `'move'` → `SocketService.onGameMove` → `GAME_MOVE`.
>     - `'roll'` → `SocketService.onGameMove` with `move.eventType = 'roll'`.
> - Frontend:
>   - `useGameSocket` connects to `/ws/game?gameId=...` and sends auth as `sec-websocket-protocol: Bearer <token>`.
>   - `useBackgammon`:
>     - If `gameId` is present, loads initial state from `/api/games/:id/status`.
>     - Sends roll/move over REST.
>     - Subscribes to `GAME_MOVE` and maps payload `move.board` + `move.dice` into local state.
>     - Detects roll events via `move.eventType === 'roll'` (currently logs them).
> - Some Jest tests fail locally because:
>   - `DATABASE_URL` is not set (no local DB).
>   - Legacy Vue tests reference paths like `../frontend/src/components/DoublingCube.vue` and `@/router`.
>   - Quota and WS tests expect certain behavior that might have drifted.
>
> You should treat these as **signals** to check whether the tests themselves are still relevant.
>
> ---
>
> ## 4. Your tasks
>
> ### 4.1. Understand the full product & architecture
>
> - Scan backend:
>   - `src/server.ts`
>   - `src/services/*.ts`
>   - `src/controllers/*.ts`
>   - `src/routes/*.ts`
>   - `src/websocket/server.ts`
>   - `prisma/schema.prisma`
> - Scan frontend (React):
>   - `guru-react/src/App.tsx`
>   - `guru-react/src/hooks/useBackgammon.ts`
>   - `guru-react/src/hooks/useGameSocket.ts`
>   - `guru-react/src/components/GameBoard/*`
>   - Any other important UI pieces (chat, move history, etc.).
> - Understand how:
>   - AI vs Player game is created.
>   - Dice are rolled and moves are applied.
>   - AI moves are requested and applied.
>   - WebSockets are used for real‑time updates.
> - Understand user experience flow for a new user:
>   - Registration/login.
>   - Creating a game.
>   - Playing vs AI.
>   - Seeing analysis/coach features.
>   - Tournaments/leaderboards (at least at a conceptual level).
>
> ### 4.2. Critique / GAP analysis
>
> Produce a written **audit** (not code) covering:
>
> - **Backend architecture:**
>   - Are services and controllers layered cleanly?
>   - Is game logic placed in the right layer vs controllers/DB?
>   - How clean/maintainable is the WebSocket + session + replay system?
>   - Any obvious performance or scalability concerns?
> - **Database / Prisma:**
>   - Schema design (games, users, tournaments, quotas, etc.).
>   - Any obvious normalization or indexing issues.
>   - Risky JSON usage patterns.
> - **Frontend architecture (React):**
>   - Is state management around `useBackgammon` solid?
>   - How is error handling managed?
>   - How is AI vs Player UX implemented?
> - **Testing:**
>   - Which Jest tests are still relevant?
>   - Which ones are legacy / referencing old Vue code and should either be updated or removed?
>   - Where are the biggest blind spots (features with no tests)?
> - **Security / reliability:**
>   - JWT handling, middlewares.
>   - Rate limiting, sanitization.
>   - Potential vulnerabilities or weak points.
> - **UX / UI (conceptual):**
>   - Does the current React UI appropriately communicate:
>     - AI mode vs Human vs Human?
>     - Who is the opponent?
>     - Whose turn it is?
>     - When AI is “thinking”?
>   - Are loading/error states handled in a user‑friendly way?
>
> ### 4.3. Output: 50+ concrete prompts / tasks
>
> After your analysis, output **around 50 concrete prompts** (number them) that I can give to another coding assistant.
>
> Each prompt should be:
> - **Self‑contained** (it should make sense on its own).
> - **Actionable** (e.g. “Refactor X…”, “Add error handling to Y…”, “Design UI flow for Z…”).
> - Targeted at improving:
>   - Code quality / architecture.
>   - AI vs Player functionality.
>   - UX & UI clarity.
>   - Test coverage / reliability.
>   - DevOps / deployment readiness.

---

## Phase 7 – 60 targeted prompts for full polish (EN)

Here are **60 targeted prompts** you can feed into a stronger AI (like GPT-4.1/5) to systematically fix, polish, and complete your backgammon app before you begin end-to-end testing.

These prompts are organized by domain. You can copy-paste them one by one or in batches.

---

### 1. Backend Clean-up & Architecture

1.  **Audit Prisma Schema:** Review `prisma/schema.prisma` for consistency. Ensure all relations (User-Game, Tournament-Match) are correctly defined with appropriate indexes and constraints. Suggest and apply a migration if needed.
2.  **Centralize Config:** Verify `src/config/index.ts` captures ALL environment variables used in the app. If any `process.env` calls exist outside this file, refactor them to use the config module.
3.  **Refactor GameService Methods:** Ensure `GameService.createGame` and `GameService.makeMove` have consistent error handling. If they throw raw strings, refactor to use a custom `AppError` class with status codes.
4.  **Controller Validation:** In `src/controllers/gameController.ts`, replace manual `req.body` checks with a validation library like `zod` or `joi` to ensure input safety before passing data to services.
5.  **Remove Dead Code:** Scan the entire `src/` directory for unused imports, unused variables (that aren't prefixed with `_`), and unreachable code blocks. Delete them to reduce noise.
6.  **Standardize Logging:** Replace any `console.log` or `console.error` calls in `src/services/*.ts` with the centralized `Logger` from `src/utils/logger.ts`.
7.  **Fix "any" Types:** Run a pass over `src/services/gameService.ts` and `gameController.ts` to replace usage of `any` with specific interfaces from `src/types/*.ts` where possible.
8.  **Service Layer Isolation:** Ensure `gameController` never accesses `prisma` directly. It should exclusively call methods on `GameService`. Refactor any direct DB calls in controllers.
9.  **WebSocket Type Safety:** In `src/websocket/server.ts` and `src/services/socketService.ts`, strictly type the payloads for `GAME_MOVE`, `GAME_JOIN`, and `GAME_ROLL` to ensure the frontend receives a consistent shape.
10. **Rate Limiter Polish:** Review `src/middleware/rateLimiter.ts`. Ensure the defensive `rateLimitConfig` wrapper is robust and that rate limits are applied correctly to `/api/auth/*` vs `/api/games/*`.

---

### 2. Game Logic & AI Engine

11. **AI Move Timeout:** In `GameService.makeMove`, implement a proper timeout or race condition for the AI move loop so it cannot hang the server indefinitely if GNUBG is slow.
12. **AI "Thinking" State:** Update `GameService` to emit a `GAME_THINKING` event via WebSocket immediately after a human moves in an AI game, so the frontend knows to show a spinner.
13. **Roll Dice Event:** Verify `GameService.rollDice` emits the internal `roll` event. Ensure this event payload explicitly includes the `dice` array and the `currentPlayer` to prevent desyncs.
14. **Cube Logic Review:** Audit `src/services/rules/cubeLogic.ts` (or equivalent) to ensure the doubling cube rules (crawford, jacoby, etc.) are correctly checked before `makeMove` accepts a move.
15. **Match End Handling:** Ensure `GameService.makeMove` correctly detects match termination (e.g., reaching target points). Upon match end, emit a `GAME_OVER` event with the winner/loser details.
16. **Resignation Flow:** Implement the `GameService.resignGame` method (currently stubbed). Ensure it updates the game status, sets the winner, and emits `GAME_RESIGN` via WebSockets.
17. **GNUBG Provider Retry:** In `src/providers/gnubgProvider.ts`, implement a retry mechanism with exponential backoff for calls to the external AI service (in case of 503/timeout).
18. **Quota Management Hook:** Ensure `AIService.getBestMove` calls the quota manager *before* calling GNUBG. If quota is exceeded, throw a specific `QuotaExceededError` that controllers can catch.
19. **Game Snapshot Integrity:** Review `serializeSnapshot` and `deserializeSnapshot` in `GameService`. Add a unit test to confirm that a board state round-trips correctly without data loss (e.g., bar counts).
20. **Timer Logic:** Verify `TurnTimerService` integrates with `GameService`. Ensure that if a player's time runs out, the game status automatically updates to `TIMEOUT` (or sets a winner).

---

### 3. Frontend Architecture (React)

21. **Env Var Consistency:** Ensure `guru-react/src/api/client.ts` uses `import.meta.env.VITE_API_BASE_URL`. Add a fallback to `window.location.origin` if the env var is missing (for production builds served by the same host).
22. **API Client Types:** Refactor `guru-react/src/api/client.ts` to use generic return types for all methods (`get`, `post`, etc.) so components don't have to cast `response as any`.
23. **Socket Hook Reconnection:** In `guru-react/src/hooks/useGameSocket.ts`, implement auto-reconnection logic with exponential backoff if the WebSocket connection drops unexpectedly.
24. **Global Error State:** Create a global Error Boundary or a dedicated `useError` hook in the React app to display toast notifications for API failures (4xx/5xx) instead of just console logs.
25. **Auth Context:** Implement a React Context (AuthContext) to manage `user` state and `token`. Ensure `useBackgammon` consumes this context instead of reading `localStorage` directly.
26. **Component Cleanup:** Delete any legacy Vue-related files or folders (e.g., `src/components/Vue*`) if they still exist in the source tree to avoid confusion.
27. **Strict Mode Compliance:** Verify `guru-react/src/App.tsx` and main components render correctly inside `<React.StrictMode>` without double-invoking effects that cause side effects (like creating duplicate games).
28. **CSS/Tailwind Review:** Check if the project uses raw CSS or Tailwind. If mixed, refactor `components/GameBoard/*.css` to use Tailwind utility classes for consistency (if Tailwind is the chosen direction).
29. **Asset Optimization:** Ensure all images/icons in `src/assets` are optimized (WebP/SVG). Create a helper component `Icon` to render SVGs efficiently.
30. **Linter Config:** Update `guru-react/eslint.config.js` (or `.eslintrc`) to include rules for React Hooks (`exhaustive-deps`) and ensure no critical rules are disabled.

---

### 4. UI/UX Polish

31. **Loading Skeleton:** Create a "Game Loading" skeleton state in `GameBoard.tsx` to display while `useBackgammon` is fetching the initial game state.
32. **AI Indicator:** Add a visual indicator (e.g., a robot icon or "Bot Thinking..." badge) near the opponent's avatar when playing against AI.
33. **Dice Animation:** Implement a CSS or Framer Motion animation for dice rolls in `Dice.tsx`. Trigger this animation when `move.eventType === 'roll'` is received via WebSocket.
34. **Legal Move Highlighting:** In `useBackgammon`, ensure `validMoves` are correctly calculated and passed to `GameBoard`. Visually highlight points that are valid destinations for the selected checker.
35. **Move History Sidebar:** Polish the `MoveHistory` component. Ensure it auto-scrolls to the bottom when a new move is added. Format moves in standard backgammon notation (e.g., "8/5 6/5").
36. **Chat UI:** Enhance `GameChat` to distinguish system messages (e.g., "Player joined", "AI moved") from user messages. Use different colors/styles.
37. **Player Feedback:** Add toast notifications for game events: "You Win!", "Game Over", "Resignation accepted". Use a library like `sonner` or `react-hot-toast`.
38. **Responsiveness:** Test `GameBoard` layout on mobile breakpoints. Ensure checkers and dice scale down appropriately without breaking the layout.
39. **Connection Status:** Improve the "Online/Offline" badge in `guru-react/src/App.tsx`. Show "Reconnecting..." in yellow if the socket drops, and "Connected" in green when active.
40. **Landing Page:** Create a simple "Lobby" or "Home" component that allows the user to choose "Play vs AI" or "Play vs Human" before rendering the `GameBoard`.

---

### 5. Testing (Backend & Frontend)

41. **Remove Legacy Tests:** Delete all Jest test files in `tests/` that import from `frontend/src` or reference `.vue` files. These are obsolete.
42. **Backend Unit Test - Create Game:** Write a Jest test for `GameService.createGame` that mocks Prisma and verifies that a game is returned with the correct initial board and status.
43. **Backend Unit Test - Make Move:** Write a test for `GameService.makeMove` verifying that it throws an error if a player tries to move out of turn or uses dice they don't have.
44. **Backend Integration Test - AI Flow:** Write an integration test (mocking GNUBG provider) that simulates a full turn: Player Roll -> Player Move -> AI Roll -> AI Move.
45. **Frontend Unit Test - Hook:** Write a test for `useBackgammon` (using `renderHook`) to verify it correctly updates state when `rollDice` is called (mocking the API).
46. **Frontend Component Test - Board:** Use React Testing Library to render `GameBoard` with a specific state and assert that the correct number of checkers are displayed on the correct points.
47. **WS Logic Test:** Write a backend test for `socketService` ensuring that calling `onGameMove` broadcasts the message to the correct room/channel.
48. **Rate Limit Test:** Write a supertest/Jest test hitting a protected endpoint 100 times rapidly to confirm the rate limiter returns 429.
49. **End-to-End Scenario:** Describe a manual test plan in `tests/manual-test-plan.md` covering the "Happy Path" (Login -> Create AI Game -> Finish Game) so a human can verify quickly.
50. **CI Pipeline:** Create a GitHub Actions workflow (`.github/workflows/test.yml`) that installs dependencies and runs `npm run lint` and `npm test` for both backend and frontend.

---

### 6. DevOps & Deployment Readiness

51. **Dockerfile - Backend:** Create a `Dockerfile` for the backend that performs a multi-stage build (install deps -> build TS -> copy dist -> run).
52. **Dockerfile - Frontend:** Create a `Dockerfile` for the frontend that builds the React app and serves it via Nginx (or prepares it for static hosting).
53. **Render Config:** Create a `render.yaml` (blueprint) defining the web service (backend) and static site (frontend), linking them correctly.
54. **Environment Config Documentation:** Create `DEPLOYMENT.md` listing every required ENV var (`DATABASE_URL`, `JWT_SECRET`, etc.) with descriptions of where to get them.
55. **Database Migration Script:** Add a `release` command in `package.json` (or Render start command) that runs `npx prisma migrate deploy` before starting the server.
56. **Security Headers:** Verify `helmet` configuration in `src/server.ts`. Ensure Content Security Policy (CSP) allows connections to the WebSocket URL and API URL.
57. **CORS Configuration:** Update `src/config/index.ts` to accept the production frontend URL (e.g., `https://gammon-guru.onrender.com`) in the CORS whitelist.
58. **Logging for Prod:** Configure `src/utils/logger.ts` to use structured logging (JSON) in production for better integration with log aggregators (like Datadog or Render logs).
59. **Health Check Endpoint:** Enhance `/health` endpoint to perform a lightweight DB query (`SELECT 1`) so load balancers know if the service is truly ready.
60. **Final Code Audit:** Run a final pass over `package.json` in both root and subfolders. Ensure `engines` (Node version) matches your production runtime and all scripts (`start`, `build`) are correct.
