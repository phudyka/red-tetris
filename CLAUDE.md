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

- Le serveur génère à `Game.start()` une séquence commune de 500 index de pièces
  (`game.pieces`) ; chaque joueur avance son propre curseur `player.pieceIndex`
  → même séquence pour tous, à des rythmes différents (exigence du sujet).
- Le client applique collision/rotation/lock/clear localement via
  `src/shared/gameLogic.js`, puis **déclare** le résultat au serveur
  (`linesCleared`, `playerDead`, `updateSpectrum`).
- Le serveur n'arbitre que : pénalités (`n-1` lignes aux autres vivants), score,
  condition de victoire, host.
- `playerAction` est un no-op conservé pour compat protocole.

Conséquence : `player.board`/`x`/`y` côté serveur ne sont pas la vérité du jeu —
seuls `isAlive`, `score`, `pieceIndex` et `isHost` comptent.

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

Client → serveur : `joinGame`, `startGame`, `playerDead`, `linesCleared`,
`requestNextPiece`, `updateSpectrum`, `leaveGame`. Serveur → client :
`gameJoined`, `playerJoined`, `playerLeft`, `gameStarted`, `newPiece`,
`addPenalty`, `updateSpectrum`, `opponentDead`, `score:update`,
`leaderboard:update`, `gameOver`, `error`.

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

### Game.jsx

Concentre la boucle de jeu, le DAS clavier, le lock delay et les trois checks de
mort (spawn, hold swap, board modifié par pénalité). Le state Redux est mirroré
dans des refs (`boardRef`, `pieceRef`…) parce que les timers (`setInterval`,
`setTimeout` du lock delay, intervals DAS) captureraient sinon des closures
périmées. Toute nouvelle valeur lue dans un timer doit passer par une ref.

`useKeyboard.js` existe mais n'est plus branché : `Game.jsx` gère le clavier en
interne pour supporter le DAS.

### Serveur

`GameManager` (Map room → `Game`) → `Game` (joueurs, séquence de pièces,
condition de victoire) → `Player`. `Piece.js` n'est utilisé que par ses tests :
il existe pour satisfaire l'exigence OOP du sujet (classes `Player`, `Piece`,
`Game`).

Le leaderboard est une `Map` en mémoire dans `index.js`, hors des parties
(meilleur score par nom, top 10) — perdu au redémarrage, c'est voulu (« no data
persistence necessary »).

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
