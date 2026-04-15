// ─────────────────────────────────────────────────────────────────────────────
// src/shared/constants.js
// Partagé entre client et serveur — aucun this, aucune classe
// ─────────────────────────────────────────────────────────────────────────────

export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

// Intervalle de chute de base en millisecondes
export const TICK_INTERVAL = 800
export const LOCK_DELAY = 500
export const MAX_MOVE_RESETS = 15

// Définitions des 7 tétrominos
// shape : matrice de 0 (vide) / 1 (occupé) — rotation de base
// color : nom CSS utilisé côté client pour les classes CSS (cell--I, cell--O…)
export const PIECES = {
  I: { shape: [[1, 1, 1, 1]], color: 'cyan' },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' },
}

// Tableau ordonné des types de pièces — sert d'index numérique
export const PIECE_TYPES = Object.keys(PIECES) // ['I','O','T','S','Z','J','L']

// Mapping colorIndex (number) → nom de piece/type
// 0 = vide, 1-7 = pièces (ordre PIECE_TYPES), 8 = pénalité indestructible
export const COLOR_INDEX = {
  0: 'empty',
  1: 'I',
  2: 'O',
  3: 'T',
  4: 'S',
  5: 'Z',
  6: 'J',
  7: 'L',
  8: 'penalty',
}

// Inverse : type → colorIndex
export const TYPE_TO_COLOR_INDEX = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
}

// Position X de spawn de chaque pièce (centré sur BOARD_WIDTH=10)
export const SPAWN_X = {
  I: 3,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
}

// Position Y de spawn (au-dessus du plateau, -1 pour que la pièce apparaisse pile en haut)
export const SPAWN_Y = 0
