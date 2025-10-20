import { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * Battleship (Hundir la flota) – versión simple, refactor sin anidación profunda:
 * - Tablero 10x10
 * - Barcos: 5, 4, 3, 3, 2
 * - Colocación aleatoria (H/V) sin traslapes
 * - Click = disparo. Marca agua, golpe o hundido.
 * - Ganas cuando hundes todos los barcos.
 */

const GRID_SIZE = 10;
const SHIPS = [
  { id: "A", size: 5, name: "Portaaviones" },
  { id: "B", size: 4, name: "Acorazado" },
  { id: "C", size: 3, name: "Crucero" },
  { id: "D", size: 3, name: "Submarino" },
  { id: "E", size: 2, name: "Destructor" },
];

/* =========================
 * Helpers puros y pequeños
 * ========================= */

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      hasShip: false,
      hit: false,
      shipId: null,
      sunk: false,
    }))
  );
}

function cloneBoard(board) {
  return board.map((row) => row.map((c) => ({ ...c })));
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function dirLimits(dir, size) {
  return {
    maxRow: dir === "H" ? GRID_SIZE : GRID_SIZE - size + 1,
    maxCol: dir === "V" ? GRID_SIZE : GRID_SIZE - size + 1,
  };
}

function getStep(dir) {
  return dir === "V" ? (k) => ({ dr: k, dc: 0 }) : (k) => ({ dr: 0, dc: k });
}

function canPlaceAt(board, r0, c0, dir, size) {
  const step = getStep(dir);
  for (let k = 0; k < size; k++) {
    const { dr, dc } = step(k);
    const r = r0 + dr;
    const c = c0 + dc;
    if (board[r][c].hasShip) return false;
  }
  return true;
}

function writeShip(board, r0, c0, dir, ship) {
  const coords = [];
  const step = getStep(dir);
  for (let k = 0; k < ship.size; k++) {
    const { dr, dc } = step(k);
    const r = r0 + dr;
    const c = c0 + dc;
    board[r][c] = { ...board[r][c], hasShip: true, shipId: ship.id };
    coords.push({ r, c });
  }
  return coords;
}

function placeShip(board, ship) {
  const dir = Math.random() < 0.5 ? "H" : "V";
  const { maxRow, maxCol } = dirLimits(dir, ship.size);

  for (let tries = 0; tries < 500; tries++) {
    const r0 = randomInt(maxRow);
    const c0 = randomInt(maxCol);
    if (!canPlaceAt(board, r0, c0, dir, ship.size)) continue;
    return writeShip(board, r0, c0, dir, ship);
  }
  throw new Error("No se pudo ubicar el barco (intenta de nuevo).");
}

function buildBoard() {
  const board = createEmptyBoard();
  const placements = {};
  for (const ship of SHIPS) {
    placements[ship.id] = placeShip(board, ship);
  }
  return { board, placements };
}

function getShipCells(board, shipId) {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c].shipId === shipId) cells.push({ r, c });
    }
  }
  return cells;
}

function isShipSunk(board, shipId) {
  const cells = getShipCells(board, shipId);
  return cells.every(({ r, c }) => board[r][c].hit);
}

function markShipSunk(nextBoard, shipId) {
  const cells = getShipCells(nextBoard, shipId);
  for (const { r, c } of cells) {
    nextBoard[r][c].sunk = true;
  }
}

/* ===============
 * Componente App
 * =============== */

export default function App() {
  const [{ board, placements }, setState] = useState(() => buildBoard());
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const [sunk, setSunk] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [reveal, setReveal] = useState(false); // Modo trampa

  const totalShipCells = useMemo(
    () => SHIPS.reduce((acc, s) => acc + s.size, 0),
    []
  );

  function resetGame() {
    const fresh = buildBoard();
    setState(fresh);
    setShots(0);
    setHits(0);
    setSunk(0);
    setGameOver(false);
    setReveal(false);
  }

  function applyShot(r, c) {
    if (gameOver) return { changed: false, board };

    const cell = board[r][c];
    if (cell.hit) return { changed: false, board };

    const next = cloneBoard(board);
    next[r][c].hit = true;

    const wasHit = cell.hasShip;
    return { changed: true, board: next, wasHit, shipId: next[r][c].shipId };
  }

  function updateAfterHit(nextBoard, shipId) {
    if (!shipId) return false;
    if (!isShipSunk(nextBoard, shipId)) return false;
    markShipSunk(nextBoard, shipId);
    setSunk((s) => s + 1);
    return true;
  }

  function handleShot(r, c) {
    const result = applyShot(r, c);
    if (!result.changed) return;

    setShots((s) => s + 1);
    if (result.wasHit) setHits((h) => h + 1);

    const nextBoard = result.board;
    if (result.wasHit) updateAfterHit(nextBoard, result.shipId);

    // Sin anidación: asignamos el nuevo board al final
    setState((prev) => ({ ...prev, board: nextBoard }));
  }

  useEffect(() => {
    if (totalShipCells === 0) return;
    if (hits < totalShipCells) return;
    setGameOver(true);
  }, [hits, totalShipCells]);

  const status = gameOver
    ? `¡Ganaste! Hundiste todos los barcos en ${shots} disparos.`
    : `Disparos: ${shots} · Aciertos: ${hits} · Hundidos: ${sunk}/${SHIPS.length}`;

  return (
    <div className="wrapper">
      <h1>Battleship (React + Vite)</h1>

      <div className="panel">
        <div className="stats">{status}</div>
        <div className="actions">
          <button className="btn" onClick={resetGame}>
            Reiniciar
          </button>
          <label className="reveal">
            <input
              type="checkbox"
              checked={reveal}
              onChange={(e) => setReveal(e.target.checked)}
            />{" "}
            Mostrar barcos (trampa)
          </label>
        </div>
      </div>

      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, 36px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, 36px)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const classes = ["cell"];
            if (cell.hit && !cell.hasShip) classes.push("miss");
            if (cell.hit && cell.hasShip) classes.push("hit");
            if (cell.sunk) classes.push("sunk");
            if (reveal && cell.hasShip && !cell.hit) classes.push("reveal");

            return (
              <button
                key={`${r}-${c}`}
                className={classes.join(" ")}
                onClick={() => handleShot(r, c)}
                aria-label={`r${r} c${c}`}
              />
            );
          })
        )}
      </div>

      <details className="legend">
        <summary>¿Cómo jugar?</summary>
        <ul>
          <li>Da clic en una celda para disparar.</li>
          <li>
            Gris = sin disparar, Azul = agua, Naranja = golpe, Rojo = hundido.
          </li>
          <li>“Mostrar barcos” enseña la posición (para pruebas).</li>
        </ul>
      </details>
    </div>
  );
}
