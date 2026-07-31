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
  MODES_CHANGED,
  PLAYER_JOINED,
  PLAYER_LEFT,
} from "../actions/game";
import { DEFAULT_MODES } from "../../shared/constants";

const initialState = {
  room: null,
  started: false,
  over: false,
  winner: null,
  players: [], // [{ name, isHost }] — liste de la room (lobby)
  error: null, // message serveur (nom pris, partie déjà lancée…)
  connected: true, // socket vivante — false pendant une coupure réseau
  modes: DEFAULT_MODES, // modificateurs armés par le host
  modeTag: "CLASSIC", // étiquette de la manche terminée (posée par GAME_OVER)
};

const gameReducer = (state = initialState, action) => {
  switch (action.type) {
    case GAME_JOINED:
      return {
        ...state,
        room: action.payload.room,
        players: action.payload.players,
        started: action.payload.started || false,
        modes: action.payload.modes || state.modes,
        error: null,
      };

    case MODES_CHANGED:
      return { ...state, modes: action.payload.modes };

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
        modes: action.payload && action.payload.modes
          ? action.payload.modes
          : state.modes,
        error: null,
      };

    case GAME_OVER:
      return {
        ...state,
        over: true,
        winner: action.payload.winner,
        modeTag: action.payload.mode || "CLASSIC",
      };

    // Les modificateurs appartiennent à la room, pas à la manche : ils survivent
    // au reset, sinon le host devrait les rearmer entre chaque partie.
    case GAME_RESET:
      return {
        ...initialState,
        room: state.room,
        players: state.players,
        modes: state.modes,
      };

    default:
      return state;
  }
};

export default gameReducer;
