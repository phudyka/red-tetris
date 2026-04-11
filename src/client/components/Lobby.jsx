// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Lobby.jsx
// Salle d'attente — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useSelector } from 'react-redux'
import { emitStartGame } from '../socket'

const Lobby = () => {
  const room    = useSelector(s => s.game.room)
  const players = useSelector(s => s.game.players)
  const isHost  = useSelector(s => s.player.isHost)
  const myName  = useSelector(s => s.player.name)

  const handleStart = () => {
    emitStartGame(room)
  }

  return (
    <div className="screen">
      <div className="panel lobby">
        <h1 className="lobby__title">RED TETRIS</h1>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>
            ROOM
          </p>
          <p style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: '1.1rem',
            color: 'var(--accent)',
            letterSpacing: '0.06em',
          }}>
            {room}
          </p>
        </div>

        <div className="lobby__player-list">
          <p className="game-sidebar__title">Players ({players.length})</p>
          {players.map(p => (
            <div key={p.name} className="lobby__player">
              <span style={{ color: p.name === myName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {p.name} {p.name === myName ? '(you)' : ''}
              </span>
              {p.isHost && <span className="lobby__badge">HOST</span>}
            </div>
          ))}
        </div>

        <p className="lobby__subtitle">
          {isHost
            ? 'You are the host. Start when everyone is ready.'
            : 'Waiting for the host to start the game…'}
        </p>

        <button
          id="btn-start"
          className="btn btn--primary"
          onClick={handleStart}
          disabled={!isHost || players.length === 0}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

export default Lobby
