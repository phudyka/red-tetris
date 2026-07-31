import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import "@testing-library/jest-dom";

import Cell from "../../src/client/components/Cell";
import OpponentView from "../../src/client/components/OpponentView";
import Lobby from "../../src/client/components/Lobby";
import GameOver from "../../src/client/components/GameOver";

// Mock des fonctions socket qui émettent des events
jest.mock("../../src/client/socket", () => ({
  emitStartGame: jest.fn(),
  emitSetMode: jest.fn(),
}));
const { emitSetMode, emitStartGame } = require("../../src/client/socket");

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("React Components", () => {
  // ── Cell ────────────────────────────────────────────────────────────────
  describe("Cell", () => {
    it("should render an empty cell with proper class", () => {
      const { container } = render(<Cell value={0} />);
      expect(container.firstChild).toHaveClass("cell", "cell--empty");
    });

    it("should render a piece cell (T) with proper class", () => {
      const { container } = render(<Cell value={3} />); // 3 = T (COLOR_INDEX)
      expect(container.firstChild).toHaveClass("cell", "cell--T");
    });

    it("should render a ghost cell exclusively when state is ghost", () => {
      const { container } = render(<Cell value={3} state="ghost" />);
      expect(container.firstChild).toHaveClass("cell", "cell--ghost");
      expect(container.firstChild).not.toHaveClass("cell--T");
    });

    it("should render penalty cell on value 8", () => {
      const { container } = render(<Cell value={8} />);
      expect(container.firstChild).toHaveClass("cell", "cell--penalty");
    });

    it("should mark pushed cells as rising, blocks and penalty rows alike", () => {
      const { container: block } = render(
        <Cell value={3} state="stacked" rising />,
      );
      expect(block.firstChild).toHaveClass(
        "cell--T",
        "cell--stacked",
        "cell--rising",
      );

      const { container: penalty } = render(
        <Cell value={8} state="stacked" rising />,
      );
      expect(penalty.firstChild).toHaveClass("cell--penalty", "cell--rising");
    });

    it("should never mark an empty cell as rising — it paints nothing", () => {
      const { container } = render(<Cell value={0} state="empty" rising />);
      expect(container.firstChild).toHaveClass("cell--empty");
      expect(container.firstChild).not.toHaveClass("cell--rising");
    });
  });

  // ── OpponentView ────────────────────────────────────────────────────────
  describe("OpponentView", () => {
    it("should render name and spectrum heights properly", () => {
      const spectrum = [1, 5, 0, 0, 0, 0, 0, 0, 0, 2];
      render(<OpponentView name="Bob" spectrum={spectrum} isAlive={true} />);

      expect(screen.getByText("Bob")).toBeInTheDocument();

      // Verification des barres
      const spectrumContainer = screen.getByRole("img", {
        name: `spectrum of Bob`,
      });
      const bars = spectrumContainer.children;
      expect(bars.length).toBe(10);

      // Le remplissage est un facteur d'échelle (height / 20), appliqué en
      // scaleY : une transition de hauteur relayouterait le cadre à chaque
      // spectrum reçu. Ex : 5 → 5/20 = 0.25
      expect(bars[1].style.getPropertyValue("--fill")).toBe("0.25");

      // Une colonne vide garde un liseré au lieu de disparaître.
      expect(Number(bars[2].style.getPropertyValue("--fill"))).toBeGreaterThan(
        0,
      );
    });

    it("should apply dead class when isAlive is false", () => {
      const { container } = render(
        <OpponentView
          name="Bob"
          spectrum={Array(10).fill(0)}
          isAlive={false}
        />,
      );
      expect(container.firstChild).toHaveClass("opponent", "opponent--dead");
    });
  });

  // ── Lobby ───────────────────────────────────────────────────────────────
  describe("Lobby", () => {
    const initialState = {
      game: { room: "roomA", players: [{ name: "Alice", isHost: true }] },
      player: { name: "Alice", isHost: true },
      scores: {},
      leaderboard: [],
    };

    it("should render room name and active player", () => {
      const store = mockStore(initialState);
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>,
      );
      expect(screen.getByText("roomA")).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText("HOST")).toBeInTheDocument();
    });

    it("should allow host to click Start Game", () => {
      const store = mockStore(initialState);
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>,
      );
      const btn = screen.getByRole("button", { name: /Start Game/i });
      expect(btn).not.toBeDisabled();

      fireEvent.click(btn);
      expect(emitStartGame).toHaveBeenCalledWith("roomA");
    });

    it("should disable Start Game for non-hosts", () => {
      const notHostState = {
        ...initialState,
        player: { name: "Bob", isHost: false },
      };
      const store = mockStore(notHostState);
      render(
        <Provider store={store}>
          <Lobby />
        </Provider>,
      );
      const btn = screen.getByRole("button", { name: /Start Game/i });
      expect(btn).toBeDisabled();
      expect(screen.getByText(/Waiting for the host/)).toBeInTheDocument();
    });

    // ── Modificateurs ─────────────────────────────────────────────────────
    describe("modificateurs", () => {
      const withModes = (modes, isHost = true) => ({
        ...initialState,
        game: { ...initialState.game, modes },
        player: { name: isHost ? "Alice" : "Bob", isHost },
      });

      beforeEach(() => emitSetMode.mockClear());

      it("expose les trois modificateurs avec leur état", () => {
        const store = mockStore(
          withModes({ invisible: true, gravity: false, sprint: false }),
        );
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );

        expect(screen.getByRole("button", { name: /Invisible/i }))
          .toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: /Gravity/i }))
          .toHaveAttribute("aria-pressed", "false");
        expect(screen.getByRole("button", { name: /Sprint 40/i }))
          .toHaveAttribute("aria-pressed", "false");
      });

      // N'envoyer que l'interrupteur touché : deux clics rapprochés partis avec
      // l'ensemble des modes se rembobineraient l'un l'autre, le second portant
      // un état que l'écho du premier n'a pas encore mis à jour.
      it("n'envoie que le modificateur basculé", () => {
        const store = mockStore(
          withModes({ invisible: true, gravity: false, sprint: false }),
        );
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );

        fireEvent.click(screen.getByRole("button", { name: /Sprint 40/i }));
        expect(emitSetMode).toHaveBeenCalledWith("roomA", "sprint", true);
      });

      it("éteint un modificateur déjà armé", () => {
        const store = mockStore(
          withModes({ invisible: true, gravity: false, sprint: false }),
        );
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );

        fireEvent.click(screen.getByRole("button", { name: /Invisible/i }));
        expect(emitSetMode).toHaveBeenCalledWith("roomA", "invisible", false);
      });

      it("deux bascules rapprochées ne s'annulent pas", () => {
        const store = mockStore(
          withModes({ invisible: false, gravity: false, sprint: false }),
        );
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );

        fireEvent.click(screen.getByRole("button", { name: /Invisible/i }));
        fireEvent.click(screen.getByRole("button", { name: /Sprint 40/i }));

        expect(emitSetMode).toHaveBeenNthCalledWith(
          1,
          "roomA",
          "invisible",
          true,
        );
        expect(emitSetMode).toHaveBeenNthCalledWith(2, "roomA", "sprint", true);
      });

      // Le non-host doit lire ce qui est armé — c'est la manche qu'il va jouer.
      it("laisse la liste lisible au non-host mais la rend inerte", () => {
        const store = mockStore(
          withModes({ invisible: false, gravity: true, sprint: false }, false),
        );
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );

        const gravity = screen.getByRole("button", { name: /Gravity/i });
        expect(gravity).toBeDisabled();
        expect(gravity).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(gravity);
        expect(emitSetMode).not.toHaveBeenCalled();
      });

      it("tient debout sans modes dans le store", () => {
        const store = mockStore(initialState);
        render(
          <Provider store={store}>
            <Lobby />
          </Provider>,
        );
        expect(screen.getByRole("button", { name: /Invisible/i }))
          .toHaveAttribute("aria-pressed", "false");
      });
    });
  });

  // ── GameOver ────────────────────────────────────────────────────────────
  describe("GameOver", () => {
    let store;
    beforeEach(() => {
      store = mockStore({
        game: { room: "r1", winner: "Alice" },
        player: { isHost: true, name: "Alice" },
        opponents: [],
        scores: { Alice: 1000 },
        leaderboard: [],
      });
      store.dispatch = jest.fn();
    });

    it("should render winner name", () => {
      render(
        <Provider store={store}>
          <GameOver />
        </Provider>,
      );
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/wins!/)).toBeInTheDocument();
    });

    it("should trigger restarts actions when Play Again is clicked by host", () => {
      render(
        <Provider store={store}>
          <GameOver />
        </Provider>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Play Again/i }));
      expect(store.dispatch).toHaveBeenCalledTimes(3); // gameReset, resetPlayer, setOpponents
      expect(emitStartGame).toHaveBeenCalledWith("r1");
    });
  });
});
