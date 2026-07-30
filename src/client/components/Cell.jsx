// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Cell.jsx
// Zéro `this` — composant fonctionnel pur
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { COLOR_INDEX } from "../../shared/constants";

/**
 * Classe CSS d'une cellule — fonction pure.
 * @param {number}  value   0=vide, 1-7=pièce (voir COLOR_INDEX), 8=pénalité
 * @param {string} [state]  'empty' | 'ghost' | 'active' | 'stacked'.
 *                          Optionnel : les previews Next/Hold n'ont pas d'état.
 * @returns {string}
 */
export const cellClass = (value, state) => {
  if (state === "ghost") return "cell cell--ghost";
  if (state === "empty" || !value) return "cell cell--empty";
  if (value === 8) return "cell cell--penalty";

  const type = COLOR_INDEX[value];
  if (!type || type === "empty" || type === "penalty") {
    return "cell cell--empty";
  }

  return state ? `cell cell--${type} cell--${state}` : `cell cell--${type}`;
};

/**
 * Cellule individuelle du plateau.
 * @param {{ value: number, state?: string, id?: string }} props
 */
const Cell = React.forwardRef(({ value, state, id }, ref) => (
  <div id={id} ref={ref} className={cellClass(value, state)} />
));

export default React.memo(Cell);
