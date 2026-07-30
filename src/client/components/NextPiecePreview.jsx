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

export default NextPiecePreview;
