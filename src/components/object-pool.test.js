/**
 * Object Pool System Tests
 * Version: v0.6 - Performance Optimization Edition
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectPool, AntPool, PheromoneParticlePool, MovementPool } from './object-pool.js';
import { PoolManager } from './pool-manager.js';

describe('ObjectPool System - Memory Management', () => {
  let pool;
  
  beforeEach(() => {
    pool = new ObjectPool(
      () => ({ x: 0, y: 0, active: false }),
      (obj) => { obj.x = 0; obj.y = 0; obj.active = false; },
      5
    );
  });
  
  afterEach(() => {
    if (pool) {
      pool.dispose();
    }
  });
  
  describe('Basic Pool Operations', () => {
    it('should initialize with correct pool size', () => {
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.totalCreated).toBe(5);
    });
    
    it('should acquire objects from pool', () => {
      const obj = pool.acquire();
      expect(obj).toBeTruthy();
      expect(obj).toHaveProperty('x');
      expect(obj).toHaveProperty('y');
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(4);
      expect(stats.activeObjects).toBe(1);
    });
    
    it('should release objects back to pool', () => {
      const obj = pool.acquire();
      obj.x = 10;
      obj.y = 20;
      
      pool.release(obj);
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.activeObjects).toBe(0);
      expect(obj.x).toBe(0); // Should be reset
      expect(obj.y).toBe(0);
    });
    
    it('should create new objects when pool is empty', () => {
      // Exhaust pool
      const objects = [];
      for (let i = 0; i < 6; i++) {
        objects.push(pool.acquire());
      }
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.totalCreated).toBe(6);
      expect(stats.activeObjects).toBe(6);
    });
    
    it('should track reuse statistics', () => {
      const obj1 = pool.acquire();
      pool.release(obj1);
      
      const obj2 = pool.acquire(); // Should reuse obj1
      
      const stats = pool.getStats();
      expect(stats.totalReused).toBeGreaterThan(0);
      expect(stats.reuseRate).toBeGreaterThan(0);
    });
  });
  
  describe('Pool Management', () => {
    it('should resize pool correctly', () => {
      pool.resize(10);
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(10);
      expect(stats.totalCreated).toBe(10);
    });
    
    it('should clear pool and active objects', () => {
      const obj = pool.acquire();
      pool.clear();
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(0);
      expect(stats.activeObjects).toBe(0);
    });
    
    it('should handle multiple releases', () => {
      const objects = [pool.acquire(), pool.acquire(), pool.acquire()];
      pool.releaseAll(objects);
      
      const stats = pool.getStats();
      expect(stats.activeObjects).toBe(0);
      expect(stats.poolSize).toBe(5);
    });
  });
});

describe('Specialized Pools', () => {
  let antPool, particlePool, movementPool;
  
  beforeEach(() => {
    antPool = new AntPool(10);
    particlePool = new PheromoneParticlePool(20);
    movementPool = new MovementPool(15);
  });
  
  afterEach(() => {
    antPool?.dispose();
    particlePool?.dispose();
    movementPool?.dispose();
  });
  
  describe('AntPool', () => {
    it('should create ants with proper structure', () => {
      const ant = antPool.acquire();
      
      expect(ant).toHaveProperty('id');
      expect(ant).toHaveProperty('position');
      expect(ant).toHaveProperty('role');
      expect(ant).toHaveProperty('energy');
      expect(ant).toHaveProperty('stats');
      expect(ant.position).toHaveProperty('x');
      expect(ant.position).toHaveProperty('y');
    });
    
    it('should reset ant properties when released', () => {
      const ant = antPool.acquire();
      ant.energy = 50;
      ant.carryingFood = true;
      ant.position.x = 100;
      
      antPool.release(ant);
      
      expect(ant.energy).toBe(100);
      expect(ant.carryingFood).toBe(false);
      expect(ant.position.x).toBe(0);
    });
  });
  
  describe('PheromoneParticlePool', () => {
    it('should create particles with proper structure', () => {
      const particle = particlePool.acquire();
      
      expect(particle).toHaveProperty('x');
      expect(particle).toHaveProperty('y');
      expect(particle).toHaveProperty('type');
      expect(particle).toHaveProperty('strength');
      expect(particle).toHaveProperty('alpha');
    });
  });
  
  describe('MovementPool', () => {
    it('should create movement records', () => {
      const movement = movementPool.acquire();
      
      expect(movement).toHaveProperty('from');
      expect(movement).toHaveProperty('to');
      expect(movement).toHaveProperty('antId');
      expect(movement).toHaveProperty('timestamp');
      expect(movement.from).toHaveProperty('x');
      expect(movement.from).toHaveProperty('y');
    });
  });
});

describe('PoolManager', () => {
  let poolManager;
  
  beforeEach(() => {
    poolManager = new PoolManager();
  });
  
  afterEach(() => {
    if (poolManager) {
      poolManager.dispose();
    }
  });
  
  describe('Pool Management', () => {
    it('should initialize with all required pools', () => {
      const stats = poolManager.getComprehensiveStats();
      
      expect(stats.pools).toHaveProperty('ants');
      expect(stats.pools).toHaveProperty('pheromoneParticles');
      expect(stats.pools).toHaveProperty('movements');
      expect(stats.pools).toHaveProperty('events');
      expect(stats.pools).toHaveProperty('discoveries');
    });
    
    it('should acquire objects from named pools', () => {
      const ant = poolManager.acquire('ants');
      expect(ant).toBeTruthy();
      expect(ant).toHaveProperty('position');
      
      const particle = poolManager.acquire('pheromoneParticles');
      expect(particle).toBeTruthy();
      expect(particle).toHaveProperty('type');
    });
    
    it('should release objects to named pools', () => {
      const ant = poolManager.acquire('ants');
      const initialStats = poolManager.getComprehensiveStats();
      
      poolManager.release('ants', ant);
      const finalStats = poolManager.getComprehensiveStats();
      
      expect(finalStats.totalReleases).toBe(initialStats.totalReleases + 1);
    });
  });
  
  describe('Convenience Methods', () => {
    it('should create ants with proper initialization', () => {
      const ant = poolManager.createAnt({ x: 10, y: 20 }, 'scout');
      
      expect(ant.position.x).toBe(10);
      expect(ant.position.y).toBe(20);
      expect(ant.role).toBe('scout');
      expect(ant.id).toBeTruthy();
    });
    
    it('should create pheromone particles', () => {
      const particle = poolManager.createPheromoneParticle(5, 8, 'food', 75);
      
      expect(particle.x).toBe(5);
      expect(particle.y).toBe(8);
      expect(particle.type).toBe('food');
      expect(particle.strength).toBe(75);
    });
    
    it('should create movement records', () => {
      const movement = poolManager.createMovement(
        { x: 1, y: 2 }, 
        { x: 3, y: 4 }, 
        'ant123'
      );
      
      expect(movement.from.x).toBe(1);
      expect(movement.from.y).toBe(2);
      expect(movement.to.x).toBe(3);
      expect(movement.to.y).toBe(4);
      expect(movement.antId).toBe('ant123');
    });
  });
  
  describe('Performance Optimization', () => {
    it('should track comprehensive statistics', () => {
      // Use pools to generate stats
      const ant1 = poolManager.acquire('ants');
      const ant2 = poolManager.acquire('ants');
      poolManager.release('ants', ant1);
      
      const stats = poolManager.getComprehensiveStats();
      
      expect(stats.totalAcquisitions).toBe(2);
      expect(stats.totalReleases).toBe(1);
      expect(stats.totals).toHaveProperty('created');
      expect(stats.totals).toHaveProperty('reused');
      expect(stats.totals).toHaveProperty('active');
      expect(stats).toHaveProperty('memoryEfficiency');
    });
    
    it('should optimize pool sizes based on usage', () => {
      // This test would require more complex setup to trigger optimization
      expect(() => poolManager.optimizePools()).not.toThrow();
    });
    
    it('should clear all pools', () => {
      const ant = poolManager.acquire('ants');
      poolManager.clearAll();
      
      const stats = poolManager.getComprehensiveStats();
      expect(stats.totals.active).toBe(0);
      expect(stats.totalAcquisitions).toBe(0);
    });
  });
});