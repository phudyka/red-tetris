import gameReducer from "../../src/client/reducers/game";
import playerReducer from "../../src/client/reducers/player";
import opponentsReducer from "../../src/client/reducers/opponents";

import {
  connectionChanged,
  gameError,
  gameJoined,
  gameOver,
  gameReset,
  gameStarted,
  modesChanged,
  playerJoined,
  playerLeft,
} from "../../src/client/actions/game";

import {
  addPenalty,
  newPiece,
  playerDied,
  resetPlayer,
  setBoard,
  setPlayer,
} from "../../src/client/actions/player";

import {
  opponentDied,
  setOpponents,
  updateSpectrum,
} from "../../src/client/actions/opponents";

import { createEmptyBoard } from "../../src/shared/gameLogic";

describe("Redux Reducers", () => {
  // ── GAME REDUCER ──────────────────────────────────────────────────────────
  describe("gameReducer", () => {
    const initGame = {
      room: null,
      started: false,
      over: false,
      winner: null,
      players: [],
      error: null,
      connected: true,
      modes: { invisible: false, gravity: false, sprint: false },
      modeTag: "CLASSIC",
    };

    it("should return initial state", () => {
      expect(gameReducer(undefined, {})).toEqual(initGame);
    });

    it("should handle GAME_JOINED", () => {
      const state = gameReducer(
        initGame,
        gameJoined({
          room: "room1",
          players: [{ name: "Alice", isHost: true }],
        }),
      );
      expect(state.room).toBe("room1");
      expect(state.players.length).toBe(1);
    });

    it("should handle PLAYER_JOINED", () => {
      const state = gameReducer(
        initGame,
        playerJoined({
          playerName: "Bob",
          isHost: false,
        }),
      );
      expect(state.players[0].name).toBe("Bob");
    });

    it("should handle PLAYER_LEFT and re-assign host", () => {
      const state1 = {
        ...initGame,
        players: [
          { name: "Alice", isHost: true },
          { name: "Bob", isHost: false },
        ],
      };
      const state2 = gameReducer(
        state1,
        playerLeft({
          playerName: "Alice",
          newHost: "Bob",
        }),
      );
      expect(state2.players.length).toBe(1);
      expect(state2.players[0].name).toBe("Bob");
      expect(state2.players[0].isHost).toBe(true); // Bob gained host!
    });

    it("should handle GAME_STARTED, GAME_OVER, GAME_RESET", () => {
      let state = gameReducer(initGame, gameStarted());
      expect(state.started).toBe(true);

      state = gameReducer(state, gameOver({ winner: "Alice" }));
      expect(state.over).toBe(true);
      expect(state.winner).toBe("Alice");

      state = gameReducer(state, gameReset());
      expect(state.started).toBe(false);
      expect(state.over).toBe(false);
      expect(state.winner).toBe(null);
    });

    it("should handle GAME_ERROR and clear it on GAME_JOINED", () => {
      let state = gameReducer(initGame, gameError("Game already started"));
      expect(state.error).toBe("Game already started");

      state = gameReducer(
        state,
        gameJoined({ room: "r", playerName: "Bob", players: [] }),
      );
      expect(state.error).toBeNull();
    });

    it("should clear a stale error when the next round starts", () => {
      let state = gameReducer(
        initGame,
        gameError("Only the host can start the game"),
      );
      state = gameReducer(state, gameStarted());
      expect(state.error).toBeNull();
    });

    // ── Modificateurs ──────────────────────────────────────────────────────
    it("should adopt the modes carried by GAME_JOINED", () => {
      const state = gameReducer(
        initGame,
        gameJoined({
          room: "r",
          players: [],
          modes: { invisible: true, gravity: false, sprint: true },
        }),
      );
      expect(state.modes).toEqual({
        invisible: true,
        gravity: false,
        sprint: true,
      });
    });

    it("should handle MODES_CHANGED", () => {
      const state = gameReducer(
        initGame,
        modesChanged({ invisible: false, gravity: true, sprint: false }),
      );
      expect(state.modes.gravity).toBe(true);
    });

    it("should keep the modes across GAME_RESET — they belong to the room", () => {
      let state = gameReducer(
        initGame,
        modesChanged({ invisible: true, gravity: false, sprint: false }),
      );
      state = gameReducer(state, gameReset());
      expect(state.modes.invisible).toBe(true);
      expect(state.started).toBe(false);
    });

    it("should record the mode tag of the round that just ended", () => {
      const state = gameReducer(
        initGame,
        gameOver({ winner: "Alice", mode: "INV·SPR" }),
      );
      expect(state.modeTag).toBe("INV·SPR");
    });

    it("should fall back to CLASSIC when gameOver carries no mode", () => {
      const state = gameReducer(initGame, gameOver({ winner: null }));
      expect(state.modeTag).toBe("CLASSIC");
    });

    it("should track connection loss", () => {
      let state = gameReducer(initGame, connectionChanged(false));
      expect(state.connected).toBe(false);
      state = gameReducer(state, connectionChanged(true));
      expect(state.connected).toBe(true);
    });
  });

  // ── PLAYER REDUCER ────────────────────────────────────────────────────────
  describe("playerReducer", () => {
    let initPlayer;

    beforeEach(() => {
      initPlayer = playerReducer(undefined, {});
    });

    it("should return initial state", () => {
      expect(initPlayer.name).toBe(null);
      expect(initPlayer.isHost).toBe(false);
      expect(initPlayer.isAlive).toBe(true);
      expect(initPlayer.board.length).toBe(20);
    });

    it("should handle SET_PLAYER", () => {
      const state = playerReducer(
        initPlayer,
        setPlayer({ name: "Alice", isHost: true }),
      );
      expect(state.name).toBe("Alice");
      expect(state.isHost).toBe(true);
    });

    it("should handle SET_BOARD", () => {
      const customBoard = createEmptyBoard();
      customBoard[0][0] = 1;
      const state = playerReducer(initPlayer, setBoard(customBoard));
      expect(state.board[0][0]).toBe(1);
    });

    it("should handle NEW_PIECE", () => {
      const pieceData = { type: "T", shape: [[1]], spawnX: 3, spawnY: 0 };
      const state = playerReducer(initPlayer, newPiece({ piece: pieceData }));

      expect(state.currentPiece.type).toBe("T");
      expect(state.currentPiece.x).toBe(3);
    });

    it("should handle ADD_PENALTY", () => {
      const state = playerReducer(initPlayer, addPenalty(3));
      expect(state.board[17][0]).toBe(8); // 3 penalty lines from the bottom
      expect(state.board[18][0]).toBe(8);
      expect(state.board[19][0]).toBe(8);
    });

    it("should lift the falling piece with the stack", () => {
      // Le sol monte de 3 rangées : sans remontée, la pièce se retrouverait
      // dans le tas et Game.jsx la déclarerait morte sans qu'elle ait bougé.
      const withPiece = {
        ...initPlayer,
        currentPiece: {
          type: "O",
          shape: [[1, 1], [1, 1]],
          x: 4,
          y: 17,
          rot: 0,
        },
      };
      const state = playerReducer(withPiece, addPenalty(3));
      expect(state.currentPiece.y).toBe(14);
      expect(state.board[state.currentPiece.y][4]).toBe(0);
    });

    it("should track the last penalty for the live region", () => {
      let state = playerReducer(initPlayer, addPenalty(2));
      expect(state.penaltyLines).toBe(2);
      expect(state.penaltySeq).toBe(1);

      // Deux pénalités identiques doivent rester distinguables
      state = playerReducer(state, addPenalty(2));
      expect(state.penaltySeq).toBe(2);
    });

    it("should handle PLAYER_DIED and RESET_PLAYER", () => {
      let state = playerReducer(initPlayer, playerDied());
      expect(state.isAlive).toBe(false);
      state = playerReducer(state, resetPlayer());
      expect(state.isAlive).toBe(true);
    });

    // Restart : seul le host dispatche GAME_RESET, les autres clients ne
    // reçoivent que gameStarted — ils doivent quand même repartir de zéro.
    it("should reset a dead player on GAME_STARTED (restart)", () => {
      const dirty = playerReducer(
        { ...initPlayer, name: "Bob", isHost: false, board: [[8, 8]] },
        playerDied(),
      );
      const state = playerReducer(dirty, gameStarted());
      expect(state.isAlive).toBe(true);
      expect(state.name).toBe("Bob");
      expect(state.board).toEqual(createEmptyBoard());
      expect(state.currentPiece).toBeNull();
    });
  });

  // ── OPPONENTS REDUCER ─────────────────────────────────────────────────────
  describe("opponentsReducer", () => {
    const initOpponents = [];

    it("should handle SET_OPPONENTS", () => {
      const payload = [{ name: "Bob", spectrum: [0, 0], isAlive: true }];
      const state = opponentsReducer(initOpponents, setOpponents(payload));
      expect(state).toEqual(payload);
    });

    it("should handle UPDATE_SPECTRUM", () => {
      const startState = [{
        name: "Bob",
        spectrum: Array(10).fill(0),
        isAlive: true,
      }];
      const newSpectrum = Array(10).fill(5);

      const state = opponentsReducer(
        startState,
        updateSpectrum({ playerName: "Bob", spectrum: newSpectrum }),
      );
      expect(state[0].spectrum[0]).toBe(5);
    });

    it("should handle OPPONENT_DIED", () => {
      const startState = [{ name: "Bob", spectrum: [], isAlive: true }];
      const state = opponentsReducer(startState, opponentDied("Bob"));
      expect(state[0].isAlive).toBe(false);
    });

    it("should revive opponents on GAME_STARTED (restart)", () => {
      const startState = [{
        name: "Bob",
        spectrum: Array(10).fill(7),
        isAlive: false,
      }];
      const state = opponentsReducer(startState, gameStarted());
      expect(state[0].isAlive).toBe(true);
      expect(state[0].spectrum).toEqual(Array(10).fill(0));
    });

    it("should handle PLAYER_LEFT", () => {
      const startState = [{ name: "Bob", spectrum: [], isAlive: true }, {
        name: "Alice",
        spectrum: [],
        isAlive: true,
      }];
      const state = opponentsReducer(
        startState,
        playerLeft({ playerName: "Bob" }),
      );
      expect(state.length).toBe(1);
      expect(state[0].name).toBe("Alice");
    });

    it("should handle GAME_RESET", () => {
      const startState = [{ name: "Bob", spectrum: [5, 5], isAlive: false }];
      const state = opponentsReducer(startState, gameReset());
      expect(state[0].isAlive).toBe(true);
      expect(state[0].spectrum.length).toBe(10);
      expect(state[0].spectrum[0]).toBe(0);
    });
  });
});
