// Original Bellman-Ford Algorithm (1956)
// As conceived by Richard Bellman and Lester Ford Jr. in the mid-1950s
// This is the classic, unoptimized version faithful to the original paper
function runBellmanFord({ nodes, edges, sourceId, targetId }) {
  const numNodes = nodes.length;
  const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const adjacencyEdges = [];

  // Build edge list exactly as in original algorithm
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

  // Step 1: Initialize distances (original Bellman-Ford)
  dist[sourceIndex] = 0;

  let relaxations = 0;
  let iterations = 0;

  // Step 2: Relax all edges |V|-1 times (original algorithm - no early termination)
  // This is the classic approach: always run exactly |V|-1 iterations
  for (let i = 0; i < numNodes - 1; i++) {
    iterations++;
    // Process ALL edges in each iteration (original behavior)
    for (const { u, v, w } of adjacencyEdges) {
      // Classic relaxation condition
      if (dist[u] !== INF && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        parent[v] = u;
        relaxations++;
      }
    }
  }

  // Step 3: Check for negative-weight cycles (original detection method)
  let hasNegativeCycle = false;
  for (const { u, v, w } of adjacencyEdges) {
    if (dist[u] !== INF && dist[u] + w < dist[v]) {
      hasNegativeCycle = true;
      break;
    }
  }

  // Path reconstruction with cycle protection
  function buildPath(targetIndex) {
    if (targetIndex === undefined || targetIndex === null) return [];
    if (hasNegativeCycle) return []; // No valid paths if negative cycle exists

    const path = [];
    let cur = targetIndex;
    const visited = new Set();

    while (cur !== null && cur !== undefined) {
      if (visited.has(cur)) return []; // Cycle detected
      visited.add(cur);
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
    metrics: { relaxations, iterations },
    hasNegativeCycle,
    algorithm: "Bellman-Ford (1956)",
  };
}

module.exports = { runBellmanFord };
