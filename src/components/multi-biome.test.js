/**
 * Tests for Multi-Biome World Generation - Phase 3 Implementation
 * TDD approach for Phase 3: Complex Terrain & Biomes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

describe('WebSimulation - Multi-Biome Support', () => {
  let simulation

  beforeEach(() => {
    simulation = new WebSimulation()
  })

  afterEach(() => {
    if (simulation.isRunning) {
      simulation.stop()
    }
    vi.clearAllMocks()
  })

  describe('Multi-Biome World Generation', () => {
    it('should generate worlds with multiple biomes when specified', async () => {
      const config = { 
        worldSize: 'medium',
        biomeTypes: ['forest_floor', 'desert', 'grassland'],
        biomeDistribution: 'zoned' // Create distinct zones
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      // Verify multiple biomes exist in the world
      expect(state.environment.metadata.biome).toBe('multi_biome')
      expect(state.environment.metadata.biomeTypes).toEqual(['forest_floor', 'desert', 'grassland'])
      expect(state.environment.biomeMap).toBeDefined()
      
      // Verify biome map has correct dimensions
      expect(state.environment.biomeMap.length).toBe(150) // medium world height
      expect(state.environment.biomeMap[0].length).toBe(200) // medium world width
    })

    it('should create distinct biome zones with transition areas', async () => {
      const config = { 
        worldSize: 'large',
        biomeTypes: ['forest_floor', 'desert'],
        biomeDistribution: 'zoned'
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      // Check that we have both biomes present
      const biomeMap = state.environment.biomeMap
      const presentBiomes = new Set()
      
      for (let y = 0; y < biomeMap.length; y++) {
        for (let x = 0; x < biomeMap[y].length; x++) {
          presentBiomes.add(biomeMap[y][x])
        }
      }
      
      expect(presentBiomes.has('forest_floor')).toBe(true)
      expect(presentBiomes.has('desert')).toBe(true)
      expect(presentBiomes.size).toBeGreaterThanOrEqual(2)
    })

    it('should generate appropriate terrain for each biome zone', async () => {
      const config = { 
        worldSize: 'small',
        biomeTypes: ['forest_floor', 'desert'],
        biomeDistribution: 'zoned'
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      const terrain = state.environment.terrain
      const biomeMap = state.environment.biomeMap
      
      // Check specific locations have terrain appropriate to their biome
      let foundForestTerrain = false
      let foundDesertTerrain = false
      
      for (let y = 1; y < terrain.length - 1; y++) {
        for (let x = 1; x < terrain[y].length - 1; x++) {
          const biome = biomeMap[y][x]
          const terrainCell = terrain[y][x]
          
          if (biome === 'forest_floor' && terrainCell === '🌱') {
            foundForestTerrain = true
          }
          if (biome === 'desert' && terrainCell === '🏔') {
            foundDesertTerrain = true
          }
        }
      }
      
      // We should find terrain appropriate to each biome
      expect(foundForestTerrain).toBe(true)
      expect(foundDesertTerrain).toBe(true)
    })
  })

  describe('Biome Distribution Patterns', () => {
    it('should support random biome distribution', async () => {
      const config = { 
        worldSize: 'medium',
        biomeTypes: ['forest_floor', 'grassland', 'desert'],
        biomeDistribution: 'random',
        biomeRandomness: 0.3 // 30% chance to change biome per cell
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      expect(state.environment.metadata.biomeDistribution).toBe('random')
      expect(state.environment.biomeMap).toBeDefined()
      
      // Verify we have reasonable distribution (not all one biome)
      const biomeMap = state.environment.biomeMap
      const biomeCounts = {}
      
      for (let y = 0; y < biomeMap.length; y++) {
        for (let x = 0; x < biomeMap[y].length; x++) {
          const biome = biomeMap[y][x]
          biomeCounts[biome] = (biomeCounts[biome] || 0) + 1
        }
      }
      
      // Should have at least 2 different biomes present
      expect(Object.keys(biomeCounts).length).toBeGreaterThanOrEqual(2)
    })

    it('should support striped biome distribution', async () => {
      const config = { 
        worldSize: 'small',
        biomeTypes: ['forest_floor', 'desert'],
        biomeDistribution: 'striped',
        stripeDirection: 'horizontal'
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      expect(state.environment.metadata.biomeDistribution).toBe('striped')
      
      // Verify horizontal stripes - same biome across each row
      const biomeMap = state.environment.biomeMap
      for (let y = 0; y < biomeMap.length; y++) {
        const rowBiome = biomeMap[y][0]
        for (let x = 1; x < biomeMap[y].length; x++) {
          expect(biomeMap[y][x]).toBe(rowBiome)
        }
      }
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with single biome worlds', async () => {
      // Old API call should still work
      const state = await simulation.initializeColony('forest_floor')
      
      expect(state.environment.metadata.biome).toBe('forest_floor')
      expect(state.environment.biomeMap).toBeUndefined() // Single biome doesn't need biomeMap
    })

    it('should support legacy biome parameter with single biome', async () => {
      const state = await simulation.initializeColony('desert', { worldSize: 'medium' })
      
      expect(state.biome).toBe('desert')
      expect(state.environment.metadata.biome).toBe('desert')
      expect(state.environment.biomeMap).toBeUndefined() // Single biome doesn't need biomeMap
    })
  })

  describe('Performance Requirements', () => {
    it('should generate multi-biome medium worlds under 150ms', async () => {
      const startTime = performance.now()
      const config = { 
        worldSize: 'medium',
        biomeTypes: ['forest_floor', 'desert', 'grassland'],
        biomeDistribution: 'zoned'
      }
      
      await simulation.initializeColony('multi_biome', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(150)
    })

    it('should generate multi-biome large worlds under 300ms', async () => {
      const startTime = performance.now()
      const config = { 
        worldSize: 'large',
        biomeTypes: ['forest_floor', 'desert'],
        biomeDistribution: 'zoned'
      }
      
      await simulation.initializeColony('multi_biome', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(300)
    })
  })
})