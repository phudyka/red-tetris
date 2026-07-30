// ─────────────────────────────────────────────────────────────────────────────
// src/client/hooks/useGameLoop.js
// Hook React — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";

/**
 * Lance un setInterval quand isPlaying === true.
 * Nettoie l'intervalle au unmount, quand isPlaying passe à false, quand
 * l'intervalle change (montée de niveau) ou quand resetKey change.
 *
 * `resetKey` fait repartir le compteur de zéro : une pièce qui apparaît juste
 * avant un tick tomberait sinon d'une rangée dans la milliseconde, sans laisser
 * au joueur le temps de la voir arriver.
 *
 * @param {boolean}  isPlaying     - Active/désactive la boucle
 * @param {number}   tickInterval  - Intervalle en ms
 * @param {Function} onTick        - Appelée à chaque tick
 * @param {*}        [resetKey]    - Change → l'intervalle repart de zéro
 */
const useGameLoop = (isPlaying, tickInterval, onTick, resetKey) => {
  const onTickRef = useRef(onTick);

  // Garde la référence à jour sans relancer l'effet
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!isPlaying) return;

    const id = setInterval(() => {
      onTickRef.current();
    }, tickInterval);

    return () => clearInterval(id);
  }, [isPlaying, tickInterval, resetKey]);
};

export default useGameLoop;
