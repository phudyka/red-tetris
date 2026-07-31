// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Board.jsx
// Grille 10×20 — divs + CSS grid — zéro Canvas, SVG, table
// Zéro `this`
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import Cell from "./Cell";
import ParticleSystem from "./ParticleSystem";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  TYPE_TO_COLOR_INDEX,
} from "../../shared/constants";
import { getHardDropPosition } from "../../shared/gameLogic";

// Décélération exponentielle — pas de rebond.
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

// Durée de la poussée de pénalité — doit rester égale à celle de `penaltyRise`
// dans global.css : passé ce délai la classe tombe et l'état devient statique.
const PENALTY_RISE_MS = 300;

/**
 * Les animations ci-dessous passent par la Web Animations API : le bloc
 * @media (prefers-reduced-motion) du CSS ne les atteint pas, il faut le lire ici.
 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** jsdom (tests) n'implémente pas la Web Animations API. */
const canAnimate = (el) => el && typeof el.animate === "function";

/**
 * Verrouillage d'une pièce (Web Animations API) : un éclat de luminosité, sans
 * mise à l'échelle. Un bloc qui grossit puis rétrécit trahirait la grille — ici
 * une case fait une case, toujours.
 */
const animatePieceLock = (cells) => {
  cells.forEach((el, i) => {
    if (!canAnimate(el) || prefersReducedMotion()) return;
    el.animate([
      { filter: "brightness(2.6)" },
      { filter: "brightness(1)" },
    ], { duration: 160, delay: i * 8, easing: EASE_OUT });
  });
};

/**
 * Impact du puits à l'effacement (Web Animations API).
 * L'intensité encode le nombre de lignes : un Tetris (4 lignes, le coup que le
 * joueur cherche à répéter) doit se sentir autrement qu'un simple.
 * @param {HTMLElement} boardEl
 * @param {HTMLElement} flashEl
 * @param {number}      lines
 */
const animateClearImpact = (boardEl, flashEl, lines) => {
  if (lines <= 0 || prefersReducedMotion()) return;
  const isTetris = lines >= 4;
  const duration = isTetris ? 440 : 260;

  if (canAnimate(flashEl)) {
    flashEl.animate([
      { opacity: 0 },
      { opacity: isTetris ? 0.5 : 0.07 * lines, offset: 0.12 },
      { opacity: 0 },
    ], { duration, easing: "ease-out" });
  }

  // Une ligne seule ne secoue pas le puits : le mouvement doit rester un
  // signal, pas un tic à chaque pièce posée.
  if (canAnimate(boardEl) && lines > 1) {
    const amp = isTetris ? 9 : lines * 2;
    boardEl.animate([
      { transform: "translate3d(0, 0, 0)" },
      { transform: `translate3d(0, ${amp}px, 0)`, offset: 0.18 },
      { transform: `translate3d(0, ${-amp * 0.45}px, 0)`, offset: 0.45 },
      { transform: `translate3d(0, ${amp * 0.18}px, 0)`, offset: 0.72 },
      { transform: "translate3d(0, 0, 0)" },
    ], { duration, easing: EASE_OUT });
  }
};

/**
 * Animation de destruction de ligne (Web Animations API).
 */
const animateLineClear = (rowElements) => {
  rowElements.forEach((el) => {
    if (!canAnimate(el) || prefersReducedMotion()) return;
    el.animate([
      { transform: "scaleX(1)", opacity: 1, filter: "brightness(1)" },
      { transform: "scaleX(1.1)", opacity: 1, filter: "brightness(3)" },
      { transform: "scaleX(0)", opacity: 0, filter: "brightness(0)" },
    ], { duration: 250, easing: "ease-in", fill: "none" });
  });
};

/**
 * Cellules du plateau occupées par une shape posée en (x, y) — fonction pure.
 * @returns {{x: number, y: number}[]}  hors-plateau exclu
 */
const shapeCells = (shape, x, y) => {
  const cells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c] === 0) continue;
      const cy = y + r;
      const cx = x + c;
      if (cy >= 0 && cy < BOARD_HEIGHT && cx >= 0 && cx < BOARD_WIDTH) {
        cells.push({ x: cx, y: cy });
      }
    }
  }
  return cells;
};

/**
 * Calque de la pièce en cours : ghost puis pièce active — fonction pure.
 * Ces 8 cellules au plus sont les seules à bouger entre deux verrouillages ;
 * elles sont posées dans la grille par placement explicite, par-dessus les
 * cellules du tas, au lieu d'être fusionnées dans la matrice du plateau.
 * @returns {{x, y, key, value, state}[]}
 */
const buildPieceLayer = (board, currentPiece) => {
  if (!currentPiece || !currentPiece.shape) return [];

  const { shape, x, y, type } = currentPiece;
  const value = TYPE_TO_COLOR_INDEX[type];

  const active = shapeCells(shape, x, y);
  const activeKeys = new Set(active.map((c) => `${c.y}-${c.x}`));

  const ghostY = getHardDropPosition(board, shape, x, y);
  const ghost = ghostY === y ? [] : shapeCells(shape, x, ghostY).filter(
    (c) => board[c.y][c.x] === 0 && !activeKeys.has(`${c.y}-${c.x}`),
  );

  // Clés indexées, jamais positionnelles : une pièce qui bouge doit réutiliser
  // les mêmes noeuds DOM et n'en changer que le placement, pas en détruire
  // quatre et en créer quatre à chaque touche.
  return [
    ...ghost.map((c, i) => ({
      ...c,
      key: `ghost-${i}`,
      value,
      state: "ghost",
    })),
    ...active.map((c, i) => ({
      ...c,
      key: `piece-${i}`,
      value,
      state: "active",
    })),
  ];
};

/**
 * Le tas : 200 cellules qui ne changent qu'au verrouillage, à l'effacement ou
 * à l'arrivée d'une pénalité. Mémoïsé sur `board` seul — un déplacement de
 * pièce ne le traverse plus du tout.
 */
const StackedCells = React.memo(({ board, cellRef, rising, riseSeq }) =>
  board.map((row, y) => (
    <React.Fragment key={y}>
      {row.map((value, x) => {
        const id = `cell-${y}-${x}`;
        // Une pénalité de suite peut arriver avant la fin de la précédente :
        // la clé porte le numéro de salve, sinon l'animation ne repart pas.
        const willRise = rising && value !== 0;
        return (
          <Cell
            key={willRise ? `${id}-r${riseSeq}` : id}
            id={id}
            ref={cellRef(id)}
            value={value}
            state={value === 0 ? "empty" : "stacked"}
            rising={willRise}
          />
        );
      })}
    </React.Fragment>
  ))
);

const Board = ({ clearingRows = [], lockingCells = [], dropTrail = null }) => {
  const board = useSelector((s) => s.player.board);
  const currentPiece = useSelector((s) => s.player.currentPiece);
  const penaltySeq = useSelector((s) => s.player.penaltySeq) || 0;
  const penaltyLines = useSelector((s) => s.player.penaltyLines) || 0;
  const isDead = useSelector((s) => s.player.isAlive) === false;

  const pieceLayer = useMemo(
    () => buildPieceLayer(board, currentPiece),
    [board, currentPiece],
  );

  const cellsRef = useRef(new Map());
  const callbackRef = useRef(new Map());
  const boardRef = useRef(null);
  const flashRef = useRef(null);

  // Un callback ref stable par cellule : sans ça React détache/rattache les
  // 200 refs à chaque déplacement de pièce.
  const cellRef = useCallback((id) => {
    if (!callbackRef.current.has(id)) {
      callbackRef.current.set(id, (el) => {
        if (el) cellsRef.current.set(id, el);
        else cellsRef.current.delete(id);
      });
    }
    return callbackRef.current.get(id);
  }, []);

  // ── Pénalité reçue : le contenu du puits est poussé de `n` rangées ─────────
  // Le tas ne se téléporte pas d'un cran, il encaisse : chaque cellule pleine
  // part de `n` rangées plus bas et remonte, les rangées indestructibles
  // arrivant, elles, de sous le plancher. `--rise` porte la distance, identique
  // pour tout le monde — c'est un seul mouvement, pas 200.
  const [rise, setRise] = useState({ rows: 0, seq: 0 });

  useEffect(() => {
    if (!penaltySeq) return undefined;
    setRise({ rows: penaltyLines, seq: penaltySeq });
    const timer = setTimeout(
      () => setRise((r) => ({ rows: 0, seq: r.seq })),
      PENALTY_RISE_MS,
    );
    return () => clearTimeout(timer);
    // penaltyLines est lu, pas observé : deux pénalités de 2 lignes doivent
    // rejouer l'animation, seul penaltySeq les distingue.
  }, [penaltySeq]);

  // Déclencher l'animation Lock
  useEffect(() => {
    if (lockingCells && lockingCells.length > 0) {
      const domCells = lockingCells.map((c) =>
        cellsRef.current.get(`cell-${c.y}-${c.x}`)
      );
      animatePieceLock(domCells);
    }
  }, [lockingCells]);

  // Déclencher l'animation Clear
  useEffect(() => {
    if (clearingRows && clearingRows.length > 0) {
      const domCells = clearingRows.flatMap((y) =>
        Array.from(
          { length: BOARD_WIDTH },
          (_, x) => cellsRef.current.get(`cell-${y}-${x}`),
        )
      );
      animateLineClear(domCells);
      animateClearImpact(
        boardRef.current,
        flashRef.current,
        clearingRows.length,
      );
    }
  }, [clearingRows]);

  return (
    <div
      className={`board${rise.rows ? " board--penalty" : ""}${
        isDead ? " board--dead" : ""
      }`}
      style={rise.rows ? { "--rise": rise.rows } : undefined}
      ref={boardRef}
      role="img"
      aria-label="Your board — 10 columns by 20 rows"
    >
      <div className="board__flash" ref={flashRef} aria-hidden="true" />
      <div className="board__surge" aria-hidden="true" />
      <StackedCells
        board={board}
        cellRef={cellRef}
        rising={rise.rows > 0}
        riseSeq={rise.seq}
      />
      {
        /*
        Grille jumelle posée sur le puits. Les 200 cellules du tas sont
        auto-placées : mêler dans la même grille des cellules explicitement
        positionnées leur volerait autant de cases libres et repousserait la fin
        du tas dans une 21ᵉ rangée implicite — le bas du plateau décalé et hors
        de l'écran. Le calque garde donc sa propre grille.
      */
      }
      <div className="board__layer">
        {dropTrail && dropTrail.cols.map((c) => (
          <div
            key={`trail-${dropTrail.seq}-${c.x}`}
            className="drop-trail"
            aria-hidden="true"
            style={{
              gridColumn: c.x + 1,
              gridRow: `${c.from + 1} / ${c.to + 2}`,
              "--tint": `var(--block-${dropTrail.type})`,
            }}
          />
        ))}
        {pieceLayer.map((c) => (
          <Cell
            key={c.key}
            value={c.value}
            state={c.state}
            style={{ gridColumn: c.x + 1, gridRow: c.y + 1 }}
          />
        ))}
      </div>
      <ParticleSystem clearingRows={clearingRows} />
    </div>
  );
};

export default React.memo(Board);
