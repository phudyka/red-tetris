// ─────────────────────────────────────────────────────────────────────────────
// src/server/validation.js — Bornes sur ce qui arrive du client
// Le client fait autorité sur SON plateau (voir CLAUDE.md), jamais sur la
// ressource partagée : nom de room, nom de joueur et pénalités infligées aux
// autres sont vérifiés ici avant d'entrer dans l'état du serveur.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LABEL_LENGTH = 24;
const MAX_LINES_CLEARED = 4;
// Une pièce ne peut pas descendre de plus de rangées qu'en compte le plateau.
const MAX_DROP_CELLS = 20;

/**
 * Room et nom de joueur viennent d'une URL que n'importe qui compose.
 * @param {*} value
 * @returns {boolean}
 */
const isValidLabel = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= MAX_LABEL_LENGTH;

/**
 * Borne le nombre de lignes déclaré : au-delà de 4, la valeur ne peut pas
 * venir d'une partie honnête et se transformerait en pénalité pour les autres.
 * @param {*} value
 * @returns {number}  entier dans [0, 4]
 */
const clampLinesCleared = (value) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_LINES_CLEARED);
};

/**
 * Borne la distance de chute déclarée : elle vaut des points, donc elle vaut
 * la peine d'être mentie.
 * @param {*} value
 * @returns {number}  entier dans [0, 20]
 */
const clampDropCells = (value) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_DROP_CELLS);
};

module.exports = {
  isValidLabel,
  clampLinesCleared,
  clampDropCells,
  MAX_LABEL_LENGTH,
};
