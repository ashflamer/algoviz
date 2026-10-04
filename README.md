# algoviz

**Watch pathfinding algorithms think.** A\*, Dijkstra, BFS, DFS and greedy best-first explore a grid you draw yourself. One HTML file, zero dependencies, no build step required to run it.

### [▶ Live demo](https://ashflamer.github.io/algoviz/)

[![CI](https://github.com/ashflamer/algoviz/actions/workflows/ci.yml/badge.svg)](https://github.com/ashflamer/algoviz/actions/workflows/ci.yml)
[![Dependencies: 0](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Tests: 36](https://img.shields.io/badge/tests-36-brightgreen.svg)](test/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Try this

1. Hit **Maze**, pick **Dijkstra**, hit **Visualise**. Watch it flood the entire maze.
2. Switch to **A\***. Same maze, same path — but a fraction of the cells explored.
3. Switch to **Greedy**. Fastest of all, and it takes a visibly worse route.

That contrast *is* the project. The explored region fades blue → purple in expansion order, so you can see the shape of each algorithm's search: Dijkstra's expanding circle, A\*'s teardrop pointing at the goal, DFS's reckless single tentacle.

## Controls

| Action | How |
| --- | --- |
| Draw walls | Drag on the grid |
| Weighted cells (cost 10) | <kbd>Shift</kbd> + drag |
| Move start / goal | Drag the green / red square |
| Run | <kbd>Enter</kbd> or **Visualise** |
| Generate maze | <kbd>M</kbd> or **Maze** |
| Clear | <kbd>C</kbd> or **Clear** |

## The algorithms

| Algorithm | Strategy | Weights | Optimal? |
| --- | --- | --- | --- |
| **A\*** | `f = g + h`, Manhattan heuristic | ✅ | ✅ |
| **Dijkstra** | Cheapest-first, no heuristic | ✅ | ✅ |
| **BFS** | Layer by layer | ❌ | ✅ (fewest *steps*) |
| **Greedy** | Heuristic only, ignores cost so far | ❌ | ❌ |
| **DFS** | Dive deep, backtrack | ❌ | ❌ |

### Why A\* is optimal

A\* expands the node with the lowest `f(n) = g(n) + h(n)`, where `g` is the real cost so far and `h` estimates the cost remaining. The guarantee holds as long as `h` is **admissible** — it never *overestimates* the true remaining cost.

On a 4-connected grid where the cheapest move costs 1, Manhattan distance `|dx| + |dy|` is exactly the number of moves needed with no obstacles. Obstacles and weights can only make the real cost higher, never lower. So `h` never overestimates, and A\* returns the same optimal path as Dijkstra while expanding far fewer nodes.

Drop the `g` term and you get greedy best-first: it charges at the goal and happily walks into dead ends. Drop the `h` term and you get Dijkstra back.

There's a test asserting `astar(maze).cost === dijkstra(maze).cost` and another asserting A\* never expands *more* cells than Dijkstra — if someone breaks the heuristic, CI catches it.

### Maze generation

**Recursive division**: start with an empty room, split it with a wall, punch exactly one hole, recurse into both halves. Walls land on even rows/columns and gaps on odd ones, which keeps corridors a clean one cell wide — and because every split leaves a hole, the maze is **always fully connected**. A test generates 25 seeded mazes and asserts BFS solves every one.

The PRNG is a 6-line [mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md), so mazes are reproducible from a seed in tests.

## Architecture

```
src/
  grid.js            grid model: cells, walls, weights, bounds
  priority-queue.js  binary min-heap (O(log n) push/pop)
  algorithms.js      the five search algorithms — pure functions
  maze.js            recursive division + seeded PRNG
  ui.js              canvas rendering, animation, input
  template.html      the shell
tools/
  build.mjs          40-line bundler → index.html
test/
  algorithms.test.js  36 assertions, node:test, zero deps
index.html           ← the shipped artifact, fully self-contained
```

**Why both modules and a bundle?** The algorithms live in real ES modules so they can be unit tested with `node --test`. But the thing you deploy is a single `index.html` with everything inlined — it runs from `file://`, from GitHub Pages, or from a USB stick, with no toolchain. `tools/build.mjs` concatenates the modules and strips the `import`/`export` lines. It refuses to run if a module uses a default export or a re-export block, because those would break naive concatenation.

CI runs the build and then `git diff --exit-code index.html`, so a stale bundle fails the PR.

Every algorithm returns the same shape, which is what makes the UI algorithm-agnostic:

```js
{
  visited: [{x, y}, ...],  // expansion order — drives the animation
  path:    [{x, y}, ...],  // start → goal, or [] if unreachable
  cost:    42,             // total weighted cost
}
```

Adding a sixth algorithm means writing one function and adding one line to the `ALGORITHMS` registry — the dropdown builds itself from it.

## Run it locally

```bash
git clone https://github.com/ashflamer/algoviz
cd algoviz
open index.html            # that's genuinely it

npm test                   # 36 tests, no node_modules
npm run build              # regenerate index.html after editing src/
```

## Roadmap

- [ ] Bidirectional search
- [ ] 8-directional movement with an octile heuristic
- [ ] Side-by-side race mode: two algorithms, one maze
- [ ] Jump point search
- [ ] Shareable permalinks (grid state encoded in the URL hash)

PRs welcome — adding an algorithm is one pure function plus one registry entry.

## License

MIT © ashflamer
