const GameManager = require('../../src/server/GameManager')
const Game = require('../../src/server/Game')

describe('GameManager Class', () => {
  let manager

  beforeEach(() => {
    manager = new GameManager()
  })

  it('should create new games if they dont exist', () => {
    const game = manager.getOrCreate('r1')
    expect(game).toBeInstanceOf(Game)
    expect(game.name).toBe('r1')
  })

  it('should return the identical game object if already exists', () => {
    const g1 = manager.getOrCreate('r1')
    const g2 = manager.getOrCreate('r1')
    expect(g1).toBe(g2)
  })

  it('should get an existing room safely without creating it', () => {
    expect(manager.get('nonExistent')).toBeUndefined()
    manager.getOrCreate('r1')
    expect(manager.get('r1')).toBeDefined()
  })

  it('should delete a game explicitly', () => {
    manager.getOrCreate('r1')
    expect(manager.getAll().length).toBe(1)
    
    manager.delete('r1')
    expect(manager.getAll().length).toBe(0)
  })
})
