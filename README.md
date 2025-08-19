# Shortest Path Comparator

An interactive web application for visualizing and comparing shortest path algorithms with real-time graph manipulation and performance analysis. Features three algorithms spanning 70 years of computer science evolution: **Bellman-Ford (1956)**, **Dijkstra (1959)**, and the groundbreaking **Tsinghua SSSP (2025)**.

This project aims to provide an educational and interactive platform for understanding how different shortest path algorithms work. By offering side-by-side comparisons of three groundbreaking algorithms spanning 70 years of computer science research, users can:

- **Visualize Algorithm Behavior**: See how each algorithm explores graphs differently across different eras
- **Compare Performance**: Analyze metrics like relaxations, heap operations, pivot selections, and recursive partitions
- **Understand Evolution**: Learn how algorithmic thinking has evolved from the 1950s to cutting-edge 2025 research
- **Algorithm Trade-offs**: Master when to use each algorithm:
  - **Bellman-Ford (1956)**: Handles negative weights, detects negative cycles
  - **Dijkstra (1959)**: Optimal for non-negative weights with O(m + n log n) complexity
  - **Tsinghua (2025)**: Revolutionary O(m log^(2/3) n) breakthrough for sparse graphs
- **Interactive Learning**: Create custom graphs to test edge cases and algorithm limitations across three generations of SSSP research

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
   - **Algorithm Runners**: Individual buttons for all three algorithms (Bellman-Ford 1956, Dijkstra 1959, Tsinghua 2025), plus a comparison tool

2. **Sample & Results Panel** (Left Sidebar)

   - **Basic Samples**: Simple graphs showcasing different scenarios
   - **Algorithm Showcase**: Advanced examples highlighting each algorithm's strengths
   - **Algorithm Results**: Real-time display of path, distance, and performance metrics

3. **Interactive Canvas** (Center)

   - **Resizable Graph Area**: Drag the corner to resize the workspace
   - **Visual Node/Edge Representation**: Nodes appear as blue circles with IDs, edges show weights
   - **Path Highlighting**: Shortest paths are highlighted in green when algorithms run

4. **Graph State Panel** (Right Sidebar)

   - **Nodes List**: Shows all nodes with click-to-edit functionality
   - **Edges List**: Displays all edges in "source -[weight]-> target" format

5. **Algorithm Comparison Dock** (Below Controls)

   - **Side-by-Side Results**: Compare algorithm outputs, distances, and performance metrics
   - **Performance Metrics**: Shows relaxations, heap operations, and negative cycle detection

### Sample Graphs

#### Basic Samples

- **Basic Graph**: Simple positive-weight graph showcasing all three algorithms
- **Multiple Paths**: Multiple route options demonstrating different exploration strategies
- **Negative Weights**: Graph with negative edges (only Bellman-Ford handles these)

#### Algorithm Showcase Samples

- **Dijkstra's Best Case**: Dense graph with non-negative weights where Dijkstra excels
- **Bellman-Ford's Strength**: Negative weight graph showcasing unique Bellman-Ford capabilities
- **Tsinghua's Advantage**: Sparse graph demonstrating the breakthrough algorithm's efficiency
- **Dense vs Sparse**: Medium-density graph comparing algorithmic approaches
- **Negative Cycle**: Graph with negative cycle (only Bellman-Ford can detect and handle)

### Understanding the Results

#### Bellman-Ford Algorithm (1956) - The Foundation

- **Historical Significance**: Original SSSP solution by Richard Bellman and Lester Ford Jr.
- **Best for**: Graphs with negative edge weights, detecting negative cycles
- **Complexity**: O(VE) - Always runs exactly |V|-1 iterations as originally designed
- **Metrics**: Shows relaxations and iterations (faithful to 1950s implementation)
- **Behavior**: Systematic edge relaxation, guaranteed correctness for negative weights

#### Dijkstra's Algorithm (1959) - The Optimization

- **Historical Significance**: Edsger Dijkstra's greedy optimization for non-negative weights
- **Best for**: Graphs with non-negative edge weights requiring optimal performance
- **Complexity**: O((V + E) log V) with binary heap implementation
- **Metrics**: Shows relaxations and heap operations
- **Behavior**: Greedy approach, visits nodes in order of shortest distance

#### Tsinghua SSSP Algorithm (2025) - The Breakthrough

- **Historical Significance**: Duan Ran's team breaks the theoretical barrier with revolutionary approach
- **Best for**: Sparse graphs where m << n² requiring cutting-edge performance
- **Complexity**: O(m log^(2/3) n) - First algorithm to improve upon Dijkstra's bound
- **Metrics**: Shows relaxations, pivot selections, and recursive partitions
- **Innovations**:
  - Recursive partial ordering avoids full priority queue sorting
  - Pivot-based clustering reduces comparison overhead
  - Hybrid approach combining Bellman-Ford relaxation with modern techniques

#### Comparison View

- **Distance to Target**: Shows the shortest distance found by each algorithm
- **Path**: Displays the actual shortest path as a sequence of nodes
- **Algorithm Evolution**: Compare how 70 years of research improved SSSP solutions
- **Performance Metrics**: Analyze computational efficiency across three generations
- **Complexity Analysis**: See theoretical vs practical performance differences
- **Negative Cycle Detection**: Bellman-Ford will flag negative cycles (others require non-negative weights)

## Architecture

- **Frontend**: Vanilla JavaScript with HTML5 Canvas for graph visualization
- **Backend**: Node.js with Express.js REST API
- **Algorithms**: Three historically-accurate implementations with comprehensive performance tracking
  - **Bellman-Ford (1956)**: Faithful to original mid-1950s conception
  - **Dijkstra (1959)**: Optimized with binary heap implementation
  - **Tsinghua (2025)**: Cutting-edge algorithm with recursive partial ordering

### API Endpoints

- `POST /api/shortest-path/dijkstra` - Run Dijkstra's algorithm (1959)
- `POST /api/shortest-path/bellman-ford` - Run Bellman-Ford algorithm (1956)
- `POST /api/shortest-path/tsinghua` - Run Tsinghua SSSP algorithm (2025)
- `POST /api/shortest-path/compare` - Run all three algorithms and compare

### File Structure

```
├── algorithms/
│   ├── dijkstra.js        # Dijkstra's algorithm (1959)
│   ├── bellmanFord.js     # Original Bellman-Ford (1956)
│   └── tsinghua.js        # Tsinghua SSSP breakthrough (2025)
├── public/
│   ├── index.html         # Main HTML interface
│   ├── main.js           # Frontend JavaScript logic
│   └── styles.css        # Styling and layout
├── server.js             # Express.js backend server
└── package.json          # Dependencies and scripts
```

## 🎓 Educational Use Cases

1. **Algorithm Evolution Study**: Understand how SSSP algorithms evolved over 70 years of research
2. **Performance Analysis**: See how graph structure affects different algorithmic approaches
3. **Historical Computer Science**: Learn about landmark algorithms from 1956, 1959, and 2025
4. **Complexity Theory**: Compare theoretical vs practical performance across three complexity classes
5. **Edge Case Testing**: Create graphs with negative weights to test algorithm limitations
6. **Visual Learning**: Watch how different algorithmic strategies explore graphs
7. **Interactive Research**: Experiment with cutting-edge 2025 algorithm innovations
8. **Comparative Algorithmic**: Understand when each algorithm is most appropriate
