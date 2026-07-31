// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Leaderboard.jsx
// Modale des meilleurs scores — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Leaderboard = ({ onClose }) => {
  const leaderboard = useSelector((s) => s.leaderboard);
  const modalRef = useRef(null);
  const closeRef = useRef(null);

  // Échap ferme, Tab reste dans la modale, le focus revient à son point de départ.
  useEffect(() => {
    const previous = document.activeElement;
    if (closeRef.current) closeRef.current.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;

      const items = Array.from(modalRef.current.querySelectorAll(FOCUSABLE));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [onClose]);

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div
        className="lb-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="lb-modal__close"
          ref={closeRef}
          onClick={onClose}
          aria-label="Close leaderboard"
        >
          <span aria-hidden="true">×</span>
        </button>
        <h2 className="lb-modal__title" id="lb-title">Leaderboard</h2>

        {leaderboard.length === 0
          ? <p className="lb-modal__empty">No scores yet. Be the first!</p>
          : (
            <div>
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerName + index}
                  className={`lb-row ${index === 0 ? "lb-row--gold" : ""}`}
                >
                  <div className="lb-row__rank">#{index + 1}</div>
                  <div className="lb-row__name" title={entry.playerName}>
                    {entry.playerName}
                  </div>
                  {
                    /* Le mode où le record a été établi : un score en pièces
                      invisibles et un score en partie classique ne se comparent
                      pas, la ligne doit dire lequel elle raconte. */
                  }
                  <div className="lb-row__mode">{entry.mode || "CLASSIC"}</div>
                  <div className="lb-row__score">
                    {entry.score.toLocaleString()} pts
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Leaderboard;
