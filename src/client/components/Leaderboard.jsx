import React from 'react'
import { useSelector } from 'react-redux'

const Leaderboard = ({ onClose }) => {
  const leaderboard = useSelector(s => s.leaderboard)

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()}>
        <button className="lb-modal__close" onClick={onClose}>×</button>
        <h2 className="lb-modal__title">🏆 LEADERBOARD</h2>
        
        {leaderboard.length === 0 ? (
          <p className="lb-modal__empty">No scores yet. Be the first!</p>
        ) : (
          <div>
            {leaderboard.map((entry, index) => (
              <div key={entry.playerName + index} className={`lb-row ${index === 0 ? 'lb-row--gold' : ''}`}>
                <div className="lb-row__rank">#{index + 1}</div>
                <div className="lb-row__name" title={entry.playerName}>{entry.playerName}</div>
                <div className="lb-row__score">{entry.score.toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboard
