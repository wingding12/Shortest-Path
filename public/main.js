const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const nodes = [];
const edges = [];

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

function promptNode() {
  const id = prompt("Node id (string):");
  if (!id) return;
  const x = Number(prompt("x (0-800):", "100"));
  const y = Number(prompt("y (0-500):", "100"));
  if (Number.isNaN(x) || Number.isNaN(y)) return;
  if (nodes.some((n) => n.id === id)) {
    alert("Duplicate id");
    return;
  }
  nodes.push({ id, x, y });
  redraw();
}

function promptEdge() {
  if (nodes.length < 2) {
    alert("Need at least 2 nodes");
    return;
  }
  const source = prompt("Edge source id:");
  const target = prompt("Edge target id:");
  const weight = Number(
    prompt("Weight (number, allow negative for Bellman-Ford):", "1")
  );
  if (!source || !target || Number.isNaN(weight)) return;
  if (
    !nodes.some((n) => n.id === source) ||
    !nodes.some((n) => n.id === target)
  ) {
    alert("Unknown node id");
    return;
  }
  edges.push({ source, target, weight });
  redraw();
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

document.getElementById("addNode").addEventListener("click", promptNode);

document.getElementById("addEdge").addEventListener("click", promptEdge);

document.getElementById("clearGraph").addEventListener("click", () => {
  nodes.length = 0;
  edges.length = 0;
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
    showResults({ algorithm: "Dijkstra", result });
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
      showResults({ algorithm: "Bellman-Ford", result });
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
    showResults({ algorithm: "Compare", result });
  } catch (e) {
    showResults({ error: String(e) });
  }
});

redraw();
