// ─────────────────────────────────────────────────────────────────────────────
// src/client/components/Game.jsx
// Conteneur principal en jeu — boucle de jeu + clavier
// Zéro `this` — logique via fonctions pures de shared/gameLogic
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Board from "./Board";
import OpponentView from "./OpponentView";
import GameOver from "./GameOver";
import NextPiecePreview from "./NextPiecePreview";
import HoldPieceView from "./HoldPieceView";
import ScorePanel from "./ScorePanel";

import useGameLoop from "../hooks/useGameLoop";

import { playerDied, setBoard } from "../actions/player";

import {
  clearLines,
  computeSpectrum,
  getHardDropPosition,
  isValidPosition,
  placePiece,
} from "../../shared/gameLogic";

import {
  LOCK_DELAY,
  MAX_MOVE_RESETS,
  PIECES,
  SPAWN_X,
  SPAWN_Y,
  TICK_INTERVAL,
  TYPE_TO_COLOR_INDEX,
} from "../../shared/constants";

import {
  emitLinesCleared,
  emitPlayerDead,
  emitRequestNextPiece,
  emitUpdateSpectrum,
} from "../socket";

// ── Aide-mémoire clavier (le jeu se joue exclusivement au clavier) ───────────
const CONTROLS = [
  [["←", "→"], "Move"],
  [["↑"], "Rotate"],
  [["↓"], "Soft drop"],
  [["Space"], "Hard drop"],
  [["C"], "Hold"],
];

// ── DAS constants (Delayed Auto Shift) ───────────────────────────────────────
const DAS_DELAY = 167; // ms avant répétition
const DAS_RATE = 33; // ms entre chaque répétition (~30/s)

// Durée du sillage de hard drop — égale à celle de `dropTrail` dans global.css.
const DROP_TRAIL_MS = 220;

/**
 * Sillage laissé par un hard drop : une bande par colonne occupée, du départ de
 * la pièce à son point de chute — fonction pure.
 * C'est le seul accusé de réception de la touche la plus utilisée du jeu : sans
 * lui, un hard drop et une pièce qui touche le sol toute seule se ressemblent.
 * @param {{shape: number[][], x: number, y: number, type: string}} piece
 * @param {number} finalY  rangée d'arrivée renvoyée par getHardDropPosition
 * @param {number} seq     numéro de salve, pour des clés React stables
 * @returns {{seq: number, type: string, cols: {x, from, to}[]}}
 */
export const buildDropTrail = (piece, finalY, seq) => {
  const { shape, x, y, type } = piece;
  const cols = [];

  for (let c = 0; c < shape[0].length; c++) {
    let top = -1;
    let bottom = -1;
    for (let r = 0; r < shape.length; r++) {
      if (shape[r][c] === 0) continue;
      if (top < 0) top = r;
      bottom = r;
    }
    if (top < 0) continue; // colonne vide de la shape
    cols.push({ x: x + c, from: Math.max(y + top, 0), to: finalY + bottom });
  }

  return { seq, type, cols };
};

const Game = () => {
  const dispatch = useDispatch();
  const room = useSelector((s) => s.game.room);
  const started = useSelector((s) => s.game.started);
  const over = useSelector((s) => s.game.over);
  const isAlive = useSelector((s) => s.player.isAlive);
  const opponents = useSelector((s) => s.opponents);

  const nextPieceType = useSelector((s) => s.player.nextPieceType);
  const holdPieceType = useSelector((s) => s.player.holdPieceType);
  const canHold = useSelector((s) => s.player.canHold);

  const isPlaying = started && !over && isAlive;

  const [clearingRows, setClearingRows] = useState([]);
  const [lockingCells, setLockingCells] = useState([]);
  const [dropTrail, setDropTrail] = useState(null);
  const trailSeqRef = useRef(0);
  const trailTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(trailTimerRef.current), []);

  // ── Annonces lecteur d'écran ──────────────────────────────────────────────
  // Le plateau est muet pour une synthèse vocale : ces trois événements sont
  // les seuls qui changent la situation du joueur, et ils sont assez rares
  // (au plus un par pièce posée) pour tenir dans une région "polite".
  const myName = useSelector((s) => s.player.name);
  const myScore = useSelector((s) => s.scores[s.player.name] || 0);
  const penaltyLines = useSelector((s) => s.player.penaltyLines);
  const penaltySeq = useSelector((s) => s.player.penaltySeq);

  const [announcement, setAnnouncement] = useState("");
  const prevScoreRef = useRef(myScore);
  const prevSeqRef = useRef(penaltySeq);
  const prevDeadRef = useRef("");

  useEffect(() => {
    if (myScore > prevScoreRef.current) {
      setAnnouncement(`Score ${myScore.toLocaleString()}`);
    }
    prevScoreRef.current = myScore;
  }, [myScore]);

  useEffect(() => {
    if (penaltySeq > prevSeqRef.current) {
      // Un texte identique n'est pas relu par les lecteurs d'écran. Le score et
      // la liste des éliminés changent toujours, deux pénalités de 2 lignes non :
      // on alterne une espace insécable pour rendre le message unique.
      const text = `${penaltyLines} penalty ${
        penaltyLines > 1 ? "lines" : "line"
      } added`;
      setAnnouncement(penaltySeq % 2 ? text : `${text} `);
    }
    prevSeqRef.current = penaltySeq;
  }, [penaltySeq, penaltyLines]);

  const deadOpponents = opponents
    .filter((o) => !o.isAlive)
    .map((o) => o.name)
    .join(", ");

  useEffect(() => {
    if (deadOpponents.length > prevDeadRef.current.length) {
      setAnnouncement(`${deadOpponents} eliminated`);
    }
    prevDeadRef.current = deadOpponents;
  }, [deadOpponents]);

  // ── Refs "live" pour éviter les stale closures dans les timers ────────────
  const boardRef = useRef(null);
  const pieceRef = useRef(null);
  const nextTypeRef = useRef(null);
  const holdTypeRef = useRef(null);
  const canHoldRef = useRef(true);
  const roomRef = useRef(room);

  // Sync de l'état Redux vers les refs à chaque render
  const board = useSelector((s) => s.player.board);
  const piece = useSelector((s) => s.player.currentPiece);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    pieceRef.current = piece;
  }, [piece]);
  useEffect(() => {
    nextTypeRef.current = nextPieceType;
  }, [nextPieceType]);
  useEffect(() => {
    holdTypeRef.current = holdPieceType;
  }, [holdPieceType]);
  useEffect(() => {
    canHoldRef.current = canHold;
  }, [canHold]);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // ── Refs pour le Lock Delay (Guideline) ───────────────────────────────────
  const lockTimeoutRef = useRef(null);
  const moveResetsRef = useRef(0);

  const clearLockTimeout = useCallback(() => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
  }, []);

  // Quitter la partie pendant le lock delay laisserait un timer verrouiller
  // une pièce sur un composant démonté.
  useEffect(() => clearLockTimeout, [clearLockTimeout]);

  // ── Board changé : spectrum + check de mort ────────────────────────────────
  // Le board ne change qu'au lock ou à la réception d'une pénalité : c'est le
  // seul endroit d'où le spectrum peut bouger, on le publie donc ici.
  // Si la pièce en cours entre en collision après une pénalité, c'est Game Over.
  useEffect(() => {
    if (!isPlaying || !board) return;
    emitUpdateSpectrum(roomRef.current, computeSpectrum(board));
    if (piece && !isValidPosition(board, piece.shape, piece.x, piece.y)) {
      dispatch(playerDied());
      emitPlayerDead(roomRef.current);
    }
  }, [board]); // Uniquement quand le board change (lock, pénalités)

  // ── Spawning Prédictif ──────────────────────────────────────────────────
  const spawnNextPiece = useCallback(() => {
    const type = nextTypeRef.current;
    const currentBoard = boardRef.current;
    if (!type || !currentBoard) return;

    const newPieceLocal = {
      type,
      shape: PIECES[type].shape,
      x: SPAWN_X[type],
      y: SPAWN_Y,
    };

    // Check death on spawn
    if (
      !isValidPosition(
        currentBoard,
        newPieceLocal.shape,
        newPieceLocal.x,
        newPieceLocal.y,
      )
    ) {
      dispatch(playerDied());
      emitPlayerDead(roomRef.current);
      return;
    }

    dispatch({ type: "SET_PIECE", payload: newPieceLocal });
    dispatch({ type: "SET_PLAYER", payload: { canHold: true } });
    emitRequestNextPiece(roomRef.current);
  }, [dispatch]);

  // ── Lock piece ────────────────────────────────────────────────────────────
  const lockPiece = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece || !currentPiece.shape || !currentBoard) return;

    clearLockTimeout();
    moveResetsRef.current = 0;

    // Animation Lock Flash
    const pieceCells = [];
    const { shape, x, y, type } = currentPiece;
    shape.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell !== 0) pieceCells.push({ x: x + ci, y: y + ri });
      });
    });
    setLockingCells(pieceCells);
    setTimeout(() => setLockingCells([]), 150);

    const colorIndex = TYPE_TO_COLOR_INDEX[type];
    const newBoard = placePiece(currentBoard, shape, x, y, colorIndex);
    const { newBoard: clearedBoard, linesCleared, clearedIndexes } = clearLines(
      newBoard,
    );

    if (linesCleared > 0) {
      setClearingRows(clearedIndexes);
      dispatch(setBoard(newBoard));
      dispatch({ type: "SET_PIECE", payload: null });
      setTimeout(() => {
        setClearingRows([]);
        dispatch(setBoard(clearedBoard));
        emitLinesCleared(roomRef.current, linesCleared);
        spawnNextPiece();
      }, 300);
    } else {
      dispatch(setBoard(newBoard));
      spawnNextPiece();
    }
  }, [dispatch, clearLockTimeout, spawnNextPiece]);

  // ── requestLock : démarre le timer de verrouillage ────────────────────────
  const requestLock = useCallback(() => {
    if (lockTimeoutRef.current) return;
    lockTimeoutRef.current = setTimeout(() => {
      lockTimeoutRef.current = null;
      lockPiece();
    }, LOCK_DELAY);
  }, [lockPiece]);

  // ── handleMoveReset : reset le timer si on bouge/rotationne au sol ────────
  const handleMoveReset = useCallback((newPieceState) => {
    const currentBoard = boardRef.current;
    if (!currentBoard) return;
    const isNowGrounded = !isValidPosition(
      currentBoard,
      newPieceState.shape,
      newPieceState.x,
      newPieceState.y + 1,
    );
    if (isNowGrounded) {
      if (moveResetsRef.current < MAX_MOVE_RESETS) {
        moveResetsRef.current++;
        clearLockTimeout();
        requestLock();
      }
    } else {
      clearLockTimeout();
      moveResetsRef.current = 0;
    }
  }, [clearLockTimeout, requestLock]);

  // ── Tick de la boucle de jeu ───────────────────────────────────────────────
  const onTick = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece || !currentPiece.shape || !currentBoard) return;

    const nextY = currentPiece.y + 1;
    if (
      isValidPosition(currentBoard, currentPiece.shape, currentPiece.x, nextY)
    ) {
      dispatch({ type: "SET_PIECE", payload: { ...currentPiece, y: nextY } });
      clearLockTimeout();
      moveResetsRef.current = 0;
    } else {
      requestLock();
    }
  }, [dispatch, requestLock, clearLockTimeout]);

  useGameLoop(isPlaying, TICK_INTERVAL, onTick);

  // ── Handlers clavier ─────────────────────────────────────────────────────
  const moveLeft = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    if (isValidPosition(b, p.shape, p.x - 1, p.y)) {
      const updated = { ...p, x: p.x - 1 };
      dispatch({ type: "SET_PIECE", payload: updated });
      handleMoveReset(updated);
    }
  }, [dispatch, handleMoveReset]);

  const moveRight = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    if (isValidPosition(b, p.shape, p.x + 1, p.y)) {
      const updated = { ...p, x: p.x + 1 };
      dispatch({ type: "SET_PIECE", payload: updated });
      handleMoveReset(updated);
    }
  }, [dispatch, handleMoveReset]);

  const rotate = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    const { shape } = p;
    const cols = shape[0].length;
    const rows = shape.length;
    const rotated = Array.from(
      { length: cols },
      (_, c) => Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c]),
    );
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (isValidPosition(b, rotated, p.x + kick, p.y)) {
        const updated = { ...p, shape: rotated, x: p.x + kick };
        dispatch({ type: "SET_PIECE", payload: updated });
        handleMoveReset(updated);
        break;
      }
    }
  }, [dispatch, handleMoveReset]);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    const nextY = p.y + 1;
    if (isValidPosition(b, p.shape, p.x, nextY)) {
      dispatch({ type: "SET_PIECE", payload: { ...p, y: nextY } });
      clearLockTimeout();
    } else {
      requestLock();
    }
  }, [dispatch, clearLockTimeout, requestLock]);

  const hardDrop = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    const finalY = getHardDropPosition(b, p.shape, p.x, p.y);

    // Une pièce déjà au sol ne laisse pas de sillage : il n'y a rien à raconter.
    if (finalY > p.y) {
      trailSeqRef.current += 1;
      setDropTrail(buildDropTrail(p, finalY, trailSeqRef.current));
      clearTimeout(trailTimerRef.current);
      trailTimerRef.current = setTimeout(
        () => setDropTrail(null),
        DROP_TRAIL_MS,
      );
    }

    dispatch({ type: "SET_PIECE", payload: { ...p, y: finalY } });
    // Donne un tick pour que le state se mette à jour, puis lock
    setTimeout(() => lockPiece(), 0);
  }, [dispatch, lockPiece]);

  const holdPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b || !canHoldRef.current) return;

    if (!holdTypeRef.current) {
      dispatch({
        type: "SET_PLAYER",
        payload: { holdPieceType: p.type, canHold: false },
      });
      dispatch({ type: "SET_PIECE", payload: null });
      emitRequestNextPiece(roomRef.current);
    } else {
      const nextType = holdTypeRef.current;
      const newPieceLocal = {
        type: nextType,
        shape: PIECES[nextType].shape,
        x: SPAWN_X[nextType],
        y: SPAWN_Y,
      };

      // Check death on hold swap
      if (
        !isValidPosition(
          b,
          newPieceLocal.shape,
          newPieceLocal.x,
          newPieceLocal.y,
        )
      ) {
        dispatch(playerDied());
        emitPlayerDead(roomRef.current);
        return;
      }

      dispatch({
        type: "SET_PLAYER",
        payload: { holdPieceType: p.type, canHold: false },
      });
      dispatch({ type: "SET_PIECE", payload: newPieceLocal });
    }
  }, [dispatch]);

  // ── Clavier avec DAS ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const dasTimers = {};

    const startDAS = (key, fn) => {
      fn();
      dasTimers[key] = setTimeout(() => {
        dasTimers[`${key}_repeat`] = setInterval(fn, DAS_RATE);
      }, DAS_DELAY);
    };

    const stopDAS = (key) => {
      clearTimeout(dasTimers[key]);
      clearInterval(dasTimers[`${key}_repeat`]);
      delete dasTimers[key];
      delete dasTimers[`${key}_repeat`];
    };

    const onKeyDown = (e) => {
      if (e.repeat) return;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          startDAS("left", moveLeft);
          break;
        case "ArrowRight":
          e.preventDefault();
          startDAS("right", moveRight);
          break;
        case "ArrowDown":
          e.preventDefault();
          startDAS("down", softDrop);
          break;
        case "ArrowUp":
          e.preventDefault();
          rotate();
          break;
        case " ":
          e.preventDefault();
          hardDrop();
          break;
        case "c":
        case "C":
          e.preventDefault();
          holdPiece();
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e) => {
      if (e.key === "ArrowLeft") stopDAS("left");
      if (e.key === "ArrowRight") stopDAS("right");
      if (e.key === "ArrowDown") stopDAS("down");
    };

    // Changer d'onglet flèche enfoncée : le keyup part dans l'autre fenêtre et
    // la répétition continuerait à déplacer la pièce toute seule au retour.
    const onBlur = () => {
      stopDAS("left");
      stopDAS("right");
      stopDAS("down");
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      Object.values(dasTimers).forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
    };
  }, [isPlaying, moveLeft, moveRight, rotate, softDrop, hardDrop, holdPiece]);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (over) return <GameOver />;

  return (
    <div className="game-layout">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {
        /* Le puits en premier dans le DOM à toutes les tailles : les zones de
          grille le replacent au centre en large, et un lecteur d'écran comme un
          écran étroit commencent par ce qui porte la partie. Le score le
          surmonte solo comme multi — une seule position à retrouver. */
      }
      <section className="game-stage">
        <ScorePanel />
        <Board
          clearingRows={clearingRows}
          lockingCells={lockingCells}
          dropTrail={dropTrail}
        />
      </section>

      <div className="game-hold">
        <HoldPieceView />
      </div>

      <div className="game-next">
        <NextPiecePreview />
      </div>

      <aside className="game-foes">
        {opponents.length > 0 && (
          <div className="game-foes__group">
            <p className="eyebrow">Opponents</p>
            <div className="opponents-stack">
              {opponents.map((opp) => (
                <OpponentView
                  key={opp.name}
                  name={opp.name}
                  spectrum={opp.spectrum}
                  isAlive={opp.isAlive}
                />
              ))}
            </div>
          </div>
        )}

        {!isAlive && (
          <div className="panel eliminated" role="status">
            <p className="eliminated__title">ELIMINATED</p>
            <p className="eliminated__hint">Watching game…</p>
          </div>
        )}
      </aside>

      <div className="game-meta">
        {
          /* Pas d'intertitre visible : des touches et leur action se lisent sans
            qu'on les annonce. Le titre reste pour les lecteurs d'écran, qui
            n'ont pas la mise en forme pour le déduire. */
        }
        <p className="sr-only" id="controls-title">Keyboard controls</p>
        <dl className="controls" aria-labelledby="controls-title">
          {CONTROLS.map(([keys, action]) => (
            <div className="controls__row" key={action}>
              <dt className="controls__keys">
                {keys.map((k) => (
                  <kbd className="controls__key" key={k}>{k}</kbd>
                ))}
              </dt>
              <dd className="controls__action">{action}</dd>
            </div>
          ))}
        </dl>

        <dl className="game-meta__facts">
          <div className="game-meta__fact">
            <dt className="game-meta__key">Room</dt>
            <dd className="game-meta__value">{room}</dd>
          </div>
          {opponents.length === 0 && (
            <div className="game-meta__fact">
              <dt className="game-meta__key">Mode</dt>
              <dd className="game-meta__value">Solo</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default Game;
