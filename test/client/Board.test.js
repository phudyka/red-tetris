import React from 'react'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import configureStore from 'redux-mock-store'
import '@testing-library/jest-dom'
import Board from '../../src/client/components/Board'
import { createEmptyBoard } from '../../src/shared/gameLogic'

const mockStore = configureStore([])

describe('Board Component', () => {
  it('should render an empty board correctly', () => {
    const store = mockStore({
      player: {
        board: createEmptyBoard(),
        currentPiece: null,
        ghostY: null,
      }
    })

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>
    )

    const cells = container.querySelectorAll('.cell')
    expect(cells.length).toBe(200) // 10x20
    expect(cells[0]).toHaveClass('cell--empty')
  })

  it('should render the active piece correctly', () => {
    const board = createEmptyBoard()
    const store = mockStore({
      player: {
        board,
        currentPiece: {
          type: 'O',
          shape: [[1, 1], [1, 1]],
          x: 4,
          y: 0
        },
        ghostY: null,
      }
    })

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>
    )

    const cells = container.querySelectorAll('.cell')
    // Index pour x=4, y=0 (0*10 + 4)
    expect(cells[4]).toHaveClass('cell--O')
    expect(cells[5]).toHaveClass('cell--O')
    expect(cells[14]).toHaveClass('cell--O')
    expect(cells[15]).toHaveClass('cell--O')
  })

  it('should render the ghost piece', () => {
    const board = createEmptyBoard()
    const store = mockStore({
      player: {
        board,
        currentPiece: {
          type: 'T',
          shape: [[0, 1, 0], [1, 1, 1]],
          x: 4,
          y: 0
        },
        ghostY: 18, // Hard drop index pos
      }
    })

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>
    )

    const cells = container.querySelectorAll('.cell')
    // Index pour x=4, y=18 (18*10 + 4)
    // T shape: [0,1,0] at row 18 -> offset x+1
    expect(cells[185]).toHaveClass('cell--ghost')
  })
})
