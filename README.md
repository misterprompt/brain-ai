# 🧠 The Brain

> **Universal AI Brain** - Un cerveau IA central qui alimente tous vos projets

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![Deploy on Fly.io](https://img.shields.io/badge/deploy-fly.io-purple.svg)](https://fly.io)

---

## 🎯 Qu'est-ce que The Brain ?

**The Brain** est un backend IA universel qui centralise :
- 🔌 **200+ APIs** gratuites (météo, finance, santé, news...)
- 🤖 **Multi-modèles IA** (Claude, GPT, Mistral, Groq)
- 🔍 **Moteur de recherche** intelligent
- 🎬 **Génération vidéo** (avatars parlants)
- 🎮 **Applications** connectées

```
                    ┌─────────────────────────────────┐
                    │         🧠 THE BRAIN            │
                    │     200+ APIs | Multi-IA        │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
   🔍 WikiAsk              🎬 Video Studio            🎮 Applications
   Recherche IA            Avatars Parlants           Games, Trading...
```

---

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`brain-core`](./packages/brain-core) | 🧠 Cerveau central avec 200+ APIs | ✅ Production |
| [`api-server`](./packages/api-server) | 📡 API FastAPI | ✅ Production |
| [`web-app`](./packages/web-app) | 🌐 Frontend WikiAsk | ✅ Production |
| [`video-studio`](./packages/video-studio) | 🎬 Génération vidéo IA | 🔧 Beta |
| [`gammon-ai`](./packages/gammon-ai) | 🎲 Jeu Backgammon IA | ✅ Production |
| [`site-builder`](./packages/site-builder) | 🏗️ Générateur de sites | 🔧 Beta |
| [`trading-bot`](./packages/trading-bot) | 💰 Bot trading | 🔧 Beta |

---

## 🚀 Quick Start

### Prérequis
- Python 3.10+
- Node.js 18+
- Docker (optionnel)

### Installation

```bash
# Cloner le repo
git clone https://github.com/misterprompt/the-brain.git
cd the-brain

# Installer les dépendances
pip install -r requirements.txt
npm install

# Configurer les variables d'environnement
cp configs/.env.example .env

# Lancer l'API
cd packages/api-server
python -m uvicorn src.main:app --reload
```

### Avec Docker

```bash
docker-compose up -d
```

---

## 🌐 Déploiements

| Service | URL | Provider |
|---------|-----|----------|
| API | https://universal-api-hub.fly.dev | Fly.io |
| WikiAsk | https://wikiask.io | Netlify |
| SearXNG | https://wikiask-searxng.fly.dev | Fly.io |

---

## 📡 API Endpoints

```
GET  /api/health              # Santé du serveur
POST /api/chat                # Chat IA
GET  /api/search              # Recherche universelle
GET  /api/finance/*           # Finance & Crypto
GET  /api/weather/*           # Météo
GET  /api/news/*              # Actualités
GET  /api/health/*            # Santé & Médical
GET  /api/entertainment/*     # Films, Séries, Jeux
GET  /api/sports/*            # Sports
...                           # 50+ endpoints
```

[📖 Documentation API complète](./docs/api-reference.md)

---

## 🖥️ Déploiement Local (Serveur Linux)

Optimisé pour **Intel Core Ultra** avec accélération OpenVINO.

```bash
# Installation automatique
curl -fsSL https://raw.githubusercontent.com/misterprompt/the-brain/main/scripts/install.sh | bash
```

[📖 Guide d'installation Linux](./docs/deployment.md)

---

## 🤝 Contributing

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
# Fork le repo
# Crée une branche: git checkout -b feature/amazing
# Commit: git commit -m 'Add amazing feature'
# Push: git push origin feature/amazing
# Ouvre une Pull Request
```

---

## 📄 License

MIT License - voir [LICENSE](./LICENSE)

---

## 🙏 Remerciements

- [OpenAI](https://openai.com) - GPT
- [Anthropic](https://anthropic.com) - Claude
- [Groq](https://groq.com) - Inférence rapide
- [SadTalker](https://github.com/OpenTalker/SadTalker) - Avatars parlants
- [MuseTalk](https://github.com/TMElyralab/MuseTalk) - Lip-sync

---

**Made with 🧠 by MisterPrompt**
