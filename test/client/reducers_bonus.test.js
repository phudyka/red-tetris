import scoresReducer from '../../src/client/reducers/scores'
import leaderboardReducer from '../../src/client/reducers/leaderboard'
import { SCORE_UPDATE, SCORES_RESET } from '../../src/client/actions/scores'
import { LEADERBOARD_UPDATE } from '../../src/client/actions/leaderboard'
import { GAME_RESET } from '../../src/client/actions/game'

describe('Bonus Reducers', () => {
  describe('scoresReducer', () => {
    it('should return initial state', () => {
      expect(scoresReducer(undefined, {})).toEqual({})
    })

    it('should handle SCORE_UPDATE', () => {
      const action = { type: SCORE_UPDATE, payload: { playerName: 'Alice', score: 1000 } }
      expect(scoresReducer({}, action)).toEqual({ Alice: 1000 })
    })

    it('should handle SCORES_RESET', () => {
      expect(scoresReducer({ Alice: 1000 }, { type: SCORES_RESET })).toEqual({})
    })

    it('should handle GAME_RESET', () => {
      expect(scoresReducer({ Alice: 1000 }, { type: GAME_RESET })).toEqual({})
    })
  })

  describe('leaderboardReducer', () => {
    it('should return initial state', () => {
      expect(leaderboardReducer(undefined, {})).toEqual([])
    })

    it('should handle LEADERBOARD_UPDATE', () => {
      const payload = [{ playerName: 'Alice', score: 2000 }]
      const action = { type: LEADERBOARD_UPDATE, payload }
      expect(leaderboardReducer([], action)).toEqual(payload)
    })

    it('should ignore invalid payload', () => {
      const action = { type: LEADERBOARD_UPDATE, payload: 'invalid' }
      expect(leaderboardReducer([{ name: 'X' }], action)).toEqual([{ name: 'X' }])
    })
  })
})
