# 🛠️ Contrôle du Code – Guide Débutant

Ce guide reprend le **processus de contrôle du code** (tests, lint, commits) et explique comment **reprendre après une erreur fatale**. Tout est décrit étape par étape pour qu’un débutant puisse suivre.

---

## 1. Préparer l’environnement

1. **Ouvrir un terminal** dans le dossier du projet `gnubg-backend`.
2. **Vérifier Node.js** (version ≥ 18) :
   ```bash
   node -v
   ```
3. **Installer les dépendances** si ce n’est pas déjà fait :
   ```bash
   npm install
   npm run install:frontend
   npm run install:backend
   ```

---

## 2. Contrôler l’état du dépôt Git

1. **Voir les fichiers modifiés** :
   ```bash
   git status
   ```
2. Si certains fichiers doivent être ignorés (ex : `node_modules/`), vérifier que `.gitignore` est correct.
3. **Mettre de côté (stash) des modifications temporaires** si besoin :
   ```bash
   git stash
   ```

> ⚠️ Les commandes Git doivent être claires : toujours vérifier que l’on est sur la bonne branche avant d’exécuter `stash`, `add` ou `commit`.

---

## 3. Relancer le “processus de contrôle”

Lorsque le contrôle du code (lint/tests) s’est arrêté à cause d’une **erreur fatale**, voici la marche à suivre :

1. **Créer une nouvelle branche de secours** (facultatif mais recommandé) :
   ```bash
   git checkout -b fix/resume-control
   ```
2. **Récupérer les dernières dépendances** (souvent source d’erreur) :
   ```bash
   npm install
   npx prisma generate
   ```
3. **Relancer les vérifications** une par une (plutôt qu’un script global) :
   ```bash
   npm run lint:backend     # Lint TypeScript backend
   npm run lint:frontend    # Lint frontend
   npm run test:backend     # Tests backend
   npm run test:frontend    # Tests frontend
   ```
   - Lire attentivement la première erreur affichée.
   - Corriger les fichiers concernés.

4. **Vérifier que plus aucune erreur n’apparaît** en relançant les commandes ci-dessus.

---

## 4. Comprendre et corriger une “erreur fatale”

Voici la démarche recommandée :

1. **Lire entièrement le message d’erreur** – repérer :
   - Le type d’erreur (`SyntaxError`, `TypeError`, etc.)
   - Le fichier et la ligne concernés
   - L’action qui a échoué (ex : `npm run lint`, `npx prisma generate`)

2. **Exemples fréquents** :
   - ***SyntaxError*** : problème de parenthèses, point-virgule manquant.
   - ***TypeScript Error*** : mauvais type ou champ inconnu.
   - ***Prisma Error*** : champ / modèle absent du schéma.

3. **Corriger calmement** :
   - Ouvrir le fichier à la ligne indiquée.
   - Faire la correction minimale (ex : renommer un champ, ajouter une accolade).
   - Sauvegarder puis relancer la commande (`npm run lint`, `npx prisma generate`, etc.).

4. **Vérifier que l’erreur a disparu** avant de passer à la suivante.

---

## 5. Valider les changements

1. **Ajouter les fichiers corrigés** :
   ```bash
   git add chemin/vers/fichier.ts
   ```
2. **Vérifier les fichiers ajoutés** :
   ```bash
   git status
   ```
3. **Créer un commit clair** :
   ```bash
   git commit -m "fix: corrige lint backend après erreur fatale"
   ```
4. **Synchroniser (si tout est OK)** :
   ```bash
   git push origin fix/resume-control
   ```

---

## 6. Résumé rapide (checklist)

- [ ] Les dépendances sont installées (`npm install`, `npx prisma generate`).
- [ ] Chaque commande (`lint`, `test`) tourne sans erreur.
- [ ] Toutes les erreurs fatales ont été comprises et corrigées.
- [ ] Les fichiers modifiés sont ajoutés (`git add`).
- [ ] Un commit clair est créé.
- [ ] Les branches sont propres (`git status` propre).

---

## 7. Ressources utiles pour débutant

- **Commandes Git interactives** : [https://ohmygit.org/](https://ohmygit.org/)
- **Lint et formatage TypeScript** : [https://typescript-eslint.io/](https://typescript-eslint.io/)
- **Prisma – comprendre les erreurs** : [https://www.prisma.io/docs/reference](https://www.prisma.io/docs/reference)

---

## 8. Conseil final

💡 *Toujours corriger une erreur à la fois.*

Quand un “processus de contrôle du code” s’arrête, ce n’est pas grave. Prenez le temps de lire l’erreur, notez ce qui ne va pas, corrigez, puis relancez. Avec ce guide, vous pouvez reprendre le processus sans stress.
