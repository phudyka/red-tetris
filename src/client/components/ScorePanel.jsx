// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/ScorePanel.jsx
// Bandeau de statistiques posé sur le bord haut du puits — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

/**
 * Une statistique : libellé au-dessus, valeur en dessous.
 * @param {{ label: string, value: string|number, flash?: boolean,
 *           strong?: boolean, title?: string }} props
 */
const Stat = ({ label, value, flash = false, strong = false, title }) => (
  <div className={`stat${strong ? " stat--strong" : ""}`}>
    <span className="stat__label" title={title}>{label}</span>
    <span className={`stat__value${flash ? " stat__value--flash" : ""}`}>
      {value}
    </span>
  </div>
);

/**
 * @param {{ level?: number, lines?: number, goal?: number }} props
 *   goal : objectif de lignes du mode sprint, 0 hors sprint
 */
const ScorePanel = ({ level = 1, lines = 0, goal = 0 }) => {
  const scores = useSelector((s) => s.scores);
  const myName = useSelector((s) => s.player.name);
  const opponents = useSelector((s) => s.opponents);

  const myScore = scores[myName] || 0;

  // Un seul adversaire ici : le mieux classé. Les autres restent lisibles dans
  // la colonne des spectrums, où ils ont déjà leur ligne.
  const topOpponent = opponents
    .map((o) => ({ name: o.name, score: scores[o.name] || 0 }))
    .sort((a, b) => b.score - a.score)[0];
  const topScore = topOpponent ? topOpponent.score : 0;

  const [flashMine, setFlashMine] = useState(false);
  const [flashTheirs, setFlashTheirs] = useState(false);

  useEffect(() => {
    if (myScore <= 0) return undefined;
    setFlashMine(true);
    const t = setTimeout(() => setFlashMine(false), 200);
    return () => clearTimeout(t);
  }, [myScore]);

  useEffect(() => {
    if (topScore <= 0) return undefined;
    setFlashTheirs(true);
    const t = setTimeout(() => setFlashTheirs(false), 200);
    return () => clearTimeout(t);
  }, [topScore]);

  return (
    <div className="score-panel">
      <div className="score-panel__group">
        <Stat
          label="Score"
          value={myScore.toLocaleString()}
          flash={flashMine}
          strong
        />
        {
          /* En sprint, une ligne posée n'a de sens que rapportée à l'objectif :
            le compte garde son poids, la cible reste en retrait. */
        }
        <Stat
          label="Lines"
          value={goal > 0
            ? (
              <>
                {lines}
                <span className="stat__goal">/{goal}</span>
              </>
            )
            : lines}
        />
        <Stat label="Level" value={level} />
      </div>

      {topOpponent && (
        <div className="score-panel__group score-panel__group--rival">
          <Stat
            label={topOpponent.name}
            title={topOpponent.name}
            value={topScore.toLocaleString()}
            flash={flashTheirs}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(ScorePanel);
