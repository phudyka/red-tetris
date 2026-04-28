// ─────────────────────────────────────────────────────────────────────────────
// src/client/actions/leaderboard.js — Action creators Redux (leaderboard slice)
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

export const LEADERBOARD_UPDATE = 'LEADERBOARD_UPDATE'

export const leaderboardUpdate = (payload) => ({ type: LEADERBOARD_UPDATE, payload })
