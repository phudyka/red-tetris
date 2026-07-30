// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Cell.jsx
// Zéro `this` — composant fonctionnel pur
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { COLOR_INDEX } from "../../shared/constants";

/**
 * Classe CSS d'une cellule — fonction pure.
 * @param {number}   value    0=vide, 1-7=pièce (voir COLOR_INDEX), 8=pénalité
 * @param {string}  [state]   'empty' | 'ghost' | 'active' | 'stacked'.
 *                            Optionnel : les previews Next/Hold n'ont pas d'état.
 * @param {boolean} [rising]  cellule poussée vers le haut par une pénalité.
 *                            Jamais posée sur une case vide ou un ghost : ils ne
 *                            peignent rien, les animer coûterait sans se voir.
 * @returns {string}
 */
export const cellClass = (value, state, rising) => {
  if (state === "ghost") return "cell cell--ghost";
  if (state === "empty" || !value) return "cell cell--empty";

  const rise = rising ? " cell--rising" : "";
  if (value === 8) return `cell cell--penalty${rise}`;

  const type = COLOR_INDEX[value];
  if (!type || type === "empty" || type === "penalty") {
    return "cell cell--empty";
  }

  return state
    ? `cell cell--${type} cell--${state}${rise}`
    : `cell cell--${type}`;
};

/**
 * Cellule individuelle du plateau.
 * `style` ne sert qu'au calque de la pièce en cours : placement explicite dans
 * la grille (`gridColumn`/`gridRow`), les cellules du tas n'en ont pas.
 * @param {{ value: number, state?: string, rising?: boolean, id?: string,
 *           style?: object }} props
 */
const Cell = React.forwardRef(({ value, state, rising, id, style }, ref) => (
  <div
    id={id}
    ref={ref}
    className={cellClass(value, state, rising)}
    style={style}
  />
));

export default React.memo(Cell);
