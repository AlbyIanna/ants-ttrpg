/**
 * Simulation engine for Ant Colony TTRPG with realistic environment and ant behavior
 * Version: v0.4 - Added dynamic environment, pathfinding, and individual ant behavior
 */

const fs = require('fs');
const path = require('path');
const EnvironmentEngine = require('./environment-engine');
const PathfindingEngine = require('./pathfinding');
const AntBehaviorSystem = require('./ant-behavior');

class SimulationEngine {
  constructor() {
    this.resources = this.loadJSON('../rules/resource-schema.json');
    this.actions = this.loadJSON('../rules/action-schema.json');
    this.events = this.loadJSON('../rules/event-schema.json');
    
    // Initialize new systems
    this.environmentEngine = new EnvironmentEngine();
    this.pathfindingEngine = new PathfindingEngine(this.environmentEngine);
    this.antBehaviorSystem = new AntBehaviorSystem(this.pathfindingEngine, this.environmentEngine);
    
    // Environment settings
    this.biomes = ['forest_floor', 'garden', 'meadow', 'desert'];
    this.currentBiome = 'forest_floor';
  }

  loadJSON(filePath) {
    const fullPath = path.join(__dirname, filePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }

  createInitialState(biome = null) {
    // Select biome
    const selectedBiome = biome || this.biomes[Math.floor(Math.random() * this.biomes.length)];
    this.currentBiome = selectedBiome;
    
    // Generate environment
    const environment = this.environmentEngine.generateEnvironment(selectedBiome, 'spring');
    
    // Create individual ants
    const ants = this.createInitialAnts(environment);
    
    return {
      food: 15,
      population: {
        workers: 7,
        scouts: 2, 
        soldiers: 1,
        total: 10
      },
      morale: 5,
      turn: 1,
      locations: ['nest'],
      active_effects: [],
      recent_events: [],
      
      // Enhanced environment system
      environment: environment,
      biome: selectedBiome,
      ants: ants,
      antMovements: [],
      discoveredFood: 0,
      
      narrative_context: {
        colony_personality: null,
        current_season: 'spring',
        recent_actions: [],
        survival_stress_level: 'low',
        major_events_history: [],
        movement_events: []
      }
    };
  }

  createInitialAnts(environment) {
    const ants = [];
    const nestPos = this.environmentEngine.nestPosition;
    let antId = 1;

    // Create workers
    for (let i = 0; i < 7; i++) {
      const position = this.findValidStartPosition(nestPos, environment, 2);
      const ant = this.antBehaviorSystem.createAnt(antId++, 'worker', position, nestPos);
      ants.push(ant);
    }

    // Create scouts
    for (let i = 0; i < 2; i++) {
      const position = this.findValidStartPosition(nestPos, environment, 3);
      const ant = this.antBehaviorSystem.createAnt(antId++, 'scout', position, nestPos);
      ants.push(ant);
    }

    // Create soldiers
    for (let i = 0; i < 1; i++) {
      const position = this.findValidStartPosition(nestPos, environment, 1);
      const ant = this.antBehaviorSystem.createAnt(antId++, 'soldier', position, nestPos);
      ants.push(ant);
    }

    return ants;
  }

  findValidStartPosition(nestPos, environment, maxDistance) {
    for (let attempts = 0; attempts < 20; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * maxDistance;
      
      const x = Math.floor(nestPos.x + Math.cos(angle) * distance);
      const y = Math.floor(nestPos.y + Math.sin(angle) * distance);
      
      if (x >= 0 && x < environment.metadata.width &&
          y >= 0 && y < environment.metadata.height &&
          this.environmentEngine.isPassable(environment.terrain[y][x])) {
        return { x, y };
      }
    }
    
    // Fallback to nest position
    return { ...nestPos };
  }

  rollDice(notation) {
    if (!notation.includes('d')) return parseInt(notation);
    
    const [count, sides, modifier] = notation.match(/(\d*)d(\d+)([+-]\d+)?/).slice(1);
    const numDice = parseInt(count) || 1;
    const numSides = parseInt(sides);
    const mod = parseInt(modifier) || 0;
    
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * numSides) + 1;
    }
    return total + mod;
  }

  validateAction(action, state) {
    const actionDef = this.actions.actions[action];
    if (!actionDef) return { valid: false, error: "Unknown action" };

    const reqs = actionDef.requirements;
    
    if (reqs.workers && state.population.workers < reqs.workers) {
      return { valid: false, error: "Not enough workers" };
    }
    if (reqs.scouts && state.population.scouts < reqs.scouts) {
      return { valid: false, error: "Not enough scouts" };
    }
    if (reqs.soldiers && state.population.soldiers < reqs.soldiers) {
      return { valid: false, error: "Not enough soldiers" };
    }

    return { valid: true };
  }

  checkEventTriggers(action, state) {
    const triggeredEvents = [];
    
    for (const [eventName, eventData] of Object.entries(this.events.events)) {
      let shouldTrigger = false;
      
      if (eventData.trigger === `${action}_action` && Math.random() < eventData.probability) {
        shouldTrigger = true;
      } else if (eventData.trigger === 'high_morale' && state.morale >= 8 && Math.random() < eventData.probability) {
        shouldTrigger = true;
      } else if (eventData.trigger === 'turn_count' && state.turn >= eventData.threshold) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        triggeredEvents.push({ name: eventName, data: eventData });
      }
    }
    
    return triggeredEvents;
  }

  applyEffects(effects, state) {
    const newState = { ...state };
    
    for (const [resource, effect] of Object.entries(effects)) {
      if (resource === 'population') {
        const change = this.rollDice(effect);
        newState.population.total = Math.max(1, newState.population.total + change);
      } else if (resource === 'food') {
        const change = this.rollDice(effect);
        newState.food = Math.max(0, Math.min(100, newState.food + change));
      } else if (resource === 'morale') {
        const change = this.rollDice(effect);
        newState.morale = Math.max(0, Math.min(10, newState.morale + change));
      }
    }
    
    return newState;
  }

  processTurn(action, state) {
    const validation = this.validateAction(action, state);
    if (!validation.valid) {
      return { success: false, error: validation.error, state };
    }

    let newState = this.deepCopyState(state);
    const actionDef = this.actions.actions[action];
    const results = {
      action: action,
      success: Math.random() < actionDef.success_rate,
      events: [],
      narrative: [],
      antMovements: [],
      discoveries: [],
      behaviorChanges: []
    };

    // Process ant behaviors first (they move independently)
    if (newState.ants && newState.environment) {
      const behaviorResults = this.antBehaviorSystem.updateAntBehaviors(
        newState.ants, newState.environment, newState
      );
      
      results.antMovements = behaviorResults.movements;
      results.behaviorChanges = behaviorResults.stateChanges;
      results.discoveries = behaviorResults.discoveries;
      
      // Process discoveries and food deliveries
      this.processAntInteractions(newState, behaviorResults, results);
    }

    // Then process player action effects
    if (results.success) {
      newState = this.applyEffects(actionDef.effects, newState);
      results.narrative.push(`${action} succeeded!`);
    } else {
      results.narrative.push(`${action} failed.`);
    }

    // Check for triggered events
    const triggeredEvents = this.checkEventTriggers(action, newState);
    newState.recent_events = [];
    for (const event of triggeredEvents) {
      newState = this.applyEffects(event.data.effects, newState);
      results.events.push(event.name);
      results.narrative.push(event.data.narrative);
      newState.recent_events.push(event.name);
    }

    // Update environment based on season
    this.updateEnvironment(newState);

    // Update narrative context for AI GameMaster
    this.updateNarrativeContext(newState, action, results);

    // Food consumption
    newState.food = Math.max(0, newState.food - this.resources.resources.food.consumption_per_turn);
    newState.turn += 1;

    // Starvation check
    if (newState.food === 0) {
      results.narrative.push("Your colony is starving!");
      newState.morale = Math.max(0, newState.morale - 2);
    }

    // Update population count based on actual ants
    if (newState.ants) {
      this.updatePopulationFromAnts(newState);
    }

    return { success: true, state: newState, results };
  }

  deepCopyState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  processAntInteractions(state, behaviorResults, results) {
    // Process food deliveries
    for (const interaction of behaviorResults.interactions) {
      if (interaction.type === 'food_delivery') {
        state.food += interaction.amount;
        state.discoveredFood += interaction.amount;
        results.narrative.push(`Worker delivered ${interaction.amount} food to the nest!`);
      }
    }

    // Process discoveries
    for (const discovery of behaviorResults.discoveries) {
      if (discovery.type === 'food_source') {
        results.narrative.push(`Scout discovered ${discovery.foodType} at (${discovery.position.x}, ${discovery.position.y})!`);
      } else if (discovery.type === 'food') {
        results.narrative.push(`Worker collected ${discovery.amount} nutrition from food source!`);
      }
    }
  }

  updateEnvironment(state) {
    // Apply seasonal changes
    if (state.turn >= 5 && state.narrative_context.current_season === 'spring') {
      state.narrative_context.current_season = 'winter';
      // Could regenerate environment or apply winter effects here
    }
  }

  updatePopulationFromAnts(state) {
    if (!state.ants) return;
    
    const roles = { workers: 0, scouts: 0, soldiers: 0 };
    
    for (const ant of state.ants) {
      const roleKey = ant.role + 's';
      if (roleKey in roles) {
        roles[roleKey]++;
      }
    }
    
    state.population = {
      ...roles,
      total: state.ants.length
    };
  }

  isGameOver(state) {
    return state.population.total <= 0 || (state.food === 0 && state.morale <= 0);
  }

  updateNarrativeContext(state, action, results) {
    if (!state.narrative_context) {
      state.narrative_context = {
        colony_personality: null,
        current_season: 'spring',
        recent_actions: [],
        survival_stress_level: 'low',
        major_events_history: []
      };
    }

    // Update recent actions (keep last 3)
    state.narrative_context.recent_actions.unshift({
      action: action,
      success: results.success,
      turn: state.turn
    });
    if (state.narrative_context.recent_actions.length > 3) {
      state.narrative_context.recent_actions.pop();
    }

    // Determine colony personality based on behavior patterns
    if (!state.narrative_context.colony_personality) {
      if (state.morale >= 7) {
        state.narrative_context.colony_personality = 'bold';
      } else if (state.morale <= 3) {
        state.narrative_context.colony_personality = 'desperate';
      } else {
        state.narrative_context.colony_personality = 'cautious';
      }
    }

    // Update seasonal context
    if (state.turn >= 5) {
      state.narrative_context.current_season = 'winter';
    }

    // Calculate survival stress level
    const foodStress = state.food <= 5 ? 2 : (state.food <= 10 ? 1 : 0);
    const moraleStress = state.morale <= 3 ? 2 : (state.morale <= 6 ? 1 : 0);
    const populationStress = state.population.total <= 5 ? 2 : (state.population.total <= 8 ? 1 : 0);
    
    const totalStress = foodStress + moraleStress + populationStress;
    if (totalStress >= 4) {
      state.narrative_context.survival_stress_level = 'critical';
    } else if (totalStress >= 2) {
      state.narrative_context.survival_stress_level = 'high';
    } else {
      state.narrative_context.survival_stress_level = 'low';
    }

    // Track major events
    if (results.events && results.events.length > 0) {
      for (const event of results.events) {
        state.narrative_context.major_events_history.unshift({
          event: event,
          turn: state.turn,
          context: state.narrative_context.survival_stress_level
        });
      }
      // Keep only last 5 major events
      if (state.narrative_context.major_events_history.length > 5) {
        state.narrative_context.major_events_history = state.narrative_context.major_events_history.slice(0, 5);
      }
    }
  }

  getGameStatus(state) {
    if (state.population.total <= 0) return "Colony destroyed - all ants are dead!";
    if (state.food === 0 && state.morale <= 0) return "Colony collapsed - starvation and despair!";
    if (state.turn >= 10 && state.population.total >= 15) return "Victory - your colony thrives!";
    return "ongoing";
  }

  getNarrativeContext(state) {
    return state.narrative_context || {};
  }
}

module.exports = SimulationEngine;