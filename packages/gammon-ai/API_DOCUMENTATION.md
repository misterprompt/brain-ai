---
title: GammonGuru API
base_url: https://gammon-guru-api.onrender.com
version: 2025-11
---

# 🎲 GammonGuru REST API

Toutes les routes nécessitent un jeton JWT via `Authorization: Bearer <token>` sauf mention contraire.

## Types de réponse

```json
// Succès
{
  "success": true,
  "data": { /* payload */ }
}

// Erreur
{
  "success": false,
  "error": "message explicite"
}

// TournamentOverview
{
  "tournament": {/* TournamentSummary */},
  "role": "PLAYER",
  "standings": [/* TournamentStanding[] */],
  "bracket": [/* BracketRound[] */],
  "meta": {
    "currentRound": 1,
    "nextRound": 2,
    "totalRounds": 3
  }
}
```

## Structures utilisées

```json
// GameState (extrait)
{
  "id": "uuid",
  "status": "playing",
  "gameType": "match",
  "stake": 0,
  "whiteScore": 0,
  "blackScore": 0,
  "currentPlayer": "white",
  "board": {
    "positions": [2,0,0,0,0,-5, ...],
    "whiteBar": 0,
    "blackBar": 0,
    "whiteOff": 0,
    "blackOff": 0
  },
  "dice": {
    "dice": [3,1],
    "remaining": [3,1],
    "doubles": false,
    "used": []
  },
  "availableMoves": [],
  "createdAt": "2025-11-11T15:00:00.000Z",
  "startedAt": null,
  "finishedAt": null,
  "player1": {
    "id": "uuid",
    "name": "Alice"
  },
  "player2": null,
  "winner": null,
  "drawOfferBy": null
}

// SuggestedMove
{
  "move": {
    "from": 0,
    "to": 6,
    "player": "white",
    "diceUsed": 6
  },
  "explanation": "Stubbed AI suggests advancing the highest pip.",
  "equity": 0.4
}

// EvaluationResult
{
  "equity": 0.5,
  "pr": 8.3,
  "winrate": 0.63,
  "explanation": "Based on pip balance and bear-off race."
}
```

---

## 🎮 Routes Jeu `/api/games`

### POST `/api/games`
Crée une nouvelle partie. Par défaut, l’utilisateur devient joueur blanc.

**Body**

```json
{
  "game_mode": "AI_VS_PLAYER", // optionnel, valeurs: AI_VS_PLAYER | PLAYER_VS_PLAYER | TOURNAMENT
  "stake": 0,                   // optionnel, entier >= 0
  "opponentId": "uuid"         // optionnel, pour assigner un adversaire direct
}
```

**Réponse 201**

```json
{
  "success": true,
  "data": {
    "game": {/* GameState */}
  }
}
```

**Erreurs**
- 400 : game_mode invalide ou stake négatif
- 401 : utilisateur non authentifié
- 500 : création impossible

### GET `/api/games/:id/status`
Retourne l’état courant d’une partie.

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "game": {/* GameState */}
  }
}
```

**Erreurs**
- 401 : non authentifié
- 403 : l’utilisateur ne participe pas à la partie
- 404 : partie inexistante

### POST `/api/games/:id/join`
Permet à un utilisateur de rejoindre une partie en attente.

**Réponse 200** : payload identique à `GET /status`.

**Erreurs**
- 400 : partie déjà complète ou utilisateur = créateur
- 403 : accès interdit
- 404 : partie introuvable

### POST `/api/games/:id/roll`
Lance les dés pour le joueur dont c’est le tour.

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "game": {/* GameState mis à jour */}
  }
}
```

**Erreurs**
- 400 : dés déjà lancés ou partie inactives
- 403 : mauvais joueur
- 404 : partie introuvable

### POST `/api/games/:id/move`
Enregistre un mouvement valide.

**Body**

```json
{
  "from": 12,
  "to": 16,
  "diceUsed": 4
}
```

**Réponse 200** : GameState mis à jour.

**Erreurs**
- 400 : mouvement invalide ou dés non lancés
- 403 : mauvais joueur
- 404 : partie introuvable

### POST `/api/games/:id/resign`
Le joueur courant abandonne. La partie est finalisée et le score mis à jour.

**Réponse 200** : GameState final.

**Erreurs**
- 400 : partie déjà terminée
- 403 : l’utilisateur n’est pas joueur

### POST `/api/games/:id/draw`
Propose (ou confirme) une nulle. Actuellement la logique valide immédiatement la nulle.

**Réponse 200** : GameState avec `status = "completed"`, `winner = null`.

**Erreurs**
- 400 : partie non active
- 403 : l’utilisateur n’est pas joueur

---

## 🧠 Routes IA `/api/games/:id`

Les routes ci-dessous seront activées une fois la couche IA branchée au contrôleur.

### POST `/api/games/:id/suggestions`
Retourne un coup recommandé par l’IA GNUBG.

**Body (optionnel)**

```json
{
  "maxAlternatives": 3
}
```

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "suggestion": {
      "move": {/* SuggestedMove */},
      "explanation": "string",
      "equity": 0.42
    },
    "alternatives": [
      {/* SuggestedMove */}
    ]
  }
}
```

**Erreurs**
- 400 : position invalide / pas de suggestions
- 403 : l’utilisateur n’est pas joueur
- 404 : partie introuvable
- 503 : moteur IA indisponible

### POST `/api/games/:id/evaluate`
Analyse la position courante et fournit une évaluation détaillée.

**Réponse 200**

```json
{
  "success": true,
  "data": {
    "evaluation": {
      "equity": 0.5,
      "pr": 8.3,
      "winrate": 0.63,
      "explanation": "string"
    }
  }
}
```

**Erreurs**
- 400 : position invalide
- 403 : l’utilisateur n’est pas joueur
- 404 : partie introuvable
- 503 : moteur IA indisponible

---

## Codes d’erreur standards

| Code | Signification |
| --- | --- |
| 400 | Requête invalide (validation) |
| 401 | Authentification requise |
| 403 | Accès interdit |
| 404 | Ressource introuvable |
| 409 | Conflit (ex. partie déjà complète) |
| 422 | Mouvement non autorisé |
| 500 | Erreur serveur |

---

## 📈 Leaderboards & ELO

- `GET /api/leaderboards/global?sort=elo|winrate|games&page=&perPage=` retourne `data[] + meta` (classement global).
- `GET /api/leaderboards/country/:countryCode` filtre par code ISO 3166-1 alpha-2 normalisé.
- `GET /api/leaderboards/season/:seasonId` combine `user_season_stats` et `season_leaderboard`.
- Chaque entrée contient (quand disponibles) `rankGlobal`, `rankCountry`, `gamesWon`.
- WebSocket temps réel : `wss://…/ws/leaderboard/{channel}` diffuse `LEADERBOARD_UPDATE`.
  - Channels supportés :
    - `global:{sort}` (`elo|winrate|games`)
    - `country:{ISO2}:{sort}`
    - `season:{seasonId}:{sort}`
  - Exemple :

```json
{
  "type": "LEADERBOARD_UPDATE",
  "payload": {
    "scope": {
      "type": "global",
      "sort": "elo"
    },
    "entries": [
      {
        "id": "user-1",
        "username": "Alice",
        "country": "FR",
        "elo": 1650,
        "winrate": 0.62,
        "gamesPlayed": 40,
        "gamesWon": 25,
        "rankGlobal": 1,
        "rankCountry": null
      }
    ],
    "total": 1,
    "timestamp": "2025-11-20T21:45:00.000Z"
  },
  "timestamp": "2025-11-20T21:45:00.000Z",
  "senderId": null
}
```

---

## 🏆 Tournois `/api/tournaments`

Toutes les routes sont protégées via JWT.

### POST `/api/tournaments`
Crée un tournoi. Réservé aux administrateurs (ID listés dans `TOURNAMENT_ADMIN_IDS`).

**Body**

```json
{
  "name": "Winter Cup",
  "description": "optionnel",
  "entryFee": 50,
  "prizePool": 500,
  "maxPlayers": 32,
  "startTime": "2025-11-20T18:00:00.000Z"
}
```

**Réponse 201** — `TournamentSummary`

```json
{
  "success": true,
  "data": {
    "id": "t-1",
    "name": "Winter Cup",
    "description": null,
    "entryFee": 0,
    "prizePool": 0,
    "maxPlayers": 32,
    "status": "REGISTRATION",
    "startTime": null,
    "endTime": null,
    "createdBy": "admin-user",
    "participants": 0,
    "matches": 0
  }
}
```

### POST `/api/tournaments/:id/join`
Inscrit l’utilisateur courant. Retourne `201` + participant créé. Broadcast `playerJoined`.

### POST `/api/tournaments/:id/leave`
Retire l’utilisateur courant (uniquement en phase `REGISTRATION`). Broadcast `tournamentUpdated` (`participantLeft`).

### GET `/api/tournaments/:id`
Retourne le `TournamentSummary`.

### GET `/api/tournaments/:id/participants`
Liste des participants (`tournament_participants`).

### GET `/api/tournaments/:id/leaderboard`
Participants triés par `current_position` puis `registered_at`.

### GET `/api/tournaments/:id/standings`
Classement calculé (victoires/défaites, drapeau `eliminated`).

### GET `/api/tournaments/:id/bracket`
Liste des rounds + matches (`BracketRound[]`).

### GET `/api/tournaments/:id/overview`
Vue consolidée (résumé tournoi, rôle utilisateur, standings, bracket, meta).

### POST `/api/tournaments/:id/start`
Transition en `IN_PROGRESS`, génère les matches du round 1, broadcast `tournamentUpdated` (`started`). Autorisé pour `createdBy` ou admin.

### POST `/api/tournaments/:id/matches/:matchId/report`
Déclare le vainqueur d’un match. Payload :

```json
{
  "winnerParticipantId": "tp-1",
  "gameId": "g-1"
}
```

Broadcast `matchFinished`, potentiellement `tournamentEnded`, sinon `matchCreated` pour le round suivant.

### Objets utilisés

```json
// TournamentSummary
{
  "id": "t-1",
  "name": "Winter Cup",
  "description": "string|null",
  "entryFee": 0,
  "prizePool": 0,
  "maxPlayers": 32,
  "status": "REGISTRATION",
  "startTime": "2025-11-20T18:00:00.000Z",
  "endTime": null,
  "createdBy": "admin-user",
  "participants": 16,
  "matches": 8
}

// TournamentParticipant (prisma)
{
  "id": "tp-1",
  "tournament_id": "t-1",
  "user_id": "player-1",
  "registered_at": "2025-11-18T12:00:00.000Z",
  "current_position": 1,
  "eliminated_at": null
}

// TournamentMatch
{
  "id": "match-1",
  "tournament_id": "t-1",
  "round": 1,
  "match_number": 1,
  "white_participant_id": "tp-1",
  "black_participant_id": "tp-2",
  "winner_participant_id": null,
  "status": "SCHEDULED",
  "scheduled_at": "2025-11-20T19:00:00.000Z",
  "started_at": null,
  "finished_at": null,
  "game_id": null
}
```

---

## 📡 WebSocket Tournoi `/ws/tournament`

Connexion : `wss://…/ws/tournament?tournamentId={id}`
Auth : JWT (`Authorization` ou `Sec-WebSocket-Protocol`).

### Événements émis

```json
// playerJoined
{
  "type": "playerJoined",
  "payload": {
    "tournamentId": "t-1",
    "userId": "player-1"
  },
  "timestamp": "2025-11-18T12:00:00.000Z"
}

// matchCreated
{
  "type": "matchCreated",
  "payload": {
    "tournamentId": "t-1",
    "matchId": "match-2",
    "round": 2,
    "matchNumber": 1,
    "whiteParticipantId": "tp-1",
    "blackParticipantId": "tp-3"
  },
  "timestamp": "2025-11-20T20:00:00.000Z"
}

// matchFinished
{
  "type": "matchFinished",
  "payload": {
    "tournamentId": "t-1",
    "matchId": "match-1",
    "round": 1,
    "winnerParticipantId": "tp-1"
  },
  "timestamp": "2025-11-20T19:45:00.000Z"
}

// tournamentUpdated
{
  "type": "tournamentUpdated",
  "payload": {
    "tournamentId": "t-1",
    "type": "started",
    "round": 1
  },
  "timestamp": "2025-11-20T19:00:00.000Z"
}

// tournamentEnded
{
  "type": "tournamentEnded",
  "payload": {
    "tournamentId": "t-1",
    "winnerParticipantId": "tp-1"
  },
  "timestamp": "2025-11-20T22:00:00.000Z"
}
```

### Notifications temps réel
Les participants reçoivent des notifications via `/ws/notifications` (`tournament_update`) :

```json
{
  "kind": "tournament_update",
  "title": "Mise à jour tournoi",
  "message": "Round 2 disponible",
  "data": {
    "tournamentId": "t-1",
    "round": 2,
    "message": "Round 2 disponible",
    "payload": {
      "matchId": "match-3"
    }
  },
  "timestamp": "2025-11-20T20:05:00.000Z"
}
```

---

## Exemples curl

```bash
# Créer une partie
curl -X POST "$BASE/api/games" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"game_mode":"PLAYER_VS_PLAYER","stake":0}'

# Obtenir l'état d'une partie
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/games/$GAME_ID/status"

# Jouer un mouvement
curl -X POST "$BASE/api/games/$GAME_ID/move" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from":12,"to":16,"diceUsed":4}'

# Demander une suggestion IA (stub)
curl -X POST "$BASE/api/games/$GAME_ID/suggestions" \
  -H "Authorization: Bearer $TOKEN"
```

---

Dernière mise à jour : 11 novembre 2025
