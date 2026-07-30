// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/opponents.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  ADD_OPPONENT,
  OPPONENT_DIED,
  SET_OPPONENTS,
  UPDATE_SPECTRUM,
} from "../actions/opponents";
import { GAME_RESET, GAME_STARTED, PLAYER_LEFT } from "../actions/game";

// State : [{ name, spectrum: number[10], isAlive: boolean }]
const initialState = [];

const opponentsReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_OPPONENTS:
      // payload null ou undefined → reset
      if (!action.payload) return [];
      return action.payload;

    case UPDATE_SPECTRUM:
      return state.map((opp) =>
        opp.name === action.payload.playerName
          ? { ...opp, spectrum: action.payload.spectrum }
          : opp
      );

    case OPPONENT_DIED:
      return state.map((opp) =>
        opp.name === action.payload ? { ...opp, isAlive: false } : opp
      );

    case ADD_OPPONENT: {
      const oppName = typeof action.payload === "string"
        ? action.payload
        : action.payload.name;
      const isAlive = typeof action.payload === "object" &&
          action.payload.isAlive !== undefined
        ? action.payload.isAlive
        : true;
      // N'ajoute pas si déjà présent
      if (state.some((opp) => opp.name === oppName)) return state;
      return [...state, {
        name: oppName,
        spectrum: Array(10).fill(0),
        isAlive,
      }];
    }

    case PLAYER_LEFT:
      return state.filter((opp) => opp.name !== action.payload.playerName);

    case GAME_STARTED:
    case GAME_RESET:
      return state.map((opp) => ({
        ...opp,
        isAlive: true,
        spectrum: Array(10).fill(0),
      }));

    default:
      return state;
  }
};

export default opponentsReducer;
