/**
 * Ant Behavior System for Ant Colony TTRPG
 * Version: v0.4 - Individual ant AI with role-based movement and goal-directed behavior
 */

class AntBehaviorSystem {
  constructor(pathfindingEngine, environmentEngine) {
    this.pathfinding = pathfindingEngine;
    this.environment = environmentEngine;
    
    // Behavior states for individual ants
    this.behaviorStates = {
      IDLE: 'idle',
      FORAGING: 'foraging',
      RETURNING: 'returning',
      EXPLORING: 'exploring',
      PATROLLING: 'patrolling',
      FOLLOWING_TRAIL: 'following_trail',
      FLEEING: 'fleeing',
      RESTING: 'resting'
    };

    // Ant role configurations
    this.roleConfigs = {
      worker: {
        primaryBehaviors: ['FORAGING', 'RETURNING'],
        secondaryBehaviors: ['RESTING', 'FOLLOWING_TRAIL'],
        movementSpeed: 1.0,
        carryCapacity: 3,
        searchRadius: 8,
        energyMax: 20,
        energyConsumption: 1
      },
      scout: {
        primaryBehaviors: ['EXPLORING', 'RETURNING'],
        secondaryBehaviors: ['PATROLLING', 'FOLLOWING_TRAIL'],
        movementSpeed: 1.3,
        carryCapacity: 1,
        searchRadius: 12,
        energyMax: 25,
        energyConsumption: 1.2
      },
      soldier: {
        primaryBehaviors: ['PATROLLING', 'FLEEING'],
        secondaryBehaviors: ['RETURNING', 'RESTING'],
        movementSpeed: 0.8,
        carryCapacity: 1,
        searchRadius: 6,
        energyMax: 30,
        energyConsumption: 0.8
      }
    };
  }

  createAnt(id, role, position, nestPosition) {
    const config = this.roleConfigs[role];
    
    return {
      id: id,
      role: role,
      position: { ...position },
      lastPosition: { ...position },
      nestPosition: { ...nestPosition },
      
      // Behavior state
      state: this.behaviorStates.IDLE,
      goal: null,
      path: [],
      pathIndex: 0,
      
      // Ant characteristics
      energy: config.energyMax,
      energyMax: config.energyMax,
      carryingFood: false,
      carryingAmount: 0,
      carryCapacity: config.carryCapacity,
      
      // Movement properties
      movementSpeed: config.movementSpeed,
      movementCooldown: 0,
      stuckCounter: 0,
      
      // Memory and decision making  
      knownFoodSources: [],
      visitedPositions: [],
      lastFoodSource: null,
      personalityTrait: this.generatePersonalityTrait(),
      
      // Trail following
      followingTrail: false,
      trailStrength: 0,
      
      // Configuration
      searchRadius: config.searchRadius,
      energyConsumption: config.energyConsumption,
      
      // Timing
      lastMoved: 0,
      createdAt: Date.now(),
      lastStateChange: Date.now()
    };
  }

  generatePersonalityTrait() {
    const traits = ['cautious', 'bold', 'efficient', 'curious', 'social'];
    return traits[Math.floor(Math.random() * traits.length)];
  }

  updateAntBehaviors(ants, environment, gameState) {
    const behaviorResults = {
      movements: [],
      stateChanges: [],
      discoveries: [],
      interactions: []
    };

    for (const ant of ants) {
      // Update energy and check vitals
      this.updateAntVitals(ant);
      
      // Determine next behavior
      const newState = this.decideBehavior(ant, environment, gameState, ants);
      
      if (newState !== ant.state) {
        behaviorResults.stateChanges.push({
          antId: ant.id,
          oldState: ant.state,
          newState: newState
        });
        ant.state = newState;
        ant.lastStateChange = Date.now();
      }

      // Execute current behavior
      const actionResult = this.executeBehavior(ant, environment, gameState, ants);
      
      if (actionResult.movement) {
        behaviorResults.movements.push({
          antId: ant.id,
          from: { ...ant.lastPosition },
          to: { ...ant.position },
          path: [...ant.path]
        });
      }

      if (actionResult.discovery) {
        behaviorResults.discoveries.push(actionResult.discovery);
      }

      if (actionResult.interaction) {
        behaviorResults.interactions.push(actionResult.interaction);
      }
    }

    return behaviorResults;
  }

  updateAntVitals(ant) {
    // Energy consumption
    ant.energy = Math.max(0, ant.energy - ant.energyConsumption);
    
    // Movement cooldown
    if (ant.movementCooldown > 0) {
      ant.movementCooldown--;
    }
    
    // Reset stuck counter if ant moved
    if (ant.position.x !== ant.lastPosition.x || ant.position.y !== ant.lastPosition.y) {
      ant.stuckCounter = 0;
      ant.lastPosition = { ...ant.position };
    } else {
      ant.stuckCounter++;
    }
  }

  decideBehavior(ant, environment, gameState, allAnts) {
    const config = this.roleConfigs[ant.role];
    
    // Emergency behaviors take priority
    if (ant.energy < ant.energyMax * 0.2 && ant.state !== this.behaviorStates.RETURNING) {
      return this.behaviorStates.RETURNING;
    }

    // If carrying food, return to nest
    if (ant.carryingFood && ant.state !== this.behaviorStates.RETURNING) {
      return this.behaviorStates.RETURNING;
    }

    // If at nest and carrying food, unload (handled in execution)
    if (this.isAtNest(ant) && ant.carryingFood) {
      return this.behaviorStates.IDLE;
    }

    // Role-specific behavior decisions
    switch (ant.role) {
      case 'worker':
        return this.decideWorkerBehavior(ant, environment, gameState);
      case 'scout':
        return this.decideScoutBehavior(ant, environment, gameState);
      case 'soldier':
        return this.decideSoldierBehavior(ant, environment, gameState, allAnts);
      default:
        return this.behaviorStates.IDLE;
    }
  }

  decideWorkerBehavior(ant, environment, gameState) {
    // If at nest and not carrying food, look for foraging opportunities
    if (this.isAtNest(ant) && !ant.carryingFood) {
      if (gameState.morale > 3 && Math.random() > 0.3) {
        return this.behaviorStates.FORAGING;
      } else {
        return this.behaviorStates.RESTING;
      }
    }

    // If foraging but goal completed or lost
    if (ant.state === this.behaviorStates.FORAGING && !ant.goal) {
      return this.behaviorStates.FORAGING; // Will find new food source
    }

    // Continue current behavior if valid
    return ant.state;
  }

  decideScoutBehavior(ant, environment, gameState) {
    // Scouts prioritize exploration
    if (this.isAtNest(ant)) {
      if (Math.random() > 0.4) {
        return this.behaviorStates.EXPLORING;
      } else {
        return this.behaviorStates.RESTING;
      }
    }

    // If exploring but reached goal or stuck
    if (ant.state === this.behaviorStates.EXPLORING && (!ant.goal || ant.stuckCounter > 5)) {
      return this.behaviorStates.EXPLORING; // Will find new exploration target
    }

    return ant.state;
  }

  decideSoldierBehavior(ant, environment, gameState, allAnts) {
    // Soldiers focus on defense and patrol
    const threatsNearby = this.detectThreats(ant, environment);
    
    if (threatsNearby.length > 0) {
      return this.behaviorStates.PATROLLING;
    }

    if (this.isAtNest(ant)) {
      return this.behaviorStates.PATROLLING;
    }

    // Check if other ants need protection
    const vulnerableAnts = this.findVulnerableAnts(ant, allAnts, environment);
    if (vulnerableAnts.length > 0) {
      return this.behaviorStates.PATROLLING;
    }

    return ant.state;
  }

  executeBehavior(ant, environment, gameState, allAnts) {
    const result = {
      movement: false,
      discovery: null,
      interaction: null
    };

    switch (ant.state) {
      case this.behaviorStates.FORAGING:
        return this.executeForaging(ant, environment, result);
      case this.behaviorStates.RETURNING:
        return this.executeReturning(ant, environment, result);
      case this.behaviorStates.EXPLORING:
        return this.executeExploring(ant, environment, result);
      case this.behaviorStates.PATROLLING:
        return this.executePatrolling(ant, environment, result, allAnts);
      case this.behaviorStates.RESTING:
        return this.executeResting(ant, result);
      case this.behaviorStates.IDLE:
        return this.executeIdle(ant, result);
      default:
        return result;
    }
  }

  executeForaging(ant, environment, result) {
    // If no goal, find nearest food source
    if (!ant.goal) {
      const foodSources = environment.foodSources
        .filter(food => !food.depleted && !food.discovered)
        .concat(ant.knownFoodSources.filter(food => !food.depleted));

      if (foodSources.length > 0) {
        const nearestFood = this.findNearestTarget(ant.position, foodSources);
        if (nearestFood) {
          ant.goal = nearestFood;
          ant.path = this.pathfinding.findPath(ant.position, nearestFood, environment);
          ant.pathIndex = 0;
        }
      }
    }

    // Move toward goal
    if (ant.goal && ant.path.length > 0) {
      const moved = this.moveAlongPath(ant);
      if (moved) result.movement = true;

      // Check if reached food source
      if (this.isAtPosition(ant.position, ant.goal)) {
        const foodSource = this.getFoodSourceAt(ant.goal, environment);
        if (foodSource && !foodSource.depleted) {
          // Collect food
          const collected = Math.min(ant.carryCapacity, foodSource.remainingNutrition);
          ant.carryingFood = true;
          ant.carryingAmount = collected;
          foodSource.remainingNutrition -= collected;
          foodSource.discovered = true;
          
          if (foodSource.remainingNutrition <= 0) {
            foodSource.depleted = true;
          }

          // Add to known food sources
          if (!ant.knownFoodSources.some(f => f.x === foodSource.x && f.y === foodSource.y)) {
            ant.knownFoodSources.push({ ...foodSource });
          }

          result.discovery = {
            type: 'food',
            antId: ant.id,
            position: { ...ant.goal },
            amount: collected
          };

          // Clear goal and switch to returning
          ant.goal = null;
          ant.path = [];
        }
      }
    }

    return result;
  }

  executeReturning(ant, environment, result) {
    // Set nest as goal if not already set
    if (!ant.goal || !this.isNestPosition(ant.goal, ant.nestPosition)) {
      ant.goal = { ...ant.nestPosition };
      ant.path = this.pathfinding.findPath(ant.position, ant.goal, environment);
      ant.pathIndex = 0;
    }

    // Move toward nest
    if (ant.path.length > 0) {
      const moved = this.moveAlongPath(ant);
      if (moved) result.movement = true;

      // Check if reached nest
      if (this.isAtNest(ant)) {
        if (ant.carryingFood) {
          // Unload food
          result.interaction = {
            type: 'food_delivery',
            antId: ant.id,
            amount: ant.carryingAmount
          };
          
          ant.carryingFood = false;
          ant.carryingAmount = 0;
        }

        // Restore energy
        ant.energy = Math.min(ant.energyMax, ant.energy + 5);
        
        // Clear goal
        ant.goal = null;
        ant.path = [];
      }
    }

    return result;
  }

  executeExploring(ant, environment, result) {
    // If no goal, find exploration target
    if (!ant.goal) {
      ant.goal = this.findExplorationTarget(ant, environment);
      if (ant.goal) {
        ant.path = this.pathfinding.findPath(ant.position, ant.goal, environment);
        ant.pathIndex = 0;
      }
    }

    // Move toward exploration target
    if (ant.goal && ant.path.length > 0) {
      const moved = this.moveAlongPath(ant);
      if (moved) result.movement = true;

      // Check for discoveries along the way
      const discovery = this.checkForDiscoveries(ant, environment);
      if (discovery) {
        result.discovery = discovery;
      }

      // If reached goal or stuck, find new target
      if (this.isAtPosition(ant.position, ant.goal) || ant.stuckCounter > 10) {
        ant.goal = null;
        ant.path = [];
      }
    }

    return result;
  }

  executePatrolling(ant, environment, result, allAnts) {
    // Find patrol target (around nest or toward threats)
    if (!ant.goal) {
      const threats = this.detectThreats(ant, environment);
      if (threats.length > 0) {
        ant.goal = threats[0];
      } else {
        ant.goal = this.findPatrolTarget(ant, environment);
      }
      
      if (ant.goal) {
        ant.path = this.pathfinding.findPath(ant.position, ant.goal, environment);
        ant.pathIndex = 0;
      }
    }

    // Move toward patrol target
    if (ant.goal && ant.path.length > 0) {
      const moved = this.moveAlongPath(ant);
      if (moved) result.movement = true;

      // If reached patrol point, find new one
      if (this.isAtPosition(ant.position, ant.goal)) {
        ant.goal = null;
        ant.path = [];
      }
    }

    return result;
  }

  executeResting(ant, result) {
    // Restore energy while resting
    ant.energy = Math.min(ant.energyMax, ant.energy + 2);
    
    // Small chance to end rest if energy is sufficient
    if (ant.energy > ant.energyMax * 0.7 && Math.random() > 0.7) {
      ant.state = this.behaviorStates.IDLE;
    }

    return result;
  }

  executeIdle(ant, result) {
    // Idle ants just wait for state change
    // Small energy recovery
    ant.energy = Math.min(ant.energyMax, ant.energy + 1);
    return result;
  }

  moveAlongPath(ant) {
    if (ant.movementCooldown > 0 || ant.pathIndex >= ant.path.length) {
      return false;
    }

    const nextPosition = ant.path[ant.pathIndex];
    
    // Check if next position is still valid
    if (this.isValidMove(ant.position, nextPosition)) {
      ant.lastPosition = { ...ant.position };
      ant.position = { ...nextPosition };
      ant.pathIndex++;
      ant.movementCooldown = Math.ceil(1 / ant.movementSpeed);
      ant.lastMoved = Date.now();
      
      // Mark position as visited
      const posKey = `${ant.position.x},${ant.position.y}`;
      if (!ant.visitedPositions.includes(posKey)) {
        ant.visitedPositions.push(posKey);
        // Keep visited positions list manageable
        if (ant.visitedPositions.length > 50) {
          ant.visitedPositions.shift();
        }
      }
      
      return true;
    } else {
      // Path blocked, recalculate
      ant.path = [];
      ant.stuckCounter++;
      return false;
    }
  }

  isValidMove(from, to) {
    // Basic validation - could be enhanced with collision detection
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    return distance <= 1.5; // Allow diagonal movement
  }

  isAtNest(ant) {
    return this.isAtPosition(ant.position, ant.nestPosition);
  }

  isNestPosition(pos, nestPos) {
    const distance = Math.sqrt(
      Math.pow(pos.x - nestPos.x, 2) + Math.pow(pos.y - nestPos.y, 2)
    );
    return distance <= 2;
  }

  isAtPosition(pos1, pos2) {
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    return distance <= 1;
  }

  findNearestTarget(position, targets) {
    let nearest = null;
    let shortestDistance = Infinity;

    for (const target of targets) {
      const distance = Math.sqrt(
        Math.pow(position.x - target.x, 2) + Math.pow(position.y - target.y, 2)
      );
      
      if (distance < shortestDistance) {
        nearest = target;
        shortestDistance = distance;
      }
    }

    return nearest;
  }

  findExplorationTarget(ant, environment) {
    // Find unvisited areas to explore
    const candidates = [];
    const searchRadius = ant.searchRadius;
    
    for (let attempts = 0; attempts < 20; attempts++) {
      const x = Math.floor(Math.random() * environment.metadata.width);
      const y = Math.floor(Math.random() * environment.metadata.height);
      const key = `${x},${y}`;
      
      if (!ant.visitedPositions.includes(key) && 
          this.environment.isPassable(environment.terrain[y][x])) {
        
        const distance = Math.sqrt(
          Math.pow(x - ant.position.x, 2) + Math.pow(y - ant.position.y, 2)
        );
        
        if (distance <= searchRadius) {
          candidates.push({ x, y, distance });
        }
      }
    }

    if (candidates.length > 0) {
      // Prefer closer targets for efficiency
      candidates.sort((a, b) => a.distance - b.distance);
      return candidates[0];
    }

    return null;
  }

  findPatrolTarget(ant, environment) {
    // Patrol around nest area
    const nestX = ant.nestPosition.x;
    const nestY = ant.nestPosition.y;
    const patrolRadius = 5;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 3 + Math.random() * patrolRadius;
    
    const x = Math.floor(nestX + Math.cos(angle) * distance);
    const y = Math.floor(nestY + Math.sin(angle) * distance);
    
    // Ensure position is valid
    if (x >= 0 && x < environment.metadata.width &&
        y >= 0 && y < environment.metadata.height &&
        this.environment.isPassable(environment.terrain[y][x])) {
      return { x, y };
    }

    return null;
  }

  detectThreats(ant, environment) {
    const threats = [];
    
    for (const hazard of environment.hazards) {
      const distance = Math.sqrt(
        Math.pow(ant.position.x - hazard.x, 2) + Math.pow(ant.position.y - hazard.y, 2)
      );
      
      if (distance <= ant.searchRadius && hazard.active) {
        threats.push(hazard);
      }
    }

    return threats;
  }

  findVulnerableAnts(soldier, allAnts, environment) {
    const vulnerable = [];
    
    for (const ant of allAnts) {
      if (ant.id !== soldier.id && ant.role !== 'soldier') {
        const distance = Math.sqrt(
          Math.pow(soldier.position.x - ant.position.x, 2) + Math.pow(soldier.position.y - ant.position.y, 2)
        );
        
        if (distance <= soldier.searchRadius && ant.energy < ant.energyMax * 0.3) {
          vulnerable.push(ant);
        }
      }
    }

    return vulnerable;
  }

  checkForDiscoveries(ant, environment) {
    // Check for nearby undiscovered food sources
    for (const food of environment.foodSources) {
      if (!food.discovered && !food.depleted) {
        const distance = Math.sqrt(
          Math.pow(ant.position.x - food.x, 2) + Math.pow(ant.position.y - food.y, 2)
        );
        
        if (distance <= 2) {
          food.discovered = true;
          return {
            type: 'food_source',
            antId: ant.id,
            position: { x: food.x, y: food.y },
            foodType: food.type
          };
        }
      }
    }

    return null;
  }

  getFoodSourceAt(position, environment) {
    return environment.foodSources.find(food => 
      food.x === position.x && food.y === position.y && !food.depleted
    );
  }

  // Get all ants within a certain distance
  getAntsInRadius(centerAnt, allAnts, radius) {
    return allAnts.filter(ant => {
      if (ant.id === centerAnt.id) return false;
      
      const distance = Math.sqrt(
        Math.pow(centerAnt.position.x - ant.position.x, 2) + 
        Math.pow(centerAnt.position.y - ant.position.y, 2)
      );
      
      return distance <= radius;
    });
  }

  /**
   * Update a single ant's behavior - used for live simulation
   */
  updateSingleAnt(ant, environment, gameState) {
    const result = {
      movement: false,
      stateChange: false,
      discovery: null,
      interactions: []
    };

    // Store old state for comparison
    const oldState = ant.state;
    const oldPosition = { ...ant.position };

    // Update energy and movement cooldown - handled by live simulation engine
    if (ant.movementCooldown > 0) {
      return result; // Ant is still cooling down
    }

    // Determine next behavior
    const newState = this.decideBehavior(ant, environment, gameState, [ant]);
    
    if (newState !== ant.state) {
      result.stateChange = true;
      ant.state = newState;
      ant.lastStateChange = Date.now();
    }

    // Execute current behavior
    const actionResult = this.executeBehavior(ant, environment, gameState, [ant]);
    
    if (actionResult.movement) {
      result.movement = true;
    }

    if (actionResult.discovery) {
      result.discovery = actionResult.discovery;
    }

    if (actionResult.interaction) {
      result.interactions.push(actionResult.interaction);
    }

    return result;
  }
}

module.exports = AntBehaviorSystem;