const { calcScore, updateLeaderboard, getLeaderboardArray, boardHasChanged } = require('../../src/server/scoreLogic')

describe('Server Score Logic', () => {
  it('should calculate scores correctly', () => {
    expect(calcScore(1)).toBe(100)
    expect(calcScore(2)).toBe(300)
    expect(calcScore(3)).toBe(500)
    expect(calcScore(4)).toBe(800)
    expect(calcScore(0)).toBe(0)
    expect(calcScore(5)).toBe(0)
  })

  it('should update leaderboard only if score is higher', () => {
    const lb = new Map()
    updateLeaderboard(lb, 'Alice', 1000)
    expect(lb.get('Alice')).toBe(1000)
    
    updateLeaderboard(lb, 'Alice', 500)
    expect(lb.get('Alice')).toBe(1000) // Unchanged
    
    updateLeaderboard(lb, 'Alice', 1500)
    expect(lb.get('Alice')).toBe(1500) // Updated
  })

  it('should return sorted array limited to 10', () => {
    const lb = new Map()
    for (let i = 1; i <= 15; i++) {
      lb.set(`Player${i}`, i * 100)
    }
    const arr = getLeaderboardArray(lb)
    expect(arr.length).toBe(10)
    expect(arr[0].playerName).toBe('Player15')
    expect(arr[0].score).toBe(1500)
    expect(arr[9].playerName).toBe('Player6')
  })

  it('should detect board changes', () => {
    const b1 = [[0,0], [1,1]]
    const b2 = [[0,0], [1,1]]
    const b3 = [[0,1], [1,1]]
    
    expect(boardHasChanged(null, b1)).toBe(true)
    expect(boardHasChanged(b1, b2)).toBe(false)
    expect(boardHasChanged(b1, b3)).toBe(true)
  })
})
