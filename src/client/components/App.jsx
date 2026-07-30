// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/App.jsx
// Router principal — BrowserRouter + route /:room/:playerName
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Lobby from "./Lobby";
import Game from "./Game";
import { emitJoinGame, initSocket } from "../socket";

// ── Composant interne : lit les params URL et rejoint la room ─────────────────
const RoomEntry = () => {
  const { room, playerName } = useParams();
  const dispatch = useDispatch();
  const started = useSelector((s) => s.game.started);
  const gameRoom = useSelector((s) => s.game.room);

  useEffect(() => {
    initSocket(dispatch);
    emitJoinGame(room, playerName);
  }, [room, playerName, dispatch]);

  if (!gameRoom) {
    // Connexion en cours
    return (
      <div className="screen">
        <p className="screen__hint" role="status">Connecting…</p>
      </div>
    );
  }

  return started ? <Game /> : <Lobby />;
};

// ── Écran d'accueil (URL invalide) ───────────────────────────────────────────
const Home = () => (
  <div className="screen">
    <div className="panel lobby home">
      <h1 className="lobby__title">RED TETRIS</h1>
      <p className="lobby__subtitle">
        Navigate to <strong className="home__link">/:room/:playerName</strong>
        {" "}
        to start.
      </p>
      <p className="home__example">
        Example&nbsp;→&nbsp;<a className="home__link" href="/arena/alice">
          /arena/alice
        </a>
      </p>
    </div>
  </div>
);

// ── App routes ──────────────────────────────────────────────────────────────
export const Main = () => (
  <main className="app-main">
    <Routes>
      <Route path="/:room/:playerName" element={<RoomEntry />} />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </main>
);

// ── App root ─────────────────────────────────────────────────────────────────
const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <Main />
  </BrowserRouter>
);

export default App;
