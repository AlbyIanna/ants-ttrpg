/**
 * Tests for Terrain Features System - Phase 3 Implementation
 * TDD approach for Phase 3: Complex Terrain & Biomes - Terrain Features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

// Fixed seed so worlds and ticks are reproducible; override with TEST_SEED=n
const TEST_SEED = Number(process.env.TEST_SEED ?? 20261014)

describe('WebSimulation - Terrain Features', () => {
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

  describe('River Generation', () => {
    it('should generate rivers when terrain features are enabled', async () => {
      const config = { 
        worldSize: 'medium',
        terrainFeatures: {
          rivers: { enabled: true, count: 2, width: 2 }
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Verify rivers exist in terrain
      expect(state.environment.metadata.terrainFeatures.rivers).toBeDefined()
      expect(state.environment.metadata.terrainFeatures.rivers.count).toBe(2)
      
      // Check that river tiles exist in terrain
      const terrain = state.environment.terrain
      let riverTileCount = 0
      
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '🌊') { // River tile
            riverTileCount++
          }
        }
      }
      
      expect(riverTileCount).toBeGreaterThan(0)
    })

    it('should generate connected river paths', async () => {
      const config = { 
        worldSize: 'small',
        terrainFeatures: {
          rivers: { enabled: true, count: 1, width: 1 }
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      const terrain = state.environment.terrain
      const riverTiles = []
      
      // Find all river tiles
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '🌊') {
            riverTiles.push({ x, y })
          }
        }
      }
      
      // Rivers should have connected paths (adjacent tiles)
      expect(riverTiles.length).toBeGreaterThan(5) // Minimum river length
      
      // Check that river tiles form connected paths
      let connectedTiles = 0
      riverTiles.forEach(tile => {
        const adjacent = riverTiles.filter(other => 
          Math.abs(tile.x - other.x) <= 1 && Math.abs(tile.y - other.y) <= 1 && 
          (tile.x !== other.x || tile.y !== other.y)
        )
        if (adjacent.length > 0) connectedTiles++
      })
      
      expect(connectedTiles).toBeGreaterThan(riverTiles.length * 0.7) // Most tiles should be connected
    })
  })

  describe('Mountain Generation', () => {
    it('should generate mountain ranges when enabled', async () => {
      const config = { 
        worldSize: 'large',
        terrainFeatures: {
          mountains: { enabled: true, ranges: 2, size: 'medium' }
        }
      }
      const state = await simulation.initializeColony('desert', config)
      
      // Verify mountains exist in terrain
      expect(state.environment.metadata.terrainFeatures.mountains).toBeDefined()
      expect(state.environment.metadata.terrainFeatures.mountains.ranges).toBe(2)
      
      // Check that mountain tiles exist in terrain
      const terrain = state.environment.terrain
      let mountainTileCount = 0
      
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '⛰️') { // Mountain tile
            mountainTileCount++
          }
        }
      }
      
      expect(mountainTileCount).toBeGreaterThan(20) // Sufficient mountain coverage
    })

    it('should create clustered mountain formations', async () => {
      const config = { 
        worldSize: 'medium',
        terrainFeatures: {
          mountains: { enabled: true, ranges: 1, size: 'large' }
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      const terrain = state.environment.terrain
      const mountainTiles = []
      
      // Find all mountain tiles
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '⛰️') {
            mountainTiles.push({ x, y })
          }
        }
      }
      
      // Mountains should be clustered (most tiles have mountain neighbors)
      let clusteredTiles = 0
      mountainTiles.forEach(tile => {
        const neighbors = mountainTiles.filter(other => 
          Math.abs(tile.x - other.x) <= 1 && Math.abs(tile.y - other.y) <= 1 && 
          (tile.x !== other.x || tile.y !== other.y)
        )
        if (neighbors.length > 0) clusteredTiles++
      })
      
      expect(clusteredTiles).toBeGreaterThan(mountainTiles.length * 0.6) // Most mountains should be clustered
    })
  })

  describe('Forest Generation', () => {
    it('should generate dense forest areas when enabled', async () => {
      const config = { 
        worldSize: 'medium',
        terrainFeatures: {
          forests: { enabled: true, patches: 3, density: 0.7 }
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Verify forests exist in terrain metadata
      expect(state.environment.metadata.terrainFeatures.forests).toBeDefined()
      expect(state.environment.metadata.terrainFeatures.forests.patches).toBe(3)
      
      // Check that forest tiles exist in terrain
      const terrain = state.environment.terrain
      let forestTileCount = 0
      
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '🌲') { // Forest tile
            forestTileCount++
          }
        }
      }
      
      expect(forestTileCount).toBeGreaterThan(50) // Substantial forest coverage
    })

    it('should create forest patches with appropriate density', async () => {
      const config = { 
        worldSize: 'small',
        terrainFeatures: {
          forests: { enabled: true, patches: 2, density: 0.8 }
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      const terrain = state.environment.terrain
      const forestTiles = []
      
      // Find all forest tiles
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          if (terrain[y][x] === '🌲') {
            forestTiles.push({ x, y })
          }
        }
      }
      
      // Forest tiles should be in dense patches
      let denseAreas = 0
      forestTiles.forEach(tile => {
        const neighbors = forestTiles.filter(other => 
          Math.abs(tile.x - other.x) <= 2 && Math.abs(tile.y - other.y) <= 2 && 
          (tile.x !== other.x || tile.y !== other.y)
        )
        if (neighbors.length >= 3) denseAreas++ // Dense if 3+ forest neighbors in 5x5 area
      })
      
      expect(denseAreas).toBeGreaterThan(forestTiles.length * 0.5) // Most forest tiles should be in dense areas
    })
  })

  describe('Combined Terrain Features', () => {
    it('should generate multiple terrain features together without conflicts', async () => {
      const config = { 
        worldSize: 'large',
        terrainFeatures: {
          rivers: { enabled: true, count: 1, width: 1 },
          mountains: { enabled: true, ranges: 1, size: 'small' },
          forests: { enabled: true, patches: 2, density: 0.6 }
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      const terrain = state.environment.terrain
      let riverTiles = 0, mountainTiles = 0, forestTiles = 0
      
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          const cell = terrain[y][x]
          if (cell === '🌊') riverTiles++
          if (cell === '⛰️') mountainTiles++
          if (cell === '🌲') forestTiles++
        }
      }
      
      // All terrain features should be present
      expect(riverTiles).toBeGreaterThan(0)
      expect(mountainTiles).toBeGreaterThan(0)
      expect(forestTiles).toBeGreaterThan(0)
      
      // Verify metadata tracks all features
      const features = state.environment.metadata.terrainFeatures
      expect(features.rivers).toBeDefined()
      expect(features.mountains).toBeDefined()
      expect(features.forests).toBeDefined()
    })

    it('should handle terrain features in multi-biome worlds', async () => {
      const config = { 
        worldSize: 'medium',
        biomeTypes: ['forest_floor', 'desert'],
        biomeDistribution: 'zoned',
        terrainFeatures: {
          rivers: { enabled: true, count: 1, width: 2 },
          mountains: { enabled: true, ranges: 1, size: 'medium' }
        }
      }
      const state = await simulation.initializeColony('multi_biome', config)
      
      // Should have both biome map and terrain features
      expect(state.environment.biomeMap).toBeDefined()
      expect(state.environment.metadata.terrainFeatures).toBeDefined()
      
      const terrain = state.environment.terrain
      let hasRivers = false, hasMountains = false
      
      for (let y = 0; y < terrain.length; y++) {
        for (let x = 0; x < terrain[y].length; x++) {
          const cell = terrain[y][x]
          if (cell === '🌊') hasRivers = true
          if (cell === '⛰️') hasMountains = true
        }
      }
      
      expect(hasRivers).toBe(true)
      expect(hasMountains).toBe(true)
    })
  })

  describe('Performance Requirements', () => {
    it('should generate terrain features for medium worlds under 200ms', async () => {
      const startTime = performance.now()
      const config = { 
        worldSize: 'medium',
        terrainFeatures: {
          rivers: { enabled: true, count: 2, width: 2 },
          mountains: { enabled: true, ranges: 2, size: 'medium' },
          forests: { enabled: true, patches: 3, density: 0.7 }
        }
      }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(200)
    })

    it('should generate terrain features for large worlds under 400ms', async () => {
      const startTime = performance.now()
      const config = { 
        worldSize: 'large',
        terrainFeatures: {
          rivers: { enabled: true, count: 3, width: 3 },
          mountains: { enabled: true, ranges: 2, size: 'large' },
          forests: { enabled: true, patches: 4, density: 0.8 }
        }
      }
      
      await simulation.initializeColony('grassland', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(400)
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without terrain features config (default behavior)', async () => {
      const state = await simulation.initializeColony('forest_floor', { worldSize: 'small' })
      
      // Should work normally without terrain features
      expect(state.environment.terrain).toBeDefined()
      expect(state.environment.metadata.terrainFeatures).toBeUndefined()
    })

    it('should support legacy initialization without breaking', async () => {
      const state = await simulation.initializeColony('desert')
      
      // Legacy call should work as before
      expect(state.environment.metadata.biome).toBe('desert')
      expect(state.environment.terrain).toBeDefined()
    })
  })
})