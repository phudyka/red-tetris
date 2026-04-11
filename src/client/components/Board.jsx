// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Board.jsx
// Grille 10×20 — divs + CSS grid — zéro Canvas, SVG, table
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import Cell from './Cell'
import { BOARD_WIDTH, BOARD_HEIGHT, PIECES, TYPE_TO_COLOR_INDEX } from '../../shared/constants'
import { placePiece, getHardDropPosition } from '../../shared/gameLogic'

/**
 * Fusionne le board persistant avec la pièce active et la ghost piece.
 * Retourne un tableau plat de BOARD_HEIGHT * BOARD_WIDTH cellules.
 */
const buildDisplayBoard = (board, currentPiece, ghostY) => {
  if (!currentPiece || !currentPiece.shape) return board.flat()

  const { shape, x, y, type } = currentPiece
  const colorIndex = TYPE_TO_COLOR_INDEX[type]

  // 1. Placer la ghost piece (si ghostY différent de y)
  let displayBoard = board
  if (ghostY !== null && ghostY !== undefined && ghostY !== y) {
    displayBoard = board.map(row => [...row])
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] === 0) continue
        const ny = ghostY + row
        const nx = x + col
        if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
          if (displayBoard[ny][nx] === 0) displayBoard[ny][nx] = -1 // marqueur ghost
        }
      }
    }
  }

  // 2. Placer la pièce active par-dessus
  const boardWithPiece = placePiece(displayBoard, shape, x, y, colorIndex)

  return boardWithPiece.flat()
}

const Board = () => {
  const board        = useSelector(s => s.player.board)
  const currentPiece = useSelector(s => s.player.currentPiece)
  const ghostY       = useSelector(s => s.player.ghostY)

  const cells = useMemo(
    () => buildDisplayBoard(board, currentPiece, ghostY),
    [board, currentPiece, ghostY]
  )

  return (
    <div className="board" role="grid" aria-label="Tetris board">
      {cells.map((value, idx) => (
        <Cell
          key={idx}
          value={value === -1 ? 0 : value}
          isGhost={value === -1}
        />
      ))}
    </div>
  )
}

export default React.memo(Board)
