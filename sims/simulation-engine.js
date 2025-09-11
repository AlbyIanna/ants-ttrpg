/**
 * Simulation engine for Ant Colony TTRPG with narrative context tracking
 * Version: v0.3 - Added AI GameMaster integration support
 */

const fs = require('fs');
const path = require('path');

class SimulationEngine {
  constructor() {
    this.resources = this.loadJSON('../rules/resource-schema.json');
    this.actions = this.loadJSON('../rules/action-schema.json');
    this.events = this.loadJSON('../rules/event-schema.json');
  }

  loadJSON(filePath) {
    const fullPath = path.join(__dirname, filePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  }

  createInitialState() {
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
      narrative_context: {
        colony_personality: null,
        current_season: 'spring',
        recent_actions: [],
        survival_stress_level: 'low',
        major_events_history: []
      }
    };
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

    let newState = { ...state };
    const actionDef = this.actions.actions[action];
    const results = {
      action: action,
      success: Math.random() < actionDef.success_rate,
      events: [],
      narrative: []
    };

    if (results.success) {
      newState = this.applyEffects(actionDef.effects, newState);
      results.narrative.push(`${action} succeeded!`);
    } else {
      results.narrative.push(`${action} failed.`);
    }

    const triggeredEvents = this.checkEventTriggers(action, newState);
    newState.recent_events = [];
    for (const event of triggeredEvents) {
      newState = this.applyEffects(event.data.effects, newState);
      results.events.push(event.name);
      results.narrative.push(event.data.narrative);
      newState.recent_events.push(event.name);
    }

    // Add discovered locations based on successful explore actions
    if (action === 'explore' && results.success && Math.random() < 0.4) {
      const possibleLocations = ['berry_bush', 'fallen_log', 'flower_patch', 'water_source'];
      const newLocation = possibleLocations[Math.floor(Math.random() * possibleLocations.length)];
      if (!newState.locations.includes(newLocation)) {
        newState.locations.push(newLocation);
        results.narrative.push(`Discovered: ${newLocation.replace('_', ' ')}!`);
      }
    }

    // Update narrative context for AI GameMaster
    this.updateNarrativeContext(newState, action, results);

    newState.food = Math.max(0, newState.food - this.resources.resources.food.consumption_per_turn);
    newState.turn += 1;

    if (newState.food === 0) {
      results.narrative.push("Your colony is starving!");
      newState.morale = Math.max(0, newState.morale - 2);
    }

    return { success: true, state: newState, results };
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