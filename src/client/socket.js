// ─────────────────────────────────────────────────────────────────────────────
// src/client/socket.js
// Initialise la connexion socket.io-client — exposé comme fonctions pures
// Zéro `this` — pas de classe
// ─────────────────────────────────────────────────────────────────────────────

import { io } from 'socket.io-client'
import {
  gameJoined,
  playerJoined,
  playerLeft,
  gameStarted,
  gameOver,
  gameReset,
} from './actions/game'
import {
  setPlayer,
  newPiece,
  addPenalty,
  playerDied,
} from './actions/player'
import { setOpponents, updateSpectrum, opponentDied, addOpponent } from './actions/opponents'

let socket = null

/**
 * Initialise la connexion socket.io et enregistre tous les listeners.
 * Doit être appelée une seule fois au montage de l'app.
 * @param {Function} dispatch  — Redux dispatch
 */
export const initSocket = (dispatch) => {
  if (socket) return socket

  socket = io(window.location.origin, {
    transports: ['websocket'],
  })

  socket.on('gameJoined', (payload) => {
    dispatch(gameJoined(payload))
    dispatch(setPlayer({ name: payload.playerName, isHost: payload.isHost }))
    dispatch(setOpponents(
      payload.players
        .filter(p => p.name !== payload.playerName)
        .map(p => ({ name: p.name, spectrum: Array(10).fill(0), isAlive: true }))
    ))
  })

  socket.on('playerJoined', (payload) => {
    dispatch(playerJoined(payload))
    // Ajouter l'adversaire dans la liste opponents sans écraser les existants
    dispatch(addOpponent(payload.playerName))
  })

  socket.on('playerLeft', (payload) => {
    dispatch(playerLeft(payload))
  })

  socket.on('gameStarted', (payload) => {
    dispatch(gameStarted(payload))
    dispatch(newPiece(payload))
  })

  socket.on('newPiece', (payload) => {
    dispatch(newPiece(payload))
  })

  socket.on('updateSpectrum', (payload) => {
    dispatch(updateSpectrum(payload))
  })

  socket.on('addPenalty', ({ lines }) => {
    dispatch(addPenalty(lines))
  })

  socket.on('gameOver', (payload) => {
    dispatch(gameOver(payload))
  })

  socket.on('error', ({ message }) => {
    console.error('[socket] Server error:', message)
  })

  return socket
}

// ── Émetteurs ─────────────────────────────────────────────────────────────────

export const emitJoinGame = (room, playerName) => {
  if (socket) socket.emit('joinGame', { room, playerName })
}

export const emitStartGame = (room) => {
  if (socket) socket.emit('startGame', { room })
}

export const emitAction = (room, action) => {
  if (socket) socket.emit('playerAction', { room, action })
}

export const emitPlayerDead = (room) => {
  if (socket) socket.emit('playerDead', { room })
}

export const emitLeaveGame = (room) => {
  if (socket) socket.emit('leaveGame', { room })
}

export const emitLinesCleared = (room, linesCleared) => {
  if (socket) socket.emit('linesCleared', { room, linesCleared })
}

export const emitRequestNextPiece = (room) => {
  if (socket) socket.emit('requestNextPiece', { room })
}

export const emitUpdateSpectrum = (room, spectrum) => {
  if (socket) socket.emit('updateSpectrum', { room, spectrum })
}

export const getSocket = () => socket
