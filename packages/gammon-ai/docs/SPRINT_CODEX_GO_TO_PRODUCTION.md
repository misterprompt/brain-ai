# Sprint Codex — Go-To-Production

_Last updated: 15 November 2025_

## 0) Contexte (point de départ)
- Reconnexion WS durable livrée (handshake, replay, ACK pruning, logs).
- Redis read-through intégré à GameSessionRegistry (sessions + replays, TTL, fallback DB, pruning cache post-ACK, métriques Prometheus).
- Docs et playbooks publiés (reconnect, Redis, observabilité, runbook staging).
- Flag activé par défaut en staging (`NODE_ENV=staging`, override `SESSION_REDIS_READTHROUGH_ENABLED`).

## 1) Objectifs & KPIs (SLO)
- Latence reconnect P95 ≤ 300 ms.
- Hit rate cache (5m) ≥ 0.8 en pic; erreurs Redis ≈ 0/s.
- Backlog replay post-ACK ≤ 5 évènements; purge ≤ 1s.
- Zéro perte d’événement (séquence monotone, replays complets).

## 2) Périmètre
- Inclus: Validation staging, rollout canary → full, UAT, parité time-control à la reprise, docs/alertes/rollback.
- Exclu (optionnel si bande passante): extension reconnection WS matchmaking/notifications.

## 3) Jalons & Échéances (10 j. ouvrés)
- M1 (J+2): Validation staging signée (évidence + métriques).
- M2 (J+3): Checklist prod + plan canary finalisés (SLO/alertes/rollback).
- M3 (J+5): Parité time-control (enforcement + tests) prête.
- M4 (J+6): Canary prod (10–20%) exécuté + gate review.
- M5 (J+7): Full rollout progressif si gates OK.
- M6 (J+8–9): UAT exécuté + triage/hotfix P1/P2.
- M7 (J+10): Rapport de déploiement + rétrospective courte.

## 4) Plan de travail (tâches actionnables)
- [ ] Valider cache en staging via runbook (reconnexions, replays, ACK prune)
  - Rôle: QA + Backend + SRE
  - ETA: J+2
  - Dépendances: Redis/Grafana/Prometheus staging; flag ON
  - Livrables: captures dashboard, liens métriques, logs, note de validation
- [ ] Sign-off staging (seuils observés, anomalies, décision go/no-go)
  - Rôle: Tech Lead + SRE
  - ETA: J+2 (EOD)
  - Dépendances: validation staging
- [ ] Checklist prod + plan canary (SLO, alertes, gates, rollback)
  - Rôle: SRE + PM
  - ETA: J+3
  - Dépendances: sign-off staging
- [ ] Parité time-control à la reprise (enforcement + tests WS/E2E)
  - Rôle: Backend
  - ETA: J+5
  - Dépendances: TurnTimerService, cas QA
- [ ] Exécuter canary (10–20%), monitorer KPIs (hit-rate, erreurs, latence, backlog)
  - Rôle: SRE
  - ETA: J+6
  - Dépendances: fenêtre de déploiement, plan canary
- [ ] Gate review canary (go full/rollback)
  - Rôle: Tech Lead + SRE
  - ETA: J+6 (EOD)
  - Dépendances: canary
- [ ] Full rollout progressif (50% → 100%) si gates OK
  - Rôle: SRE
  - ETA: J+7
  - Dépendances: gate canary
- [ ] UAT (script scénarios, panel testeurs, collecte feedback)
  - Rôle: PM + QA
  - ETA: J+8
  - Dépendances: rollout actif
- [ ] Triage UAT + hotfix P1/P2
  - Rôle: Backend + PM
  - ETA: J+9
  - Dépendances: résultats UAT
- [ ] Rapport de déploiement + rétro (KPIs, incidents, décisions)
  - Rôle: PM + SRE + Backend
  - ETA: J+10
  - Dépendances: UAT stable
- [ ] (Option) Étendre reconnexion à WS matchmaking/notifications
  - Rôle: Backend
  - ETA: J+10
  - Dépendances: socle reconnect

## 4bis) Validation staging — Checklist d'exécution

### Pré-requis environnement (cocher avant démarrage)
- [ ] `NODE_ENV=staging` (ou `SESSION_REDIS_READTHROUGH_ENABLED=true` explicitement)
- [ ] `SESSION_REDIS_URL` **ou** (`SESSION_REDIS_HOST` + `SESSION_REDIS_PORT`) configurés
- [ ] `SESSION_REDIS_NAMESPACE` défini (défaut: `gsr`)
- [ ] Accès Grafana/Prometheus confirmé + dashboards importés (cache hit-rate, misses/errors, prune)
- [ ] Journalisation accessible (`context:"GameSessionRegistryRedis"`)

### Exécution runbook (docs/OBSERVABILITY_GAME_SESSION_CACHE.md §5)
1. Lancer deux clients WS (QA harness ou `npm run test:websocket` avec flag actif).
2. Script:
   - Player A rejoint jeu, Player B rejoint (token session) → session snapshot.
   - Trois coups minimum pour alimenter `replay_append`.
   - Déconnexion Player B → reconnexion via resume token → `replay_fetch`.
   - Envoi `GAME_ACK` → vérifier prune (Redis + backlog gauge).
3. Répéter scénario 2× pour valider stabilité.

### Evidence & métriques (à compléter)
| Item | Lien / capture | Observations |
| --- | --- | --- |
| Dashboard hit-rate |  |  |
| Dashboard misses/errors |  |  |
| Backlog gauge (post-ACK) |  |  |
| Logs `GameSessionRegistryRedis` |  |  |
| Notes QA |  |  |

### Décision staging
- [ ] GO / [ ] NO-GO — commentaires: _______________________________

## 5) Acceptation (critères de sortie)
- Staging: hit-rate cache ≥ 0.8, erreurs Redis ≈ 0, backlog post-ACK ≤ 5, logs propres.
- Canary: erreurs < seuil, latence stable, pas de régression UX.
- UAT: 100% scénarios critiques verts (reconnect, replays, ACK, timer, invalid payloads).
- Docs/runbooks/alertes à jour; plan de rollback testé.

## 6) Rollout & Rollback (opérations)

### 6.1 Checklist pré-déploiement
- [ ] Validation staging signée (section 4bis).
- [ ] SLO/SLA et alertes documentés (`docs/OBSERVABILITY_GAME_SESSION_CACHE.md`).
- [ ] Fenêtre de déploiement réservée + stakeholders prévenus.
- [ ] Redis monitoring en place (Grafana, alertes Pager/Slack).
- [ ] Commandes de désactivation rapides prêtes (`SESSION_REDIS_READTHROUGH_ENABLED=false`).

### 6.2 Rollout canary (10–20 % trafic)
- [ ] Activer flag pour segment (via config/feature flag).
- [ ] Durée d’observation minimale: 45 min.
- [ ] Monitoring temps-réel: tableau de bord « Game Session Cache » + logs.

| Gate | Seuil | Source |
| --- | --- | --- |
| `game_session_cache_errors_total` (rate 5m) | < 0.02 ops/s | Grafana panel « Cache Errors » |
| Hit rate cache | ≥ 0.75 (sliding 5m) | Grafana panel « Cache Hit Rate » |
| Latence reconnect P95 | ≤ 300 ms | WS metrics / APM |
| Backlog replay post-ACK | ≤ 5 événements après 5s | WS backlog gauge |
| Logs Redis warnings | 0 warn/error nouveaux | Journaux `GameSessionRegistryRedis` |

- [ ] Gate review documentée (GO / NO-GO + signatures).

### 6.3 Rollout complet (progressif)
- [ ] Passage 50 % → 100 % si canary GO.
- [ ] Observation continue 2 h (mêmes métriques + erreurs client support).
- [ ] Informer support/produit de la bascule complète.

### 6.4 Rollback (si gate KO)
1. Désactiver flag (`SESSION_REDIS_READTHROUGH_ENABLED=false`) et redeployer.
2. Vérifier revert (métriques hits/misses reviennent à zéro, logs confirment fallback DB).
3. Si nécessaire, `FLUSHDB` ciblé ou suppression `gsr:*` de test (après accord SRE).
4. Documenter incident (horodatages, métriques, cause, follow-up).

### 6.5 Communication
- Avant canary: annonce Slack #releases + programme (heure, critères, rollback).
- Pendant: updates intermédiaires (T0, T+30 min, gate review).
- Après: confirmation full rollout + consignes support.
- En cas de rollback: message incident + prochaine fenêtre envisagée.

## 7) UAT — Script de test
- Reconnexion avec token (perte réseau, reprise multiple).
- Delivery replays ordonnés, ACK et purge visibles (UI/metrics).
- Timer: snapshot/restore correct, pas de dérive.
- Cas négatifs: token invalide, payload malformé, ACK out-of-order (gracieusement ignoré).
- Collecte: temps perçu, erreurs UI, captures, logs.

## 8) Observabilité & Evidence
- Dashboards: Cache Hit Rate, Misses/Errors par opération, Hydrate vs Prune, Backlog replay.
- Alertes: hit-rate bas, erreurs replay, spike miss session.
- Evidence: URLs dashboards, captures, horodatages, journaux filtrés `GameSessionRegistryRedis`.

## 9) Risques & Mitigations
- Redis indisponible → fallback DB + flag off + rollback.
- Backlog élevé → alerte + tuning prune; vérifier ACK min.
- Timer incohérent → enforcement par snapshot; tests E2E; hotfix rapide.

## 10) Communication
- Standup quotidien 15 min (gates/risques).
- Annonce canary/full dans canal release.
- Rapport final + rétro partagés à l’équipe et stakeholders.

## 11) Références
- Reconnect: `docs/WEBSOCKET_RECONNECT.md`
- Redis plan: `docs/GAME_SESSION_REDIS_READTHROUGH_PLAN.md`
- Observabilité + runbook: `docs/OBSERVABILITY_GAME_SESSION_CACHE.md`
- Checklist durable reconnect: `docs/DURABLE_RECONNECT_CHECKLIST.md`
- Time-control plan: `docs/RECONNECTION_TIME_CONTROL_PLAN.md`
