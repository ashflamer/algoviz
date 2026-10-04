import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bfs } from '../src/algorithms.js';
import { CELL, createGrid } from '../src/grid.js';
import { randomWalls, randomWeights, recursiveDivision, rng } from '../src/maze.js';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = rng(42);
    const b = rng(42);
    assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  });

  it('stays within [0, 1)', () => {
    const next = rng(7);
    for (let i = 0; i < 1000; i++) {
      const value = next();
      assert.ok(value >= 0 && value < 1);
    }
  });
});

describe('recursiveDivision', () => {
  it('leaves start and end walkable', () => {
    const grid = createGrid(41, 21);
    recursiveDivision(grid, rng(3));
    assert.notEqual(grid.cells[grid.start.y * grid.cols + grid.start.x], CELL.WALL);
    assert.notEqual(grid.cells[grid.end.y * grid.cols + grid.end.x], CELL.WALL);
  });

  it('produces a solvable maze across many seeds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const grid = createGrid(41, 21);
      recursiveDivision(grid, rng(seed));
      assert.ok(bfs(grid).path.length > 0, `seed ${seed} produced an unsolvable maze`);
    }
  });

  it('is reproducible for a seed', () => {
    const a = createGrid(31, 21);
    const b = createGrid(31, 21);
    recursiveDivision(a, rng(11));
    recursiveDivision(b, rng(11));
    assert.deepEqual([...a.cells], [...b.cells]);
  });
});

describe('randomWalls / randomWeights', () => {
  it('respects approximate density', () => {
    const grid = createGrid(100, 100);
    randomWalls(grid, 0.3, rng(5));
    const walls = [...grid.cells].filter((c) => c === CELL.WALL).length;
    const ratio = walls / grid.cells.length;
    assert.ok(ratio > 0.25 && ratio < 0.35, `density was ${ratio}`);
  });

  it('weights never overwrite walls', () => {
    const grid = createGrid(50, 50);
    randomWalls(grid, 0.5, rng(2));
    const wallsBefore = [...grid.cells].filter((c) => c === CELL.WALL).length;
    randomWeights(grid, 0.5, rng(9));
    const wallsAfter = [...grid.cells].filter((c) => c === CELL.WALL).length;
    assert.equal(wallsBefore, wallsAfter);
  });
});
