// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Cell.jsx
// Zéro `this` — composant fonctionnel pur
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { COLOR_INDEX } from '../../shared/constants'

/**
 * Cellule individuelle du plateau.
 * @param {{ value: number, isGhost?: boolean, isLocking?: boolean, isClearing?: boolean }} props
 *   value      — 0=vide, 1-7=pièce (voir COLOR_INDEX), 8=pénalité
 *   isGhost    — true si c'est la ghost piece (preview de hard drop)
 *   isLocking  — true pour l'animation de flash au verrouillage
 *   isClearing — true pour l'animation de flash lors d'un effacement de ligne
 */
const Cell = ({ value, isGhost, isLocking, isClearing }) => {
  const getCellClass = () => {
    let classes = 'cell'
    if (isGhost) {
      classes += ' cell--ghost'
    } else if (value === 0) {
      classes += ' cell--empty'
    } else if (value === 8) {
      classes += ' cell--penalty'
    } else {
      const type = COLOR_INDEX[value]
      classes += ` cell--${type}`
    }

    if (isLocking) classes += ' cell--lock-flash'
    if (isClearing) classes += ' cell--clearing' // J'utilise cell--clearing pour être sûr mais je vais adapter le CSS si besoin

    return classes
  }

  return <div className={getCellClass()} />
}

export default React.memo(Cell)
