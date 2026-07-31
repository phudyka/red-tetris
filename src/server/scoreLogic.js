// ─────────────────────────────────────────────────────────────────────────────
// src/server/scoreLogic.js — Fonctions pures de score et leaderboard
// Barème de la Tetris Guideline. Utilisées par index.js — testables unitairement.
// ─────────────────────────────────────────────────────────────────────────────

const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };
// Un T-spin rapporte plus qu'un effacement classique du même nombre de lignes —
// y compris à zéro ligne, où c'est la seule chose qui récompense le placement.
const TSPIN_SCORES = { 0: 400, 1: 800, 2: 1200, 3: 1600 };

/**
 * Score de base d'un effacement, multiplié par le niveau.
 * @param {number}  linesCleared
 * @param {number} [level]  1 par défaut
 * @param {boolean} [tSpin]
 * @returns {number}
 */
const calcScore = (linesCleared, level = 1, tSpin = false) => {
  const table = tSpin ? TSPIN_SCORES : LINE_SCORES;
  const base = table[linesCleared];
  return base ? base * Math.max(1, level) : 0;
};

/**
 * Bonus de combo : 50 × combo × niveau à partir du deuxième effacement
 * consécutif. `combo` est le compteur du joueur APRÈS incrément (0 = premier
 * effacement de la série, donc aucun bonus).
 * @param {number} combo
 * @param {number} [level]
 * @returns {number}
 */
const comboScore = (combo, level = 1) =>
  combo > 0 ? 50 * combo * Math.max(1, level) : 0;

/**
 * Points de descente : 1 par rangée en soft drop, 2 en hard drop.
 * @param {number}  cells
 * @param {boolean} [hard]
 * @returns {number}
 */
const dropScore = (cells, hard = false) => {
  const n = Math.trunc(Number(cells));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * (hard ? 2 : 1);
};

/**
 * Un effacement est « difficile » — donc éligible au back-to-back — s'il vide
 * quatre lignes d'un coup ou s'il vient d'un T-spin. Deux difficiles à la suite
 * valent 1,5× ; une ligne simple entre les deux casse la chaîne.
 * @param {number}  linesCleared
 * @param {boolean} tSpin
 * @returns {boolean}
 */
const isDifficultClear = (linesCleared, tSpin) =>
  linesCleared >= 4 || (tSpin && linesCleared > 0);

/**
 * Applique le multiplicateur back-to-back.
 * @param {number}  score
 * @param {boolean} active  chaîne déjà en cours avant cet effacement
 * @returns {number}
 */
const applyBackToBack = (score, active) =>
  active ? Math.round(score * 1.5) : score;

/**
 * Met à jour le leaderboard (Map<string, {score, mode}>).
 * Ne met à jour que si le nouveau score est supérieur au précédent.
 * @param {Map<string, {score: number, mode: string}>} leaderboardMap
 * @param {string} playerName
 * @param {number} newScore
 * @param {string} [mode]  étiquette des modificateurs de la manche
 * @returns {Map<string, {score: number, mode: string}>}
 */
const updateLeaderboard = (
  leaderboardMap,
  playerName,
  newScore,
  mode = "CLASSIC",
) => {
  const prev = leaderboardMap.get(playerName);
  if (!prev || newScore > prev.score) {
    // Le mode voyage avec le score : un record établi en pièces invisibles et
    // un record en partie classique ne se comparent pas, la ligne doit dire
    // lequel des deux elle raconte.
    leaderboardMap.set(playerName, { score: newScore, mode });
  }
  return leaderboardMap;
};

/**
 * Convertit la Map leaderboard en tableau trié desc, limité à 10 entrées.
 * @param {Map<string, {score: number, mode: string}>} leaderboardMap
 * @returns {{ playerName: string, score: number, mode: string }[]}
 */
const getLeaderboardArray = (leaderboardMap) => {
  return Array.from(leaderboardMap.entries())
    .map(([playerName, entry]) => ({
      playerName,
      score: entry.score,
      mode: entry.mode || "CLASSIC",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
};

module.exports = {
  calcScore,
  comboScore,
  dropScore,
  isDifficultClear,
  applyBackToBack,
  updateLeaderboard,
  getLeaderboardArray,
};
