# 🚀 Deployment Guide

> Comment déployer The Brain en production

## Options de déploiement

| Option | Difficulté | Coût | Recommandé pour |
|--------|------------|------|-----------------|
| Fly.io | ⭐ Facile | ~$5-20/mois | Prototypage, MVP |
| Linux VPS | ⭐⭐ Moyen | ~$10-50/mois | Production |
| Kubernetes | ⭐⭐⭐ Avancé | Variable | Enterprise |

---

## 1. Déploiement Fly.io

### Installation de flyctl

```bash
# macOS
brew install flyctl

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Linux
curl -L https://fly.io/install.sh | sh
```

### Connexion

```bash
flyctl auth login
```

### Déploiement

```bash
cd packages/api-server
flyctl launch
flyctl deploy
```

### Configuration des secrets

```bash
flyctl secrets set GROQ_API_KEY=gsk_xxxxx
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## 2. Déploiement Linux VPS

### Prérequis

- Ubuntu 22.04 ou 24.04
- 2 GB RAM minimum
- Nom de domaine (optionnel)

### Installation automatique

```bash
curl -fsSL https://raw.githubusercontent.com/misterprompt/the-brain/main/scripts/install.sh | bash
```

### Installation manuelle

```bash
# 1. Mise à jour
sudo apt update && sudo apt upgrade -y

# 2. Installer les dépendances
sudo apt install -y python3.11 python3-pip docker.io nginx certbot

# 3. Cloner le projet
git clone https://github.com/misterprompt/the-brain.git
cd the-brain

# 4. Installer Python deps
python3 -m venv venv
source venv/bin/activate
pip install -r packages/api-server/requirements.txt

# 5. Configurer l'environnement
cp configs/.env.example .env
nano .env

# 6. Créer le service systemd
sudo nano /etc/systemd/system/brain-api.service
```

### Service systemd

```ini
[Unit]
Description=The Brain API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/the-brain/packages/api-server
Environment="PATH=/home/user/the-brain/venv/bin"
EnvironmentFile=/home/user/the-brain/.env
ExecStart=/home/user/the-brain/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable brain-api
sudo systemctl start brain-api
```

### Configuration Nginx

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        
        # SSE support
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

### SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## 3. Déploiement Docker

### Build

```bash
cd packages/api-server
docker build -t brain-api .
```

### Run

```bash
docker run -d \
  -p 8000:8000 \
  -e GROQ_API_KEY=gsk_xxxxx \
  --name brain-api \
  brain-api
```

### Docker Compose

```bash
cd docker
docker-compose up -d
```

---

## 4. Variables d'environnement

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Clé API Groq |
| `ANTHROPIC_API_KEY` | ❌ | Clé API Claude |
| `REDIS_URL` | ❌ | URL Redis pour cache |
| `SEARXNG_URL` | ❌ | URL SearXNG |

---

## 5. Monitoring

### Logs

```bash
# Fly.io
flyctl logs

# Systemd
journalctl -u brain-api -f

# Docker
docker logs -f brain-api
```

### Health check

```bash
curl https://your-api.com/api/health
```

---

## 6. Mise à jour

```bash
cd the-brain
git pull
pip install -r packages/api-server/requirements.txt

# Fly.io
flyctl deploy

# Systemd
sudo systemctl restart brain-api
```

---

## Troubleshooting

### Port déjà utilisé
```bash
sudo lsof -i :8000
sudo kill -9 <PID>
```

### Problèmes de mémoire
```bash
# Augmenter le swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Erreurs SSL
```bash
sudo certbot renew --dry-run
```
