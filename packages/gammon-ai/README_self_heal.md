# GammonGuru Backend – Self-Healing & Auto-Recovery

## 1. Objectif

Ce document décrit le système d’auto-réparation du backend GammonGuru côté Docker et Render :
- Healthchecks cohérents (Dockerfile, docker-compose, Render).
- Watchdog externe qui surveille l’état de l’API et déclenche des redémarrages avec backoff.
- Scripts de redeploy local et checklist pour la validation.

## 2. Healthchecks

### 2.1 Dockerfile

- `HEALTHCHECK` HTTP interne sur `http://localhost:3000/health/internal` (non filtré par les middlewares avancés).
- Intervalle : 30s, timeout : 5s, retries : 3.
- Si `/health/internal` renvoie une erreur ou ne répond pas, le conteneur passe en `unhealthy`.

### 2.2 docker-compose.dev.yml

- Service `db` :
  - Image `postgres:15`.
  - Healthcheck via `pg_isready`.
- Service `app` :
  - Healthcheck via `curl http://localhost:3000/health/internal` (depuis le conteneur).
  - `restart: always` pour garantir la relance automatique si le conteneur devient `unhealthy`.

### 2.3 Endpoint /health de l’application

- Répond `200` quand :
  - La DB est joignable (requêtes `prisma.users.count()` et `prisma.games.count()`).
- Répond `503` quand :
  - La DB est indisponible ou la requête échoue.
- Retourne aussi des métriques (uptime, mémoire, WebSocket, environnement).

### 2.4 Endpoint interne /health/internal

- Utilisé pour les healthchecks Docker et les scripts internes (watchdog, redeploy).
- Vérifie la santé de l’application et de la DB via une requête SQL minimale.
- N’est pas soumis aux mêmes filtres de sécurité/rate limiting que l’endpoint public `/health`.

## 3. Watchdog Docker

### 3.1 Script `scripts/watchdog.sh`

- Surveille un service Docker (par défaut `app`) toutes les 30 secondes.
- Vérifie :
  - L’état Docker `healthy/unhealthy` (si un healthcheck est défini).
  - L’accessibilité HTTP de `/health/internal` via `docker compose exec` à l’intérieur du conteneur.
- Si l’un des deux est KO :
  - Logue l’événement dans `docker-health.txt`.
  - Relance le service via `docker compose restart` avec un backoff exponentiel (5s → 10s → … → max 60s).

### 3.2 Lancement

```bash
bash scripts/watchdog.sh         # Surveille le service 'app' via /health/internal dans le conteneur
# ou
SERVICE_NAME=app HEALTH_URL=http://localhost:3000/health/internal bash scripts/watchdog.sh
```

## 4. Script de redeploy local

### 4.1 Script `scripts/redeploy.sh`

- Build et démarre les services Docker locaux :
  - `docker compose -f docker-compose.dev.yml build`
  - `docker compose -f docker-compose.dev.yml up -d`
  - `docker compose -f docker-compose.dev.yml ps`
  - `docker compose -f docker-compose.dev.yml exec -T app curl -i http://localhost:3000/health/internal`

### 4.2 Utilisation

```bash
bash scripts/redeploy.sh
```

## 5. Render – Parité avec Docker

### 5.1 Configuration Render (render.yaml)

- Service `gurugammon` en `env: docker`.
- Utilise `./Dockerfile` comme source unique de build.
- `healthCheckPath: /health`.
- `autoDeploy: true`.

### 5.2 Variables d’environnement à définir dans Render

> Ne pas committer de secrets dans le repo. Les valeurs ci-dessous doivent être configurées dans le dashboard Render.

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://...`
- `ACCESS_TOKEN_SECRET=...`
- `REFRESH_TOKEN_SECRET=...`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_KEY=...`
- Autres clés applicatives/IA selon besoin.

## 6. Validation rapide

### 6.1 Docker local

1. Vérifier que Docker Desktop est lancé et que `docker info` fonctionne.
2. Lancer :

```bash
bash scripts/redeploy.sh
```

3. Vérifier les logs :

```bash
docker compose -f docker-compose.dev.yml logs app db --tail=200
```

4. Vérifier /health :

```bash
curl -s http://localhost:3000/health | jq . || curl -i http://localhost:3000/health
```

### 6.2 Watchdog

1. Lancer le watchdog dans un terminal séparé :

```bash
bash scripts/watchdog.sh
```

2. Observer `docker-health.txt` pour voir les redémarrages automatiques.

## 7. Rollback

Tous les changements d’auto-réparation sont confinés à :
- `Dockerfile`
- `docker-compose.dev.yml`
- `render.yaml`
- `src/server.ts` (contrat de config + log `Server listening on :PORT`)
- `scripts/watchdog.sh`
- `scripts/redeploy.sh`
- `README_self_heal.md`

Pour revenir en arrière :

```bash
git diff                     # Voir les changements
# puis
git restore Dockerfile docker-compose.dev.yml render.yaml src/server.ts \
  scripts/watchdog.sh scripts/redeploy.sh README_self_heal.md
```

Ou simplement :

```bash
git restore .
```

Aucune donnée de base de données, volume ou secret n’est modifiée par ce système d’auto-réparation.
