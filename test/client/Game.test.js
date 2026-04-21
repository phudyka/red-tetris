import React from 'react'
import { render, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import { thunk } from 'redux-thunk'
import '@testing-library/jest-dom'

import Game from '../../src/client/components/Game'
import { createEmptyBoard } from '../../src/shared/gameLogic'

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../../src/client/socket', () => ({
  emitPlayerDead:      jest.fn(),
  emitLinesCleared:    jest.fn(),
  emitRequestNextPiece: jest.fn(),
  emitUpdateSpectrum:  jest.fn(),
}))

const { emitPlayerDead, emitLinesCleared, emitRequestNextPiece, emitUpdateSpectrum } =
  require('../../src/client/socket')

// Capture des callbacks passés aux hooks pour les appeler dans les tests
let capturedOnTick    = null

jest.mock('../../src/client/hooks/useGameLoop', () => (isPlaying, _interval, onTick) => {
  if (isPlaying) capturedOnTick = onTick
  else capturedOnTick = null
})

const mockStore = configureStore([thunk])

// ── Helpers ────────────────────────────────────────────────────────────────

const makeState = (overrides = {}) => ({
  game: { room: 'room1', started: true, over: false, players: [] },
  player: {
    name: 'Alice',
    isHost: true,
    isAlive: true,
    board: createEmptyBoard(),
    currentPiece: {
      type: 'T',
      shape: [[0, 1, 0], [1, 1, 1]],
      x: 3,
      y: 0,
    },
    nextPieceType: 'J',
    ghostY: 18,
  },
  opponents: [],
  ...overrides,
})

const renderGame = (state) => {
  const store = mockStore(state)
  store.dispatch = jest.fn(store.dispatch)
  const utils = render(
    <Provider store={store}>
      <Game />
    </Provider>
  )
  return { store, ...utils }
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  capturedOnTick   = null
  jest.clearAllMocks()
})

describe('Game Component', () => {

  // ── Rendu conditionnel ─────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the board when game is started and player is alive', () => {
      const { container } = renderGame(makeState())
      expect(container.querySelector('.board')).toBeInTheDocument()
    })

    it('renders GameOver screen when game is over', () => {
      const state = makeState({ game: { room: 'r1', started: true, over: true, players: [] } })
      state.player.isHost = true
      state.game.winner = 'Alice'
      const { container } = renderGame(state)
      expect(container.querySelector('.gameover')).toBeInTheDocument()
    })

    it('renders opponents sidebar when opponents exist', () => {
      const state = makeState({
        opponents: [{ name: 'Bob', spectrum: Array(10).fill(0), isAlive: true }],
      })
      const { getByText } = renderGame(state)
      expect(getByText('Bob')).toBeInTheDocument()
    })

    it('shows ELIMINATED when player is dead but game continues', () => {
      const state = makeState()
      state.player.isAlive = false
      const { getByText } = renderGame(state)
      expect(getByText('ELIMINATED')).toBeInTheDocument()
    })
  })

  // ── Boucle de jeu (onTick via hook capturé) ──────────────────────────
  describe('Game Loop (onTick)', () => {
    it('dispatches SET_PIECE with y+1 when piece can move down', () => {
      const { store } = renderGame(makeState())

      act(() => { capturedOnTick() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece).toBeDefined()
      expect(setPiece.payload.y).toBe(1) // 0 + 1
    })

    it('applies last-frame rule: does not lock on first blocked tick', () => {
      // Place une pièce au fond — ne peut pas descendre
      const board = createEmptyBoard()
      const state = makeState()
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 18 }
      state.player.board = board

      const { store } = renderGame(state)

      act(() => { capturedOnTick() }) // premier tick bloqué → grâce

      // Pas de placement encore (emitRequestNextPiece non appelé)
      expect(emitRequestNextPiece).not.toHaveBeenCalled()
    })

    it('locks piece after LOCK_DELAY on blocked tick (last-frame rule)', async () => {
      jest.useFakeTimers()
      const board = createEmptyBoard()
      const state = makeState()
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 18 }
      state.player.board = board

      const { store } = renderGame(state)

      act(() => { capturedOnTick() }) // déclenche requestLock
      
      act(() => { jest.advanceTimersByTime(1000) }) // passe le LOCK_DELAY

      expect(emitRequestNextPiece).toHaveBeenCalledWith('room1')
      expect(emitUpdateSpectrum).toHaveBeenCalledWith('room1', expect.any(Array))
      jest.useRealTimers()
    })

    it('does not tick when piece or board is missing', () => {
      const state = makeState()
      state.player.currentPiece = null
      const { store } = renderGame(state)

      act(() => { if (capturedOnTick) capturedOnTick() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      expect(dispatched.some(a => a.type === 'SET_PIECE')).toBe(false)
    })
  })

  // ── Handlers clavier ───────────────────────────────────────────────────
  describe('Keyboard Handlers', () => {
    it('moveLeft: dispatches SET_PIECE with x-1 when valid', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 4, y: 0 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })) })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.x).toBe(3) // 4 - 1
    })

    it('moveLeft: does nothing at left border', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'I', shape: [[1,1,1,1]], x: 0, y: 0 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })) })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      expect(dispatched.some(a => a.type === 'SET_PIECE')).toBe(false)
    })

    it('moveRight: dispatches SET_PIECE with x+1 when valid', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 0 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.x).toBe(4)
    })

    it('rotate: dispatches SET_PIECE with rotated shape', () => {
      const state = makeState()
      // T shape initiale : [[0,1,0],[1,1,1]] (2 lignes)
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 0 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })) })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece).toBeDefined()
      // La shape pivotée a 3 lignes (T a 4 rotations)
      expect(setPiece.payload.shape.length).toBe(3)
    })

    it('softDrop: moves piece down if valid', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 5 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.y).toBe(6)
    })

    it('hardDrop: locks piece immediately at bottom', async () => {
      jest.useFakeTimers()
      const state = makeState()
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 0 }
      const { store } = renderGame(state)

      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })) })
      
      // hardDrop does setTimeout(() => lockPiece(), 0)
      act(() => { jest.advanceTimersByTime(500) })

      expect(emitRequestNextPiece).toHaveBeenCalledWith('room1')
      jest.useRealTimers()
    })

    it('handlers do nothing when piece is null', () => {
      const state = makeState()
      state.player.currentPiece = null
      const { store } = renderGame(state)

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
      })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      expect(dispatched.some(a => a.type === 'SET_PIECE')).toBe(false)
    })
  })

  // ── Détection de mort ───────────────────────────────────────────────────
  describe('Death Detection', () => {
    it('dispatches PLAYER_DIED and emitPlayerDead when new piece cannot spawn', () => {
      // Remplir le plateau pour bloquer le spawn
      const board = createEmptyBoard()
      board[0][3] = 1 // bloquer la position de spawn de T (x=3, y=0)
      board[0][4] = 1

      const state = makeState()
      state.player.board = board
      // La pièce T avec shape doit spawner à (3,0) mais c'est bloqué
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 0 }

      const { store } = renderGame(state)

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const diedAction = dispatched.find(a => a.type === 'PLAYER_DIED')
      expect(diedAction).toBeDefined()
      expect(emitPlayerDead).toHaveBeenCalledWith('room1')
    })
  })

  // ── Penalty lines ───────────────────────────────────────────────────────
  describe('Lock piece with lines cleared', () => {
    it('emits linesCleared when piece clears rows', async () => {
      jest.useFakeTimers()
      const board = createEmptyBoard()
      // Remplir la dernière ligne sauf 2 cases (pièce O viendra combler)
      for (let c = 0; c < 10; c++) {
        if (c !== 4 && c !== 5) board[19][c] = 1
      }

      const state = makeState()
      state.player.board = board
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 18 }

      renderGame(state)

      // Déclencher le requestLock (la pièce est déjà au fond, y=18 et board[19] est rempli)
      act(() => { capturedOnTick() })
      
      // On avance le temps pour passer le LOCK_DELAY (500) et l'animation clearLines (300)
      act(() => { jest.advanceTimersByTime(1000) })

      expect(emitLinesCleared).toHaveBeenCalledWith('room1', expect.any(Number))
      jest.useRealTimers()
    })
  })
})
