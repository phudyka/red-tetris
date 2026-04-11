// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/GameOver.jsx
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { emitStartGame } from '../socket'
import { gameReset } from '../actions/game'
import { resetPlayer } from '../actions/player'
import { setOpponents } from '../actions/opponents'

const GameOver = () => {
  const dispatch  = useDispatch()
  const winner    = useSelector(s => s.game.winner)
  const room      = useSelector(s => s.game.room)
  const isHost    = useSelector(s => s.player.isHost)
  const opponents = useSelector(s => s.opponents)

  const handleRestart = () => {
    dispatch(gameReset())
    dispatch(resetPlayer())
    dispatch(setOpponents(
      opponents.map(o => ({ ...o, isAlive: true, spectrum: Array(10).fill(0) }))
    ))
    emitStartGame(room)
  }

  return (
    <div className="screen">
      <div className="panel gameover">
        <h1 className="gameover__title">GAME OVER</h1>
        <p className="gameover__winner">
          {winner
            ? <><span>{winner}</span> wins!</>
            : 'No winner this round.'}
        </p>
        {isHost && (
          <button
            id="btn-restart"
            className="btn btn--primary"
            onClick={handleRestart}
          >
            Play Again
          </button>
        )}
        {!isHost && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Waiting for host to restart…
          </p>
        )}
      </div>
    </div>
  )
}

export default GameOver
