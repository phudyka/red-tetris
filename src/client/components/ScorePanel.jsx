import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const ScorePanel = () => {
  const scores = useSelector(s => s.scores)
  const myName = useSelector(s => s.player.name)
  const opponents = useSelector(s => s.opponents)
  
  const [flashMyScore, setFlashMyScore] = useState(false)
  const [flashOppScore, setFlashOppScore] = useState(false)
  
  const myScore = scores[myName] || 0
  
  // Get max opponent score if any
  const oppScores = opponents.map(o => ({ name: o.name, score: scores[o.name] || 0 }))
  const topOpponent = oppScores.sort((a, b) => b.score - a.score)[0]

  useEffect(() => {
    if (myScore > 0) {
      setFlashMyScore(true)
      const t = setTimeout(() => setFlashMyScore(false), 200)
      return () => clearTimeout(t)
    }
  }, [myScore])

  useEffect(() => {
    if (topOpponent && topOpponent.score > 0) {
      setFlashOppScore(true)
      const t = setTimeout(() => setFlashOppScore(false), 200)
      return () => clearTimeout(t)
    }
  }, [topOpponent?.score])

  if (!topOpponent) {
    return (
      <div className="panel score-panel score-panel--solo">
        <div className="score-panel__label">YOUR SCORE</div>
        <div className={`score-panel__value ${flashMyScore ? 'score-panel__value--flash' : ''}`}>
          {myScore}
        </div>
      </div>
    )
  }

  return (
    <div className="panel score-panel">
      <div className="score-panel__side">
        <div className="score-panel__label">YOU</div>
        <div className={`score-panel__value ${flashMyScore ? 'score-panel__value--flash' : ''}`}>
          {myScore}
        </div>
      </div>
      
      <div className="score-panel__vs">VS</div>
      
      <div className="score-panel__side score-panel__side--right">
        <div className="score-panel__label" title={topOpponent.name}>
          {topOpponent.name.length > 8 ? topOpponent.name.substring(0, 6) + '…' : topOpponent.name}
        </div>
        <div className={`score-panel__value ${flashOppScore ? 'score-panel__value--flash' : ''}`}>
          {topOpponent.score}
        </div>
      </div>
    </div>
  )
}

export default ScorePanel
