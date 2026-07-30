import { renderHook } from "@testing-library/react";
import { useEffect } from "react";
import useGameLoop from "../../src/client/hooks/useGameLoop";

describe("Client Hooks", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ── useGameLoop ────────────────────────────────────────────────────────
  describe("useGameLoop", () => {
    it("should NOT call onTick if isPlaying is false", () => {
      const onTick = jest.fn();
      renderHook(() => useGameLoop(false, 800, onTick));

      jest.advanceTimersByTime(1000);
      expect(onTick).not.toHaveBeenCalled();
    });

    it("should call onTick at tickInterval when isPlaying is true", () => {
      const onTick = jest.fn();
      renderHook(() => useGameLoop(true, 800, onTick));

      jest.advanceTimersByTime(799);
      expect(onTick).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(onTick).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(800);
      expect(onTick).toHaveBeenCalledTimes(2);
    });

    it("should cleanup interval on unmount", () => {
      const onTick = jest.fn();
      const { unmount } = renderHook(() => useGameLoop(true, 800, onTick));

      unmount();
      jest.advanceTimersByTime(1000);
      expect(onTick).not.toHaveBeenCalled();
    });
  });
});
