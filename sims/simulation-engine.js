/**
 * Minimal simulation engine for Ant Colony TTRPG
 * Version: v1.0
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
      active_effects: []
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
    for (const event of triggeredEvents) {
      newState = this.applyEffects(event.data.effects, newState);
      results.events.push(event.name);
      results.narrative.push(event.data.narrative);
    }

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

  getGameStatus(state) {
    if (state.population.total <= 0) return "Colony destroyed - all ants are dead!";
    if (state.food === 0 && state.morale <= 0) return "Colony collapsed - starvation and despair!";
    if (state.turn >= 10 && state.population.total >= 15) return "Victory - your colony thrives!";
    return "ongoing";
  }
}

module.exports = SimulationEngine;