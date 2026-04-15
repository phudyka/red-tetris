// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Game.jsx
// Conteneur principal en jeu — boucle de jeu + clavier
// Zéro `this` — logique via fonctions pures de shared/gameLogic
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Board from './Board'
import OpponentView from './OpponentView'
import GameOver from './GameOver'

import useGameLoop from '../hooks/useGameLoop'
import useKeyboard from '../hooks/useKeyboard'

import { setBoard, playerDied, newPiece as newPieceAction } from '../actions/player'
import { opponentDied } from '../actions/opponents'

import {
  isValidPosition,
  placePiece,
  clearLines,
  computeSpectrum,
  getHardDropPosition,
} from '../../shared/gameLogic'

import {
  PIECES,
  TYPE_TO_COLOR_INDEX,
  SPAWN_X,
  SPAWN_Y,
  TICK_INTERVAL,
} from '../../shared/constants'

import {
  emitPlayerDead,
  emitLinesCleared,
  emitRequestNextPiece,
  emitUpdateSpectrum,
} from '../socket'

const Game = () => {
  const dispatch   = useDispatch()
  const room       = useSelector(s => s.game.room)
  const started    = useSelector(s => s.game.started)
  const over       = useSelector(s => s.game.over)
  const isAlive    = useSelector(s => s.player.isAlive)
  const board      = useSelector(s => s.player.board)
  const piece      = useSelector(s => s.player.currentPiece)
  const opponents  = useSelector(s => s.opponents)

  // Flag last-frame : si la pièce est en train d'atterrir
  const isLandingRef = useRef(false)

  const isPlaying = started && !over && isAlive

  // Détection Game Over
  useEffect(() => {
    if (!piece || !piece.shape || !board || !isPlaying) return

    if (!isValidPosition(board, piece.shape, piece.x, piece.y)) {
      dispatch(playerDied())
      emitPlayerDead(room)
    }
  }, [piece, board, isPlaying, dispatch, room])

  // ── Lock piece : place la pièce, efface les lignes, demande la suivante ────
  const lockPiece = useCallback((currentBoard, currentPieceArg) => {
    if (!currentPieceArg || !currentPieceArg.shape) return

    const colorIndex = TYPE_TO_COLOR_INDEX[currentPieceArg.type]
    const newBoard = placePiece(currentBoard, currentPieceArg.shape, currentPieceArg.x, currentPieceArg.y, colorIndex)
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)

    dispatch(setBoard(clearedBoard))
    dispatch({ type: 'SET_PIECE', payload: null })

    if (linesCleared > 0) {
      emitLinesCleared(room, linesCleared)
    }

    // Envoyer le spectrum mis à jour aux adversaires
    const spectrum = computeSpectrum(clearedBoard)
    emitUpdateSpectrum(room, spectrum)

    isLandingRef.current = false
    emitRequestNextPiece(room)
  }, [dispatch, room])

  // ── Tick de la boucle de jeu ───────────────────────────────────────────────
  const onTick = useCallback(() => {
    if (!piece || !piece.shape || !board) return

    const nextY = piece.y + 1

    if (isValidPosition(board, piece.shape, piece.x, nextY)) {
      // La pièce peut descendre
      isLandingRef.current = false
      dispatch({ type: 'SET_PIECE', payload: { ...piece, y: nextY } })
    } else {
      // La pièce touche quelque chose
      if (isLandingRef.current) {
        // Deuxième tick consécutif bloqué → placement définitif (last-frame rule)
        lockPiece(board, piece)
      } else {
        // Premier tick bloqué → on accorde un tick de grâce
        isLandingRef.current = true
      }
    }
  }, [piece, board, dispatch, lockPiece])

  useGameLoop(isPlaying, TICK_INTERVAL, onTick)

  // ── Handlers clavier ─────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    if (!piece) return
    if (isValidPosition(board, piece.shape, piece.x - 1, piece.y)) {
      const updated = { ...piece, x: piece.x - 1 }
      dispatch({ type: 'SET_PIECE', payload: updated })
    }
  }, [piece, board, dispatch])

  const moveRight = useCallback(() => {
    if (!piece) return
    if (isValidPosition(board, piece.shape, piece.x + 1, piece.y)) {
      const updated = { ...piece, x: piece.x + 1 }
      dispatch({ type: 'SET_PIECE', payload: updated })
    }
  }, [piece, board, dispatch])

  const rotate = useCallback(() => {
    if (!piece) return
    const { shape } = piece
    // Rotation 90° clockwise
    const cols = shape[0].length
    const rows = shape.length
    const rotated = Array.from({ length: cols }, (_, c) =>
      Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
    )
    // Wall kick : essayer x, x-1, x+1
    const kicks = [0, -1, 1, -2, 2]
    for (const kick of kicks) {
      if (isValidPosition(board, rotated, piece.x + kick, piece.y)) {
        const updated = { ...piece, shape: rotated, x: piece.x + kick }
        dispatch({ type: 'SET_PIECE', payload: updated })
        break
      }
    }
  }, [piece, board, dispatch])

  const softDrop = useCallback(() => {
    if (!piece) return
    const nextY = piece.y + 1
    if (isValidPosition(board, piece.shape, piece.x, nextY)) {
      const updated = { ...piece, y: nextY }
      dispatch({ type: 'SET_PIECE', payload: updated })
      isLandingRef.current = false
    } else {
      if (isLandingRef.current) {
        lockPiece(board, piece)
      } else {
        isLandingRef.current = true
      }
    }
  }, [piece, board, dispatch, lockPiece])

  const hardDrop = useCallback(() => {
    if (!piece) return
    const finalY = getHardDropPosition(board, piece.shape, piece.x, piece.y)
    const landed = { ...piece, y: finalY }
    dispatch({ type: 'SET_PIECE', payload: landed })
    lockPiece(board, landed)
  }, [piece, board, dispatch, lockPiece])

  const handlers = useMemo(
    () => ({ moveLeft, moveRight, rotate, softDrop, hardDrop }),
    [moveLeft, moveRight, rotate, softDrop, hardDrop]
  )

  useKeyboard(isPlaying, handlers)

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (over) return <GameOver />

  return (
    <div className="game-layout">
      {/* Sidebar gauche — adversaires */}
      {opponents.length > 0 && (
        <aside className="game-sidebar">
          <p className="game-sidebar__title">Opponents</p>
          {opponents.map(opp => (
            <OpponentView
              key={opp.name}
              name={opp.name}
              spectrum={opp.spectrum}
              isAlive={opp.isAlive}
            />
          ))}
        </aside>
      )}

      {/* Plateau principal */}
      <Board />

      {/* Sidebar droite — infos */}
      <aside className="game-sidebar">
        <p className="game-sidebar__title">Room</p>
        <p style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', color: 'var(--accent)' }}>
          {room}
        </p>
        {!isAlive && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'var(--accent)', fontFamily: 'Orbitron, monospace', fontSize: '0.8rem' }}>
              ELIMINATED
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
              Watching game…
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

export default Game
