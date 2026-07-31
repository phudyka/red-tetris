// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/OpponentView.jsx
// Zéro `this` — composant fonctionnel
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { BOARD_HEIGHT } from "../../shared/constants";

// Plancher de remplissage — ≈ 2 px sur la hauteur du cadre. Une colonne vide
// garde un liseré : sans lui elle disparaît, et dix colonnes vides ne se
// distinguent plus d'un spectrum qui n'est pas encore arrivé.
const MIN_FILL = 0.025;

/**
 * Affiche le nom + spectrum d'un adversaire.
 * Le spectrum donne la hauteur de la colonne la plus haute, colonne par colonne.
 * @param {{ name: string, spectrum: number[], isAlive: boolean }} props
 */
const OpponentView = ({ name, spectrum, isAlive }) => (
  <div className={`opponent${isAlive ? "" : " opponent--dead"}`}>
    <div className="opponent__name" title={name}>{name}</div>
    <div
      className="opponent__spectrum"
      role="img"
      aria-label={`spectrum of ${name}`}
    >
      {spectrum.map((h, i) => (
        <div
          key={i}
          className="opponent__bar"
          style={{ "--fill": Math.max(h / BOARD_HEIGHT, MIN_FILL) }}
        />
      ))}
    </div>
  </div>
);

export default React.memo(OpponentView);
