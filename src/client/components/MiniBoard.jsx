// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/MiniBoard.jsx
// Copie temps réel du plateau d'un adversaire.
// Alimenté par un CustomEvent DOM (voir socket.js) plutôt que par Redux :
// le serveur throttle à 200 ms et ce composant est le seul concerné.
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { PIECE_TYPES } from "../../shared/constants";

const MiniBoard = ({ playerName }) => {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    const handleSnapshot = (e) => {
      const { playerName: name, board: newBoard } = e.detail;
      if (name === playerName) {
        setBoard(newBoard);
      }
    };
    window.addEventListener("board:snapshot", handleSnapshot);
    return () => window.removeEventListener("board:snapshot", handleSnapshot);
  }, [playerName]);

  if (!board) return null;

  return (
    <div className="mini-board-panel">
      <div className="mini-board-panel__name" title={playerName}>
        {playerName}
      </div>
      <div
        className="mini-board"
        role="img"
        aria-label={`live board of ${playerName}`}
      >
        {board.map((row, y) => (
          <React.Fragment key={y}>
            {row.map((val, x) => {
              let className = "mini-cell--empty";
              if (val === 8) className = "mini-cell--penalty";
              else if (val > 0) className = "mini-cell--filled";

              const style = val > 0 && val < 8
                ? { background: `var(--block-${PIECE_TYPES[val - 1]})` }
                : {};

              return (
                <div key={`${y}-${x}`} className={className} style={style} />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default React.memo(MiniBoard);
