// ─────────────────────────────────────────────────────────────────────────────
// src/server/Game.js — Classe OOP
// ─────────────────────────────────────────────────────────────────────────────

const { generatePieceSequence } = require('./gameLogic.cjs')

class Game {
  constructor(name) {
    this.name = name        // = nom de la room
    this.players = []       // Player[]
    this.pieces = []        // number[] — séquence commune (500 pièces)
    this.started = false
    this.over = false
  }

  // ── Joueurs ────────────────────────────────────────────────────────────────

  addPlayer(player) {
    if (this.players.length === 0) {
      player.isHost = true
    }
    this.players.push(player)
  }

  removePlayer(socketId) {
    const index = this.players.findIndex(p => p.id === socketId)
    if (index === -1) return null

    const removed = this.players[index]
    this.players.splice(index, 1)

    // Si le joueur retiré était le host, transférer au prochain joueur vivant
    if (removed.isHost && this.players.length > 0) {
      const nextHost = this.players.find(p => p.isAlive) || this.players[0]
      if (nextHost) {
        nextHost.isHost = true
      }
    }

    return removed
  }

  getPlayer(socketId) {
    return this.players.find(p => p.id === socketId) || null
  }

  // ── Partie ─────────────────────────────────────────────────────────────────

  start() {
    this.started = true
    this.over = false
    this.pieces = generatePieceSequence(500)
    this.players.forEach(p => p.reset())
  }

  /**
   * Retourne l'index de la prochaine pièce pour ce joueur et incrémente son compteur.
   * @param {Player} player
   * @returns {number}  typeIndex (0-6)
   */
  getNextPiece(player) {
    const typeIndex = this.pieces[player.pieceIndex]
    player.pieceIndex++
    return typeIndex
  }

  getAlivePlayers() {
    return this.players.filter(p => p.isAlive)
  }

  /**
   * Vérifie la condition de victoire.
   * @returns {Player|null}  Le gagnant s'il n'en reste qu'un, null sinon
   */
  checkWinCondition() {
    const alive = this.getAlivePlayers()
    if (this.players.length === 1 && alive.length === 0) {
      // Solo : le seul joueur est mort
      return null
    }
    if (alive.length === 1 && this.players.length > 1) {
      return alive[0]
    }
    if (alive.length === 0) {
      // Tous morts simultanément (cas rare) — pas de gagnant
      return null
    }
    return null
  }

  reset() {
    this.started = false
    this.over = false
    this.pieces = generatePieceSequence(500)
    this.players.forEach(p => p.reset())
  }
}

module.exports = Game
