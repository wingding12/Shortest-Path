const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const nodes = [];
const edges = [];
let highlightedPath = [];

// Interaction state
let interactionMode = "none"; // 'none' | 'addNode' | 'addEdge'
let pendingEdgeSourceId = null;

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

// Buttons
const addNodeBtn = document.getElementById("addNode");
const addEdgeBtn = document.getElementById("addEdge");

function refreshModeUI() {
  addNodeBtn.classList.toggle("mode-active", interactionMode === "addNode");
  addEdgeBtn.classList.toggle("mode-active", interactionMode === "addEdge");
}

function openEdgeWeightDialog({ sourceId, targetId }) {
  dialogMode = "edgeWeight";
  dialogEdgeContext = { sourceId, targetId };
  dialogNodeIndex = null;
  dialogError.textContent = "";
  dialogFields.innerHTML = "";
  dialogTitle.textContent = "Set Edge Weight";
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
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
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
  nodesOut.innerHTML = nodes.map((n) => `<li>${n.id}</li>`).join("");
  // Edges: keep JSON for now
  document.getElementById("edgesOut").textContent = JSON.stringify(
    edges,
    null,
    2
  );
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

function showResults(obj) {
  document.getElementById("results").textContent = JSON.stringify(obj, null, 2);
}

// Wire buttons (toggle modes)
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

document.getElementById("clearGraph").addEventListener("click", () => {
  nodes.length = 0;
  edges.length = 0;
  highlightedPath = [];
  pendingEdgeSourceId = null;
  interactionMode = "none";
  refreshModeUI();
  redraw();
});

document.getElementById("runDijkstra").addEventListener("click", async () => {
  try {
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/dijkstra", payload);
    highlightedPath = result.path || [];
    showResults({ algorithm: "Dijkstra", result });
    redraw();
  } catch (e) {
    showResults({ error: String(e) });
  }
});

document
  .getElementById("runBellmanFord")
  .addEventListener("click", async () => {
    try {
      const payload = getPayload();
      if (!payload.sourceId) {
        alert("Set Source ID");
        return;
      }
      const result = await postJSON("/api/shortest-path/bellman-ford", payload);
      highlightedPath = result.path || [];
      showResults({ algorithm: "Bellman-Ford", result });
      redraw();
    } catch (e) {
      showResults({ error: String(e) });
    }
  });

document.getElementById("runCompare").addEventListener("click", async () => {
  try {
    const payload = getPayload();
    if (!payload.sourceId) {
      alert("Set Source ID");
      return;
    }
    const result = await postJSON("/api/shortest-path/compare", payload);
    // Prefer Dijkstra path if present, else Bellman-Ford
    highlightedPath =
      result.dijkstra && result.dijkstra.path
        ? result.dijkstra.path
        : result.bellmanFord
        ? result.bellmanFord.path
        : [];
    showResults({ algorithm: "Compare", result });
    redraw();
  } catch (e) {
    showResults({ error: String(e) });
  }
});

refreshModeUI();
redraw();
