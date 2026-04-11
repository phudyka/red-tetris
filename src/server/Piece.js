// ─────────────────────────────────────────────────────────────────────────────
// src/server/Piece.js — Classe OOP (Sprint 1)
// ─────────────────────────────────────────────────────────────────────────────

const { PIECES, PIECE_TYPES } = require('./constants.cjs')
const { getRotations } = require('./gameLogic.cjs')

class Piece {
  constructor(typeIndex) {
    this.typeIndex = typeIndex
    this.type = PIECE_TYPES[typeIndex]
    this.rotations = getRotations(PIECES[this.type].shape)
    this.currentRotation = 0
  }

  rotate() {
    this.currentRotation = (this.currentRotation + 1) % this.rotations.length
    return this
  }

  getShape() {
    return this.rotations[this.currentRotation]
  }

  reset() {
    this.currentRotation = 0
    return this
  }
}

module.exports = Piece
