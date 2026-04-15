// ─────────────────────────────────────────────────────────────────────────────
// src/server/index.js — Point d'entrée serveur
// Express + socket.io — OOP obligatoire (voir classes Game/Player/GameManager)
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config()
const path = require('path')
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const GameManager = require('./GameManager')
const Player = require('./Player')
const { SPAWN_X, SPAWN_Y, PIECE_TYPES } = require('./constants.cjs')
const { isValidPosition } = require('./gameLogic.cjs')

const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || 'localhost'

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*' },
})

const manager = new GameManager()

// ── Fichiers statiques ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../public')))

// SPA fallback — toutes les routes inconnues servent index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'))
})

// ── socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {

  // ── joinGame ──────────────────────────────────────────────────────────────
  socket.on('joinGame', ({ room, playerName }) => {
    const game = manager.getOrCreate(room)

    // Partie déjà lancée → refus
    if (game.started && !game.over) {
      socket.emit('error', { message: 'Game already started' })
      return
    }

    // Nom déjà pris dans cette room
    const nameTaken = game.players.some(p => p.name === playerName)
    if (nameTaken) {
      socket.emit('error', { message: 'Name already taken in this room' })
      return
    }

    const player = new Player(socket.id, playerName, room)
    game.addPlayer(player)
    socket.join(room)

    // Confirmer au nouveau joueur
    socket.emit('gameJoined', {
      room,
      playerName,
      isHost: player.isHost,
      players: game.players.map(p => ({ name: p.name, isHost: p.isHost })),
    })

    // Annoncer aux autres
    socket.to(room).emit('playerJoined', {
      playerName,
      isHost: player.isHost,
    })
  })

  // ── startGame ─────────────────────────────────────────────────────────────
  socket.on('startGame', ({ room }) => {
    const game = manager.get(room)
    if (!game) return

    const player = game.getPlayer(socket.id)
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only the host can start the game' })
      return
    }

    if (game.started && !game.over) {
      socket.emit('error', { message: 'Game already started' })
      return
    }

    game.start()

    // Envoyer à chaque joueur son index de pièce initial
    game.players.forEach(p => {
      const typeIndex = game.getNextPiece(p)
      const type = PIECE_TYPES[typeIndex]
      const nextTypeIndex = game.pieces[p.pieceIndex] 
      const nextType = nextTypeIndex !== undefined ? PIECE_TYPES[nextTypeIndex] : null
      const spawnX = SPAWN_X[type]

      io.to(p.id).emit('gameStarted', {
        pieceIndex: typeIndex,
        piece: { type, spawnX, spawnY: SPAWN_Y },
        nextPiece: { type: nextType },
      })
    })
  })

  // ── playerAction ──────────────────────────────────────────────────────────
  // Le serveur valide et relaye : la logique de mouvement reste côté client
  // (fonctions pures). Le serveur gère uniquement les pénalités et fin de partie.
  socket.on('playerAction', ({ room, action }) => {
    const game = manager.get(room)
    if (!game || !game.started) return

    const player = game.getPlayer(socket.id)
    if (!player || !player.isAlive) return

    // Les actions de mouvement sont gérées côté client (fonctions pures).
    // Ici on n'a rien à faire — le client applique la logique localement
    // et émet playerDead ou updateSpectrum selon le résultat.
    // Cette route est conservée pour compatibilité protocole et extensions futures.
  })

  // ── playerDead ────────────────────────────────────────────────────────────
  socket.on('playerDead', ({ room }) => {
    const game = manager.get(room)
    if (!game) return

    const player = game.getPlayer(socket.id)
    if (!player) return

    player.isAlive = false

    const winner = game.checkWinCondition()
    if (winner !== null || game.getAlivePlayers().length === 0) {
      game.over = true
      io.to(room).emit('gameOver', {
        winner: winner ? winner.name : null,
      })
    }
  })

  // ── updateSpectrum (client → serveur → autres joueurs) ────────────────────
  socket.on('updateSpectrum', ({ room, spectrum }) => {
    const game = manager.get(room)
    if (!game) return
    const player = game.getPlayer(socket.id)
    if (!player) return

    socket.to(room).emit('updateSpectrum', {
      playerName: player.name,
      spectrum,
    })
  })

  // ── linesCleared (pénalités) ──────────────────────────────────────────────
  socket.on('linesCleared', ({ room, linesCleared }) => {
    const game = manager.get(room)
    if (!game || !game.started) return

    const player = game.getPlayer(socket.id)
    if (!player || !player.isAlive) return

    const penaltyLines = linesCleared - 1
    if (penaltyLines <= 0) return

    // Envoyer la pénalité à tous les autres joueurs vivants
    game.getAlivePlayers()
      .filter(p => p.id !== socket.id)
      .forEach(p => {
        io.to(p.id).emit('addPenalty', { lines: penaltyLines })
      })
  })

  // ── requestNextPiece ─────────────────────────────────────────────────────
  socket.on('requestNextPiece', ({ room }) => {
    const game = manager.get(room)
    if (!game || !game.started) return

    const player = game.getPlayer(socket.id)
    if (!player || !player.isAlive) return

    const typeIndex = game.getNextPiece(player)
    const type = PIECE_TYPES[typeIndex]
    const nextTypeIndex = game.pieces[player.pieceIndex]
    const nextType = nextTypeIndex !== undefined ? PIECE_TYPES[nextTypeIndex] : null
    const spawnX = SPAWN_X[type]

    socket.emit('newPiece', {
      pieceIndex: typeIndex,
      piece: { type, spawnX, spawnY: SPAWN_Y },
      nextPiece: { type: nextType },
    })
  })

  // ── leaveGame ─────────────────────────────────────────────────────────────
  socket.on('leaveGame', ({ room }) => {
    handlePlayerLeave(socket, room)
  })

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    // Chercher dans toutes les rooms la présence de ce socket
    manager.getAll().forEach(game => {
      const player = game.getPlayer(socket.id)
      if (player) {
        handlePlayerLeave(socket, game.name)
      }
    })
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function handlePlayerLeave(socket, room) {
  const game = manager.get(room)
  if (!game) return

  const removed = game.removePlayer(socket.id)
  if (!removed) return

  socket.leave(room)

  if (game.players.length === 0) {
    manager.delete(room)
    return
  }

  // Trouver le nouveau host éventuel
  const newHost = game.players.find(p => p.isHost)

  io.to(room).emit('playerLeft', {
    playerName: removed.name,
    newHost: newHost ? newHost.name : null,
  })

  // Si la partie était en cours et qu'il ne reste qu'un seul joueur vivant
  if (game.started && !game.over) {
    const winner = game.checkWinCondition()
    if (winner !== null || game.getAlivePlayers().length === 0) {
      game.over = true
      io.to(room).emit('gameOver', {
        winner: winner ? winner.name : null,
      })
    }
  }
}

// ── Lancement ─────────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`Red Tetris server running on http://${HOST}:${PORT}`)
})

module.exports = { app, server, io, manager }
