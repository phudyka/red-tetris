// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Game.jsx
// Conteneur principal en jeu — boucle de jeu + clavier
// Zéro `this` — logique via fonctions pures de shared/gameLogic
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import Board from './Board'
import OpponentView from './OpponentView'
import GameOver from './GameOver'
import NextPiecePreview from './NextPiecePreview'
import HoldPieceView from './HoldPieceView'

import useGameLoop from '../hooks/useGameLoop'

import { setBoard, playerDied } from '../actions/player'
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
  LOCK_DELAY,
  MAX_MOVE_RESETS,
} from '../../shared/constants'

import {
  emitPlayerDead,
  emitLinesCleared,
  emitRequestNextPiece,
  emitUpdateSpectrum,
} from '../socket'

// ── DAS constants (Delayed Auto Shift) ───────────────────────────────────────
const DAS_DELAY = 167  // ms avant répétition
const DAS_RATE  = 33   // ms entre chaque répétition (~30/s)

const Game = () => {
  const dispatch   = useDispatch()
  const room       = useSelector(s => s.game.room)
  const started    = useSelector(s => s.game.started)
  const over       = useSelector(s => s.game.over)
  const isAlive    = useSelector(s => s.player.isAlive)
  const opponents  = useSelector(s => s.opponents)

  const nextPieceType = useSelector(s => s.player.nextPieceType)
  const holdPieceType = useSelector(s => s.player.holdPieceType)
  const canHold       = useSelector(s => s.player.canHold)

  const isPlaying = started && !over && isAlive

  const [clearingRows, setClearingRows] = useState([])
  const [lockingCells, setLockingCells] = useState([])

  // ── Refs "live" pour éviter les stale closures dans les timers ────────────
  // Ces refs permettent aux callbacks setTimeout/setInterval d'accéder
  // toujours à la version la plus récente du board et de la pièce.
  const boardRef      = useRef(null)
  const pieceRef      = useRef(null)
  const nextTypeRef   = useRef(null)
  const holdTypeRef   = useRef(null)
  const canHoldRef    = useRef(true)
  const roomRef       = useRef(room)

  // Sync de l'état Redux vers les refs à chaque render
  const board = useSelector(s => s.player.board)
  const piece  = useSelector(s => s.player.currentPiece)
  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { pieceRef.current = piece }, [piece])
  useEffect(() => { nextTypeRef.current = nextPieceType }, [nextPieceType])
  useEffect(() => { holdTypeRef.current = holdPieceType }, [holdPieceType])
  useEffect(() => { canHoldRef.current = canHold }, [canHold])
  useEffect(() => { roomRef.current = room }, [room])

  // ── Refs pour le Lock Delay (Guideline) ───────────────────────────────────
  const lockTimeoutRef = useRef(null)
  const moveResetsRef  = useRef(0)

  const clearLockTimeout = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current)
      lockTimeoutRef.current = null
    }
  }, [])

  // ── Death check ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!piece || !piece.shape || !board || !isPlaying) return
    if (!isValidPosition(board, piece.shape, piece.x, piece.y)) {
      dispatch(playerDied())
      emitPlayerDead(roomRef.current)
    }
  }, [piece, board, isPlaying, dispatch])

  // ── Spawning Prédictif ──────────────────────────────────────────────────
  const spawnNextPiece = useCallback(() => {
    const type = nextTypeRef.current
    if (!type) return
    const newPieceLocal = {
      type,
      shape: PIECES[type].shape,
      x: SPAWN_X[type],
      y: SPAWN_Y,
    }
    dispatch({ type: 'SET_PIECE', payload: newPieceLocal })
    dispatch({ type: 'SET_PLAYER', payload: { canHold: true } })
    emitRequestNextPiece(roomRef.current)
  }, [dispatch])

  // ── Lock piece ────────────────────────────────────────────────────────────
  // Utilise les refs pour lire l'état actuel au moment du lock,
  // pas l'état au moment où le callback a été créé.
  const lockPiece = useCallback(() => {
    const currentPiece = pieceRef.current
    const currentBoard = boardRef.current
    if (!currentPiece || !currentPiece.shape || !currentBoard) return

    clearLockTimeout()
    moveResetsRef.current = 0

    // Animation Lock Flash
    const pieceCells = []
    const { shape, x, y, type } = currentPiece
    shape.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell !== 0) pieceCells.push({ x: x + ci, y: y + ri })
      })
    })
    setLockingCells(pieceCells)
    setTimeout(() => setLockingCells([]), 150)

    const colorIndex = TYPE_TO_COLOR_INDEX[type]
    const newBoard = placePiece(currentBoard, shape, x, y, colorIndex)
    const { newBoard: clearedBoard, linesCleared, clearedIndexes } = clearLines(newBoard)

    if (linesCleared > 0) {
      setClearingRows(clearedIndexes)
      dispatch(setBoard(newBoard))
      dispatch({ type: 'SET_PIECE', payload: null })
      setTimeout(() => {
        setClearingRows([])
        dispatch(setBoard(clearedBoard))
        emitLinesCleared(roomRef.current, linesCleared)
        emitUpdateSpectrum(roomRef.current, computeSpectrum(clearedBoard))
        spawnNextPiece()
      }, 300)
    } else {
      dispatch(setBoard(newBoard))
      emitUpdateSpectrum(roomRef.current, computeSpectrum(newBoard))
      spawnNextPiece()
    }
  }, [dispatch, clearLockTimeout, spawnNextPiece])

  // ── requestLock : démarre le timer de verrouillage ────────────────────────
  const requestLock = useCallback(() => {
    if (lockTimeoutRef.current) return
    lockTimeoutRef.current = setTimeout(() => {
      lockTimeoutRef.current = null
      lockPiece()
    }, LOCK_DELAY)
  }, [lockPiece])

  // ── handleMoveReset : reset le timer si on bouge/rotationne au sol ────────
  const handleMoveReset = useCallback((newPieceState) => {
    const currentBoard = boardRef.current
    if (!currentBoard) return
    const isNowGrounded = !isValidPosition(
      currentBoard, newPieceState.shape, newPieceState.x, newPieceState.y + 1
    )
    if (isNowGrounded) {
      if (moveResetsRef.current < MAX_MOVE_RESETS) {
        moveResetsRef.current++
        clearLockTimeout()
        requestLock()
      }
    } else {
      clearLockTimeout()
      moveResetsRef.current = 0
    }
  }, [clearLockTimeout, requestLock])

  // ── Tick de la boucle de jeu ───────────────────────────────────────────────
  const onTick = useCallback(() => {
    const currentPiece = pieceRef.current
    const currentBoard = boardRef.current
    if (!currentPiece || !currentPiece.shape || !currentBoard) return

    const nextY = currentPiece.y + 1
    if (isValidPosition(currentBoard, currentPiece.shape, currentPiece.x, nextY)) {
      dispatch({ type: 'SET_PIECE', payload: { ...currentPiece, y: nextY } })
      clearLockTimeout()
      moveResetsRef.current = 0
    } else {
      requestLock()
    }
  }, [dispatch, requestLock, clearLockTimeout])

  useGameLoop(isPlaying, TICK_INTERVAL, onTick)

  // ── Handlers clavier ─────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !b) return
    if (isValidPosition(b, p.shape, p.x - 1, p.y)) {
      const updated = { ...p, x: p.x - 1 }
      dispatch({ type: 'SET_PIECE', payload: updated })
      handleMoveReset(updated)
    }
  }, [dispatch, handleMoveReset])

  const moveRight = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !b) return
    if (isValidPosition(b, p.shape, p.x + 1, p.y)) {
      const updated = { ...p, x: p.x + 1 }
      dispatch({ type: 'SET_PIECE', payload: updated })
      handleMoveReset(updated)
    }
  }, [dispatch, handleMoveReset])

  const rotate = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !b) return
    const { shape } = p
    const cols = shape[0].length
    const rows = shape.length
    const rotated = Array.from({ length: cols }, (_, c) =>
      Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
    )
    const kicks = [0, -1, 1, -2, 2]
    for (const kick of kicks) {
      if (isValidPosition(b, rotated, p.x + kick, p.y)) {
        const updated = { ...p, shape: rotated, x: p.x + kick }
        dispatch({ type: 'SET_PIECE', payload: updated })
        handleMoveReset(updated)
        break
      }
    }
  }, [dispatch, handleMoveReset])

  const softDrop = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !b) return
    const nextY = p.y + 1
    if (isValidPosition(b, p.shape, p.x, nextY)) {
      dispatch({ type: 'SET_PIECE', payload: { ...p, y: nextY } })
      clearLockTimeout()
    } else {
      requestLock()
    }
  }, [dispatch, clearLockTimeout, requestLock])

  const hardDrop = useCallback(() => {
    const p = pieceRef.current
    const b = boardRef.current
    if (!p || !b) return
    const finalY = getHardDropPosition(b, p.shape, p.x, p.y)
    dispatch({ type: 'SET_PIECE', payload: { ...p, y: finalY } })
    // Donne un tick pour que le state se mette à jour, puis lock
    setTimeout(() => lockPiece(), 0)
  }, [dispatch, lockPiece])

  const holdPiece = useCallback(() => {
    const p = pieceRef.current
    if (!p || !canHoldRef.current) return
    if (!holdTypeRef.current) {
      dispatch({ type: 'SET_PLAYER', payload: { holdPieceType: p.type, canHold: false } })
      dispatch({ type: 'SET_PIECE', payload: null })
      emitRequestNextPiece(roomRef.current)
    } else {
      const nextType = holdTypeRef.current
      dispatch({ type: 'SET_PLAYER', payload: { holdPieceType: p.type, canHold: false } })
      dispatch({ type: 'SET_PIECE', payload: {
        type: nextType,
        shape: PIECES[nextType].shape,
        x: SPAWN_X[nextType],
        y: SPAWN_Y,
      }})
    }
  }, [dispatch])

  // ── Clavier avec DAS ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return

    const dasTimers = {}

    const startDAS = (key, fn) => {
      fn()
      dasTimers[key] = setTimeout(() => {
        dasTimers[`${key}_repeat`] = setInterval(fn, DAS_RATE)
      }, DAS_DELAY)
    }

    const stopDAS = (key) => {
      clearTimeout(dasTimers[key])
      clearInterval(dasTimers[`${key}_repeat`])
      delete dasTimers[key]
      delete dasTimers[`${key}_repeat`]
    }

    const onKeyDown = (e) => {
      if (e.repeat) return  // ignorer la répétition native navigateur
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          startDAS('left', moveLeft)
          break
        case 'ArrowRight':
          e.preventDefault()
          startDAS('right', moveRight)
          break
        case 'ArrowDown':
          e.preventDefault()
          startDAS('down', softDrop)
          break
        case 'ArrowUp':
          e.preventDefault()
          rotate()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'c': case 'C':
          e.preventDefault()
          holdPiece()
          break
        default: break
      }
    }

    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft')  stopDAS('left')
      if (e.key === 'ArrowRight') stopDAS('right')
      if (e.key === 'ArrowDown')  stopDAS('down')
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      Object.values(dasTimers).forEach(t => { clearTimeout(t); clearInterval(t) })
    }
  }, [isPlaying, moveLeft, moveRight, rotate, softDrop, hardDrop, holdPiece])

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (over) return <GameOver />

  return (
    <div className="game-layout">
      {/* Sidebar gauche — adversaires + Hold */}
      <aside className="game-sidebar">
        <HoldPieceView />

        {opponents.length > 0 && (
          <>
            <p className="game-sidebar__title">Opponents</p>
            {opponents.map(opp => (
              <OpponentView
                key={opp.name}
                name={opp.name}
                spectrum={opp.spectrum}
                isAlive={opp.isAlive}
              />
            ))}
          </>
        )}
      </aside>

      {/* Plateau principal */}
      <Board clearingRows={clearingRows} lockingCells={lockingCells} />

      {/* Sidebar droite — infos */}
      <aside className="game-sidebar">
        <NextPiecePreview />

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
