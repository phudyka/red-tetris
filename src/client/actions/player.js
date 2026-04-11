// ─────────────────────────────────────────────────────────────────────────────
// src/client/actions/player.js — Action creators Redux (player slice)
// ─────────────────────────────────────────────────────────────────────────────

export const SET_PLAYER   = 'SET_PLAYER'
export const SET_BOARD    = 'SET_BOARD'
export const NEW_PIECE    = 'NEW_PIECE'
export const SET_GHOST    = 'SET_GHOST'
export const ADD_PENALTY  = 'ADD_PENALTY'
export const PLAYER_DIED  = 'PLAYER_DIED'
export const RESET_PLAYER = 'RESET_PLAYER'

export const setPlayer   = (payload) => ({ type: SET_PLAYER,   payload })
export const setBoard    = (board)   => ({ type: SET_BOARD,    payload: board })
export const newPiece    = (payload) => ({ type: NEW_PIECE,    payload })
export const setGhost    = (ghostY)  => ({ type: SET_GHOST,    payload: ghostY })
export const addPenalty  = (lines)   => ({ type: ADD_PENALTY,  payload: lines })
export const playerDied  = ()        => ({ type: PLAYER_DIED })
export const resetPlayer = ()        => ({ type: RESET_PLAYER })
