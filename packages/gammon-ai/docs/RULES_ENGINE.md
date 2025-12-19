# GammonGuru – Rules Engine

Ce document recense l’état d’implémentation des règles officielles du backgammon (références USBGF/WBGF) et leur prise en charge actuelle dans GammonGuru.

## 1. Match play vs Money game
| Règle | Description officielle | Support GammonGuru |
| --- | --- | --- |
| Match play (matchs à score) | Parties à longueur définie, score de match. | ⚠️ Partiel (mise à jour des points via `matchEngine.applyPointResult`). |
| Money game | Parties libres sans limite de score. | ✅ Supporté (mode par défaut). |
| Crawford rule | Première partie après l’approche de la victoire : interdiction de double. | ✅ Appliqué dans `cubeLogic.canDouble` (USBGF §2.10 / WBGF 2025 5.1). |
| Jacoby rule | Gammon/backgammon uniquement scorés si cube activé (money games). | ❌ À implémenter. |
| Beaver / Raccoon | Double immédiatement redoublé (optionnel) et à nouveau. | ✅ Optionnel via `cubeLogic.handleImmediateRedouble`. |

## 2. Cube de double
| Règle | Description officielle | Support GammonGuru |
| --- | --- | --- |
| Cube centré | Au début, cube neutre. | ✅ Champs Prisma `cubeLevel`/`cubeOwner` gérés dans `cubeLogic`. |
| Double | Joueur offre de doubler. | ✅ `applyCubeAction(..., 'double')` (USBGF §2.10). |
| Take / Pass | Adversaire accepte ou refuse. | ✅ `applyCubeAction(..., 'take' | 'pass')` (GNUBG Manual – Doubling Cube). |
| Redouble | Joueur ayant accepté doubleur peut redoubler plus tard. | ✅ `applyCubeAction(..., 'redouble')` tenant compte de la possession. |
| Cube ownership | Suivi propriétaire cube. | ✅ Propriété mise à jour et historisée (`CubeHistoryEntry`). |
| Limites (max) | Cube limité au plafond match (si match). | ⚠️ Détection dead cube via `cubeLogic.isDeadCube`; logique finale côté match engine à compléter. |

## 3. Résignations
| Type | Description | Support |
| --- | --- | --- |
| Single game | Résignation simple (1 point). | ✅ Calculé via `resolveResignation` (USBGF §2.9). |
| Gammon | Résignation gammon (2 points si aucun pion sorti). | ✅ Multiplié par cube et règles Jacoby. |
| Backgammon | Résignation backgammon (3 points si pion dans home board adverse). | ✅ Multiplié par cube et règles Jacoby. |

## 4. Scoreboard & Match Engine
| Élément | Description | Support |
| --- | --- | --- |
| Scoreboard match | Suivi score par joueur. | ⚠️ Mise à jour via `matchEngine.applyPointResult`. |
| Longueur match | Paramètre initial. | ⚠️ Stocké (`games.matchLength`) mais exploitation partielle. |
| Fin match | Détection victoire à n points. | ⚠️ Gestion lors de `applyPointResult` (flag FINISHED). |
| PR tracking | Performance rating par match. | ⚠️ PR retourné par IA, agrégation à connecter. |

## 5. Pip count & Horloge
| Élément | Description | Support |
| --- | --- | --- |
| Pip count | Calcul distance de course. | ❌ (prévu pipCounter). |
| Horloge | Temps par coup/match (Bronstein/Fischer). | ❌ |

## 6. Tournois & Leaderboard
| Élément | Description | Support |
| --- | --- | --- |
| Tournois KO / Round robin | Formats compétition. | ⚠️ Socle DB + endpoints (bracket à implémenter). |
| Scheduling | Avancement tours, match started/ended. | ❌ |
| Leaderboard global | Tri ELO. | ⚠️ ELO stocké (`users.eloRating`), endpoints à créer. |
| Leaderboard pays/saison | Filtres + pagination. | ❌ |

## 7. Export & Analyse post match
| Élément | Description | Support |
| --- | --- | --- |
| Export SGF | Format standard backgammon. | ❌ |
| Export JSON complet | Coups, cube, analyses, métadonnées. | ❌ |
| Post-match analyze | Rapport IA sur match complet. | ⚠️ Tables prêtes (`game_analyses`), agrégation à finaliser. |

## 8. Actions planifiées (Sprints)

### Sprint A – Rules & Cube
- Migrations Prisma (matches, cube fields).
- Services: `matchEngine`, `cubeLogic`, `resignationService`.
- API: `/cube/{double|take|pass|redouble}`, `/resign` typed.
- Tests: cube transitions, crawford/jacoby, fin de match.

### Sprint B – Matchmaking & Leaderboard
- API matchmaking (join/leave/status) + WS notifications.
- Leaderboard endpoints (global/pays/saisons).
- Dashboard utilisateur (`/api/user/dashboard`).
- Pip counter & PR charts.

### Sprint C – Tournois avancés & Export
- `tournamentEngine`: bracket KO/round robin.
- WS tournoi: `matchStarted`, `tournamentUpdated`, `tournamentEnded`.
- Export SGF/JSON complet (via `exportService`).
- Horloge (clockService) et résignation typée UI.

### Sprint D – Coaching IA & Analytics
- Endpoint `POST /api/analysis/:id/coach` (Claude/GPT).
- Post-match aggregator (PR, erreurs majeures, heuristiques).
- UI coaching + rapports.

## 9. Références officielles
- USBGF Tournament Rules & Procedures – §2.10 Doubling Cube
- World Backgammon Federation Tournament Rules 2025 – Section 5 (Doubling Cube)
- GNU Backgammon Manual – Chapter "Rules of the game" > "The Doubling Cube"

## 10. Tests associés
- `tests/rules/cubeLogic.test.ts` : double → take → redouble, interdiction Crawford, possession cube, Beaver/Raccoon, dead cube.
- `tests/rules/resignationService.test.ts` (en cours) : single/gammon/backgammon, Jacoby (cube non tourné), intégration matchEngine.

_Assurez-vous de mettre à jour ce document au fur et à mesure de l’implémentation de nouvelles règles._
