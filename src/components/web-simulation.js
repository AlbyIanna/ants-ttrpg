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
    
    // Runtime configuration parameters
    this.antSpeedMultiplier = 1.0;
    this.explorationRate = 0.3;
    this.socialCohesion = 0.7;
    this.weatherSpeedMultiplier = 1.0;
    this.displayOptions = {
      showTrails: true,
      showBehaviorStates: true,
      showEnvironmentDetails: true
    };
    
    // Initialize core systems
    this.initializeSystems();
  }

  /**
   * Initialize simulation systems
   */
  initializeSystems() {
    // Environment generation
    this.environmentSystem = {
      generate: (width = 75, height = 50, biome = 'forest_floor', config = {}) => {
        const environment = {
          metadata: { width, height, biome },
          terrain: [],
          foodSources: [],
          hazards: [],
          biome: biome
        };
        
        // Check if this is a multi-biome world
        if (biome === 'multi_biome' && config.biomeTypes && config.biomeTypes.length > 1) {
          // Multi-biome world generation
          environment.metadata.biomeTypes = config.biomeTypes;
          environment.metadata.biomeDistribution = config.biomeDistribution || 'zoned';
          
          // Generate biome map
          environment.biomeMap = this.generateBiomeMap(width, height, config);
          
          // Generate terrain using biome map
          for (let y = 0; y < height; y++) {
            environment.terrain[y] = [];
            for (let x = 0; x < width; x++) {
              const cellBiome = environment.biomeMap[y][x];
              environment.terrain[y][x] = this.generateTerrainCell(x, y, width, height, cellBiome);
            }
          }
        } else {
          // Single biome world generation (existing behavior)
          for (let y = 0; y < height; y++) {
            environment.terrain[y] = [];
            for (let x = 0; x < width; x++) {
              environment.terrain[y][x] = this.generateTerrainCell(x, y, width, height, biome);
            }
          }
        }
        
        // Add terrain features if specified
        if (config.terrainFeatures) {
          this.addTerrainFeatures(environment, config.terrainFeatures);
        }
        
        // Initialize pheromone system if specified
        if (config.pheromoneSystem && config.pheromoneSystem.enabled) {
          this.initializePheromoneSystem(environment, config.pheromoneSystem, 1);
        }
        
        // Add food sources (scale with world size)
        const baseArea = 75 * 50; // Default world area
        const currentArea = width * height;
        const areaRatio = currentArea / baseArea;
        const baseFoodCount = Utils.randomInt(7, 12);
        // Use linear scaling for better proportionality but cap growth
        const scaledFoodCount = Math.floor(baseFoodCount * Math.min(areaRatio, 10));
        
        this.addFoodSources(environment, Math.max(3, scaledFoodCount));
        
        // Add hazards (scale with world size)
        const baseHazardCount = Utils.randomInt(1, 4);
        const scaledHazardCount = Math.floor(baseHazardCount * Math.sqrt(areaRatio));
        this.addHazards(environment, Math.max(1, scaledHazardCount));
        
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
   * Generate biome map for multi-biome worlds
   */
  generateBiomeMap(width, height, config) {
    const biomeMap = [];
    const { biomeTypes, biomeDistribution = 'zoned' } = config;
    
    // Initialize biome map
    for (let y = 0; y < height; y++) {
      biomeMap[y] = [];
    }
    
    switch (biomeDistribution) {
      case 'zoned':
        this.generateZonedBiomes(biomeMap, width, height, biomeTypes);
        break;
      case 'random':
        this.generateRandomBiomes(biomeMap, width, height, biomeTypes, config.biomeRandomness || 0.3);
        break;
      case 'striped':
        this.generateStripedBiomes(biomeMap, width, height, biomeTypes, config.stripeDirection || 'horizontal');
        break;
      default:
        // Fallback to zoned
        this.generateZonedBiomes(biomeMap, width, height, biomeTypes);
    }
    
    return biomeMap;
  }
  
  /**
   * Generate zoned biome distribution (distinct regions)
   */
  generateZonedBiomes(biomeMap, width, height, biomeTypes) {
    const numBiomes = biomeTypes.length;
    
    // Create zones based on grid divisions
    const zonesPerRow = Math.ceil(Math.sqrt(numBiomes));
    const zonesPerCol = Math.ceil(numBiomes / zonesPerRow);
    
    const zoneWidth = width / zonesPerRow;
    const zoneHeight = height / zonesPerCol;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const zoneX = Math.floor(x / zoneWidth);
        const zoneY = Math.floor(y / zoneHeight);
        const biomeIndex = (zoneY * zonesPerRow + zoneX) % numBiomes;
        biomeMap[y][x] = biomeTypes[biomeIndex];
      }
    }
  }
  
  /**
   * Generate random biome distribution
   */
  generateRandomBiomes(biomeMap, width, height, biomeTypes, randomness) {
    // Start with first biome
    let currentBiome = biomeTypes[0];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Randomly change biome based on randomness factor
        if (Math.random() < randomness) {
          currentBiome = biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
        }
        biomeMap[y][x] = currentBiome;
      }
    }
  }
  
  /**
   * Generate striped biome distribution
   */
  generateStripedBiomes(biomeMap, width, height, biomeTypes, direction) {
    const numBiomes = biomeTypes.length;
    
    if (direction === 'horizontal') {
      // Horizontal stripes
      const stripeHeight = Math.ceil(height / numBiomes);
      
      for (let y = 0; y < height; y++) {
        const biomeIndex = Math.floor(y / stripeHeight) % numBiomes;
        const biome = biomeTypes[biomeIndex];
        
        for (let x = 0; x < width; x++) {
          biomeMap[y][x] = biome;
        }
      }
    } else {
      // Vertical stripes
      const stripeWidth = Math.ceil(width / numBiomes);
      
      for (let x = 0; x < width; x++) {
        const biomeIndex = Math.floor(x / stripeWidth) % numBiomes;
        const biome = biomeTypes[biomeIndex];
        
        for (let y = 0; y < height; y++) {
          biomeMap[y][x] = biome;
        }
      }
    }
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
  createAnt(id, role, nestPos, environment, colonyId = 0) {
    const roleConfig = this.antBehaviorSystem.roles[role];
    const ant = {
      id: id,
      role: role,
      colonyId: colonyId,
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
   * Get world dimensions based on configuration
   */
  getWorldDimensions(config = {}) {
    // Direct width/height override
    if (config.width && config.height) {
      return { width: config.width, height: config.height };
    }
    
    // Named world sizes
    const worldSizeConfigs = {
      small: { width: 100, height: 75 },
      medium: { width: 200, height: 150 },
      large: { width: 300, height: 200 },
      huge: { width: 500, height: 300 }
    };
    
    if (config.worldSize && worldSizeConfigs[config.worldSize]) {
      return worldSizeConfigs[config.worldSize];
    }
    
    // Default size (backward compatibility)
    return { width: 75, height: 50 };
  }

  /**
   * Initialize a new colony state
   */
  async initializeColony(biome = 'forest_floor', config = {}) {
    Utils.performance.start('colonyInit');
    
    // Determine world dimensions
    const dimensions = this.getWorldDimensions(config);
    console.log(1122, dimensions);
    
    // Generate environment
    const environment = this.environmentSystem.generate(dimensions.width, dimensions.height, biome, config);
    
    // Handle multiple nests configuration
    const nestCount = config.nestCount || 1;
    const nests = this.generateNests(environment, nestCount, config);
    
    // Add territory system if multiple nests or explicitly enabled
    if ((nestCount > 1 && config.territorySystem && config.territorySystem.enabled) ||
        (config.territorySystem && config.territorySystem.enabled) ||
        (nestCount > 1)) { // Auto-enable for multiple nests
      const territoryConfig = config.territorySystem || { enabled: true, type: 'voronoi' };
      this.generateTerritoryMap(environment, nests, territoryConfig);
    }
    
    // Create initial ant population for all colonies
    const ants = [];
    const antsPerColony = config.antsPerColony || config.startingPopulation || this.colonySystem.basePopulation;
    
    for (let colonyId = 0; colonyId < nestCount; colonyId++) {
      const nestPosition = nests[colonyId].position;
      
      // Role distribution: 60% workers, 30% scouts, 10% soldiers
      const workerCount = Math.floor(antsPerColony * 0.6);
      const scoutCount = Math.floor(antsPerColony * 0.3);
      const soldierCount = antsPerColony - workerCount - scoutCount; // Fill remaining slots
      
      const roleDistribution = [
        ...Array(workerCount).fill('worker'),
        ...Array(scoutCount).fill('scout'),
        ...Array(soldierCount).fill('soldier')
      ];
      
      for (let i = 0; i < roleDistribution.length; i++) {
        const ant = this.createAnt(
          colonyId * 1000 + i + 1, // Unique ID across colonies
          roleDistribution[i], 
          nestPosition, 
          environment,
          colonyId
        );
        ants.push(ant);
      }
    }
    
    // Update nest colony population counts
    for (let i = 0; i < nestCount; i++) {
      const colonyAnts = ants.filter(ant => ant.colonyId === i);
      nests[i].colony.population = {
        total: colonyAnts.length,
        workers: colonyAnts.filter(a => a.role === 'worker').length,
        scouts: colonyAnts.filter(a => a.role === 'scout').length,
        soldiers: colonyAnts.filter(a => a.role === 'soldier').length
      };
    }
    
    // Set inter-colony dynamics metadata if configured
    if (config.interColonyDynamics) {
      environment.metadata.interColonyDynamics = config.interColonyDynamics;
    }
    
    // Initialize pheromone system if specified
    if (config.pheromoneSystem && config.pheromoneSystem.enabled) {
      this.initializePheromoneSystem(environment, config.pheromoneSystem, nestCount);
    }
    
    // Initialize colony state
    this.state = {
      environment: environment,
      nests: nests,
      ants: ants,
      food: 10, // Starting food reserves (legacy - now per-colony)
      morale: 7.5,
      maxPopulation: config.maxPopulation || this.colonySystem.maxPopulation,
      population: {
        total: ants.length,
        workers: ants.filter(a => a.role === 'worker').length,
        scouts: ants.filter(a => a.role === 'scout').length,
        soldiers: ants.filter(a => a.role === 'soldier').length
      },
      biome: biome,
      recentMovements: [],
      recentDiscoveries: [],
      nestPosition: nests[0].position, // Legacy compatibility
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
    const deltaTime = (now - this.lastUpdateTime) * this.getEffectiveSpeed();
    
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
    
    // Update pheromone system
    this.updatePheromoneSystem();
    
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
    
    // Food consumption - colonies consume food over time
    this.updateFoodConsumption(deltaTime);
    
    // Population dynamics - births and deaths based on food availability
    this.updatePopulationDynamics(deltaTime);
  }

  /**
   * Update food consumption by the colony
   */
  updateFoodConsumption(deltaTime) {
    if (!this.state.ants || this.state.ants.length === 0) return;
    
    // Each ant consumes food over time
    const baseConsumptionRate = 0.1; // Food per ant per second
    const seasonalMultiplier = this.getSeasonalFoodMultiplier();
    const consumptionRate = baseConsumptionRate * seasonalMultiplier * (deltaTime / 1000);
    
    const totalConsumption = this.state.ants.length * consumptionRate;
    
    if (this.state.food > totalConsumption) {
      this.state.food -= totalConsumption;
    } else {
      // Not enough food - mark some ants as hungry/at risk
      const foodShortage = totalConsumption - this.state.food;
      this.state.food = 0;
      
      // Some ants may die from starvation if food shortage is severe
      if (foodShortage > 2 && Math.random() < 0.1) {
        this.killRandomAnt('starvation');
      }
    }
  }

  /**
   * Update population dynamics (births and deaths)
   */
  updatePopulationDynamics(deltaTime) {
    if (!this.state.ants) return;
    
    const currentPopulation = this.state.ants.filter(ant => !ant.isDead).length;
    const maxPop = this.state.maxPopulation || 50;
    
    // Birth rate depends on food availability and population
    const foodRatio = this.state.food / (currentPopulation * 5); // Target 5 food per ant
    const populationPressure = Math.max(0, 1 - (currentPopulation / maxPop));
    
    // Birth chance increases with food and decreases with population pressure
    const birthChance = Math.min(0.05, foodRatio * populationPressure * (deltaTime / 1000));
    
    if (Math.random() < birthChance && currentPopulation < maxPop && this.state.food > 10) {
      this.birthNewAnt();
    }
    
    // Natural death rate (very low)
    const deathChance = 0.001 * (deltaTime / 1000);
    if (Math.random() < deathChance && currentPopulation > 5) {
      this.killRandomAnt('natural');
    }
    
    // Remove dead ants from the array
    this.state.ants = this.state.ants.filter(ant => !ant.isDead);
  }

  /**
   * Birth a new ant
   */
  birthNewAnt() {
    const nestPos = this.getNestPosition();
    const newAntId = Math.max(...this.state.ants.map(a => a.id)) + 1;
    
    // Cost food to create new ant
    if (this.state.food >= 10) {
      this.state.food -= 10;
      
      const newAnt = this.createAnt(newAntId, 'worker', nestPos, this.state.environment);
      this.state.ants.push(newAnt);
      
      this.state.recentDiscoveries.push({
        type: 'birth',
        antId: newAntId,
        message: `New worker ant born!`
      });
    }
  }

  /**
   * Kill a random ant
   */
  killRandomAnt(cause = 'unknown') {
    const livingAnts = this.state.ants.filter(ant => !ant.isDead);
    if (livingAnts.length > 0) {
      const victimIndex = Math.floor(Math.random() * livingAnts.length);
      const victim = livingAnts[victimIndex];
      victim.isDead = true;
      
      this.state.recentDiscoveries.push({
        type: 'death',
        antId: victim.id,
        cause: cause,
        message: `Ant #${victim.id} died from ${cause}`
      });
    }
  }

  /**
   * Get seasonal food multiplier
   */
  getSeasonalFoodMultiplier() {
    if (!this.state.environment.season) return 1.0;
    
    switch (this.state.environment.season) {
      case 'Spring': return 0.8;   // Lower consumption in spring
      case 'Summer': return 0.7;   // Lower consumption in summer  
      case 'Autumn': return 1.2;   // Higher consumption preparing for winter
      case 'Winter': return 1.5;   // Higher consumption in winter
      default: return 1.0;
    }
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
    this.simulationSpeed = Utils.clamp(speed, 0.1, 20.0); // Increased max to 20x
  }

  /**
   * Set time scale manager for advanced time scaling
   */
  setTimeScaleManager(timeScaleManager) {
    this.timeScaleManager = timeScaleManager;
  }

  /**
   * Get effective simulation speed including time scale
   */
  getEffectiveSpeed() {
    let baseSpeed = this.simulationSpeed;
    
    // Apply time scale multiplier if available
    if (this.timeScaleManager && this.timeScaleManager.currentScale) {
      const timeScale = this.timeScaleManager.currentScale;
      // Time scale represents simulation seconds per real second
      // We need to convert this to a speed multiplier
      baseSpeed *= Math.min(timeScale / 60, 5); // Cap the multiplier at 5x for stability
    }
    
    return baseSpeed;
  }

  /**
   * Runtime configuration methods for live parameter adjustment
   */
  setFoodAbundance(abundance) {
    if (!this.state || !this.state.environment) return;
    
    // Store the abundance setting for future food generation
    this.state.environment.foodAbundance = Utils.clamp(abundance, 0.1, 3.0);
    
    // Optionally add more food sources if abundance increased significantly
    if (abundance > 1.5 && Math.random() < 0.3) {
      this.addFoodSources(this.state.environment, Math.floor(abundance));
    }
  }

  setMaxPopulation(maxPop) {
    if (!this.state) return;
    
    this.state.maxPopulation = Utils.clamp(maxPop, 5, 200);
    
    // If current population exceeds new max, mark excess ants for removal
    if (this.state.ants && this.state.ants.length > this.state.maxPopulation) {
      const excessCount = this.state.ants.length - this.state.maxPopulation;
      for (let i = 0; i < excessCount; i++) {
        const antIndex = this.state.ants.length - 1 - i;
        if (antIndex >= 0) {
          this.state.ants[antIndex].isDead = true;
        }
      }
    }
  }

  setAntSpeed(speed) {
    if (!this.state || !this.state.ants) return;
    
    const speedMultiplier = Utils.clamp(speed, 0.1, 3.0);
    
    // Update all existing ants' movement speed
    this.state.ants.forEach(ant => {
      if (ant.role && this.antBehaviorSystem.roles[ant.role]) {
        ant.movementSpeed = this.antBehaviorSystem.roles[ant.role].movementSpeed * speedMultiplier;
      }
    });
    
    // Store the speed multiplier for new ants
    this.antSpeedMultiplier = speedMultiplier;
  }

  setExplorationRate(rate) {
    if (!this.state || !this.state.ants) return;
    
    this.explorationRate = Utils.clamp(rate, 0.1, 1.0);
    
    // Update ants currently in exploring state
    this.state.ants.forEach(ant => {
      if (ant.state === 'exploring') {
        ant.explorationTendency = this.explorationRate;
      }
    });
  }

  setSocialCohesion(cohesion) {
    if (!this.state) return;
    
    this.socialCohesion = Utils.clamp(cohesion, 0.1, 1.0);
    // This affects how much ants follow each other's paths
  }

  setDisplayOption(option, value) {
    // These are handled by the renderer, just pass through
    if (this.displayOptions) {
      this.displayOptions[option] = value;
    }
  }

  setSeason(season) {
    if (!this.state || !this.state.environment) return;
    
    this.state.environment.season = season;
    
    // Seasonal effects on behavior and environment
    switch (season) {
      case 'Spring':
        this.setFoodAbundance(1.2);
        break;
      case 'Summer': 
        this.setFoodAbundance(1.5);
        break;
      case 'Autumn':
        this.setFoodAbundance(0.8);
        break;
      case 'Winter':
        this.setFoodAbundance(0.4);
        this.setAntSpeed(0.7); // Slower in winter
        break;
    }
  }

  setWeatherIntensity(intensity) {
    if (!this.state || !this.state.environment) return;
    
    this.state.environment.weatherIntensity = Utils.clamp(intensity, 0.0, 1.0);
    
    // Weather affects ant movement speed
    const weatherEffect = 1.0 - (intensity * 0.3); // Max 30% speed reduction
    this.weatherSpeedMultiplier = weatherEffect;
  }

  /**
   * Add terrain features to environment
   */
  addTerrainFeatures(environment, terrainFeatures) {
    const { width, height } = environment.metadata;
    
    // Initialize terrain features metadata
    environment.metadata.terrainFeatures = {};
    
    // Generate rivers
    if (terrainFeatures.rivers && terrainFeatures.rivers.enabled) {
      this.generateRivers(environment, terrainFeatures.rivers);
      environment.metadata.terrainFeatures.rivers = terrainFeatures.rivers;
    }
    
    // Generate mountains
    if (terrainFeatures.mountains && terrainFeatures.mountains.enabled) {
      this.generateMountains(environment, terrainFeatures.mountains);
      environment.metadata.terrainFeatures.mountains = terrainFeatures.mountains;
    }
    
    // Generate forests
    if (terrainFeatures.forests && terrainFeatures.forests.enabled) {
      this.generateForests(environment, terrainFeatures.forests);
      environment.metadata.terrainFeatures.forests = terrainFeatures.forests;
    }
  }

  /**
   * Generate rivers in the environment
   */
  generateRivers(environment, riverConfig) {
    const { width, height } = environment.metadata;
    const { count = 1, width: riverWidth = 1 } = riverConfig;
    
    for (let i = 0; i < count; i++) {
      this.generateSingleRiver(environment.terrain, width, height, riverWidth);
    }
  }

  /**
   * Generate a single river path
   */
  generateSingleRiver(terrain, width, height, riverWidth) {
    // Choose random start and end points
    let startX, startY, endX, endY;
    
    // Start from edges
    const edge = Math.random();
    if (edge < 0.25) { // Top edge
      startX = Utils.randomInt(1, width - 2);
      startY = 1;
    } else if (edge < 0.5) { // Right edge
      startX = width - 2;
      startY = Utils.randomInt(1, height - 2);
    } else if (edge < 0.75) { // Bottom edge
      startX = Utils.randomInt(1, width - 2);
      startY = height - 2;
    } else { // Left edge
      startX = 1;
      startY = Utils.randomInt(1, height - 2);
    }
    
    // End at opposite or adjacent edge
    const oppositeEdge = (edge + 0.5) % 1;
    if (oppositeEdge < 0.25) {
      endX = Utils.randomInt(1, width - 2);
      endY = 1;
    } else if (oppositeEdge < 0.5) {
      endX = width - 2;
      endY = Utils.randomInt(1, height - 2);
    } else if (oppositeEdge < 0.75) {
      endX = Utils.randomInt(1, width - 2);
      endY = height - 2;
    } else {
      endX = 1;
      endY = Utils.randomInt(1, height - 2);
    }
    
    // Generate path using simple pathfinding
    const path = this.generateRiverPath(startX, startY, endX, endY, width, height);
    
    // Place river tiles along path
    path.forEach(point => {
      for (let dy = -Math.floor(riverWidth/2); dy <= Math.floor(riverWidth/2); dy++) {
        for (let dx = -Math.floor(riverWidth/2); dx <= Math.floor(riverWidth/2); dx++) {
          const x = point.x + dx;
          const y = point.y + dy;
          if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
            // Don't overwrite nest
            if (terrain[y][x] !== '🏠') {
              terrain[y][x] = '🌊';
            }
          }
        }
      }
    });
  }

  /**
   * Generate river path between two points
   */
  generateRiverPath(startX, startY, endX, endY, width, height) {
    const path = [];
    let currentX = startX;
    let currentY = startY;
    
    path.push({ x: currentX, y: currentY });
    
    while (currentX !== endX || currentY !== endY) {
      // Choose direction with bias toward target
      const dx = endX - currentX;
      const dy = endY - currentY;
      
      let moveX = 0, moveY = 0;
      
      // Add some randomness to create natural curves
      if (Math.random() < 0.7) { // 70% chance to move toward target
        if (Math.abs(dx) > Math.abs(dy)) {
          moveX = dx > 0 ? 1 : -1;
        } else {
          moveY = dy > 0 ? 1 : -1;
        }
      } else { // 30% chance for random direction (creates curves)
        const directions = [];
        if (currentX > 1) directions.push([-1, 0]);
        if (currentX < width - 2) directions.push([1, 0]);
        if (currentY > 1) directions.push([0, -1]);
        if (currentY < height - 2) directions.push([0, 1]);
        
        if (directions.length > 0) {
          const randomDir = directions[Math.floor(Math.random() * directions.length)];
          moveX = randomDir[0];
          moveY = randomDir[1];
        }
      }
      
      currentX = Utils.clamp(currentX + moveX, 1, width - 2);
      currentY = Utils.clamp(currentY + moveY, 1, height - 2);
      
      path.push({ x: currentX, y: currentY });
      
      // Safety check to prevent infinite loops
      if (path.length > width + height) {
        break;
      }
    }
    
    return path;
  }

  /**
   * Generate mountains in the environment
   */
  generateMountains(environment, mountainConfig) {
    const { width, height } = environment.metadata;
    const { ranges = 1, size = 'medium' } = mountainConfig;
    
    // Define mountain sizes
    const sizeMap = {
      small: { minRadius: 3, maxRadius: 6, density: 0.6 },
      medium: { minRadius: 5, maxRadius: 10, density: 0.7 },
      large: { minRadius: 8, maxRadius: 15, density: 0.8 }
    };
    
    const mountainSize = sizeMap[size] || sizeMap.medium;
    
    for (let i = 0; i < ranges; i++) {
      this.generateMountainRange(environment.terrain, width, height, mountainSize);
    }
  }

  /**
   * Generate a single mountain range
   */
  generateMountainRange(terrain, width, height, mountainSize) {
    // Choose random center point away from edges and nest
    const centerX = Utils.randomInt(mountainSize.maxRadius, width - mountainSize.maxRadius);
    const centerY = Utils.randomInt(mountainSize.maxRadius, height - mountainSize.maxRadius);
    
    // Avoid nest area
    const nestX = Math.floor(width / 2);
    const nestY = Math.floor(height / 2);
    if (Utils.distance(centerX, centerY, nestX, nestY) < mountainSize.maxRadius + 3) {
      // Try a different position
      return this.generateMountainRange(terrain, width, height, mountainSize);
    }
    
    const radius = Utils.randomInt(mountainSize.minRadius, mountainSize.maxRadius);
    
    // Create mountain cluster
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          const distance = Utils.distance(x, y, centerX, centerY);
          const probability = Math.max(0, (radius - distance) / radius) * mountainSize.density;
          
          if (Math.random() < probability && terrain[y][x] !== '🏠' && terrain[y][x] !== '🌊') {
            terrain[y][x] = '⛰️';
          }
        }
      }
    }
  }

  /**
   * Generate forests in the environment
   */
  generateForests(environment, forestConfig) {
    const { width, height } = environment.metadata;
    const { patches = 2, density = 0.7 } = forestConfig;
    
    for (let i = 0; i < patches; i++) {
      this.generateForestPatch(environment.terrain, width, height, density);
    }
  }

  /**
   * Generate a single forest patch
   */
  generateForestPatch(terrain, width, height, density) {
    // Choose random center point
    const centerX = Utils.randomInt(5, width - 5);
    const centerY = Utils.randomInt(5, height - 5);
    
    // Avoid nest area
    const nestX = Math.floor(width / 2);
    const nestY = Math.floor(height / 2);
    if (Utils.distance(centerX, centerY, nestX, nestY) < 8) {
      // Try a different position
      return this.generateForestPatch(terrain, width, height, density);
    }
    
    const patchSize = Utils.randomInt(8, 12);
    
    // Create forest patch using organic growth pattern
    const forestCells = new Set();
    const queue = [{ x: centerX, y: centerY }];
    forestCells.add(`${centerX},${centerY}`);
    
    while (queue.length > 0 && forestCells.size < patchSize * patchSize * density) {
      const current = queue.shift();
      
      // Add neighbors with decreasing probability
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 }
      ];
      
      neighbors.forEach(neighbor => {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!forestCells.has(key) && 
            neighbor.x > 0 && neighbor.x < width - 1 && 
            neighbor.y > 0 && neighbor.y < height - 1) {
          
          const distance = Utils.distance(neighbor.x, neighbor.y, centerX, centerY);
          const probability = Math.max(0, (patchSize - distance) / patchSize) * density;
          
          if (Math.random() < probability) {
            forestCells.add(key);
            queue.push(neighbor);
          }
        }
      });
    }
    
    // Place forest tiles
    forestCells.forEach(cellKey => {
      const [x, y] = cellKey.split(',').map(Number);
      if (terrain[y][x] !== '🏠' && terrain[y][x] !== '🌊' && terrain[y][x] !== '⛰️') {
        terrain[y][x] = '🌲';
      }
    });
  }

  /**
   * Generate nests for multiple colony support
   */
  generateNests(environment, nestCount, config = {}) {
    const { width, height } = environment.metadata;
    const nests = [];
    
    if (nestCount === 1) {
      // Single nest in center (legacy behavior)
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      
      nests.push({
        id: 0,
        position: { x: centerX, y: centerY },
        colony: {
          id: 0,
          food: 10,
          population: { total: 0, workers: 0, scouts: 0, soldiers: 0 },
          morale: 7.5,
          diplomacy: {},
          territorialControl: 1.0
        }
      });
      
      // Place nest tile in terrain
      environment.terrain[centerY][centerX] = '🏠';
    } else {
      // Multiple nests with different placement strategies
      const nestSpacing = config.nestSpacing || 'distributed';
      const minDistance = config.minNestDistance || Math.min(width, height) / 4;
      
      const positions = this.generateNestPositions(width, height, nestCount, nestSpacing, minDistance);
      
      for (let i = 0; i < nestCount; i++) {
        const position = positions[i];
        
        nests.push({
          id: i,
          position: position,
          colony: {
            id: i,
            food: 10,
            population: { total: 0, workers: 0, scouts: 0, soldiers: 0 },
            morale: 7.5,
            diplomacy: {},
            territorialControl: 0.8
          }
        });
        
        // Place nest tiles in terrain (ensure valid coordinates)
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        if (y >= 0 && y < environment.terrain.length && x >= 0 && x < environment.terrain[0].length) {
          environment.terrain[y][x] = '🏠';
        }
      }
    }
    
    return nests;
  }

  /**
   * Generate nest positions based on placement strategy
   */
  generateNestPositions(width, height, nestCount, nestSpacing, minDistance) {
    const positions = [];
    
    switch (nestSpacing) {
      case 'corners':
        return this.generateCornerNestPositions(width, height, nestCount);
      
      case 'grid':
        return this.generateGridNestPositions(width, height, nestCount);
      
      case 'distributed':
      default:
        return this.generateDistributedNestPositions(width, height, nestCount, minDistance);
    }
  }

  /**
   * Generate nest positions in corners
   */
  generateCornerNestPositions(width, height, nestCount) {
    const positions = [];
    const margin = Math.min(width, height) * 0.15; // 15% margin from edges
    
    const cornerPositions = [
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.25) },
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.25) },
      { x: Math.floor(width * 0.25), y: Math.floor(height * 0.75) },
      { x: Math.floor(width * 0.75), y: Math.floor(height * 0.75) }
    ];
    
    for (let i = 0; i < Math.min(nestCount, cornerPositions.length); i++) {
      positions.push(cornerPositions[i]);
    }
    
    // If more nests needed, place randomly
    while (positions.length < nestCount) {
      const x = Utils.randomInt(margin, width - margin);
      const y = Utils.randomInt(margin, height - margin);
      positions.push({ x, y });
    }
    
    return positions;
  }

  /**
   * Generate nest positions in grid pattern
   */
  generateGridNestPositions(width, height, nestCount) {
    const positions = [];
    const gridSize = Math.ceil(Math.sqrt(nestCount));
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);
    
    for (let i = 0; i < nestCount; i++) {
      const gridX = i % gridSize;
      const gridY = Math.floor(i / gridSize);
      
      const x = Math.floor(cellWidth * (gridX + 0.5));
      const y = Math.floor(cellHeight * (gridY + 0.5));
      
      positions.push({ x, y });
    }
    
    return positions;
  }

  /**
   * Generate distributed nest positions with minimum distance
   */
  generateDistributedNestPositions(width, height, nestCount, minDistance) {
    const positions = [];
    const margin = Math.min(width, height) * 0.1; // 10% margin
    const maxAttempts = 100;
    
    for (let i = 0; i < nestCount; i++) {
      let position = null;
      let attempts = 0;
      
      do {
        const x = Utils.randomInt(margin, width - margin);
        const y = Utils.randomInt(margin, height - margin);
        position = { x, y };
        
        // Check minimum distance from existing nests
        const validPosition = positions.every(existingPos => {
          const distance = Utils.distance(x, y, existingPos.x, existingPos.y);
          return distance >= minDistance;
        });
        
        if (validPosition) {
          break;
        }
        
        position = null;
        attempts++;
      } while (attempts < maxAttempts);
      
      // If couldn't find valid position, place anyway with reduced distance
      if (!position) {
        const x = Utils.randomInt(margin, width - margin);
        const y = Utils.randomInt(margin, height - margin);
        position = { x, y };
      }
      
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * Generate territory map for multiple colonies
   */
  generateTerritoryMap(environment, nests, territoryConfig) {
    const { width, height } = environment.metadata;
    const { type = 'voronoi', neutralZones = false, neutralZoneWidth = 2 } = territoryConfig;
    
    // Initialize territory map
    environment.territoryMap = [];
    for (let y = 0; y < height; y++) {
      environment.territoryMap[y] = new Array(width).fill(null);
    }
    
    switch (type) {
      case 'grid':
        this.generateGridTerritories(environment.territoryMap, width, height, nests);
        break;
      
      case 'voronoi':
      default:
        this.generateVoronoiTerritories(environment.territoryMap, width, height, nests);
        break;
    }
    
    // Add neutral zones if requested
    if (neutralZones) {
      this.addNeutralZones(environment.territoryMap, width, height, neutralZoneWidth);
    }
    
    // Store territory config in metadata
    environment.metadata.interColonyDynamics = territoryConfig;
  }

  /**
   * Generate grid-based territory divisions
   */
  generateGridTerritories(territoryMap, width, height, nests) {
    const nestCount = nests.length;
    const gridSize = Math.ceil(Math.sqrt(nestCount));
    const cellWidth = Math.floor(width / gridSize);
    const cellHeight = Math.floor(height / gridSize);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gridX = Math.floor(x / cellWidth);
        const gridY = Math.floor(y / cellHeight);
        const territoryId = (gridY * gridSize + gridX) % nestCount;
        
        territoryMap[y][x] = territoryId;
      }
    }
  }

  /**
   * Generate Voronoi-based territory divisions
   */
  generateVoronoiTerritories(territoryMap, width, height, nests) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let closestNest = 0;
        let minDistance = Infinity;
        
        // Find closest nest for this cell
        for (let i = 0; i < nests.length; i++) {
          const distance = Utils.distance(x, y, nests[i].position.x, nests[i].position.y);
          if (distance < minDistance) {
            minDistance = distance;
            closestNest = i;
          }
        }
        
        territoryMap[y][x] = closestNest;
      }
    }
  }

  /**
   * Add neutral zones between territories
   */
  addNeutralZones(territoryMap, width, height, neutralZoneWidth) {
    const originalMap = territoryMap.map(row => [...row]); // Deep copy
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const currentTerritory = originalMap[y][x];
        
        // Check if this cell is near a territory boundary
        let nearBoundary = false;
        
        for (let dy = -neutralZoneWidth; dy <= neutralZoneWidth; dy++) {
          for (let dx = -neutralZoneWidth; dx <= neutralZoneWidth; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              if (originalMap[ny][nx] !== currentTerritory) {
                nearBoundary = true;
                break;
              }
            }
          }
          if (nearBoundary) break;
        }
        
        // Mark as neutral zone if near boundary
        if (nearBoundary) {
          territoryMap[y][x] = -1; // -1 indicates neutral zone
        }
      }
    }
  }

  /**
   * Initialize pheromone communication system
   */
  initializePheromoneSystem(environment, pheromoneConfig, nestCount) {
    const { width, height } = environment.metadata;
    
    // Store pheromone configuration
    environment.metadata.pheromoneSystem = pheromoneConfig;
    
    // Initialize main pheromone map
    environment.pheromoneMap = [];
    for (let y = 0; y < height; y++) {
      environment.pheromoneMap[y] = new Array(width).fill(0);
    }
    
    // Initialize different pheromone types if configured
    if (pheromoneConfig.trailTypes) {
      environment.pheromoneTypes = {};
      pheromoneConfig.trailTypes.forEach(type => {
        environment.pheromoneTypes[type] = [];
        for (let y = 0; y < height; y++) {
          environment.pheromoneTypes[type][y] = new Array(width).fill(0);
        }
      });
    }
    
    // Initialize colony-specific pheromones for multiple nests
    if (nestCount > 1 && pheromoneConfig.colonySpecific) {
      environment.pheromoneByColony = {};
      for (let i = 0; i < nestCount; i++) {
        environment.pheromoneByColony[i] = [];
        for (let y = 0; y < height; y++) {
          environment.pheromoneByColony[i][y] = new Array(width).fill(0);
        }
      }
    }
    
    // Initialize pheromone system state
    environment.pheromoneSystem = {
      lastUpdate: 0,
      decayCounter: 0,
      reinforcementMap: [], // Track trail reinforcement
      config: pheromoneConfig
    };
    
    // Initialize reinforcement map
    for (let y = 0; y < height; y++) {
      environment.pheromoneSystem.reinforcementMap[y] = new Array(width).fill(0);
    }
  }

  /**
   * Update pheromone system during simulation
   */
  updatePheromoneSystem() {
    if (!this.state.environment.pheromoneMap) return;
    
    const environment = this.state.environment;
    const config = environment.metadata.pheromoneSystem;
    const { width, height } = environment.metadata;
    
    // Decay pheromones over time
    if (config.decayRate && config.decayRate > 0) {
      this.decayPheromones(environment, config);
    }
    
    // Update ant pheromone laying
    this.state.ants.forEach(ant => {
      this.layPheromones(ant, environment, config);
    });
    
    // Update ant pathfinding based on pheromones
    this.state.ants.forEach(ant => {
      this.influenceAntMovement(ant, environment, config);
    });
  }

  /**
   * Decay pheromone trails over time
   */
  decayPheromones(environment, config) {
    const { width, height } = environment.metadata;
    const decayRate = config.decayRate || 0.1;
    const evaporationThreshold = config.evaporationThreshold || 0.05;
    
    // Decay main pheromone map
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (environment.pheromoneMap[y][x] > 0) {
          environment.pheromoneMap[y][x] *= (1 - decayRate);
          
          // Evaporate if below threshold
          if (environment.pheromoneMap[y][x] < evaporationThreshold) {
            environment.pheromoneMap[y][x] = 0;
          }
        }
      }
    }
    
    // Decay typed pheromones
    if (environment.pheromoneTypes) {
      Object.keys(environment.pheromoneTypes).forEach(type => {
        const typeMap = environment.pheromoneTypes[type];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (typeMap[y][x] > 0) {
              typeMap[y][x] *= (1 - decayRate);
              if (typeMap[y][x] < evaporationThreshold) {
                typeMap[y][x] = 0;
              }
            }
          }
        }
      });
    }
    
    // Decay colony-specific pheromones
    if (environment.pheromoneByColony) {
      Object.keys(environment.pheromoneByColony).forEach(colonyId => {
        const colonyMap = environment.pheromoneByColony[colonyId];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (colonyMap[y][x] > 0) {
              colonyMap[y][x] *= (1 - decayRate);
              if (colonyMap[y][x] < evaporationThreshold) {
                colonyMap[y][x] = 0;
              }
            }
          }
        }
      });
    }
  }

  /**
   * Lay pheromones as ants move
   */
  layPheromones(ant, environment, config) {
    const { x, y } = ant.position;
    const { width, height } = environment.metadata;
    
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    // Check if position is valid for pheromone laying
    const terrain = environment.terrain[y][x];
    if (terrain === '🌊' || terrain === '⛰️') return; // Can't lay on impassable terrain
    
    const trailStrength = config.trailStrength || 1.0;
    let pheromoneAmount = 0;
    
    // Determine pheromone amount based on ant state
    switch (ant.state) {
      case 'returning':
        pheromoneAmount = trailStrength * (config.strengthMultipliers?.food || 1.5);
        break;
      case 'exploring':
        pheromoneAmount = trailStrength * (config.strengthMultipliers?.exploration || 0.5);
        break;
      case 'foraging':
        pheromoneAmount = trailStrength * 1.0;
        break;
      default:
        pheromoneAmount = trailStrength * 0.3;
    }
    
    // Lay pheromones in main map
    environment.pheromoneMap[y][x] = Math.min(
      environment.pheromoneMap[y][x] + pheromoneAmount,
      config.maxStrength || 5.0
    );
    
    // Lay typed pheromones
    if (environment.pheromoneTypes) {
      if (ant.state === 'returning' && ant.carryingFood) {
        environment.pheromoneTypes.food[y][x] = Math.min(
          environment.pheromoneTypes.food[y][x] + pheromoneAmount,
          config.maxStrength || 5.0
        );
      } else if (ant.state === 'exploring') {
        environment.pheromoneTypes.exploration[y][x] = Math.min(
          environment.pheromoneTypes.exploration[y][x] + pheromoneAmount * 0.5,
          config.maxStrength || 5.0
        );
      }
    }
    
    // Lay colony-specific pheromones
    if (environment.pheromoneByColony && ant.colonyId !== undefined) {
      const colonyMap = environment.pheromoneByColony[ant.colonyId];
      if (colonyMap) {
        colonyMap[y][x] = Math.min(
          colonyMap[y][x] + pheromoneAmount,
          config.maxStrength || 5.0
        );
      }
    }
  }

  /**
   * Influence ant movement based on pheromone trails
   */
  influenceAntMovement(ant, environment, config) {
    if (!config.pathfindingWeight || ant.state === 'resting') return;
    
    const { x, y } = ant.position;
    const { width, height } = environment.metadata;
    const followProbability = config.followProbability || 0.7;
    
    // Random chance to ignore pheromones (exploration vs exploitation)
    if (Math.random() > followProbability) return;
    
    // Find direction with strongest pheromone gradient
    const directions = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
    ];
    
    let bestDirection = null;
    let bestStrength = 0;
    
    directions.forEach(dir => {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        let strength = environment.pheromoneMap[ny][nx];
        
        // Boost strength for relevant pheromone types
        if (environment.pheromoneTypes) {
          if (ant.state === 'foraging' && environment.pheromoneTypes.food) {
            strength += environment.pheromoneTypes.food[ny][nx] * 2.0;
          }
          if (ant.state === 'exploring' && environment.pheromoneTypes.exploration) {
            strength += environment.pheromoneTypes.exploration[ny][nx] * 1.0;
          }
        }
        
        // Check for colony-specific pheromones
        if (environment.pheromoneByColony && ant.colonyId !== undefined) {
          const colonyMap = environment.pheromoneByColony[ant.colonyId];
          if (colonyMap) {
            strength += colonyMap[ny][nx] * 1.5; // Prefer own colony's trails
          }
          
          // Reduce attraction to other colonies' trails
          Object.keys(environment.pheromoneByColony).forEach(otherColonyId => {
            if (parseInt(otherColonyId) !== ant.colonyId) {
              const otherMap = environment.pheromoneByColony[otherColonyId];
              const crossColonyFactor = config.crossColonyInteraction || 0.1;
              strength += otherMap[ny][nx] * crossColonyFactor;
            }
          });
        }
        
        if (strength > bestStrength) {
          bestStrength = strength;
          bestDirection = dir;
        }
      }
    });
    
    // Apply pheromone influence to ant's target position
    if (bestDirection && bestStrength > 0.1) {
      const influence = config.trailInfluence || 1.0;
      const newX = Utils.clamp(x + bestDirection.dx, 0, width - 1);
      const newY = Utils.clamp(y + bestDirection.dy, 0, height - 1);
      
      // Set or modify ant's target position based on pheromone influence
      if (Math.random() < influence * 0.5) {
        ant.targetPosition = { x: newX, y: newY };
      }
    }
  }
}