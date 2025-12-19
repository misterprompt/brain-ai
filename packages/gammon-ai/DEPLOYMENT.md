# 🚀 GammonGuru Deployment Guide

## 📋 Aperçu

GammonGuru s'appuie sur un backend **Express.js + Prisma** (déployé sur Render) et un frontend **Vue 3** (Netlify). Les fonctionnalités en production couvrent la création et la gestion de parties `/api/games`, l'authentification, ainsi que les fondations de la couche IA.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services   │
│   (Netlify)     │◄──►│   (Railway)     │◄──►│  (Claude/OpenAI)│
│   Vue.js        │    │   Node.js       │    │   Replicate     │
│   WebSocket     │    │   Express       │    │   APIs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🐳 Environnement Docker de développement (local)

Pour un environnement de dev unifié en local, le dépôt fournit un fichier `docker-compose.dev.yml` qui lance :

- Un conteneur **Postgres 15** (`db`) exposé sur `localhost:5432`.
- Un conteneur **backend Express** (`app`) construit à partir du `Dockerfile` et exposé sur `http://localhost:3000`.

### 1. Prérequis

- Docker + Docker Compose installés
- Un fichier `.env` basé sur `.env.example` (les variables de base comme `DATABASE_URL` seront dérivées automatiquement des variables `PG*` de `docker-compose.dev.yml`).

### 2. Lancement de l'environnement

Depuis la racine du projet :

```bash
docker compose -f docker-compose.dev.yml up --build
```

Cela va :

- Démarrer Postgres avec un volume `pgdata` persistant.
- Construire l'image backend (npm ci + build TypeScript) et lancer l'API sur le port **3000**.

### 3. Brancher le frontend React (`guru-react`)

Dans un autre terminal :

```bash
cd guru-react
npm install  # première fois
set VITE_API_BASE_URL=http://localhost:3000  # Windows PowerShell (adapter selon ton shell)
npm run dev
```

Le frontend sera servi par Vite (par défaut sur `http://localhost:5173`) et enverra ses requêtes API vers le backend Dockerisé (`http://localhost:3000`).

### 4. Arrêter l'environnement Docker

```bash
docker compose -f docker-compose.dev.yml down
```

Pour repartir sur une base de données propre, tu peux supprimer le volume :

```bash
docker compose -f docker-compose.dev.yml down -v
```

## 🔧 Backend Deployment (Render)

### 1. Prerequisites
- Railway account
- GitHub repository connected

### 2. Configuration
Le backend est déployé sur Render (web service Node basé sur Express) avec Netlify Functions en complément pour certaines actions serverless.

### 3. Environment Variables
À définir dans Render :
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret
SUPABASE_SERVICE_KEY=...
SUPABASE_URL=https://....supabase.co
``` 
Ajouter les clés IA (Claude/OpenAI) si nécessaire.

### 4. Deployment Steps
1. Connecter le dépôt GitHub à Render.
2. Définir les variables d'environnement ci-dessus.
3. Activer le build automatique (`npm install && npm run build`).
4. Avant chaque déploiement, exécuter localement :
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
   (en production, utiliser `npx prisma migrate deploy`).
5. Déployer : Render se charge du démarrage via `npm start`.

### 5. Health Check
Health check: `https://gammon-guru-api.onrender.com/health`

## 🌐 Frontend Deployment (Netlify)

### 1. Prerequisites
- Netlify account
- Built frontend files

### 2. Build Commands
```bash
cd guru-react
npm install
npm run build
```

### 3. Configuration
Create a `netlify.toml` file in `guru-react/` with the following content:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### 4. Environment Variables
Set in Netlify UI:
```bash
VITE_API_BASE_URL=https://gurugammon.onrender.com
```

### 5. Deployment Steps
1. Connect the GitHub repository to Netlify.
2. Set the base directory to `guru-react`.
3. Netlify will automatically detect the `netlify.toml` and build settings.
4. Add the environment variable `VITE_API_BASE_URL`.
5. Deploy!

## 🔌 WebSocket Configuration

### Development
- Backend: `ws://localhost:3000`
- Frontend: `http://localhost:5173`

### Production
- Backend: `wss://gammon-guru-api.onrender.com`
- Frontend: `https://gammon-guru.netlify.app`

### WebSocket Endpoints
- Notifications: `wss://backend/ws/notifications?token=xxx`
- Game rooms: `wss://backend/ws/game/:id?token=xxx`
- Chat rooms: `wss://backend/ws/chat/:id?token=xxx`
- Tournament: `wss://backend/ws/tournament/:id?token=xxx`

## 🤖 AI Services Integration

Les intégrations IA (Claude/OpenAI, Replicate) sont en attente de branchement final ; conserver les variables masquées tant qu'elles ne sont pas utilisées.

## 🧪 Testing Production

### 1. Health Checks
```bash
# Backend health
curl https://gammon-guru-api.onrender.com/health

# Frontend accessibility
curl https://gammon-guru.netlify.app
```

### 2. WebSocket Testing
Open browser console and test:
```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://your-backend.railway.app/ws/notifications?token=your-token');
ws.onopen = () => console.log('WebSocket connected!');
ws.onmessage = (e) => console.log('Received:', e.data);
```

### 3. AI Services Testing
```javascript
// Test Claude API
fetch('https://your-backend.railway.app/api/claude/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Analyze this backgammon position',
    apiKey: 'your-claude-key'
  })
});
```

## 🔒 Security Considerations

### 1. API Keys
- Never expose API keys in frontend code
- Use environment variables
- Rotate keys regularly

### 2. JWT Authentication
- Strong secret keys
- Token expiration
- Secure token storage

### 3. CORS Configuration
- Whitelist allowed domains
- Secure headers
- HTTPS only in production

### 4. WebSocket Security
- Token-based authentication
- Rate limiting
- Connection monitoring

## 📊 Monitoring & Scaling

### Railway (Backend)
- Auto-scaling enabled
- Health checks every 30s
- Logs and metrics available
- Restart on failure

### Netlify (Frontend)
- CDN distribution
- Edge caching
- Build logs
- Form handling

### WebSocket Monitoring
```bash
# Check active connections
curl /api/ws/stats

# Monitor connection health
# View logs in Railway dashboard
```

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WSS URL (not WS)
   - Verify JWT token
   - Check CORS settings

2. **AI API Errors**
   - Verify API keys
   - Check rate limits
   - Review API permissions

3. **Build Failures**
   - Check Node.js version (18+)
   - Verify dependencies
   - Review build logs

4. **Environment Variables**
   - Ensure VITE_ prefix for frontend
   - Check Railway/Netlify dashboards
   - Restart services after changes

### Debug Commands
```bash
# Backend logs (Railway)
railway logs

# Frontend build test
cd guru-react && npm run build

# WebSocket test
node backend/src/tests/quick-websocket-test.js
```

## 🎯 Going Live

### Pre-launch Checklist
- [ ] All environment variables set
- [ ] HTTPS certificates active
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] AI services responding
- [ ] Frontend builds successfully
- [ ] Security headers configured
- [ ] Monitoring enabled

### Post-launch
- Monitor error rates
- Check WebSocket performance
- Review AI API usage
- Update documentation
- Plan scaling strategy

---

## 📞 Support

For deployment issues:
1. Check Railway and Netlify logs
2. Review this documentation
3. Test with the provided commands
4. Monitor WebSocket connections

**Happy Gaming! 🎲**
