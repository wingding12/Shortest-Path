const express = require("express");
const cors = require("cors");
const path = require("path");

const { runDijkstra } = require("./algorithms/dijkstra");
const { runBellmanFord } = require("./algorithms/bellmanFord");
const { runTsinghua } = require("./algorithms/tsinghua");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/shortest-path/dijkstra", (req, res) => {
  try {
    const { nodes, edges, sourceId, targetId } = req.body;
    if (!nodes || !edges || sourceId === undefined) {
      return res
        .status(400)
        .json({ error: "nodes, edges, and sourceId are required" });
    }
    const result = runDijkstra({ nodes, edges, sourceId, targetId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/shortest-path/bellman-ford", (req, res) => {
  try {
    const { nodes, edges, sourceId, targetId } = req.body;
    if (!nodes || !edges || sourceId === undefined) {
      return res
        .status(400)
        .json({ error: "nodes, edges, and sourceId are required" });
    }
    const result = runBellmanFord({ nodes, edges, sourceId, targetId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/shortest-path/tsinghua", (req, res) => {
  try {
    const { nodes, edges, sourceId, targetId } = req.body;
    if (!nodes || !edges || sourceId === undefined) {
      return res
        .status(400)
        .json({ error: "nodes, edges, and sourceId are required" });
    }
    const result = runTsinghua({ nodes, edges, sourceId, targetId });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/shortest-path/compare", (req, res) => {
  try {
    const { nodes, edges, sourceId, targetId } = req.body;
    if (!nodes || !edges || sourceId === undefined) {
      return res
        .status(400)
        .json({ error: "nodes, edges, and sourceId are required" });
    }
    const dijkstra = runDijkstra({ nodes, edges, sourceId, targetId });
    const bellmanFord = runBellmanFord({ nodes, edges, sourceId, targetId });
    const tsinghua = runTsinghua({ nodes, edges, sourceId, targetId });
    res.json({ dijkstra, bellmanFord, tsinghua });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
