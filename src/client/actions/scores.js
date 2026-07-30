// ─────────────────────────────────────────────────────────────────────────────
// src/client/actions/scores.js — Action creators Redux (scores slice)
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_UPDATE = "SCORE_UPDATE";
export const SCORES_RESET = "SCORES_RESET";

export const scoreUpdate = (payload) => ({ type: SCORE_UPDATE, payload });
export const scoresReset = () => ({ type: SCORES_RESET });
