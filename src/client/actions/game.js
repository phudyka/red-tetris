// ─────────────────────────────────────────────────────────────────────────────
// src/client/actions/game.js — Action creators Redux (game slice)
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_JOINED  = 'GAME_JOINED'
export const PLAYER_JOINED = 'PLAYER_JOINED'
export const PLAYER_LEFT  = 'PLAYER_LEFT'
export const GAME_STARTED = 'GAME_STARTED'
export const GAME_OVER    = 'GAME_OVER'
export const GAME_RESET   = 'GAME_RESET'

export const gameJoined = (payload) => ({ type: GAME_JOINED,  payload })
export const playerJoined = (payload) => ({ type: PLAYER_JOINED, payload })
export const playerLeft = (payload) => ({ type: PLAYER_LEFT,  payload })
export const gameStarted = (payload) => ({ type: GAME_STARTED, payload })
export const gameOver = (payload) => ({ type: GAME_OVER,    payload })
export const gameReset = () => ({ type: GAME_RESET })
