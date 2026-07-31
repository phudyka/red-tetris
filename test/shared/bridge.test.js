// ─────────────────────────────────────────────────────────────────────────────
// test/shared/bridge.test.js
// Le serveur est en CommonJS, shared/ en ESM : src/server/*.cjs recopient
// src/shared/*.js à la main (voir CLAUDE.md). Une divergence ne casse rien au
// démarrage — elle désynchronise silencieusement client et serveur en partie.
// Ce fichier compare les deux copies sur des entrées déterministes.
// ─────────────────────────────────────────────────────────────────────────────

import * as esmLogic from "../../src/shared/gameLogic";
import * as esmConst from "../../src/shared/constants";

const cjsLogic = require("../../src/server/gameLogic.cjs");
const cjsConst = require("../../src/server/constants.cjs");

// Plateau non trivial : une ligne presque pleine, deux blocs isolés en hauteur.
const buildBoard = () => {
  const board = esmLogic.createEmptyBoard();
  board[19] = Array(esmConst.BOARD_WIDTH).fill(1);
  board[19][4] = 0;
  board[18][0] = 5;
  board[17][9] = 2;
  return board;
};

const CONSTANTS = [
  "BOARD_WIDTH",
  "BOARD_HEIGHT",
  "LOCK_DELAY",
  "MAX_MOVE_RESETS",
  "LINES_PER_LEVEL",
  "MAX_LEVEL",
  "PIECES",
  "PIECE_TYPES",
  "COLOR_INDEX",
  "TYPE_TO_COLOR_INDEX",
  "SPAWN_X",
  "SPAWN_Y",
  "MODE_KEYS",
  "DEFAULT_MODES",
  "MODE_TAGS",
  "GRAVITY_BOOST",
  "SPRINT_TARGET",
];

// Toutes les combinaisons de modificateurs : l'étiquette et la gravité doivent
// sortir identiques des deux copies, sinon le classement du serveur ne raconte
// pas la manche que le client a jouée.
const MODE_COMBOS = [
  {},
  { invisible: true },
  { gravity: true },
  { sprint: true },
  { invisible: true, gravity: true },
  { invisible: true, sprint: true },
  { gravity: true, sprint: true },
  { invisible: true, gravity: true, sprint: true },
];

describe("Pont CJS ↔ ESM", () => {
  it.each(CONSTANTS)("la constante %s est identique des deux côtés", (key) => {
    expect(cjsConst[key]).toEqual(esmConst[key]);
  });

  it("les tables de kicks sont identiques pour les 7 types × 8 transitions", () => {
    esmConst.PIECE_TYPES.forEach((type) => {
      for (let from = 0; from < 4; from++) {
        [1, 3].forEach((step) => {
          const to = (from + step) % 4;
          expect(cjsConst.getKicks(type, from, to))
            .toEqual(esmConst.getKicks(type, from, to));
        });
      }
    });
  });

  it("expose exactement les mêmes fonctions", () => {
    const esmKeys = Object.keys(esmLogic).filter((k) => k !== "default").sort();
    expect(Object.keys(cjsLogic).sort()).toEqual(esmKeys);
  });

  it("rend la même étiquette et la même gravité sur les 8 combinaisons de modes", () => {
    MODE_COMBOS.forEach((modes) => {
      expect(cjsLogic.modeTag(modes)).toBe(esmLogic.modeTag(modes));
      [1, 5, 12, 20].forEach((level) => {
        expect(cjsLogic.gravityLevel(level, modes))
          .toBe(esmLogic.gravityLevel(level, modes));
      });
    });
    expect(cjsLogic.modeTag(undefined)).toBe(esmLogic.modeTag(undefined));
  });

  it("rend le même résultat sur les fonctions de plateau", () => {
    const board = buildBoard();
    const shape = esmConst.PIECES.T.shape;

    expect(cjsLogic.createEmptyBoard()).toEqual(esmLogic.createEmptyBoard());
    expect(cjsLogic.isValidPosition(board, shape, 3, 17))
      .toBe(esmLogic.isValidPosition(board, shape, 3, 17));
    expect(cjsLogic.placePiece(board, shape, 3, 5, 3))
      .toEqual(esmLogic.placePiece(board, shape, 3, 5, 3));
    expect(cjsLogic.computeSpectrum(board))
      .toEqual(esmLogic.computeSpectrum(board));
    expect(cjsLogic.addPenaltyLines(board, 3))
      .toEqual(esmLogic.addPenaltyLines(board, 3));
    expect(cjsLogic.getHardDropPosition(board, shape, 3, 0))
      .toBe(esmLogic.getHardDropPosition(board, shape, 3, 0));

    // Une ligne complétée : les deux doivent l'effacer au même index.
    const filled = esmLogic.placePiece(board, [[1]], 4, 19, 7);
    expect(cjsLogic.clearLines(filled)).toEqual(esmLogic.clearLines(filled));
  });

  it("rend le même résultat sur les 56 rotations SRS possibles", () => {
    const board = buildBoard();
    esmConst.PIECE_TYPES.forEach((type) => {
      for (let rot = 0; rot < 4; rot++) {
        [1, -1].forEach((dir) => {
          const piece = {
            type,
            shape: esmConst.PIECES[type].shape,
            x: 3,
            y: 15,
            rot,
          };
          expect(cjsLogic.rotatePiece(board, piece, dir))
            .toEqual(esmLogic.rotatePiece(board, piece, dir));
        });
      }
    });
  });

  it("rend le même résultat sur le T-spin, la remontée et la gravité", () => {
    const board = buildBoard();
    const tPiece = { type: "T", x: 3, y: 18 };
    expect(cjsLogic.isTSpin(board, tPiece)).toBe(
      esmLogic.isTSpin(board, tPiece),
    );

    const piece = { type: "T", shape: esmConst.PIECES.T.shape, x: 3, y: 10 };
    expect(cjsLogic.liftPiece(board, piece, 3))
      .toEqual(esmLogic.liftPiece(board, piece, 3));

    for (let level = 0; level <= esmConst.MAX_LEVEL + 5; level++) {
      expect(cjsLogic.gravityMs(level)).toBe(esmLogic.gravityMs(level));
    }
    [0, 9, 10, 45, 199, 10000].forEach((lines) => {
      expect(cjsLogic.levelForLines(lines)).toBe(esmLogic.levelForLines(lines));
    });
  });

  it("génère des séquences de même forme (le contenu est aléatoire)", () => {
    const cjs = cjsLogic.generatePieceSequence(500);
    const esm = esmLogic.generatePieceSequence(500);
    expect(cjs.length).toBe(esm.length);
    expect(cjs.length % esmConst.PIECE_TYPES.length).toBe(0);
    [cjs, esm].forEach((seq) => {
      for (let i = 0; i < seq.length; i += 7) {
        expect(new Set(seq.slice(i, i + 7)).size).toBe(7);
      }
    });
  });
});
