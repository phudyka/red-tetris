// ─────────────────────────────────────────────────────────────────────────────
// test/shared/srs.test.js
// Rotation SRS, 7-bag, T-spin, gravité, remontée après pénalité.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createEmptyBoard,
  generatePieceSequence,
  gravityMs,
  isTSpin,
  isValidPosition,
  levelForLines,
  liftPiece,
  rotateCW,
  rotatePiece,
} from "../../src/shared/gameLogic";

import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  getKicks,
  MAX_LEVEL,
  PIECE_TYPES,
  PIECES,
  SPAWN_X,
  SPAWN_Y,
} from "../../src/shared/constants";

const spawn = (type) => ({
  type,
  shape: PIECES[type].shape,
  x: SPAWN_X[type],
  y: SPAWN_Y,
  rot: 0,
});

/** Cellules occupées par une pièce, triées — pour comparer deux positions. */
const cells = ({ shape, x, y }) => {
  const out = [];
  shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) out.push(`${y + r},${x + c}`);
    })
  );
  return out.sort();
};

describe("Boîtes SRS", () => {
  it("les sept pièces posent leur base sur la même rangée au spawn", () => {
    const bottoms = PIECE_TYPES.map((type) => {
      const { shape } = PIECES[type];
      let bottom = -1;
      shape.forEach((row, r) => {
        if (row.some((v) => v !== 0)) bottom = r;
      });
      return bottom + SPAWN_Y;
    });
    expect(new Set(bottoms).size).toBe(1);
    expect(bottoms[0]).toBe(1);
  });

  it("chaque pièce spawne dans le plateau et sans collision", () => {
    const board = createEmptyBoard();
    PIECE_TYPES.forEach((type) => {
      const p = spawn(type);
      expect(isValidPosition(board, p.shape, p.x, p.y)).toBe(true);
    });
  });

  it("les boîtes I et O restent centrées sur la largeur 10", () => {
    // I occupe les colonnes 3-6, O les colonnes 4-5 : le puits est symétrique.
    expect(cells(spawn("I")).map((k) => Number(k.split(",")[1])))
      .toEqual([3, 4, 5, 6]);
    expect(cells(spawn("O")).map((k) => Number(k.split(",")[1])).sort())
      .toEqual([4, 4, 5, 5]);
  });
});

describe("rotateCW", () => {
  it("tourne une matrice d'un quart de tour horaire", () => {
    expect(rotateCW([[1, 2], [3, 4]])).toEqual([[3, 1], [4, 2]]);
  });

  it("quatre quarts de tour ramènent la shape d'origine", () => {
    const start = PIECES.T.shape;
    expect(rotateCW(rotateCW(rotateCW(rotateCW(start))))).toEqual(start);
  });
});

describe("rotatePiece", () => {
  const board = createEmptyBoard();

  it("fait avancer l'orientation de 0 → 1 → 2 → 3 → 0 en horaire", () => {
    let p = spawn("T");
    [1, 2, 3, 0].forEach((expected) => {
      p = rotatePiece(board, p, 1);
      expect(p.rot).toBe(expected);
    });
  });

  it("recule l'orientation en antihoraire", () => {
    const p = rotatePiece(board, spawn("T"), -1);
    expect(p.rot).toBe(3);
    // Antihoraire depuis le spawn = trois quarts horaires.
    expect(p.shape).toEqual(rotateCW(rotateCW(rotateCW(PIECES.T.shape))));
  });

  it("ne bouge pas le O — sa boîte 2×2 est invariante", () => {
    const p = rotatePiece(board, spawn("O"), 1);
    expect(cells(p)).toEqual(cells(spawn("O")));
  });

  it("décolle du mur gauche par un kick (I vertical → horizontal)", () => {
    // I vertical plaqué à gauche : sa colonne pleine est en x=-2 dans la boîte
    // 4×4, donc sur la colonne 0 du puits. À plat il déborderait de deux cases
    // — le troisième test de la table 1→2 le décale de +2 au lieu de refuser.
    const vertical = rotatePiece(board, { ...spawn("I"), x: -2 }, 1);
    expect(vertical.rot).toBe(1);

    const flat = rotatePiece(board, vertical, 1);
    expect(flat).not.toBeNull();
    expect(flat.x).toBe(0);
    expect(isValidPosition(board, flat.shape, flat.x, flat.y)).toBe(true);
  });

  it("refuse la rotation quand aucun des cinq kicks ne passe", () => {
    // Puits entièrement plein sauf la colonne du I horizontal : aucune des
    // cinq positions verticales n'est libre.
    const full = createEmptyBoard().map((row) => row.map(() => 1));
    const p = { ...spawn("I"), y: 5 };
    // On rouvre juste la rangée occupée par le I pour qu'il y tienne à plat.
    full[6] = Array(BOARD_WIDTH).fill(0);
    expect(rotatePiece(full, p, 1)).toBeNull();
  });

  it("applique les tables du I, distinctes de celles des JLSTZ", () => {
    expect(getKicks("I", 0, 1)).not.toEqual(getKicks("T", 0, 1));
    expect(getKicks("O", 0, 1)).toEqual([[0, 0]]);
  });

  it("renvoie null sur une pièce absente", () => {
    expect(rotatePiece(board, null, 1)).toBeNull();
  });
});

describe("isTSpin (règle des trois coins)", () => {
  it("détecte un T vissé dans un creux à trois coins occupés", () => {
    const board = createEmptyBoard();
    // Creux d'une case en (19, 4) : le T y descend en tournant.
    board[19][3] = 1;
    board[19][5] = 1;
    board[18][3] = 1;
    board[18][5] = 1;
    const piece = { type: "T", x: 3, y: 18 };
    expect(isTSpin(board, piece)).toBe(true);
  });

  it("refuse un T posé à plat sur un tas vide", () => {
    expect(isTSpin(createEmptyBoard(), { type: "T", x: 3, y: 5 })).toBe(false);
  });

  it("ne concerne que le T", () => {
    const board = createEmptyBoard().map((row) => row.map(() => 1));
    expect(isTSpin(board, { type: "L", x: 3, y: 5 })).toBe(false);
    expect(isTSpin(board, null)).toBe(false);
  });

  it("compte les murs comme des coins occupés", () => {
    // T collé au bord gauche : deux coins hors plateau + le sol.
    const board = createEmptyBoard();
    expect(isTSpin(board, { type: "T", x: -1, y: BOARD_HEIGHT - 2 }))
      .toBe(true);
  });
});

describe("liftPiece", () => {
  it("remonte la pièce du nombre exact de rangées de pénalité", () => {
    const board = createEmptyBoard();
    const piece = { ...spawn("O"), y: 10 };
    expect(liftPiece(board, piece, 3).y).toBe(7);
  });

  it("se rabat sur la rangée la plus haute possible si la place manque", () => {
    const board = createEmptyBoard();
    board[0] = Array(BOARD_WIDTH).fill(1); // plafond bouché
    const piece = { ...spawn("O"), y: 1 };
    // y-2 = -1 collerait le O dans la rangée pleine ; y-1 = 0 non plus (le O
    // occupe deux rangées), il reste donc sur place.
    expect(liftPiece(board, piece, 2).y).toBe(1);
  });

  it("laisse la pièce intacte sans pénalité", () => {
    const piece = spawn("T");
    expect(liftPiece(createEmptyBoard(), piece, 0)).toBe(piece);
    expect(liftPiece(createEmptyBoard(), null, 2)).toBeNull();
  });
});

describe("levelForLines / gravityMs", () => {
  it("monte d'un niveau toutes les dix lignes", () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(45)).toBe(5);
  });

  it("plafonne le niveau", () => {
    expect(levelForLines(10000)).toBe(MAX_LEVEL);
    expect(levelForLines(undefined)).toBe(1);
  });

  it("accélère à chaque niveau, jusqu'au plancher d'une frame", () => {
    const speeds = Array.from(
      { length: MAX_LEVEL },
      (_, i) => gravityMs(i + 1),
    );
    expect(speeds[0]).toBe(1000); // 0.8^0 s
    // Monotone décroissante partout, strictement tant que le plancher n'est
    // pas atteint : au-delà, deux niveaux voisins tombent tous deux à 16 ms.
    speeds.slice(1).forEach((ms, i) =>
      expect(ms).toBeLessThanOrEqual(speeds[i])
    );
    expect(gravityMs(5)).toBeLessThan(gravityMs(1));
    expect(gravityMs(10)).toBeLessThan(gravityMs(5));
  });

  it("ne descend jamais sous une frame", () => {
    expect(gravityMs(MAX_LEVEL)).toBeGreaterThanOrEqual(16);
    expect(gravityMs(999)).toBeGreaterThanOrEqual(16);
    expect(gravityMs(0)).toBe(1000);
  });
});

describe("generatePieceSequence (7-bag)", () => {
  it("rend des sacs complets, jamais coupés", () => {
    expect(generatePieceSequence(500).length % 7).toBe(0);
    expect(generatePieceSequence(500).length).toBeGreaterThanOrEqual(500);
  });

  it("chaque tranche de 7 contient les 7 pièces une seule fois", () => {
    const seq = generatePieceSequence(70);
    for (let i = 0; i < seq.length; i += 7) {
      expect(new Set(seq.slice(i, i + 7)).size).toBe(7);
    }
  });

  it("borne la famine de I à 12 pièces — ce qu'un tirage uniforme ne garantit pas", () => {
    // Pire cas du 7-bag : I en tête d'un sac et en queue du suivant, soit 12
    // pièces intercalées. Un Math.random() uniforme n'a, lui, aucune borne.
    const seq = generatePieceSequence(700);
    const iIndex = PIECE_TYPES.indexOf("I");
    let last = -1;
    seq.forEach((piece, i) => {
      if (piece !== iIndex) return;
      if (last >= 0) expect(i - last - 1).toBeLessThanOrEqual(12);
      last = i;
    });
  });

  it("ne produit que des index de pièce valides", () => {
    generatePieceSequence(140).forEach((i) => {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(PIECE_TYPES.length);
    });
  });
});
