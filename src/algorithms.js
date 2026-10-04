import { costOf, index, neighbours } from './grid.js';
import { PriorityQueue } from './priority-queue.js';

/**
 * Every algorithm returns the same shape so the UI can animate any of them
 * identically:
 *   visited - cells in the order they were expanded (drives the animation)
 *   path    - the final route, start to end, or [] when unreachable
 *   cost    - total weighted cost of that route
 */

function reconstruct(cameFrom, grid, end) {
  const path = [];
  let current = index(grid, end.x, end.y);
  if (cameFrom.get(current) === undefined && !(current === cameFrom.startIndex)) {
    return path;
  }
  while (current !== undefined) {
    path.push({ x: current % grid.cols, y: Math.floor(current / grid.cols) });
    current = cameFrom.get(current);
  }
  return path.reverse();
}

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const euclidean = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Breadth-first search: ignores weights, guarantees fewest *steps*. */
export function bfs(grid) {
  const { start, end } = grid;
  const startIdx = index(grid, start.x, start.y);
  const endIdx = index(grid, end.x, end.y);

  const queue = [start];
  const cameFrom = new Map();
  cameFrom.startIndex = startIdx;
  const seen = new Set([startIdx]);
  const visited = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentIdx = index(grid, current.x, current.y);
    visited.push(current);

    if (currentIdx === endIdx) break;

    for (const next of neighbours(grid, current.x, current.y)) {
      const nextIdx = index(grid, next.x, next.y);
      if (seen.has(nextIdx)) continue;
      seen.add(nextIdx);
      cameFrom.set(nextIdx, currentIdx);
      queue.push(next);
    }
  }

  const path = seen.has(endIdx) ? reconstruct(cameFrom, grid, end) : [];
  return { visited, path, cost: pathCost(grid, path) };
}

/** Depth-first search: finds *a* path, almost never a good one. Shown for contrast. */
export function dfs(grid) {
  const { start, end } = grid;
  const startIdx = index(grid, start.x, start.y);
  const endIdx = index(grid, end.x, end.y);

  const stack = [start];
  const cameFrom = new Map();
  cameFrom.startIndex = startIdx;
  const seen = new Set();
  const visited = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const currentIdx = index(grid, current.x, current.y);
    if (seen.has(currentIdx)) continue;
    seen.add(currentIdx);
    visited.push(current);

    if (currentIdx === endIdx) break;

    for (const next of neighbours(grid, current.x, current.y)) {
      const nextIdx = index(grid, next.x, next.y);
      if (seen.has(nextIdx)) continue;
      if (!cameFrom.has(nextIdx)) cameFrom.set(nextIdx, currentIdx);
      stack.push(next);
    }
  }

  const path = seen.has(endIdx) ? reconstruct(cameFrom, grid, end) : [];
  return { visited, path, cost: pathCost(grid, path) };
}

/** Dijkstra: cheapest path when cells have different costs. */
export function dijkstra(grid) {
  const { start, end } = grid;
  const startIdx = index(grid, start.x, start.y);
  const endIdx = index(grid, end.x, end.y);

  const dist = new Map([[startIdx, 0]]);
  const cameFrom = new Map();
  cameFrom.startIndex = startIdx;
  const settled = new Set();
  const visited = [];

  const queue = new PriorityQueue();
  queue.push(start, 0);

  while (queue.size > 0) {
    const current = queue.pop();
    const currentIdx = index(grid, current.x, current.y);
    if (settled.has(currentIdx)) continue;
    settled.add(currentIdx);
    visited.push(current);

    if (currentIdx === endIdx) break;

    for (const next of neighbours(grid, current.x, current.y)) {
      const nextIdx = index(grid, next.x, next.y);
      if (settled.has(nextIdx)) continue;
      const tentative = dist.get(currentIdx) + costOf(grid, next.x, next.y);
      if (tentative < (dist.get(nextIdx) ?? Infinity)) {
        dist.set(nextIdx, tentative);
        cameFrom.set(nextIdx, currentIdx);
        queue.push(next, tentative);
      }
    }
  }

  const path = settled.has(endIdx) ? reconstruct(cameFrom, grid, end) : [];
  return { visited, path, cost: pathCost(grid, path) };
}

/**
 * A*: Dijkstra plus a heuristic nudge toward the goal.
 *
 * f(n) = g(n) + h(n). Manhattan distance is *admissible* on a 4-connected grid
 * with min cost 1 - it never overestimates - so A* keeps Dijkstra's optimality
 * guarantee while expanding dramatically fewer cells.
 */
export function astar(grid, heuristic = manhattan) {
  const { start, end } = grid;
  const startIdx = index(grid, start.x, start.y);
  const endIdx = index(grid, end.x, end.y);

  const gScore = new Map([[startIdx, 0]]);
  const cameFrom = new Map();
  cameFrom.startIndex = startIdx;
  const settled = new Set();
  const visited = [];

  const queue = new PriorityQueue();
  queue.push(start, heuristic(start, end));

  while (queue.size > 0) {
    const current = queue.pop();
    const currentIdx = index(grid, current.x, current.y);
    if (settled.has(currentIdx)) continue;
    settled.add(currentIdx);
    visited.push(current);

    if (currentIdx === endIdx) break;

    for (const next of neighbours(grid, current.x, current.y)) {
      const nextIdx = index(grid, next.x, next.y);
      if (settled.has(nextIdx)) continue;
      const tentative = gScore.get(currentIdx) + costOf(grid, next.x, next.y);
      if (tentative < (gScore.get(nextIdx) ?? Infinity)) {
        gScore.set(nextIdx, tentative);
        cameFrom.set(nextIdx, currentIdx);
        queue.push(next, tentative + heuristic(next, end));
      }
    }
  }

  const path = settled.has(endIdx) ? reconstruct(cameFrom, grid, end) : [];
  return { visited, path, cost: pathCost(grid, path) };
}

/**
 * Greedy best-first: follows the heuristic alone, ignoring cost so far.
 * Very fast, frequently wrong - the perfect foil to A* in a demo.
 */
export function greedy(grid, heuristic = manhattan) {
  const { start, end } = grid;
  const startIdx = index(grid, start.x, start.y);
  const endIdx = index(grid, end.x, end.y);

  const cameFrom = new Map();
  cameFrom.startIndex = startIdx;
  const seen = new Set([startIdx]);
  const visited = [];

  const queue = new PriorityQueue();
  queue.push(start, heuristic(start, end));

  while (queue.size > 0) {
    const current = queue.pop();
    const currentIdx = index(grid, current.x, current.y);
    visited.push(current);

    if (currentIdx === endIdx) break;

    for (const next of neighbours(grid, current.x, current.y)) {
      const nextIdx = index(grid, next.x, next.y);
      if (seen.has(nextIdx)) continue;
      seen.add(nextIdx);
      cameFrom.set(nextIdx, currentIdx);
      queue.push(next, heuristic(next, end));
    }
  }

  const path = seen.has(endIdx) ? reconstruct(cameFrom, grid, end) : [];
  return { visited, path, cost: pathCost(grid, path) };
}

export function pathCost(grid, path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += costOf(grid, path[i].x, path[i].y);
  }
  return total;
}

export const ALGORITHMS = {
  astar: { label: 'A*', fn: astar, weighted: true, optimal: true },
  dijkstra: { label: 'Dijkstra', fn: dijkstra, weighted: true, optimal: true },
  bfs: { label: 'BFS', fn: bfs, weighted: false, optimal: true },
  greedy: { label: 'Greedy', fn: greedy, weighted: false, optimal: false },
  dfs: { label: 'DFS', fn: dfs, weighted: false, optimal: false },
};
