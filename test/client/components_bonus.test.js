import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import { thunk } from 'redux-thunk'
import '@testing-library/jest-dom'

import ScorePanel from '../../src/client/components/ScorePanel'
import Leaderboard from '../../src/client/components/Leaderboard'

import MiniBoard from '../../src/client/components/MiniBoard'

const middlewares = [thunk]
const mockStore = configureStore(middlewares)

describe('Bonus Components', () => {
  describe('ScorePanel', () => {
    it('ScorePanel should render player score in solo', () => {
      const store = mockStore({
        scores: { Alice: 1200 },
        player: { name: 'Alice' },
        opponents: []
      })
      render(<Provider store={store}><ScorePanel /></Provider>)
      expect(screen.getByText(/1.*200/)).toBeInTheDocument()
      expect(screen.getByText('YOUR SCORE')).toBeInTheDocument()
    })

    it('ScorePanel should render VS scores in multi', () => {
      const store = mockStore({
        scores: { Alice: 1200, Bob: 800 },
        player: { name: 'Alice' },
        opponents: [{ name: 'Bob' }]
      })
      render(<Provider store={store}><ScorePanel /></Provider>)
      expect(screen.getByText(/1.*200/)).toBeInTheDocument()
      expect(screen.getByText(/800/)).toBeInTheDocument()
      expect(screen.getByText('VS')).toBeInTheDocument()
    })
  })

  describe('Leaderboard', () => {
    it('Leaderboard should render list of scores', () => {
      const store = mockStore({
        leaderboard: [
          { playerName: 'Alice', score: 2000 },
          { playerName: 'Bob', score: 1000 }
        ]
      })
      render(<Provider store={store}><Leaderboard onClose={() => {}} /></Provider>)
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText(/2.*000.*pts/)).toBeInTheDocument()
      expect(screen.getByText(/#.*1/)).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  describe('MiniBoard', () => {
    it('renders nothing initially', () => {
      const { container } = render(<MiniBoard playerName="Bob" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders board when receiving board:snapshot event', () => {
      render(<MiniBoard playerName="Bob" />)
      
      const board = [[0, 0], [1, 8]]
      const event = new CustomEvent('board:snapshot', {
        detail: { playerName: 'Bob', board }
      })

      act(() => {
        window.dispatchEvent(event)
      })

      expect(screen.getByText('Bob')).toBeInTheDocument()
      // Use querySelector because the structure might be nested
      const cells = screen.getByText('Bob').parentElement.querySelectorAll('.mini-cell--empty, .mini-cell--filled, .mini-cell--penalty')
      expect(cells.length).toBe(4)
    })
  })
})
