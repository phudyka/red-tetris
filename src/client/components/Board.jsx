// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Board.jsx
// Grille 10×20 — divs + CSS grid — zéro Canvas, SVG, table
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Cell from './Cell'
import ParticleSystem from './ParticleSystem'
import { BOARD_WIDTH, BOARD_HEIGHT, PIECES, TYPE_TO_COLOR_INDEX } from '../../shared/constants'
import { placePiece, getHardDropPosition } from '../../shared/gameLogic'

/**
 * Pure function pour l'animation de lock via Web Animations API
 */
const animatePieceLock = (cells) => {
  cells.forEach((el, i) => {
    if (!el) return
    el.animate([
      { transform: 'translateZ(20px)', filter: 'brightness(2)' },
      { transform: 'translateZ(0px)', filter: 'brightness(1)' },
    ], { duration: 150, delay: i * 10, easing: 'cubic-bezier(0.34,1.56,0.64,1)' })
  })
}

/**
 * Pure function pour l'animation de destruction de ligne via Web Animations API
 */
const animateLineClear = (rowElements) => {
  rowElements.forEach(el => {
    if (!el) return
    el.animate([
      { transform: 'scaleX(1) translateZ(8px)', opacity: 1, filter: 'brightness(1)' },
      { transform: 'scaleX(1.1) translateZ(8px)', opacity: 1, filter: 'brightness(3)' },
      { transform: 'scaleX(0) translateZ(8px)', opacity: 0, filter: 'brightness(0)' },
    ], { duration: 250, easing: 'ease-in', fill: 'none' })
  })
}

/**
 * Fusionne le board persistant avec la pièce active et la ghost piece.
 * Retourne un tableau plat de BOARD_HEIGHT * BOARD_WIDTH cellules.
 */
const buildDisplayBoard = (board, currentPiece) => {
  // Convertit le board initial en objets "stacked" ou "empty"
  const displayBoard = board.map(row => 
    row.map(value => ({ value, state: value === 0 ? 'empty' : 'stacked' }))
  )

  if (!currentPiece || !currentPiece.shape) return displayBoard

  const { shape, x, y, type } = currentPiece
  const colorIndex = TYPE_TO_COLOR_INDEX[type]

  // 1. Placer la ghost piece
  const ghostY = getHardDropPosition(board, shape, x, y)
  if (ghostY !== null && ghostY !== undefined && ghostY !== y) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 0) {
          const ny = ghostY + r
          const nx = x + c
          if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
            if (displayBoard[ny][nx].value === 0) {
              displayBoard[ny][nx] = { value: colorIndex, state: 'ghost' }
            }
          }
        }
      }
    }
  }

  // 2. Placer la pièce active par-dessus
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] !== 0) {
        const ny = y + r
        const nx = x + c
        if (ny >= 0 && ny < BOARD_HEIGHT && nx >= 0 && nx < BOARD_WIDTH) {
          displayBoard[ny][nx] = { value: colorIndex, state: 'active' }
        }
      }
    }
  }

  return displayBoard
}

const Board = ({ clearingRows = [], lockingCells = [] }) => {
  const board        = useSelector(s => s.player.board)
  const currentPiece = useSelector(s => s.player.currentPiece)

  const board2D = useMemo(
    () => buildDisplayBoard(board, currentPiece),
    [board, currentPiece]
  )

  const cellsRef = useRef(new Map())

  // Déclencher l'animation Lock
  useEffect(() => {
    if (lockingCells && lockingCells.length > 0) {
      const domCells = lockingCells.map(c => cellsRef.current.get(`cell-${c.y}-${c.x}`))
      animatePieceLock(domCells)
    }
  }, [lockingCells])

  // Déclencher l'animation Clear
  useEffect(() => {
    if (clearingRows && clearingRows.length > 0) {
      const domCells = clearingRows.flatMap(y => 
        Array.from({ length: 10 }, (_, x) => cellsRef.current.get(`cell-${y}-${x}`))
      )
      animateLineClear(domCells)
    }
  }, [clearingRows])

  return (
    <div className="board" role="grid" aria-label="Tetris board">
      {board2D.map((row, y) => (
        <React.Fragment key={y}>
          {row.map((value, x) => {
            const cellObj = value // 'value' array array item is now { value, state }
            const id = `cell-${y}-${x}`
            return (
              <Cell
                key={`${y}-${x}`}
                id={id}
                ref={(el) => {
                  if (el) cellsRef.current.set(id, el)
                  else cellsRef.current.delete(id)
                }}
                value={cellObj.value}
                state={cellObj.state}
              />
            )
          })}
        </React.Fragment>
      ))}
      <ParticleSystem clearingRows={clearingRows} />
    </div>
  )
}

export default React.memo(Board)
