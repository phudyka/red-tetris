// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/GameOver.jsx
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { emitStartGame } from "../socket";
import { gameReset } from "../actions/game";
import { resetPlayer } from "../actions/player";
import { setOpponents } from "../actions/opponents";
import { BOARD_WIDTH } from "../../shared/constants";

const GameOver = () => {
  const dispatch = useDispatch();
  const winner = useSelector((s) => s.game.winner);
  const room = useSelector((s) => s.game.room);
  const isHost = useSelector((s) => s.player.isHost);
  const opponents = useSelector((s) => s.opponents);
  const scores = useSelector((s) => s.scores);
  const myName = useSelector((s) => s.player.name);

  const handleRestart = () => {
    dispatch(gameReset());
    dispatch(resetPlayer());
    dispatch(setOpponents(
      opponents.map((o) => ({
        ...o,
        isAlive: true,
        spectrum: Array(BOARD_WIDTH).fill(0),
      })),
    ));
    emitStartGame(room);
  };

  const myScore = scores[myName] || 0;
  const isWinner = winner === myName;

  return (
    <div className="screen">
      <div className="panel gameover" role="status">
        <h1 className="gameover__title">GAME OVER</h1>

        <div>
          <p className="gameover__winner">
            {winner
              ? (
                <>
                  <strong>{winner}</strong> wins!
                </>
              )
              : "No winner this round."}
          </p>

          <div className="gameover__scoreblock">
            <p className="game-sidebar__title">YOUR FINAL SCORE</p>
            <p
              className={`gameover__score ${
                isWinner ? "gameover__score--winner" : "gameover__score--loser"
              }`}
            >
              {myScore.toLocaleString()}
            </p>
          </div>
        </div>

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
          <p className="gameover__wait">
            Waiting for host to restart…
          </p>
        )}
      </div>
    </div>
  );
};

export default GameOver;
