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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        alignItems: 'end',
        height: '40px',
        width: '100%',
        gap: '2px',
        filter: 'drop-shadow(0 0 8px #ff000066)',
        marginTop: '8px'
      }} role="img" aria-label={`spectrum of ${name}`}>
        {spectrum.map((h, i) => (
          <div key={i} style={{
            height: `${(h / 20) * 100}%`,
            background: 'linear-gradient(to top, #ff4444, #ff444400)',
            transition: 'height 0.1s ease-out',
            borderRadius: '2px 2px 0 0',
          }} />
        ))}
      </div>
    </div>
  )
}

export default React.memo(OpponentView)
