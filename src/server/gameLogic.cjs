// ─────────────────────────────────────────────────────────────────────────────
// src/server/gameLogic.cjs — Réexport CJS des fonctions pures partagées
// ⚠ Copie conforme de src/shared/gameLogic.js — toute modification doit être
//   reportée dans les DEUX fichiers.
// ─────────────────────────────────────────────────────────────────────────────

const {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  LINES_PER_LEVEL,
  MAX_LEVEL,
  PIECE_TYPES,
  getKicks,
} = require("./constants.cjs");

const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

const isValidPosition = (board, shape, x, y) => {
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

const placePiece = (board, shape, x, y, colorIndex) => {
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

const clearLines = (board) => {
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

const computeSpectrum = (board) => {
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

const addPenaltyLines = (board, n) => {
  if (n <= 0) return board.map((row) => [...row]);
  const penaltyRow = () => Array(BOARD_WIDTH).fill(8);
  const penaltyRows = Array.from({ length: n }, penaltyRow);
  return [...board.slice(n), ...penaltyRows];
};

const liftPiece = (board, piece, n) => {
  if (!piece || !piece.shape || n <= 0) return piece;
  for (let y = piece.y - n; y <= piece.y; y++) {
    if (isValidPosition(board, piece.shape, piece.x, y)) return { ...piece, y };
  }
  return piece;
};

const rotateCW = (shape) =>
  shape[0].map((_, c) => shape.map((row) => row[c]).reverse());

const getRotations = (shape) => {
  const rotations = [shape];
  let current = shape;
  for (let i = 0; i < 3; i++) {
    const rotated = rotateCW(current);
    if (JSON.stringify(rotated) === JSON.stringify(rotations[0])) break;
    rotations.push(rotated);
    current = rotated;
  }
  return rotations;
};

const rotatePiece = (board, piece, dir = 1) => {
  if (!piece || !piece.shape) return null;

  const from = piece.rot || 0;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;

  let rotated = rotateCW(piece.shape);
  if (dir < 0) rotated = rotateCW(rotateCW(rotated));

  for (const [dx, dy] of getKicks(piece.type, from, to)) {
    const nx = piece.x + dx;
    const ny = piece.y - dy;
    if (isValidPosition(board, rotated, nx, ny)) {
      return { ...piece, shape: rotated, x: nx, y: ny, rot: to };
    }
  }
  return null;
};

const isTSpin = (board, piece) => {
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

const getHardDropPosition = (board, shape, x, y) => {
  let finalY = y;
  while (isValidPosition(board, shape, x, finalY + 1)) {
    finalY++;
  }
  return finalY;
};

const levelForLines = (lines) =>
  Math.min(MAX_LEVEL, Math.floor((lines || 0) / LINES_PER_LEVEL) + 1);

const gravityMs = (level) => {
  const l = Math.min(MAX_LEVEL, Math.max(1, level || 1));
  return Math.max(16, Math.round((0.8 - (l - 1) * 0.007) ** (l - 1) * 1000));
};

const generatePieceSequence = (n) => {
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

module.exports = {
  createEmptyBoard,
  isValidPosition,
  placePiece,
  clearLines,
  computeSpectrum,
  addPenaltyLines,
  liftPiece,
  rotateCW,
  getRotations,
  rotatePiece,
  isTSpin,
  getHardDropPosition,
  levelForLines,
  gravityMs,
  generatePieceSequence,
};
