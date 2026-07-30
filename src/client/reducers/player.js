// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/player.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  addPenaltyLines,
  createEmptyBoard,
  liftPiece,
} from "../../shared/gameLogic";
import { PIECES, SPAWN_X, SPAWN_Y } from "../../shared/constants";
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
  currentPiece: null, // { type, shape, x, y, rot }
  nextPieceType: null,
  holdPieceType: null,
  canHold: true,
  lines: 0, // total effacé cette manche — pilote le niveau et donc la gravité
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
      const nextType = nextPiece ? nextPiece.type : null;

      // Si on a déjà une pièce (spawn prédictif côté client), on n'écrase pas.
      // Mais on met TOUJOURS à jour la preview.
      if (state.currentPiece) return { ...state, nextPieceType: nextType };

      const definition = PIECES[piece.type];
      return {
        ...state,
        currentPiece: {
          type: piece.type,
          shape: piece.shape || (definition ? definition.shape : null),
          x: piece.spawnX !== undefined ? piece.spawnX : SPAWN_X[piece.type],
          y: piece.spawnY !== undefined ? piece.spawnY : SPAWN_Y,
          rot: 0,
        },
        nextPieceType: nextType,
      };
    }

    case ADD_PENALTY: {
      const n = action.payload;
      const board = addPenaltyLines(state.board, n);
      return {
        ...state,
        board,
        // Le sol monte de n rangées : la pièce en cours monte avec lui. Sans ça
        // elle se retrouve DANS le tas et le check de mort de Game.jsx la
        // déclare perdue alors qu'elle n'a rien fait.
        currentPiece: liftPiece(board, state.currentPiece, n),
        penaltyLines: n,
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
      };

    default:
      return state;
  }
};

export default playerReducer;
