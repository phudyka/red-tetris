// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/opponents.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  SET_OPPONENTS,
  UPDATE_SPECTRUM,
  OPPONENT_DIED,
  ADD_OPPONENT,
} from '../actions/opponents'
import { PLAYER_LEFT } from '../actions/game'
import { GAME_RESET } from '../actions/game'

// State : [{ name, spectrum: number[10], isAlive: boolean }]
const initialState = []

const opponentsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_OPPONENTS:
      // payload null ou undefined → reset
      if (!action.payload) return []
      return action.payload

    case UPDATE_SPECTRUM:
      return state.map(opp =>
        opp.name === action.payload.playerName
          ? { ...opp, spectrum: action.payload.spectrum }
          : opp
      )

    case OPPONENT_DIED:
      return state.map(opp =>
        opp.name === action.payload
          ? { ...opp, isAlive: false }
          : opp
      )

    case ADD_OPPONENT:
      // N'ajoute pas si déjà présent
      if (state.some(opp => opp.name === action.payload)) return state
      return [...state, { name: action.payload, spectrum: Array(10).fill(0), isAlive: true }]

    case PLAYER_LEFT:
      return state.filter(opp => opp.name !== action.payload.playerName)

    case GAME_RESET:
      return state.map(opp => ({ ...opp, isAlive: true, spectrum: Array(10).fill(0) }))

    default:
      return state
  }
}

export default opponentsReducer
