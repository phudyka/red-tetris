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
let capturedHandlers  = null

jest.mock('../../src/client/hooks/useGameLoop', () => (isPlaying, _interval, onTick) => {
  if (isPlaying) capturedOnTick = onTick
  else capturedOnTick = null
})

jest.mock('../../src/client/hooks/useKeyboard', () => (isPlaying, handlers) => {
  if (isPlaying) capturedHandlers = handlers
  else capturedHandlers = null
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
  capturedHandlers = null
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

    it('locks piece on second consecutive blocked tick (last-frame rule)', () => {
      const board = createEmptyBoard()
      const state = makeState()
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 18 }
      state.player.board = board

      const { store } = renderGame(state)

      act(() => { capturedOnTick() }) // tick 1 → isLanding = true
      act(() => { capturedOnTick() }) // tick 2 → lockPiece

      expect(emitRequestNextPiece).toHaveBeenCalledWith('room1')
      expect(emitUpdateSpectrum).toHaveBeenCalledWith('room1', expect.any(Array))
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

      act(() => { capturedHandlers.moveLeft() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.x).toBe(3) // 4 - 1
    })

    it('moveLeft: does nothing at left border', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'I', shape: [[1,1,1,1]], x: 0, y: 0 }
      const { store } = renderGame(state)

      act(() => { capturedHandlers.moveLeft() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      expect(dispatched.some(a => a.type === 'SET_PIECE')).toBe(false)
    })

    it('moveRight: dispatches SET_PIECE with x+1 when valid', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 0 }
      const { store } = renderGame(state)

      act(() => { capturedHandlers.moveRight() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.x).toBe(4)
    })

    it('rotate: dispatches SET_PIECE with rotated shape', () => {
      const state = makeState()
      // T shape initiale : [[0,1,0],[1,1,1]] (2 lignes)
      state.player.currentPiece = { type: 'T', shape: [[0,1,0],[1,1,1]], x: 3, y: 0 }
      const { store } = renderGame(state)

      act(() => { capturedHandlers.rotate() })

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

      act(() => { capturedHandlers.softDrop() })

      const dispatched = store.dispatch.mock.calls.map(c => c[0])
      const setPiece = dispatched.find(a => a.type === 'SET_PIECE')
      expect(setPiece.payload.y).toBe(6)
    })

    it('hardDrop: locks piece immediately at bottom', () => {
      const state = makeState()
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 0 }
      const { store } = renderGame(state)

      act(() => { capturedHandlers.hardDrop() })

      expect(emitRequestNextPiece).toHaveBeenCalledWith('room1')
    })

    it('handlers do nothing when piece is null', () => {
      const state = makeState()
      state.player.currentPiece = null
      const { store } = renderGame(state)

      act(() => {
        capturedHandlers.moveLeft()
        capturedHandlers.moveRight()
        capturedHandlers.rotate()
        capturedHandlers.softDrop()
        capturedHandlers.hardDrop()
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
    it('emits linesCleared when piece clears rows', () => {
      const board = createEmptyBoard()
      // Remplir la dernière ligne sauf 2 cases (pièce O viendra combler)
      for (let c = 0; c < 10; c++) {
        if (c !== 4 && c !== 5) board[19][c] = 1
      }

      const state = makeState()
      state.player.board = board
      state.player.currentPiece = { type: 'O', shape: [[1,1],[1,1]], x: 4, y: 17 }

      renderGame(state)

      // Déclencher le hard drop pour locker immédiatement
      act(() => { capturedHandlers.hardDrop() })

      expect(emitLinesCleared).toHaveBeenCalledWith('room1', expect.any(Number))
    })
  })
})
