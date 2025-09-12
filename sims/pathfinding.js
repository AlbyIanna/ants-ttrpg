/**
 * A* Pathfinding Algorithm for Ant Colony TTRPG
 * Version: v0.4 - Intelligent navigation system for realistic ant movement
 */

class PathfindingEngine {
  constructor(environmentEngine) {
    this.environment = environmentEngine;
    this.cache = new Map(); // Cache paths for performance
    this.maxCacheSize = 1000;
  }

  /**
   * Find optimal path from start to goal using A* algorithm
   * Returns array of {x, y} coordinates or null if no path exists
   */
  findPath(start, goal, environment, options = {}) {
    const config = {
      allowDiagonal: true,
      maxDistance: options.maxDistance || 100,
      avoidHazards: options.avoidHazards !== false,
      hazardPenalty: options.hazardPenalty || 10,
      ...options
    };

    // Check cache first
    const cacheKey = `${start.x},${start.y}-${goal.x},${goal.y}-${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const path = this.aStar(start, goal, environment, config);
    
    // Cache the result
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, path);
    
    return path;
  }

  aStar(start, goal, environment, config) {
    const openSet = new BinaryHeap((node) => node.f);
    const closedSet = new Set();
    const nodes = {};

    const startNode = this.createNode(start.x, start.y, 0, this.heuristic(start, goal));
    openSet.push(startNode);
    nodes[`${start.x},${start.y}`] = startNode;

    let iterations = 0;
    const maxIterations = 2000;

    while (openSet.size() > 0 && iterations < maxIterations) {
      iterations++;
      
      const current = openSet.pop();
      const currentKey = `${current.x},${current.y}`;

      if (current.x === goal.x && current.y === goal.y) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      const neighbors = this.getNeighbors(current, environment, config);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + neighbor.cost;
        
        if (!nodes[neighborKey]) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, goal);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          nodes[neighborKey] = neighbor;
          openSet.push(neighbor);
        } else if (tentativeG < nodes[neighborKey].g) {
          nodes[neighborKey].g = tentativeG;
          nodes[neighborKey].f = tentativeG + nodes[neighborKey].h;
          nodes[neighborKey].parent = current;
          openSet.rescoreElement(nodes[neighborKey]);
        }
      }
    }

    return null; // No path found
  }

  createNode(x, y, g = 0, h = 0) {
    return {
      x: x,
      y: y,
      g: g,
      h: h,
      f: g + h,
      parent: null
    };
  }

  getNeighbors(node, environment, config) {
    const neighbors = [];
    const directions = config.allowDiagonal 
      ? [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]]
      : [[-1,0], [0,-1], [0,1], [1,0]];

    for (const [dx, dy] of directions) {
      const x = node.x + dx;
      const y = node.y + dy;

      if (!this.isValidPosition(x, y, environment)) continue;

      const cost = this.calculateMovementCost(node.x, node.y, x, y, environment, config);
      if (cost === Infinity) continue;

      neighbors.push({
        x: x,
        y: y,
        cost: cost
      });
    }

    return neighbors;
  }

  isValidPosition(x, y, environment) {
    if (x < 0 || x >= environment.metadata.width || 
        y < 0 || y >= environment.metadata.height) {
      return false;
    }

    const terrain = environment.terrain[y][x];
    return this.environment.isPassable(terrain);
  }

  calculateMovementCost(fromX, fromY, toX, toY, environment, config) {
    const terrain = environment.terrain[toY][toX];
    let baseCost = this.environment.getTerrainCost(terrain);

    if (baseCost === 999) return Infinity; // Impassable

    // Diagonal movement costs more
    const isDiagonal = Math.abs(toX - fromX) === 1 && Math.abs(toY - fromY) === 1;
    if (isDiagonal) baseCost *= 1.414; // sqrt(2)

    // Add hazard penalties
    if (config.avoidHazards) {
      for (const hazard of environment.hazards) {
        const distance = Math.sqrt(
          Math.pow(toX - hazard.x, 2) + Math.pow(toY - hazard.y, 2)
        );
        if (distance <= 2) {
          baseCost += config.hazardPenalty * (3 - distance);
        }
      }
    }

    return baseCost;
  }

  heuristic(a, b) {
    // Manhattan distance with diagonal shortcut
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy);
  }

  reconstructPath(node) {
    const path = [];
    let current = node;
    
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    
    return path;
  }

  /**
   * Find the nearest target of a specific type
   */
  findNearestTarget(start, targets, environment, options = {}) {
    let nearest = null;
    let shortestPath = null;
    let shortestDistance = Infinity;

    for (const target of targets) {
      const distance = this.heuristic(start, target);
      if (distance < shortestDistance) {
        const path = this.findPath(start, target, environment, options);
        if (path) {
          nearest = target;
          shortestPath = path;
          shortestDistance = distance;
        }
      }
    }

    return { target: nearest, path: shortestPath };
  }

  /**
   * Find multiple paths avoiding congestion
   */
  findPathsWithFlowField(requests, environment, options = {}) {
    const paths = new Map();
    const occupiedPositions = new Set();

    // Sort requests by priority or distance
    const sortedRequests = requests.sort((a, b) => {
      const distA = this.heuristic(a.start, a.goal);
      const distB = this.heuristic(b.start, b.goal);
      return distA - distB;
    });

    for (const request of sortedRequests) {
      const pathOptions = {
        ...options,
        avoidPositions: occupiedPositions
      };

      const path = this.findPath(request.start, request.goal, environment, pathOptions);
      
      if (path) {
        paths.set(request.id, path);
        
        // Mark path positions as occupied for subsequent pathfinding
        for (const pos of path) {
          occupiedPositions.add(`${pos.x},${pos.y}`);
        }
      }
    }

    return paths;
  }

  /**
   * Create a flow field for efficient group movement
   */
  createFlowField(goal, environment, maxDistance = 20) {
    const flowField = {};
    const queue = [{ x: goal.x, y: goal.y, distance: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key) || current.distance > maxDistance) continue;
      visited.add(key);

      flowField[key] = {
        distance: current.distance,
        direction: this.getDirectionToGoal(current, goal)
      };

      // Add neighbors
      const neighbors = this.getNeighbors(current, environment, { allowDiagonal: true });
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(neighborKey)) {
          queue.push({
            x: neighbor.x,
            y: neighbor.y,
            distance: current.distance + neighbor.cost
          });
        }
      }
    }

    return flowField;
  }

  getDirectionToGoal(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    
    return {
      x: Math.sign(dx),
      y: Math.sign(dy),
      angle: angle
    };
  }

  /**
   * Clear pathfinding cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

/**
 * Binary Heap implementation for efficient priority queue
 */
class BinaryHeap {
  constructor(scoreFunction) {
    this.content = [];
    this.scoreFunction = scoreFunction;
  }

  push(element) {
    this.content.push(element);
    this.sinkDown(this.content.length - 1);
  }

  pop() {
    const result = this.content[0];
    const end = this.content.pop();
    
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    
    return result;
  }

  remove(node) {
    const i = this.content.indexOf(node);
    const end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;
      
      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      } else {
        this.bubbleUp(i);
      }
    }
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node) {
    this.sinkDown(this.content.indexOf(node));
  }

  sinkDown(n) {
    const element = this.content[n];
    
    while (n > 0) {
      const parentN = ((n + 1) >> 1) - 1;
      const parent = this.content[parentN];
      
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      } else {
        break;
      }
    }
  }

  bubbleUp(n) {
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = this.scoreFunction(element);

    while (true) {
      const child2N = (n + 1) << 1;
      const child1N = child2N - 1;
      let swap = null;
      let child1Score;
      
      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);
        
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      } else {
        break;
      }
    }
  }
}

module.exports = PathfindingEngine;