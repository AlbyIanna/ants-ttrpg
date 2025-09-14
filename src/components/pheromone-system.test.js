/**
 * Tests for PheromoneSystem - Advanced Rendering System
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PheromoneSystem } from './pheromone-system.js';

describe('PheromoneSystem - Advanced Rendering System', () => {
  let pheromoneSystem;
  const testWidth = 10;
  const testHeight = 8;

  beforeEach(() => {
    pheromoneSystem = new PheromoneSystem(testWidth, testHeight);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(pheromoneSystem.width).toBe(testWidth);
      expect(pheromoneSystem.height).toBe(testHeight);
    });

    it('should create grids for all trail types', () => {
      const expectedTypes = ['food', 'exploration', 'danger', 'home'];
      expectedTypes.forEach(type => {
        expect(pheromoneSystem.grids[type]).toBeDefined();
        expect(pheromoneSystem.grids[type]).toHaveLength(testHeight);
        expect(pheromoneSystem.grids[type][0]).toHaveLength(testWidth);
      });
    });

    it('should initialize empty grids with zeros', () => {
      const grid = pheromoneSystem.grids.food;
      for (let y = 0; y < testHeight; y++) {
        for (let x = 0; x < testWidth; x++) {
          expect(grid[y][x]).toBe(0);
        }
      }
    });

    it('should have proper trail type constants', () => {
      expect(pheromoneSystem.trailTypes.FOOD).toBe('food');
      expect(pheromoneSystem.trailTypes.EXPLORATION).toBe('exploration');
      expect(pheromoneSystem.trailTypes.DANGER).toBe('danger');
      expect(pheromoneSystem.trailTypes.HOME).toBe('home');
    });
  });

  describe('Pheromone Deposition', () => {
    it('should deposit pheromone at valid position', () => {
      const result = pheromoneSystem.depositPheromone(5, 4, 'food', 50);
      
      expect(result).toBe(true);
      expect(pheromoneSystem.getPheromone(5, 4, 'food')).toBe(50);
    });

    it('should reject deposition at invalid positions', () => {
      expect(pheromoneSystem.depositPheromone(-1, 4, 'food', 50)).toBe(false);
      expect(pheromoneSystem.depositPheromone(5, -1, 'food', 50)).toBe(false);
      expect(pheromoneSystem.depositPheromone(testWidth, 4, 'food', 50)).toBe(false);
      expect(pheromoneSystem.depositPheromone(5, testHeight, 'food', 50)).toBe(false);
    });

    it('should reject deposition for invalid trail type', () => {
      const result = pheromoneSystem.depositPheromone(5, 4, 'invalid_type', 50);
      expect(result).toBe(false);
    });

    it('should accumulate pheromone strength when depositing multiple times', () => {
      pheromoneSystem.depositPheromone(5, 4, 'food', 30);
      pheromoneSystem.depositPheromone(5, 4, 'food', 25);
      
      expect(pheromoneSystem.getPheromone(5, 4, 'food')).toBe(55);
    });

    it('should clamp pheromone strength to maximum', () => {
      const maxStrength = pheromoneSystem.config.maxStrength.food;
      pheromoneSystem.depositPheromone(5, 4, 'food', maxStrength + 50);
      
      expect(pheromoneSystem.getPheromone(5, 4, 'food')).toBe(maxStrength);
    });

    it('should mark dirty partitions when depositing', () => {
      const initialCount = pheromoneSystem.dirtyPartitions.size;
      
      pheromoneSystem.depositPheromone(5, 4, 'food', 50);
      
      expect(pheromoneSystem.dirtyPartitions.size).toBeGreaterThan(initialCount);
    });
  });

  describe('Trail Reinforcement', () => {
    it('should reinforce existing trails', () => {
      // Deposit initial pheromone above visibility threshold
      pheromoneSystem.depositPheromone(5, 4, 'food', 10);
      const initialStrength = pheromoneSystem.getPheromone(5, 4, 'food');
      
      const result = pheromoneSystem.reinforceTrail(5, 4, 'food');
      const newStrength = pheromoneSystem.getPheromone(5, 4, 'food');
      
      expect(result).toBe(true);
      expect(newStrength).toBeGreaterThan(initialStrength);
    });

    it('should not reinforce trails below visibility threshold', () => {
      // Deposit very weak pheromone below threshold
      pheromoneSystem.depositPheromone(5, 4, 'food', 0.5);
      
      const result = pheromoneSystem.reinforceTrail(5, 4, 'food');
      
      expect(result).toBe(false);
    });

    it('should not reinforce empty cells', () => {
      const result = pheromoneSystem.reinforceTrail(5, 4, 'food');
      
      expect(result).toBe(false);
      expect(pheromoneSystem.getPheromone(5, 4, 'food')).toBe(0);
    });

    it('should clamp reinforcement to maximum strength', () => {
      const maxStrength = pheromoneSystem.config.maxStrength.food;
      pheromoneSystem.depositPheromone(5, 4, 'food', maxStrength - 5);
      
      pheromoneSystem.reinforceTrail(5, 4, 'food');
      
      expect(pheromoneSystem.getPheromone(5, 4, 'food')).toBe(maxStrength);
    });
  });

  describe('Pheromone Retrieval', () => {
    beforeEach(() => {
      // Set up test pheromones
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      pheromoneSystem.depositPheromone(2, 2, 'exploration', 30);
      pheromoneSystem.depositPheromone(3, 3, 'danger', 75);
    });

    it('should get specific pheromone strength', () => {
      expect(pheromoneSystem.getPheromone(2, 2, 'food')).toBe(50);
      expect(pheromoneSystem.getPheromone(2, 2, 'exploration')).toBe(30);
      expect(pheromoneSystem.getPheromone(3, 3, 'danger')).toBe(75);
    });

    it('should return zero for empty cells', () => {
      expect(pheromoneSystem.getPheromone(1, 1, 'food')).toBe(0);
    });

    it('should get all pheromones at location', () => {
      const allPheromones = pheromoneSystem.getAllPheromones(2, 2);
      
      expect(allPheromones.food).toBe(50);
      expect(allPheromones.exploration).toBe(30);
      expect(allPheromones.danger).toBe(0);
      expect(allPheromones.home).toBe(0);
    });

    it('should get strongest pheromone type', () => {
      const strongest = pheromoneSystem.getStrongestPheromone(2, 2);
      
      expect(strongest.type).toBe('food');
      expect(strongest.strength).toBe(50);
    });

    it('should return null for strongest when no pheromones above threshold', () => {
      // Deposit very weak pheromone below visibility threshold
      pheromoneSystem.depositPheromone(1, 1, 'food', 0.5);
      const strongest = pheromoneSystem.getStrongestPheromone(1, 1);
      
      expect(strongest.type).toBe(null);
      expect(strongest.strength).toBe(0);
    });
  });

  describe('Pheromone Updates and Decay', () => {
    beforeEach(() => {
      // Set up initial pheromones
      pheromoneSystem.depositPheromone(5, 4, 'food', 100);
      pheromoneSystem.depositPheromone(3, 3, 'exploration', 40);
    });

    it('should apply decay to pheromones', () => {
      const initialFood = pheromoneSystem.getPheromone(5, 4, 'food');
      const initialExploration = pheromoneSystem.getPheromone(3, 3, 'exploration');
      
      pheromoneSystem.update();
      
      const afterFood = pheromoneSystem.getPheromone(5, 4, 'food');
      const afterExploration = pheromoneSystem.getPheromone(3, 3, 'exploration');
      
      expect(afterFood).toBeLessThan(initialFood);
      expect(afterExploration).toBeLessThan(initialExploration);
    });

    it('should remove pheromones below visibility threshold', () => {
      // Deposit very weak pheromone
      pheromoneSystem.depositPheromone(1, 1, 'food', 0.5);
      
      pheromoneSystem.update();
      
      expect(pheromoneSystem.getPheromone(1, 1, 'food')).toBe(0);
    });

    it('should update statistics during update', () => {
      pheromoneSystem.update();
      
      const stats = pheromoneSystem.getStats();
      expect(stats.totalPheromones).toBeGreaterThan(0);
      expect(stats.activeTrailCells).toBeGreaterThan(0);
      expect(stats.strongestTrail).toBeGreaterThan(0);
      expect(stats.lastUpdateTime).toBeGreaterThanOrEqual(0);
    });

    it('should clear dirty partitions after update', () => {
      // Ensure there are dirty partitions
      pheromoneSystem.depositPheromone(1, 1, 'food', 10);
      expect(pheromoneSystem.dirtyPartitions.size).toBeGreaterThan(0);
      
      pheromoneSystem.update();
      
      expect(pheromoneSystem.dirtyPartitions.size).toBe(0);
    });
  });

  describe('Diffusion', () => {
    it('should get adjacent cells correctly', () => {
      const adjacent = pheromoneSystem.getAdjacentCells(5, 4);
      
      expect(adjacent).toHaveLength(8);
      expect(adjacent).toContainEqual({ x: 4, y: 3 });
      expect(adjacent).toContainEqual({ x: 6, y: 5 });
    });

    it('should handle edge cells correctly', () => {
      const adjacent = pheromoneSystem.getAdjacentCells(0, 0);
      
      expect(adjacent).toHaveLength(3); // Only 3 adjacent cells at corner
      expect(adjacent).toContainEqual({ x: 1, y: 0 });
      expect(adjacent).toContainEqual({ x: 0, y: 1 });
      expect(adjacent).toContainEqual({ x: 1, y: 1 });
    });

    it('should spread pheromone to adjacent cells through diffusion', () => {
      // Deposit strong pheromone
      pheromoneSystem.depositPheromone(5, 4, 'food', 100);
      
      // Run several updates to allow diffusion
      for (let i = 0; i < 5; i++) {
        pheromoneSystem.update();
      }
      
      // Check that adjacent cells now have some pheromone
      const adjacentCells = pheromoneSystem.getAdjacentCells(5, 4);
      let hasSpread = false;
      
      adjacentCells.forEach(({ x, y }) => {
        if (pheromoneSystem.getPheromone(x, y, 'food') > 0) {
          hasSpread = true;
        }
      });
      
      expect(hasSpread).toBe(true);
    });
  });

  describe('Visible Pheromones', () => {
    beforeEach(() => {
      // Create a pattern of pheromones
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      pheromoneSystem.depositPheromone(3, 3, 'exploration', 30);
      pheromoneSystem.depositPheromone(4, 4, 'danger', 75);
      pheromoneSystem.depositPheromone(7, 7, 'home', 40);
    });

    it('should get visible pheromones within bounds', () => {
      const bounds = { left: 2, right: 5, top: 2, bottom: 5 };
      const visible = pheromoneSystem.getVisiblePheromones(bounds);
      
      expect(visible.length).toBe(3); // Should include (2,2), (3,3), (4,4)
      
      const positions = visible.map(v => `${v.x},${v.y}`);
      expect(positions).toContain('2,2');
      expect(positions).toContain('3,3');
      expect(positions).toContain('4,4');
      expect(positions).not.toContain('7,7'); // Outside bounds
    });

    it('should include strongest pheromone info for each visible cell', () => {
      const bounds = { left: 2, right: 5, top: 2, bottom: 5 };
      const visible = pheromoneSystem.getVisiblePheromones(bounds);
      
      const cellAt22 = visible.find(v => v.x === 2 && v.y === 2);
      expect(cellAt22.strongest.type).toBe('food');
      expect(cellAt22.strongest.strength).toBe(50);
      
      const cellAt44 = visible.find(v => v.x === 4 && v.y === 4);
      expect(cellAt44.strongest.type).toBe('danger');
      expect(cellAt44.strongest.strength).toBe(75);
    });

    it('should exclude pheromones below visibility threshold', () => {
      // Add very weak pheromone
      pheromoneSystem.depositPheromone(1, 1, 'food', 0.5);
      
      const bounds = { left: 0, right: 3, top: 0, bottom: 3 };
      const visible = pheromoneSystem.getVisiblePheromones(bounds);
      
      const positions = visible.map(v => `${v.x},${v.y}`);
      expect(positions).not.toContain('1,1');
    });
  });

  describe('System Management', () => {
    it('should resize system correctly', () => {
      // Add some pheromones
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      
      // Resize to larger dimensions
      pheromoneSystem.resize(15, 12);
      
      expect(pheromoneSystem.width).toBe(15);
      expect(pheromoneSystem.height).toBe(12);
      
      // Original data should be preserved
      expect(pheromoneSystem.getPheromone(2, 2, 'food')).toBe(50);
      
      // New cells should be empty
      expect(pheromoneSystem.getPheromone(12, 10, 'food')).toBe(0);
    });

    it('should resize to smaller dimensions and crop data', () => {
      // Add pheromones at edge
      pheromoneSystem.depositPheromone(8, 6, 'food', 50);
      
      // Resize to smaller dimensions
      pheromoneSystem.resize(5, 4);
      
      expect(pheromoneSystem.width).toBe(5);
      expect(pheromoneSystem.height).toBe(4);
      
      // Data outside new bounds should be lost
      expect(() => pheromoneSystem.getPheromone(8, 6, 'food')).not.toThrow();
      expect(pheromoneSystem.getPheromone(8, 6, 'food')).toBe(0); // Invalid position returns 0
    });

    it('should clear all pheromones', () => {
      // Add pheromones
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      pheromoneSystem.depositPheromone(3, 3, 'exploration', 30);
      
      pheromoneSystem.clear();
      
      expect(pheromoneSystem.getPheromone(2, 2, 'food')).toBe(0);
      expect(pheromoneSystem.getPheromone(3, 3, 'exploration')).toBe(0);
    });

    it('should clear specific pheromone type', () => {
      // Add multiple types
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      pheromoneSystem.depositPheromone(2, 2, 'exploration', 30);
      
      pheromoneSystem.clearType('food');
      
      expect(pheromoneSystem.getPheromone(2, 2, 'food')).toBe(0);
      expect(pheromoneSystem.getPheromone(2, 2, 'exploration')).toBe(30);
    });

    it('should provide comprehensive statistics', () => {
      // Add some pheromones
      pheromoneSystem.depositPheromone(2, 2, 'food', 50);
      pheromoneSystem.depositPheromone(3, 3, 'exploration', 30);
      
      pheromoneSystem.update(); // Update to calculate stats
      
      const stats = pheromoneSystem.getStats();
      
      expect(stats.gridDimensions.width).toBe(testWidth);
      expect(stats.gridDimensions.height).toBe(testHeight);
      expect(stats.trailTypes).toHaveLength(4);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.activeTrailCells).toBeGreaterThan(0);
    });

    it('should estimate memory usage correctly', () => {
      const stats = pheromoneSystem.getStats();
      const expectedBytes = testWidth * testHeight * 4 * 4; // width * height * float32Size * gridCount
      
      expect(stats.memoryUsage).toBe(expectedBytes);
    });
  });

  describe('Performance Optimization', () => {
    it('should mark and track dirty partitions', () => {
      const initialCount = pheromoneSystem.dirtyPartitions.size;
      
      pheromoneSystem.depositPheromone(5, 4, 'food', 50);
      pheromoneSystem.depositPheromone(6, 5, 'exploration', 30);
      
      expect(pheromoneSystem.dirtyPartitions.size).toBeGreaterThan(initialCount);
    });

    it('should validate positions correctly', () => {
      expect(pheromoneSystem.isValidPosition(0, 0)).toBe(true);
      expect(pheromoneSystem.isValidPosition(testWidth - 1, testHeight - 1)).toBe(true);
      expect(pheromoneSystem.isValidPosition(-1, 0)).toBe(false);
      expect(pheromoneSystem.isValidPosition(testWidth, 0)).toBe(false);
      expect(pheromoneSystem.isValidPosition(0, testHeight)).toBe(false);
    });

    it('should measure update performance', () => {
      // Add some pheromones to update
      pheromoneSystem.depositPheromone(5, 4, 'food', 50);
      
      pheromoneSystem.update();
      
      const stats = pheromoneSystem.getStats();
      expect(stats.lastUpdateTime).toBeGreaterThanOrEqual(0);
      expect(stats.lastUpdateTime).toBeLessThan(100); // Should be fast for small grid
    });
  });
  
  describe('Performance Optimizations', () => {
    describe('Batch Processing', () => {
      it('should queue deposits for batch processing', () => {
        // Deposit multiple pheromones with batched flag
        pheromoneSystem.depositPheromone(1, 1, 'food', 10, true);
        pheromoneSystem.depositPheromone(2, 2, 'food', 20, true);
        pheromoneSystem.depositPheromone(3, 3, 'exploration', 15, true);
        
        // Should be queued, not immediately applied
        expect(pheromoneSystem.getPheromone(1, 1, 'food')).toBe(0);
        expect(pheromoneSystem.depositionQueue.length).toBe(3);
      });
      
      it('should auto-process batch when threshold reached', () => {
        // Set smaller batch size for testing
        const originalBatchSize = pheromoneSystem.batchSize;
        pheromoneSystem.batchSize = 3;
        
        // Add deposits to trigger batch processing
        pheromoneSystem.depositPheromone(1, 1, 'food', 10, true);
        pheromoneSystem.depositPheromone(2, 2, 'food', 20, true);
        pheromoneSystem.depositPheromone(3, 3, 'exploration', 15, true); // Should trigger batch
        
        // Should be processed now
        expect(pheromoneSystem.getPheromone(1, 1, 'food')).toBe(10);
        expect(pheromoneSystem.getPheromone(2, 2, 'food')).toBe(20);
        expect(pheromoneSystem.getPheromone(3, 3, 'exploration')).toBe(15);
        expect(pheromoneSystem.depositionQueue.length).toBe(0);
        
        // Restore original batch size
        pheromoneSystem.batchSize = originalBatchSize;
      });
      
      it('should manually flush batch', () => {
        pheromoneSystem.depositPheromone(5, 5, 'home', 25, true);
        expect(pheromoneSystem.getPheromone(5, 5, 'home')).toBe(0);
        
        pheromoneSystem.flushBatch();
        expect(pheromoneSystem.getPheromone(5, 5, 'home')).toBe(25);
        expect(pheromoneSystem.depositionQueue.length).toBe(0);
      });
    });
    
    describe('Spatial Partitioning', () => {
      it('should mark partitions as dirty when depositing', () => {
        const initialDirtyCount = pheromoneSystem.dirtyPartitions.size;
        
        pheromoneSystem.depositPheromone(5, 4, 'food', 30); // Within test grid bounds
        
        expect(pheromoneSystem.dirtyPartitions.size).toBeGreaterThan(initialDirtyCount);
      });
      
      it('should calculate partition coordinates correctly', () => {
        // Test partition calculation (32x32 partitions)
        const coords1 = pheromoneSystem._getPartitionCoords(0);
        expect(coords1).toEqual({ x: 0, y: 0 });
        
        const coords2 = pheromoneSystem._getPartitionCoords(5);
        // Assuming grid width results in specific partition layout
        expect(coords2.x).toBeGreaterThanOrEqual(0);
        expect(coords2.y).toBeGreaterThanOrEqual(0);
      });
      
      it('should calculate partition bounds correctly', () => {
        const bounds = pheromoneSystem._getPartitionBounds(0, 0);
        expect(bounds.left).toBe(0);
        expect(bounds.top).toBe(0);
        expect(bounds.right).toBeLessThanOrEqual(32);
        expect(bounds.bottom).toBeLessThanOrEqual(32);
        
        const bounds2 = pheromoneSystem._getPartitionBounds(1, 1);
        expect(bounds2.left).toBe(32);
        expect(bounds2.top).toBe(32);
      });
      
      it('should only update dirty partitions', () => {
        // Clear all partitions
        pheromoneSystem.dirtyPartitions.clear();
        
        // Add pheromone to make a partition dirty
        pheromoneSystem.depositPheromone(5, 4, 'food', 40);
        
        const dirtyCount = pheromoneSystem.dirtyPartitions.size;
        expect(dirtyCount).toBeGreaterThan(0);
        
        // Update should clear dirty partitions
        pheromoneSystem.update();
        expect(pheromoneSystem.dirtyPartitions.size).toBe(0);
      });
    });
    
    it('should report performance statistics', () => {
      pheromoneSystem.depositPheromone(1, 1, 'food', 10);
      pheromoneSystem.update();
      
      const stats = pheromoneSystem.getStats();
      expect(stats).toHaveProperty('dirtyPartitionCount');
      expect(stats).toHaveProperty('lastUpdateTime');
      expect(stats).toHaveProperty('gridDimensions');
      expect(stats.gridDimensions.width).toBe(10);
      expect(stats.gridDimensions.height).toBe(8);
    });
  });
});