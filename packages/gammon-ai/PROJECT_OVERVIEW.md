# 🎲 GammonGuru – Backend Overview

- ✅ **Backend complet** : GameController + GameService couvrent tout le cycle `/api/games`.
- ✅ **Prisma aligné** : schéma camelCase, client regénéré, migrations appliquées.
- ✅ **GameService finalisé** : création, statut, rejoindre, lancer dés, jouer, abandon, nulle, finalisation.
- ✅ **Routes branchées** : endpoints REST & IA (`/suggestions`, `/evaluate`).
- ✅ **IA & quotas** : `AIService` + `gnubgService` avec quotas atomiques, notifications 429 et resets.
- ✅ **Notifications WS** : canal `/ws/notifications` + service central (quota, victoire, invitations).
- ✅ **Tests ciblés** : quotas, matchmaking, notifications, tournois, règles backgammon (Jest).
- ✅ **Tournois (socle)** : Prisma + service + routes REST + WS + notifications + métriques.
- ✅ **Validation règles backgammon** : régression `GameService.makeMove` + `BackgammonEngine` (auto-pass, illégal, victoire).
- 🔄 **Reconnexion & time control** : groundwork Sprint 4 en cours.
- 🔜 **Dashboard utilisateur** : statistiques, historique, analytics temps réel.

## 🛣️ Roadmap condensée
| Statut | Objectif | Notes |
| --- | --- | --- |
| ✅ | Backend `/api/games` | Cycle complet + contrôleurs sécurisés. |
| ✅ | Alignement Prisma | Champs camelCase + sérialisation/JSON maîtrisée. |
| ✅ | Documentation | README, API, DEPLOYMENT actualisés. |
| ✅ | IA & quotas | Transactions Prisma, notifications 429/reset, tests concurrentiels. |
| ✅ | WebSocket notifications | Canal `/ws/notifications` + NotificationService. |
| ✅ | Tournois (socle) | Prisma + service + routes REST/WS + métriques + tests. |
| ✅ | Partie temps réel Sprint 3 | makeMove, auto-pass, notifications victoire, tests engine. |
| 🔄 | Reconnexion & time control | WS reconnect + clocks (Sprint 4). |
| 🔜 | Dashboard & analytics | Endpoints utilisateur + widgets front. |
| 🔜 | Tournois avancés | Brackets, classements, reporting temps réel. |

## ✅ Livrables récents
1. Schéma Prisma conforme à la base Supabase (migrate dev + generate).
2. GameService consolidé avec logique de fin de partie et scoring.
3. Contrôleurs `/api/games/:id/*` sécurisés et reconnectés aux services.
4. Documentation centrale remise à jour (README, API, DEPLOYMENT).

## 🔄 Travaux en cours
- Préparer la couche reconnexion WebSocket (game + matchmaking) et horloge de tour.
- Cartographier les événements cube (double/take/pass) pour Sprint 4.
- Finaliser la migration Prisma `add_tournament_matches` + `prisma generate`.

## 🔜 Prochaines étapes
- Finaliser la couverture Jest (routes tournois, WS).
- Implémenter reconnexion/time control (Sprint 4 Kickoff) + notifications WS victoire/défaite.
- Cartographier cube complet (Crawford/Beaver/Raccoon) et ajouter tests e2e.
- Déployer fonctionnalités tournoi avancées (brackets, standings, notifications additionnelles).
- Préparer le dashboard (RecentGames, UserStats, GameSummary) côté frontend.

## 🗓️ Jalons à venir
- **Semaine courante** : groundwork reconnexion/time control + migration Prisma tournois.
- **Semaine suivante** : tests routes/WS + documentation API tournois.
- **Décembre 2025** : cube complet, reconnection stable, analytics dashboard.

---
_Maj : 14 novembre 2025 – contact dev@gammon-guru.com_
