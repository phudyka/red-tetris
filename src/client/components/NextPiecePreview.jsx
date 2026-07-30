// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/NextPiecePreview.jsx
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useSelector } from "react-redux";
import PiecePreview from "./PiecePreview";

const NextPiecePreview = () => {
  const nextType = useSelector((s) => s.player.nextPieceType);

  return <PiecePreview label="Next" type={nextType} />;
};

// Mémoïsé : sans props, il ne se re-rend plus que sur changement de sa propre
// tranche de state, pas à chaque déplacement de pièce de Game.jsx.
export default React.memo(NextPiecePreview);
