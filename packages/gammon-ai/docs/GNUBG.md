# GuruGammon – Intégration gnubg (squelette)

## Objectif

Brancher GNU Backgammon (gnubg) comme moteur d’analyse pour :

- détecter les blunders / erreurs,
- fournir l’equity et les meilleurs coups suggérés.

## Mode d’appel envisagé

- Appel CLI de `gnubg` (mode texte) ou service wrapper qui expose une API HTTP.
- Entrée : position courante (board, joueur au trait, cube, score).
- Sortie : JSON avec equity globale + liste de coups annotés (meilleur coup, erreur, blunder, etc.).

## Intégration front

- Bouton ou action "Analyser avec gnubg" sur `GameBoard.vue`.
- Affichage d’un overlay indiquant les meilleurs coups et les blunders sur le plateau.

Les détails de format JSON et de déploiement gnubg seront complétés lors de la Phase 3 dédiée.
