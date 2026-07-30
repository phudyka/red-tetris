// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/HoldPieceView.jsx
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { useSelector } from "react-redux";
import PiecePreview from "./PiecePreview";

const HoldPieceView = () => {
  const holdType = useSelector((s) => s.player.holdPieceType);
  const canHold = useSelector((s) => s.player.canHold);

  return <PiecePreview label="Hold" type={holdType} spent={!canHold} />;
};

export default HoldPieceView;
