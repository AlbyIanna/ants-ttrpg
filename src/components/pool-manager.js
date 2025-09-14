/**
 * Centralized Pool Manager for Memory Optimization
 * Version: v0.6 - Performance Optimization Edition
 * 
 * Manages all object pools in the simulation
 */

import { AntPool, PheromoneParticlePool, MovementPool, ObjectPool } from './object-pool.js';

export class PoolManager {
  constructor() {
    this.pools = {
      ants: new AntPool(50),
      pheromoneParticles: new PheromoneParticlePool(200),
      movements: new MovementPool(300),
      // Generic pools for other objects
      events: new ObjectPool(() => ({ type: '', data: {}, timestamp: Date.now() }), 
                           (event) => { event.type = ''; event.data = {}; event.timestamp = Date.now(); }, 25),
      discoveries: new ObjectPool(() => ({ antId: '', item: '', position: { x: 0, y: 0 }, timestamp: Date.now() }),
                                 (discovery) => { discovery.antId = ''; discovery.item = ''; discovery.position.x = 0; discovery.position.y = 0; }, 20)
    };
    
    // Performance monitoring
    this.stats = {
      totalAcquisitions: 0,
      totalReleases: 0,
      memoryOptimization: 0,
      lastCleanup: Date.now()
    };
    
    // Auto-cleanup interval (every 30 seconds)
    this.cleanupInterval = setInterval(() => this.performMaintenance(), 30000);
    
    console.log('✅ PoolManager initialized with', Object.keys(this.pools).length, 'pools');
  }
  
  /**
   * Get an object from specific pool
   */
  acquire(poolName) {
    if (!this.pools[poolName]) {
      console.warn(`Pool '${poolName}' does not exist`);
      return null;
    }
    
    this.stats.totalAcquisitions++;
    return this.pools[poolName].acquire();
  }
  
  /**
   * Return an object to specific pool
   */
  release(poolName, obj) {
    if (!this.pools[poolName]) {
      console.warn(`Pool '${poolName}' does not exist`);
      return;
    }
    
    this.stats.totalReleases++;
    this.pools[poolName].release(obj);
  }
  
  /**
   * Release multiple objects from specific pool
   */
  releaseAll(poolName, objects) {
    if (!this.pools[poolName]) {
      console.warn(`Pool '${poolName}' does not exist`);
      return;
    }
    
    this.stats.totalReleases += objects.length;
    this.pools[poolName].releaseAll(objects);
  }
  
  /**
   * Create a new ant with proper initialization
   */
  createAnt(position, role = 'worker') {
    const ant = this.acquire('ants');
    if (ant) {
      ant.position.x = position.x;
      ant.position.y = position.y;
      ant.previousPosition.x = position.x;
      ant.previousPosition.y = position.y;
      ant.role = role;
      ant.id = Math.random().toString(36).substr(2, 9); // Generate new ID
    }
    return ant;
  }
  
  /**
   * Create a pheromone particle
   */
  createPheromoneParticle(x, y, type, strength) {
    const particle = this.acquire('pheromoneParticles');
    if (particle) {
      particle.x = x;
      particle.y = y;
      particle.type = type;
      particle.strength = strength;
      particle.alpha = Math.min(strength / 100, 1); // Scale alpha by strength
    }
    return particle;
  }
  
  /**
   * Create a movement record
   */
  createMovement(from, to, antId) {
    const movement = this.acquire('movements');
    if (movement) {
      movement.from.x = from.x;
      movement.from.y = from.y;
      movement.to.x = to.x;
      movement.to.y = to.y;
      movement.antId = antId;
      movement.timestamp = Date.now();
    }
    return movement;
  }
  
  /**
   * Auto-resize pools based on usage patterns
   */
  optimizePools() {
    Object.entries(this.pools).forEach(([name, pool]) => {
      const stats = pool.getStats();
      
      // If pool is frequently empty, increase size
      if (stats.poolSize === 0 && stats.activeObjects > 10) {
        const newSize = Math.min(stats.activeObjects * 1.5, 1000);
        pool.resize(Math.ceil(newSize));
        console.log(`📈 Pool '${name}' expanded to ${Math.ceil(newSize)}`);
      }
      
      // If pool is too large compared to usage, shrink it
      if (stats.poolSize > stats.activeObjects * 3 && stats.poolSize > 20) {
        const newSize = Math.max(stats.activeObjects * 2, 10);
        pool.resize(Math.ceil(newSize));
        console.log(`📉 Pool '${name}' shrunk to ${Math.ceil(newSize)}`);
      }
    });
  }
  
  /**
   * Perform maintenance tasks
   */
  performMaintenance() {
    console.log('🧹 PoolManager performing maintenance...');
    
    this.optimizePools();
    
    // Calculate memory optimization
    const totalStats = this.getComprehensiveStats();
    this.stats.memoryOptimization = totalStats.totalReuseRate;
    this.stats.lastCleanup = Date.now();
    
    console.log(`✅ Maintenance complete. Memory optimization: ${(this.stats.memoryOptimization * 100).toFixed(1)}%`);
  }
  
  /**
   * Get comprehensive statistics from all pools
   */
  getComprehensiveStats() {
    const poolStats = {};
    let totalCreated = 0;
    let totalReused = 0;
    let totalActive = 0;
    let totalPooled = 0;
    
    Object.entries(this.pools).forEach(([name, pool]) => {
      const stats = pool.getStats();
      poolStats[name] = stats;
      totalCreated += stats.totalCreated;
      totalReused += stats.totalReused;
      totalActive += stats.activeObjects;
      totalPooled += stats.poolSize;
    });
    
    return {
      ...this.stats,
      pools: poolStats,
      totals: {
        created: totalCreated,
        reused: totalReused,
        active: totalActive,
        pooled: totalPooled
      },
      totalReuseRate: totalReused / (totalCreated + totalReused) || 0,
      memoryEfficiency: `${(totalReused / totalCreated * 100).toFixed(1)}%`
    };
  }
  
  /**
   * Clear all pools
   */
  clearAll() {
    Object.values(this.pools).forEach(pool => pool.clear());
    this.stats.totalAcquisitions = 0;
    this.stats.totalReleases = 0;
    console.log('✅ All pools cleared');
  }
  
  /**
   * Dispose of pool manager and cleanup
   */
  dispose() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    Object.values(this.pools).forEach(pool => pool.dispose());
    this.pools = {};
    
    console.log('✅ PoolManager disposed');
  }
}

// Export singleton instance
export const poolManager = new PoolManager();