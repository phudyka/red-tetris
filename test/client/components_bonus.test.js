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
  });
});
