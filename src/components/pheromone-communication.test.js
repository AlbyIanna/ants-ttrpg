/**
 * Tests for Pheromone Communication System - Phase 4 Implementation
 * TDD approach for Phase 4: Enhanced AI & Behaviors - Pheromone Communication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

describe('WebSimulation - Pheromone Communication System', () => {
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

  describe('Pheromone Trail Creation', () => {
    it('should create pheromone trails when ants move', async () => {
      const config = {
        worldSize: 'small',
        pheromoneSystem: {
          enabled: true,
          trailStrength: 1.0,
          decayRate: 0.1
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Should have pheromone system initialized
      expect(state.environment.pheromoneMap).toBeDefined()
      expect(state.environment.metadata.pheromoneSystem).toBeDefined()
      expect(state.environment.metadata.pheromoneSystem.enabled).toBe(true)
      
      // Simulate some ant movement
      simulation.update()
      simulation.update()
      
      // Should have pheromone trails
      const pheromoneMap = state.environment.pheromoneMap
      let trailCount = 0
      
      for (let y = 0; y < pheromoneMap.length; y++) {
        for (let x = 0; x < pheromoneMap[y].length; x++) {
          if (pheromoneMap[y][x] > 0) {
            trailCount++
          }
        }
      }
      
      expect(trailCount).toBeGreaterThan(0)
    })

    it('should differentiate between exploration and food trail pheromones', async () => {
      const config = {
        worldSize: 'small',
        pheromoneSystem: {
          enabled: true,
          trailTypes: ['exploration', 'food'],
          strengthMultipliers: { exploration: 0.5, food: 1.5 }
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Should have multi-type pheromone system
      expect(state.environment.pheromoneTypes).toBeDefined()
      expect(state.environment.pheromoneTypes.exploration).toBeDefined()
      expect(state.environment.pheromoneTypes.food).toBeDefined()
      
      // Simulate ant finding food
      const ant = state.ants.find(a => a.role === 'worker')
      const foodSource = state.environment.foodSources[0]
      
      if (ant && foodSource) {
        // Move ant to food
        ant.position.x = foodSource.x
        ant.position.y = foodSource.y
        ant.carryingFood = true
        ant.state = 'returning'
        
        simulation.update()
        
        // Should create stronger food trail
        const foodPheromones = state.environment.pheromoneTypes.food
        let foodTrailStrength = 0
        
        for (let y = 0; y < foodPheromones.length; y++) {
          for (let x = 0; x < foodPheromones[y].length; x++) {
            foodTrailStrength = Math.max(foodTrailStrength, foodPheromones[y][x])
          }
        }
        
        expect(foodTrailStrength).toBeGreaterThan(0)
      }
    })

    it('should allow ants to follow existing pheromone trails', async () => {
      const config = {
        worldSize: 'medium',
        startingPopulation: 10,
        pheromoneSystem: {
          enabled: true,
          followProbability: 0.8,
          trailInfluence: 2.0
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Create artificial pheromone trail
      const trail = [
        { x: 50, y: 30 }, { x: 51, y: 30 }, { x: 52, y: 30 },
        { x: 53, y: 30 }, { x: 54, y: 30 }, { x: 55, y: 30 }
      ]
      
      trail.forEach(pos => {
        if (state.environment.pheromoneMap[pos.y] && state.environment.pheromoneMap[pos.y][pos.x] !== undefined) {
          state.environment.pheromoneMap[pos.y][pos.x] = 1.0
        }
      })
      
      // Place ant near trail start
      const ant = state.ants[0]
      ant.position.x = 49
      ant.position.y = 30
      ant.state = 'exploring'
      
      // Track ant movement over several updates
      const initialPosition = { x: ant.position.x, y: ant.position.y }
      
      for (let i = 0; i < 10; i++) {
        simulation.update()
      }
      
      // Ant should have moved along or toward the trail
      const distanceMoved = Math.sqrt(
        Math.pow(ant.position.x - initialPosition.x, 2) + 
        Math.pow(ant.position.y - initialPosition.y, 2)
      )
      
      expect(distanceMoved).toBeGreaterThan(0)
      expect(ant.position.x).toBeGreaterThanOrEqual(initialPosition.x) // Generally moving right along trail
    })
  })

  describe('Pheromone Decay and Evaporation', () => {
    it('should decay pheromone trails over time', async () => {
      const config = {
        worldSize: 'small',
        pheromoneSystem: {
          enabled: true,
          decayRate: 0.2,
          evaporationInterval: 2
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Create initial pheromone
      const { width, height } = state.environment.metadata
      const centerX = Math.floor(width / 2)
      const centerY = Math.floor(height / 2)
      state.environment.pheromoneMap[centerY][centerX] = 1.0
      
      const initialStrength = state.environment.pheromoneMap[centerY][centerX]
      
      // Run multiple updates to trigger decay
      for (let i = 0; i < 10; i++) {
        simulation.update()
      }
      
      const finalStrength = state.environment.pheromoneMap[centerY][centerX]
      
      expect(finalStrength).toBeLessThan(initialStrength)
      expect(finalStrength).toBeGreaterThanOrEqual(0)
    })

    it('should completely evaporate weak trails', async () => {
      const config = {
        worldSize: 'small',
        pheromoneSystem: {
          enabled: true,
          decayRate: 0.5,
          evaporationThreshold: 0.1
        }
      }
      const state = await simulation.initializeColony('desert', config)
      
      // Create weak pheromone trail
      const { width, height } = state.environment.metadata
      const centerX = Math.floor(width / 2)
      const centerY = Math.floor(height / 2)
      state.environment.pheromoneMap[centerY][centerX] = 0.15 // Just above threshold
      
      // Run many updates to force evaporation
      for (let i = 0; i < 20; i++) {
        simulation.update()
      }
      
      // Should be completely evaporated
      expect(state.environment.pheromoneMap[centerY][centerX]).toBe(0)
    })

    it('should maintain stronger trails longer', async () => {
      const config = {
        worldSize: 'small',
        pheromoneSystem: {
          enabled: true,
          decayRate: 0.1,
          reinforcementStrength: 0.3
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      const { width, height } = state.environment.metadata
      const strongPos = { x: Math.floor(width / 2), y: Math.floor(height / 2) }
      const weakPos = { x: strongPos.x + 5, y: strongPos.y }
      
      // Create strong and weak trails
      state.environment.pheromoneMap[strongPos.y][strongPos.x] = 2.0
      state.environment.pheromoneMap[weakPos.y][weakPos.x] = 0.5
      
      // Run updates
      for (let i = 0; i < 8; i++) {
        simulation.update()
      }
      
      const strongTrailRemaining = state.environment.pheromoneMap[strongPos.y][strongPos.x]
      const weakTrailRemaining = state.environment.pheromoneMap[weakPos.y][weakPos.x]
      
      // Strong trail should last longer
      expect(strongTrailRemaining).toBeGreaterThan(weakTrailRemaining)
      expect(strongTrailRemaining).toBeGreaterThan(0.5)
    })
  })

  describe('Pheromone-Based Decision Making', () => {
    it('should influence ant pathfinding decisions', async () => {
      const config = {
        worldSize: 'medium',
        startingPopulation: 5,
        pheromoneSystem: {
          enabled: true,
          pathfindingWeight: 3.0,
          randomExploration: 0.2
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      
      // Create pheromone gradient leading to food
      const foodSource = state.environment.foodSources[0]
      const nestPos = state.nests[0].position
      
      // Create trail from nest toward food
      const steps = 10
      for (let i = 0; i < steps; i++) {
        const progress = i / steps
        const x = Math.floor(nestPos.x + (foodSource.x - nestPos.x) * progress)
        const y = Math.floor(nestPos.y + (foodSource.y - nestPos.y) * progress)
        
        if (state.environment.pheromoneMap[y] && state.environment.pheromoneMap[y][x] !== undefined) {
          state.environment.pheromoneMap[y][x] = 1.0 - (progress * 0.5) // Stronger near nest
        }
      }
      
      const explorers = state.ants.filter(ant => ant.role === 'scout')
      const initialPositions = explorers.map(ant => ({ x: ant.position.x, y: ant.position.y }))
      
      // Run simulation for multiple steps
      for (let i = 0; i < 15; i++) {
        simulation.update()
      }
      
      // At least some ants should move toward the pheromone trail/food
      let antsMovedTowardFood = 0
      explorers.forEach((ant, index) => {
        const initial = initialPositions[index]
        const distanceToFoodInitial = Math.sqrt(
          Math.pow(foodSource.x - initial.x, 2) + Math.pow(foodSource.y - initial.y, 2)
        )
        const distanceToFoodFinal = Math.sqrt(
          Math.pow(foodSource.x - ant.position.x, 2) + Math.pow(foodSource.y - ant.position.y, 2)
        )
        
        if (distanceToFoodFinal < distanceToFoodInitial) {
          antsMovedTowardFood++
        }
      })
      
      expect(antsMovedTowardFood).toBeGreaterThan(0)
    })

    it('should enable recruitment to food sources', async () => {
      const config = {
        worldSize: 'large',
        startingPopulation: 15,
        pheromoneSystem: {
          enabled: true,
          recruitmentRadius: 8,
          recruitmentThreshold: 0.5
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Simulate an ant finding food and returning
      const worker = state.ants.find(ant => ant.role === 'worker')
      const foodSource = state.environment.foodSources[0]
      
      worker.position.x = foodSource.x
      worker.position.y = foodSource.y
      worker.carryingFood = true
      worker.state = 'returning'
      
      const antsBefore = state.ants.filter(ant => 
        Math.sqrt(Math.pow(ant.position.x - foodSource.x, 2) + Math.pow(ant.position.y - foodSource.y, 2)) < 15
      ).length
      
      // Run simulation to allow pheromone laying and recruitment
      for (let i = 0; i < 20; i++) {
        simulation.update()
      }
      
      const antsAfter = state.ants.filter(ant => 
        Math.sqrt(Math.pow(ant.position.x - foodSource.x, 2) + Math.pow(ant.position.y - foodSource.y, 2)) < 15
      ).length
      
      // More ants should be near the food source due to recruitment
      expect(antsAfter).toBeGreaterThanOrEqual(antsBefore)
    })
  })

  describe('Performance and Integration', () => {
    it('should maintain performance with pheromone system enabled', async () => {
      const startTime = performance.now()
      const config = {
        worldSize: 'large',
        startingPopulation: 20,
        pheromoneSystem: {
          enabled: true,
          optimizedUpdates: true,
          updateInterval: 5
        }
      }
      
      await simulation.initializeColony('grassland', config)
      
      // Run multiple simulation steps
      for (let i = 0; i < 10; i++) {
        simulation.update()
      }
      
      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(500) // Should complete in reasonable time
    })

    it('should work with multiple nests and territories', async () => {
      const config = {
        worldSize: 'large',
        nestCount: 3,
        antsPerColony: 8,
        pheromoneSystem: {
          enabled: true,
          colonySpecific: true,
          crossColonyInteraction: 0.3
        },
        territorySystem: { enabled: true, type: 'voronoi' }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Should have colony-specific pheromone maps
      expect(state.environment.pheromoneByColony).toBeDefined()
      expect(Object.keys(state.environment.pheromoneByColony).length).toBe(3)
      
      // Run simulation
      for (let i = 0; i < 5; i++) {
        simulation.update()
      }
      
      // Each colony should have its own pheromone trails
      Object.keys(state.environment.pheromoneByColony).forEach(colonyId => {
        const colonyPheromones = state.environment.pheromoneByColony[colonyId]
        let hasTrails = false
        
        for (let y = 0; y < colonyPheromones.length; y++) {
          for (let x = 0; x < colonyPheromones[y].length; x++) {
            if (colonyPheromones[y][x] > 0) {
              hasTrails = true
              break
            }
          }
          if (hasTrails) break
        }
        
        expect(hasTrails).toBe(true)
      })
    })

    it('should integrate with terrain features properly', async () => {
      const config = {
        worldSize: 'medium',
        pheromoneSystem: { enabled: true },
        terrainFeatures: {
          rivers: { enabled: true, count: 1, width: 2 },
          mountains: { enabled: true, ranges: 1, size: 'small' }
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      
      // Pheromones should respect terrain obstacles
      const { width, height } = state.environment.metadata
      
      // Run simulation to generate trails
      for (let i = 0; i < 8; i++) {
        simulation.update()
      }
      
      // Check that pheromones don't appear on impassable terrain
      let pheromoneOnObstacles = false
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const terrain = state.environment.terrain[y][x]
          const pheromone = state.environment.pheromoneMap[y][x]
          
          if ((terrain === '🌊' || terrain === '⛰️') && pheromone > 0) {
            pheromoneOnObstacles = true
            break
          }
        }
        if (pheromoneOnObstacles) break
      }
      
      expect(pheromoneOnObstacles).toBe(false)
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without pheromone system enabled', async () => {
      const state = await simulation.initializeColony('grassland', { worldSize: 'small' })
      
      // Should work normally without pheromones
      expect(state.environment.pheromoneMap).toBeUndefined()
      
      // Simulation should run without errors
      for (let i = 0; i < 3; i++) {
        simulation.update()
      }
      
      expect(state.ants.length).toBeGreaterThan(0)
      expect(simulation.isRunning).toBe(false) // Not auto-started
    })

    it('should maintain existing ant behavior when pheromones disabled', async () => {
      const configWithoutPheromones = { worldSize: 'medium', startingPopulation: 10 }
      const configWithPheromones = { 
        worldSize: 'medium', 
        startingPopulation: 10,
        pheromoneSystem: { enabled: false }
      }
      
      const stateWithout = await simulation.initializeColony('forest_floor', configWithoutPheromones)
      simulation.stop()
      
      const simulation2 = new WebSimulation()
      const stateWith = await simulation2.initializeColony('forest_floor', configWithPheromones)
      
      // Omitting the pheromone config and disabling it must be equivalent:
      // same colony, no pheromone map. (Food counts are not compared: each
      // world is generated with unseeded randomness, so they always differ.)
      expect(stateWithout.ants.length).toBe(stateWith.ants.length)
      expect(stateWithout.environment.pheromoneMap).toBeUndefined()
      expect(stateWith.environment.pheromoneMap).toBeUndefined()
      expect(stateWithout.environment.foodSources.length).toBeGreaterThan(0)
      expect(stateWith.environment.foodSources.length).toBeGreaterThan(0)
    })
  })
})