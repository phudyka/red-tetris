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

import { playerDied, setBoard, setPlayer } from "../actions/player";

import {
  clearLines,
  computeSpectrum,
  getHardDropPosition,
  gravityLevel,
  gravityMs,
  isTSpin,
  isValidPosition,
  levelForLines,
  modeTag,
  placePiece,
  rotatePiece,
} from "../../shared/gameLogic";

import {
  DEFAULT_MODES,
  LOCK_DELAY,
  MAX_MOVE_RESETS,
  PIECES,
  SPAWN_X,
  SPAWN_Y,
  SPRINT_TARGET,
  TYPE_TO_COLOR_INDEX,
} from "../../shared/constants";

import {
  emitPieceLocked,
  emitPlayerDead,
  emitRequestNextPiece,
  emitUpdateSpectrum,
} from "../socket";

// ── Aide-mémoire clavier (le jeu se joue exclusivement au clavier) ───────────
const CONTROLS = [
  [["←", "→"], "Move"],
  [["↓"], "Soft drop"],
  [["Space"], "Hard drop"],
  [["↑", "X"], "Rotate"],
  [["Z"], "Rotate CCW"],
  [["C"], "Hold"],
];

// ── DAS constants (Delayed Auto Shift) ───────────────────────────────────────
const DAS_DELAY = 167; // ms avant répétition
const DAS_RATE = 33; // ms entre chaque répétition (~30/s)

// Durée du sillage de hard drop — égale à celle de `dropTrail` dans global.css.
const DROP_TRAIL_MS = 220;

// Durée de l'effacement de ligne — le tas ne retombe qu'après.
const CLEAR_ANIM_MS = 300;

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
  const lines = useSelector((s) => s.player.lines);

  const modes = useSelector((s) => s.game.modes) || DEFAULT_MODES;

  const isPlaying = started && !over && isAlive;
  const level = levelForLines(lines);

  const [clearingRows, setClearingRows] = useState([]);
  const [lockingCells, setLockingCells] = useState([]);
  const [dropTrail, setDropTrail] = useState(null);
  // Change à chaque pièce posée : fait repartir la gravité de zéro au spawn.
  const [spawnSeq, setSpawnSeq] = useState(0);

  const trailSeqRef = useRef(0);
  const trailTimerRef = useRef(null);
  const clearTimerRef = useRef(null);
  // Vrai pendant l'animation d'effacement : le plateau affiché porte encore les
  // lignes pleines, publier ce spectrum montrerait aux adversaires un tas plus
  // haut qu'il ne l'est pour 300 ms.
  const clearingRef = useRef(false);

  useEffect(() => () => {
    clearTimeout(trailTimerRef.current);
    clearTimeout(clearTimerRef.current);
  }, []);

  // ── Annonces lecteur d'écran ──────────────────────────────────────────────
  // Le plateau est muet pour une synthèse vocale : ces trois événements sont
  // les seuls qui changent la situation du joueur, et ils sont assez rares
  // (au plus un par pièce posée) pour tenir dans une région "polite".
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
      setAnnouncement(penaltySeq % 2 ? text : `${text} `);
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
  const linesRef = useRef(lines);

  // Rangées descendues en soft drop depuis le spawn — vaut des points au lock.
  const softDropRef = useRef(0);
  // Dernière action réussie = une rotation. Sans ce drapeau, un T tombé par
  // hasard dans un creux compterait comme un T-spin.
  const rotatedLastRef = useRef(false);

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
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

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

  // ── Spectrum ──────────────────────────────────────────────────────────────
  // Le tas ne change qu'au verrouillage ou à la réception d'une pénalité :
  // c'est le seul endroit d'où le spectrum peut bouger, on le publie donc ici.
  useEffect(() => {
    if (!isPlaying || !board || clearingRef.current) return;
    emitUpdateSpectrum(roomRef.current, computeSpectrum(board));
  }, [board, isPlaying]);

  // ── Check de mort ─────────────────────────────────────────────────────────
  // La pièce est dans les deux dépendances : une pénalité change le plateau ET
  // remonte la pièce, et lire l'une avec l'autre périmée donnait des morts
  // fantômes. Une pièce valide traverse ce test sans rien coûter.
  useEffect(() => {
    if (!isPlaying || !board || !piece || !piece.shape) return;
    if (!isValidPosition(board, piece.shape, piece.x, piece.y)) {
      dispatch(playerDied());
      emitPlayerDead(roomRef.current);
    }
  }, [board, piece, isPlaying, dispatch]);

  // ── Spawn de la pièce suivante ────────────────────────────────────────────
  /**
   * @param {number[][]} [boardOverride]  plateau à jour — les refs ne sont
   *   synchronisées qu'après le commit React, or on spawne dans le même tour
   *   que le verrouillage qui vient de modifier le tas.
   * @returns {boolean}  false si la pièce n'a pas la place d'apparaître
   */
  const spawnNextPiece = useCallback((boardOverride) => {
    const type = nextTypeRef.current;
    const currentBoard = boardOverride || boardRef.current;
    if (!type || !currentBoard) return false;

    // Un lock delay armé pour la pièce précédente verrouillerait la nouvelle en
    // plein vol, 500 ms après son apparition. Le verrouillage passe déjà par
    // ici, mais le hold sur réserve vide spawne sans être passé par lui.
    clearLockTimeout();
    moveResetsRef.current = 0;

    const spawned = {
      type,
      shape: PIECES[type].shape,
      x: SPAWN_X[type],
      y: SPAWN_Y,
      rot: 0,
    };

    if (!isValidPosition(currentBoard, spawned.shape, spawned.x, spawned.y)) {
      dispatch(playerDied());
      emitPlayerDead(roomRef.current);
      return false;
    }

    softDropRef.current = 0;
    rotatedLastRef.current = false;
    setSpawnSeq((n) => n + 1);

    dispatch({ type: "SET_PIECE", payload: spawned });
    dispatch(setPlayer({ canHold: true }));
    emitRequestNextPiece(roomRef.current);
    return true;
  }, [dispatch, clearLockTimeout]);

  // ── Lock piece ────────────────────────────────────────────────────────────
  /**
   * @param {object} [override]   pièce à verrouiller — le hard drop la connaît
   *   avant que Redux ne l'ait propagée jusqu'aux refs.
   * @param {number} [hardCells]  rangées franchies en hard drop, si c'en est un
   */
  const lockPiece = useCallback((override, hardCells) => {
    const currentPiece = override || pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece || !currentPiece.shape || !currentBoard) return;

    clearLockTimeout();
    moveResetsRef.current = 0;

    const { shape, x, y, type } = currentPiece;

    // Animation Lock Flash — le tableau est neuf à chaque appel, l'effet de
    // Board.jsx repart donc même pour deux verrouillages identiques.
    const pieceCells = [];
    shape.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell !== 0) pieceCells.push({ x: x + ci, y: y + ri });
      });
    });
    setLockingCells(pieceCells);

    const tSpin = rotatedLastRef.current && isTSpin(currentBoard, currentPiece);

    const colorIndex = TYPE_TO_COLOR_INDEX[type];
    const placed = placePiece(currentBoard, shape, x, y, colorIndex);
    const { linesCleared, clearedIndexes } = clearLines(placed);

    const isHard = hardCells !== undefined;
    emitPieceLocked(roomRef.current, {
      lines: linesCleared,
      tSpin,
      dropCells: isHard ? hardCells : softDropRef.current,
      hardDrop: isHard,
    });

    if (linesCleared > 0) {
      dispatch(setPlayer({ lines: linesRef.current + linesCleared }));
      clearingRef.current = true;
      setClearingRows(clearedIndexes);
      dispatch(setBoard(placed));
      dispatch({ type: "SET_PIECE", payload: null });
      clearTimerRef.current = setTimeout(() => {
        clearingRef.current = false;
        setClearingRows([]);
        // Le plateau peut avoir bougé pendant les 300 ms — une pénalité reçue
        // entre-temps a remonté le tas. Réappliquer un instantané calculé avant
        // l'animation l'effacerait ; on rejoue l'effacement sur le plateau
        // courant, où les lignes pleines ont juste changé de rangée.
        const { newBoard } = clearLines(boardRef.current || placed);
        dispatch(setBoard(newBoard));
        spawnNextPiece(newBoard);
      }, CLEAR_ANIM_MS);
    } else {
      dispatch(setBoard(placed));
      spawnNextPiece(placed);
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
      rotatedLastRef.current = false;
      clearLockTimeout();
      moveResetsRef.current = 0;
    } else {
      requestLock();
    }
  }, [dispatch, requestLock, clearLockTimeout]);

  // GRAVITY+ agit ici et nulle part ailleurs : le niveau affiché et le
  // multiplicateur de score restent ceux des lignes effacées.
  useGameLoop(
    isPlaying,
    gravityMs(gravityLevel(level, modes)),
    onTick,
    spawnSeq,
  );

  // ── Handlers clavier ─────────────────────────────────────────────────────
  const move = useCallback((dx) => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    if (isValidPosition(b, p.shape, p.x + dx, p.y)) {
      const updated = { ...p, x: p.x + dx };
      rotatedLastRef.current = false;
      dispatch({ type: "SET_PIECE", payload: updated });
      handleMoveReset(updated);
    }
  }, [dispatch, handleMoveReset]);

  const moveLeft = useCallback(() => move(-1), [move]);
  const moveRight = useCallback(() => move(1), [move]);

  const rotate = useCallback((dir) => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    const updated = rotatePiece(b, p, dir);
    if (!updated) return; // aucun des cinq kicks ne passe
    rotatedLastRef.current = true;
    dispatch({ type: "SET_PIECE", payload: updated });
    handleMoveReset(updated);
  }, [dispatch, handleMoveReset]);

  const rotateCW = useCallback(() => rotate(1), [rotate]);
  const rotateCCW = useCallback(() => rotate(-1), [rotate]);

  const softDrop = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b) return;
    const nextY = p.y + 1;
    if (isValidPosition(b, p.shape, p.x, nextY)) {
      softDropRef.current += 1;
      rotatedLastRef.current = false;
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

    const dropped = { ...p, y: finalY };
    dispatch({ type: "SET_PIECE", payload: dropped });
    // La pièce est passée en argument, pas relue dans une ref : attendre que
    // Redux ait propagé la nouvelle position, c'est parier sur l'ordre entre le
    // scheduler React et le prochain macrotask — et perdre parfois.
    lockPiece(dropped, finalY - p.y);
  }, [dispatch, lockPiece]);

  const holdPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || !b || !canHoldRef.current) return;

    if (!holdTypeRef.current) {
      // Réserve vide : on prend la pièce d'aperçu tout de suite, localement.
      // Passer par le serveur ferait attendre un aller-retour au joueur.
      if (spawnNextPiece(b)) {
        dispatch(setPlayer({ holdPieceType: p.type, canHold: false }));
      }
      return;
    }

    const nextType = holdTypeRef.current;
    const swapped = {
      type: nextType,
      shape: PIECES[nextType].shape,
      x: SPAWN_X[nextType],
      y: SPAWN_Y,
      rot: 0,
    };

    if (!isValidPosition(b, swapped.shape, swapped.x, swapped.y)) {
      dispatch(playerDied());
      emitPlayerDead(roomRef.current);
      return;
    }

    // Même raison que dans spawnNextPiece : la pièce rangée en réserve peut
    // avoir armé le lock delay juste avant l'échange.
    clearLockTimeout();
    moveResetsRef.current = 0;
    softDropRef.current = 0;
    rotatedLastRef.current = false;
    setSpawnSeq((n) => n + 1);
    dispatch(setPlayer({ holdPieceType: p.type, canHold: false }));
    dispatch({ type: "SET_PIECE", payload: swapped });
  }, [dispatch, spawnNextPiece, clearLockTimeout]);

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
        case "x":
        case "X":
          e.preventDefault();
          rotateCW();
          break;
        case "z":
        case "Z":
          e.preventDefault();
          rotateCCW();
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
  }, [
    isPlaying,
    moveLeft,
    moveRight,
    rotateCW,
    rotateCCW,
    softDrop,
    hardDrop,
    holdPiece,
  ]);

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
          écran étroit commencent par ce qui porte la partie. */
      }
      <section className="game-stage">
        <ScorePanel
          level={level}
          lines={lines}
          goal={modes.sprint ? SPRINT_TARGET : 0}
        />
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
          <div className="game-meta__fact">
            <dt className="game-meta__key">Mode</dt>
            <dd className="game-meta__value">{modeTag(modes)}</dd>
          </div>
          <div className="game-meta__fact">
            <dt className="game-meta__key">Players</dt>
            <dd className="game-meta__value">
              {opponents.length === 0 ? "Solo" : opponents.length + 1}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default Game;
