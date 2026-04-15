// ─────────────────────────────────────────────────────────────────────────────
// src/shared/gameLogic.js
// FONCTIONS PURES — zéro `this`, zéro mutation
// Utilisées côté client ET côté serveur
// ─────────────────────────────────────────────────────────────────────────────

import { BOARD_WIDTH, BOARD_HEIGHT, PIECE_TYPES, PIECES } from './constants.js'

// ─── Board ───────────────────────────────────────────────────────────────────

/**
 * Crée un plateau vide 10×20.
 * @returns {number[][]} Tableau de BOARD_HEIGHT lignes de BOARD_WIDTH zéros
 */
export const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

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
      if (shape[row][col] === 0) continue
      const newX = x + col
      const newY = y + row
      if (newX < 0 || newX >= BOARD_WIDTH) return false
      if (newY >= BOARD_HEIGHT) return false
      if (newY >= 0 && board[newY][newX] !== 0) return false
    }
  }
  return true
}

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
  const newBoard = board.map(row => [...row])
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue
      const ny = y + row
      const nx = x + col
      if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
        newBoard[ny][nx] = colorIndex
      }
    }
  }
  return newBoard
}

// ─── Lignes ───────────────────────────────────────────────────────────────────

/**
 * Efface les lignes complètes (toutes les cellules non nulles).
 * Les lignes de pénalité (colorIndex 8) ne sont PAS effacées.
 * @param {number[][]} board
 * @returns {{ newBoard: number[][], linesCleared: number }}
 */
export const clearLines = (board) => {
  const clearedIndexes = []
  const keptRows = []

  for (let i = 0; i < board.length; i++) {
    const row = board[i]
    // Une ligne est effacée si elle est complète ET ne contient pas de pénalité (8)
    const isFull = row.every(cell => cell !== 0)
    const hasPenalty = row.includes(8)

    if (isFull && !hasPenalty) {
      clearedIndexes.push(i)
    } else {
      keptRows.push(row)
    }
  }

  const linesCleared = clearedIndexes.length
  const emptyRows = Array.from({ length: linesCleared }, () => Array(BOARD_WIDTH).fill(0))

  return {
    newBoard: [...emptyRows, ...keptRows],
    linesCleared,
    clearedIndexes,
  }
}

// ─── Spectrum ─────────────────────────────────────────────────────────────────

/**
 * Calcule le spectrum : hauteur maximale occupée par colonne.
 * @param {number[][]} board
 * @returns {number[]}  tableau de BOARD_WIDTH valeurs
 */
export const computeSpectrum = (board) => {
  const spectrum = Array(BOARD_WIDTH).fill(0)
  for (let col = 0; col < BOARD_WIDTH; col++) {
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (board[row][col] !== 0) {
        spectrum[col] = BOARD_HEIGHT - row
        break
      }
    }
  }
  return spectrum
}

// ─── Pénalité ─────────────────────────────────────────────────────────────────

/**
 * Ajoute n lignes de pénalité indestructibles (colorIndex 8) en bas du board.
 * Les lignes existantes sont poussées vers le haut, les lignes du dessus sont perdues.
 * @param {number[][]} board
 * @param {number}     n
 * @returns {number[][]}
 */
export const addPenaltyLines = (board, n) => {
  if (n <= 0) return board.map(row => [...row])
  const penaltyRow = () => Array(BOARD_WIDTH).fill(8)
  const penaltyRows = Array.from({ length: n }, penaltyRow)
  // On coupe les n premières lignes du haut et on ajoute n lignes de pénalité en bas
  return [...board.slice(n), ...penaltyRows]
}

// ─── Rotations ────────────────────────────────────────────────────────────────

/**
 * Retourne toutes les rotations clockwise d'une shape.
 * Une rotation 90° clockwise : newShape[col][rows-1-row] = shape[row][col]
 * @param {number[][]} shape
 * @returns {number[][][]}
 */
export const getRotations = (shape) => {
  const rotations = [shape]
  let current = shape
  for (let i = 0; i < 3; i++) {
    const rows = current.length
    const cols = current[0].length
    const rotated = Array.from({ length: cols }, (_, c) =>
      Array.from({ length: rows }, (_, r) => current[rows - 1 - r][c])
    )
    // Déduplique : si la rotation est identique à la première, on s'arrête
    if (JSON.stringify(rotated) === JSON.stringify(rotations[0])) break
    rotations.push(rotated)
    current = rotated
  }
  return rotations
}

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
  let finalY = y
  while (isValidPosition(board, shape, x, finalY + 1)) {
    finalY++
  }
  return finalY
}

// ─── Séquence de pièces ──────────────────────────────────────────────────────

/**
 * Génère une séquence aléatoire de N indices de pièces (0-6).
 * Appelée uniquement côté serveur dans Game.start().
 * @param {number} n
 * @returns {number[]}
 */
export const generatePieceSequence = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * PIECE_TYPES.length))
