// ─────────────────────────────────────────────────────────────────────────────
// src/server/constants.cjs — Réexport CJS des constantes partagées
// Le serveur Node.js utilise CommonJS (require). Ce fichier sert de pont.
// ⚠ Copie conforme de src/shared/constants.js — toute modification doit être
//   reportée dans les DEUX fichiers, sinon client et serveur se désynchronisent
//   en silence.
// ─────────────────────────────────────────────────────────────────────────────

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const LOCK_DELAY = 500;
const MAX_MOVE_RESETS = 15;

const LINES_PER_LEVEL = 10;
const MAX_LEVEL = 20;

// Boîtes SRS : 4×4 pour I, 2×2 pour O, 3×3 pour les cinq autres.
const PIECES = {
  I: {
    shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    color: "cyan",
  },
  O: { shape: [[1, 1], [1, 1]], color: "yellow" },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: "purple" },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: "green" },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: "red" },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: "blue" },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: "orange" },
};

const PIECE_TYPES = Object.keys(PIECES);

const COLOR_INDEX = {
  0: "empty",
  1: "I",
  2: "O",
  3: "T",
  4: "S",
  5: "Z",
  6: "J",
  7: "L",
  8: "penalty",
};

const TYPE_TO_COLOR_INDEX = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

const SPAWN_X = { I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
const SPAWN_Y = 0;

// ─── Super Rotation System : tables de kicks ─────────────────────────────────
const KICKS_JLSTZ = {
  "01": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "10": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "12": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "21": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "23": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "32": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "30": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "03": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const KICKS_I = {
  "01": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "10": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "12": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "21": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "23": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "32": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "30": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "03": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

const KICKS_O = [[0, 0]];

const getKicks = (type, from, to) => {
  if (type === "O") return KICKS_O;
  const table = type === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}${to}`] || KICKS_O;
};

module.exports = {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  LOCK_DELAY,
  MAX_MOVE_RESETS,
  LINES_PER_LEVEL,
  MAX_LEVEL,
  PIECES,
  PIECE_TYPES,
  COLOR_INDEX,
  TYPE_TO_COLOR_INDEX,
  SPAWN_X,
  SPAWN_Y,
  getKicks,
};
