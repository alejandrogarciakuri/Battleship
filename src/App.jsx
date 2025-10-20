import { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * Battleship (Hundir la flota) – versión simple:
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

// Crea una matriz 10x10 con celdas vacías
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

// Intenta colocar un barco en el tablero (mutando la matriz)
function placeShip(board, ship) {
  const dir = Math.random() < 0.5 ? "H" : "V"; // Horizontal / Vertical
  const maxRow = dir === "H" ? GRID_SIZE : GRID_SIZE - ship.size + 1;
  const maxCol = dir === "V" ? GRID_SIZE : GRID_SIZE - ship.size + 1;

  // Probea posiciones aleatorias hasta encontrar una válida
  // (tablero chico + pocos barcos => converge rápido)
  for (let tries = 0; tries < 500; tries++) {
    const r0 = Math.floor(Math.random() * maxRow);
    const c0 = Math.floor(Math.random() * maxCol);

    let free = true;
    for (let k = 0; k < ship.size; k++) {
      const r = r0 + (dir === "V" ? k : 0);
      const c = c0 + (dir === "H" ? k : 0);
      if (board[r][c].hasShip) {
        free = false;
        break;
      }
    }
    if (!free) continue;

    // Coloca el barco
    for (let k = 0; k < ship.size; k++) {
      const r = r0 + (dir === "V" ? k : 0);
      const c = c0 + (dir === "H" ? k : 0);
      board[r][c] = {
        ...board[r][c],
        hasShip: true,
        shipId: ship.id,
      };
    }
    // Devuelve las coordenadas ocupadas (útil para chequeos)
    const coords = Array.from({ length: ship.size }, (_, k) => ({
      r: r0 + (dir === "V" ? k : 0),
      c: c0 + (dir === "H" ? k : 0),
    }));
    return coords;
  }
  throw new Error("No se pudo ubicar el barco (intenta de nuevo).");
}

// Construye un tablero nuevo con todos los barcos colocados
function buildBoard() {
  const board = createEmptyBoard();
  const placements = {};
  for (const ship of SHIPS) {
    const coords = placeShip(board, ship);
    placements[ship.id] = coords;
  }
  return { board, placements };
}

export default function App() {
  const [board, setBoard] = useState(() => buildBoard().board);
  const [placements, setPlacements] = useState(() => buildBoard().placements);
  const [shots, setShots] = useState(0);
  const [hits, setHits] = useState(0);
  const [sunk, setSunk] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [reveal, setReveal] = useState(false); // Modo trampa

  // Para reiniciar el juego
  const resetGame = () => {
    const { board: b, placements: p } = buildBoard();
    setBoard(b);
    setPlacements(p);
    setShots(0);
    setHits(0);
    setSunk(0);
    setGameOver(false);
    setReveal(false);
  };

  // Tamaño total de celdas con barco (para saber cuándo termina)
  const totalShipCells = useMemo(
    () => SHIPS.reduce((acc, s) => acc + s.size, 0),
    []
  );

  // Marca hundido si todas las celdas de un shipId están golpeadas
  const markSunkIfApplies = (nextBoard, shipId) => {
    let allHit = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = nextBoard[r][c];
        if (cell.shipId === shipId && !cell.hit) {
          allHit = false;
          break;
        }
      }
      if (!allHit) break;
    }
    if (allHit) {
      // marca todas las celdas de este barco como hundidas (para dar estilo)
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (nextBoard[r][c].shipId === shipId) {
            nextBoard[r][c].sunk = true;
          }
        }
      }
      setSunk((s) => s + 1);
    }
  };

  const handleShot = (r, c) => {
    if (gameOver) return;

    setBoard((prev) => {
      const cell = prev[r][c];
      if (cell.hit) return prev; // ya disparado

      const next = prev.map((row) => row.map((x) => ({ ...x })));
      next[r][c].hit = true;

      setShots((s) => s + 1);

      if (cell.hasShip) {
        setHits((h) => h + 1);
        markSunkIfApplies(next, cell.shipId);
      }

      return next;
    });
  };

  useEffect(() => {
    if (hits >= totalShipCells && totalShipCells > 0) {
      setGameOver(true);
    }
  }, [hits, totalShipCells]);

  // Texto de estado
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
            />
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
