// ─────────────────────────────────────────────────────────────────────────────
// src/shared/constants.js
// Partagé entre client et serveur — aucun this, aucune classe
// ─────────────────────────────────────────────────────────────────────────────

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const LOCK_DELAY = 500;
export const MAX_MOVE_RESETS = 15;

// Progression : un niveau tous les 10 lignes, plafonné (au-delà la gravité
// passe sous la frame et le niveau ne veut plus rien dire).
export const LINES_PER_LEVEL = 10;
export const MAX_LEVEL = 20;

// Tétrominos dans leurs boîtes SRS : 4×4 pour I, 2×2 pour O, 3×3 pour les cinq
// autres. La boîte n'est pas un détail de stockage — c'est elle qui définit le
// centre de rotation, et les tables de kicks ci-dessous la supposent. Une boîte
// serrée ([[1,1,1,1]] pour I) fait pivoter la pièce autour du mauvais point et
// décale le tétromino d'une case à chaque quart de tour.
// Au spawn (y = 0), les cinq pièces 3×3 et le O posent leur base sur la rangée
// 1, et le I aussi : les sept arrivent alignés.
export const PIECES = {
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

// Tableau ordonné des types de pièces — sert d'index numérique
export const PIECE_TYPES = Object.keys(PIECES); // ['I','O','T','S','Z','J','L']

// Mapping colorIndex (number) → nom de piece/type
// 0 = vide, 1-7 = pièces (ordre PIECE_TYPES), 8 = pénalité indestructible
export const COLOR_INDEX = {
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

// Inverse : type → colorIndex
export const TYPE_TO_COLOR_INDEX = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

// Position X de spawn de chaque pièce — colonnes 3-6 pour le I, 4-5 pour le O,
// 3-5 pour les autres, comme la Guideline.
export const SPAWN_X = {
  I: 3,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

export const SPAWN_Y = 0;

// ─── Super Rotation System : tables de kicks ─────────────────────────────────
// Cinq positions essayées dans l'ordre à chaque quart de tour ; la première
// libre gagne, sinon la rotation est refusée. C'est ce qui autorise les
// glissements le long d'un mur, les floor kicks et les T-spins — une rotation
// sans kick refuse tout dès qu'un bord est proche.
// Les tables officielles sont en repère y-vers-le-haut ; le plateau est en
// y-vers-le-bas, d'où le `y - dy` dans rotatePiece.
// Clé : `${orientationDépart}${orientationArrivée}`, 0=spawn 1=droite 2=180 3=gauche.
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

// Le O ne tourne pas : sa boîte 2×2 est invariante, aucun kick à tenter.
const KICKS_O = [[0, 0]];

/**
 * Positions à essayer pour passer de l'orientation `from` à `to`.
 * @param {string} type  'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
 * @param {number} from  0-3
 * @param {number} to    0-3
 * @returns {number[][]} liste de [dx, dy] en repère y-vers-le-haut
 */
export const getKicks = (type, from, to) => {
  if (type === "O") return KICKS_O;
  const table = type === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}${to}`] || KICKS_O;
};
