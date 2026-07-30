// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Lobby.jsx
// Salle d'attente — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { emitStartGame } from "../socket";
import Leaderboard from "./Leaderboard";

const Lobby = () => {
  const room = useSelector((s) => s.game.room);
  const players = useSelector((s) => s.game.players);
  const isHost = useSelector((s) => s.player.isHost);
  const myName = useSelector((s) => s.player.name);

  const error = useSelector((s) => s.game.error);

  const [showLB, setShowLB] = useState(false);
  const [starting, setStarting] = useState(false);

  // Un refus du serveur rend la main : sinon le bouton resterait éteint.
  useEffect(() => {
    if (error) setStarting(false);
  }, [error]);

  const handleStart = () => {
    if (starting) return;
    setStarting(true);
    emitStartGame(room);
  };

  return (
    <div className="screen">
      <div className="panel lobby">
        <h1 className="lobby__title">RED TETRIS</h1>

        <div className="lobby__room">
          <p className="eyebrow">ROOM</p>
          <p className="lobby__room-name">{room}</p>
        </div>

        <div className="lobby__player-list">
          <p className="eyebrow">Players ({players.length})</p>
          {players.map((p) => (
            <div key={p.name} className="lobby__player">
              <span
                className={`lobby__player-name${
                  p.name === myName ? " lobby__player-name--self" : ""
                }`}
              >
                {p.name} {p.name === myName ? "(you)" : ""}
              </span>
              {p.isHost && <span className="lobby__badge">HOST</span>}
            </div>
          ))}
        </div>

        <p className="lobby__subtitle">
          {isHost
            ? "You are the host. Start when everyone is ready."
            : "Waiting for the host to start the game…"}
        </p>

        <div className="lobby__actions">
          <button
            id="btn-start"
            className="btn btn--primary"
            onClick={handleStart}
            disabled={!isHost || players.length === 0 || starting}
          >
            {starting ? "Starting…" : "Start Game"}
          </button>

          <button
            className="btn btn--secondary"
            onClick={() => setShowLB(true)}
          >
            🏆 Leaderboard
          </button>
        </div>
      </div>

      {showLB && <Leaderboard onClose={() => setShowLB(false)} />}
    </div>
  );
};

export default Lobby;
