# Shortest Path Comparator

An interactive web application for visualizing and comparing shortest path algorithms (Dijkstra vs Bellman-Ford) with real-time graph manipulation and performance analysis.

This project aims to provide an educational and interactive platform for understanding how different shortest path algorithms work. By offering side-by-side comparisons of Dijkstra's algorithm and the Bellman-Ford algorithm, users can:

- **Visualize Algorithm Behavior**: See how each algorithm explores the graph differently
- **Compare Performance**: Analyze metrics like relaxations and heap operations
- **Understand Trade-offs**: Learn when to use each algorithm (Dijkstra for non-negative weights, Bellman-Ford for graphs with negative edges)
- **Interactive Learning**: Create custom graphs to test edge cases and algorithm limitations

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Shortest-Path
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

## Interface Overview

### Main Components

1. **Control Panel** (Top)

   - **Source/Target Selection**: Input fields to specify start and end nodes
   - **Graph Editing Tools**: Buttons to add nodes, add edges, and clear the graph
   - **Algorithm Runners**: Individual buttons for Dijkstra and Bellman-Ford, plus a comparison tool

2. **Interactive Canvas** (Center)

   - **Resizable Graph Area**: Drag the corner to resize the workspace
   - **Visual Node/Edge Representation**: Nodes appear as blue circles with IDs, edges show weights
   - **Path Highlighting**: Shortest paths are highlighted in green when algorithms run

3. **Graph State Panel** (Right Sidebar)

   - **Nodes List**: Shows all nodes with click-to-edit functionality
   - **Edges List**: Displays all edges in "source -[weight]-> target" format

4. **Algorithm Comparison Dock** (Below Controls)

   - **Side-by-Side Results**: Compare algorithm outputs, distances, and performance metrics
   - **Performance Metrics**: Shows relaxations, heap operations, and negative cycle detection

5. **Sample Graphs** (Bottom)
   - **Pre-built Examples**: Three sample graphs to quickly test different scenarios

### Sample Graphs

Use the sample buttons to quickly load test scenarios:

- **Sample 1**: Basic positive-weight graph
- **Sample 2**: Longer path with multiple routes
- **Sample 3**: Graph with negative edge weights (tests Bellman-Ford's negative cycle detection)

### Understanding the Results

#### Dijkstra's Algorithm

- **Best for**: Graphs with non-negative edge weights
- **Metrics**: Shows relaxations and heap operations
- **Behavior**: Greedy approach, visits nodes in order of shortest distance

#### Bellman-Ford Algorithm

- **Best for**: Graphs that may contain negative edge weights
- **Metrics**: Shows relaxations and detects negative cycles
- **Behavior**: Iterative approach, can handle negative weights but slower than Dijkstra

#### Comparison View

- **Distance to Target**: Shows the shortest distance found by each algorithm
- **Path**: Displays the actual shortest path as a sequence of nodes
- **Performance Metrics**: Compare computational efficiency
- **Negative Cycle Detection**: Bellman-Ford will flag if negative cycles exist

## Architecture

- **Frontend**: Vanilla JavaScript with HTML5 Canvas for graph visualization
- **Backend**: Node.js with Express.js REST API
- **Algorithms**: Clean implementations with performance tracking
