// ─────────────────────────────────────────────────────────────────────────────
// src/client/hooks/useGameLoop.js
// Hook React — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'

/**
 * Lance un setInterval quand isPlaying === true.
 * Nettoie l'intervalle au unmount ou quand isPlaying passe à false.
 *
 * @param {boolean}  isPlaying     - Active/désactive la boucle
 * @param {number}   tickInterval  - Intervalle en ms
 * @param {Function} onTick        - Appelée à chaque tick
 */
const useGameLoop = (isPlaying, tickInterval, onTick) => {
  const onTickRef = useRef(onTick)

  // Garde la référence à jour sans relancer l'effet
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    if (!isPlaying) return

    const id = setInterval(() => {
      onTickRef.current()
    }, tickInterval)

    return () => clearInterval(id)
  }, [isPlaying, tickInterval])
}

export default useGameLoop
