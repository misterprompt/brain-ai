# 🎲 Gammon AI (GuruGammon V2)

> Système avancé de Backgammon avec IA, Dashboard temps réel et Frontend React.

## 🚀 Status

Déployé sur Fly.io : **https://gurugammon-ai-bot.fly.dev/**

## 🏗️ Architecture

Ceci est la version V2 complète (Node.js + React), remplaçant l'ancien prototype Python.

- **Backend** : Node.js, Express, TypeScript, Prisma (PostgreSQL)
- **Frontend** : React, Vite, TailwindCSS (dans `guru-react/`)
- **IA** : Intégration GNUBG et IA neuronale custom
- **Database** : PostgreSQL (via Supabase ou Fly Postgres)

## 📁 Structure

```
gammon-ai/
├── src/                # Backend Source Code
│   ├── routes/         # API Routes
│   ├── services/       # Game Logic & AI Services
│   └── websocket/      # Real-time game updates
├── guru-react/         # Frontend React Application
├── prisma/             # Database Schema
├── Dockerfile          # Multi-stage build (Front + Back)
└── fly.toml            # Deployment Configuration
```

## 🛠️ Développement

### Backend
```bash
npm install
npm run dev
```

### Frontend
```bash
cd guru-react
npm install
npm run dev
```

## 📦 Déploiement

Le déploiement est automatisé via Fly.io. Le Dockerfile construit à la fois le frontend et le backend.

```bash
flyctl deploy
```
