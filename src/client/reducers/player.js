// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/player.js
// ─────────────────────────────────────────────────────────────────────────────

import { addPenaltyLines, createEmptyBoard } from "../../shared/gameLogic";
import { PIECES } from "../../shared/constants";
import {
  ADD_PENALTY,
  NEW_PIECE,
  PLAYER_DIED,
  RESET_PLAYER,
  SET_BOARD,
  SET_PLAYER,
} from "../actions/player";
import { GAME_RESET, GAME_STARTED } from "../actions/game";

// Constante locale — dispatché directement depuis Game.jsx pour éviter import circulaire
const SET_PIECE = "SET_PIECE";

const initialState = {
  name: null,
  isHost: false,
  isAlive: true,
  board: createEmptyBoard(),
  currentPiece: null, // { type, shape, x, y }
  nextPieceType: null,
  holdPieceType: null,
  canHold: true,
  // Dernière pénalité reçue — lue par la région live de Game.jsx.
  // penaltySeq incrémente à chaque pénalité pour distinguer deux fois "2 lignes".
  penaltyLines: 0,
  penaltySeq: 0,
};

const playerReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PLAYER:
      return { ...state, ...action.payload };

    case SET_BOARD:
      return { ...state, board: action.payload };

    // Dispatché directement par Game.jsx (mouvement, rotation, descente)
    case SET_PIECE:
      return { ...state, currentPiece: action.payload };
    case NEW_PIECE: {
      const { piece, nextPiece } = action.payload;
      const nextPieceState = nextPiece ? { type: nextPiece.type } : null;

      // Si on a déjà une pièce (Predictive spawning / Fast move), on n'écrase pas.
      // Mais on met TOUJOURS à jour la preview (nextPieceType).
      if (state.currentPiece) {
        return {
          ...state,
          nextPieceType: nextPieceState ? nextPieceState.type : null,
        };
      }

      const newPieceState = {
        type: piece.type,
        shape: piece.shape ||
          (PIECES[piece.type] ? PIECES[piece.type].shape : null),
        x: piece.spawnX,
        y: piece.spawnY,
      };
      return {
        ...state,
        currentPiece: newPieceState,
        nextPieceType: nextPieceState ? nextPieceState.type : null,
      };
    }

    case ADD_PENALTY: {
      const newBoard = addPenaltyLines(state.board, action.payload);
      return {
        ...state,
        board: newBoard,
        penaltyLines: action.payload,
        penaltySeq: state.penaltySeq + 1,
      };
    }

    case PLAYER_DIED:
      return { ...state, isAlive: false };

    // GAME_STARTED remet à zéro chez TOUS les clients : au restart, seul le host
    // dispatche GAME_RESET localement, les autres garderaient board + isAlive=false.
    case GAME_STARTED:
    case RESET_PLAYER:
    case GAME_RESET:
      return {
        ...initialState,
        name: state.name,
        isHost: state.isHost,
        board: createEmptyBoard(),
        canHold: true,
      };

    default:
      return state;
  }
};

export default playerReducer;
