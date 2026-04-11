const Player = require('../../src/server/Player')

describe('Player Class', () => {
  it('should initialize with correct default properties', () => {
    const player = new Player('socket_123', 'Alice', 'room1')

    expect(player.id).toBe('socket_123')
    expect(player.name).toBe('Alice')
    expect(player.room).toBe('room1')
    expect(player.isHost).toBe(false)
    expect(player.isAlive).toBe(true)
    expect(player.pieceIndex).toBe(0)
    expect(player.board.length).toBe(20) // BOARD_HEIGHT
    expect(player.board[0].length).toBe(10) // BOARD_WIDTH
    expect(player.x).toBe(0)
    expect(player.y).toBe(0) // SPAWN_Y
  })

  it('should completely reset player state without changing metadata', () => {
    const player = new Player('sock_1', 'Bob', 'room2')
    
    // Altérer l'état
    player.isAlive = false
    player.pieceIndex = 42
    player.x = 5
    player.y = 10
    player.board[0][0] = 1

    player.reset()

    // Vérifier que métadonnées intouchées
    expect(player.id).toBe('sock_1')
    expect(player.name).toBe('Bob')

    // Vérifier reset complet
    expect(player.isAlive).toBe(true)
    expect(player.pieceIndex).toBe(0)
    expect(player.x).toBe(0)
    expect(player.y).toBe(0)
    expect(player.board[0][0]).toBe(0)
  })
})
