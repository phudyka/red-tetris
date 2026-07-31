// ─────────────────────────────────────────────────────────────────────────────
// src/server/leaderboardStore.js — Persistance du classement
// Le sujet n'exige aucune persistance ; le bonus la demande. Un fichier JSON
// suffit : dix entrées, écrites à la fin d'une partie, relues au démarrage.
// Aucune base, aucune dépendance — et surtout aucun crash si le fichier manque
// ou a été édité à la main : le classement redémarre à vide plutôt que
// d'empêcher le serveur de se lancer.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const LEADERBOARD_FILE = path.join(__dirname, "../../leaderboard.json");

/**
 * Une entrée valide et rien d'autre : le fichier est éditable à la main, et une
 * ligne bancale ne doit pas contaminer le classement entier.
 * @param {*} entry
 * @returns {boolean}
 */
const isValidEntry = (entry) =>
  Array.isArray(entry) &&
  entry.length === 2 &&
  typeof entry[0] === "string" &&
  entry[0].length > 0 &&
  entry[1] !== null &&
  typeof entry[1] === "object" &&
  Number.isFinite(entry[1].score);

/**
 * Relit le classement sur disque.
 * @param {string} [file]
 * @returns {Map<string, {score: number, mode: string}>}  vide si absent/illisible
 */
const loadLeaderboard = (file = LEADERBOARD_FILE) => {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed
        .filter(isValidEntry)
        .map(([name, value]) => [name, {
          score: value.score,
          mode: typeof value.mode === "string" ? value.mode : "CLASSIC",
        }]),
    );
  } catch {
    return new Map();
  }
};

/**
 * Écrit le classement sur disque. Une écriture qui échoue (disque plein, droits)
 * ne doit pas interrompre la fin de partie : le classement en mémoire fait foi
 * pour la session en cours.
 * @param {Map<string, {score: number, mode: string}>} leaderboardMap
 * @param {string} [file]
 * @returns {boolean}  succès de l'écriture
 */
const saveLeaderboard = (leaderboardMap, file = LEADERBOARD_FILE) => {
  try {
    fs.writeFileSync(file, JSON.stringify([...leaderboardMap], null, 2));
    return true;
  } catch {
    return false;
  }
};

module.exports = { loadLeaderboard, saveLeaderboard, LEADERBOARD_FILE };
