/**
 * Binary min-heap. A sorted array would make Dijkstra O(n^2 log n); this keeps
 * push/pop at O(log n), which is the difference between a smooth 100x50 grid
 * and a visibly stuttering one.
 */
export class PriorityQueue {
  #heap = [];

  get size() {
    return this.#heap.length;
  }

  push(value, priority) {
    this.#heap.push({ value, priority });
    this.#bubbleUp(this.#heap.length - 1);
  }

  pop() {
    if (this.#heap.length === 0) return undefined;
    const top = this.#heap[0];
    const last = this.#heap.pop();
    if (this.#heap.length > 0) {
      this.#heap[0] = last;
      this.#sinkDown(0);
    }
    return top.value;
  }

  #bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.#heap[i].priority >= this.#heap[parent].priority) break;
      this.#swap(i, parent);
      i = parent;
    }
  }

  #sinkDown(i) {
    const n = this.#heap.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && this.#heap[left].priority < this.#heap[smallest].priority) smallest = left;
      if (right < n && this.#heap[right].priority < this.#heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      this.#swap(i, smallest);
      i = smallest;
    }
  }

  #swap(a, b) {
    [this.#heap[a], this.#heap[b]] = [this.#heap[b], this.#heap[a]];
  }
}
