# 🧠 THE BRAIN - Documentation Centrale

> Plateforme IA Universelle avec 200+ APIs

**Dernière mise à jour** : 19 Décembre 2025

---

## 📁 Repositories GitHub

| Projet | Description | URL |
|--------|-------------|-----|
| **brain-ai** | Cerveau universel - Backend 200+ APIs | [GitHub](https://github.com/misterprompt/brain-ai) |
| **wikiask** | WikiAsk - Moteur de recherche IA | [GitHub](https://github.com/misterprompt/wikiask) |

---

## 🌐 Services Fly.io en Production

| Service | URL | Status | Description |
|---------|-----|--------|-------------|
| **universal-api-hub** | https://universal-api-hub.fly.dev | 🟢 Running | API Backend principal |
| **wikiask-searxng** | https://wikiask-searxng.fly.dev | 🟢 Running | Méta-moteur de recherche |
| **trading-bot-nasdaq** | https://trading-bot-nasdaq.fly.dev | 🟢 Running | Bot de trading NASDAQ (Paper) |
| **gurugammon-ai-bot** | https://gurugammon-ai-bot.fly.dev | 🟢 Running | Backgammon avec IA |
| **video-automation** | - | 🟡 Suspended | Génération vidéo (désactivé) |

### Base de données
| Service | Type | Status |
|---------|------|--------|
| **gurugammon-antigravity-backend-db** | PostgreSQL | 🟢 Running |

---

## 📦 Packages du Brain

### 🧠 Brain Core (`packages/brain-core/`)
Centralisation de 200+ APIs publiques avec cache intelligent.
- Météo, Finance, News, Sports, Entertainment
- Cache Redis avec TTL intelligent
- Rate limiting par domaine

### 📡 API Server (`packages/api-server/`)
Backend FastAPI pour exposer le Brain.
- RESTful endpoints
- SSE streaming pour chat
- Multi-language (12 langues)

### 🎬 Video Studio (`packages/video-studio/`)
Génération de vidéos IA style HeyGen.
- SadTalker pour avatars parlants
- MuseTalk pour lip-sync
- Edge-TTS pour voix

### 🎲 Gammon AI (`packages/gammon-ai/`)
Jeu de Backgammon avec IA autonome.
- Moteur de jeu complet
- IA vs IA training
- Dashboard temps réel

### 📈 Trading Bot (`packages/trading-bot/`)
Bot de trading NASDAQ avec Alpaca.

**⚠️ Mode actuel : PAPER TRADING (argent virtuel)**

| Protection | Valeur |
|------------|--------|
| Max par position | 2% du capital |
| Stop-loss | 2% automatique |
| Take-profit | 4% |
| Perte journalière max | 5% (arrêt auto) |
| Perte totale max | 10% (arrêt auto) |
| Positions max | 3 simultanées |

**Stratégies disponibles** :
- `momentum` : Suit la tendance (+5% sur 20 jours)
- `rsi` : Achète quand survendu (RSI < 30)

**Symboles tradés** : AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, AMD, NFLX, CRM

---

## 🔑 Configuration des Clés API

Fichier : `configs/.env.secrets` (NE PAS COMMITER)

### AI Providers
```env
GROQ_API_KEY=gsk_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
MISTRAL_API_KEY=xxx
GEMINI_API_KEY=xxx
COHERE_API_KEY=xxx
PERPLEXITY_API_KEY=pplx-xxx
OPENROUTER_API_KEY=sk-or-xxx
HUGGINGFACE_API_TOKEN=hf_xxx
```

### External APIs
```env
OPENWEATHER_API_KEY=xxx      # Météo
FINNHUB_API_KEY=xxx          # Finance
NEWSAPI_ORG_KEY=xxx          # News
TMDB_API_KEY=xxx             # Films
APISPORTS_KEY=xxx            # Sports
SPOONACULAR_API_KEY=xxx      # Food
NASA_API_KEY=xxx             # Science
```

### Trading (Alpaca)
```env
ALPACA_API_KEY=xxx
ALPACA_SECRET_KEY=xxx
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### YouTube Automation
```env
YOUTUBE_CLIENT_ID=xxx
YOUTUBE_CLIENT_SECRET=xxx
YOUTUBE_REFRESH_TOKEN=xxx
```

---

## 🚀 Déploiement

### Backend (Fly.io)
```bash
cd packages/api-server
flyctl deploy
```

### Frontend (Netlify)
```bash
cd frontend
npm run build
# Auto-deploy via GitHub
```

### Trading Bot
```bash
cd packages/trading-bot
flyctl deploy -a trading-bot-nasdaq
```

---

## 📊 Commandes Fly.io Utiles

```bash
# Lister toutes les apps
flyctl apps list

# Status d'une app
flyctl status -a <app-name>

# Logs en temps réel
flyctl logs -a <app-name>

# Secrets
flyctl secrets list -a <app-name>
flyctl secrets set KEY=value -a <app-name>

# Arrêter/Démarrer
flyctl scale count 0 -a <app-name>  # Stop
flyctl scale count 1 -a <app-name>  # Start

# SSH
flyctl ssh console -a <app-name>
```

---

## 📈 Endpoints API Principaux

```
GET  /api/health              # Health check
GET  /api/search?q=xxx        # Recherche rapide
POST /api/v6/chat             # Chat avec streaming
GET  /api/expert/search       # Recherche experte
GET  /api/finance/crypto      # Crypto prices
GET  /api/weather/{city}      # Météo
GET  /api/news/latest         # Actualités
```

---

## 🔒 Sécurité

- ✅ Secrets stockés dans Fly.io (chiffrés)
- ✅ `.env` dans `.gitignore`
- ✅ GitHub push protection activé
- ✅ Trading bot en mode Paper par défaut
- ✅ Rate limiting sur toutes les APIs

---

## 📞 Support

- **GitHub Issues** : https://github.com/misterprompt/brain-ai/issues
- **WikiAsk** : https://wikiask.io

---

*Built with ❤️ by MisterPrompt*
