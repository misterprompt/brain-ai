# 🚀 Getting Started

> Guide de démarrage rapide pour The Brain

## Installation

### Prérequis

- Python 3.10+
- Node.js 18+ (optionnel, pour le frontend)
- Docker (optionnel)

### 1. Cloner le projet

```bash
git clone https://github.com/misterprompt/the-brain.git
cd the-brain
```

### 2. Installer les dépendances

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r packages/api-server/requirements.txt
```

### 3. Configurer l'environnement

```bash
cp configs/.env.example .env
```

Éditez `.env` et ajoutez vos clés API:
```
GROQ_API_KEY=gsk_xxxxx
```

### 4. Lancer l'API

```bash
cd packages/api-server
uvicorn src.main:app --reload
```

L'API est accessible sur http://localhost:8000

---

## Première requête

```bash
curl "http://localhost:8000/api/search?q=hello%20world"
```

---

## Avec Docker

```bash
cd docker
docker-compose up -d
```

---

## Prochaines étapes

- [Documentation API](./api-reference.md)
- [Guide de déploiement](./deployment.md)
- [Architecture](../README.md)
