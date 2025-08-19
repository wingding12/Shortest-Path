const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasContainer = document.getElementById("canvasContainer");

const nodes = [];
const edges = [];
let highlightedPath = [];

// Interaction state
let interactionMode = "none"; // 'none' | 'addNode' | 'addEdge'
let pendingEdgeSourceId = null;
let selectedAlgo = null; // 'dijkstra' | 'bellman' | 'tsinghua'

// Sync canvas intrinsic size to container CSS size
function resizeCanvasToContainer() {
  const rect = canvasContainer.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(1, Math.floor(rect.width));
  const cssHeight = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvasToContainer();
const ro = new ResizeObserver(() => {
  resizeCanvasToContainer();
  redraw();
});
ro.observe(canvasContainer);
window.addEventListener("resize", () => {
  resizeCanvasToContainer();
  redraw();
});

// Modal refs (edge weight or node edit)
const dialog = document.getElementById("dialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogFields = document.getElementById("dialogFields");
const dialogError = document.getElementById("dialogError");
const dialogForm = document.getElementById("dialogForm");
const dialogClose = document.getElementById("dialogClose");
const dialogCancel = document.getElementById("dialogCancel");
let dialogMode = null; // 'edgeWeight' | 'editNode'
let dialogEdgeContext = null; // { sourceId, targetId }
let dialogNodeIndex = null; // index of node being edited

// Compare dock
const compareDock = document.getElementById("compareDock");
const compareDockContent = document.getElementById("compareDockContent");
const compareDockClose = document.getElementById("compareDockClose");
compareDockClose.addEventListener("click", () => {
  compareDock.classList.add("hidden");
  compareDock.setAttribute("aria-hidden", "true");
});

// (Legacy) Compare modal refs (not used for display)
const compareModal = document.getElementById("compareModal");
const compareContent = document.getElementById("compareContent");
const compareClose = document.getElementById("compareClose");
const compareDismiss = document.getElementById("compareDismiss");
function openCompareModal(contentHTML) {
  // Keep in sync content but do not show overlay
  compareContent.innerHTML = contentHTML;
}
function closeCompareModal() {}
compareClose.addEventListener("click", closeCompareModal);
compareDismiss.addEventListener("click", closeCompareModal);

// Buttons
const addNodeBtn = document.getElementById("addNode");
const addEdgeBtn = document.getElementById("addEdge");
const runDijkstraBtn = document.getElementById("runDijkstra");
const runBellmanBtn = document.getElementById("runBellmanFord");
const runTsinghuaBtn = document.getElementById("runTsinghua");

function refreshModeUI() {
  addNodeBtn.classList.toggle("mode-active", interactionMode === "addNode");
  addEdgeBtn.classList.toggle("mode-active", interactionMode === "addEdge");
  runDijkstraBtn.classList.toggle("algo-active", selectedAlgo === "dijkstra");
  runBellmanBtn.classList.toggle("algo-active", selectedAlgo === "bellman");
  runTsinghuaBtn.classList.toggle("algo-active", selectedAlgo === "tsinghua");
}

function removeDialogDeleteButtonIfAny() {
  const existing = document.getElementById("dialogDelete");
  if (existing) existing.remove();
}

function openEdgeWeightDialog({ sourceId, targetId }) {
  dialogMode = "edgeWeight";
  dialogEdgeContext = { sourceId, targetId };
  dialogNodeIndex = null;
  dialogError.textContent = "";
  dialogFields.innerHTML = "";
  dialogTitle.textContent = "Set Edge Weight";
  removeDialogDeleteButtonIfAny();
  dialogFields.insertAdjacentHTML(
    "beforeend",
    [
      `<div>Source: <strong>${sourceId}</strong></div>`,
      `<div>Target: <strong>${targetId}</strong></div>`,
      '<label>Weight<input id="field_edge_weight" type="number" value="1" /></label>',
    ].join("")
  );
  dialog.classList.remove("hidden");
  dialog.setAttribute("aria-hidden", "false");
}

function openEditNodeDialog(nodeIndex) {
  dialogMode = "editNode";
  dialogNodeIndex = nodeIndex;
  dialogEdgeContext = null;
  dialogError.textContent = "";
  dialogFields.innerHTML = "";
  const n = nodes[nodeIndex];
  dialogTitle.textContent = `Edit Node (${n.id})`;
  dialogFields.insertAdjacentHTML(
    "beforeend",
    [
      `<label>Node ID<input id="field_node_id" type="text" value="${n.id}" /></label>`,
      `<label>X<input id="field_node_x" type="number" value="${n.x}" /></label>`,
      `<label>Y<input id="field_node_y" type="number" value="${n.y}" /></label>`,
    ].join("")
  );
  // Ensure a Delete button exists in actions for edit mode
  const actions = dialog.querySelector(".modal-actions");
  let delBtn = document.getElementById("dialogDelete");
  if (!delBtn) {
    delBtn = document.createElement("button");
    delBtn.id = "dialogDelete";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    // Insert before Cancel for visibility
    actions.insertBefore(delBtn, actions.firstChild);
  }
  delBtn.onclick = () => {
    if (dialogNodeIndex === null || dialogNodeIndex === undefined) return;
    const nodeIdToRemove = nodes[dialogNodeIndex].id;
    // Remove node
    nodes.splice(dialogNodeIndex, 1);
    // Remove connected edges
    for (let i = edges.length - 1; i >= 0; i--) {
      if (
        edges[i].source === nodeIdToRemove ||
        edges[i].target === nodeIdToRemove
      ) {
        edges.splice(i, 1);
      }
    }
    // Clear inputs if they referred to this node
    const sourceInput = document.getElementById("sourceId");
    const targetInput = document.getElementById("targetId");
    if (sourceInput.value === nodeIdToRemove) sourceInput.value = "";
    if (targetInput.value === nodeIdToRemove) targetInput.value = "";
    // Reset pending edge source if applicable
    if (pendingEdgeSourceId === nodeIdToRemove) pendingEdgeSourceId = null;
    // Clear any highlighted path that may reference the node
    highlightedPath = [];
    closeDialog();
    redraw();
  };

  dialog.classList.remove("hidden");
  dialog.setAttribute("aria-hidden", "false");
}

function closeDialog() {
  dialog.classList.add("hidden");
  dialog.setAttribute("aria-hidden", "true");
  dialogMode = null;
  dialogEdgeContext = null;
  dialogNodeIndex = null;
}

dialogClose.addEventListener("click", closeDialog);

dialogCancel.addEventListener("click", (e) => {
  e.preventDefault();
  closeDialog();
});

dialogForm.addEventListener("submit", (e) => {
  e.preventDefault();
  dialogError.textContent = "";
  if (dialogMode === "edgeWeight" && dialogEdgeContext) {
    const weight = Number(document.getElementById("field_edge_weight").value);
    if (Number.isNaN(weight)) {
      dialogError.textContent = "Weight must be a number";
      return;
    }
    const { sourceId, targetId } = dialogEdgeContext;
    edges.push({ source: sourceId, target: targetId, weight });
    closeDialog();
    // Keep addEdge mode for chaining; reset pending source
    pendingEdgeSourceId = null;
    redraw();
  } else if (dialogMode === "editNode" && dialogNodeIndex !== null) {
    const oldId = nodes[dialogNodeIndex].id;
    const newId = document.getElementById("field_node_id").value.trim();
    const newX = Number(document.getElementById("field_node_x").value);
    const newY = Number(document.getElementById("field_node_y").value);
    if (!newId) {
      dialogError.textContent = "Node ID is required";
      return;
    }
    if (Number.isNaN(newX) || Number.isNaN(newY)) {
      dialogError.textContent = "X and Y must be numbers";
      return;
    }
    if (
      newId !== oldId &&
      nodes.some((n, i) => i !== dialogNodeIndex && n.id === newId)
    ) {
      dialogError.textContent = "Duplicate node ID";
      return;
    }
    // Apply updates
    nodes[dialogNodeIndex].id = newId;
    nodes[dialogNodeIndex].x = newX;
    nodes[dialogNodeIndex].y = newY;
    // Update edges if ID changed
    if (newId !== oldId) {
      for (const e of edges) {
        if (e.source === oldId) e.source = newId;
        if (e.target === oldId) e.target = newId;
      }
      // Update source/target inputs if matching
      const sourceInput = document.getElementById("sourceId");
      const targetInput = document.getElementById("targetId");
      if (sourceInput.value === oldId) sourceInput.value = newId;
      if (targetInput.value === oldId) targetInput.value = newId;
      // If edge selection pending
      if (pendingEdgeSourceId === oldId) pendingEdgeSourceId = newId;
      // Clear highlighted path to avoid stale IDs
      highlightedPath = [];
    }
    closeDialog();
    redraw();
  }
});

function generateNextNodeId() {
  // Generate IDs N1, N2, ... avoiding collisions
  let i = nodes.length + 1;
  while (true) {
    const candidate = `N${i}`;
    if (!nodes.some((n) => n.id === candidate)) return candidate;
    i++;
  }
}

function canvasToCoords(evt) {
  const rect = canvas.getBoundingClientRect();
  // Use CSS pixel coordinates directly so click mapping is exact
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top,
  };
}

function findNodeAt(x, y) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = x - n.x;
    const dy = y - n.y;
    if (Math.hypot(dx, dy) <= 18) return n;
  }
  return null;
}

canvas.addEventListener("click", (evt) => {
  const { x, y } = canvasToCoords(evt);
  const hit = findNodeAt(x, y);

  // Edge creation mode takes precedence
  if (interactionMode === "addEdge") {
    if (!hit) return;
    if (!pendingEdgeSourceId) {
      pendingEdgeSourceId = hit.id;
      redraw();
    } else if (pendingEdgeSourceId && hit.id !== pendingEdgeSourceId) {
      openEdgeWeightDialog({ sourceId: pendingEdgeSourceId, targetId: hit.id });
    }
    return;
  }

  // If clicked on an existing node, open editor regardless of addNode/none
  if (hit) {
    const idx = nodes.indexOf(hit);
    if (idx !== -1) openEditNodeDialog(idx);
    return;
  }

  // Otherwise, if in addNode mode and clicked empty space, add a node
  if (interactionMode === "addNode") {
    const id = generateNextNodeId();
    nodes.push({ id, x, y });
    redraw();
    return;
  }
});

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw edges
  edges.forEach((e) => {
    const u = nodes.find((n) => n.id === e.source);
    const v = nodes.find((n) => n.id === e.target);
    if (!u || !v) return;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    ctx.stroke();
    // weight label
    const mx = (u.x + v.x) / 2;
    const my = (u.y + v.y) / 2;
    ctx.fillStyle = "#111827";
    ctx.fillText(String(e.weight), mx + 4, my - 4);
  });
  // Highlight shortest path
  if (highlightedPath.length > 1) {
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 4;
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const a = nodes.find((n) => n.id === highlightedPath[i]);
      const b = nodes.find((n) => n.id === highlightedPath[i + 1]);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  // Draw nodes
  nodes.forEach((n) => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#3b82f6";
    ctx.fill();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px system-ui";
    ctx.fillText(n.id, n.x, n.y);
    // Edge mode: highlight selected source node
    if (interactionMode === "addEdge" && pendingEdgeSourceId === n.id) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
  dumpState();
}

function dumpState() {
  // Nodes: show as a simple list of IDs
  const nodesOut = document.getElementById("nodesOut");
  nodesOut.innerHTML = nodes
    .map((n) => `<li data-node-id="${n.id}">${n.id}</li>`)
    .join("");
  // Edges: concise list: source -[w]-> target
  const edgesOut = document.getElementById("edgesOut");
  edgesOut.innerHTML = edges
    .map((e) => `<li>${e.source} -[${e.weight}]-> ${e.target}</li>`)
    .join("");
}

function getPayload() {
  const sourceId = document.getElementById("sourceId").value || undefined;
  const targetId = document.getElementById("targetId").value || undefined;
  return { nodes: nodes.map((n) => ({ id: n.id })), edges, sourceId, targetId };
}

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

// Display algorithm result in the results panel
function displayAlgorithmResult(algorithmName, result) {
  const resultsDisplay = document.getElementById("algorithmResults");

  const pathText =
    Array.isArray(result.path) && result.path.length
      ? result.path.join(" → ")
      : "No path found";

  const targetId = document.getElementById("targetId").value;
  const distanceText = (() => {
    if (!targetId) return "—";
    const targetIndex = nodes.findIndex((n) => n.id === targetId);
    if (
      targetIndex >= 0 &&
      result.dist &&
      Number.isFinite(result.dist[targetIndex])
    ) {
      return result.dist[targetIndex];
    }
    return "unreachable";
  })();

  let metricsHTML = "";
  if (result.metrics) {
    const metrics = [];
    if (result.metrics.relaxations !== undefined) {
      metrics.push(
        `<span class="metric-badge">Relaxations: ${result.metrics.relaxations}</span>`
      );
    }
    if (result.metrics.heapOps !== undefined) {
      metrics.push(
        `<span class="metric-badge">Heap Ops: ${result.metrics.heapOps}</span>`
      );
    }
    if (result.metrics.iterations !== undefined) {
      metrics.push(
        `<span class="metric-badge">Iterations: ${result.metrics.iterations}</span>`
      );
    }
    if (result.metrics.pivotSelections !== undefined) {
      metrics.push(
        `<span class="metric-badge">Pivots: ${result.metrics.pivotSelections}</span>`
      );
    }
    if (result.metrics.recursivePartitions !== undefined) {
      metrics.push(
        `<span class="metric-badge">Partitions: ${result.metrics.recursivePartitions}</span>`
      );
    }
    if (result.metrics.theoreticalComplexity) {
      metrics.push(
        `<span class="metric-badge complexity-badge">${result.metrics.theoreticalComplexity}</span>`
      );
    }
    metricsHTML = `<div class="result-metrics">${metrics.join("")}</div>`;
  }

  const negCycleText = result.hasNegativeCycle
    ? '<div style="color: #dc2626; font-weight: bold;">⚠️ Negative cycle detected!</div>'
    : "";

  resultsDisplay.innerHTML = `
    <div class="result-item">
      <div class="result-title">${algorithmName}</div>
      <div><strong>Distance to target:</strong> ${distanceText}</div>
      <div><strong>Path:</strong> <span class="result-path">${pathText}</span></div>
      ${metricsHTML}
      ${negCycleText}
    </div>
  `;
}

// Display algorithm error
function displayAlgorithmError(algorithmName, errorMessage) {
  const resultsDisplay = document.getElementById("algorithmResults");
  resultsDisplay.innerHTML = `
    <div class="result-item">
      <div class="result-title" style="color: #dc2626;">${algorithmName} - Error</div>
      <div style="color: #dc2626;">${errorMessage}</div>
    </div>
  `;
}

// Wire list click: show data and open edit
const nodesListEl = document.getElementById("nodesOut");
nodesListEl.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-node-id]");
  if (!li) return;
  const nodeId = li.getAttribute("data-node-id");
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx === -1) return;
  openEditNodeDialog(idx);
});

// Samples - Enhanced with algorithm-specific examples
function loadSample(sampleIndex) {
  nodes.length = 0;
  edges.length = 0;
  highlightedPath = [];
  pendingEdgeSourceId = null;
  interactionMode = "none";

  if (sampleIndex === 1) {
    // Basic Graph - Good for all algorithms
    nodes.push(
      { id: "A", x: 120, y: 120 },
      { id: "B", x: 320, y: 100 },
      { id: "C", x: 540, y: 140 },
      { id: "D", x: 220, y: 300 },
      { id: "E", x: 460, y: 300 }
    );
    edges.push(
      { source: "A", target: "B", weight: 2 },
      { source: "A", target: "D", weight: 5 },
      { source: "B", target: "C", weight: 4 },
      { source: "D", target: "E", weight: 1 },
      { source: "B", target: "E", weight: 7 },
      { source: "E", target: "C", weight: 1 }
    );
    document.getElementById("sourceId").value = "A";
    document.getElementById("targetId").value = "C";
  } else if (sampleIndex === 2) {
    // Multiple Paths - Shows different exploration strategies
    nodes.push(
      { id: "S", x: 100, y: 250 },
      { id: "T", x: 700, y: 250 },
      { id: "U", x: 250, y: 100 },
      { id: "V", x: 400, y: 250 },
      { id: "W", x: 550, y: 100 }
    );
    edges.push(
      { source: "S", target: "U", weight: 1 },
      { source: "U", target: "V", weight: 1 },
      { source: "V", target: "W", weight: 1 },
      { source: "W", target: "T", weight: 1 },
      { source: "S", target: "V", weight: 4 },
      { source: "U", target: "W", weight: 3 },
      { source: "V", target: "T", weight: 2 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  } else if (sampleIndex === 3) {
    // Negative Weights - Only Bellman-Ford can handle
    nodes.push(
      { id: "1", x: 120, y: 120 },
      { id: "2", x: 240, y: 240 },
      { id: "3", x: 360, y: 120 },
      { id: "4", x: 480, y: 240 },
      { id: "5", x: 600, y: 120 }
    );
    edges.push(
      { source: "1", target: "2", weight: 2 },
      { source: "2", target: "3", weight: -1 },
      { source: "3", target: "4", weight: 2 },
      { source: "4", target: "5", weight: 2 },
      { source: "1", target: "3", weight: 4 },
      { source: "2", target: "4", weight: 1 }
    );
    document.getElementById("sourceId").value = "1";
    document.getElementById("targetId").value = "5";
  } else if (sampleIndex === 4) {
    // Dijkstra's Best Case - Dense graph with non-negative weights
    nodes.push(
      { id: "S", x: 100, y: 200 },
      { id: "A", x: 200, y: 100 },
      { id: "B", x: 200, y: 300 },
      { id: "C", x: 300, y: 150 },
      { id: "D", x: 300, y: 250 },
      { id: "E", x: 400, y: 100 },
      { id: "F", x: 400, y: 300 },
      { id: "T", x: 500, y: 200 }
    );
    edges.push(
      { source: "S", target: "A", weight: 1 },
      { source: "S", target: "B", weight: 4 },
      { source: "A", target: "C", weight: 2 },
      { source: "A", target: "E", weight: 5 },
      { source: "B", target: "D", weight: 1 },
      { source: "B", target: "F", weight: 3 },
      { source: "C", target: "E", weight: 1 },
      { source: "C", target: "D", weight: 3 },
      { source: "D", target: "F", weight: 2 },
      { source: "D", target: "T", weight: 4 },
      { source: "E", target: "T", weight: 2 },
      { source: "F", target: "T", weight: 1 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  } else if (sampleIndex === 5) {
    // Bellman-Ford's Strength - Graph with negative weights but no cycles
    nodes.push(
      { id: "S", x: 100, y: 200 },
      { id: "A", x: 250, y: 100 },
      { id: "B", x: 250, y: 300 },
      { id: "C", x: 400, y: 150 },
      { id: "D", x: 400, y: 250 },
      { id: "T", x: 550, y: 200 }
    );
    edges.push(
      { source: "S", target: "A", weight: 10 },
      { source: "S", target: "B", weight: 5 },
      { source: "A", target: "C", weight: 1 },
      { source: "B", target: "A", weight: -7 }, // Negative weight!
      { source: "B", target: "D", weight: 2 },
      { source: "C", target: "T", weight: 4 },
      { source: "D", target: "C", weight: -2 }, // Negative weight!
      { source: "D", target: "T", weight: 6 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  } else if (sampleIndex === 6) {
    // Tsinghua's Advantage - Sparse graph with many nodes (simulated sparsity)
    nodes.push(
      { id: "S", x: 50, y: 250 },
      { id: "L1", x: 150, y: 100 },
      { id: "L2", x: 150, y: 200 },
      { id: "L3", x: 150, y: 300 },
      { id: "L4", x: 150, y: 400 },
      { id: "M1", x: 300, y: 150 },
      { id: "M2", x: 300, y: 250 },
      { id: "M3", x: 300, y: 350 },
      { id: "R1", x: 450, y: 200 },
      { id: "R2", x: 450, y: 300 },
      { id: "T", x: 600, y: 250 }
    );
    edges.push(
      // Sparse connectivity - few edges relative to nodes
      { source: "S", target: "L2", weight: 1 },
      { source: "L1", target: "M1", weight: 2 },
      { source: "L2", target: "M2", weight: 1 },
      { source: "L3", target: "M3", weight: 2 },
      { source: "M1", target: "R1", weight: 3 },
      { source: "M2", target: "R1", weight: 2 },
      { source: "M2", target: "R2", weight: 4 },
      { source: "M3", target: "R2", weight: 1 },
      { source: "R1", target: "T", weight: 2 },
      { source: "R2", target: "T", weight: 3 },
      // Few strategic connections
      { source: "S", target: "L1", weight: 8 },
      { source: "L4", target: "M3", weight: 1 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  } else if (sampleIndex === 7) {
    // Dense vs Sparse comparison - Medium density
    nodes.push(
      { id: "S", x: 100, y: 250 },
      { id: "A", x: 200, y: 150 },
      { id: "B", x: 200, y: 250 },
      { id: "C", x: 200, y: 350 },
      { id: "D", x: 350, y: 150 },
      { id: "E", x: 350, y: 250 },
      { id: "F", x: 350, y: 350 },
      { id: "T", x: 500, y: 250 }
    );
    edges.push(
      // More edges showing density impact
      { source: "S", target: "A", weight: 2 },
      { source: "S", target: "B", weight: 1 },
      { source: "S", target: "C", weight: 3 },
      { source: "A", target: "B", weight: 1 },
      { source: "A", target: "D", weight: 4 },
      { source: "B", target: "A", weight: 2 },
      { source: "B", target: "C", weight: 1 },
      { source: "B", target: "E", weight: 3 },
      { source: "C", target: "B", weight: 2 },
      { source: "C", target: "F", weight: 1 },
      { source: "D", target: "E", weight: 1 },
      { source: "D", target: "T", weight: 5 },
      { source: "E", target: "D", weight: 2 },
      { source: "E", target: "F", weight: 1 },
      { source: "E", target: "T", weight: 2 },
      { source: "F", target: "E", weight: 3 },
      { source: "F", target: "T", weight: 4 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  } else if (sampleIndex === 8) {
    // Negative Cycle - Only Bellman-Ford can detect
    nodes.push(
      { id: "S", x: 100, y: 200 },
      { id: "A", x: 250, y: 150 },
      { id: "B", x: 350, y: 100 },
      { id: "C", x: 350, y: 200 },
      { id: "D", x: 250, y: 250 },
      { id: "T", x: 500, y: 200 }
    );
    edges.push(
      { source: "S", target: "A", weight: 1 },
      { source: "A", target: "B", weight: 1 },
      { source: "B", target: "C", weight: -3 }, // Part of negative cycle
      { source: "C", target: "D", weight: 1 }, // Part of negative cycle
      { source: "D", target: "A", weight: 1 }, // Completes negative cycle: A->B->C->D->A = 0
      { source: "C", target: "T", weight: 2 },
      { source: "A", target: "T", weight: 5 }
    );
    document.getElementById("sourceId").value = "S";
    document.getElementById("targetId").value = "T";
  }

  // Clear results display when loading a new sample
  const resultsDisplay = document.getElementById("algorithmResults");
  resultsDisplay.innerHTML =
    '<p class="help-text">Run an algorithm to see path and metrics here</p>';

  refreshModeUI();
  redraw();
}

// Basic Samples
document
  .getElementById("loadSample1")
  .addEventListener("click", () => loadSample(1));
document
  .getElementById("loadSample2")
  .addEventListener("click", () => loadSample(2));
document
  .getElementById("loadSample3")
  .addEventListener("click", () => loadSample(3));

// Algorithm Showcase Samples
document
  .getElementById("loadSample4")
  .addEventListener("click", () => loadSample(4));
document
  .getElementById("loadSample5")
  .addEventListener("click", () => loadSample(5));
document
  .getElementById("loadSample6")
  .addEventListener("click", () => loadSample(6));
document
  .getElementById("loadSample7")
  .addEventListener("click", () => loadSample(7));
document
  .getElementById("loadSample8")
  .addEventListener("click", () => loadSample(8));

// Buttons (toggle modes)
addNodeBtn.addEventListener("click", () => {
  if (interactionMode === "addNode") {
    interactionMode = "none";
  } else {
    interactionMode = "addNode";
    pendingEdgeSourceId = null;
  }
  refreshModeUI();
});

addEdgeBtn.addEventListener("click", () => {
  if (interactionMode === "addEdge") {
    interactionMode = "none";
    pendingEdgeSourceId = null;
  } else {
    interactionMode = "addEdge";
    pendingEdgeSourceId = null;
  }
  refreshModeUI();
  redraw();
});

runDijkstraBtn.addEventListener("click", async () => {
  try {
    selectedAlgo = "dijkstra";
    refreshModeUI();
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/dijkstra", payload);
    highlightedPath = result.path || [];
    displayAlgorithmResult("Dijkstra (1959)", result);
    redraw();
  } catch (error) {
    console.error("Dijkstra error:", error);
    displayAlgorithmError("Dijkstra", error.message);
  }
});

runBellmanBtn.addEventListener("click", async () => {
  try {
    selectedAlgo = "bellman";
    refreshModeUI();
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/bellman-ford", payload);
    highlightedPath = result.path || [];
    displayAlgorithmResult("Bellman-Ford (1956)", result);
    redraw();
  } catch (error) {
    console.error("Bellman-Ford error:", error);
    displayAlgorithmError("Bellman-Ford", error.message);
  }
});

runTsinghuaBtn.addEventListener("click", async () => {
  try {
    selectedAlgo = "tsinghua";
    refreshModeUI();
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/tsinghua", payload);
    highlightedPath = result.path || [];
    displayAlgorithmResult("Tsinghua (2025)", result);
    redraw();
  } catch (error) {
    console.error("Tsinghua error:", error);
    displayAlgorithmError("Tsinghua", error.message);
  }
});

document.getElementById("clearGraph").addEventListener("click", () => {
  nodes.length = 0;
  edges.length = 0;
  highlightedPath = [];
  pendingEdgeSourceId = null;
  interactionMode = "none";
  selectedAlgo = null;

  // Clear results display
  const resultsDisplay = document.getElementById("algorithmResults");
  resultsDisplay.innerHTML =
    '<p class="help-text">Run an algorithm to see path and metrics here</p>';

  refreshModeUI();
  redraw();
});

document.getElementById("runCompare").addEventListener("click", async () => {
  try {
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/compare", payload);

    // Build side-by-side HTML for all three algorithms
    function renderCard(title, data) {
      const distSummary = (() => {
        const idx = payload.targetId
          ? nodes.findIndex((n) => n.id === payload.targetId)
          : -1;
        if (
          idx >= 0 &&
          data.dist &&
          data.dist[idx] !== undefined &&
          Number.isFinite(data.dist[idx])
        ) {
          return `${data.dist[idx]}`;
        }
        return payload.targetId ? "unreachable" : "—";
      })();
      const pathText =
        Array.isArray(data.path) && data.path.length
          ? data.path.join(" → ")
          : "—";
      const relax =
        data.metrics && data.metrics.relaxations !== undefined
          ? data.metrics.relaxations
          : "—";
      const heapOps =
        data.metrics && data.metrics.heapOps !== undefined
          ? data.metrics.heapOps
          : "—";
      const pivots =
        data.metrics && data.metrics.pivotSelections !== undefined
          ? data.metrics.pivotSelections
          : "—";
      const partitions =
        data.metrics && data.metrics.recursivePartitions !== undefined
          ? data.metrics.recursivePartitions
          : "—";
      const complexity =
        data.metrics && data.metrics.theoreticalComplexity
          ? data.metrics.theoreticalComplexity
          : "";
      const neg = data.hasNegativeCycle
        ? '<span class="badge">neg-cycle</span>'
        : "";
      const algorithmBadge = data.algorithm
        ? `<span class="badge algorithm-badge">${data.algorithm}</span>`
        : "";

      // Different metrics for different algorithms
      let algorithmSpecificMetrics = "";
      if (title.includes("Dijkstra")) {
        algorithmSpecificMetrics = `
          <span class="badge">relax: ${relax}</span>
          <span class="badge">heapOps: ${heapOps}</span>
        `;
      } else if (title.includes("Bellman-Ford")) {
        algorithmSpecificMetrics = `
          <span class="badge">relax: ${relax}</span>
          <span class="badge">iterations: ${
            data.metrics?.iterations || "—"
          }</span>
        `;
      } else if (title.includes("Tsinghua")) {
        algorithmSpecificMetrics = `
          <span class="badge">relax: ${relax}</span>
          <span class="badge">pivots: ${pivots}</span>
          <span class="badge">partitions: ${partitions}</span>
        `;
      }

      return `
        <div class="compare-card">
          <h3>${title}</h3>
          <div class="badges">
            ${algorithmBadge}
            <span class="badge">dist to target: <strong>${distSummary}</strong></span>
            ${algorithmSpecificMetrics}
            ${
              complexity
                ? `<span class="badge complexity-badge">${complexity}</span>`
                : ""
            }
            ${neg}
          </div>
          <div><strong>Path</strong>: <code class="inline">${pathText}</code></div>
        </div>
      `;
    }

    const html = `
      ${renderCard("Dijkstra (1959)", result.dijkstra)}
      ${renderCard("Bellman-Ford (1956)", result.bellmanFord)}
      ${renderCard("Tsinghua (2025)", result.tsinghua)}
    `;

    // Render to dock (non-blocking)
    compareDockContent.innerHTML = html;
    compareDock.classList.remove("hidden");
    compareDock.setAttribute("aria-hidden", "false");

    // Also highlight the Dijkstra path on the canvas by default
    highlightedPath =
      result.dijkstra && result.dijkstra.path ? result.dijkstra.path : [];
    redraw();
  } catch (_) {}
});

refreshModeUI();
redraw();
