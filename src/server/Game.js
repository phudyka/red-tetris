// ─────────────────────────────────────────────────────────────────────────────
// src/server/Game.js — Classe OOP
// ─────────────────────────────────────────────────────────────────────────────

const { generatePieceSequence, modeTag } = require("./gameLogic.cjs");
const { DEFAULT_MODES, SPRINT_TARGET } = require("./constants.cjs");

// Longueur d'un segment de séquence. La séquence n'est jamais bouclée ni
// tronquée : elle s'allonge par segments quand le joueur le plus avancé
// approche de la fin, sinon une partie de plus de ~500 pièces (17 min) sort
// du tableau et le client reçoit une pièce indéfinie.
const SEQUENCE_CHUNK = 500;

class Game {
  constructor(name) {
    this.name = name; // = nom de la room
    this.players = []; // Player[]
    this.pieces = []; // number[] — séquence commune (500 pièces)
    this.started = false;
    this.over = false;
    // Effectif au coup d'envoi. `players.length` ne suffit pas à distinguer un
    // solo d'un duel dont l'adversaire a fermé son onglet : dans les deux cas il
    // ne reste qu'un joueur, mais seul le second a un vainqueur.
    this.startedWith = 0;
    // Modificateurs de la room, choisis par le host avant le départ.
    this.modes = { ...DEFAULT_MODES };
  }

  // ── Joueurs ────────────────────────────────────────────────────────────────

  addPlayer(player) {
    if (this.players.length === 0) {
      player.isHost = true;
    }
    this.players.push(player);
  }

  removePlayer(socketId) {
    const index = this.players.findIndex((p) => p.id === socketId);
    if (index === -1) return null;

    const removed = this.players[index];
    this.players.splice(index, 1);

    // Si le joueur retiré était le host, transférer au prochain joueur vivant
    if (removed.isHost && this.players.length > 0) {
      const nextHost = this.players.find((p) => p.isAlive) || this.players[0];
      if (nextHost) {
        nextHost.isHost = true;
      }
    }

    return removed;
  }

  getPlayer(socketId) {
    return this.players.find((p) => p.id === socketId) || null;
  }

  // ── Modificateurs ──────────────────────────────────────────────────────────

  /**
   * Arme les modificateurs de la prochaine manche. Refusé pendant une partie :
   * changer la gravité ou la condition de victoire en cours de route
   * réécrirait les règles sous les joueurs déjà engagés.
   * @param {{invisible: boolean, gravity: boolean, sprint: boolean}} modes
   *   déjà assaini par validation.sanitizeModes
   * @returns {boolean}  false si la manche est en cours
   */
  setModes(modes) {
    if (this.started && !this.over) return false;
    this.modes = { ...this.modes, ...modes };
    return true;
  }

  /** @returns {string}  étiquette des modificateurs — 'CLASSIC' si aucun */
  getModeTag() {
    return modeTag(this.modes);
  }

  // ── Partie ─────────────────────────────────────────────────────────────────

  start() {
    this.started = true;
    this.over = false;
    this.startedWith = this.players.length;
    this.pieces = generatePieceSequence(SEQUENCE_CHUNK);
    this.players.forEach((p) => p.reset());
  }

  /**
   * Allonge la séquence commune tant qu'elle ne couvre pas la pièce demandée
   * et son aperçu. Allonger — plutôt que reboucler — garde l'invariant du
   * sujet : à index égal, tous les joueurs ont la même pièce.
   * @param {number} index
   */
  ensureSequence(index) {
    while (this.pieces.length <= index + 1) {
      this.pieces = this.pieces.concat(generatePieceSequence(SEQUENCE_CHUNK));
    }
  }

  /**
   * Retourne l'index de la prochaine pièce pour ce joueur et incrémente son compteur.
   * @param {Player} player
   * @returns {number}  typeIndex (0-6)
   */
  getNextPiece(player) {
    this.ensureSequence(player.pieceIndex);
    const typeIndex = this.pieces[player.pieceIndex];
    player.pieceIndex++;
    return typeIndex;
  }

  getAlivePlayers() {
    return this.players.filter((p) => p.isAlive);
  }

  /**
   * Vérifie la condition de victoire.
   * @returns {Player|null}  Le gagnant s'il n'en reste qu'un, null sinon
   */
  checkWinCondition() {
    // Un seul survivant d'une partie lancée à plusieurs gagne — que les autres
    // soient morts ou partis. En solo (startedWith === 1) il n'y a jamais de
    // vainqueur : l'appelant termine la partie quand plus personne n'est en vie.
    const alive = this.getAlivePlayers();
    if (alive.length === 1 && this.startedWith > 1) {
      return alive[0];
    }
    return null;
  }

  /**
   * Vainqueur du sprint : le premier à atteindre l'objectif de lignes.
   * En sprint, la course prime sur la survie — on peut gagner avec des
   * adversaires encore vivants, ce que checkWinCondition ne sait pas voir.
   * @returns {Player|null}  null hors mode sprint ou si personne n'y est
   */
  checkSprintWinner() {
    if (!this.modes.sprint) return null;
    return this.players.find(
      (p) => p.isAlive && p.lines >= SPRINT_TARGET,
    ) || null;
  }

  reset() {
    this.started = false;
    this.over = false;
    this.startedWith = 0;
    this.pieces = generatePieceSequence(SEQUENCE_CHUNK);
    this.players.forEach((p) => p.reset());
  }
}

module.exports = Game;
