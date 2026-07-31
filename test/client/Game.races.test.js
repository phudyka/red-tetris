// ─────────────────────────────────────────────────────────────────────────────
// test/client/Game.races.test.js
// Deux courses entre un timer et un événement serveur. Le store est réel (et non
// mocké) : ces deux bugs ne se voient que lorsque le state change vraiment entre
// le moment où le timer est armé et celui où il tire.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { thunk } from "redux-thunk";

import Game from "../../src/client/components/Game";
import rootReducer from "../../src/client/reducers";
import { addPenalty, setPlayer } from "../../src/client/actions/player";
import { GAME_STARTED } from "../../src/client/actions/game";
import { createEmptyBoard } from "../../src/shared/gameLogic";
import { PIECES } from "../../src/shared/constants";

jest.mock("../../src/client/socket", () => ({
  emitPlayerDead: jest.fn(),
  emitPieceLocked: jest.fn(),
  emitRequestNextPiece: jest.fn(),
  emitUpdateSpectrum: jest.fn(),
}));

const { emitPieceLocked } = require("../../src/client/socket");

let capturedOnTick = null;
jest.mock(
  "../../src/client/hooks/useGameLoop",
  () => (isPlaying, _interval, onTick) => {
    capturedOnTick = isPlaying ? onTick : null;
  },
);

/**
 * Store réel amené dans l'état « partie en cours », avec le plateau et la pièce
 * demandés.
 */
const renderWithRealStore = ({ board, piece, ...playerFields }) => {
  const store = createStore(rootReducer, applyMiddleware(thunk));
  store.dispatch({ type: GAME_STARTED });
  store.dispatch(setPlayer({ name: "Alice", ...playerFields }));
  store.dispatch({ type: "SET_BOARD", payload: board });
  store.dispatch({ type: "SET_PIECE", payload: piece });

  const utils = render(
    <Provider store={store}>
      <Game />
    </Provider>,
  );
  return { store, ...utils };
};

beforeEach(() => {
  capturedOnTick = null;
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("Course entre le lock delay et le hold", () => {
  it("annule le verrouillage en attente quand la pièce est échangée", () => {
    const { store } = renderWithRealStore({
      board: createEmptyBoard(),
      // T posé au sol : le prochain tick le trouve bloqué et arme le lock delay.
      piece: { type: "T", shape: PIECES.T.shape, x: 3, y: 18, rot: 0 },
      nextPieceType: "J",
      holdPieceType: "L",
      canHold: true,
    });

    // Tick sur une pièce bloquée → lock delay armé (500 ms).
    act(() => {
      capturedOnTick();
    });

    // Le joueur échange avant l'expiration : la pièce au sol part en réserve et
    // un L neuf apparaît tout en haut.
    act(() => {
      fireEvent.keyDown(window, { key: "c" });
    });
    expect(store.getState().player.currentPiece.type).toBe("L");
    expect(store.getState().player.currentPiece.y).toBe(0);

    // Le timer armé pour l'ancienne pièce ne doit pas verrouiller la nouvelle.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(emitPieceLocked).not.toHaveBeenCalled();
    expect(store.getState().player.currentPiece.type).toBe("L");
    expect(store.getState().player.currentPiece.y).toBe(0);
  });
});

describe("Course entre l'animation d'effacement et une pénalité", () => {
  it("conserve les lignes de pénalité reçues pendant l'animation", () => {
    const board = createEmptyBoard();
    // Rangée du bas complète sauf les deux premières colonnes : le O posé en
    // x = 0 la termine.
    board[19] = [0, 0, 1, 1, 1, 1, 1, 1, 1, 1];

    const { store } = renderWithRealStore({
      board,
      piece: { type: "O", shape: PIECES.O.shape, x: 0, y: 0, rot: 0 },
      nextPieceType: "J",
      canHold: true,
    });

    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });
    expect(emitPieceLocked.mock.calls[0][1]).toMatchObject({ lines: 1 });

    // Un adversaire envoie 2 lignes pendant les 300 ms d'animation.
    act(() => {
      store.dispatch(addPenalty(2));
    });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    const after = store.getState().player.board;
    const penaltyRows = after.filter((row) => row.every((c) => c === 8));
    expect(penaltyRows).toHaveLength(2);
    // Les pénalités sont bien tout en bas…
    expect(after[19].every((c) => c === 8)).toBe(true);
    expect(after[18].every((c) => c === 8)).toBe(true);
    // …la ligne complétée a disparu, et il ne reste au-dessus que les deux
    // cases du O qui dépassaient de la rangée effacée.
    expect(after[17]).toEqual([2, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(after.slice(0, 17).every((row) => row.every((c) => c === 0)))
      .toBe(true);
  });
});
