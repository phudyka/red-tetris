// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/leaderboard.js
// State : [{ playerName: string, score: number }] trié par score desc
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import { LEADERBOARD_UPDATE } from "../actions/leaderboard";

// initialState : tableau vide
const initialState = [];

const leaderboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case LEADERBOARD_UPDATE:
      // payload = [{ playerName, score }] déjà trié par le serveur (desc)
      return Array.isArray(action.payload) ? action.payload : state;

    default:
      return state;
  }
};

export default leaderboardReducer;
