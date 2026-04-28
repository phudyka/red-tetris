// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/index.js — combineReducers
// ─────────────────────────────────────────────────────────────────────────────

import { combineReducers } from 'redux'
import gameReducer        from './game'
import playerReducer      from './player'
import opponentsReducer   from './opponents'
import scoresReducer      from './scores'
import leaderboardReducer from './leaderboard'

const rootReducer = combineReducers({
  game:        gameReducer,
  player:      playerReducer,
  opponents:   opponentsReducer,
  scores:      scoresReducer,
  leaderboard: leaderboardReducer,
})

export default rootReducer
