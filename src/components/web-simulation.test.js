/**
 * Tests for WebSimulation - Scalable World Generation
 * TDD approach for Phase 1 enhancements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

// Fixed seed so worlds and ticks are reproducible; override with TEST_SEED=n
const TEST_SEED = Number(process.env.TEST_SEED ?? 20261014)

describe('WebSimulation - Scalable World Generation', () => {
  let simulation

  beforeEach(() => {
    simulation = new WebSimulation({ seed: TEST_SEED })
  })

  afterEach(() => {
    if (simulation.isRunning) {
      simulation.stop()
    }
    vi.clearAllMocks()
  })

  describe('World Size Options', () => {
    it('should support small world size (100x75)', async () => {
      const config = { worldSize: 'small' }
      const state = await simulation.initializeColony('forest_floor', config)
      
      expect(state.environment.metadata.width).toBe(100)
      expect(state.environment.metadata.height).toBe(75)
      expect(state.environment.terrain.length).toBe(75)
      expect(state.environment.terrain[0].length).toBe(100)
    })

    it('should support medium world size (200x150)', async () => {
      const config = { worldSize: 'medium' }
      const state = await simulation.initializeColony('forest_floor', config)
      
      expect(state.environment.metadata.width).toBe(200)
      expect(state.environment.metadata.height).toBe(150)
      expect(state.environment.terrain.length).toBe(150)
      expect(state.environment.terrain[0].length).toBe(200)
    })

    it('should support large world size (300x200)', async () => {
      const config = { worldSize: 'large' }
      const state = await simulation.initializeColony('forest_floor', config)
      
      expect(state.environment.metadata.width).toBe(300)
      expect(state.environment.metadata.height).toBe(200)
      expect(state.environment.terrain.length).toBe(200)
      expect(state.environment.terrain[0].length).toBe(300)
    })

    it('should support huge world size (500x300)', async () => {
      const config = { worldSize: 'huge' }
      const state = await simulation.initializeColony('forest_floor', config)
      
      expect(state.environment.metadata.width).toBe(500)
      expect(state.environment.metadata.height).toBe(300)
      expect(state.environment.terrain.length).toBe(300)
      expect(state.environment.terrain[0].length).toBe(500)
    })

    it('should default to current size when no worldSize specified', async () => {
      const state = await simulation.initializeColony('forest_floor')
      
      expect(state.environment.metadata.width).toBe(75)
      expect(state.environment.metadata.height).toBe(50)
    })

    it('should accept custom width/height directly', async () => {
      const config = { width: 400, height: 250 }
      const state = await simulation.initializeColony('forest_floor', config)
      
      expect(state.environment.metadata.width).toBe(400)
      expect(state.environment.metadata.height).toBe(250)
    })
  })

  describe('Performance Requirements', () => {
    it('should generate small worlds under 50ms', async () => {
      const startTime = performance.now()
      const config = { worldSize: 'small' }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(50)
    })

    it('should generate medium worlds under 100ms', async () => {
      const startTime = performance.now()
      const config = { worldSize: 'medium' }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(100)
    })

    it('should generate large worlds under 200ms', async () => {
      const startTime = performance.now()
      const config = { worldSize: 'large' }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(200)
    })

    it('should generate huge worlds under 500ms', async () => {
      const startTime = performance.now()
      const config = { worldSize: 'huge' }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(500)
    })
  })

  describe('Memory Efficiency', () => {
    it('should handle memory efficiently for large worlds', async () => {
      const config = { worldSize: 'large' }
      
      // Memory usage before
      const initialMemory = performance.memory?.usedJSHeapSize || 0
      
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Memory usage after  
      const afterMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = afterMemory - initialMemory
      
      // Should not use more than 50MB for a large world
      const maxMemoryIncrease = 50 * 1024 * 1024 // 50MB in bytes
      
      if (performance.memory) {
        expect(memoryIncrease).toBeLessThan(maxMemoryIncrease)
      }
      
      // Verify world was created properly
      expect(state.environment).toBeDefined()
      expect(state.ants).toBeDefined()
    })
  })

  describe('Terrain Generation Quality', () => {
    it('should maintain proper nest placement in center for all sizes', async () => {
      const sizes = ['small', 'medium', 'large']
      
      for (const worldSize of sizes) {
        const config = { worldSize }
        const state = await simulation.initializeColony('forest_floor', config)
        
        const { width, height } = state.environment.metadata
        const centerX = Math.floor(width / 2)
        const centerY = Math.floor(height / 2)
        
        // Check that nest is in center area
        let nestFound = false
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const x = centerX + dx
            const y = centerY + dy
            if (y >= 0 && y < height && x >= 0 && x < width) {
              if (state.environment.terrain[y][x] === '🏠') {
                nestFound = true
                break
              }
            }
          }
          if (nestFound) break
        }
        
        expect(nestFound).toBe(true)
      }
    })

    it('should scale food sources appropriately with world size', async () => {
      const smallState = await simulation.initializeColony('forest_floor', { worldSize: 'small' })
      const largeState = await simulation.initializeColony('forest_floor', { worldSize: 'large' })
      
      const smallFoodCount = smallState.environment.foodSources.length
      const largeFoodCount = largeState.environment.foodSources.length
      
      // Large world should have more food sources
      expect(largeFoodCount).toBeGreaterThan(smallFoodCount)
      
      // Should roughly scale with area (large is 8x bigger than small)
      const expectedRatio = (300 * 200) / (100 * 75) // large area / small area = 8
      const actualRatio = largeFoodCount / smallFoodCount
      
      // Allow reasonable variance for random generation and scaling algorithm
      // Our implementation uses linear scaling capped at 10x, so should be in range [2, 16]
      expect(actualRatio).toBeGreaterThan(2)
      expect(actualRatio).toBeLessThan(16)
      
      // Should be in reasonable proportion to area ratio
      expect(actualRatio).toBeGreaterThan(expectedRatio * 0.3)
      expect(actualRatio).toBeLessThan(expectedRatio * 2)
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing API', async () => {
      // Old API call should still work
      const state = await simulation.initializeColony('forest_floor')
      
      expect(state.environment).toBeDefined()
      expect(state.ants).toBeDefined()
      expect(state.environment.metadata.width).toBe(75)
      expect(state.environment.metadata.height).toBe(50)
    })

    it('should support legacy biome parameter as first argument', async () => {
      const state = await simulation.initializeColony('desert', { worldSize: 'medium' })
      
      expect(state.biome).toBe('desert')
      expect(state.environment.metadata.width).toBe(200)
      expect(state.environment.metadata.height).toBe(150)
    })
  })
})