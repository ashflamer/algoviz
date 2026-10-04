export const CELL = {
  EMPTY: 0,
  WALL: 1,
  WEIGHT: 2,
};

/** Cost of entering a cell. Weighted cells model mud, traffic, stairs... */
export const WEIGHT_COST = 10;

export function createGrid(cols, rows) {
  return {
    cols,
    rows,
    cells: new Uint8Array(cols * rows),
    start: { x: Math.floor(cols * 0.15), y: Math.floor(rows / 2) },
    end: { x: Math.floor(cols * 0.85), y: Math.floor(rows / 2) },
  };
}

export const index = (grid, x, y) => y * grid.cols + x;

export const inBounds = (grid, x, y) =>
  x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;

export const get = (grid, x, y) => grid.cells[index(grid, x, y)];

export function set(grid, x, y, value) {
  if (!inBounds(grid, x, y)) return;
  if (isTerminal(grid, x, y)) return; // never bury start/end
  grid.cells[index(grid, x, y)] = value;
}

export const isWall = (grid, x, y) => get(grid, x, y) === CELL.WALL;

export const costOf = (grid, x, y) =>
  get(grid, x, y) === CELL.WEIGHT ? WEIGHT_COST : 1;

export const isTerminal = (grid, x, y) =>
  (grid.start.x === x && grid.start.y === y) ||
  (grid.end.x === x && grid.end.y === y);

export function clearWalls(grid) {
  grid.cells.fill(CELL.EMPTY);
}

/** 4-directional neighbours, walls excluded. */
export function neighbours(grid, x, y) {
  const out = [];
  if (y > 0 && !isWall(grid, x, y - 1)) out.push({ x, y: y - 1 });
  if (x < grid.cols - 1 && !isWall(grid, x + 1, y)) out.push({ x: x + 1, y });
  if (y < grid.rows - 1 && !isWall(grid, x, y + 1)) out.push({ x, y: y + 1 });
  if (x > 0 && !isWall(grid, x - 1, y)) out.push({ x: x - 1, y });
  return out;
}
