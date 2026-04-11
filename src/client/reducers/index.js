// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/index.js — combineReducers
// ─────────────────────────────────────────────────────────────────────────────

import { combineReducers } from 'redux'
import gameReducer from './game'
import playerReducer from './player'
import opponentsReducer from './opponents'

const rootReducer = combineReducers({
  game: gameReducer,
  player: playerReducer,
  opponents: opponentsReducer,
})

export default rootReducer
