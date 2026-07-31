// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Lobby.jsx
// Salle d'attente — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { emitSetMode, emitStartGame } from "../socket";
import Leaderboard from "./Leaderboard";
import {
  DEFAULT_MODES,
  MODE_TAGS,
  SPRINT_TARGET,
} from "../../shared/constants";

// Trois axes indépendants — le rendu, la vitesse, la victoire — donc trois
// interrupteurs cumulables plutôt qu'un choix exclusif. L'étiquette courte est
// celle que le classement affichera : elle s'apprend ici.
const MODIFIERS = [
  {
    key: "invisible",
    name: "Invisible",
    note: "Locked pieces fade out. The well is yours to remember.",
    tag: MODE_TAGS.invisible,
  },
  {
    key: "gravity",
    name: "Gravity+",
    note: "Pieces fall nine levels faster from the very first drop.",
    tag: MODE_TAGS.gravity,
  },
  {
    key: "sprint",
    name: `Sprint ${SPRINT_TARGET}`,
    note: `First player to clear ${SPRINT_TARGET} lines wins the round.`,
    tag: MODE_TAGS.sprint,
  },
];

const Lobby = () => {
  const room = useSelector((s) => s.game.room);
  const players = useSelector((s) => s.game.players);
  const isHost = useSelector((s) => s.player.isHost);
  const myName = useSelector((s) => s.player.name);
  const modes = useSelector((s) => s.game.modes) || DEFAULT_MODES;

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

  // Aucune bascule optimiste : c'est le serveur qui détient les modes de la
  // room, et son écho arrive au host en même temps qu'aux autres. Un état local
  // qui devance le refus montrerait un mode armé qui ne l'est pas.
  // On n'envoie que l'interrupteur touché : envoyer les trois ferait qu'un
  // second clic parti avant l'écho du premier le rembobinerait.
  const handleToggle = (key) => {
    emitSetMode(room, key, !modes[key]);
  };

  return (
    <div className="screen">
      <div className="lobby">
        <h1 className="brand">
          <span className="brand__accent">RED</span> TETRIS
        </h1>

        <div className="lobby__room">
          <p className="eyebrow">ROOM</p>
          <p className="lobby__room-name">{room}</p>
        </div>

        <div className="lobby__player-list">
          <p className="eyebrow">Players ({players.length})</p>
          {players.map((p) => (
            <div
              key={p.name}
              className={`lobby__player${
                p.name === myName ? " lobby__player--self" : ""
              }`}
            >
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

        <div className="lobby__modes">
          <p className="eyebrow" id="modifiers-title">Modifiers</p>
          <div className="modifiers" aria-labelledby="modifiers-title">
            {MODIFIERS.map(({ key, name, note, tag }) => {
              const on = modes[key] === true;
              return (
                <button
                  key={key}
                  type="button"
                  className={`modifier${on ? " modifier--on" : ""}`}
                  aria-pressed={on}
                  disabled={!isHost}
                  onClick={() => handleToggle(key)}
                >
                  <span className="modifier__mark" aria-hidden="true" />
                  <span className="modifier__body">
                    <span className="modifier__name">{name}</span>
                    <span className="modifier__note">{note}</span>
                  </span>
                  <span className="modifier__tag" aria-hidden="true">
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="lobby__subtitle">
          {isHost
            ? "You are the host. Pick your modifiers, then start when everyone is ready."
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
            Leaderboard
          </button>
        </div>
      </div>

      {showLB && <Leaderboard onClose={() => setShowLB(false)} />}
    </div>
  );
};

export default Lobby;
