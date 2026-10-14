/**
 * Tests for Pheromone Communication System - Phase 4 Implementation
 * TDD approach for Phase 4: Enhanced AI & Behaviors - Pheromone Communication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebSimulation } from './web-simulation.js'

// Fixed seed so worlds and ticks are reproducible; override with TEST_SEED=n
const TEST_SEED = Number(process.env.TEST_SEED ?? 20261014)

describe('WebSimulation - Pheromone Communication System', () => {
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
      const { terrain, pheromoneMap } = state.environment

      // Ten parallel 6-cell trails (rows 20, 22, ... 38, x 50-55), one exploring
      // ant just left of each.
      // One ant alone is a coin toss: if its first step is the 20% random one
      // and goes the wrong way, the trail is out of reach (ants sense only
      // adjacent cells). Ten ants measure the behaviour, not the luck.
      const rows = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38]
      const ants = state.ants.slice(0, rows.length)
      rows.forEach((row, i) => {
        for (let x = 49; x <= 55; x++) terrain[row][x] = '.' // trails only exist where ants can walk
        for (let x = 50; x <= 55; x++) pheromoneMap[row][x] = 1.0
        Object.assign(ants[i], { state: 'exploring', energy: 100, stateTimer: 100, previousPosition: null, carryingFood: false })
        ants[i].position.x = 49
        ants[i].position.y = row
      })

      // Count, over 10 updates, the steps each ant ends on a trail cell. Any
      // trail counts: an ant that steps off is next to the neighbouring trail
      // too, and joining that one is still following a trail.
      const onATrail = (ant) => rows.includes(ant.position.y) && ant.position.x >= 50 && ant.position.x <= 55
      let stepsOnTrail = 0
      for (let step = 0; step < 10; step++) {
        simulation.update()
        ants.forEach(ant => { if (onATrail(ant)) stepsOnTrail++ })
      }

      // Measured over seeds 1-200 with this exact setup: following trails gives
      // 48-89 steps on a trail (median 77); with trail-following off
      // (pathfindingWeight 0) a random walk gives 5-35 (median 19). 40 sits
      // between the worst follower and the best random walker.
      expect(stepsOnTrail).toBeGreaterThanOrEqual(40)
    })

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
      
      // Create initial pheromone on a corner cell. Not the centre: that is the
      // nest, where ants stand and lay fresh pheromone every update. Ants start
      // at the nest and move one cell per update, so none reach (2, 2) here.
      const centerX = 2
      const centerY = 2
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
      
      // Create weak pheromone trail on a corner cell, away from the nest
      // (see the decay test above for why not the centre)
      const centerX = 2
      const centerY = 2
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
      // Ants climb a pheromone gradient: each step goes to the strongest
      // neighbouring cell (never straight back to the cell they came from).
      const config = {
        worldSize: 'small',
        startingPopulation: 5,
        pheromoneSystem: {
          enabled: true,
          pathfindingWeight: 3.0,
          followProbability: 1.0 // always follow, so only the trail decides
        }
      }
      const state = await simulation.initializeColony('grassland', config)
      const { pheromoneMap, terrain } = state.environment

      // A straight trail along row 5, getting stronger towards x = 25
      const row = 5
      for (let i = 0; i <= 15; i++) {
        const x = 10 + i
        terrain[row][x] = '.' // clear any rock so the lane is walkable
        pheromoneMap[row][x] = 0.2 + i * 0.05
      }

      const ant = state.ants[0]
      Object.assign(ant, { state: 'exploring', energy: 100, stateTimer: 100, previousPosition: null })
      ant.position.x = 9
      ant.position.y = row

      for (let i = 0; i < 10; i++) {
        simulation.update()
      }

      // Following the gradient moves the ant right along the trail
      expect(ant.position.y).toBe(row)
      expect(ant.position.x).toBeGreaterThanOrEqual(15)
    })

    it('should enable recruitment to food sources', async () => {
      // Recruitment: a worker carrying food lays a trail on its way home, and a
      // foraging ant that comes across that trail steps onto it.
      const config = {
        worldSize: 'small',
        startingPopulation: 10,
        pheromoneSystem: {
          enabled: true,
          followProbability: 1.0,
          trailInfluence: 2.0 // with followProbability 1: always take the trail step
        }
      }
      const state = await simulation.initializeColony('forest_floor', config)
      const { pheromoneMap, terrain, metadata } = state.environment

      // Hide all food so foragers wander instead of heading straight to it
      state.environment.foodSources.forEach(food => { food.discovered = false })

      const walkable = (x, y) => x >= 0 && y >= 0 && x < metadata.width && y < metadata.height &&
        terrain[y][x] !== '🪨' && terrain[y][x] !== '🏔'

      // A worker about 15 cells east of the nest heads home with food, laying
      // trail. Start it on walkable ground: dropped on a rock it can't move.
      const nest = state.nests[0].position
      const worker = state.ants.find(ant => ant.role === 'worker')
      Object.assign(worker, { state: 'returning', carryingFood: true, energy: 100, stateTimer: 100 })
      let startX = Math.min(metadata.width - 1, nest.x + 15)
      while (startX < metadata.width - 1 && !walkable(startX, nest.y)) startX++
      worker.position.x = startX
      worker.position.y = nest.y
      for (let i = 0; i < 6; i++) {
        simulation.update()
      }

      const trailCells = []
      for (let y = 0; y < metadata.height; y++) {
        for (let x = 0; x < metadata.width; x++) {
          if (pheromoneMap[y][x] >= 1 && Math.abs(x - nest.x) > 3 && walkable(x, y)) trailCells.push({ x, y })
        }
      }
      expect(trailCells.length).toBeGreaterThan(0)

      // Put a forager on an empty, walkable cell right next to the trail
      let start = null
      for (const cell of trailCells) {
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const x = cell.x + dx, y = cell.y + dy
          if (walkable(x, y) && pheromoneMap[y][x] === 0) {
            start = { x, y }
            break
          }
        }
        if (start) break
      }
      expect(start).not.toBeNull()

      const forager = state.ants.find(ant => ant !== worker && ant.role === 'worker') || state.ants.find(ant => ant !== worker)
      Object.assign(forager, { state: 'foraging', carryingFood: false, energy: 100, stateTimer: 100, previousPosition: null })
      forager.position.x = start.x
      forager.position.y = start.y

      // Explorers may have rediscovered food meanwhile; a forager within 8 cells
      // of known food heads for it instead, so hide it again for this step
      state.environment.foodSources.forEach(food => { food.discovered = false })

      // One step: the trail is a neighbour, so it beats a random direction
      simulation.update()

      // The forager has been drawn onto the returning worker's trail
      expect(trailCells.some(cell => cell.x === forager.position.x && cell.y === forager.position.y)).toBe(true)
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
      
      const simulation2 = new WebSimulation({ seed: TEST_SEED })
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