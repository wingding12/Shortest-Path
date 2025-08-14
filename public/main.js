const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasContainer = document.getElementById("canvasContainer");

const nodes = [];
const edges = [];
let highlightedPath = [];

// Interaction state
let interactionMode = "none"; // 'none' | 'addNode' | 'addEdge'
let pendingEdgeSourceId = null;

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
  const scaleX = canvas.width / parseFloat(canvas.style.width || rect.width);
  const scaleY = canvas.height / parseFloat(canvas.style.height || rect.height);
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

// Samples
function loadSample(sampleIndex) {
  nodes.length = 0;
  edges.length = 0;
  highlightedPath = [];
  pendingEdgeSourceId = null;
  interactionMode = "none";

  if (sampleIndex === 1) {
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
  }

  refreshModeUI();
  redraw();
}

document
  .getElementById("loadSample1")
  .addEventListener("click", () => loadSample(1));
document
  .getElementById("loadSample2")
  .addEventListener("click", () => loadSample(2));
document
  .getElementById("loadSample3")
  .addEventListener("click", () => loadSample(3));

// Buttons (toggle modes)
const addNodeBtn2 = document.getElementById("addNode");
const addEdgeBtn2 = document.getElementById("addEdge");
addNodeBtn2.addEventListener("click", () => {
  if (interactionMode === "addNode") {
    interactionMode = "none";
  } else {
    interactionMode = "addNode";
    pendingEdgeSourceId = null;
  }
  refreshModeUI();
});

addEdgeBtn2.addEventListener("click", () => {
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
    redraw();
  } catch (e) {
    // swallow
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
      redraw();
    } catch (e) {
      // swallow
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

    // Build side-by-side HTML
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
      const neg = data.hasNegativeCycle
        ? '<span class="badge">neg-cycle</span>'
        : "";
      return `
        <div class="compare-card">
          <h3>${title}</h3>
          <div class="badges">
            <span class="badge">dist to target: <strong>${distSummary}</strong></span>
            <span class="badge">relax: ${relax}</span>
            <span class="badge">heapOps: ${heapOps}</span>
            ${neg}
          </div>
          <div><strong>Path</strong>: <code class="inline">${pathText}</code></div>
        </div>
      `;
    }

    const html = `
      ${renderCard("Dijkstra", result.dijkstra)}
      ${renderCard("Bellman-Ford", result.bellmanFord)}
    `;

    // Render to dock (non-blocking)
    compareDockContent.innerHTML = html;
    compareDock.classList.remove("hidden");
    compareDock.setAttribute("aria-hidden", "false");

    // Also highlight the Dijkstra path on the canvas by default
    highlightedPath =
      result.dijkstra && result.dijkstra.path ? result.dijkstra.path : [];
    redraw();
  } catch (e) {
    // swallow
  }
});

refreshModeUI();
redraw();
