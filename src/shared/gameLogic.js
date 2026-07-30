// ─────────────────────────────────────────────────────────────────────────────
// src/shared/gameLogic.js
// FONCTIONS PURES — zéro `this`, zéro mutation
// Utilisées côté client ET côté serveur
// ─────────────────────────────────────────────────────────────────────────────

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  getKicks,
  LINES_PER_LEVEL,
  MAX_LEVEL,
  PIECE_TYPES,
} from "./constants.js";

// ─── Board ───────────────────────────────────────────────────────────────────

/**
 * Crée un plateau vide 10×20.
 * @returns {number[][]} Tableau de BOARD_HEIGHT lignes de BOARD_WIDTH zéros
 */
export const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

// ─── Collision ────────────────────────────────────────────────────────────────

/**
 * Vérifie si la shape peut occuper la position (x, y) sur le board.
 * @param {number[][]} board
 * @param {number[][]} shape  - matrice de la pièce (0/1)
 * @param {number}     x      - colonne du coin haut-gauche
 * @param {number}     y      - ligne du coin haut-gauche
 * @returns {boolean}
 */
export const isValidPosition = (board, shape, x, y) => {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue;
      const newX = x + col;
      const newY = y + row;
      if (newX < 0 || newX >= BOARD_WIDTH) return false;
      if (newY >= BOARD_HEIGHT) return false;
      if (newY >= 0 && board[newY][newX] !== 0) return false;
    }
  }
  return true;
};

// ─── Placement ────────────────────────────────────────────────────────────────

/**
 * Place une pièce sur le board et retourne un NOUVEAU board (immutable).
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number}     x
 * @param {number}     y
 * @param {number}     colorIndex  - 1-7 pour les pièces, 8 pour pénalité
 * @returns {number[][]}
 */
export const placePiece = (board, shape, x, y, colorIndex) => {
  const newBoard = board.map((row) => [...row]);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue;
      const ny = y + row;
      const nx = x + col;
      if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
        newBoard[ny][nx] = colorIndex;
      }
    }
  }
  return newBoard;
};

// ─── Lignes ───────────────────────────────────────────────────────────────────

/**
 * Efface les lignes complètes (toutes les cellules non nulles).
 * Les lignes de pénalité (colorIndex 8) ne sont PAS effacées.
 * @param {number[][]} board
 * @returns {{ newBoard: number[][], linesCleared: number, clearedIndexes: number[] }}
 */
export const clearLines = (board) => {
  const clearedIndexes = [];
  const keptRows = [];

  for (let i = 0; i < board.length; i++) {
    const row = board[i];
    // Une ligne est effacée si elle est complète ET ne contient pas de pénalité (8)
    const isFull = row.every((cell) => cell !== 0);
    const hasPenalty = row.includes(8);

    if (isFull && !hasPenalty) {
      clearedIndexes.push(i);
    } else {
      keptRows.push(row);
    }
  }

  const linesCleared = clearedIndexes.length;
  const emptyRows = Array.from(
    { length: linesCleared },
    () => Array(BOARD_WIDTH).fill(0),
  );

  return {
    newBoard: [...emptyRows, ...keptRows],
    linesCleared,
    clearedIndexes,
  };
};

// ─── Spectrum ─────────────────────────────────────────────────────────────────

/**
 * Calcule le spectrum : hauteur maximale occupée par colonne.
 * @param {number[][]} board
 * @returns {number[]}  tableau de BOARD_WIDTH valeurs
 */
export const computeSpectrum = (board) => {
  const spectrum = Array(BOARD_WIDTH).fill(0);
  for (let col = 0; col < BOARD_WIDTH; col++) {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        spectrum[col] = BOARD_HEIGHT - row;
        break;
      }
    }
  }
  return spectrum;
};

// ─── Pénalité ─────────────────────────────────────────────────────────────────

/**
 * Ajoute n lignes de pénalité indestructibles (colorIndex 8) en bas du board.
 * Les lignes existantes sont poussées vers le haut, les lignes du dessus sont perdues.
 * @param {number[][]} board
 * @param {number}     n
 * @returns {number[][]}
 */
export const addPenaltyLines = (board, n) => {
  if (n <= 0) return board.map((row) => [...row]);
  const penaltyRow = () => Array(BOARD_WIDTH).fill(8);
  const penaltyRows = Array.from({ length: n }, penaltyRow);
  // On coupe les n premières lignes du haut et on ajoute n lignes de pénalité en bas
  return [...board.slice(n), ...penaltyRows];
};

/**
 * Remonte la pièce en cours avec le tas après une pénalité.
 * Le sol monte de n rangées : une pièce qui reste sur place se retrouve DANS le
 * tas et déclenche une mort qui n'a pas eu lieu. On la remonte d'autant, et si
 * la place manque on essaie les rangées intermédiaires avant d'abandonner.
 * @param {number[][]} board  plateau APRÈS addPenaltyLines
 * @param {object|null} piece
 * @param {number}     n
 * @returns {object|null}  pièce repositionnée, ou telle quelle si nulle part ne passe
 */
export const liftPiece = (board, piece, n) => {
  if (!piece || !piece.shape || n <= 0) return piece;
  for (let y = piece.y - n; y <= piece.y; y++) {
    if (isValidPosition(board, piece.shape, piece.x, y)) return { ...piece, y };
  }
  return piece;
};

// ─── Rotations ────────────────────────────────────────────────────────────────

/**
 * Rotation matricielle d'un quart de tour horaire.
 * @param {number[][]} shape
 * @returns {number[][]}
 */
export const rotateCW = (shape) =>
  shape[0].map((_, c) => shape.map((row) => row[c]).reverse());

/**
 * Retourne toutes les rotations clockwise d'une shape.
 * @param {number[][]} shape
 * @returns {number[][][]}
 */
export const getRotations = (shape) => {
  const rotations = [shape];
  let current = shape;
  for (let i = 0; i < 3; i++) {
    const rotated = rotateCW(current);
    // Déduplique : si la rotation est identique à la première, on s'arrête
    if (JSON.stringify(rotated) === JSON.stringify(rotations[0])) break;
    rotations.push(rotated);
    current = rotated;
  }
  return rotations;
};

/**
 * Rotation SRS complète : tourne la pièce puis essaie les cinq positions de la
 * table de kicks correspondante. La première libre est retenue.
 * @param {number[][]} board
 * @param {{shape: number[][], x: number, y: number, type: string, rot?: number}} piece
 * @param {number} dir  1 = horaire, -1 = antihoraire
 * @returns {object|null}  nouvelle pièce, ou null si aucune position ne passe
 */
export const rotatePiece = (board, piece, dir = 1) => {
  if (!piece || !piece.shape) return null;

  const from = piece.rot || 0;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;

  let rotated = rotateCW(piece.shape);
  if (dir < 0) rotated = rotateCW(rotateCW(rotated)); // trois quarts horaires

  for (const [dx, dy] of getKicks(piece.type, from, to)) {
    const nx = piece.x + dx;
    const ny = piece.y - dy; // tables en y-vers-le-haut, plateau en y-vers-le-bas
    if (isValidPosition(board, rotated, nx, ny)) {
      return { ...piece, shape: rotated, x: nx, y: ny, rot: to };
    }
  }
  return null;
};

/**
 * Règle des trois coins : un T dont trois des quatre coins de sa boîte 3×3 sont
 * occupés (par le tas ou par un mur) vient d'être vissé dans un trou. Le
 * complément côté appelant — le dernier mouvement doit être une rotation — est
 * ce qui distingue un vrai T-spin d'un T tombé là par hasard.
 * @param {number[][]} board
 * @param {{type: string, x: number, y: number}} piece
 * @returns {boolean}
 */
export const isTSpin = (board, piece) => {
  if (!piece || piece.type !== "T") return false;
  const cx = piece.x + 1;
  const cy = piece.y + 1;
  const corners = [
    [cy - 1, cx - 1],
    [cy - 1, cx + 1],
    [cy + 1, cx - 1],
    [cy + 1, cx + 1],
  ];
  const occupied =
    corners.filter(([r, c]) =>
      c < 0 || c >= BOARD_WIDTH || r >= BOARD_HEIGHT ||
      (r >= 0 && board[r][c] !== 0)
    ).length;
  return occupied >= 3;
};

// ─── Hard Drop ────────────────────────────────────────────────────────────────

/**
 * Calcule la position Y finale d'un hard drop (chute instantanée).
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number}     x
 * @param {number}     y
 * @returns {number}   y final où la pièce se pose
 */
export const getHardDropPosition = (board, shape, x, y) => {
  let finalY = y;
  while (isValidPosition(board, shape, x, finalY + 1)) {
    finalY++;
  }
  return finalY;
};

// ─── Niveau et gravité ───────────────────────────────────────────────────────

/**
 * Niveau atteint pour un total de lignes effacées.
 * @param {number} lines
 * @returns {number}  1 à MAX_LEVEL
 */
export const levelForLines = (lines) =>
  Math.min(MAX_LEVEL, Math.floor((lines || 0) / LINES_PER_LEVEL) + 1);

/**
 * Durée de chute d'une rangée, formule de la Tetris Guideline :
 * (0.8 - (niveau - 1) × 0.007) ^ (niveau - 1) secondes.
 * Plancher à 16 ms — en dessous la pièce descendrait plusieurs rangées par
 * frame et le lock delay ne servirait plus à rien.
 * @param {number} level
 * @returns {number}  millisecondes
 */
export const gravityMs = (level) => {
  const l = Math.min(MAX_LEVEL, Math.max(1, level || 1));
  return Math.max(16, Math.round((0.8 - (l - 1) * 0.007) ** (l - 1) * 1000));
};

// ─── Séquence de pièces ──────────────────────────────────────────────────────

/**
 * Génère une séquence de pièces par sacs de 7 (« 7-bag »), l'algorithme de la
 * Guideline : chaque tétromino apparaît une fois par sac, dans un ordre
 * mélangé. Un tirage uniforme, lui, laisse des famines de I de vingt pièces et
 * des séries de S/Z injouables.
 * La longueur retournée est arrondie au sac supérieur : concaténer deux appels
 * ne coupe donc jamais un sac en deux.
 * Appelée uniquement côté serveur dans Game.start().
 * @param {number} n  longueur minimale
 * @returns {number[]}
 */
export const generatePieceSequence = (n) => {
  const sequence = [];
  while (sequence.length < n) {
    const bag = PIECE_TYPES.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = bag[i];
      bag[i] = bag[j];
      bag[j] = swap;
    }
    sequence.push(...bag);
  }
  return sequence;
};
