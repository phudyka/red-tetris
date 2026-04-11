// ─────────────────────────────────────────────────────────────────────────────
// src/server/GameManager.js — Registre des parties actives
// ─────────────────────────────────────────────────────────────────────────────

const Game = require('./Game')

class GameManager {
  constructor() {
    this.games = new Map() // Map<string, Game>  clé = room name
  }

  /**
   * Retourne la partie existante ou en crée une nouvelle.
   * @param {string} roomName
   * @returns {Game}
   */
  getOrCreate(roomName) {
    if (!this.games.has(roomName)) {
      this.games.set(roomName, new Game(roomName))
    }
    return this.games.get(roomName)
  }

  /**
   * @param {string} roomName
   * @returns {Game|undefined}
   */
  get(roomName) {
    return this.games.get(roomName)
  }

  /**
   * Supprime une partie (ex: plus aucun joueur).
   * @param {string} roomName
   */
  delete(roomName) {
    this.games.delete(roomName)
  }

  /**
   * @returns {Game[]}
   */
  getAll() {
    return Array.from(this.games.values())
  }
}

module.exports = GameManager
