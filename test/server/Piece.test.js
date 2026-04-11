const Piece = require('../../src/server/Piece')
const { PIECE_TYPES } = require('../../src/server/constants.cjs')

describe('Piece Class', () => {
  it('should initialize correctly with a given typeIndex', () => {
    const typeIndex = 3 // Correspond à 'S'
    const piece = new Piece(typeIndex)

    expect(piece.typeIndex).toBe(3)
    expect(piece.type).toBe('S')
    expect(piece.currentRotation).toBe(0)
    expect(piece.rotations.length).toBeGreaterThan(0)
  })

  it('should rotate correctly to the next shape state', () => {
    const piece = new Piece(2) // 'T' a 4 rotations
    const initialRot = piece.currentRotation
    const totalRotations = piece.rotations.length

    piece.rotate()
    expect(piece.currentRotation).toBe((initialRot + 1) % totalRotations)
  })

  it('should loop around after rotating max times', () => {
    const piece = new Piece(2)
    const totalRotations = piece.rotations.length
    
    for (let i = 0; i < totalRotations; i++) {
      piece.rotate()
    }
    expect(piece.currentRotation).toBe(0) // Retourne à l'état initial
  })

  it('should return the correct shape grid on getShape()', () => {
    const piece = new Piece(2)
    const shape = piece.getShape()
    expect(Array.isArray(shape)).toBe(true)
    expect(Array.isArray(shape[0])).toBe(true)
  })

  it('should reset currentRotation to 0', () => {
    const piece = new Piece(2)
    piece.rotate().rotate()
    piece.reset()
    expect(piece.currentRotation).toBe(0)
  })
})
