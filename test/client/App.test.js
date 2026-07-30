import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { thunk } from "redux-thunk";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@testing-library/jest-dom";

import App, { Main } from "../../src/client/components/App";

// Mocks
jest.mock("../../src/client/socket", () => ({
  initSocket: jest.fn(),
  emitJoinGame: jest.fn(),
  emitStartGame: jest.fn(),
}));

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe("App Component", () => {
  it("renders Home screen for / route", () => {
    const store = mockStore({});
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/"]}>
          <Main />
        </MemoryRouter>
      </Provider>,
    );
    // Le titre est fragmenté : « RED » porte l'accent dans son propre span.
    expect(screen.getByRole("heading", { name: "RED TETRIS" }))
      .toBeInTheDocument();
    expect(screen.getByText(/Navigate to/)).toBeInTheDocument();
  });

  it("renders RoomEntry (Connecting) when room is not yet in state", () => {
    const store = mockStore({
      game: { room: null },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/room1/alice"]}>
          <Main />
        </MemoryRouter>
      </Provider>,
    );
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });
});
