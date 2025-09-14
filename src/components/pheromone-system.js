/**
 * Pheromone Trail System for Ant Colony TTRPG
 * Version: v0.6 - Advanced Rendering Edition
 * 
 * Manages chemical communication between ants through pheromone trails
 */

import { Utils } from './utils.js';

export class PheromoneSystem {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    
    // Pheromone trail types
    this.trailTypes = {
      FOOD: 'food',
      EXPLORATION: 'exploration', 
      DANGER: 'danger',
      HOME: 'home'
    };
    
    // Pheromone grids - one for each trail type
    this.grids = {
      [this.trailTypes.FOOD]: this.createGrid(),
      [this.trailTypes.EXPLORATION]: this.createGrid(),
      [this.trailTypes.DANGER]: this.createGrid(),
      [this.trailTypes.HOME]: this.createGrid()
    };
    
    // Spatial partitioning for performance optimization
    this.partitionSize = 32; // 32x32 pixel partitions
    this.partitionWidth = Math.ceil(width / this.partitionSize);
    this.partitionHeight = Math.ceil(height / this.partitionSize);
    this.dirtyPartitions = new Set(); // Track which partitions need updates
    
    // Batch processing queues
    this.depositionQueue = [];
    this.batchSize = 100; // Process batches of 100 operations
    this.lastUpdateTime = 0;
    
    // Pheromone properties
    this.config = {
      // Decay rates (per update cycle)
      decay: {
        [this.trailTypes.FOOD]: 0.02,        // Food trails fade slowly
        [this.trailTypes.EXPLORATION]: 0.05,  // Exploration trails fade faster
        [this.trailTypes.DANGER]: 0.01,      // Danger warnings persist longer
        [this.trailTypes.HOME]: 0.005        // Home trails are very persistent
      },
      
      // Maximum pheromone strength
      maxStrength: {
        [this.trailTypes.FOOD]: 100,
        [this.trailTypes.EXPLORATION]: 50,
        [this.trailTypes.DANGER]: 75,
        [this.trailTypes.HOME]: 80
      },
      
      // Minimum threshold for visibility
      visibilityThreshold: 1.0,
      
      // Diffusion rate (spreads to adjacent cells)
      diffusionRate: 0.1,
      
      // Reinforcement strength when ant walks over trail
      reinforcementStrength: {
        [this.trailTypes.FOOD]: 15,
        [this.trailTypes.EXPLORATION]: 8,
        [this.trailTypes.DANGER]: 20,
        [this.trailTypes.HOME]: 10
      }
    };
    
    // Performance optimization - track dirty regions
    
    // Statistics for monitoring
    this.stats = {
      totalPheromones: 0,
      strongestTrail: 0,
      activeTrailCells: 0,
      lastUpdateTime: 0
    };
  }
  
  /**
   * Create empty pheromone grid
   */
  createGrid() {
    const grid = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = new Float32Array(this.width);
    }
    return grid;
  }
  
  /**
   * Deposit pheromone at specific location (optimized with batching)
   */
  depositPheromone(x, y, trailType, strength, batched = false) {
    if (!this.isValidPosition(x, y) || !this.grids[trailType]) {
      return false;
    }
    
    if (!batched) {
      return this._immediateDeposit(x, y, trailType, strength);
    }
    
    // Add to batch queue for optimized processing
    this.depositionQueue.push({ x, y, trailType, strength });
    
    // Process batch if it reaches threshold
    if (this.depositionQueue.length >= this.batchSize) {
      this._processBatch();
    }
    
    return true;
  }
  
  /**
   * Immediate pheromone deposition (legacy method)
   */
  _immediateDeposit(x, y, trailType, strength) {
    const grid = this.grids[trailType];
    const maxStrength = this.config.maxStrength[trailType];
    
    // Add pheromone strength, clamped to maximum
    const currentStrength = grid[y][x];
    const newStrength = Math.min(currentStrength + strength, maxStrength);
    grid[y][x] = newStrength;
    
    // Mark region as dirty for optimization
    this._markDirtyPartition(x, y);
    
    return true;
  }
  
  /**
   * Process batch of pheromone depositions for performance optimization
   */
  _processBatch() {
    if (this.depositionQueue.length === 0) return;
    
    // Group depositions by trail type for efficient processing
    const typeGroups = {};
    
    for (const deposit of this.depositionQueue) {
      if (!typeGroups[deposit.trailType]) {
        typeGroups[deposit.trailType] = [];
      }
      typeGroups[deposit.trailType].push(deposit);
    }
    
    // Process each trail type group
    for (const [trailType, deposits] of Object.entries(typeGroups)) {
      const grid = this.grids[trailType];
      const maxStrength = this.config.maxStrength[trailType];
      
      for (const { x, y, strength } of deposits) {
        if (this.isValidPosition(x, y)) {
          const currentStrength = grid[y][x];
          grid[y][x] = Math.min(currentStrength + strength, maxStrength);
          this._markDirtyPartition(x, y);
        }
      }
    }
    
    // Clear the queue
    this.depositionQueue.length = 0;
  }
  
  /**
   * Force process any remaining batched operations
   */
  flushBatch() {
    this._processBatch();
  }
  
  /**
   * Mark spatial partition as dirty for optimized updates
   */
  _markDirtyPartition(x, y) {
    const partitionX = Math.floor(x / this.partitionSize);
    const partitionY = Math.floor(y / this.partitionSize);
    const partitionId = partitionY * this.partitionWidth + partitionX;
    this.dirtyPartitions.add(partitionId);
  }
  
  /**
   * Get partition coordinates from partition ID
   */
  _getPartitionCoords(partitionId) {
    const partitionY = Math.floor(partitionId / this.partitionWidth);
    const partitionX = partitionId % this.partitionWidth;
    return { x: partitionX, y: partitionY };
  }
  
  /**
   * Get bounds for a partition
   */
  _getPartitionBounds(partitionX, partitionY) {
    return {
      left: partitionX * this.partitionSize,
      right: Math.min((partitionX + 1) * this.partitionSize, this.width),
      top: partitionY * this.partitionSize,
      bottom: Math.min((partitionY + 1) * this.partitionSize, this.height)
    };
  }
  
  /**
   * Reinforce existing pheromone trail (when ant walks over it)
   */
  reinforceTrail(x, y, trailType) {
    if (!this.isValidPosition(x, y) || !this.grids[trailType]) {
      return false;
    }
    
    const grid = this.grids[trailType];
    const currentStrength = grid[y][x];
    
    // Only reinforce if there's already some pheromone present
    if (currentStrength > this.config.visibilityThreshold) {
      const reinforcement = this.config.reinforcementStrength[trailType];
      const maxStrength = this.config.maxStrength[trailType];
      grid[y][x] = Math.min(currentStrength + reinforcement, maxStrength);
      
      this._markDirtyPartition(x, y);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get pheromone strength at location for specific trail type
   */
  getPheromone(x, y, trailType) {
    if (!this.isValidPosition(x, y) || !this.grids[trailType]) {
      return 0;
    }
    return this.grids[trailType][y][x];
  }
  
  /**
   * Get all pheromone strengths at location
   */
  getAllPheromones(x, y) {
    if (!this.isValidPosition(x, y)) {
      return {};
    }
    
    const result = {};
    for (const trailType of Object.values(this.trailTypes)) {
      result[trailType] = this.grids[trailType][y][x];
    }
    return result;
  }
  
  /**
   * Get strongest pheromone type at location
   */
  getStrongestPheromone(x, y) {
    if (!this.isValidPosition(x, y)) {
      return { type: null, strength: 0 };
    }
    
    let strongest = { type: null, strength: 0 };
    
    for (const trailType of Object.values(this.trailTypes)) {
      const strength = this.grids[trailType][y][x];
      if (strength > strongest.strength && strength > this.config.visibilityThreshold) {
        strongest = { type: trailType, strength };
      }
    }
    
    return strongest;
  }
  
  /**
   * Update pheromone system - handle decay and diffusion
   */
  update() {
    const startTime = performance.now();
    
    // Process any remaining batched operations first
    this.flushBatch();
    
    // Reset statistics
    this.stats.totalPheromones = 0;
    this.stats.strongestTrail = 0;
    this.stats.activeTrailCells = 0;
    
    // Use spatial partitioning for optimized updates
    if (this.dirtyPartitions.size > 0) {
      this.updateDirtyPartitions();
    } else {
      // Fall back to full update if no partitions are dirty
      this.updateAllPheromones();
    }
    
    // Clear dirty partitions after update
    this.dirtyPartitions.clear();
    
    this.stats.lastUpdateTime = performance.now() - startTime;
  }
  
  /**
   * Update only dirty partitions for performance optimization
   */
  updateDirtyPartitions() {
    for (const partitionId of this.dirtyPartitions) {
      const { x: partitionX, y: partitionY } = this._getPartitionCoords(partitionId);
      const bounds = this._getPartitionBounds(partitionX, partitionY);
      
      // Update each pheromone type within this partition
      for (const trailType of Object.values(this.trailTypes)) {
        this.updatePartitionPheromoneType(trailType, bounds);
      }
    }
  }
  
  /**
   * Update all pheromones (fallback for when no partitions are dirty)
   */
  updateAllPheromones() {
    for (const trailType of Object.values(this.trailTypes)) {
      this.updatePheromoneType(trailType);
    }
  }
  
  /**
   * Update specific pheromone type within partition bounds
   */
  updatePartitionPheromoneType(trailType, bounds) {
    const grid = this.grids[trailType];
    const decayRate = this.config.decay[trailType];
    const diffusionRate = this.config.diffusionRate;
    const threshold = this.config.visibilityThreshold;
    
    // Create temporary grid for diffusion calculations (only for this partition)
    const tempGrid = this.createGrid();
    
    for (let y = bounds.top; y < bounds.bottom; y++) {
      for (let x = bounds.left; x < bounds.right; x++) {
        let strength = grid[y][x];
        
        if (strength > 0) {
          // Apply decay
          strength *= (1 - decayRate);
          
          // Apply diffusion to adjacent cells
          if (diffusionRate > 0) {
            strength = this.applyDiffusion(grid, tempGrid, x, y, strength, diffusionRate);
          }
          
          // Update statistics
          if (strength >= threshold) {
            this.stats.totalPheromones += strength;
            this.stats.activeTrailCells++;
            
            if (strength > this.stats.strongestTrail) {
              this.stats.strongestTrail = strength;
            }
          } else {
            strength = 0; // Remove below threshold
          }
        }
        
        tempGrid[y][x] = strength;
      }
    }
    
    // Copy results back to main grid (only for this partition)
    for (let y = bounds.top; y < bounds.bottom; y++) {
      for (let x = bounds.left; x < bounds.right; x++) {
        grid[y][x] = tempGrid[y][x];
      }
    }
  }
  
  /**
   * Update specific pheromone type with decay and diffusion (full grid)
   */
  updatePheromoneType(trailType) {
    const grid = this.grids[trailType];
    const decayRate = this.config.decay[trailType];
    const diffusionRate = this.config.diffusionRate;
    const threshold = this.config.visibilityThreshold;
    
    // Create temporary grid for diffusion calculations
    const tempGrid = this.createGrid();
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let strength = grid[y][x];
        
        if (strength > 0) {
          // Apply decay
          strength *= (1 - decayRate);
          
          // Apply diffusion to adjacent cells
          if (diffusionRate > 0 && strength > threshold) {
            const diffusionAmount = strength * diffusionRate;
            const adjacentCells = this.getAdjacentCells(x, y);
            const diffusionPerCell = diffusionAmount / adjacentCells.length;
            
            // Spread to adjacent cells
            adjacentCells.forEach(({ x: nx, y: ny }) => {
              tempGrid[ny][nx] += diffusionPerCell;
            });
            
            // Reduce strength by diffused amount
            strength -= diffusionAmount;
          }
          
          // Set final strength (remove very weak pheromones)
          grid[y][x] = strength < threshold ? 0 : strength;
          
          // Update statistics
          if (grid[y][x] > 0) {
            this.stats.totalPheromones += grid[y][x];
            this.stats.activeTrailCells++;
            this.stats.strongestTrail = Math.max(this.stats.strongestTrail, grid[y][x]);
          }
        }
      }
    }
    
    // Apply diffusion from temporary grid
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (tempGrid[y][x] > 0) {
          grid[y][x] = Math.min(
            grid[y][x] + tempGrid[y][x], 
            this.config.maxStrength[trailType]
          );
        }
      }
    }
  }
  
  /**
   * Apply diffusion to a pheromone cell
   */
  applyDiffusion(grid, tempGrid, x, y, strength, diffusionRate) {
    const adjacent = this.getAdjacentCells(x, y);
    const diffusionAmount = strength * diffusionRate;
    const remainingStrength = strength - diffusionAmount;
    
    // Distribute diffusion among adjacent cells
    if (adjacent.length > 0) {
      const perCell = diffusionAmount / adjacent.length;
      adjacent.forEach(({ x: nx, y: ny }) => {
        tempGrid[ny][nx] += perCell;
      });
    }
    
    return remainingStrength;
  }
  
  /**
   * Get adjacent cells for diffusion calculations
   */
  getAdjacentCells(x, y) {
    const adjacent = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    directions.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isValidPosition(nx, ny)) {
        adjacent.push({ x: nx, y: ny });
      }
    });
    
    return adjacent;
  }
  
  /**
   * Get visible pheromone data for rendering
   */
  getVisiblePheromones(bounds) {
    const visible = [];
    
    const startX = Math.max(0, Math.floor(bounds.left));
    const endX = Math.min(this.width, Math.ceil(bounds.right));
    const startY = Math.max(0, Math.floor(bounds.top));
    const endY = Math.min(this.height, Math.ceil(bounds.bottom));
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const pheromones = this.getAllPheromones(x, y);
        let hasVisible = false;
        
        // Check if any pheromone type is visible
        for (const strength of Object.values(pheromones)) {
          if (strength > this.config.visibilityThreshold) {
            hasVisible = true;
            break;
          }
        }
        
        if (hasVisible) {
          visible.push({
            x, y,
            pheromones,
            strongest: this.getStrongestPheromone(x, y)
          });
        }
      }
    }
    
    return visible;
  }
  
  /**
   * Resize pheromone system for new world dimensions
   */
  resize(newWidth, newHeight) {
    // Create new grids
    const newGrids = {};
    for (const trailType of Object.values(this.trailTypes)) {
      const newGrid = [];
      for (let y = 0; y < newHeight; y++) {
        newGrid[y] = new Float32Array(newWidth);
        
        // Copy existing data if within bounds
        if (y < this.height && this.grids[trailType][y]) {
          const copyWidth = Math.min(newWidth, this.width);
          for (let x = 0; x < copyWidth; x++) {
            newGrid[y][x] = this.grids[trailType][y][x];
          }
        }
      }
      newGrids[trailType] = newGrid;
    }
    
    // Update dimensions and grids
    this.width = newWidth;
    this.height = newHeight;
    this.grids = newGrids;
  }
  
  /**
   * Clear all pheromones
   */
  clear() {
    for (const trailType of Object.values(this.trailTypes)) {
      for (let y = 0; y < this.height; y++) {
        this.grids[trailType][y].fill(0);
      }
    }
  }
  
  /**
   * Clear specific pheromone type
   */
  clearType(trailType) {
    if (this.grids[trailType]) {
      for (let y = 0; y < this.height; y++) {
        this.grids[trailType][y].fill(0);
      }
    }
  }
  
  
  /**
   * Check if position is valid
   */
  isValidPosition(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  
  /**
   * Get system statistics
   */
  getStats() {
    return {
      ...this.stats,
      gridDimensions: { width: this.width, height: this.height },
      trailTypes: Object.values(this.trailTypes),
      dirtyPartitionCount: this.dirtyPartitions.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * Estimate memory usage in bytes
   */
  estimateMemoryUsage() {
    const floatSize = 4; // bytes per Float32
    const cellsPerGrid = this.width * this.height;
    const gridCount = Object.keys(this.grids).length;
    return cellsPerGrid * gridCount * floatSize;
  }
  
  /**
   * Dispose resources and cleanup memory
   */
  dispose() {
    // Clear all grids
    Object.keys(this.grids).forEach(trailType => {
      this.grids[trailType] = null;
    });
    this.grids = {};
    
    // Clear spatial partitioning data
    this.dirtyPartitions.clear();
    this.dirtyPartitions = null;
    
    // Clear batch processing queues
    this.depositionQueue.length = 0;
    this.depositionQueue = null;
    
    // Clear configuration and stats
    this.config = null;
    this.stats = null;
    this.trailTypes = null;
    
    console.log('✅ PheromoneSystem disposed and memory freed');
  }
}