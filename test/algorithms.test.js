import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALGORITHMS, astar, bfs, dfs, dijkstra, greedy, manhattan, pathCost } from '../src/algorithms.js';
import { CELL, createGrid, set } from '../src/grid.js';
import { PriorityQueue } from '../src/priority-queue.js';

function gridFrom(rows) {
  const grid = createGrid(rows[0].length, rows.length);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '#') grid.cells[y * grid.cols + x] = CELL.WALL;
      if (ch === '~') grid.cells[y * grid.cols + x] = CELL.WEIGHT;
      if (ch === 'S') grid.start = { x, y };
      if (ch === 'E') grid.end = { x, y };
    }
  }
  return grid;
}

const ALL = [
  ['bfs', bfs],
  ['dfs', dfs],
  ['dijkstra', dijkstra],
  ['astar', astar],
  ['greedy', greedy],
];

describe('PriorityQueue', () => {
  it('pops in priority order', () => {
    const q = new PriorityQueue();
    for (const [v, p] of [['c', 3], ['a', 1], ['d', 4], ['b', 2]]) q.push(v, p);
    assert.deepEqual([q.pop(), q.pop(), q.pop(), q.pop()], ['a', 'b', 'c', 'd']);
  });

  it('handles an empty queue', () => {
    assert.equal(new PriorityQueue().pop(), undefined);
  });

  it('survives a randomised stress test', () => {
    const q = new PriorityQueue();
    const expected = [];
    for (let i = 0; i < 500; i++) {
      const p = Math.floor(Math.random() * 1000);
      q.push(p, p);
      expected.push(p);
    }
    expected.sort((a, b) => a - b);
    const actual = [];
    while (q.size > 0) actual.push(q.pop());
    assert.deepEqual(actual, expected);
  });
});

describe('every algorithm', () => {
  const open = gridFrom([
    'S....',
    '.....',
    '....E',
  ]);

  for (const [name, fn] of ALL) {
    it(`${name} finds a connected path from start to end`, () => {
      const { path } = fn(open);
      assert.ok(path.length > 0, 'expected a path');
      assert.deepEqual(path[0], open.start);
      assert.deepEqual(path[path.length - 1], open.end);
      for (let i = 1; i < path.length; i++) {
        const step = manhattan(path[i - 1], path[i]);
        assert.equal(step, 1, `step ${i} jumped ${step} cells`);
      }
    });

    it(`${name} reports no path when the goal is walled off`, () => {
      const blocked = gridFrom([
        'S#.',
        '.#.',
        '.#E',
      ]);
      assert.deepEqual(fn(blocked).path, []);
    });

    it(`${name} never walks through a wall`, () => {
      const maze = gridFrom([
        'S.#..',
        '.##..',
        '...#E',
      ]);
      for (const cell of fn(maze).path) {
        assert.notEqual(maze.cells[cell.y * maze.cols + cell.x], CELL.WALL);
      }
    });
  }
});

describe('optimality', () => {
  const maze = gridFrom([
    'S..#....',
    '.#.#.##.',
    '.#...#..',
    '.####.#.',
    '......#E',
  ]);

  it('BFS finds the fewest steps', () => {
    const steps = bfs(maze).path.length;
    for (const [name, fn] of ALL) {
      const result = fn(maze);
      if (result.path.length === 0) continue;
      assert.ok(result.path.length >= steps, `${name} beat BFS, which is impossible`);
    }
  });

  it('A* matches Dijkstra cost on a weighted grid', () => {
    const weighted = gridFrom([
      'S~~~~~~.',
      '.~~~~~~.',
      '.......E',
    ]);
    assert.equal(astar(weighted).cost, dijkstra(weighted).cost);
  });

  it('A* expands no more cells than Dijkstra', () => {
    assert.ok(astar(maze).visited.length <= dijkstra(maze).visited.length);
  });

  it('Dijkstra routes around expensive cells, BFS does not', () => {
    const weighted = gridFrom([
      'S~~~~E',
      '......',
    ]);
    assert.ok(dijkstra(weighted).cost < pathCost(weighted, bfs(weighted).path));
  });

  it('greedy is not guaranteed optimal but still terminates', () => {
    const result = greedy(maze);
    assert.ok(result.visited.length > 0);
  });
});

describe('edge cases', () => {
  it('start equals end', () => {
    const grid = createGrid(5, 5);
    grid.start = { x: 2, y: 2 };
    grid.end = { x: 2, y: 2 };
    for (const [name, fn] of ALL) {
      const { path } = fn(grid);
      assert.equal(path.length, 1, `${name} should return a single-cell path`);
    }
  });

  it('a 1x1 grid does not crash', () => {
    const grid = createGrid(1, 1);
    grid.start = { x: 0, y: 0 };
    grid.end = { x: 0, y: 0 };
    assert.equal(bfs(grid).path.length, 1);
  });

  it('visited order always begins at the start cell', () => {
    const grid = gridFrom(['S...', '....', '...E']);
    for (const [name, fn] of ALL) {
      assert.deepEqual(fn(grid).visited[0], grid.start, `${name} started elsewhere`);
    }
  });

  it('ALGORITHMS registry exposes every implementation', () => {
    assert.deepEqual(
      Object.keys(ALGORITHMS).sort(),
      ['astar', 'bfs', 'dfs', 'dijkstra', 'greedy'],
    );
    for (const entry of Object.values(ALGORITHMS)) {
      assert.equal(typeof entry.fn, 'function');
      assert.equal(typeof entry.label, 'string');
    }
  });
});

describe('grid helpers', () => {
  it('refuses to place a wall on start or end', () => {
    const grid = createGrid(10, 10);
    set(grid, grid.start.x, grid.start.y, CELL.WALL);
    set(grid, grid.end.x, grid.end.y, CELL.WALL);
    assert.notEqual(grid.cells[grid.start.y * grid.cols + grid.start.x], CELL.WALL);
    assert.notEqual(grid.cells[grid.end.y * grid.cols + grid.end.x], CELL.WALL);
  });

  it('ignores out-of-bounds writes', () => {
    const grid = createGrid(5, 5);
    set(grid, -1, 0, CELL.WALL);
    set(grid, 99, 99, CELL.WALL);
    assert.equal(grid.cells.reduce((a, b) => a + b, 0), 0);
  });
});
