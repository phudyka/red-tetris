// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/game.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  GAME_JOINED,
  PLAYER_JOINED,
  PLAYER_LEFT,
  GAME_STARTED,
  GAME_OVER,
  GAME_RESET,
} from '../actions/game'

const initialState = {
  room: null,
  started: false,
  over: false,
  winner: null,
  players: [],   // [{ name, isHost }] — liste de la room (lobby)
}

const gameReducer = (state = initialState, action) => {
  switch (action.type) {
    case GAME_JOINED:
      return {
        ...state,
        room: action.payload.room,
        players: action.payload.players,
        started: action.payload.started || false,
      }

    case PLAYER_JOINED:
      return {
        ...state,
        players: [
          ...state.players,
          { name: action.payload.playerName, isHost: action.payload.isHost },
        ],
      }

    case PLAYER_LEFT:
      return {
        ...state,
        players: state.players
          .filter(p => p.name !== action.payload.playerName)
          .map(p =>
            action.payload.newHost && p.name === action.payload.newHost
              ? { ...p, isHost: true }
              : p
          ),
      }

    case GAME_STARTED:
      return { ...state, started: true, over: false, winner: null }

    case GAME_OVER:
      return { ...state, over: true, winner: action.payload.winner }

    case GAME_RESET:
      return { ...initialState, room: state.room, players: state.players }

    default:
      return state
  }
}

export default gameReducer
