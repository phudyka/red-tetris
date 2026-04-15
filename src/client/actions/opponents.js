// ─────────────────────────────────────────────────────────────────────────────
// src/client/actions/opponents.js — Action creators Redux (opponents slice)
// ─────────────────────────────────────────────────────────────────────────────

export const SET_OPPONENTS    = 'SET_OPPONENTS'
export const UPDATE_SPECTRUM  = 'UPDATE_SPECTRUM'
export const OPPONENT_DIED    = 'OPPONENT_DIED'
export const ADD_OPPONENT     = 'ADD_OPPONENT'

export const setOpponents    = (opponents) => ({ type: SET_OPPONENTS,   payload: opponents })
export const updateSpectrum  = (payload)   => ({ type: UPDATE_SPECTRUM, payload })
export const opponentDied    = (name)      => ({ type: OPPONENT_DIED,   payload: name })
export const addOpponent     = (payload)   => ({ type: ADD_OPPONENT,    payload })
