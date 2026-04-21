// ─────────────────────────────────────────────────────────────────────────────
// src/server/gameLogic.cjs — Réexport CJS des fonctions pures partagées
// ─────────────────────────────────────────────────────────────────────────────

const { BOARD_WIDTH, BOARD_HEIGHT, PIECE_TYPES } = require('./constants.cjs')

const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

const isValidPosition = (board, shape, x, y) => {
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

const placePiece = (board, shape, x, y, colorIndex) => {
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

const clearLines = (board) => {
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

const computeSpectrum = (board) => {
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

const addPenaltyLines = (board, n) => {
  if (n <= 0) return board.map(row => [...row])
  const penaltyRow = () => Array(BOARD_WIDTH).fill(8)
  const penaltyRows = Array.from({ length: n }, penaltyRow)
  return [...board.slice(n), ...penaltyRows]
}

const getRotations = (shape) => {
  const rotations = [shape]
  let current = shape
  for (let i = 0; i < 3; i++) {
    const rows = current.length
    const cols = current[0].length
    const rotated = Array.from({ length: cols }, (_, c) =>
      Array.from({ length: rows }, (_, r) => current[rows - 1 - r][c])
    )
    if (JSON.stringify(rotated) === JSON.stringify(rotations[0])) break
    rotations.push(rotated)
    current = rotated
  }
  return rotations
}

const getHardDropPosition = (board, shape, x, y) => {
  let finalY = y
  while (isValidPosition(board, shape, x, finalY + 1)) {
    finalY++
  }
  return finalY
}

const generatePieceSequence = (n) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * PIECE_TYPES.length))

module.exports = {
  createEmptyBoard,
  isValidPosition,
  placePiece,
  clearLines,
  computeSpectrum,
  addPenaltyLines,
  getRotations,
  getHardDropPosition,
  generatePieceSequence,
}
