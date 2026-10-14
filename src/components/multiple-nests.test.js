/**
 * Tests for Multiple Nest Support System - Phase 3 Implementation
 * TDD approach for Phase 3: Complex Terrain & Biomes - Territory System
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

describe('WebSimulation - Multiple Nests Support', () => {
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

  describe('Multiple Nest Configuration', () => {
    it('should support creating worlds with multiple nests', async () => {
      const config = {
        worldSize: 'large',
        nestCount: 3,
        nestSpacing: 'distributed'
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Should have multiple nests
      expect(state.nests).toBeDefined()
      expect(state.nests.length).toBe(3)
      
      // Each nest should have proper configuration
      state.nests.forEach((nest, index) => {
        expect(nest.id).toBe(index)
        expect(nest.position).toBeDefined()
        expect(nest.position.x).toBeGreaterThanOrEqual(5)
        expect(nest.position.y).toBeGreaterThanOrEqual(5)
        expect(nest.colony).toBeDefined()
        expect(nest.colony.id).toBe(index)
      })
    })

    it('should maintain minimum distance between nests', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 4,
        nestSpacing: 'distributed',
        minNestDistance: 20
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Verify minimum distance between all nests
      for (let i = 0; i < state.nests.length; i++) {
        for (let j = i + 1; j < state.nests.length; j++) {
          const nest1 = state.nests[i]
          const nest2 = state.nests[j]
          const distance = Math.sqrt(
            Math.pow(nest1.position.x - nest2.position.x, 2) + 
            Math.pow(nest1.position.y - nest2.position.y, 2)
          )
          expect(distance).toBeGreaterThanOrEqual(config.minNestDistance)
        }
      }
    })

    it('should support different nest placement patterns', async () => {
      // Test corners placement
      const cornersConfig = {
        worldSize: 'large',
        nestCount: 4,
        nestSpacing: 'corners'
      }
      const cornersState = await simulation.initializeColony('desert', cornersConfig)
      
      expect(cornersState.nests.length).toBe(4)
      
      // Verify nests are placed near corners
      const { width, height } = cornersState.environment.metadata
      const cornerRegions = [
        { x: width * 0.25, y: height * 0.25 }, // Top-left area
        { x: width * 0.75, y: height * 0.25 }, // Top-right area
        { x: width * 0.25, y: height * 0.75 }, // Bottom-left area
        { x: width * 0.75, y: height * 0.75 }  // Bottom-right area
      ]
      
      cornersState.nests.forEach(nest => {
        const nearCorner = cornerRegions.some(corner => {
          const distance = Math.sqrt(
            Math.pow(nest.position.x - corner.x, 2) + 
            Math.pow(nest.position.y - corner.y, 2)
          )
          return distance < 30 // Within corner region
        })
        expect(nearCorner).toBe(true)
      })
    })
  })

  describe('Colony Territories', () => {
    it('should create territory boundaries for each colony', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 3,
        territorySystem: { enabled: true, type: 'voronoi' }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Should have territory map
      expect(state.environment.territoryMap).toBeDefined()
      
      const { width, height } = state.environment.metadata
      let territoryCells = 0
      
      // Count territory assignments
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const territory = state.environment.territoryMap[y][x]
          if (territory !== null && territory !== undefined) {
            expect(territory).toBeGreaterThanOrEqual(0)
            expect(territory).toBeLessThan(state.nests.length)
            territoryCells++
          }
        }
      }
      
      // Most of the world should have territory assignments
      expect(territoryCells).toBeGreaterThan((width * height) * 0.8)
    })

    it('should support different territory division algorithms', async () => {
      // Test grid-based territories
      const gridConfig = {
        worldSize: 'small',
        nestCount: 4,
        territorySystem: { enabled: true, type: 'grid' }
      }
      const gridState = await simulation.initializeColony('grassland', gridConfig)
      
      expect(gridState.environment.territoryMap).toBeDefined()
      
      // Verify grid-like territory divisions
      const territoryMap = gridState.environment.territoryMap
      const { width, height } = gridState.environment.metadata
      
      // Check that territories form roughly rectangular regions
      let gridLikeStructure = true
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const currentTerritory = territoryMap[y][x]
          const neighbors = [
            territoryMap[y-1][x], territoryMap[y+1][x],
            territoryMap[y][x-1], territoryMap[y][x+1]
          ]
          
          // In grid-based division, most cells should have neighbors of same territory
          const sameTerritory = neighbors.filter(t => t === currentTerritory).length
          if (sameTerritory < 2) {
            gridLikeStructure = false
            break
          }
        }
        if (!gridLikeStructure) break
      }
      
      expect(gridLikeStructure).toBe(true)
    })

    it('should create neutral zones between territories', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 3,
        territorySystem: { 
          enabled: true, 
          type: 'voronoi',
          neutralZones: true,
          neutralZoneWidth: 3
        }
      }
      const state = await simulation.initializeColony('desert', config)
      
      const territoryMap = state.environment.territoryMap
      const { width, height } = state.environment.metadata
      
      // Find neutral zones (marked as -1)
      let neutralCells = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (territoryMap[y][x] === -1) {
            neutralCells++
          }
        }
      }
      
      // Should have some neutral zones
      expect(neutralCells).toBeGreaterThan(0)
      expect(neutralCells).toBeLessThan((width * height) * 0.3) // Not too many
    })
  })

  describe('Inter-Colony Dynamics', () => {
    it('should manage separate ant populations for each colony', async () => {
      const config = {
        worldSize: 'large',
        nestCount: 3,
        antsPerColony: 8
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Total ants should be divided among colonies
      expect(state.ants.length).toBe(config.nestCount * config.antsPerColony)
      
      // Each ant should belong to a specific colony
      state.ants.forEach(ant => {
        expect(ant.colonyId).toBeDefined()
        expect(ant.colonyId).toBeGreaterThanOrEqual(0)
        expect(ant.colonyId).toBeLessThan(config.nestCount)
      })
      
      // Verify ant distribution
      const colonyAntCounts = new Array(config.nestCount).fill(0)
      state.ants.forEach(ant => {
        colonyAntCounts[ant.colonyId]++
      })
      
      colonyAntCounts.forEach(count => {
        expect(count).toBe(config.antsPerColony)
      })
    })

    it('should track separate food storage for each colony', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 2,
        antsPerColony: 5
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Each nest should have separate food storage
      state.nests.forEach(nest => {
        expect(nest.colony.food).toBeDefined()
        expect(nest.colony.food).toBeGreaterThanOrEqual(0)
        expect(nest.colony.population).toBeDefined()
        expect(nest.colony.population.total).toBe(config.antsPerColony)
      })
    })

    it('should support inter-colony interactions and conflicts', async () => {
      const config = {
        worldSize: 'large',
        nestCount: 2,
        antsPerColony: 10,
        interColonyDynamics: {
          enabled: true,
          aggressionLevel: 0.3,
          territorialBehavior: true
        }
      }
      const state = await simulation.initializeColony('desert', config)
      
      // Should have inter-colony interaction settings
      expect(state.environment.metadata.interColonyDynamics).toBeDefined()
      expect(state.environment.metadata.interColonyDynamics.enabled).toBe(true)
      
      // Each colony should have aggression/diplomacy stats
      state.nests.forEach(nest => {
        expect(nest.colony.diplomacy).toBeDefined()
        expect(nest.colony.territorialControl).toBeDefined()
      })
    })
  })

  describe('Resource Competition', () => {
    it('should distribute food sources across territories', async () => {
      const config = {
        worldSize: 'large',
        nestCount: 3,
        resourceDistribution: 'territorial'
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Food sources should be distributed among territories
      const foodByTerritory = new Array(config.nestCount).fill(0)
      
      state.environment.foodSources.forEach(food => {
        const territory = state.environment.territoryMap[food.y][food.x]
        if (territory >= 0 && territory < config.nestCount) {
          foodByTerritory[territory]++
        }
      })
      
      // Each territory should have some food sources
      foodByTerritory.forEach(count => {
        expect(count).toBeGreaterThan(0)
      })
    })

    it('should handle contested resource zones', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 2,
        territorySystem: { 
          enabled: true,
          type: 'voronoi',
          neutralZones: true
        },
        resourceDistribution: 'contested'
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Some food sources should be in neutral zones
      let neutralFoodSources = 0
      state.environment.foodSources.forEach(food => {
        const territory = state.environment.territoryMap[food.y][food.x]
        if (territory === -1) { // Neutral zone
          neutralFoodSources++
        }
      })
      
      expect(neutralFoodSources).toBeGreaterThan(0)
    })
  })

  describe('Performance Requirements', () => {
    it('should handle multiple nests for medium worlds under 250ms', async () => {
      const startTime = performance.now()
      const config = {
        worldSize: 'medium',
        nestCount: 4,
        antsPerColony: 10,
        territorySystem: { enabled: true, type: 'voronoi' }
      }
      
      await simulation.initializeColony('forest_floor', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(250)
    })

    it('should handle multiple nests for large worlds under 500ms', async () => {
      const startTime = performance.now()
      const config = {
        worldSize: 'large',
        nestCount: 6,
        antsPerColony: 15,
        territorySystem: { enabled: true, type: 'grid' },
        interColonyDynamics: { enabled: true }
      }
      
      await simulation.initializeColony('desert', config)
      
      const generationTime = performance.now() - startTime
      expect(generationTime).toBeLessThan(500)
    })
  })

  describe('Backward Compatibility', () => {
    it('should default to single nest when nestCount not specified', async () => {
      const state = await simulation.initializeColony('forest_floor', { worldSize: 'small' })
      
      // Should have single nest behavior
      expect(state.nests).toBeDefined()
      expect(state.nests.length).toBe(1)
      // The single nest sits on the centre cell, rounded down (75 high -> row 37)
      expect(state.nests[0].position.x).toBe(Math.floor(state.environment.metadata.width / 2))
      expect(state.nests[0].position.y).toBe(Math.floor(state.environment.metadata.height / 2))
    })

    it('should support legacy single-nest API', async () => {
      const state = await simulation.initializeColony('grassland')
      
      // Legacy behavior should still work
      expect(state.environment.metadata.biome).toBe('grassland')
      expect(state.nests.length).toBe(1)
      expect(state.ants.every(ant => ant.colonyId === 0)).toBe(true)
    })

    it('should handle mixed configuration gracefully', async () => {
      const config = {
        worldSize: 'medium',
        nestCount: 2,
        terrainFeatures: {
          rivers: { enabled: true, count: 1, width: 2 }
        },
        biomeTypes: ['forest_floor', 'grassland'],
        biomeDistribution: 'zoned'
      }
      
      const state = await simulation.initializeColony('multi_biome', config)
      
      // Should work with terrain features and multi-biome
      expect(state.nests.length).toBe(2)
      expect(state.environment.biomeMap).toBeDefined()
      expect(state.environment.metadata.terrainFeatures).toBeDefined()
      expect(state.environment.territoryMap).toBeDefined()
    })
  })
})