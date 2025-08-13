const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const nodes = [];
const edges = [];
let highlightedPath = [];

// Modal refs
const dialog = document.getElementById("dialog");
const dialogTitle = document.getElementById("dialogTitle");
const dialogFields = document.getElementById("dialogFields");
const dialogError = document.getElementById("dialogError");
const dialogForm = document.getElementById("dialogForm");
const dialogClose = document.getElementById("dialogClose");
const dialogCancel = document.getElementById("dialogCancel");
let dialogMode = null; // 'node' | 'edge'

function openDialog(mode) {
  dialogMode = mode;
  dialogError.textContent = "";
  dialogFields.innerHTML = "";
  if (mode === "node") {
    dialogTitle.textContent = "Add Node";
    dialogFields.insertAdjacentHTML(
      "beforeend",
      [
        '<label>Node ID<input id="field_node_id" type="text" placeholder="e.g. A" /></label>',
        '<label>X<input id="field_node_x" type="number" min="0" max="800" value="100" /></label>',
        '<label>Y<input id="field_node_y" type="number" min="0" max="500" value="100" /></label>',
      ].join("")
    );
  } else if (mode === "edge") {
    dialogTitle.textContent = "Add Edge";
    const nodeOptions = nodes
      .map((n) => `<option value="${n.id}">${n.id}</option>`)
      .join("");
    dialogFields.insertAdjacentHTML(
      "beforeend",
      [
        `<label>Source<select id="field_edge_source">${nodeOptions}</select></label>`,
        `<label>Target<select id="field_edge_target">${nodeOptions}</select></label>`,
        '<label>Weight<input id="field_edge_weight" type="number" value="1" /></label>',
      ].join("")
    );
  }
  dialog.classList.remove("hidden");
  dialog.setAttribute("aria-hidden", "false");
}

function closeDialog() {
  dialog.classList.add("hidden");
  dialog.setAttribute("aria-hidden", "true");
  dialogMode = null;
}

dialogClose.addEventListener("click", closeDialog);

dialogCancel.addEventListener("click", (e) => {
  e.preventDefault();
  closeDialog();
});

dialogForm.addEventListener("submit", (e) => {
  e.preventDefault();
  dialogError.textContent = "";
  if (dialogMode === "node") {
    const id = document.getElementById("field_node_id").value.trim();
    const x = Number(document.getElementById("field_node_x").value);
    const y = Number(document.getElementById("field_node_y").value);
    if (!id) return (dialogError.textContent = "Node ID is required");
    if (Number.isNaN(x) || Number.isNaN(y))
      return (dialogError.textContent = "X and Y must be numbers");
    if (nodes.some((n) => n.id === id))
      return (dialogError.textContent = "Duplicate node ID");
    nodes.push({ id, x, y });
    closeDialog();
    redraw();
  } else if (dialogMode === "edge") {
    if (nodes.length < 2)
      return (dialogError.textContent = "Create at least two nodes first");
    const source = document.getElementById("field_edge_source").value;
    const target = document.getElementById("field_edge_target").value;
    const weight = Number(document.getElementById("field_edge_weight").value);
    if (!source || !target)
      return (dialogError.textContent = "Select source and target");
    if (Number.isNaN(weight))
      return (dialogError.textContent = "Weight must be a number");
    if (
      !nodes.some((n) => n.id === source) ||
      !nodes.some((n) => n.id === target)
    )
      return (dialogError.textContent = "Unknown node id");
    edges.push({ source, target, weight });
    closeDialog();
    redraw();
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
  });
  dumpState();
}

function dumpState() {
  document.getElementById("nodesOut").textContent = JSON.stringify(
    nodes,
    null,
    2
  );
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

// Wire buttons

document
  .getElementById("addNode")
  .addEventListener("click", () => openDialog("node"));

document
  .getElementById("addEdge")
  .addEventListener("click", () => openDialog("edge"));

document.getElementById("clearGraph").addEventListener("click", () => {
  nodes.length = 0;
  edges.length = 0;
  highlightedPath = [];
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

redraw();
