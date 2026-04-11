// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/OpponentView.jsx
// Zéro `this` — composant fonctionnel
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'

/**
 * Affiche le nom + spectrum d'un adversaire.
 * @param {{ name: string, spectrum: number[], isAlive: boolean }} props
 */
const OpponentView = ({ name, spectrum, isAlive }) => {
  const maxHeight = 40 // px — hauteur max des barres de spectrum

  return (
    <div className={`opponent${isAlive ? '' : ' opponent--dead'}`}>
      <div className="opponent__name" title={name}>{name}</div>
      <div className="opponent__spectrum" role="img" aria-label={`spectrum of ${name}`}>
        {spectrum.map((height, col) => (
          <div
            key={col}
            className="opponent__bar"
            style={{ height: `${(height / 20) * maxHeight}px` }}
          />
        ))}
      </div>
    </div>
  )
}

export default React.memo(OpponentView)
