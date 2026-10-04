import { ALGORITHMS, pathCost } from './algorithms.js';
import { CELL, WEIGHT_COST, clearWalls, createGrid, inBounds, isTerminal, set } from './grid.js';
import { randomWalls, randomWeights, recursiveDivision } from './maze.js';

const COLORS = {
  empty: '#0f1521',
  grid: '#1b2334',
  wall: '#46536b',
  weight: '#6b4b1f',
  visited: '#1b4b7a',
  visitedLate: '#5b2a86',
  path: '#ffd54a',
  start: '#3fd47f',
  end: '#ff5d6c',
};

const SPEEDS = { slow: 1, normal: 6, fast: 20, instant: Infinity };

export function mount(root) {
  const canvas = root.querySelector('#board');
  const ctx = canvas.getContext('2d');
  const els = {
    algo: root.querySelector('#algo'),
    speed: root.querySelector('#speed'),
    run: root.querySelector('#run'),
    maze: root.querySelector('#maze'),
    scatter: root.querySelector('#scatter'),
    weights: root.querySelector('#weights'),
    clear: root.querySelector('#clear'),
    visited: root.querySelector('#stat-visited'),
    length: root.querySelector('#stat-length'),
    cost: root.querySelector('#stat-cost'),
    time: root.querySelector('#stat-time'),
    note: root.querySelector('#note'),
  };

  let cellSize = 22;
  let grid = createGrid(10, 10);
  let animation = null;
  let drag = null;           // 'wall' | 'erase' | 'weight' | 'start' | 'end'
  let visitedSet = null;
  let pathSet = null;

  function layout() {
    const width = canvas.parentElement.clientWidth;
    const height = Math.max(320, Math.min(560, Math.round(width * 0.5)));
    cellSize = width > 900 ? 22 : width > 600 ? 18 : 14;

    const cols = Math.max(10, Math.floor(width / cellSize));
    const rows = Math.max(8, Math.floor(height / cellSize));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cols * cellSize * dpr;
    canvas.height = rows * cellSize * dpr;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const previous = grid;
    grid = createGrid(cols, rows);
    // Preserve the drawing when the window resizes.
    if (previous.cols > 1) {
      for (let y = 0; y < Math.min(rows, previous.rows); y++) {
        for (let x = 0; x < Math.min(cols, previous.cols); x++) {
          grid.cells[y * cols + x] = previous.cells[y * previous.cols + x];
        }
      }
      grid.start = clamp(previous.start, cols, rows);
      grid.end = clamp(previous.end, cols, rows);
    }
    reset();
  }

  const clamp = (p, cols, rows) => ({
    x: Math.min(p.x, cols - 1),
    y: Math.min(p.y, rows - 1),
  });

  function reset() {
    cancelAnimation();
    visitedSet = null;
    pathSet = null;
    setStats({ visited: 0, length: 0, cost: 0, time: 0 });
    draw();
  }

  function cancelAnimation() {
    if (animation) {
      cancelAnimationFrame(animation);
      animation = null;
    }
    els.run.disabled = false;
    els.run.textContent = 'Visualise';
  }

  function setStats({ visited, length, cost, time }) {
    els.visited.textContent = visited.toLocaleString();
    els.length.textContent = length.toLocaleString();
    els.cost.textContent = cost.toLocaleString();
    els.time.textContent = `${time.toFixed(2)} ms`;
  }

  function draw() {
    ctx.fillStyle = COLORS.empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const i = y * grid.cols + x;
        const px = x * cellSize;
        const py = y * cellSize;
        let fill = null;

        if (grid.cells[i] === CELL.WALL) fill = COLORS.wall;
        else if (grid.cells[i] === CELL.WEIGHT) fill = COLORS.weight;

        if (visitedSet && visitedSet.has(i) && grid.cells[i] !== CELL.WALL) {
          const t = visitedSet.get(i);
          fill = mix(COLORS.visited, COLORS.visitedLate, t);
        }
        if (pathSet && pathSet.has(i)) fill = COLORS.path;

        if (fill) {
          ctx.fillStyle = fill;
          roundRect(ctx, px + 1, py + 1, cellSize - 2, cellSize - 2, 3);
          ctx.fill();
        } else {
          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        }
      }
    }

    marker(grid.start, COLORS.start);
    marker(grid.end, COLORS.end);
  }

  function marker(point, color) {
    const px = point.x * cellSize;
    const py = point.y * cellSize;
    ctx.fillStyle = color;
    roundRect(ctx, px + 2, py + 2, cellSize - 4, cellSize - 4, 4);
    ctx.fill();
  }

  function run() {
    cancelAnimation();
    visitedSet = new Map();
    pathSet = null;

    const entry = ALGORITHMS[els.algo.value];
    const started = performance.now();
    const result = entry.fn(grid);
    const elapsed = performance.now() - started;

    els.note.textContent = result.path.length
      ? `${entry.label}: ${entry.optimal ? 'optimal' : 'not guaranteed optimal'}` +
        `${entry.weighted ? ' · respects weights' : ' · ignores weights'}`
      : 'No path exists — the goal is walled off.';

    const perFrame = SPEEDS[els.speed.value];
    const total = result.visited.length;

    if (perFrame === Infinity) {
      result.visited.forEach((cell, i) => {
        visitedSet.set(cell.y * grid.cols + cell.x, i / Math.max(total - 1, 1));
      });
      finish(result, elapsed);
      return;
    }

    els.run.disabled = true;
    els.run.textContent = 'Running…';
    let i = 0;

    const step = () => {
      for (let n = 0; n < perFrame && i < total; n++, i++) {
        const cell = result.visited[i];
        visitedSet.set(cell.y * grid.cols + cell.x, i / Math.max(total - 1, 1));
      }
      draw();
      setStats({ visited: i, length: 0, cost: 0, time: elapsed });

      if (i < total) {
        animation = requestAnimationFrame(step);
      } else {
        animatePath(result, elapsed);
      }
    };
    animation = requestAnimationFrame(step);
  }

  function animatePath(result, elapsed) {
    pathSet = new Set();
    let i = 0;
    const step = () => {
      for (let n = 0; n < 2 && i < result.path.length; n++, i++) {
        const cell = result.path[i];
        pathSet.add(cell.y * grid.cols + cell.x);
      }
      draw();
      if (i < result.path.length) {
        animation = requestAnimationFrame(step);
      } else {
        finish(result, elapsed);
      }
    };
    animation = requestAnimationFrame(step);
  }

  function finish(result, elapsed) {
    pathSet = new Set(result.path.map((c) => c.y * grid.cols + c.x));
    draw();
    setStats({
      visited: result.visited.length,
      length: Math.max(result.path.length - 1, 0),
      cost: pathCost(grid, result.path),
      time: elapsed,
    });
    cancelAnimation();
  }

  function cellAt(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: Math.floor((source.clientX - rect.left) / cellSize),
      y: Math.floor((source.clientY - rect.top) / cellSize),
    };
  }

  function onPointerDown(event) {
    const { x, y } = cellAt(event);
    if (!inBounds(grid, x, y)) return;
    event.preventDefault();

    if (grid.start.x === x && grid.start.y === y) drag = 'start';
    else if (grid.end.x === x && grid.end.y === y) drag = 'end';
    else if (event.shiftKey) drag = 'weight';
    else if (grid.cells[y * grid.cols + x] === CELL.WALL) drag = 'erase';
    else drag = 'wall';

    paint(x, y);
  }

  function onPointerMove(event) {
    if (!drag) return;
    const { x, y } = cellAt(event);
    if (!inBounds(grid, x, y)) return;
    event.preventDefault();
    paint(x, y);
  }

  function paint(x, y) {
    if (drag === 'start') {
      if (!isTerminal(grid, x, y) && grid.cells[y * grid.cols + x] !== CELL.WALL) {
        grid.start = { x, y };
      }
    } else if (drag === 'end') {
      if (!isTerminal(grid, x, y) && grid.cells[y * grid.cols + x] !== CELL.WALL) {
        grid.end = { x, y };
      }
    } else if (drag === 'weight') {
      set(grid, x, y, CELL.WEIGHT);
    } else if (drag === 'erase') {
      set(grid, x, y, CELL.EMPTY);
    } else {
      set(grid, x, y, CELL.WALL);
    }
    draw();
  }

  const onPointerUp = () => { drag = null; };

  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp);

  els.run.addEventListener('click', run);
  els.maze.addEventListener('click', () => { recursiveDivision(grid); reset(); });
  els.scatter.addEventListener('click', () => { randomWalls(grid, 0.28); reset(); });
  els.weights.addEventListener('click', () => { randomWeights(grid, 0.25); reset(); });
  els.clear.addEventListener('click', () => { clearWalls(grid); reset(); });
  els.algo.addEventListener('change', reset);

  window.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'SELECT') return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(); }
    if (event.key.toLowerCase() === 'c') { clearWalls(grid); reset(); }
    if (event.key.toLowerCase() === 'm') { recursiveDivision(grid); reset(); }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  // Populate the algorithm picker from the registry - add one entry there and
  // it shows up here automatically.
  els.algo.innerHTML = Object.entries(ALGORITHMS)
    .map(([key, value]) => `<option value="${key}">${value.label}</option>`)
    .join('');

  els.weights.title = `Weighted cells cost ${WEIGHT_COST} to enter instead of 1`;

  layout();
  recursiveDivision(grid);
  reset();
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round((pa >> 16) + ((pb >> 16) - (pa >> 16)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
