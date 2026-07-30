// ─────────────────────────────────────────────────────────────────────────────
// src/client/socket.js
// Initialise la connexion socket.io-client — exposé comme fonctions pures
// Zéro `this` — pas de classe
// ─────────────────────────────────────────────────────────────────────────────

import { io } from "socket.io-client";
import {
  connectionChanged,
  gameError,
  gameJoined,
  gameOver,
  gameReset,
  gameStarted,
  playerJoined,
  playerLeft,
} from "./actions/game";
import { addPenalty, newPiece, playerDied, setPlayer } from "./actions/player";
import {
  addOpponent,
  opponentDied,
  setOpponents,
  updateSpectrum,
} from "./actions/opponents";
import { scoreUpdate } from "./actions/scores";
import { leaderboardUpdate } from "./actions/leaderboard";

let socket = null;

// Mémorisés pour la reconnexion : socket.io rétablit le transport mais avec une
// nouvelle id, et le serveur a retiré le joueur au `disconnect`. Sans nouveau
// joinGame, le client continue de jouer dans une partie qui l'a oublié.
let joinParams = null;
let joined = false;

/**
 * Initialise la connexion socket.io et enregistre tous les listeners.
 * Doit être appelée une seule fois au montage de l'app.
 * @param {Function} dispatch  — Redux dispatch
 */
export const initSocket = (dispatch) => {
  if (socket) return socket;

  socket = io(window.location.origin, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    dispatch(connectionChanged(true));
    // Uniquement après une coupure : le premier joinGame part du montage de
    // RoomEntry et socket.io le met en file jusqu'à la connexion.
    if (joined && joinParams) {
      joined = false;
      socket.emit("joinGame", joinParams);
    }
  });

  socket.on("disconnect", () => {
    dispatch(connectionChanged(false));
  });

  socket.on("gameJoined", (payload) => {
    joined = true;
    dispatch(gameJoined(payload));
    const me = payload.players.find((p) => p.name === payload.playerName);
    dispatch(
      setPlayer({
        name: payload.playerName,
        isHost: payload.isHost,
        isAlive: me ? me.isAlive : true,
      }),
    );
    dispatch(setOpponents(
      payload.players
        .filter((p) => p.name !== payload.playerName)
        .map((p) => ({
          name: p.name,
          spectrum: Array(10).fill(0),
          isAlive: p.isAlive,
        })),
    ));
  });

  socket.on("playerJoined", (payload) => {
    dispatch(playerJoined(payload));
    // Ajouter l'adversaire dans la liste opponents sans écraser les existants
    dispatch(
      addOpponent({ name: payload.playerName, isAlive: payload.isAlive }),
    );
  });

  socket.on("playerLeft", (payload) => {
    dispatch(playerLeft(payload));
  });

  socket.on("gameStarted", (payload) => {
    dispatch(gameStarted(payload));
    dispatch(newPiece(payload));
  });

  socket.on("newPiece", (payload) => {
    dispatch(newPiece(payload));
  });

  socket.on("updateSpectrum", (payload) => {
    dispatch(updateSpectrum(payload));
  });

  socket.on("opponentDead", ({ playerName }) => {
    dispatch(opponentDied(playerName));
  });

  socket.on("addPenalty", ({ lines }) => {
    dispatch(addPenalty(lines));
  });

  socket.on("gameOver", (payload) => {
    dispatch(gameOver(payload));
  });

  socket.on("score:update", (payload) => {
    dispatch(scoreUpdate(payload));
  });

  socket.on("leaderboard:update", (payload) => {
    dispatch(leaderboardUpdate(payload));
  });

  socket.on("error", ({ message }) => {
    dispatch(gameError(message));
  });

  return socket;
};

// ── Émetteurs ─────────────────────────────────────────────────────────────────

export const emitJoinGame = (room, playerName) => {
  joinParams = { room, playerName };
  if (socket) socket.emit("joinGame", joinParams);
};

export const emitStartGame = (room) => {
  if (socket) socket.emit("startGame", { room });
};

export const emitAction = (room, action) => {
  if (socket) socket.emit("playerAction", { room, action });
};

export const emitPlayerDead = (room) => {
  if (socket) socket.emit("playerDead", { room });
};

export const emitLeaveGame = (room) => {
  if (socket) socket.emit("leaveGame", { room });
};

export const emitLinesCleared = (room, linesCleared) => {
  if (socket) socket.emit("linesCleared", { room, linesCleared });
};

export const emitRequestNextPiece = (room) => {
  if (socket) socket.emit("requestNextPiece", { room });
};

export const emitUpdateSpectrum = (room, spectrum) => {
  if (socket) socket.emit("updateSpectrum", { room, spectrum });
};

export const getSocket = () => socket;
