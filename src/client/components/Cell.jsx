// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Cell.jsx
// Zéro `this` — composant fonctionnel pur
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { COLOR_INDEX } from '../../shared/constants'

/**
 * Cellule individuelle du plateau.
 * @param {{ value: number, state: string, id: string }} props
 *   value      — 0=vide, 1-7=pièce (voir COLOR_INDEX), 8=pénalité
 *   state      — 'empty' | 'ghost' | 'active' | 'stacked'
 */
const Cell = React.forwardRef(({ value, state, id }, ref) => {
  const getCellClass = () => {
    let classes = 'cell'
    if (state === 'empty') {
      classes += ' cell--empty'
    } else if (state === 'ghost') {
      classes += ' cell--ghost'
    } else if (value === 8) {
      classes += ' cell--penalty'
    } else {
      const type = COLOR_INDEX[value]
      classes += ` cell--${type} cell--${state}`
    }
    return classes
  }

  return <div id={id} ref={ref} className={getCellClass()} />
})

export default React.memo(Cell)
