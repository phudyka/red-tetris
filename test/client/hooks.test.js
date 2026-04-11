import { renderHook } from '@testing-library/react'
import { useEffect } from 'react'
import useGameLoop from '../../src/client/hooks/useGameLoop'
import useKeyboard from '../../src/client/hooks/useKeyboard'

describe('Client Hooks', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  // ── useGameLoop ────────────────────────────────────────────────────────
  describe('useGameLoop', () => {
    it('should NOT call onTick if isPlaying is false', () => {
      const onTick = jest.fn()
      renderHook(() => useGameLoop(false, 800, onTick))
      
      jest.advanceTimersByTime(1000)
      expect(onTick).not.toHaveBeenCalled()
    })

    it('should call onTick at tickInterval when isPlaying is true', () => {
      const onTick = jest.fn()
      renderHook(() => useGameLoop(true, 800, onTick))
      
      jest.advanceTimersByTime(799)
      expect(onTick).not.toHaveBeenCalled()
      
      jest.advanceTimersByTime(1)
      expect(onTick).toHaveBeenCalledTimes(1)
      
      jest.advanceTimersByTime(800)
      expect(onTick).toHaveBeenCalledTimes(2)
    })

    it('should cleanup interval on unmount', () => {
      const onTick = jest.fn()
      const { unmount } = renderHook(() => useGameLoop(true, 800, onTick))
      
      unmount()
      jest.advanceTimersByTime(1000)
      expect(onTick).not.toHaveBeenCalled()
    })
  })

  // ── useKeyboard ────────────────────────────────────────────────────────
  describe('useKeyboard', () => {
    let handlers

    beforeEach(() => {
      handlers = {
        moveLeft: jest.fn(),
        moveRight: jest.fn(),
        rotate: jest.fn(),
        softDrop: jest.fn(),
        hardDrop: jest.fn(),
      }
    })

    const triggerKey = (key) => {
      const event = new KeyboardEvent('keydown', { key })
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() })
      window.dispatchEvent(event)
      return event
    }

    it('should NOT trigger handlers if isPlaying is false', () => {
      renderHook(() => useKeyboard(false, handlers))
      triggerKey('ArrowLeft')
      expect(handlers.moveLeft).not.toHaveBeenCalled()
    })

    it('should trigger correct handlers for specific keys', () => {
      renderHook(() => useKeyboard(true, handlers))
      
      triggerKey('ArrowLeft')
      expect(handlers.moveLeft).toHaveBeenCalled()
      
      triggerKey('ArrowRight')
      expect(handlers.moveRight).toHaveBeenCalled()
      
      triggerKey('ArrowUp')
      expect(handlers.rotate).toHaveBeenCalled()
      
      triggerKey('ArrowDown')
      expect(handlers.softDrop).toHaveBeenCalled()
      
      triggerKey(' ')
      expect(handlers.hardDrop).toHaveBeenCalled()
    })

    it('should prevent default on handled keys to prevent scrolling', () => {
      renderHook(() => useKeyboard(true, handlers))
      const evt = triggerKey(' ')
      expect(evt.preventDefault).toHaveBeenCalled()
    })

    it('should ignore unmapped keys', () => {
      renderHook(() => useKeyboard(true, handlers))
      triggerKey('A')
      expect(handlers.moveLeft).not.toHaveBeenCalled()
      expect(handlers.moveRight).not.toHaveBeenCalled()
    })
  })
})
