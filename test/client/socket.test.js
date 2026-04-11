// ─────────────────────────────────────────────────────────────────────────────
// test/client/socket.test.js
// Tests de src/client/socket.js
// socket.io-client est mocké ; le singleton est réinitialisé via jest.isolateModules
// ─────────────────────────────────────────────────────────────────────────────

// Préfixe `mock` imposé par Jest pour les closures dans jest.mock()
let mockSocketRef  = null
let mockEmitFn     = jest.fn()
let mockListeners  = {}

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    mockEmitFn    = jest.fn()
    mockListeners = {}
    mockSocketRef = {
      on:  (event, cb) => { mockListeners[event] = cb },
      emit: (...args) => mockEmitFn(...args),
    }
    return mockSocketRef
  }),
}))

// Charger un module frais via require() pour reset le singleton `socket = null`
function loadFresh() {
  let mod
  jest.isolateModules(() => {
    mod = require('../../src/client/socket')
  })
  return mod
}

// ─── 1. Émetteurs ─────────────────────────────────────────────────────────────

describe('socket.js — Emitters', () => {
  let sock

  beforeEach(() => {
    sock = loadFresh()
    sock.initSocket(jest.fn())
    // mockEmitFn est recréé par le factory lors de l'appel à io()
  })

  it('initSocket: idempotent (même socket si rappelé)', () => {
    const dispatch = jest.fn()
    const s1 = sock.initSocket(dispatch)
    const s2 = sock.initSocket(dispatch)
    expect(s1).toBe(s2)
  })

  it('getSocket: retourne l\'instance courante', () => {
    expect(sock.getSocket()).toBe(mockSocketRef)
  })

  it('emitJoinGame', () => {
    sock.emitJoinGame('room1', 'Alice')
    expect(mockEmitFn).toHaveBeenCalledWith('joinGame', { room: 'room1', playerName: 'Alice' })
  })

  it('emitStartGame', () => {
    sock.emitStartGame('room1')
    expect(mockEmitFn).toHaveBeenCalledWith('startGame', { room: 'room1' })
  })

  it('emitAction', () => {
    sock.emitAction('room1', { type: 'move' })
    expect(mockEmitFn).toHaveBeenCalledWith('playerAction', { room: 'room1', action: { type: 'move' } })
  })

  it('emitPlayerDead', () => {
    sock.emitPlayerDead('room1')
    expect(mockEmitFn).toHaveBeenCalledWith('playerDead', { room: 'room1' })
  })

  it('emitLeaveGame', () => {
    sock.emitLeaveGame('room1')
    expect(mockEmitFn).toHaveBeenCalledWith('leaveGame', { room: 'room1' })
  })

  it('emitLinesCleared', () => {
    sock.emitLinesCleared('room1', 3)
    expect(mockEmitFn).toHaveBeenCalledWith('linesCleared', { room: 'room1', linesCleared: 3 })
  })

  it('emitRequestNextPiece', () => {
    sock.emitRequestNextPiece('room1')
    expect(mockEmitFn).toHaveBeenCalledWith('requestNextPiece', { room: 'room1' })
  })

  it('emitUpdateSpectrum', () => {
    sock.emitUpdateSpectrum('room1', [1, 2, 3])
    expect(mockEmitFn).toHaveBeenCalledWith('updateSpectrum', { room: 'room1', spectrum: [1, 2, 3] })
  })
})

// ─── 2. Listeners → Redux dispatch ────────────────────────────────────────────

describe('socket.js — Event Listeners → Redux dispatch', () => {
  let dispatch, sock

  beforeEach(() => {
    dispatch = jest.fn()
    sock = loadFresh()
    sock.initSocket(dispatch)
    // Après initSocket(), mockListeners est peuplé par les socket.on() de socket.js
  })

  it('gameJoined → GAME_JOINED + SET_PLAYER + SET_OPPONENTS (filtre soi-même)', () => {
    const payload = {
      room: 'r1', playerName: 'Alice', isHost: true,
      players: [
        { name: 'Alice', isHost: true },
        { name: 'Bob',   isHost: false },
      ],
    }
    mockListeners['gameJoined'](payload)

    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('GAME_JOINED')
    expect(types).toContain('SET_PLAYER')
    expect(types).toContain('SET_OPPONENTS')

    const setOpp = dispatch.mock.calls.find(c => c[0].type === 'SET_OPPONENTS')
    const names  = setOpp[0].payload.map(o => o.name)
    expect(names).not.toContain('Alice') // on ne se met pas en adversaire
    expect(names).toContain('Bob')
  })

  it('playerJoined → PLAYER_JOINED + ADD_OPPONENT', () => {
    mockListeners['playerJoined']({ playerName: 'Bob', isHost: false })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('PLAYER_JOINED')
    expect(types).toContain('ADD_OPPONENT')
    const addOpp = dispatch.mock.calls.find(c => c[0].type === 'ADD_OPPONENT')
    expect(addOpp[0].payload).toBe('Bob')
  })

  it('playerLeft → PLAYER_LEFT', () => {
    mockListeners['playerLeft']({ playerName: 'Bob', newHost: 'Alice' })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('PLAYER_LEFT')
  })

  it('gameStarted → GAME_STARTED + NEW_PIECE', () => {
    mockListeners['gameStarted']({ pieceIndex: 2, piece: { type: 'T', spawnX: 3, spawnY: 0 } })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('GAME_STARTED')
    expect(types).toContain('NEW_PIECE')
  })

  it('newPiece → NEW_PIECE', () => {
    mockListeners['newPiece']({ pieceIndex: 1, piece: { type: 'I', spawnX: 3, spawnY: 0 } })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('NEW_PIECE')
  })

  it('updateSpectrum → UPDATE_SPECTRUM', () => {
    mockListeners['updateSpectrum']({ playerName: 'Bob', spectrum: Array(10).fill(5) })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('UPDATE_SPECTRUM')
  })

  it('addPenalty → ADD_PENALTY avec le bon count', () => {
    mockListeners['addPenalty']({ lines: 2 })
    const action = dispatch.mock.calls.find(c => c[0].type === 'ADD_PENALTY')
    expect(action).toBeDefined()
    expect(action[0].payload).toBe(2)
  })

  it('gameOver → GAME_OVER', () => {
    mockListeners['gameOver']({ winner: 'Alice' })
    const types = dispatch.mock.calls.map(c => c[0].type)
    expect(types).toContain('GAME_OVER')
  })

  it('error → console.error (sans dispatch)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockListeners['error']({ message: 'test-err' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith('[socket] Server error:', 'test-err')
    spy.mockRestore()
  })
})
