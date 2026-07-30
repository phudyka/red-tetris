// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/OpponentView.jsx
// Zéro `this` — composant fonctionnel
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { BOARD_HEIGHT } from "../../shared/constants";

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
          style={{ height: `${(h / BOARD_HEIGHT) * 100}%` }}
        />
      ))}
    </div>
  </div>
);

export default React.memo(OpponentView);
