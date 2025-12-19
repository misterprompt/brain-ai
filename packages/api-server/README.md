# 📡 API Server

> Backend FastAPI servant le cerveau via REST API

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/chat` | Chat IA |
| GET | `/api/search` | Recherche universelle |
| GET | `/api/finance/*` | Finance & Crypto |
| GET | `/api/weather/*` | Météo |
| GET | `/api/news/*` | Actualités |
| GET | `/api/medical/*` | Santé |
| GET | `/api/entertainment/*` | Films, Séries |
| GET | `/api/sports/*` | Sports |

## Installation

```bash
cd packages/api-server
pip install -r requirements.txt
```

## Lancer

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## Déploiement Fly.io

```bash
flyctl deploy
```

## Docker

```bash
docker build -t api-server .
docker run -p 8000:8000 api-server
```

## Configuration

Variables d'environnement requises:
- `GROQ_API_KEY`
- `ANTHROPIC_API_KEY` (optionnel)
- `REDIS_URL` (optionnel)
