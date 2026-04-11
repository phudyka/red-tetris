// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Cell.jsx
// Zéro `this` — composant fonctionnel pur
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { COLOR_INDEX } from '../../shared/constants'

/**
 * Cellule individuelle du plateau.
 * @param {{ value: number, isGhost?: boolean }} props
 *   value    — 0=vide, 1-7=pièce (voir COLOR_INDEX), 8=pénalité
 *   isGhost  — true si c'est la ghost piece (preview de hard drop)
 */
const Cell = ({ value, isGhost }) => {
  const getCellClass = () => {
    if (isGhost) return 'cell cell--ghost'
    if (value === 0) return 'cell cell--empty'
    if (value === 8) return 'cell cell--penalty'
    const type = COLOR_INDEX[value]
    return `cell cell--${type}`
  }

  return <div className={getCellClass()} />
}

export default React.memo(Cell)
