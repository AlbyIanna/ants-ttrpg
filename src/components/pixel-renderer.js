/**
 * Pixel-based Canvas Renderer for Ant Colony TTRPG
 * Version: v0.5 - ES6 Module Version
 */

import { Utils } from './utils.js';

export class PixelRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.lastRenderedState = null;
    
    // World settings
    this.worldWidth = 75;
    this.worldHeight = 50;
    this.pixelSize = 10; // Each world tile is 6x6 pixels - good balance of size vs performance
    
    // Canvas dimensions
    this.canvasWidth = this.worldWidth * this.pixelSize;
    this.canvasHeight = this.worldHeight * this.pixelSize;
    
    // Display options
    this.showTrails = true;
    this.showBehaviorStates = true;
    this.showEnvironmentDetails = true;
    
    // Camera/viewport
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1
    };
    
    // Colors for different elements
    this.colors = {
      background: '#0a0e1a',
      empty: '#1a202c',
      nest: '#ffd700',
      ant: '#ef4444',
      worker: '#22c55e',
      scout: '#3b82f6',
      soldier: '#dc2626',
      food: '#f59e0b',
      berries: '#8b5cf6',
      seeds: '#f97316',
      nectar: '#10b981',
      wood: '#a16207',
      rock: '#64748b',
      grass: '#22c55e',
      trail: '#4fd1c7',
      water: '#0ea5e9'
    };
    
    // Animation settings
    this.animationDuration = 300;
    this.lastRenderTime = 0;
    
    // Initialize when DOM is ready
    this.init();
  }

  /**
   * Initialize the pixel renderer
   */
  init() {
    // Get canvas element
    this.canvas = document.getElementById('colonyCanvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }
    
    // Get 2D context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Failed to get 2D context');
      return;
    }
    
    // Set canvas size - both internal resolution and display size
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    // Let canvas display at its natural size (no CSS scaling)
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    
    // Set rendering properties for pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Initial render
    this.clearCanvas();
    
    console.log('✅ Pixel renderer initialized', {
      worldSize: `${this.worldWidth}x${this.worldHeight}`,
      canvasSize: `${this.canvasWidth}x${this.canvasHeight}`,
      pixelSize: this.pixelSize
    });
  }

  /**
   * Set up canvas event handlers
   */
  setupEventHandlers() {
    // Mouse click handler
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width) / this.pixelSize);
      const y = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height) / this.pixelSize);
      this.handlePixelClick(x, y);
    });
    
    // Mouse hover handler
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (this.canvasWidth / rect.width) / this.pixelSize);
      const y = Math.floor((e.clientY - rect.top) * (this.canvasHeight / rect.height) / this.pixelSize);
      this.handlePixelHover(x, y);
    });
  }

  /**
   * Main render function
   */
  render(state, simulationStats = {}) {
    if (!state || !this.ctx) return;
    
    Utils.performance.start('pixelRender');
    
    // Clear canvas
    this.clearCanvas();
    
    // Render the world
    this.renderWorld(state);
    
    // Update status panels (reuse from old renderer for now)
    this.updateStatusPanels(state, simulationStats);
    
    // Update activity feed
    if (state.recentDiscoveries && state.recentDiscoveries.length > 0) {
      this.updateActivityFeed(state.recentDiscoveries);
    }
    
    this.lastRenderedState = state;
    this.lastRenderTime = Date.now();
    
    Utils.performance.end('pixelRender');
  }

  /**
   * Clear the entire canvas
   */
  clearCanvas() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Render the world
   */
  renderWorld(state) {
    const environment = state.environment;
    const ants = state.ants || [];
    
    if (!environment) return;
    
    // Create ant position lookup
    const antPositions = {};
    ants.forEach(ant => {
      const key = `${ant.position.x},${ant.position.y}`;
      antPositions[key] = ant;
    });
    
    // Render terrain first
    this.renderTerrain(environment);
    
    // Render food sources
    this.renderFoodSources(environment);
    
    // Render trails if enabled
    if (this.showTrails && state.recentMovements) {
      this.renderTrails(state.recentMovements);
    }
    
    // Render ants on top
    this.renderAnts(ants);
  }

  /**
   * Render terrain
   */
  renderTerrain(environment) {
    const terrain = environment.terrain || [];
    
    for (let y = 0; y < this.worldHeight; y++) {
      for (let x = 0; x < this.worldWidth; x++) {
        // Get terrain type (default to empty if beyond current environment)
        let terrainType = '.';
        if (terrain[y] && terrain[y][x]) {
          terrainType = terrain[y][x];
        }
        
        // Render terrain sprite
        this.drawTerrainSprite(x, y, terrainType);
      }
    }
  }

  /**
   * Render food sources
   */
  renderFoodSources(environment) {
    if (!environment.foodSources) return;
    
    environment.foodSources.forEach(food => {
      if (food.discovered && !food.depleted) {
        this.drawFoodSprite(food.x, food.y, food.type);
      }
    });
  }

  /**
   * Render ant trails
   */
  renderTrails(movements) {
    movements.forEach(movement => {
      // Draw trail pixels at both from and to positions
      this.drawPixel(movement.from.x, movement.from.y, this.colors.trail, 0.3);
      this.drawPixel(movement.to.x, movement.to.y, this.colors.trail, 0.3);
    });
  }

  /**
   * Render ants
   */
  renderAnts(ants) {
    ants.forEach(ant => {
      this.drawAntSprite(ant.position.x, ant.position.y, ant);
    });
  }

  /**
   * Draw a single pixel at world coordinates
   */
  drawPixel(x, y, color, alpha = 1) {
    if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) return;
    
    const pixelX = x * this.pixelSize;
    const pixelY = y * this.pixelSize;
    
    if (alpha < 1) {
      this.ctx.globalAlpha = alpha;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
    
    if (alpha < 1) {
      this.ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw a terrain sprite
   */
  drawTerrainSprite(x, y, terrainType) {
    const pixelX = x * this.pixelSize;
    const pixelY = y * this.pixelSize;
    
    switch (terrainType) {
      case '🏠': // Nest - brown with entrance
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, this.pixelSize - 2, this.pixelSize - 2);
        break;
        
      case '🪨': // Rock - gray with highlights
        this.ctx.fillStyle = '#64748b';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillRect(pixelX, pixelY, 1, 1);
        break;
        
      case '🌱': // Grass - green with texture
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#16a34a';
        this.ctx.fillRect(pixelX + 1, pixelY + 2, 1, 1);
        this.ctx.fillRect(pixelX + 2, pixelY + 1, 1, 1);
        break;
        
      case '💧': // Water - blue with ripples
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 1, 1);
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 1, 1);
        break;
        
      default: // Empty space
        this.ctx.fillStyle = this.colors.empty;
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        break;
    }
  }

  /**
   * Draw a food sprite
   */
  drawFoodSprite(x, y, foodType) {
    const pixelX = x * this.pixelSize;
    const pixelY = y * this.pixelSize;
    
    switch (foodType) {
      case 'berries': // Purple berries
        this.ctx.fillStyle = '#8b5cf6';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#a855f7';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 2, 2);
        break;
        
      case 'seeds': // Brown seeds
        this.ctx.fillStyle = '#f97316';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#ea580c';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 1, 1);
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 1, 1);
        break;
        
      case 'nectar': // Golden nectar
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#34d399';
        this.ctx.fillRect(pixelX + 1, pixelY + 1, 2, 2);
        break;
        
      case 'wood': // Brown wood
        this.ctx.fillStyle = '#a16207';
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        this.ctx.fillStyle = '#d97706';
        this.ctx.fillRect(pixelX, pixelY + 1, this.pixelSize, 1);
        break;
        
      default: // Generic food
        this.ctx.fillStyle = this.colors.food;
        this.ctx.fillRect(pixelX, pixelY, this.pixelSize, this.pixelSize);
        break;
    }
  }

  /**
   * Draw an ant sprite
   */
  drawAntSprite(x, y, ant) {
    const pixelX = x * this.pixelSize;
    const pixelY = y * this.pixelSize;
    
    // Base ant body
    let bodyColor, accentColor;
    
    switch (ant.role) {
      case 'worker':
        bodyColor = '#22c55e';
        accentColor = '#16a34a';
        break;
      case 'scout':
        bodyColor = '#3b82f6';
        accentColor = '#1d4ed8';
        break;
      case 'soldier':
        bodyColor = '#dc2626';
        accentColor = '#991b1b';
        break;
      default:
        bodyColor = '#ef4444';
        accentColor = '#dc2626';
        break;
    }
    
    // Draw ant body
    this.ctx.fillStyle = bodyColor;
    this.ctx.fillRect(pixelX + 1, pixelY + 1, 2, 2);
    
    // Draw ant details
    this.ctx.fillStyle = accentColor;
    this.ctx.fillRect(pixelX, pixelY + 1, 1, 1); // Head
    this.ctx.fillRect(pixelX + 3, pixelY + 1, 1, 1); // Abdomen
    
    // Add glow if carrying food
    if (ant.carryingFood) {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillRect(pixelX + 1, pixelY, 2, 1);
    }
  }

  /**
   * Handle pixel click
   */
  handlePixelClick(x, y) {
    if (!this.lastRenderedState) return;
    
    // Find ant at this position
    const ant = this.lastRenderedState.ants?.find(a => 
      a.position.x === x && a.position.y === y
    );
    
    if (ant) {
      this.showAntDetails(ant);
    } else {
      this.showTerrainInfo(x, y);
    }
  }

  /**
   * Handle pixel hover
   */
  handlePixelHover(x, y) {
    if (!this.lastRenderedState) return;
    
    // Find ant at this position
    const ant = this.lastRenderedState.ants?.find(a => 
      a.position.x === x && a.position.y === y
    );
    
    if (ant) {
      this.canvas.title = `${ant.role.toUpperCase()} ant (${ant.state}) at (${x}, ${y})`;
    } else {
      // Check for food
      const food = this.lastRenderedState.environment?.foodSources?.find(f =>
        f.x === x && f.y === y && f.discovered && !f.depleted
      );
      
      if (food) {
        this.canvas.title = `${food.type} (${food.nutrition.toFixed(1)} nutrition) at (${x}, ${y})`;
      } else {
        this.canvas.title = `Position: (${x}, ${y})`;
      }
    }
  }

  /**
   * Show ant details modal
   */
  showAntDetails(ant) {
    const details = `
      <div class="ant-detail-grid">
        <div><strong>Role:</strong> ${ant.role.toUpperCase()}</div>
        <div><strong>State:</strong> ${ant.state}</div>
        <div><strong>Position:</strong> (${ant.position.x}, ${ant.position.y})</div>
        <div><strong>Energy:</strong> ${ant.energy}/${ant.energyMax || 100}</div>
        <div><strong>Carrying Food:</strong> ${ant.carryingFood ? 'Yes' : 'No'}</div>
      </div>
    `;
    
    Utils.showModal(`Ant #${ant.id} Details`, details);
  }

  /**
   * Show terrain info
   */
  showTerrainInfo(x, y) {
    const environment = this.lastRenderedState?.environment;
    let terrain = '.';
    
    if (environment && environment.terrain[y] && environment.terrain[y][x]) {
      terrain = environment.terrain[y][x];
    }
    
    let info = `<div>Position: (${x}, ${y})</div>`;
    info += `<div>Terrain: ${terrain}</div>`;
    
    Utils.showModal('Terrain Information', info);
  }

  /**
   * Update status panels
   */
  updateStatusPanels(state, simulationStats) {
    // Colony status
    Utils.updateElement('elapsedTime', Utils.formatTime(Math.floor(simulationStats.elapsedTime || 0)));
    Utils.updateElement('foodCount', Math.floor(state.food || 0));
    Utils.updateElement('totalPopulation', state.population?.total || 0);
    Utils.updateElement('moraleValue', `${(state.morale || 0).toFixed(1)}/10`);
    
    // Population breakdown
    Utils.updateElement('workerCount', state.population?.workers || 0);
    Utils.updateElement('scoutCount', state.population?.scouts || 0);
    Utils.updateElement('soldierCount', state.population?.soldiers || 0);
    
    // Performance stats
    Utils.updateElement('fpsCounter', simulationStats.fps || 0);
    Utils.updateElement('updateRate', simulationStats.updatesPerSecond || 0);
    Utils.updateElement('simStatus', simulationStats.isPaused ? 'PAUSED' : simulationStats.isRunning ? 'RUNNING' : 'STOPPED');
    
    // Environment info
    const biome = state.biome || 'forest_floor';
    Utils.updateElement('biomeType', biome.replace('_', ' ').toUpperCase());
    Utils.updateElement('currentSeason', (state.narrative_context?.current_season || 'spring').toUpperCase());
    
    if (state.environment) {
      const totalFood = state.environment.foodSources?.length || 0;
      const discoveredFood = state.environment.foodSources?.filter(f => f.discovered)?.length || 0;
      const hazards = state.environment.hazards?.filter(h => h.active)?.length || 0;
      
      Utils.updateElement('foodSources', `${totalFood} total, ${discoveredFood} discovered`);
      Utils.updateElement('hazardCount', `${hazards} active`);
    }
  }

  /**
   * Update activity feed
   */
  updateActivityFeed(discoveries) {
    discoveries.forEach(discovery => {
      let message = '';
      let type = 'info';
      
      switch (discovery.type) {
        case 'food_source':
          message = `🔍 Scout discovered ${discovery.foodType}!`;
          type = 'discovery';
          break;
        case 'food':
          message = `🍯 Worker collected ${discovery.amount} nutrition`;
          type = 'discovery';
          break;
        default:
          message = `✨ Discovery: ${discovery.type}`;
          type = 'discovery';
      }
      
      Utils.addActivity(message, type);
    });
  }

  /**
   * Set display options
   */
  setDisplayOptions(options) {
    if (options.showTrails !== undefined) this.showTrails = options.showTrails;
    if (options.showBehaviorStates !== undefined) this.showBehaviorStates = options.showBehaviorStates;
    if (options.showEnvironmentDetails !== undefined) this.showEnvironmentDetails = options.showEnvironmentDetails;
    
    this.forceRerender();
  }

  /**
   * Force a complete re-render
   */
  forceRerender() {
    if (this.lastRenderedState) {
      this.render(this.lastRenderedState);
    }
  }

  /**
   * Get renderer statistics
   */
  getStats() {
    return {
      lastRenderTime: this.lastRenderTime,
      worldSize: { width: this.worldWidth, height: this.worldHeight },
      canvasSize: { width: this.canvasWidth, height: this.canvasHeight },
      pixelSize: this.pixelSize,
      displayOptions: {
        showTrails: this.showTrails,
        showBehaviorStates: this.showBehaviorStates,
        showEnvironmentDetails: this.showEnvironmentDetails
      }
    };
  }
}