import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import "@testing-library/jest-dom";

import ScorePanel from "../../src/client/components/ScorePanel";
import Leaderboard from "../../src/client/components/Leaderboard";

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("Bonus Components", () => {
  describe("ScorePanel", () => {
    it("ScorePanel should render score, lines and level in solo", () => {
      const store = mockStore({
        scores: { Alice: 1200 },
        player: { name: "Alice" },
        opponents: [],
      });
      render(
        <Provider store={store}>
          <ScorePanel level={4} lines={37} />
        </Provider>,
      );
      expect(screen.getByText(/1.*200/)).toBeInTheDocument();
      expect(screen.getByText("Score")).toBeInTheDocument();
      expect(screen.getByText("37")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("ScorePanel affiche l'objectif du sprint à côté des lignes", () => {
      const store = mockStore({
        scores: { Alice: 0 },
        player: { name: "Alice" },
        opponents: [],
      });
      const { container } = render(
        <Provider store={store}>
          <ScorePanel level={1} lines={12} goal={40} />
        </Provider>,
      );
      expect(screen.getByText("12")).toBeInTheDocument();
      expect(container.querySelector(".stat__goal").textContent).toBe("/40");
    });

    it("ScorePanel n'affiche aucun objectif hors sprint", () => {
      const store = mockStore({
        scores: { Alice: 0 },
        player: { name: "Alice" },
        opponents: [],
      });
      const { container } = render(
        <Provider store={store}>
          <ScorePanel level={1} lines={12} />
        </Provider>,
      );
      expect(container.querySelector(".stat__goal")).toBeNull();
    });

    it("ScorePanel should render the top opponent score in multi", () => {
      const store = mockStore({
        scores: { Alice: 1200, Bob: 800 },
        player: { name: "Alice" },
        opponents: [{ name: "Bob" }],
      });
      render(
        <Provider store={store}>
          <ScorePanel level={1} lines={0} />
        </Provider>,
      );
      expect(screen.getByText(/1.*200/)).toBeInTheDocument();
      expect(screen.getByText("800")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });

  describe("Leaderboard", () => {
    it("Leaderboard should render list of scores", () => {
      const store = mockStore({
        leaderboard: [
          { playerName: "Alice", score: 2000 },
          { playerName: "Bob", score: 1000 },
        ],
      });
      render(
        <Provider store={store}>
          <Leaderboard onClose={() => {}} />
        </Provider>,
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText(/2.*000.*pts/)).toBeInTheDocument();
      expect(screen.getByText(/#.*1/)).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("Leaderboard qualifie chaque record par son mode", () => {
      const store = mockStore({
        leaderboard: [
          { playerName: "Alice", score: 2000, mode: "INV·SPR" },
          { playerName: "Bob", score: 1000, mode: "CLASSIC" },
        ],
      });
      render(
        <Provider store={store}>
          <Leaderboard onClose={() => {}} />
        </Provider>,
      );
      expect(screen.getByText("INV·SPR")).toBeInTheDocument();
      expect(screen.getByText("CLASSIC")).toBeInTheDocument();
    });

    it("Leaderboard retombe sur CLASSIC pour une entrée sans mode", () => {
      const store = mockStore({
        leaderboard: [{ playerName: "Alice", score: 500 }],
      });
      render(
        <Provider store={store}>
          <Leaderboard onClose={() => {}} />
        </Provider>,
      );
      expect(screen.getByText("CLASSIC")).toBeInTheDocument();
    });
  });
});
