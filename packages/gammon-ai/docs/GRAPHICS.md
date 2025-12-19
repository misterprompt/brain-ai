# GuruGammon – Intégration graphique backgammon

## Sources des assets

- **Plateau & logique de référence (MIT)**  
  Basés sur le projet : [`quasoft/backgammonjs`](https://github.com/quasoft/backgammonjs)  
  Licence : MIT – voir `tmp-backgammonjs/LICENSE`.

- **Images de plateau / pions / cube (MIT)**  
  Issues du projet : [`gtzampanakis/bgboard`](https://github.com/gtzampanakis/bgboard)  
  Licence : MIT – voir `tmp-bgboard/LICENSE`.  
  Fichiers actuellement utilisés dans GuruGammon :
  - `frontend/public/assets/backgammon/board.svg` – plateau GuruGammon (SVG custom)
  - `frontend/public/assets/backgammon/checker-white.png` – pion blanc
  - `frontend/public/assets/backgammon/checker-black.png` – pion noir (recolorisation ochre)
  - `frontend/public/assets/backgammon/cube.png` – cube vide (réservé pour usage futur)

- **Référence visuelle alternative (GPL – non intégrée)**  
  [`binarymax/backgammon.js`](https://github.com/binarymax/backgammon.js) – utilisé uniquement comme **inspiration visuelle** (layout, ergonomie).  
  Aucune ressource GPL n’est copiée dans ce dépôt.

## Palette premium GuruGammon

Palette utilisée :

- **Fond bordeaux** : `#6A1B1B`  
- **Fond sombre bordeaux/bois** : `#4A2C1A`  
- **Beige clair (points / texte)** : `#F5F5DC`  
- **Or (cube, scores, accents)** : `#DAA520`  
- Pions :
  - Blanc : `#FFFFFF` (image `checker-white.png`)
  - Noir / ocre : basé sur `ochre_checker.png` → `checker-black.png`

Dans `GameBoard.vue`, ces couleurs sont exposées sous forme de variables CSS :

```css
.game-board {
  --gg-bg: #6A1B1B;
  --gg-bg-dark: #4A2C1A;
  --gg-beige: #F5F5DC;
  --gg-gold: #DAA520;
}
```

Elles sont ensuite utilisées via `var(--gg-*)` pour le fond, les textes et les overlays.

## Structure du composant `GameBoard.vue`

`GameBoard.vue` se compose de plusieurs zones principales :

- **En-tête**
  - Infos joueurs (blanc / noir, ELO).
  - Statut de partie et mise.
  - Composant `Dice` pour l’affichage des dés.
  - Composant `DoublingCube` (videau local) + affichage du cube (lecture seule).

- **Plateau graphique premium**
  - Conteneur :
    ```html
    <div class="board-container">
      <div class="premium-board">
        <img src="/assets/backgammon/board.svg" ... class="premium-board-bg" />
        <div class="board-overlay"> ... </div>
      </div>
    </div>
    ```
  - `board.svg` définit :
    - Un fond bordeaux/bois.
    - Une zone principale 800×600 avec barre centrale.
    - Des zones OFF haut/bas (pour les pions sortis).

- **Superposition des pions**

  Les pions sont dessinés dans `board-overlay` via des `div` absolument positionnés :

  ```html
  <div
    v-for="checker in checkers"
    :key="checker.id"
    class="checker-piece"
    :class="`checker-${checker.color}`"
    :style="{ left: checker.x + 'px', top: checker.y + 'px' }"
    :data-point="checker.point"
    :data-color="checker.color"
  ></div>
  ```

  - Les images utilisées sont définies en CSS :
    ```css
    .checker-white { background-image: url('/assets/backgammon/checker-white.png'); }
    .checker-black { background-image: url('/assets/backgammon/checker-black.png'); }
    ```
  - Les coordonnées `x` / `y` sont dérivées de `checkers` via une fonction de mapping qui utilise une table de points prédéfinis.

## Triangles et offsets

Le plateau premium `board.svg` contient désormais explicitement les 24 triangles, dessinés avec les mêmes coordonnées que celles utilisées dans `GameBoard.vue` :

- Triangles du bas (points 12 à 19) :
  - `M 50 550 L 90 350 L 130 550 Z`, `M 140 550 L 180 350 L 220 550 Z`, etc.
- Triangles du haut (points 11 à 4) :
  - `M 50 50 L 90 250 L 130 50 Z`, `M 140 50 L 180 250 L 220 50 Z`, etc.

Dans `GameBoard.vue`, la table `points` reprend ces mêmes coordonnées :

- `numberX` = centre horizontal du triangle (90, 180, 270, ...).
- `numberY` ≈ 30 pour les points du haut, ≈ 570 pour les points du bas.

Le fichier `frontend/src/config/boardGeometry.ts` fournit les offsets globaux :

```ts
export const BOARD_OFFSETS = {
  triangleWidth: 60,
  triangleHeight: 200,
  checkerRadius: 20,
  offsetX: 5,
  offsetY: -3
}
```

Le calcul final des coordonnées d’un pion est :

```ts
x = pointInfo.numberX + BOARD_OFFSETS.offsetX
y = baseY + sign * step * i + BOARD_OFFSETS.offsetY
```

Ce qui garantit :

- Un alignement horizontal centré dans chaque triangle (grâce à `numberX`).
- Une pile verticale qui reste dans la hauteur du triangle (grâce à `baseY`, `step` et `sign`).
- Un léger ajustement global via `offsetX` / `offsetY` pour caler le tout sur le SVG.

- **Barre et sorties**

  Les informations de barre et de pions sortis viennent de `bar` et `off` (normalisées) et sont affichées :

  ```html
  <div v-for="b in barCheckers" class="bar-stack bar-white|bar-black"> ... </div>
  <div v-for="o in offCheckers" class="off-stack off-white|off-black"> ... </div>
  ```

- **Panneau (debug/inspection)**

  La section `.state` affiche :

  - Les dés (`dice`).
  - La liste de mouvements bruts (`moves`).
  - Les barres / sorties (`barCheckers`, `offCheckers`).
  - Les scores : `scoreUser`, `scoreOpponent`.
  - Le cube : `cubeValue` et `cubeOwner` (user / opponent / centre).

## Raccordement

Le pipeline de données est le suivant :

1. **`GameBoard.vue`**
   - S’abonne via `subscribe(handler)`.
   - Dans `handler(state)` :
     - `dice.value = state.dice`.
     - Mapping `state.checkers` → `checkers` avec coordonnées (via `mapBoardToCheckers`).
     - `barCheckers.value = state.bar`, `offCheckers.value = state.off`.
     - `state.value = state` (pour le panneau debug et le cube/score).

2. **Rendu**
   - Les pions superposés reflètent toujours `state.checkers`.
   - Le panneau debug montre les infos cube/score/dés/mouvements.
   - `DoublingCube.vue` reçoit en lecture seule `cubeValue` / `cubeOwner`.

## Changer de thème ou recoloriser

Pour modifier la palette :

1. Ouvrir `frontend/src/components/GameBoard.vue`.
2. Dans le bloc CSS :

   ```css
   .game-board {
     --gg-bg: #6A1B1B;
     --gg-bg-dark: #4A2C1A;
     --gg-beige: #F5F5DC;
     --gg-gold: #DAA520;
   }
   ```

   - Changer les valeurs hexadécimales selon le thème désiré.

3. Adapter si besoin :

   - Les couleurs de bordures et d’ombres du plateau (`.premium-board`).
   - Les couleurs du texte dans `.bar-stack`, `.off-stack`, `.game-message`.

4. Pour changer les pions :

   - Remplacer les fichiers dans `frontend/public/assets/backgammon/checker-white.png` et `checker-black.png`.
   - Conserver idéalement une taille similaire (~40×40) et un fond transparent.

## Tests GameBoard.vue

Les tests Vue dans `tests/GameBoard.spec.ts` valident l’intégration graphique avec un état mocké :

- **Mock de géométrie** :
  - `@/config/boardGeometry` est mocké avec des constantes `BOARD_OFFSETS` et `BOARD_BOUNDS` simplifiées pour éviter les dépendances au fichier TS réel.

- **Mock de données** :
  - Le test récupère le handler passé à `subscribe` et lui injecte un état synthétique contenant :
    - `dice`, `checkers` (2 blancs sur le point 1, 1 noir sur le point 6),
    - `scoreUser`, `scoreOpponent`,
    - `cubeValue`, `cubeOwner`.

- **Vérifications effectuées** :
  - Le plateau premium (`<img src="/assets/backgammon/board.svg" class="premium-board-bg" />`) est bien présent.
  - Les pions superposés existent pour les points 1 et 6 (`.checker-piece.checker-white[data-point="1"]`, `.checker-piece.checker-black[data-point="6"]`).
  - Leurs coordonnées `left/top` restent dans les bornes définies par `BOARD_BOUNDS` (validation des offsets sans imposer de pixels exacts).
  - Le texte rendu contient les valeurs numériques attendues pour :
    - le score utilisateur (`scoreUser`),
    - le score adversaire (`scoreOpponent`),
    - la valeur du cube (`cubeValue`),
    - le propriétaire du cube (`cubeOwner` → "Adversaire").
  - Le nombre total de pions rendus (`.checker-piece`) correspond au mock (2 blancs + 1 noir = 3).

Ces tests garantissent que :

- Le plateau premium est bien chargé.
- Le mapping `checkers` → `checkers` (x/y) respecte la géométrie globale.
- Les informations de cube et de score issues de l’état sont bien affichées dans l’UI.

## Licences

- `quasoft/backgammonjs` – **MIT License**.  
  Utilisé comme base conceptuelle pour la structure du plateau et certains assets d’origine.

- `gtzampanakis/bgboard` – **MIT License**.  
  Utilisé pour les images de pions et de cube, éventuellement recolorisées.

- `binarymax/backgammon.js` – **GPL**.  
  Utilisé uniquement comme **inspiration visuelle** (aucun fichier, code ou asset GPL n’est copié dans GuruGammon).

En cas de redistribution ou d’open-sourcing de GuruGammon, vérifier que les mentions de copyright et de licence MIT sont bien présentes pour quasoft et gtzampanakis.
