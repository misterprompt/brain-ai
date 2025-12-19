# Statut global du projet GuruGammon

## Ce qui est en place et fonctionnel

- Interface de jeu complète
- Système d'authentification
- Analyse GNUBG intégrée

## Prochaines étapes

- Intégration paiements
- Tableaux de classement
- Tournois automatisés

## Déploiement actuel (React + Backend)

- **Backend (Render)**
  - Service Node.js/Express déployé sur Render.
  - URL publique actuelle : `https://gurugammon.onrender.com`.
  - Expose les endpoints REST (`/api/auth/*`, `/api/games/*`, `/api/games/:id/suggestions`, `/api/games/:id/evaluate`, etc.) et le WebSocket temps réel sur `wss://gurugammon.onrender.com/ws/game`.

- **Frontend principal (React / guru-react)**
  - Code source dans `guru-react/` (Vite + React).
  - Build : `npm run build` génère `guru-react/dist/`.
  - Déployé comme site statique sur Netlify sous l'URL : `https://gurugammon-react.netlify.app`.

- **Lien Front Back**
  - Le client React utilise `API_BASE_URL` défini dans `guru-react/src/api/client.ts` :
    - `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://gurugammon.onrender.com'`.
  - En production, les requêtes partent vers `https://gurugammon.onrender.com` :
    - HTTP : `https://gurugammon.onrender.com/api/...` via `apiClient`.
    - WebSocket : `wss://gurugammon.onrender.com/ws/game?gameId=...` via `useGameSocket`.

- **Ancien frontend Vue**
  - Le dossier `frontend/` correspond à l'ancien front Vue (bgammon). Il est **déprécié** et n'est plus utilisé pour le déploiement.

- **Résumé rapide**
  - Frontend joueur : **React (guru-react)** → `https://gurugammon-react.netlify.app`.
  - Backend API + WS : **GuruGammon backend** → `https://gurugammon.onrender.com`.
  - Les deux sont reliés par `API_BASE_URL` et le hook `useGameSocket`.
