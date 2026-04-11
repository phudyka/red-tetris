// ─────────────────────────────────────────────────────────────────────────────
// src/server/constants.cjs — Réexport CJS des constantes partagées
// Le serveur Node.js utilise CommonJS (require). Ce fichier sert de pont.
// ─────────────────────────────────────────────────────────────────────────────

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const TICK_INTERVAL = 800

const PIECES = {
  I: { shape: [[1, 1, 1, 1]], color: 'cyan' },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' },
}

const PIECE_TYPES = Object.keys(PIECES)

const COLOR_INDEX = {
  0: 'empty',
  1: 'I', 2: 'O', 3: 'T', 4: 'S', 5: 'Z', 6: 'J', 7: 'L',
  8: 'penalty',
}

const TYPE_TO_COLOR_INDEX = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
}

const SPAWN_X = { I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 }
const SPAWN_Y = 0

module.exports = {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TICK_INTERVAL,
  PIECES,
  PIECE_TYPES,
  COLOR_INDEX,
  TYPE_TO_COLOR_INDEX,
  SPAWN_X,
  SPAWN_Y,
}
