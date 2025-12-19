# 🎲 Gammon AI

> Système autonome de Backgammon avec IA

## 🚀 Status

Le système tourne actuellement en mode autonome :

- **Process autonome** : PID 24284
- **API Monitoring** : http://localhost:8080

## 📁 Structure

```
gammon-ai/
├── bot/
│   ├── __init__.py
│   ├── engine.py              # Moteur de jeu complet
│   ├── strategy.py            # Stratégie IA
│   ├── autonomous_system.py   # Système autonome 5h
│   └── api.py                 # API de monitoring
├── frontend/                  # Interface React (à venir)
├── Dockerfile
├── fly.toml
└── requirements.txt
```

## 🧠 Composants

### 1. Engine (`engine.py`)
Implémentation complète des règles du Backgammon :
- Génération de tous les coups légaux
- Application des mouvements
- Détection fin de partie, gammon, backgammon
- Calcul du pip count

### 2. Strategy (`strategy.py`)
Stratégie d'évaluation :
- Évaluation de position multi-facteurs
- Niveaux : beginner, intermediate, expert
- Décisions de doubling cube

### 3. Autonomous System (`autonomous_system.py`)
Système qui tourne en autonome :
- IA vs IA pendant 5 heures
- Logging des statistiques
- Sauvegarde des résultats en JSON

### 4. API (`api.py`)
Dashboard de monitoring :
- Statistiques en temps réel
- Graphiques de progression
- Historique des parties

## 🎮 Utilisation

### Lancer le système autonome
```bash
python bot/autonomous_system.py
```

### Lancer l'API de monitoring
```bash
uvicorn bot.api:app --host 0.0.0.0 --port 8080
```

### Lancer les deux
```bash
python bot/autonomous_system.py &
uvicorn bot.api:app --port 8080
```

## 📊 Monitoring

Accède au dashboard : http://localhost:8080

### API Endpoints
- `GET /` - Dashboard HTML
- `GET /api/stats` - Statistiques JSON
- `GET /api/games` - Liste des parties
- `GET /api/health` - Health check

## 🚀 Déploiement Fly.io

```bash
cd packages/gammon-ai
flyctl launch
flyctl deploy
```

## 📈 Performances attendues

| Métrique | Valeur |
|----------|--------|
| Parties / heure | ~200-500 |
| Coups / seconde | ~50-100 |
| Mémoire | < 500 MB |
| CPU | < 50% |

## 🔧 Configuration

Voir `autonomous_system.py` pour modifier :
- `run_duration_hours` : Durée d'exécution
- `move_delay_seconds` : Délai entre coups
- `difficulty` : Niveau IA
- `log_every_n_games` : Fréquence logs
