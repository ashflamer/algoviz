import { CELL, clearWalls, inBounds, isTerminal, set } from './grid.js';

/** Mulberry32 - tiny seedable PRNG so mazes are reproducible in tests. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scatter walls at random. Fast, chaotic, not always solvable. */
export function randomWalls(grid, density = 0.28, random = Math.random) {
  clearWalls(grid);
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (random() < density) set(grid, x, y, CELL.WALL);
    }
  }
}

/** Scatter weighted (expensive-to-cross) cells. */
export function randomWeights(grid, density = 0.3, random = Math.random) {
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (grid.cells[y * grid.cols + x] === CELL.EMPTY && random() < density) {
        set(grid, x, y, CELL.WEIGHT);
      }
    }
  }
}

/**
 * Recursive division: start with an empty room, split it with a wall, punch
 * one hole in that wall, recurse into both halves. Produces clean maze
 * corridors rather than random noise, and is always fully connected.
 */
export function recursiveDivision(grid, random = Math.random) {
  clearWalls(grid);

  // Border.
  for (let x = 0; x < grid.cols; x++) {
    set(grid, x, 0, CELL.WALL);
    set(grid, x, grid.rows - 1, CELL.WALL);
  }
  for (let y = 0; y < grid.rows; y++) {
    set(grid, 0, y, CELL.WALL);
    set(grid, grid.cols - 1, y, CELL.WALL);
  }

  divide(grid, 1, 1, grid.cols - 2, grid.rows - 2, random);

  // Guarantee the endpoints are reachable.
  for (const p of [grid.start, grid.end]) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = p.x + dx;
        const y = p.y + dy;
        if (inBounds(grid, x, y) && x > 0 && y > 0 && x < grid.cols - 1 && y < grid.rows - 1) {
          grid.cells[y * grid.cols + x] = CELL.EMPTY;
        }
      }
    }
  }
}

function divide(grid, x, y, width, height, random) {
  if (width < 3 || height < 3) return;

  const horizontal = width === height ? random() < 0.5 : width < height;

  if (horizontal) {
    // Wall on an even row, gap on an odd column - keeps corridors open.
    const wallY = y + 1 + 2 * Math.floor((random() * (height - 2)) / 2);
    const gapX = x + 2 * Math.floor((random() * (width + 1)) / 2);
    for (let i = x; i < x + width; i++) {
      if (i !== gapX && !isTerminal(grid, i, wallY)) {
        grid.cells[wallY * grid.cols + i] = CELL.WALL;
      }
    }
    divide(grid, x, y, width, wallY - y, random);
    divide(grid, x, wallY + 1, width, y + height - wallY - 1, random);
  } else {
    const wallX = x + 1 + 2 * Math.floor((random() * (width - 2)) / 2);
    const gapY = y + 2 * Math.floor((random() * (height + 1)) / 2);
    for (let i = y; i < y + height; i++) {
      if (i !== gapY && !isTerminal(grid, wallX, i)) {
        grid.cells[i * grid.cols + wallX] = CELL.WALL;
      }
    }
    divide(grid, x, y, wallX - x, height, random);
    divide(grid, wallX + 1, y, x + width - wallX - 1, height, random);
  }
}
