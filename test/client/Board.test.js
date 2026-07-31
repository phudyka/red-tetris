import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import "@testing-library/jest-dom";
import Board from "../../src/client/components/Board";
import { createEmptyBoard } from "../../src/shared/gameLogic";

const mockStore = configureStore([]);

describe("Board Component", () => {
  it("should render an empty board correctly", () => {
    const store = mockStore({
      player: {
        board: createEmptyBoard(),
        currentPiece: null,
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    const cells = container.querySelectorAll(".cell");
    expect(cells.length).toBe(200); // 10x20
    expect(cells[0]).toHaveClass("cell--empty");
  });

  it("should render the active piece correctly", () => {
    const board = createEmptyBoard();
    const store = mockStore({
      player: {
        board,
        currentPiece: {
          type: "O",
          shape: [[1, 1], [1, 1]],
          x: 4,
          y: 0,
        },
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    // Le tas garde ses 200 cellules ; la pièce en cours est un calque posé
    // par-dessus, placé explicitement dans la grille.
    // 200 du tas + 4 du ghost + 4 de la pièce
    expect(container.querySelectorAll(".cell").length).toBe(208);

    const active = container.querySelectorAll(".cell--O.cell--active");
    expect(active.length).toBe(4);

    // O en x=4, y=0 → colonnes 5-6, rangées 1-2 (grille CSS en base 1)
    const placement = Array.from(active)
      .map((el) => `${el.style.gridColumn}/${el.style.gridRow}`)
      .sort();
    expect(placement).toEqual(["5/1", "5/2", "6/1", "6/2"]);
  });

  it("should render the ghost piece", () => {
    const board = createEmptyBoard();
    const store = mockStore({
      player: {
        board,
        currentPiece: {
          type: "T",
          shape: [[0, 1, 0], [1, 1, 1]],
          x: 4,
          y: 0,
        },
      },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    const ghosts = container.querySelectorAll(".cell--ghost");
    expect(ghosts.length).toBe(4);

    // T lâché sur un plateau vide se pose en y=18 ; sa cellule haute est en x=5
    // (décalage de la shape [0,1,0]) → colonne 6, rangée 19.
    const placement = Array.from(ghosts)
      .map((el) => `${el.style.gridColumn}/${el.style.gridRow}`);
    expect(placement).toContain("6/19");
  });

  // ── Poussée de pénalité ──────────────────────────────────────────────────
  describe("penalty push", () => {
    // Plateau reçu après 2 lignes de pénalité : deux rangées de 8 en bas,
    // un bloc posé qui a été remonté de deux crans.
    const penalizedBoard = () => {
      const board = createEmptyBoard();
      board[17][0] = 3;
      board[18] = Array(10).fill(8);
      board[19] = Array(10).fill(8);
      return board;
    };

    it("should lift every filled cell by the penalty height", () => {
      const store = mockStore({
        player: {
          board: penalizedBoard(),
          currentPiece: null,
          penaltyLines: 2,
          penaltySeq: 1,
        },
      });

      const { container } = render(
        <Provider store={store}>
          <Board />
        </Provider>,
      );

      const well = container.querySelector(".board");
      expect(well).toHaveClass("board--penalty");
      expect(well.style.getPropertyValue("--rise")).toBe("2");

      // 20 cases de pénalité + le bloc remonté ; jamais une case vide, elle ne
      // peint rien.
      const rising = container.querySelectorAll(".cell--rising");
      expect(rising.length).toBe(21);
      expect(container.querySelectorAll(".cell--empty.cell--rising").length)
        .toBe(0);
    });

    it("should not push anything without a penalty", () => {
      const store = mockStore({
        player: {
          board: penalizedBoard(),
          currentPiece: null,
          penaltyLines: 0,
          penaltySeq: 0,
        },
      });

      const { container } = render(
        <Provider store={store}>
          <Board />
        </Provider>,
      );

      expect(container.querySelector(".board")).not.toHaveClass(
        "board--penalty",
      );
      expect(container.querySelectorAll(".cell--rising").length).toBe(0);
    });
  });

  // ── Sillage de hard drop ─────────────────────────────────────────────────
  it("should place the hard drop trail in the swept columns", () => {
    const store = mockStore({
      player: { board: createEmptyBoard(), currentPiece: null },
    });

    const trail = {
      seq: 1,
      type: "I",
      cols: [{ x: 3, from: 0, to: 19 }, { x: 4, from: 0, to: 19 }],
    };

    const { container } = render(
      <Provider store={store}>
        <Board dropTrail={trail} />
      </Provider>,
    );

    const bands = container.querySelectorAll(".drop-trail");
    expect(bands.length).toBe(2);
    // Grille CSS en base 1, et la borne de fin est exclusive.
    expect(bands[0].style.gridColumn).toBe("4");
    expect(bands[0].style.gridRow).toBe("1 / 21");
    expect(bands[0].style.getPropertyValue("--tint")).toBe("var(--block-I)");
  });

  // ── Élimination ──────────────────────────────────────────────────────────
  it("should drain the well when the player is dead", () => {
    const store = mockStore({
      player: { board: createEmptyBoard(), currentPiece: null, isAlive: false },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    expect(container.querySelector(".board")).toHaveClass("board--dead");
  });

  // ── Mode invisible ───────────────────────────────────────────────────────
  // Le puits ne perd pas ses cellules : c'est une classe qui les éteint, et le
  // libellé du lecteur d'écran dit la règle plutôt que de la subir.
  it("marque le puits quand le mode invisible est armé", () => {
    const store = mockStore({
      player: { board: createEmptyBoard(), currentPiece: null, isAlive: true },
      game: { modes: { invisible: true, gravity: false, sprint: false } },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    const board = container.querySelector(".board");
    expect(board).toHaveClass("board--invisible");
    expect(board.getAttribute("aria-label")).toMatch(/invisible mode/i);
    expect(container.querySelectorAll(".cell").length).toBe(200);
  });

  it("ne marque rien hors mode invisible", () => {
    const store = mockStore({
      player: { board: createEmptyBoard(), currentPiece: null, isAlive: true },
      game: { modes: { invisible: false, gravity: true, sprint: true } },
    });

    const { container } = render(
      <Provider store={store}>
        <Board />
      </Provider>,
    );

    expect(container.querySelector(".board")).not.toHaveClass(
      "board--invisible",
    );
  });
});
