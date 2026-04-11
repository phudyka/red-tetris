// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/App.jsx
// Router principal — BrowserRouter + route /:room/:playerName
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import Lobby    from './Lobby'
import Game     from './Game'
import { initSocket, emitJoinGame } from '../socket'

// ── Composant interne : lit les params URL et rejoint la room ─────────────────
const RoomEntry = () => {
  const { room, playerName } = useParams()
  const dispatch  = useDispatch()
  const started   = useSelector(s => s.game.started)
  const gameRoom  = useSelector(s => s.game.room)

  useEffect(() => {
    initSocket(dispatch)
    emitJoinGame(room, playerName)
  }, [room, playerName, dispatch])

  if (!gameRoom) {
    // Connexion en cours
    return (
      <div className="screen">
        <p style={{ fontFamily: 'Orbitron, monospace', color: 'var(--text-muted)' }}>
          Connecting…
        </p>
      </div>
    )
  }

  return started ? <Game /> : <Lobby />
}

// ── Écran d'accueil (URL invalide) ───────────────────────────────────────────
const Home = () => (
  <div className="screen">
    <div className="panel lobby" style={{ maxWidth: 480 }}>
      <h1 className="lobby__title">RED TETRIS</h1>
      <p className="lobby__subtitle">
        Navigate to <strong style={{ color: 'var(--accent)' }}>/:room/:playerName</strong> to start.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Example&nbsp;→&nbsp;
        <a
          href="/arena/alice"
          style={{ color: 'var(--accent2)', textDecoration: 'none' }}
        >
          /arena/alice
        </a>
      </p>
    </div>
  </div>
)

// ── App root ─────────────────────────────────────────────────────────────────
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/:room/:playerName" element={<RoomEntry />} />
      <Route path="/"                  element={<Home />} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
