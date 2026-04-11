import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import { thunk } from 'redux-thunk'
import '@testing-library/jest-dom'

import Cell from '../../src/client/components/Cell'
import OpponentView from '../../src/client/components/OpponentView'
import Lobby from '../../src/client/components/Lobby'
import GameOver from '../../src/client/components/GameOver'

// Mock des fonctions socket qui émettent des events
jest.mock('../../src/client/socket', () => ({
  emitStartGame: jest.fn(),
}))
const { emitStartGame } = require('../../src/client/socket')

const middlewares = [thunk]
const mockStore = configureStore(middlewares)

describe('React Components', () => {

  // ── Cell ────────────────────────────────────────────────────────────────
  describe('Cell', () => {
    it('should render an empty cell with proper class', () => {
      const { container } = render(<Cell value={0} />)
      expect(container.firstChild).toHaveClass('cell', 'cell--empty')
    })

    it('should render a piece cell (T) with proper class', () => {
      const { container } = render(<Cell value={3} />) // 3 = T (COLOR_INDEX)
      expect(container.firstChild).toHaveClass('cell', 'cell--T')
    })

    it('should render a ghost cell exclusively when isGhost is true', () => {
      const { container } = render(<Cell value={3} isGhost={true} />)
      expect(container.firstChild).toHaveClass('cell', 'cell--ghost')
      expect(container.firstChild).not.toHaveClass('cell--T')
    })

    it('should render penalty cell on value 8', () => {
      const { container } = render(<Cell value={8} />)
      expect(container.firstChild).toHaveClass('cell', 'cell--penalty')
    })
  })

  // ── OpponentView ────────────────────────────────────────────────────────
  describe('OpponentView', () => {
    it('should render name and spectrum heights properly', () => {
      const spectrum = [1, 5, 0, 0, 0, 0, 0, 0, 0, 2]
      render(<OpponentView name="Bob" spectrum={spectrum} isAlive={true} />)
      
      expect(screen.getByText('Bob')).toBeInTheDocument()
      
      // Verification des barres
      const bars = document.querySelectorAll('.opponent__bar')
      expect(bars.length).toBe(10)
      
      // La hauteur est calculée en px (height / 20 * 40)
      // Ex: 5 -> (5/20)*40 = 10px
      expect(bars[1]).toHaveStyle({ height: '10px' })
    })

    it('should apply dead class when isAlive is false', () => {
      const { container } = render(<OpponentView name="Bob" spectrum={Array(10).fill(0)} isAlive={false} />)
      expect(container.firstChild).toHaveClass('opponent', 'opponent--dead')
    })
  })

  // ── Lobby ───────────────────────────────────────────────────────────────
  describe('Lobby', () => {
    const initialState = {
      game: { room: 'roomA', players: [{ name: 'Alice', isHost: true }] },
      player: { name: 'Alice', isHost: true }
    }

    it('should render room name and active player', () => {
      const store = mockStore(initialState)
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>
      )
      expect(screen.getByText('roomA')).toBeInTheDocument()
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.getByText('HOST')).toBeInTheDocument()
    })

    it('should allow host to click Start Game', () => {
      const store = mockStore(initialState)
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>
      )
      const btn = screen.getByRole('button', { name: /Start Game/i })
      expect(btn).not.toBeDisabled()
      
      fireEvent.click(btn)
      expect(emitStartGame).toHaveBeenCalledWith('roomA')
    })

    it('should disable Start Game for non-hosts', () => {
      const notHostState = {
        ...initialState,
        player: { name: 'Bob', isHost: false }
      }
      const store = mockStore(notHostState)
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>
      )
      const btn = screen.getByRole('button', { name: /Start Game/i })
      expect(btn).toBeDisabled()
      expect(screen.getByText(/Waiting for the host/)).toBeInTheDocument()
    })
  })

  // ── GameOver ────────────────────────────────────────────────────────────
  describe('GameOver', () => {
    let store
    beforeEach(() => {
      store = mockStore({
        game: { room: 'r1', winner: 'Alice' },
        player: { isHost: true },
        opponents: []
      })
      store.dispatch = jest.fn()
    })

    it('should render winner name', () => {
      render(
        <Provider store={store}>
          <GameOver />
        </Provider>
      )
      expect(screen.getByText(/Alice/)).toBeInTheDocument()
      expect(screen.getByText(/wins!/)).toBeInTheDocument()
    })

    it('should trigger restarts actions when Play Again is clicked by host', () => {
      render(
        <Provider store={store}>
          <GameOver />
        </Provider>
      )
      fireEvent.click(screen.getByRole('button', { name: /Play Again/i }))
      expect(store.dispatch).toHaveBeenCalledTimes(3) // gameReset, resetPlayer, setOpponents
      expect(emitStartGame).toHaveBeenCalledWith('r1')
    })
  })
})
