function runDijkstra({ nodes, edges, sourceId, targetId }) {
  const numNodes = nodes.length;
  const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const adjacency = Array.from({ length: numNodes }, () => []);
  for (const e of edges) {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u === undefined || v === undefined) continue;
    adjacency[u].push({ v, w: Number(e.weight) });
  }

  const INF = Number.POSITIVE_INFINITY;
  const dist = Array(numNodes).fill(INF);
  const parent = Array(numNodes).fill(null);
  const visited = Array(numNodes).fill(false);

  // Simple binary heap implemented via array with decrease-key by pushing duplicates
  // and skipping visited entries on pop. Good enough for clarity and demo.
  const heap = [];
  function push(item) {
    heap.push(item);
    siftUp(heap.length - 1);
  }
  function pop() {
    if (heap.length === 0) return null;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      siftDown(0);
    }
    return top;
  }
  function siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].key <= heap[i].key) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  }
  function siftDown(i) {
    while (true) {
      const l = (i << 1) + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l].key < heap[m].key) m = l;
      if (r < heap.length && heap[r].key < heap[m].key) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }

  const sourceIndex = idToIndex.get(sourceId);
  if (sourceIndex === undefined) {
    throw new Error("Invalid sourceId");
  }

  dist[sourceIndex] = 0;
  push({ key: 0, v: sourceIndex });

  let relaxations = 0;
  let heapOps = 0;

  while (heap.length > 0) {
    const current = pop();
    heapOps++;
    if (!current) break;
    const u = current.v;
    if (visited[u]) continue;
    visited[u] = true;
    if (targetId !== undefined && idToIndex.get(targetId) === u) break;

    for (const { v, w } of adjacency[u]) {
      if (w < 0) continue; // Dijkstra assumes non-negative
      const candidate = dist[u] + w;
      if (candidate < dist[v]) {
        dist[v] = candidate;
        parent[v] = u;
        push({ key: dist[v], v });
        heapOps++;
        relaxations++;
      }
    }
  }

  function buildPath(targetIndex) {
    if (targetIndex === undefined || targetIndex === null) return [];
    const path = [];
    let cur = targetIndex;
    while (cur !== null && cur !== undefined) {
      path.push(nodes[cur].id);
      cur = parent[cur];
    }
    return path.reverse();
  }

  const targetIndex =
    targetId !== undefined ? idToIndex.get(targetId) : undefined;
  const path = targetIndex !== undefined ? buildPath(targetIndex) : [];

  return {
    dist,
    parent,
    path,
    idToIndex: Object.fromEntries(idToIndex),
    metrics: { relaxations, heapOps },
  };
}

module.exports = { runDijkstra };
