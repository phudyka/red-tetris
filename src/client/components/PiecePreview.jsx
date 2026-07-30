// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/PiecePreview.jsx
// Grille 4×4 partagée par Next et Hold — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import Cell from "./Cell";
import { PIECES, TYPE_TO_COLOR_INDEX } from "../../shared/constants";

const SIZE = 4;

/**
 * Centre la shape d'une pièce dans une grille 4×4 — fonction pure.
 * @param {string|null} type  'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | null
 * @returns {number[][]}      matrice 4×4 de colorIndex (0 = vide)
 */
export const buildPreviewGrid = (type) => {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  if (!type || !PIECES[type]) return grid;

  const { shape } = PIECES[type];
  const rowOffset = Math.floor((SIZE - shape.length) / 2);
  const colOffset = Math.floor((SIZE - shape[0].length) / 2);

  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell !== 0) {
        grid[y + rowOffset][x + colOffset] = TYPE_TO_COLOR_INDEX[type];
      }
    });
  });
  return grid;
};

/**
 * @param {{ label: string, type: string|null, spent?: boolean }} props
 *   label — titre affiché ("Next", "Hold")
 *   type  — type de pièce à afficher, null si aucune
 *   spent — grisé (hold déjà utilisé pour cette pièce)
 */
const PiecePreview = ({ label, type, spent = false }) => {
  const grid = buildPreviewGrid(type);

  return (
    <div className={`preview${spent ? " preview--spent" : ""}`}>
      <p className="preview__label">{label}</p>
      <div
        className="preview__grid"
        role="img"
        aria-label={type ? `${label}: ${type} piece` : `${label}: empty`}
      >
        {grid.map((row, y) => (
          <div key={y} className="preview__row">
            {row.map((value, x) => <Cell key={`${y}-${x}`} value={value} />)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(PiecePreview);
