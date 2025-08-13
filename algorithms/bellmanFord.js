function runBellmanFord({ nodes, edges, sourceId, targetId }) {
  const numNodes = nodes.length;
  const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const adjacencyEdges = [];
  for (const e of edges) {
    const u = idToIndex.get(e.source);
    const v = idToIndex.get(e.target);
    if (u === undefined || v === undefined) continue;
    adjacencyEdges.push({ u, v, w: Number(e.weight) });
  }

  const INF = Number.POSITIVE_INFINITY;
  const dist = Array(numNodes).fill(INF);
  const parent = Array(numNodes).fill(null);

  const sourceIndex = idToIndex.get(sourceId);
  if (sourceIndex === undefined) {
    throw new Error("Invalid sourceId");
  }
  dist[sourceIndex] = 0;

  let relaxations = 0;

  for (let i = 0; i < numNodes - 1; i++) {
    let changed = false;
    for (const { u, v, w } of adjacencyEdges) {
      if (dist[u] !== INF && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        relaxations++;
        changed = true;
      }
    }
    if (!changed) break;
  }

  let hasNegativeCycle = false;
  for (const { u, v, w } of adjacencyEdges) {
    if (dist[u] !== INF && dist[u] + w < dist[v]) {
      hasNegativeCycle = true;
      break;
    }
  }

  function buildPath(targetIndex) {
    if (targetIndex === undefined || targetIndex === null) return [];
    const path = [];
    let cur = targetIndex;
    const seen = new Set();
    while (cur !== null && cur !== undefined) {
      if (seen.has(cur)) break; // prevent loops if negative cycle reachable
      seen.add(cur);
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
    metrics: { relaxations },
    hasNegativeCycle,
  };
}

module.exports = { runBellmanFord };
