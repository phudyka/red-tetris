// ─────────────────────────────────────────────────────────────────────────────
// src/server/Player.js — Classe OOP
// ─────────────────────────────────────────────────────────────────────────────

const { createEmptyBoard } = require("./gameLogic.cjs");
const { SPAWN_X, SPAWN_Y, PIECE_TYPES } = require("./constants.cjs");

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
  }

  reset() {
    this.isAlive = true;
    this.board = createEmptyBoard();
    this.pieceIndex = 0;
    this.x = 0;
    this.y = SPAWN_Y;
    this.score = 0;
    return this;
  }
}

module.exports = Player;
