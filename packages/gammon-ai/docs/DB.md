# GuruGammon – Schéma DB (squelette)

## Objectifs

- Sauvegarder les parties jouées et leurs coups.
- Suivre l’Elo / rating par joueur.

## Tables prévues (conceptuel)

- **users** : info compte (email, username).
- **games** : partie, longueur, résultat, date.
- **game_players** : lien users/games + couleur + score final + rating avant/après.
- **moves** : séquence de coups (ply_number, couleur, dés, notation du coup).
- **elo_history** : historique des changements d’Elo.

## Outils envisagés

- Postgres (ex. Supabase) comme base.
- Prisma pour le schéma et les migrations.

Un schéma détaillé et les commandes de migration seront ajoutés lors de la mise en place effective de la persistance.
