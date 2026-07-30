// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/game.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  CONNECTION,
  GAME_ERROR,
  GAME_JOINED,
  GAME_OVER,
  GAME_RESET,
  GAME_STARTED,
  PLAYER_JOINED,
  PLAYER_LEFT,
} from "../actions/game";

const initialState = {
  room: null,
  started: false,
  over: false,
  winner: null,
  players: [], // [{ name, isHost }] — liste de la room (lobby)
  error: null, // message serveur (nom pris, partie déjà lancée…)
  connected: true, // socket vivante — false pendant une coupure réseau
};

const gameReducer = (state = initialState, action) => {
  switch (action.type) {
    case GAME_JOINED:
      return {
        ...state,
        room: action.payload.room,
        players: action.payload.players,
        started: action.payload.started || false,
        error: null,
      };

    case GAME_ERROR:
      return { ...state, error: action.payload.message };

    case CONNECTION:
      return { ...state, connected: action.payload.connected };

    case PLAYER_JOINED:
      return {
        ...state,
        players: [
          ...state.players,
          { name: action.payload.playerName, isHost: action.payload.isHost },
        ],
      };

    case PLAYER_LEFT:
      return {
        ...state,
        players: state.players
          .filter((p) => p.name !== action.payload.playerName)
          .map((p) =>
            action.payload.newHost && p.name === action.payload.newHost
              ? { ...p, isHost: true }
              : p
          ),
      };

    // Une manche qui démarre efface le dernier message d'erreur : il porte sur
    // la manche précédente (« partie déjà lancée », refus de départ).
    case GAME_STARTED:
      return {
        ...state,
        started: true,
        over: false,
        winner: null,
        error: null,
      };

    case GAME_OVER:
      return { ...state, over: true, winner: action.payload.winner };

    case GAME_RESET:
      return { ...initialState, room: state.room, players: state.players };

    default:
      return state;
  }
};

export default gameReducer;
