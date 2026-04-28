// ─────────────────────────────────────────────────────────────────────────────
// src/server/scoreLogic.js — Fonctions pures de score et leaderboard
// Utilisées par index.js — Testables unitairement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le score pour un nombre de lignes effacées (règle Tetris classique).
 * @param {number} linesCleared
 * @returns {number}
 */
const calcScore = (linesCleared) => {
  const table = { 1: 100, 2: 300, 3: 500, 4: 800 }
  return table[linesCleared] || 0
}

/**
 * Met à jour le leaderboard en mémoire (Map<string, number>).
 * Ne met à jour que si le nouveau score est supérieur au précédent.
 * Fonction pure — prend la Map en entrée et la mutate, retourne la Map.
 * (la Map est passée par référence — comportement attendu côté serveur)
 * @param {Map<string, number>} leaderboardMap
 * @param {string} playerName
 * @param {number} newScore
 * @returns {Map<string, number>}
 */
const updateLeaderboard = (leaderboardMap, playerName, newScore) => {
  const prev = leaderboardMap.get(playerName) || 0
  if (newScore > prev) {
    leaderboardMap.set(playerName, newScore)
  }
  return leaderboardMap
}

/**
 * Convertit la Map leaderboard en tableau trié desc, limité à 10 entrées.
 * @param {Map<string, number>} leaderboardMap
 * @returns {{ playerName: string, score: number }[]}
 */
const getLeaderboardArray = (leaderboardMap) => {
  return Array.from(leaderboardMap.entries())
    .map(([playerName, score]) => ({ playerName, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

/**
 * Vérifie si un board a changé depuis la dernière version envoyée.
 * Comparaison rapide par sérialisation JSON.
 * @param {number[][]|null} prev
 * @param {number[][]} next
 * @returns {boolean}
 */
const boardHasChanged = (prev, next) => {
  if (!prev) return true
  return JSON.stringify(prev) !== JSON.stringify(next)
}

module.exports = { calcScore, updateLeaderboard, getLeaderboardArray, boardHasChanged }
