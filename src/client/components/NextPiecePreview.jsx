import React from 'react'
import { useSelector } from 'react-redux'
import { PIECES } from '../../shared/constants'
import Cell from './Cell'

const NextPiecePreview = () => {
  const nextType = useSelector(s => s.player.nextPieceType)

  const renderGrid = () => {
    const grid = Array.from({ length: 4 }, () => Array(4).fill(0))
    if (!nextType || !PIECES[nextType]) {
      return grid
    }

    const { shape } = PIECES[nextType]
    // Centrer la pièce dans la grille 4x4
    const rowOffset = Math.floor((4 - shape.length) / 2)
    const colOffset = Math.floor((4 - shape[0].length) / 2)

    shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          grid[y + rowOffset][x + colOffset] = nextType
        }
      })
    })
    return grid
  }

  const grid = renderGrid()

  return (
    <div className="preview-container">
      <p className="game-sidebar__title">Next</p>
      <div className="next-piece-grid">
        {grid.map((row, y) => (
          <div key={y} className="preview-row">
            {row.map((cell, x) => (
              <Cell 
                key={`${y}-${x}`} 
                value={cell === 0 ? 0 : Object.keys(PIECES).indexOf(cell) + 1} 
              />
            ))}
          </div>
        ))}
      </div>
      <style jsx="true">{`
        .preview-container {
          margin-bottom: 24px;
        }
        .next-piece-grid {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 8px;
          width: fit-content;
        }
        .preview-row {
          display: flex;
        }
        /* On réduit un peu la taille des cellules pour la preview */
        .preview-row :global(.cell) {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  )
}

export default NextPiecePreview
