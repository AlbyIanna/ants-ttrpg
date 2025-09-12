/**
 * Browser-Adapted Live Simulation Engine for Ant Colony TTRPG
 * Version: v0.5 - ES6 Module Version
 */

import { Utils } from './utils.js';

export class WebSimulation {
  constructor() {
    // Real-time simulation settings
    this.isRunning = false;
    this.isPaused = false;
    this.simulationSpeed = 1; // 1x normal speed
    this.updateInterval = 800; // Base update interval in ms
    this.lastUpdateTime = Date.now();
    
    // Simulation loop control
    this.animationFrameId = null;
    this.frameCount = 0;
    
    // Time-based mechanics
    this.elapsedTime = 0; // Total elapsed time in seconds
    this.timeScale = 60; // 1 real second = 60 simulation seconds
    
    // Event callbacks
    this.onStateUpdate = null;
    this.onAntAction = null;
    this.onDiscovery = null;
    this.onEnvironmentChange = null;
    
    // Performance tracking
    this.performanceStats = {
      updatesPerSecond: 0,
      averageUpdateTime: 0,
      antActionsPerSecond: 0,
      fps: 0
    };
    
    this.lastStatsUpdate = Date.now();
    this.updateTimes = [];
    
    // Simulation state
    this.state = null;
    
    // Initialize core systems
    this.initializeSystems();
  }

  /**
   * Initialize simulation systems
   */
  initializeSystems() {
    // Environment generation
    this.environmentSystem = {
      generate: (width = 75, height = 50, biome = 'forest_floor') => {
        const environment = {
          metadata: { width, height, biome },
          terrain: [],
          foodSources: [],
          hazards: [],
          biome: biome
        };
        
        // Generate terrain
        for (let y = 0; y < height; y++) {
          environment.terrain[y] = [];
          for (let x = 0; x < width; x++) {
            environment.terrain[y][x] = this.generateTerrainCell(x, y, width, height, biome);
          }
        }
        
        // Add food sources
        this.addFoodSources(environment, Utils.randomInt(7, 12));
        
        // Add hazards
        this.addHazards(environment, Utils.randomInt(1, 4));
        
        return environment;
      }
    };
    
    // Ant behavior system
    this.antBehaviorSystem = {
      roles: {
        worker: {
          symbol: 'W',
          energy: 100,
          energyMax: 100,
          movementSpeed: 1.0,
          carryingCapacity: 3,
          foragingEfficiency: 1.2
        },
        scout: {
          symbol: 'S',
          energy: 80,
          energyMax: 80,
          movementSpeed: 1.5,
          carryingCapacity: 1,
          explorationRadius: 5
        },
        soldier: {
          symbol: 'D',
          energy: 120,
          energyMax: 120,
          movementSpeed: 0.8,
          carryingCapacity: 1,
          combatStrength: 2.5
        }
      },
      
      states: {
        foraging: { priority: 1, duration: 30 },
        exploring: { priority: 2, duration: 45 },
        returning: { priority: 3, duration: 20 },
        resting: { priority: 0, duration: 15 },
        defending: { priority: 4, duration: 10 }
      }
    };
    
    // Colony management
    this.colonySystem = {
      basePopulation: 8,
      maxPopulation: 25,
      growthRate: 0.15,
      moraleFactors: {
        foodAbundance: 1.0,
        populationDensity: 1.0,
        hazardLevel: 1.0,
        seasonalModifier: 1.0
      }
    };
  }

  /**
   * Generate terrain for a single cell
   */
  generateTerrainCell(x, y, width, height, biome) {
    // Nest placement - always in center
    if (Utils.distance(x, y, Math.floor(width/2), Math.floor(height/2)) < 2) {
      return '🏠';
    }
    
    // Border walls for contained environment
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      return '🪨';
    }
    
    // Random terrain based on biome
    const random = Math.random();
    switch (biome) {
      case 'forest_floor':
        if (random < 0.1) return '🪨';
        if (random < 0.3) return '🌱';
        return '.';
      
      case 'desert':
        if (random < 0.05) return '🏔';
        if (random < 0.15) return '🪨';
        return '.';
      
      case 'grassland':
        if (random < 0.4) return '🌱';
        if (random < 0.5) return '🪨';
        return '.';
      
      default:
        return '.';
    }
  }

  /**
   * Add food sources to environment
   */
  addFoodSources(environment, count) {
    const { width, height } = environment.metadata;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    for (let i = 0; i < count; i++) {
      let x, y;
      let attempts = 0;
      
      // Find valid position
      do {
        x = Utils.randomInt(3, width - 4);
        y = Utils.randomInt(3, height - 4);
        attempts++;
        
        // Avoid nest area and walls
      } while (
        (Utils.distance(x, y, centerX, centerY) < 4 || 
         environment.terrain[y][x] !== '.' ||
         environment.foodSources.some(f => Utils.distance(x, y, f.x, f.y) < 3)) &&
        attempts < 50
      );
      
      if (attempts < 50) {
        const foodTypes = ['berries', 'seeds', 'nectar', 'wood'];
        const type = Utils.randomChoice(foodTypes);
        
        environment.foodSources.push({
          x: x,
          y: y,
          type: type,
          nutrition: Utils.randomInt(15, 35),
          maxNutrition: Utils.randomInt(25, 45),
          discovered: Math.random() < 0.3, // 30% chance initially discovered
          depleted: false,
          regenerationRate: Utils.randomFloat(0.1, 0.3)
        });
      }
    }
  }

  /**
   * Add environmental hazards
   */
  addHazards(environment, count) {
    const { width, height } = environment.metadata;
    
    for (let i = 0; i < count; i++) {
      const x = Utils.randomInt(2, width - 3);
      const y = Utils.randomInt(2, height - 3);
      
      if (environment.terrain[y][x] === '.') {
        environment.hazards.push({
          x: x,
          y: y,
          type: 'predator',
          severity: Utils.randomFloat(0.5, 2.0),
          active: Math.random() < 0.6,
          duration: Utils.randomInt(10, 30)
        });
      }
    }
  }

  /**
   * Create a new ant with given parameters
   */
  createAnt(id, role, nestPos, environment) {
    const roleConfig = this.antBehaviorSystem.roles[role];
    const ant = {
      id: id,
      role: role,
      position: { x: nestPos.x, y: nestPos.y },
      state: role === 'worker' ? 'foraging' : 'exploring',
      energy: roleConfig.energy,
      energyMax: roleConfig.energyMax,
      carryingFood: false,
      carryingAmount: 0,
      targetPosition: null,
      lastMovements: [],
      stateTimer: 0,
      discoveryCount: 0
    };
    
    return ant;
  }

  /**
   * Initialize a new colony state
   */
  async initializeColony(biome = 'forest_floor') {
    Utils.performance.start('colonyInit');
    
    // Generate environment
    const environment = this.environmentSystem.generate(75, 50, biome);
    const centerX = Math.floor(environment.metadata.width / 2);
    const centerY = Math.floor(environment.metadata.height / 2);
    const nestPosition = { x: centerX, y: centerY };
    
    // Create initial ant population
    const ants = [];
    const basePopulation = this.colonySystem.basePopulation;
    
    // Role distribution: 60% workers, 30% scouts, 10% soldiers
    const roleDistribution = [
      ...Array(Math.floor(basePopulation * 0.6)).fill('worker'),
      ...Array(Math.floor(basePopulation * 0.3)).fill('scout'),
      ...Array(Math.ceil(basePopulation * 0.1)).fill('soldier')
    ];
    
    for (let i = 0; i < roleDistribution.length; i++) {
      const ant = this.createAnt(i + 1, roleDistribution[i], nestPosition, environment);
      ants.push(ant);
    }
    
    // Initialize colony state
    this.state = {
      environment: environment,
      ants: ants,
      food: 10, // Starting food reserves
      morale: 7.5,
      population: {
        total: ants.length,
        workers: ants.filter(a => a.role === 'worker').length,
        scouts: ants.filter(a => a.role === 'scout').length,
        soldiers: ants.filter(a => a.role === 'soldier').length
      },
      biome: biome,
      recentMovements: [],
      recentDiscoveries: [],
      narrative_context: {
        current_season: 'spring',
        day_cycle: 'day',
        weather: 'clear'
      }
    };
    
    const initTime = Utils.performance.end('colonyInit');
    console.log(`🐜 Colony initialized in ${initTime.toFixed(2)}ms`);
    
    return this.state;
  }

  /**
   * Start the simulation
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.lastUpdateTime = Date.now();
    
    console.log('▶️ Simulation started');
    this.simulationLoop();
  }

  /**
   * Pause the simulation
   */
  pause() {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? '⏸️ Simulation paused' : '▶️ Simulation resumed');
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('⏹️ Simulation stopped');
  }

  /**
   * Main simulation loop
   */
  simulationLoop() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) * this.simulationSpeed;
    
    if (!this.isPaused && deltaTime >= this.updateInterval) {
      this.update(deltaTime);
      this.lastUpdateTime = now;
    }
    
    // Update performance stats
    this.updatePerformanceStats();
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => this.simulationLoop());
  }

  /**
   * Update simulation state
   */
  update(deltaTime) {
    if (!this.state) return;
    
    Utils.performance.start('simulationUpdate');
    
    // Clear recent movements and discoveries
    this.state.recentMovements = [];
    this.state.recentDiscoveries = [];
    
    // Update ants
    this.updateAnts(deltaTime);
    
    // Update environment
    this.updateEnvironment(deltaTime);
    
    // Update colony stats
    this.updateColonyStats();
    
    // Trigger state update callback
    if (this.onStateUpdate) {
      this.onStateUpdate(this.state, this.getSimulationStats());
    }
    
    // Track update performance
    const updateTime = Utils.performance.end('simulationUpdate');
    this.updateTimes.push(updateTime);
    if (this.updateTimes.length > 10) {
      this.updateTimes.shift();
    }
    
    this.elapsedTime += deltaTime / 1000;
  }

  /**
   * Update all ants in the colony
   */
  updateAnts(deltaTime) {
    if (!this.state || !this.state.ants) return;
    
    for (const ant of this.state.ants) {
      this.updateAnt(ant, deltaTime);
    }
  }

  /**
   * Update individual ant behavior
   */
  updateAnt(ant, deltaTime) {
    // Decrease state timer
    ant.stateTimer -= deltaTime / 1000;
    
    // State-based behavior
    switch (ant.state) {
      case 'foraging':
        this.antForagingBehavior(ant);
        break;
      case 'exploring':
        this.antExploringBehavior(ant);
        break;
      case 'returning':
        this.antReturningBehavior(ant);
        break;
      case 'resting':
        this.antRestingBehavior(ant);
        break;
    }
    
    // State transitions
    this.checkAntStateTransitions(ant);
  }

  /**
   * Ant foraging behavior
   */
  antForagingBehavior(ant) {
    // Find nearby food sources
    const nearbyFood = this.state.environment.foodSources.filter(food => 
      !food.depleted && food.discovered && 
      Utils.distance(ant.position.x, ant.position.y, food.x, food.y) <= 8
    );
    
    if (nearbyFood.length > 0 && !ant.carryingFood) {
      // Move toward closest food
      const closestFood = nearbyFood.reduce((closest, food) => {
        const distanceToCurrent = Utils.distance(ant.position.x, ant.position.y, food.x, food.y);
        const distanceToClosest = Utils.distance(ant.position.x, ant.position.y, closest.x, closest.y);
        return distanceToCurrent < distanceToClosest ? food : closest;
      });
      
      this.moveAntToward(ant, closestFood);
      
      // Collect food if adjacent
      if (Utils.distance(ant.position.x, ant.position.y, closestFood.x, closestFood.y) <= 1) {
        this.collectFood(ant, closestFood);
      }
    } else if (ant.carryingFood) {
      // Return to nest
      ant.state = 'returning';
      ant.stateTimer = this.antBehaviorSystem.states.returning.duration;
    } else {
      // Random movement to search for food
      this.moveAntRandomly(ant);
    }
  }

  /**
   * Ant exploring behavior
   */
  antExploringBehavior(ant) {
    // Look for undiscovered food sources nearby
    const nearbyFood = this.state.environment.foodSources.filter(food => 
      !food.discovered && 
      Utils.distance(ant.position.x, ant.position.y, food.x, food.y) <= 3
    );
    
    if (nearbyFood.length > 0) {
      // Discover food source
      const food = nearbyFood[0];
      food.discovered = true;
      ant.discoveryCount++;
      
      this.state.recentDiscoveries.push({
        type: 'food_source',
        foodType: food.type,
        position: { x: food.x, y: food.y },
        discoveredBy: ant.id
      });
      
      if (this.onDiscovery) {
        this.onDiscovery({ type: 'food_discovered', ant: ant, food: food });
      }
    }
    
    // Move toward unexplored areas
    this.moveAntRandomly(ant);
  }

  /**
   * Ant returning behavior
   */
  antReturningBehavior(ant) {
    const nestPos = this.getNestPosition();
    
    if (Utils.distance(ant.position.x, ant.position.y, nestPos.x, nestPos.y) <= 1) {
      // Reached nest - deposit food
      if (ant.carryingFood) {
        this.state.food += ant.carryingAmount || 2;
        ant.carryingFood = false;
        ant.carryingAmount = 0;
        
        this.state.recentDiscoveries.push({
          type: 'food',
          amount: ant.carryingAmount || 2,
          deliveredBy: ant.id
        });
      }
      
      // Switch to appropriate state
      ant.state = ant.role === 'worker' ? 'foraging' : 'exploring';
      ant.stateTimer = this.antBehaviorSystem.states[ant.state].duration;
    } else {
      // Move toward nest
      this.moveAntToward(ant, nestPos);
    }
  }

  /**
   * Ant resting behavior
   */
  antRestingBehavior(ant) {
    // Restore energy while resting
    ant.energy = Math.min(ant.energyMax, ant.energy + 2);
    
    // Random chance to switch states
    if (ant.stateTimer <= 0 || ant.energy >= ant.energyMax * 0.8) {
      ant.state = ant.role === 'worker' ? 'foraging' : 'exploring';
      ant.stateTimer = this.antBehaviorSystem.states[ant.state].duration;
    }
  }

  /**
   * Check for ant state transitions
   */
  checkAntStateTransitions(ant) {
    // Energy-based transitions
    if (ant.energy < 20 && ant.state !== 'resting') {
      ant.state = 'resting';
      ant.stateTimer = this.antBehaviorSystem.states.resting.duration;
    }
    
    // Time-based transitions
    if (ant.stateTimer <= 0) {
      switch (ant.state) {
        case 'foraging':
          ant.state = Math.random() < 0.7 ? 'foraging' : 'exploring';
          break;
        case 'exploring':
          ant.state = Math.random() < 0.6 ? 'exploring' : 'foraging';
          break;
        default:
          ant.state = ant.role === 'worker' ? 'foraging' : 'exploring';
      }
      
      ant.stateTimer = this.antBehaviorSystem.states[ant.state].duration;
    }
  }

  /**
   * Move ant toward target position
   */
  moveAntToward(ant, target) {
    const dx = target.x - ant.position.x;
    const dy = target.y - ant.position.y;
    
    // Normalize movement
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;
    
    const moveX = Math.round(dx / distance);
    const moveY = Math.round(dy / distance);
    
    this.moveAnt(ant, moveX, moveY);
  }

  /**
   * Move ant randomly
   */
  moveAntRandomly(ant) {
    const directions = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    const [dx, dy] = Utils.randomChoice(directions);
    this.moveAnt(ant, dx, dy);
  }

  /**
   * Move ant by delta position
   */
  moveAnt(ant, dx, dy) {
    const newX = ant.position.x + dx;
    const newY = ant.position.y + dy;
    const environment = this.state.environment;
    
    // Check bounds and terrain
    if (newX >= 0 && newX < environment.metadata.width && 
        newY >= 0 && newY < environment.metadata.height &&
        environment.terrain[newY][newX] !== '🪨' &&
        environment.terrain[newY][newX] !== '🏔') {
      
      // Record movement
      this.state.recentMovements.push({
        antId: ant.id,
        from: { x: ant.position.x, y: ant.position.y },
        to: { x: newX, y: newY }
      });
      
      ant.position.x = newX;
      ant.position.y = newY;
      
      // Consume energy
      ant.energy = Math.max(0, ant.energy - 1);
    }
  }

  /**
   * Collect food from source
   */
  collectFood(ant, foodSource) {
    if (ant.carryingFood || foodSource.depleted) return;
    
    const roleConfig = this.antBehaviorSystem.roles[ant.role];
    const amount = Math.min(foodSource.nutrition, roleConfig.carryingCapacity || 2);
    
    ant.carryingFood = true;
    ant.carryingAmount = amount;
    foodSource.nutrition -= amount;
    
    if (foodSource.nutrition <= 0) {
      foodSource.depleted = true;
    }
  }

  /**
   * Update environment systems
   */
  updateEnvironment(deltaTime) {
    // Regenerate food sources slowly
    this.state.environment.foodSources.forEach(food => {
      if (!food.depleted && food.nutrition < food.maxNutrition) {
        food.nutrition = Math.min(food.maxNutrition, food.nutrition + food.regenerationRate);
      }
    });
  }

  /**
   * Update colony statistics
   */
  updateColonyStats() {
    const ants = this.state.ants;
    
    this.state.population = {
      total: ants.length,
      workers: ants.filter(a => a.role === 'worker').length,
      scouts: ants.filter(a => a.role === 'scout').length,
      soldiers: ants.filter(a => a.role === 'soldier').length
    };
    
    // Calculate morale based on various factors
    let morale = 5.0;
    
    // Food availability
    const foodRatio = this.state.food / (this.state.population.total * 2);
    morale += Math.min(2, foodRatio * 2) - 1;
    
    // Discovery success
    const recentDiscoveries = this.state.recentDiscoveries.length;
    morale += Math.min(1, recentDiscoveries * 0.5);
    
    this.state.morale = Utils.clamp(morale, 0, 10);
  }

  /**
   * Get nest position
   */
  getNestPosition() {
    const env = this.state.environment;
    const centerX = Math.floor(env.metadata.width / 2);
    const centerY = Math.floor(env.metadata.height / 2);
    return { x: centerX, y: centerY };
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats() {
    const now = Date.now();
    
    if (now - this.lastStatsUpdate >= 1000) {
      // Calculate FPS
      this.performanceStats.fps = this.frameCount;
      this.frameCount = 0;
      
      // Calculate average update time
      if (this.updateTimes.length > 0) {
        this.performanceStats.averageUpdateTime = 
          this.updateTimes.reduce((sum, time) => sum + time, 0) / this.updateTimes.length;
      }
      
      this.lastStatsUpdate = now;
    }
    
    this.frameCount++;
  }

  /**
   * Get simulation statistics
   */
  getSimulationStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      elapsedTime: this.elapsedTime,
      simulationSpeed: this.simulationSpeed,
      fps: this.performanceStats.fps,
      updatesPerSecond: Math.round(1000 / (this.updateTimes[this.updateTimes.length - 1] || 16)),
      averageUpdateTime: this.performanceStats.averageUpdateTime
    };
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed) {
    this.simulationSpeed = Utils.clamp(speed, 0.1, 5.0);
  }
}