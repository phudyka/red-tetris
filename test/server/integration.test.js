/**
 * @jest-environment node
 */
'use strict'
const http = require('http')
const { Server } = require('socket.io')
const { io: ioc } = require('socket.io-client')

const GameManager = require('../../src/server/GameManager')
const Player      = require('../../src/server/Player')
const { PIECE_TYPES, SPAWN_X, SPAWN_Y } = require('../../src/server/constants.cjs')

jest.setTimeout(15000)

// ── Boot du miniserveur ────────────────────────────────────────────────────

function buildServer() {
  const manager = new GameManager()
  const srv  = http.createServer()
  const io   = new Server(srv)

  function leave(socket, room) {
    const game = manager.get(room)
    if (!game) return
    const removed = game.removePlayer(socket.id)
    if (!removed) return
    socket.leave(room)
    if (game.players.length === 0) { manager.delete(room); return }
    const newHost = game.players.find(p => p.isHost)
    io.to(room).emit('playerLeft', { playerName: removed.name, newHost: newHost ? newHost.name : null })
    if (game.started && !game.over) {
      const winner = game.checkWinCondition()
      if (winner !== null || game.getAlivePlayers().length === 0) {
        game.over = true
        io.to(room).emit('gameOver', { winner: winner ? winner.name : null })
      }
    }
  }

  io.on('connection', (socket) => {
    socket.on('joinGame', ({ room, playerName }) => {
      const game = manager.getOrCreate(room)
      if (game.started)                           return socket.emit('error', { message: 'Game already started' })
      if (game.players.some(p => p.name === playerName)) return socket.emit('error', { message: 'Name already taken in this room' })
      const player = new Player(socket.id, playerName, room)
      game.addPlayer(player)
      socket.join(room)
      socket.emit('gameJoined', { room, playerName, isHost: player.isHost,
        players: game.players.map(p => ({ name: p.name, isHost: p.isHost })) })
      socket.to(room).emit('playerJoined', { playerName, isHost: false })
    })

    socket.on('startGame', ({ room }) => {
      const game = manager.get(room)
      if (!game) return
      const player = game.getPlayer(socket.id)
      if (!player || !player.isHost) return socket.emit('error', { message: 'Only the host can start the game' })
      if (game.started)              return socket.emit('error', { message: 'Game already started' })
      game.start()
      game.players.forEach(p => {
        const ti = game.getNextPiece(p)
        const t  = PIECE_TYPES[ti]
        io.to(p.id).emit('gameStarted', { pieceIndex: ti, piece: { type: t, spawnX: SPAWN_X[t], spawnY: SPAWN_Y } })
      })
    })

    socket.on('playerDead', ({ room }) => {
      const game = manager.get(room)
      if (!game) return
      const player = game.getPlayer(socket.id)
      if (!player) return
      player.isAlive = false
      const winner = game.checkWinCondition()
      if (winner !== null || game.getAlivePlayers().length === 0) {
        game.over = true
        io.to(room).emit('gameOver', { winner: winner ? winner.name : null })
      }
    })

    socket.on('updateSpectrum', ({ room, spectrum }) => {
      const game = manager.get(room)
      const player = game && game.getPlayer(socket.id)
      if (player) socket.to(room).emit('updateSpectrum', { playerName: player.name, spectrum })
    })

    socket.on('linesCleared', ({ room, linesCleared }) => {
      const game = manager.get(room)
      if (!game || !game.started) return
      const player = game.getPlayer(socket.id)
      if (!player || !player.isAlive) return
      const n = linesCleared - 1
      if (n <= 0) return
      game.getAlivePlayers().filter(p => p.id !== socket.id)
        .forEach(p => io.to(p.id).emit('addPenalty', { lines: n }))
    })

    socket.on('requestNextPiece', ({ room }) => {
      const game = manager.get(room)
      if (!game || !game.started) return
      const player = game.getPlayer(socket.id)
      if (!player || !player.isAlive) return
      const ti = game.getNextPiece(player)
      const t  = PIECE_TYPES[ti]
      socket.emit('newPiece', { pieceIndex: ti, piece: { type: t, spawnX: SPAWN_X[t], spawnY: SPAWN_Y } })
    })

    socket.on('leaveGame', ({ room }) => leave(socket, room))

    socket.on('disconnect', () => {
      manager.getAll().forEach(g => {
        if (g.getPlayer(socket.id)) leave(socket, g.name)
      })
    })
  })

  return { srv, io, manager }
}

// ── Helpers ────────────────────────────────────────────────────────────────

let serverRef

function client() {
  const port = serverRef.srv.address().port
  return new Promise(resolve => {
    const c = ioc(`http://localhost:${port}`, { transports: ['websocket'], forceNew: true })
    c.once('connect', () => resolve(c))
  })
}

function event(socket, name) {
  return new Promise(resolve => socket.once(name, resolve))
}

async function join(c, room, name) {
  const p = event(c, 'gameJoined')
  c.emit('joinGame', { room, playerName: name })
  return p
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeAll(done => {
  serverRef = buildServer()
  serverRef.srv.listen(0, done)
})

afterAll(done => {
  serverRef.io.close()
  serverRef.srv.close(done)
})

afterEach(done => {
  // Déconnecter tous les clients du serveur proprement
  serverRef.io.fetchSockets().then(sockets => {
    sockets.forEach(s => s.disconnect(true))
    // Vider le manager
    serverRef.manager.getAll().forEach(g => serverRef.manager.delete(g.name))
    done()
  })
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Server Integration (socket.io)', () => {

  test('joinGame: premier joueur devient host', async () => {
    const c1 = await client()
    const payload = await join(c1, 'r1', 'Alice')
    expect(payload.isHost).toBe(true)
    expect(payload.room).toBe('r1')
  })

  test('joinGame: deuxième joueur n\'est pas host', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r2', 'A')
    const p2 = await join(c2, 'r2', 'B')
    expect(p2.isHost).toBe(false)
    expect(p2.players.length).toBe(2)
  })

  test('joinGame: nom déjà pris → erreur', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r3', 'Alice')
    const err = event(c2, 'error')
    c2.emit('joinGame', { room: 'r3', playerName: 'Alice' })
    const e = await err
    expect(e.message).toMatch(/Name already taken/)
  })

  test('startGame: seul le host peut démarrer', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r4', 'A')
    await join(c2, 'r4', 'B')
    const errProm = event(c2, 'error')
    c2.emit('startGame', { room: 'r4' })
    const e = await errProm
    expect(e.message).toMatch(/Only the host/)
  })

  test('startGame: tous les joueurs reçoivent gameStarted', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r5', 'A')
    await join(c2, 'r5', 'B')
    const [gs1, gs2] = await Promise.all([
      event(c1, 'gameStarted'),
      event(c2, 'gameStarted'),
      Promise.resolve(c1.emit('startGame', { room: 'r5' })),
    ])
    expect(gs1.piece.type).toMatch(/[IOTSZJL]/)
    expect(gs2.piece.type).toMatch(/[IOTSZJL]/)
  })

  test('joinGame sur partie démarrée → erreur', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r6', 'A')
    const started = event(c1, 'gameStarted')
    c1.emit('startGame', { room: 'r6' })
    await started
    const err = event(c2, 'error')
    c2.emit('joinGame', { room: 'r6', playerName: 'B' })
    const e = await err
    expect(e.message).toMatch(/already started/)
  })

  test('linesCleared=2 → addPenalty(1) à l\'adversaire', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r7', 'A')
    await join(c2, 'r7', 'B')
    await Promise.all([event(c1, 'gameStarted'), event(c2, 'gameStarted'),
      Promise.resolve(c1.emit('startGame', { room: 'r7' }))])
    const penalty = event(c2, 'addPenalty')
    c1.emit('linesCleared', { room: 'r7', linesCleared: 2 })
    const p = await penalty
    expect(p.lines).toBe(1)
  })

  test('linesCleared=1 → aucune pénalité', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r8', 'A')
    await join(c2, 'r8', 'B')
    await Promise.all([event(c1, 'gameStarted'), event(c2, 'gameStarted'),
      Promise.resolve(c1.emit('startGame', { room: 'r8' }))])
    let received = false
    c2.on('addPenalty', () => { received = true })
    c1.emit('linesCleared', { room: 'r8', linesCleared: 1 })
    await new Promise(r => setTimeout(r, 200))
    expect(received).toBe(false)
  })

  test('playerDead → gameOver avec le gagnant', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r9', 'A')
    await join(c2, 'r9', 'B')
    await Promise.all([event(c1, 'gameStarted'), event(c2, 'gameStarted'),
      Promise.resolve(c1.emit('startGame', { room: 'r9' }))])
    const go = event(c1, 'gameOver')
    c2.emit('playerDead', { room: 'r9' })
    const g = await go
    expect(g.winner).toBe('A')
  })

  test('host déconnecté → transfert au suivant', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r10', 'Host')
    await join(c2, 'r10', 'Next')
    const leftProm = event(c2, 'playerLeft')
    c1.disconnect()
    const left = await leftProm
    expect(left.newHost).toBe('Next')
  })

  test('requestNextPiece → newPiece reçu', async () => {
    const c1 = await client()
    await join(c1, 'r11', 'A')
    await Promise.all([event(c1, 'gameStarted'), Promise.resolve(c1.emit('startGame', { room: 'r11' }))])
    const next = event(c1, 'newPiece')
    c1.emit('requestNextPiece', { room: 'r11' })
    const n = await next
    expect(n.piece.type).toMatch(/[IOTSZJL]/)
  })

  test('updateSpectrum relayé aux adversaires', async () => {
    const c1 = await client()
    const c2 = await client()
    await join(c1, 'r12', 'A')
    await join(c2, 'r12', 'B')
    await Promise.all([event(c1, 'gameStarted'), event(c2, 'gameStarted'),
      Promise.resolve(c1.emit('startGame', { room: 'r12' }))])
    const specProm = event(c2, 'updateSpectrum')
    c1.emit('updateSpectrum', { room: 'r12', spectrum: Array(10).fill(3) })
    const sp = await specProm
    expect(sp.playerName).toBe('A')
    expect(sp.spectrum[0]).toBe(3)
  })
})
