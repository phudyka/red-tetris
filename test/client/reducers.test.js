import gameReducer from '../../src/client/reducers/game'
import playerReducer from '../../src/client/reducers/player'
import opponentsReducer from '../../src/client/reducers/opponents'

import {
  gameJoined, playerJoined, playerLeft, gameStarted, gameOver, gameReset
} from '../../src/client/actions/game'

import {
  setPlayer, setBoard, newPiece, setGhost, addPenalty, playerDied, resetPlayer
} from '../../src/client/actions/player'

import {
  setOpponents, updateSpectrum, opponentDied
} from '../../src/client/actions/opponents'

import { createEmptyBoard } from '../../src/shared/gameLogic'

describe('Redux Reducers', () => {

  // ── GAME REDUCER ──────────────────────────────────────────────────────────
  describe('gameReducer', () => {
    const initGame = { room: null, started: false, over: false, winner: null, players: [] }

    it('should return initial state', () => {
      expect(gameReducer(undefined, {})).toEqual(initGame)
    })

    it('should handle GAME_JOINED', () => {
      const state = gameReducer(initGame, gameJoined({
        room: 'room1', players: [{ name: 'Alice', isHost: true }]
      }))
      expect(state.room).toBe('room1')
      expect(state.players.length).toBe(1)
    })

    it('should handle PLAYER_JOINED', () => {
      const state = gameReducer(initGame, playerJoined({
        playerName: 'Bob', isHost: false
      }))
      expect(state.players[0].name).toBe('Bob')
    })

    it('should handle PLAYER_LEFT and re-assign host', () => {
      const state1 = { ...initGame, players: [
        { name: 'Alice', isHost: true },
        { name: 'Bob', isHost: false }
      ]}
      const state2 = gameReducer(state1, playerLeft({
        playerName: 'Alice', newHost: 'Bob'
      }))
      expect(state2.players.length).toBe(1)
      expect(state2.players[0].name).toBe('Bob')
      expect(state2.players[0].isHost).toBe(true) // Bob gained host!
    })

    it('should handle GAME_STARTED, GAME_OVER, GAME_RESET', () => {
      let state = gameReducer(initGame, gameStarted())
      expect(state.started).toBe(true)
      
      state = gameReducer(state, gameOver({ winner: 'Alice' }))
      expect(state.over).toBe(true)
      expect(state.winner).toBe('Alice')
      
      state = gameReducer(state, gameReset())
      expect(state.started).toBe(false)
      expect(state.over).toBe(false)
      expect(state.winner).toBe(null)
    })
  })

  // ── PLAYER REDUCER ────────────────────────────────────────────────────────
  describe('playerReducer', () => {
    let initPlayer

    beforeEach(() => {
      initPlayer = playerReducer(undefined, {})
    })

    it('should return initial state', () => {
      expect(initPlayer.name).toBe(null)
      expect(initPlayer.isHost).toBe(false)
      expect(initPlayer.isAlive).toBe(true)
      expect(initPlayer.board.length).toBe(20)
    })

    it('should handle SET_PLAYER', () => {
      const state = playerReducer(initPlayer, setPlayer({ name: 'Alice', isHost: true }))
      expect(state.name).toBe('Alice')
      expect(state.isHost).toBe(true)
    })

    it('should handle SET_BOARD', () => {
      const customBoard = createEmptyBoard()
      customBoard[0][0] = 1
      const state = playerReducer(initPlayer, setBoard(customBoard))
      expect(state.board[0][0]).toBe(1)
    })

    it('should handle NEW_PIECE and reset ghost', () => {
      const pieceData = { type: 'T', shape: [[1]], spawnX: 3, spawnY: 0 }
      let state = playerReducer(initPlayer, setGhost(18)) // Add fake ghost first
      state = playerReducer(state, newPiece({ piece: pieceData }))
      
      expect(state.currentPiece.type).toBe('T')
      expect(state.currentPiece.x).toBe(3)
      expect(state.ghostY).toBe(null) // Ghost is cleared!
    })

    it('should handle ADD_PENALTY', () => {
      const state = playerReducer(initPlayer, addPenalty(3))
      expect(state.board[17][0]).toBe(8) // 3 penalty lines from the bottom
      expect(state.board[18][0]).toBe(8)
      expect(state.board[19][0]).toBe(8)
    })

    it('should handle PLAYER_DIED and RESET_PLAYER', () => {
      let state = playerReducer(initPlayer, playerDied())
      expect(state.isAlive).toBe(false)
      state = playerReducer(state, resetPlayer())
      expect(state.isAlive).toBe(true)
    })
  })

  // ── OPPONENTS REDUCER ─────────────────────────────────────────────────────
  describe('opponentsReducer', () => {
    const initOpponents = []

    it('should handle SET_OPPONENTS', () => {
      const payload = [{ name: 'Bob', spectrum: [0, 0], isAlive: true }]
      const state = opponentsReducer(initOpponents, setOpponents(payload))
      expect(state).toEqual(payload)
    })

    it('should handle UPDATE_SPECTRUM', () => {
      const startState = [{ name: 'Bob', spectrum: Array(10).fill(0), isAlive: true }]
      const newSpectrum = Array(10).fill(5)
      
      const state = opponentsReducer(startState, updateSpectrum({ playerName: 'Bob', spectrum: newSpectrum }))
      expect(state[0].spectrum[0]).toBe(5)
    })

    it('should handle OPPONENT_DIED', () => {
      const startState = [{ name: 'Bob', spectrum: [], isAlive: true }]
      const state = opponentsReducer(startState, opponentDied('Bob'))
      expect(state[0].isAlive).toBe(false)
    })

    it('should handle PLAYER_LEFT', () => {
      const startState = [{ name: 'Bob', spectrum: [], isAlive: true }, { name: 'Alice', spectrum: [], isAlive: true }]
      const state = opponentsReducer(startState, playerLeft({ playerName: 'Bob' }))
      expect(state.length).toBe(1)
      expect(state[0].name).toBe('Alice')
    })

    it('should handle GAME_RESET', () => {
      const startState = [{ name: 'Bob', spectrum: [5,5], isAlive: false }]
      const state = opponentsReducer(startState, gameReset())
      expect(state[0].isAlive).toBe(true)
      expect(state[0].spectrum.length).toBe(10)
      expect(state[0].spectrum[0]).toBe(0)
    })
  })
})
