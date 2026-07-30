// ─────────────────────────────────────────────────────────────────────────────
// src/server/Player.js — Classe OOP
// ─────────────────────────────────────────────────────────────────────────────

const { createEmptyBoard } = require("./gameLogic.cjs");
const { SPAWN_Y } = require("./constants.cjs");

class Player {
  constructor(id, name, room) {
    this.id = id; // socket.id
    this.name = name; // string
    this.room = room; // string (room name)
    this.isHost = false; // premier joueur → true dans Game.addPlayer
    this.isAlive = true;
    this.board = createEmptyBoard();
    this.pieceIndex = 0; // index dans game.pieces[]
    this.x = 0;
    this.y = SPAWN_Y;
    this.score = 0; // score in-memory, reset à chaque partie
    this.lines = 0; // total effacé, pilote le niveau
    this.level = 1;
    // -1 = aucune série en cours ; le premier effacement l'amène à 0, qui ne
    // rapporte encore rien — le bonus démarre au deuxième d'affilée.
    this.combo = -1;
    this.b2b = false; // dernier effacement « difficile » (tetris ou T-spin)
  }

  reset() {
    this.isAlive = true;
    this.board = createEmptyBoard();
    this.pieceIndex = 0;
    this.x = 0;
    this.y = SPAWN_Y;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.b2b = false;
    return this;
  }
}

module.exports = Player;
