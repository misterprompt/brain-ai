# 🧠 MisterPrompt - Projets IA

## 📁 Repositories GitHub

| Projet | Description | URL |
|--------|-------------|-----|
| **brain-ai** | Universal AI Brain - Multi-API Backend | https://github.com/misterprompt/brain-ai |
| **wikiask** | WikiAsk - Moteur de recherche IA | https://github.com/misterprompt/wikiask |

## 🌐 Services en Production

| Service | URL | Status |
|---------|-----|--------|
| **WikiAsk Frontend** | https://wikiask.io | 🟢 Online |
| **Universal API** | https://universal-api-hub.fly.dev | 🟢 Healthy |
| **SearXNG** | https://wikiask-searxng.fly.dev | 🟢 Online |
| **Trading Bot** | Fly.io (private) | 🟢 Running |

## 📦 Structure Brain-AI

```
brain-ai/
├── packages/
│   ├── brain-core/       # 200+ APIs intégrées
│   ├── api-server/       # Backend FastAPI
│   ├── video-studio/     # Génération vidéo IA
│   ├── gammon-ai/        # Backgammon avec IA
│   ├── site-builder/     # Générateur de sites
│   └── trading-bot/      # Bot trading NASDAQ
├── docs/
│   ├── api-reference.md
│   ├── getting-started.md
│   └── deployment.md
└── docker/
```

## 📦 Structure WikiAsk

```
wikiask/
├── backend/
│   ├── main.py           # FastAPI server
│   ├── services/         # 77+ APIs
│   │   ├── ai_router.py
│   │   ├── smart_search_v7.py
│   │   └── interfaces/   # Domaines spécialisés
│   └── Dockerfile
├── frontend/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   └── public/
├── searxng/              # Meta search engine
└── docs/
```

## 🔑 Variables d'Environnement

```env
# AI Providers
GROQ_API_KEY=gsk_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# APIs
NEWSAPI_KEY=xxx
TMDB_API_KEY=xxx
OPENWEATHER_API_KEY=xxx

# Services
REDIS_URL=redis://localhost:6379
SEARXNG_URL=http://localhost:8888
```

## 🚀 Déploiement

### Backend (Fly.io)
```bash
cd backend
flyctl deploy
```

### Frontend (Netlify)
```bash
cd frontend
npm run build
# Auto-deploy via GitHub
```

## 📡 API Endpoints Principaux

- `GET /api/health` - Health check
- `GET /api/search?q=xxx` - Recherche rapide
- `GET /api/v6/chat?message=xxx` - Chat avec streaming
- `GET /api/expert/search?q=xxx` - Recherche experte

## 📊 Statistiques

- **77+ APIs** intégrées
- **12 langues** supportées
- **9 domaines** d'expertise
- **5 providers IA** disponibles

---

*Dernière mise à jour: 19 décembre 2025*
