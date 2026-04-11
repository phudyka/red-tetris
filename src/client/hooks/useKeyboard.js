// ─────────────────────────────────────────────────────────────────────────────
// src/client/hooks/useKeyboard.js
// Hook React — zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'

/**
 * Enregistre les listeners clavier pendant que isPlaying === true.
 *
 * @param {boolean} isPlaying
 * @param {{
 *   moveLeft:  () => void,
 *   moveRight: () => void,
 *   rotate:    () => void,
 *   softDrop:  () => void,
 *   hardDrop:  () => void,
 * }} handlers
 */
const useKeyboard = (isPlaying, handlers) => {
  useEffect(() => {
    if (!isPlaying) return

    const onKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlers.moveLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          handlers.moveRight()
          break
        case 'ArrowUp':
          e.preventDefault()
          handlers.rotate()
          break
        case 'ArrowDown':
          e.preventDefault()
          handlers.softDrop()
          break
        case ' ':
          e.preventDefault()
          handlers.hardDrop()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlaying, handlers])
}

export default useKeyboard
