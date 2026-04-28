// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/scores.js
// State : Map-like object { [playerName]: number }
// Mise à jour temps réel via score:update socket event
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import { SCORE_UPDATE, SCORES_RESET } from '../actions/scores'
import { GAME_RESET } from '../actions/game'

// initialState : objet vide — clés = noms des joueurs, valeurs = scores
const initialState = {}

const scoresReducer = (state = initialState, action) => {
  switch (action.type) {
    case SCORE_UPDATE: {
      const { playerName, score } = action.payload
      return { ...state, [playerName]: score }
    }

    case SCORES_RESET:
    case GAME_RESET:
      return initialState

    default:
      return state
  }
}

export default scoresReducer
