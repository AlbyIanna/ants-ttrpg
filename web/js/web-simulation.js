/**
 * Browser-Adapted Live Simulation Engine for Ant Colony TTRPG
 * Version: v0.4 - Browser-compatible real-time simulation
 */

class WebSimulation {
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
      generate: (width = 35, height = 20, biome = 'forest_floor') => {
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
          defenseStrength: 2.0
        }
      },
      
      updateAnt: (ant, environment, state) => {
        const result = {
          movement: false,
          stateChange: false,
          discovery: null
        };
        
        const oldState = ant.state;
        const oldPosition = { ...ant.position };
        
        // Basic behavior based on role and current state
        switch (ant.role) {
          case 'worker':
            this.updateWorkerBehavior(ant, environment, state, result);
            break;
          case 'scout':
            this.updateScoutBehavior(ant, environment, state, result);
            break;
          case 'soldier':
            this.updateSoldierBehavior(ant, environment, state, result);
            break;
        }
        
        // Check for movement
        if (ant.position.x !== oldPosition.x || ant.position.y !== oldPosition.y) {
          result.movement = true;
        }
        
        // Check for state change
        if (ant.state !== oldState) {
          result.stateChange = true;
        }
        
        return result;
      }
    };
  }

  /**
   * Generate terrain cell content
   */
  generateTerrainCell(x, y, width, height, biome) {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Border cells
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
      if (x === 0 && y === 0) return '╔';
      if (x === width - 1 && y === 0) return '╗';
      if (x === 0 && y === height - 1) return '╚';
      if (x === width - 1 && y === height - 1) return '╝';
      if (y === 0 || y === height - 1) return '═';
      if (x === 0 || x === width - 1) return '║';
    }
    
    // Nest in center
    if (x === centerX && y === centerY) {
      return '🏠';
    }
    
    // Nest area
    const nestDistance = Utils.distance(x, y, centerX, centerY);
    if (nestDistance <= 1.5) {
      return '▪';
    }
    
    // Environmental features based on biome
    const random = Math.random();
    if (random < 0.15) {
      return Utils.randomChoice(['🌱', '🌿', '🍄', '🪨']);
    } else if (random < 0.25) {
      return Utils.randomChoice(['🌱', '🌱', '🌱', '🪵']);
    }
    
    return '.';
  }

  /**
   * Add food sources to environment
   */
  addFoodSources(environment, count) {
    const { width, height } = environment.metadata;
    
    for (let i = 0; i < count; i++) {
      const x = Utils.randomInt(2, width - 3);
      const y = Utils.randomInt(2, height - 3);
      
      // Don't place on nest
      if (Utils.distance(x, y, Math.floor(width/2), Math.floor(height/2)) < 3) {
        continue;
      }
      
      const foodSource = {
        id: `food_${i}`,
        x: x,
        y: y,
        type: Utils.randomChoice(['berries', 'seeds', 'nectar']),
        nutrition: Utils.randomInt(10, 30),
        discovered: false,
        depleted: false
      };
      
      environment.foodSources.push(foodSource);
    }
  }

  /**
   * Add hazards to environment
   */
  addHazards(environment, count) {
    const { width, height } = environment.metadata;
    
    for (let i = 0; i < count; i++) {
      const x = Utils.randomInt(1, width - 2);
      const y = Utils.randomInt(1, height - 2);
      
      const hazard = {
        id: `hazard_${i}`,
        x: x,
        y: y,
        type: Utils.randomChoice(['predator', 'weather', 'obstacle']),
        severity: Utils.randomFloat(0.3, 1.0),
        active: true
      };
      
      environment.hazards.push(hazard);
    }
  }

  /**
   * Worker ant behavior
   */
  updateWorkerBehavior(ant, environment, state, result) {
    if (!ant.state) ant.state = 'foraging';
    
    // Simple state machine
    switch (ant.state) {
      case 'foraging':
        if (ant.carryingFood) {
          ant.state = 'returning';
        } else {
          this.moveTowardsFood(ant, environment, state);
        }
        break;
        
      case 'returning':
        if (this.isAtNest(ant, environment)) {
          ant.carryingFood = false;
          state.food += Utils.randomInt(1, 3);
          ant.state = 'foraging';
          result.discovery = { type: 'food', amount: 2 };
        } else {
          this.moveTowardsNest(ant, environment);
        }
        break;
        
      case 'resting':
        if (Utils.randomFloat(0, 1) < 0.1) {
          ant.state = 'foraging';
        }
        break;
    }
  }

  /**
   * Scout ant behavior
   */
  updateScoutBehavior(ant, environment, state, result) {
    if (!ant.state) ant.state = 'exploring';
    
    switch (ant.state) {
      case 'exploring':
        this.moveRandomly(ant, environment);
        // Check for food discovery
        const nearbyFood = this.findNearbyFood(ant, environment);
        if (nearbyFood && !nearbyFood.discovered) {
          nearbyFood.discovered = true;
          result.discovery = { type: 'food_source', foodType: nearbyFood.type, position: { x: nearbyFood.x, y: nearbyFood.y } };
        }
        break;
        
      case 'returning':
        this.moveTowardsNest(ant, environment);
        if (this.isAtNest(ant, environment)) {
          ant.state = 'exploring';
        }
        break;
    }
  }

  /**
   * Soldier ant behavior
   */
  updateSoldierBehavior(ant, environment, state, result) {
    if (!ant.state) ant.state = 'patrolling';
    
    switch (ant.state) {
      case 'patrolling':
        this.patrolAroundNest(ant, environment);
        break;
        
      case 'defending':
        // Simplified defense behavior
        if (Utils.randomFloat(0, 1) < 0.2) {
          ant.state = 'patrolling';
        }
        break;
    }
  }

  /**
   * Movement helpers
   */
  moveTowardsFood(ant, environment, state) {
    const nearbyFood = this.findNearbyFood(ant, environment);
    if (nearbyFood) {
      this.moveTowards(ant, nearbyFood, environment);
      if (ant.position.x === nearbyFood.x && ant.position.y === nearbyFood.y) {
        ant.carryingFood = true;
      }
    } else {
      this.moveRandomly(ant, environment);
    }
  }

  moveTowardsNest(ant, environment) {
    const nestPos = this.getNestPosition(environment);
    this.moveTowards(ant, nestPos, environment);
  }

  moveTowards(ant, target, environment) {
    const dx = Math.sign(target.x - ant.position.x);
    const dy = Math.sign(target.y - ant.position.y);
    
    const newX = Utils.clamp(ant.position.x + dx, 1, environment.metadata.width - 2);
    const newY = Utils.clamp(ant.position.y + dy, 1, environment.metadata.height - 2);
    
    ant.position.x = newX;
    ant.position.y = newY;
  }

  moveRandomly(ant, environment) {
    const directions = [
      { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
      { x: -1, y: 0 },                    { x: 1, y: 0 },
      { x: -1, y: 1 },  { x: 0, y: 1 },  { x: 1, y: 1 }
    ];
    
    const dir = Utils.randomChoice(directions);
    const newX = Utils.clamp(ant.position.x + dir.x, 1, environment.metadata.width - 2);
    const newY = Utils.clamp(ant.position.y + dir.y, 1, environment.metadata.height - 2);
    
    ant.position.x = newX;
    ant.position.y = newY;
  }

  patrolAroundNest(ant, environment) {
    const nestPos = this.getNestPosition(environment);
    const distance = Utils.distance(ant.position.x, ant.position.y, nestPos.x, nestPos.y);
    
    if (distance > 4) {
      this.moveTowards(ant, nestPos, environment);
    } else if (distance < 2) {
      this.moveRandomly(ant, environment);
    } else {
      this.moveRandomly(ant, environment);
    }
  }

  /**
   * Helper functions
   */
  findNearbyFood(ant, environment) {
    return environment.foodSources.find(food => 
      !food.depleted && 
      Utils.distance(ant.position.x, ant.position.y, food.x, food.y) <= 2
    );
  }

  isAtNest(ant, environment) {
    const nestPos = this.getNestPosition(environment);
    return Utils.distance(ant.position.x, ant.position.y, nestPos.x, nestPos.y) <= 1;
  }

  getNestPosition(environment) {
    return {
      x: Math.floor(environment.metadata.width / 2),
      y: Math.floor(environment.metadata.height / 2)
    };
  }

  /**
   * Create initial simulation state
   */
  createInitialState(biome = 'forest_floor') {
    const environment = this.environmentSystem.generate(35, 20, biome);
    const nestPos = this.getNestPosition(environment);
    
    // Create initial ant colony
    const ants = [];
    
    // Add workers
    for (let i = 0; i < 7; i++) {
      ants.push(this.createAnt(i, 'worker', nestPos, environment));
    }
    
    // Add scouts
    for (let i = 7; i < 9; i++) {
      ants.push(this.createAnt(i, 'scout', nestPos, environment));
    }
    
    // Add soldier
    ants.push(this.createAnt(9, 'soldier', nestPos, environment));
    
    return {
      turn: 1,
      food: 15,
      population: {
        total: 10,
        workers: 7,
        scouts: 2,
        soldiers: 1
      },
      morale: 5.0,
      biome: biome,
      environment: environment,
      ants: ants,
      recentMovements: [],
      recentDiscoveries: [],
      discoveredFood: 0,
      narrative_context: {
        current_season: 'spring'
      }
    };
  }

  /**
   * Create individual ant
   */
  createAnt(id, role, nestPos, environment) {
    const roleConfig = this.antBehaviorSystem.roles[role];
    const spawnRadius = role === 'scout' ? 3 : 1;
    
    const ant = {
      id: id,
      role: role,
      position: {
        x: Utils.clamp(nestPos.x + Utils.randomInt(-spawnRadius, spawnRadius), 1, environment.metadata.width - 2),
        y: Utils.clamp(nestPos.y + Utils.randomInt(-spawnRadius, spawnRadius), 1, environment.metadata.height - 2)
      },
      state: role === 'worker' ? 'foraging' : role === 'scout' ? 'exploring' : 'patrolling',
      energy: roleConfig.energy,
      energyMax: roleConfig.energyMax,
      carryingFood: false,
      movementCooldown: 0
    };
    
    return ant;
  }

  /**
   * Start the simulation
   */
  start(biome = null) {
    if (this.isRunning) return false;
    
    Utils.addActivity('🚀 Starting ant colony simulation...', 'info');
    
    // Initialize state
    this.state = this.createInitialState(biome || 'forest_floor');
    this.isRunning = true;
    this.isPaused = false;
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.lastUpdateTime = Date.now();
    
    // Start animation loop
    this.animationLoop();
    
    Utils.addActivity(`✅ Simulation started with ${this.state.ants.length} ants`, 'info');
    
    return true;
  }

  /**
   * Pause/unpause simulation
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.lastUpdateTime = Date.now();
    }
    return this.isPaused;
  }

  /**
   * Stop simulation
   */
  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    Utils.addActivity('⏹️ Simulation stopped', 'info');
  }

  /**
   * Reset simulation
   */
  reset() {
    this.stop();
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.state = null;
    Utils.addActivity('🔄 Simulation reset', 'info');
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed) {
    this.simulationSpeed = Utils.clamp(speed, 0.1, 5.0);
  }

  /**
   * Main animation loop
   */
  animationLoop() {
    if (!this.isRunning) return;
    
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    
    // Update at controlled rate
    if (deltaTime >= (this.updateInterval / 1000) / this.simulationSpeed) {
      if (!this.isPaused) {
        this.updateSimulation(deltaTime);
      }
      this.lastUpdateTime = currentTime;
    }
    
    this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Update simulation state
   */
  updateSimulation(deltaTime) {
    Utils.performance.start('simulation_update');
    
    // Update elapsed time
    this.elapsedTime += deltaTime * this.timeScale;
    this.frameCount++;
    
    // Update ant behaviors
    this.updateAntBehaviors(deltaTime);
    
    // Update environment
    this.updateEnvironment(deltaTime);
    
    // Update colony resources
    this.updateColonyResources(deltaTime);
    
    // Update performance stats
    this.updatePerformanceStats();
    
    // Trigger callbacks
    if (this.onStateUpdate) {
      this.onStateUpdate(this.state, {
        deltaTime,
        elapsedTime: this.elapsedTime,
        frameCount: this.frameCount,
        performance: this.performanceStats
      });
    }
    
    Utils.performance.end('simulation_update');
  }

  /**
   * Update all ant behaviors
   */
  updateAntBehaviors(deltaTime) {
    const movements = [];
    const discoveries = [];
    
    for (const ant of this.state.ants) {
      // Update ant energy and cooldowns
      if (ant.movementCooldown > 0) {
        ant.movementCooldown -= deltaTime;
        continue;
      }
      
      const oldPosition = { ...ant.position };
      const result = this.antBehaviorSystem.updateAnt(ant, this.state.environment, this.state);
      
      if (result.movement) {
        movements.push({
          antId: ant.id,
          from: oldPosition,
          to: { ...ant.position },
          behavior: ant.state
        });
      }
      
      if (result.discovery) {
        discoveries.push(result.discovery);
      }
      
      // Set movement cooldown
      ant.movementCooldown = 0.5; // 500ms cooldown
    }
    
    this.state.recentMovements = movements;
    this.state.recentDiscoveries = discoveries;
    
    // Trigger callbacks
    if (this.onDiscovery && discoveries.length > 0) {
      this.onDiscovery(discoveries);
    }
  }

  /**
   * Update environment
   */
  updateEnvironment(deltaTime) {
    // Simple seasonal progression
    const seasonTime = this.elapsedTime / 240; // 4 minutes per season
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentSeason = seasons[Math.floor(seasonTime) % seasons.length];
    
    if (this.state.narrative_context.current_season !== currentSeason) {
      this.state.narrative_context.current_season = currentSeason;
      if (this.onEnvironmentChange) {
        this.onEnvironmentChange({ type: 'season_change', season: currentSeason });
      }
      Utils.addActivity(`🍂 Season changed to ${currentSeason}!`, 'info');
    }
  }

  /**
   * Update colony resources
   */
  updateColonyResources(deltaTime) {
    // Food consumption
    const consumptionRate = this.state.narrative_context.current_season === 'winter' ? 2 : 1;
    const foodConsumption = (this.state.population.total * 0.1 * deltaTime * consumptionRate);
    
    this.state.food = Math.max(0, this.state.food - foodConsumption);
    
    // Morale calculation
    if (this.state.food <= 0) {
      this.state.morale = Math.max(0, this.state.morale - deltaTime * 0.5);
    } else if (this.state.food > 10) {
      this.state.morale = Math.min(10, this.state.morale + deltaTime * 0.1);
    }
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats() {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastStatsUpdate;
    
    if (timeSinceLastUpdate >= 1000) { // Update every second
      this.performanceStats.updatesPerSecond = Math.round(this.frameCount * 1000 / timeSinceLastUpdate);
      this.performanceStats.fps = this.performanceStats.updatesPerSecond;
      this.frameCount = 0;
      this.lastStatsUpdate = now;
    }
  }

  /**
   * Get current simulation state
   */
  getState() {
    return this.state;
  }

  /**
   * Get performance stats
   */
  getPerformanceStats() {
    return this.performanceStats;
  }
}

// Export for use in other modules
window.WebSimulation = WebSimulation;