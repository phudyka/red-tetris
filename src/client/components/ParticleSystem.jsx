// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/ParticleSystem.jsx
// Éclat de particules à la destruction d'une ligne.
// Le mouvement est délégué au compositeur (keyframes CSS + custom properties) :
// React ne rend chaque salve qu'une fois, jamais image par image.
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, PIECE_TYPES } from "../../shared/constants";

const PER_ROW = 14;
// Doit couvrir le pire cas : délai max (60) + durée max (600).
const LIFETIME = 700;

/**
 * Fabrique les particules d'une ligne — fonction pure hormis Math.random.
 * Les valeurs sont figées à la création : l'animation CSS fait le reste.
 * @param {number} row    index de ligne effacée (0 = haut du plateau)
 * @param {string} burst  identifiant de salve, pour des clés React stables
 * @returns {object[]}
 */
const createParticles = (row, burst) =>
  Array.from({ length: PER_ROW }, (_, i) => ({
    id: `${burst}-${row}-${i}`,
    left: ((i + 0.5) / PER_ROW) * 100 + (Math.random() - 0.5) * (100 / PER_ROW),
    top: ((row + 0.5) / BOARD_HEIGHT) * 100,
    dx: `${(Math.random() - 0.5) * 2.2 * BOARD_WIDTH}px`,
    dy: `${-Math.random() * 70 - 18}px`,
    size: `${Math.random() * 6 + 4}px`,
    tint: `var(--block-${
      PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]
    })`,
    duration: `${Math.round(Math.random() * 180 + 420)}ms`,
    delay: `${Math.round(Math.random() * 60)}ms`,
  }));

const ParticleSystem = ({ clearingRows }) => {
  const [particles, setParticles] = useState([]);
  const burstRef = useRef(0);

  useEffect(() => {
    if (!clearingRows || clearingRows.length === 0) return;

    burstRef.current += 1;
    const burst = `b${burstRef.current}`;
    setParticles(clearingRows.flatMap((row) => createParticles(row, burst)));

    // Une seule mise à jour d'état pour éteindre la salve entière.
    const timer = setTimeout(() => setParticles([]), LIFETIME);
    return () => clearTimeout(timer);
  }, [clearingRows]);

  if (particles.length === 0) return null;

  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            "--dx": p.dx,
            "--dy": p.dy,
            "--size": p.size,
            "--tint": p.tint,
            "--dur": p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

export default React.memo(ParticleSystem);
