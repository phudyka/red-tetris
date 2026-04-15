// ─────────────────────────────────────────────────────────────────────────────
// src/client/reducers/player.js
// ─────────────────────────────────────────────────────────────────────────────

import { createEmptyBoard, addPenaltyLines } from '../../shared/gameLogic'
import { PIECES } from '../../shared/constants'
import {
  SET_PLAYER,
  SET_BOARD,
  NEW_PIECE,
  SET_GHOST,
  ADD_PENALTY,
  PLAYER_DIED,
  RESET_PLAYER,
} from '../actions/player'
import { GAME_RESET } from '../actions/game'

// Constante locale — dispatché directement depuis Game.jsx pour éviter import circulaire
const SET_PIECE = 'SET_PIECE'

const initialState = {
  name: null,
  isHost: false,
  isAlive: true,
  board: createEmptyBoard(),
  currentPiece: null, // { type, shape, x, y }
  nextPieceType: null,
  holdPieceType: null,
  canHold: true,
  ghostY: null,
}

const playerReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PLAYER:
      return { ...state, ...action.payload }

    case SET_BOARD:
      return { ...state, board: action.payload }

    // Dispatché directement par Game.jsx (mouvement, rotation, descente)
    case SET_PIECE:
      return { ...state, currentPiece: action.payload }
    case NEW_PIECE: {
      const { piece, nextPiece } = action.payload
      const nextPieceState = nextPiece ? { type: nextPiece.type } : null
      
      // Si on a déjà une pièce (Predictive spawning / Fast move), on n'écrase pas.
      // Mais on met TOUJOURS à jour la preview (nextPieceType).
      if (state.currentPiece) {
        return {
          ...state,
          nextPieceType: nextPieceState ? nextPieceState.type : null,
          ghostY: null,
        }
      }

      const newPieceState = {
        type: piece.type,
        shape: piece.shape || (PIECES[piece.type] ? PIECES[piece.type].shape : null),
        x: piece.spawnX,
        y: piece.spawnY,
      }
      return {
        ...state,
        currentPiece: newPieceState,
        nextPieceType: nextPieceState ? nextPieceState.type : null,
        ghostY: null,
      }
    }

    case SET_GHOST:
      return { ...state, ghostY: action.payload }

    case ADD_PENALTY: {
      const newBoard = addPenaltyLines(state.board, action.payload)
      return { ...state, board: newBoard }
    }

    case PLAYER_DIED:
      return { ...state, isAlive: false }

    case RESET_PLAYER:
    case GAME_RESET:
      return {
        ...initialState,
        name: state.name,
        isHost: state.isHost,
        board: createEmptyBoard(),
        canHold: true,
      }

    default:
      return state
  }
}

export default playerReducer
