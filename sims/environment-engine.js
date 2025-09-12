/**
 * Environment Engine for Ant Colony TTRPG
 * Version: v0.4 - Procedural terrain generation and realistic environment simulation
 */

class EnvironmentEngine {
  constructor(width = 35, height = 20) {
    this.width = width;
    this.height = height;
    this.nestPosition = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    
    // Terrain types and their properties
    this.terrainTypes = {
      empty: { symbol: '.', passable: true, cost: 1 },
      grass: { symbol: '🌱', passable: true, cost: 1.2 },
      tall_grass: { symbol: '🌿', passable: true, cost: 1.5 },
      rock: { symbol: '🪨', passable: false, cost: 999 },
      log: { symbol: '🪵', passable: false, cost: 999 },
      water: { symbol: '💧', passable: false, cost: 999 },
      sand: { symbol: '▫', passable: true, cost: 0.8 },
      dirt: { symbol: '▪', passable: true, cost: 0.9 },
      flower: { symbol: '🌸', passable: true, cost: 1.1 },
      mushroom: { symbol: '🍄', passable: true, cost: 1.3 },
      twig: { symbol: '|', passable: true, cost: 1.4 },
      leaf: { symbol: '🍃', passable: true, cost: 1.1 }
    };

    // Food source types
    this.foodSources = {
      crumb: { symbol: '🟫', nutrition: 3, discoverable: true },
      berry: { symbol: '🫐', nutrition: 8, discoverable: true },
      seed: { symbol: '🌰', nutrition: 5, discoverable: true },
      honey: { symbol: '🍯', nutrition: 12, discoverable: true },
      fruit: { symbol: '🍎', nutrition: 15, discoverable: false }, // Requires exploration
      nectar: { symbol: '🌺', nutrition: 6, discoverable: true }
    };

    // Environmental hazards and features
    this.hazards = {
      spider_web: { symbol: '🕸', danger: 3, type: 'trap' },
      ant_hill: { symbol: '🏔', danger: 2, type: 'rival_colony' },
      predator_zone: { symbol: '👁', danger: 5, type: 'active_threat' }
    };
  }

  generateEnvironment(biome = 'forest_floor', season = 'spring') {
    const environment = {
      terrain: this.initializeTerrain(),
      foodSources: [],
      hazards: [],
      trails: {},
      features: [],
      biome: biome,
      season: season,
      metadata: {
        generated_at: Date.now(),
        seed: Math.random(),
        width: this.width,
        height: this.height
      }
    };

    // Generate terrain based on biome
    this.generateBiomeTerrain(environment, biome);
    
    // Add natural features
    this.addNaturalFeatures(environment);
    
    // Place food sources
    this.placeFoodSources(environment);
    
    // Add environmental hazards
    this.placeHazards(environment);
    
    // Create nest area
    this.createNestArea(environment);
    
    // Apply seasonal effects
    this.applySeasonalEffects(environment, season);

    return environment;
  }

  initializeTerrain() {
    const terrain = [];
    for (let y = 0; y < this.height; y++) {
      terrain[y] = [];
      for (let x = 0; x < this.width; x++) {
        terrain[y][x] = 'empty';
      }
    }
    return terrain;
  }

  generateBiomeTerrain(environment, biome) {
    switch (biome) {
      case 'forest_floor':
        this.generateForestFloor(environment);
        break;
      case 'garden':
        this.generateGarden(environment);
        break;
      case 'desert':
        this.generateDesert(environment);
        break;
      case 'meadow':
        this.generateMeadow(environment);
        break;
      default:
        this.generateForestFloor(environment);
    }
  }

  generateForestFloor(environment) {
    // Scattered rocks and logs
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y)) {
        environment.terrain[y][x] = Math.random() > 0.5 ? 'rock' : 'log';
      }
    }

    // Grass patches
    this.createGrassPatches(environment, 12);
    
    // Random vegetation
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y) && environment.terrain[y][x] === 'empty') {
        const vegetation = ['grass', 'tall_grass', 'mushroom', 'twig', 'leaf'];
        environment.terrain[y][x] = vegetation[Math.floor(Math.random() * vegetation.length)];
      }
    }
  }

  generateGarden(environment) {
    // More organized layout with flower patches
    this.createFlowerGardens(environment, 4);
    this.createGrassPatches(environment, 8);
    
    // Garden paths (clear areas)
    this.createPaths(environment);
    
    // Some decorative elements
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y) && environment.terrain[y][x] === 'empty') {
        environment.terrain[y][x] = Math.random() > 0.7 ? 'rock' : 'flower';
      }
    }
  }

  generateDesert(environment) {
    // Sandy terrain base
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (Math.random() > 0.3 && this.isValidPlacement(x, y)) {
          environment.terrain[y][x] = 'sand';
        }
      }
    }

    // Sparse rocks
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y)) {
        environment.terrain[y][x] = 'rock';
      }
    }

    // Occasional vegetation
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y) && environment.terrain[y][x] === 'empty') {
        environment.terrain[y][x] = 'grass';
      }
    }
  }

  generateMeadow(environment) {
    // Lots of grass and flowers
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (Math.random() > 0.4 && this.isValidPlacement(x, y)) {
          const vegetation = ['grass', 'tall_grass', 'flower'];
          environment.terrain[y][x] = vegetation[Math.floor(Math.random() * vegetation.length)];
        }
      }
    }

    // Few obstacles
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y)) {
        environment.terrain[y][x] = 'rock';
      }
    }
  }

  createGrassPatches(environment, count) {
    for (let i = 0; i < count; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = 1 + Math.floor(Math.random() * 3);
      
      this.createPatch(environment, centerX, centerY, radius, 'grass');
    }
  }

  createFlowerGardens(environment, count) {
    for (let i = 0; i < count; i++) {
      const centerX = Math.floor(Math.random() * this.width);
      const centerY = Math.floor(Math.random() * this.height);
      const radius = 2 + Math.floor(Math.random() * 2);
      
      this.createPatch(environment, centerX, centerY, radius, 'flower');
    }
  }

  createPatch(environment, centerX, centerY, radius, terrainType) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius && 
            x >= 0 && x < this.width && 
            y >= 0 && y < this.height &&
            this.isValidPlacement(x, y) &&
            environment.terrain[y][x] === 'empty' &&
            Math.random() > 0.3) {
          environment.terrain[y][x] = terrainType;
        }
      }
    }
  }

  createPaths(environment) {
    // Create a few clear paths through the environment
    const pathCount = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < pathCount; i++) {
      const startX = Math.floor(Math.random() * this.width);
      const startY = Math.floor(Math.random() * this.height);
      const endX = Math.floor(Math.random() * this.width);
      const endY = Math.floor(Math.random() * this.height);
      
      this.createPath(environment, startX, startY, endX, endY);
    }
  }

  createPath(environment, startX, startY, endX, endY) {
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.floor(startX + t * (endX - startX));
      const y = Math.floor(startY + t * (endY - startY));
      
      if (x >= 0 && x < this.width && y >= 0 && y < this.height &&
          this.isValidPlacement(x, y)) {
        // Clear the path and occasionally add sand/dirt
        if (environment.terrain[y][x] !== 'rock' && environment.terrain[y][x] !== 'log') {
          environment.terrain[y][x] = Math.random() > 0.7 ? 'dirt' : 'empty';
        }
      }
    }
  }

  addNaturalFeatures(environment) {
    // Add water features occasionally
    if (Math.random() > 0.7) {
      this.createWaterFeature(environment);
    }
    
    // Add fallen logs as linear obstacles
    this.createLogBarriers(environment, 2);
  }

  createWaterFeature(environment) {
    const centerX = Math.floor(Math.random() * this.width);
    const centerY = Math.floor(Math.random() * this.height);
    const size = 1 + Math.floor(Math.random() * 2);
    
    this.createPatch(environment, centerX, centerY, size, 'water');
  }

  createLogBarriers(environment, count) {
    for (let i = 0; i < count; i++) {
      const startX = Math.floor(Math.random() * this.width);
      const startY = Math.floor(Math.random() * this.height);
      const length = 3 + Math.floor(Math.random() * 4);
      const horizontal = Math.random() > 0.5;
      
      for (let j = 0; j < length; j++) {
        const x = horizontal ? startX + j : startX;
        const y = horizontal ? startY : startY + j;
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height &&
            this.isValidPlacement(x, y)) {
          environment.terrain[y][x] = 'log';
        }
      }
    }
  }

  placeFoodSources(environment) {
    const foodCount = 8 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < foodCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (this.isValidFoodPlacement(environment, x, y)) {
        const foodTypes = Object.keys(this.foodSources);
        const foodType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
        
        environment.foodSources.push({
          x: x,
          y: y,
          type: foodType,
          nutrition: this.foodSources[foodType].nutrition,
          discovered: false,
          depleted: false,
          remainingNutrition: this.foodSources[foodType].nutrition
        });
      }
    }
  }

  placeHazards(environment) {
    const hazardCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < hazardCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (this.isValidHazardPlacement(environment, x, y)) {
        const hazardTypes = Object.keys(this.hazards);
        const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        
        environment.hazards.push({
          x: x,
          y: y,
          type: hazardType,
          danger: this.hazards[hazardType].danger,
          active: true
        });
      }
    }
  }

  createNestArea(environment) {
    const nx = this.nestPosition.x;
    const ny = this.nestPosition.y;
    
    // Clear area around nest
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = nx + dx;
        const y = ny + dy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height && distance <= 2) {
          if (distance <= 1) {
            environment.terrain[y][x] = 'dirt'; // Nest tunnels
          } else {
            // Clear obstacles but keep some terrain variation
            if (environment.terrain[y][x] === 'rock' || environment.terrain[y][x] === 'log') {
              environment.terrain[y][x] = 'empty';
            }
          }
        }
      }
    }
  }

  applySeasonalEffects(environment, season) {
    switch (season) {
      case 'winter':
        this.applyWinterEffects(environment);
        break;
      case 'spring':
        this.applySpringEffects(environment);
        break;
      case 'summer':
        this.applySummerEffects(environment);
        break;
      case 'autumn':
        this.applyAutumnEffects(environment);
        break;
    }
  }

  applyWinterEffects(environment) {
    // Reduce food sources
    environment.foodSources = environment.foodSources.filter(() => Math.random() > 0.4);
    
    // Add some ice/snow effects to water
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (environment.terrain[y][x] === 'water' && Math.random() > 0.5) {
          environment.terrain[y][x] = 'empty'; // Frozen water becomes passable
        }
      }
    }
  }

  applySpringEffects(environment) {
    // Add extra flowers and grass
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y) && environment.terrain[y][x] === 'empty') {
        environment.terrain[y][x] = Math.random() > 0.5 ? 'flower' : 'grass';
      }
    }
  }

  applySummerEffects(environment) {
    // More abundant food sources
    const extraFood = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < extraFood; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (this.isValidFoodPlacement(environment, x, y)) {
        environment.foodSources.push({
          x: x,
          y: y,
          type: 'nectar',
          nutrition: 6,
          discovered: false,
          depleted: false,
          remainingNutrition: 6
        });
      }
    }
  }

  applyAutumnEffects(environment) {
    // Add fallen leaves
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isValidPlacement(x, y) && environment.terrain[y][x] === 'empty') {
        environment.terrain[y][x] = 'leaf';
      }
    }
  }

  isValidPlacement(x, y) {
    // Don't place obstacles too close to nest
    const distance = Math.sqrt(
      Math.pow(x - this.nestPosition.x, 2) + 
      Math.pow(y - this.nestPosition.y, 2)
    );
    return distance > 3;
  }

  isValidFoodPlacement(environment, x, y) {
    if (!this.isValidPlacement(x, y)) return false;
    
    // Check if terrain is passable
    const terrain = environment.terrain[y][x];
    if (!this.terrainTypes[terrain] || !this.terrainTypes[terrain].passable) {
      return false;
    }
    
    // Check for nearby food sources (avoid clustering)
    for (const food of environment.foodSources) {
      const distance = Math.sqrt(Math.pow(x - food.x, 2) + Math.pow(y - food.y, 2));
      if (distance < 3) return false;
    }
    
    return true;
  }

  isValidHazardPlacement(environment, x, y) {
    if (!this.isValidPlacement(x, y)) return false;
    
    // Check for nearby hazards
    for (const hazard of environment.hazards) {
      const distance = Math.sqrt(Math.pow(x - hazard.x, 2) + Math.pow(y - hazard.y, 2));
      if (distance < 4) return false;
    }
    
    return true;
  }

  getTerrainCost(terrain) {
    return this.terrainTypes[terrain] ? this.terrainTypes[terrain].cost : 999;
  }

  isPassable(terrain) {
    return this.terrainTypes[terrain] ? this.terrainTypes[terrain].passable : false;
  }

  getTerrainSymbol(terrain) {
    return this.terrainTypes[terrain] ? this.terrainTypes[terrain].symbol : '?';
  }

  getFoodSymbol(foodType) {
    return this.foodSources[foodType] ? this.foodSources[foodType].symbol : '?';
  }

  getHazardSymbol(hazardType) {
    return this.hazards[hazardType] ? this.hazards[hazardType].symbol : '?';
  }
}

module.exports = EnvironmentEngine;