# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Commandes

```bash
npm ci                       # node_modules absent du repo — à faire en premier
npm run dev                  # serveur (nodemon) + webpack --watch en parallèle
npm run dev:server           # serveur seul  (PORT/HOST via .env, défaut localhost:3000)
npm run build                # bundle prod → public/bundle.js
npm start                    # serveur prod (sert public/)
npm test                     # jest --coverage (seuils appliqués, voir plus bas)
npm test -- test/server/Game.test.js          # un fichier
npm test -- -t "spectrum"                     # un test par nom
```

`jest-environment-jsdom@30` exige Node ≥ 20 ; sur Node 19 la suite client échoue
au démarrage (`Test environment jest-environment-jsdom cannot be found` après
install partielle).

**`public/bundle.js` est versionné.** Express sert `public/` en statique : toute
modif du client est invisible sans `npm run build` (ou `dev:client` en watch).
Commiter le bundle régénéré avec le code source.

## Architecture

Jeu Tetris multijoueur, projet 42 (`subject.pdf`). Trois zones : `src/server`
(Node/CommonJS, OOP), `src/client` (React/Redux/ESM, aucun `this`), `src/shared`
(fonctions pures, ESM).

### Autorité de la logique : le client

Contre-intuitif mais central : **toute la simulation tourne côté client**. Le
serveur ne fait jamais tomber de pièce, ne valide aucun mouvement, ne détecte
aucune mort. Il est un distributeur de pièces + relais d'événements.

- Le serveur génère à `Game.start()` une séquence commune de pièces
  (`game.pieces`, sacs de 7 complets, ≥ 500) ; chaque joueur avance son propre
  curseur `player.pieceIndex` → même séquence pour tous, à des rythmes
  différents (exigence du sujet).
- Le client applique collision/rotation/lock/clear localement via
  `src/shared/gameLogic.js`, puis **déclare** le résultat au serveur
  (`pieceLocked`, `playerDead`, `updateSpectrum`).
- Le serveur n'arbitre que : pénalités (`n-1` lignes aux autres vivants), score,
  condition de victoire, host.

`pieceLocked` part à **chaque** verrouillage, effacement ou non : le serveur a
besoin du flux complet pour tenir le combo (qu'une pièce posée à vide remet à
zéro) et le back-to-back. Tout ce qui rapporte des points y est borné avant
d'entrer dans l'état (`validation.js` : lignes ≤ 4, descente ≤ 20).

Conséquence : `player.board`/`x`/`y` côté serveur ne sont pas la vérité du jeu —
seuls `isAlive`, `score`, `lines`, `level`, `combo`, `b2b`, `pieceIndex` et
`isHost` comptent. Le **niveau est calculé des deux côtés** par la même fonction
pure `levelForLines` : le client en a besoin tout de suite pour la gravité, un
aller-retour serveur ferait tomber la pièce au mauvais rythme.

Les adversaires ne voient **que** nom + spectrum (exigence du sujet) : aucun
board complet ne transite. Le spectrum est publié depuis l'effet `[board]` de
`Game.jsx`, seul endroit où le tas peut bouger (lock ou pénalité reçue).

### Le pont CJS ↔ ESM (duplication volontaire)

Le serveur est en CommonJS, `src/shared/*.js` en ESM. `src/server/gameLogic.cjs`
et `src/server/constants.cjs` **recopient** le contenu de
`src/shared/gameLogic.js` et `src/shared/constants.js`.

→ Toute modification d'une constante ou d'une fonction pure doit être appliquée
**dans les deux fichiers**, sous peine de désynchroniser client et serveur
silencieusement.

### Protocole socket.io

Client → serveur : `joinGame`, `startGame`, `setMode`, `playerDead`,
`pieceLocked`, `requestNextPiece`, `updateSpectrum`, `leaveGame`. Serveur →
client : `gameJoined`, `playerJoined`, `playerLeft`, `modesChanged`,
`gameStarted`, `newPiece`, `addPenalty`, `updateSpectrum`, `opponentDead`,
`score:update`, `leaderboard:update`, `gameOver`, `error`.

`setMode` porte **un seul** modificateur (`{room, mode, on}`) et le serveur
fusionne : envoyer les trois d'un coup ferait qu'un second clic parti avant
l'écho du premier le rembobinerait. Le client ne bascule rien localement — il
attend `modesChanged`.

Tous les émetteurs sont centralisés dans `src/client/socket.js` (`emitXxx`) ;
chaque listener y dispatch une action Redux — `error` compris (`GAME_ERROR`,
affiché par `App.jsx`, sinon un join refusé laisse l'écran sur « Connecting… »).

`joinGame` est refusé tant que `started && !over` (« no new players can join
until the next round »), et `GAME_STARTED` réinitialise `player`/`opponents`/
`scores` chez **tous** les clients : au restart, seul le host dispatche
`GAME_RESET` localement.

### State Redux

Slices : `game` (room, started/over, winner, liste lobby), `player` (board,
currentPiece, next/hold, isAlive), `opponents` (tableau
`{name, spectrum, isAlive}`), `scores`, `leaderboard`. Store `createStore` +
`redux-thunk` (pas de Redux Toolkit).

`SET_PIECE` est dispatché en **string littérale** depuis `Game.jsx` et redéclaré
en constante locale dans `reducers/player.js` — contournement d'import
circulaire, ne pas « corriger » en important depuis `actions/player.js` sans
vérifier le cycle.

### Modificateurs de manche (bonus du sujet)

Trois axes **orthogonaux, donc cumulables** — d'où trois interrupteurs et non un
choix exclusif. Armés par le host dans le Lobby, gelés dès `game.start()`
(`Game.setModes` renvoie `false` en cours de manche), conservés d'une manche à
l'autre (`GAME_RESET` les préserve côté client, `Game.reset()` côté serveur).

- **`invisible`** — purement CSS (`.board--invisible`, `global.css`). Le tas
  s'éteint en 900 ms après le lock, le ghost disparaît (sinon il redessinerait
  le sommet de chaque colonne et viderait le mode de son sens), les lignes de
  pénalité restent visibles. Aucune logique JS : les 200 cellules restent dans
  le DOM, seule leur opacité tombe. En `prefers-reduced-motion`, l'extinction
  est immédiate — c'est une règle de jeu, pas un effet.
- **`gravity`** — `gravityLevel(level, modes)` ajoute `GRAVITY_BOOST` (9) à la
  **gravité seule**. Le niveau affiché et le multiplicateur de score restent
  ceux des lignes : le mode rend la manche plus dure, pas plus payante.
- **`sprint`** — `Game.checkSprintWinner()`, appelé dans `pieceLocked` après
  l'incrément des lignes. Premier à `SPRINT_TARGET` (40) : la course prime sur
  la survie, on gagne avec des adversaires encore vivants — ce que
  `checkWinCondition` ne sait pas voir.

`modeTag(modes)` (partagé, donc **dupliqué dans `gameLogic.cjs`**) rend
`CLASSIC` ou `INV·G+·SPR` dans l'ordre canonique. Le serveur l'écrit au
classement, le client l'affiche dans le bandeau de partie et sur l'écran de fin.

Les trois clôtures de manche (dernier survivant, dernier mort, objectif sprint)
passent par le même `finishGame()` d'`index.js` : elles doivent produire
exactement le même état.

### Règles de jeu (Tetris Guideline)

- **Boîtes SRS** : `PIECES` définit le I en 4×4, le O en 2×2, les cinq autres en
  3×3. La boîte n'est pas un détail de stockage, c'est le centre de rotation —
  les tables de kicks la supposent. Ne pas « resserrer » une shape.
- **Rotation** : `rotatePiece(board, piece, dir)` essaie les cinq positions de
  `getKicks(type, from, to)` et renvoie `null` si aucune ne passe. La pièce
  porte son orientation dans `piece.rot` (0-3).
- **7-bag** : `generatePieceSequence(n)` rend des sacs de 7 complets — d'où une
  longueur arrondie au sac supérieur, pour que deux segments concaténés par
  `Game.ensureSequence` ne coupent jamais un sac en deux.
- **Gravité** : `gravityMs(levelForLines(lines))`, formule de la Guideline,
  plancher à 16 ms. Le `resetKey` de `useGameLoop` fait repartir l'intervalle à
  chaque spawn.
- **T-spin** : `isTSpin` applique la règle des trois coins ; le complément (« le
  dernier mouvement était une rotation ») vit dans `rotatedLastRef` de
  `Game.jsx`. Toute action qui déplace la pièce doit remettre ce drapeau à faux.

### Game.jsx

Concentre la boucle de jeu, le DAS clavier, le lock delay et les checks de mort
(spawn, hold swap, plateau modifié par pénalité). Le state Redux est mirroré
dans des refs (`boardRef`, `pieceRef`…) parce que les timers (`setInterval`,
`setTimeout` du lock delay, intervals DAS) captureraient sinon des closures
périmées. Toute nouvelle valeur lue dans un timer doit passer par une ref.

Deux pièges déjà payés, à ne pas réintroduire :

- **Ne pas relire une ref qu'on vient de dispatcher.** `hardDrop` passe la pièce
  descendue en argument à `lockPiece`, et `lockPiece` passe le plateau modifié à
  `spawnNextPiece` : les refs ne sont synchronisées qu'après le commit React, et
  parier sur l'ordre entre le scheduler et un `setTimeout(0)`, c'est perdre
  parfois.
- **Une pénalité remonte le tas ET la pièce en cours** (`liftPiece`, dans le
  reducer `ADD_PENALTY`). Le check de mort dépend de `[board, piece]` ensemble ;
  lire l'un avec l'autre périmé donnait des morts fantômes.

`useKeyboard.js` existe mais n'est plus branché : `Game.jsx` gère le clavier en
interne pour supporter le DAS.

### Design system

Direction **brutalist arcade** : fond charbon uni, blocs strictement plats,
angles droits (`--radius: 0`), bordures nettes, hiérarchie portée par la taille
et la graisse — jamais par une ombre ou un dégradé. Aucune police distante : la
pile système (`--font-ui`, `--font-mono`) porte toute la typographie.

Tout passe par les tokens en tête de `global.css` : surfaces (`--surface-*`),
traits (`--line*`), encre (`--ink-*`, contrastes mesurés sur `--bg`), échelle
typographique (`--text-*`), espacement (`--space-*`). Aucune valeur en dur dans
une règle — une taille ou une couleur qui manque se rajoute au token set, pas
dans le sélecteur.

`--accent` (rouge) est réservé au danger : pénalité, éliminé, refus serveur. Le
bouton primaire est blanc — un bouton rouge à côté d'un tétromino Z rouge dirait
la même chose sans le même sens.

### Serveur

`GameManager` (Map room → `Game`) → `Game` (joueurs, séquence de pièces,
condition de victoire) → `Player`. `Piece.js` n'est utilisé que par ses tests :
il existe pour satisfaire l'exigence OOP du sujet (classes `Player`, `Piece`,
`Game`).

Le leaderboard est une `Map` dans `index.js`, hors des parties (meilleur score
par nom, top 10). Il **survit au redémarrage** via `leaderboardStore.js`
(`leaderboard.json` à la racine, gitignoré) : relu au boot, réécrit à chaque fin
de partie. Un fichier absent, illisible ou raboté ne fait pas tomber le serveur
— `loadLeaderboard` renvoie une Map vide et écarte les entrées bancales. Les
scores nuls n'y entrent pas : depuis qu'ils survivent au redémarrage, ils
s'accumuleraient.

La valeur stockée est `{score, mode}` — un record en pièces invisibles et un
record classique ne se comparent pas, la ligne doit dire lequel elle raconte.

Routing : `/:room/:playerName` (BrowserRouter) ; `app.get('*')` renvoie
`index.html` pour le fallback SPA.

## Contraintes du sujet (non négociables)

- Client : **aucun `this`**, composants fonctionnels, logique de plateau en
  fonctions pures.
- Serveur : approche OOP (prototypes/classes).
- Interdits : `<table>`, canvas, SVG, jQuery / manipulation DOM directe. Layout
  en grid/flexbox.
- Couverture minimale, appliquée par `coverageThreshold` dans `package.json` :
  70 % statements/functions/lines, 50 % branches. `npm test` échoue en dessous.
- Pas de secrets versionnés (`.env` est gitignoré).
