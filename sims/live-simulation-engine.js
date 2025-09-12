/**
 * Live Simulation Engine for Ant Colony TTRPG
 * Version: v0.5 - Real-time autonomous ant colony simulation
 */

const SimulationEngine = require('./simulation-engine');
const EnvironmentEngine = require('./environment-engine');
const PathfindingEngine = require('./pathfinding');
const AntBehaviorSystem = require('./ant-behavior');
const MovementAnimator = require('./movement-animator');

class LiveSimulationEngine extends SimulationEngine {
  constructor() {
    super();
    
    // Real-time simulation settings
    this.isRunning = false;
    this.isPaused = false;
    this.simulationSpeed = 1; // 1x normal speed
    this.updateInterval = 800; // Base update interval in ms
    this.lastUpdateTime = Date.now();
    
    // Simulation loop control
    this.intervalId = null;
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
      antActionsPerSecond: 0
    };
    
    this.lastStatsUpdate = Date.now();
    this.updateTimes = [];
  }

  /**
   * Start the real-time simulation
   */
  startLiveSimulation(biome = null) {
    if (this.isRunning) {
      console.log('⚠️  Simulation already running');
      return false;
    }

    console.log('🚀 Starting live ant colony simulation...');
    
    // Initialize simulation state
    this.state = this.createInitialState(biome);
    this.isRunning = true;
    this.isPaused = false;
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.lastUpdateTime = Date.now();
    
    // Start the main simulation loop
    this.intervalId = setInterval(() => {
      this.simulationLoop();
    }, this.updateInterval / this.simulationSpeed);
    
    console.log(`✅ Live simulation started with ${this.state.ants.length} ants`);
    console.log(`   Environment: ${this.state.biome} (${this.state.environment.metadata.width}x${this.state.environment.metadata.height})`);
    console.log(`   Update frequency: ${Math.round(1000 / (this.updateInterval / this.simulationSpeed))} Hz`);
    
    return true;
  }

  /**
   * Main simulation loop - runs continuously
   */
  simulationLoop() {
    if (this.isPaused) return;
    
    const startTime = Date.now();
    const deltaTime = (startTime - this.lastUpdateTime) / 1000; // Convert to seconds
    
    // Update elapsed time
    this.elapsedTime += deltaTime * this.timeScale;
    this.frameCount++;
    
    // Process autonomous ant behaviors
    this.updateAntBehaviorsLive(deltaTime);
    
    // Process environmental changes
    this.updateEnvironmentLive(deltaTime);
    
    // Process resource consumption and colony maintenance
    this.updateColonyResourcesLive(deltaTime);
    
    // Check for random events
    this.checkRandomEventsLive(deltaTime);
    
    // Update performance statistics
    this.updatePerformanceStats(startTime);
    
    // Trigger state update callback
    if (this.onStateUpdate) {
      this.onStateUpdate(this.state, {
        deltaTime: deltaTime,
        elapsedTime: this.elapsedTime,
        frameCount: this.frameCount
      });
    }
    
    this.lastUpdateTime = startTime;
  }

  /**
   * Update ant behaviors in real-time
   */
  updateAntBehaviorsLive(deltaTime) {
    if (!this.state.ants || !this.state.environment) return;
    
    const antActions = [];
    const discoveries = [];
    const movements = [];
    
    for (const ant of this.state.ants) {
      // Update ant energy and cooldowns
      this.updateAntPhysiology(ant, deltaTime);
      
      // Skip if ant is on cooldown
      if (ant.movementCooldown > 0) {
        ant.movementCooldown -= deltaTime;
        continue;
      }
      
      // Decide and execute behavior
      const oldPosition = { ...ant.position };
      const oldState = ant.state;
      
      // Use existing behavior system but make it time-aware
      const behaviorResult = this.antBehaviorSystem.updateSingleAnt(ant, this.state.environment, this.state);
      
      // Track changes
      if (behaviorResult.movement) {
        movements.push({
          antId: ant.id,
          from: oldPosition,
          to: { ...ant.position },
          behavior: ant.state,
          deltaTime: deltaTime
        });
      }
      
      if (behaviorResult.stateChange && oldState !== ant.state) {
        antActions.push({
          antId: ant.id,
          action: `${oldState} -> ${ant.state}`,
          position: { ...ant.position },
          timestamp: Date.now()
        });
      }
      
      if (behaviorResult.discovery) {
        discoveries.push({
          ...behaviorResult.discovery,
          antId: ant.id,
          timestamp: Date.now()
        });
      }
    }
    
    // Process food deliveries and interactions
    this.processAntInteractionsLive(movements, discoveries);
    
    // Store movement data for visualization
    this.state.recentMovements = movements;
    this.state.recentDiscoveries = discoveries;
    
    // Callback for ant actions
    if (this.onAntAction && antActions.length > 0) {
      this.onAntAction(antActions);
    }
    
    if (this.onDiscovery && discoveries.length > 0) {
      this.onDiscovery(discoveries);
    }
  }

  /**
   * Update individual ant physiology over time
   */
  updateAntPhysiology(ant, deltaTime) {
    const config = this.antBehaviorSystem.roleConfigs[ant.role];
    
    // Energy consumption
    let energyConsumption = config.energyConsumption * deltaTime;
    
    // Extra energy cost for movement and carrying
    if (ant.state === 'foraging' || ant.state === 'exploring') {
      energyConsumption *= 1.2;
    }
    if (ant.carryingFood) {
      energyConsumption *= 1.3;
    }
    
    ant.energy = Math.max(0, ant.energy - energyConsumption);
    
    // Rest when energy is low
    if (ant.energy < config.energyMax * 0.2 && ant.state !== 'resting') {
      ant.state = 'resting';
      ant.goal = ant.nestPosition;
    }
    
    // Recover energy when resting
    if (ant.state === 'resting') {
      ant.energy = Math.min(config.energyMax, ant.energy + (config.energyMax * 0.1 * deltaTime));
    }
  }

  /**
   * Update environment in real-time
   */
  updateEnvironmentLive(deltaTime) {
    // Gradual food source depletion and regeneration
    for (const foodSource of this.state.environment.foodSources) {
      if (foodSource.depleted && Math.random() < 0.001 * deltaTime) {
        // Small chance of food source regeneration
        foodSource.depleted = false;
        foodSource.nutrition = Math.floor(foodSource.maxNutrition * 0.5);
        
        if (this.onEnvironmentChange) {
          this.onEnvironmentChange({
            type: 'food_regeneration',
            position: { x: foodSource.x, y: foodSource.y },
            foodType: foodSource.type
          });
        }
      }
    }
    
    // Seasonal progression
    const seasonDuration = 300; // 5 minutes per season in real time
    const seasonProgress = (this.elapsedTime % seasonDuration) / seasonDuration;
    
    if (this.elapsedTime > 150 && this.state.narrative_context.current_season === 'spring') {
      this.state.narrative_context.current_season = 'summer';
      if (this.onEnvironmentChange) {
        this.onEnvironmentChange({ type: 'season_change', season: 'summer' });
      }
    } else if (this.elapsedTime > 300 && this.state.narrative_context.current_season === 'summer') {
      this.state.narrative_context.current_season = 'autumn';
      if (this.onEnvironmentChange) {
        this.onEnvironmentChange({ type: 'season_change', season: 'autumn' });
      }
    } else if (this.elapsedTime > 450 && this.state.narrative_context.current_season === 'autumn') {
      this.state.narrative_context.current_season = 'winter';
      if (this.onEnvironmentChange) {
        this.onEnvironmentChange({ type: 'season_change', season: 'winter' });
      }
    }
  }

  /**
   * Update colony resources over time
   */
  updateColonyResourcesLive(deltaTime) {
    // Continuous food consumption
    const consumptionRate = this.resources.resources.food.consumption_per_turn;
    const timeBasedConsumption = (consumptionRate * deltaTime) / 10; // Spread over 10 seconds
    
    this.state.food = Math.max(0, this.state.food - timeBasedConsumption);
    
    // Morale changes based on food and colony state
    let moraleChange = 0;
    
    if (this.state.food < 5) {
      moraleChange -= 0.1 * deltaTime; // Lose morale when food is low
    } else if (this.state.food > 50) {
      moraleChange += 0.05 * deltaTime; // Gain morale when food is abundant
    }
    
    this.state.morale = Math.max(0, Math.min(10, this.state.morale + moraleChange));
    
    // Update population counts
    this.updatePopulationFromAnts(this.state);
  }

  /**
   * Check for random events in real-time
   */
  checkRandomEventsLive(deltaTime) {
    // Time-based event probability (much lower than turn-based)
    const eventChance = 0.001 * deltaTime; // Very low per-second chance
    
    if (Math.random() < eventChance) {
      const events = Object.keys(this.events.events);
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      
      this.processRandomEvent(randomEvent);
    }
  }

  /**
   * Process ant interactions for live simulation
   */
  processAntInteractionsLive(movements, discoveries) {
    // Process food deliveries
    for (const movement of movements) {
      const ant = this.state.ants.find(a => a.id === movement.antId);
      
      if (ant && ant.carryingFood && this.isNearNest(ant.position)) {
        // Ant delivered food
        this.state.food += ant.carryingAmount;
        this.state.discoveredFood = (this.state.discoveredFood || 0) + ant.carryingAmount;
        
        ant.carryingFood = false;
        ant.carryingAmount = 0;
        ant.state = 'resting'; // Rest after delivery
        
        if (this.onAntAction) {
          this.onAntAction([{
            antId: ant.id,
            action: 'food_delivery',
            amount: ant.carryingAmount,
            position: { ...ant.position }
          }]);
        }
      }
    }
  }

  /**
   * Utility method to check if position is near nest
   */
  isNearNest(position) {
    const nestPos = this.environmentEngine.nestPosition;
    const distance = Math.sqrt(
      Math.pow(position.x - nestPos.x, 2) + Math.pow(position.y - nestPos.y, 2)
    );
    return distance <= 2;
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats(currentTime) {
    const updateTime = currentTime - this.lastUpdateTime;
    this.updateTimes.push(updateTime);
    
    // Keep only last 60 update times for rolling average
    if (this.updateTimes.length > 60) {
      this.updateTimes.shift();
    }
    
    // Update stats every second
    if (currentTime - this.lastStatsUpdate > 1000) {
      this.performanceStats.updatesPerSecond = this.frameCount;
      this.performanceStats.averageUpdateTime = 
        this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
      
      this.frameCount = 0;
      this.lastStatsUpdate = currentTime;
    }
  }

  /**
   * Pause/Resume simulation
   */
  pauseSimulation() {
    this.isPaused = !this.isPaused;
    console.log(this.isPaused ? '⏸️  Simulation paused' : '▶️  Simulation resumed');
    return this.isPaused;
  }

  /**
   * Change simulation speed
   */
  setSimulationSpeed(speed) {
    if (speed <= 0 || speed > 10) {
      console.log('⚠️  Speed must be between 0.1x and 10x');
      return false;
    }
    
    this.simulationSpeed = speed;
    
    // Restart interval with new speed
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => {
        this.simulationLoop();
      }, this.updateInterval / this.simulationSpeed);
    }
    
    console.log(`⚡ Simulation speed set to ${speed}x`);
    return true;
  }

  /**
   * Stop the simulation
   */
  stopSimulation() {
    if (!this.isRunning) {
      console.log('⚠️  Simulation not running');
      return false;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('🛑 Simulation stopped');
    return true;
  }

  /**
   * Get current simulation statistics
   */
  getSimulationStats() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      speed: this.simulationSpeed,
      elapsedTime: this.elapsedTime,
      frameCount: this.frameCount,
      performance: this.performanceStats,
      colony: {
        totalAnts: this.state ? this.state.ants.length : 0,
        food: this.state ? this.state.food : 0,
        morale: this.state ? this.state.morale : 0,
        discoveredFood: this.state ? this.state.discoveredFood : 0
      }
    };
  }
}

module.exports = LiveSimulationEngine;