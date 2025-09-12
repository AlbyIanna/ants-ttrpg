/**
 * Browser-based Visual Renderer for Ant Colony TTRPG
 * Version: v0.4 - DOM-based rendering with perfect emoji support
 */

class WebRenderer {
  constructor() {
    this.colonyMapElement = null;
    this.mapCells = [];
    this.lastRenderedState = null;
    
    // Display options
    this.showTrails = true;
    this.showBehaviorStates = true;
    this.showEnvironmentDetails = true;
    
    // Animation settings
    this.animationDuration = 300;
    this.lastRenderTime = 0;
    
    // Initialize when DOM is ready
    this.init();
  }

  /**
   * Initialize the renderer
   */
  init() {
    // Get colony map element
    this.colonyMapElement = document.getElementById('colonyMap');
    if (!this.colonyMapElement) {
      console.error('Colony map element not found');
      return;
    }
    
    // Initialize map grid
    this.initializeMapGrid();
    
    // Set up display option listeners
    this.setupDisplayOptions();
    
    console.log('✅ Web renderer initialized');
  }

  /**
   * Initialize the map grid DOM structure
   */
  initializeMapGrid() {
    // Clear existing content
    this.colonyMapElement.innerHTML = '';
    this.mapCells = [];
    
    // Create 35x20 grid of cells
    for (let y = 0; y < 20; y++) {
      this.mapCells[y] = [];
      for (let x = 0; x < 35; x++) {
        const cell = Utils.createElement('div', {
          className: 'colony-cell',
          'data-x': x,
          'data-y': y
        });
        
        // Add click handler for interactivity
        cell.addEventListener('click', (e) => {
          this.handleCellClick(x, y, e);
        });
        
        // Add hover handler for tooltips
        cell.addEventListener('mouseenter', (e) => {
          this.handleCellHover(x, y, e);
        });
        
        this.mapCells[y][x] = cell;
        this.colonyMapElement.appendChild(cell);
      }
    }
  }

  /**
   * Set up display option listeners
   */
  setupDisplayOptions() {
    const trailsCheckbox = document.getElementById('showTrails');
    const behaviorCheckbox = document.getElementById('showBehaviorStates');
    const environmentCheckbox = document.getElementById('showEnvironmentDetails');
    
    if (trailsCheckbox) {
      trailsCheckbox.addEventListener('change', (e) => {
        this.showTrails = e.target.checked;
        this.forceRerender();
      });
    }
    
    if (behaviorCheckbox) {
      behaviorCheckbox.addEventListener('change', (e) => {
        this.showBehaviorStates = e.target.checked;
        this.forceRerender();
      });
    }
    
    if (environmentCheckbox) {
      environmentCheckbox.addEventListener('change', (e) => {
        this.showEnvironmentDetails = e.target.checked;
        this.forceRerender();
      });
    }
  }

  /**
   * Main render function
   */
  render(state, simulationStats = {}) {
    if (!state || !this.mapCells.length) return;
    
    Utils.performance.start('render');
    
    // Render the colony map
    this.renderColonyMap(state);
    
    // Update status panels
    this.updateStatusPanels(state, simulationStats);
    
    // Update activity feed with new discoveries
    if (state.recentDiscoveries && state.recentDiscoveries.length > 0) {
      this.updateActivityFeed(state.recentDiscoveries);
    }
    
    this.lastRenderedState = state;
    this.lastRenderTime = Date.now();
    
    Utils.performance.end('render');
  }

  /**
   * Render the colony map
   */
  renderColonyMap(state) {
    const environment = state.environment;
    const ants = state.ants || [];
    
    if (!environment) return;
    
    // Create a map of ant positions for quick lookup
    const antPositions = {};
    ants.forEach(ant => {
      const key = `${ant.position.x},${ant.position.y}`;
      antPositions[key] = ant;
    });
    
    // Render each cell
    for (let y = 0; y < environment.metadata.height; y++) {
      for (let x = 0; x < environment.metadata.width; x++) {
        const cell = this.mapCells[y][x];
        if (!cell) continue;
        
        // Get terrain
        const terrain = environment.terrain[y] ? environment.terrain[y][x] || '.' : '.';
        
        // Check for ant at this position
        const antKey = `${x},${y}`;
        const ant = antPositions[antKey];
        
        // Check for food sources
        const foodSource = environment.foodSources.find(food => food.x === x && food.y === y);
        
        // Determine cell content and styling
        this.updateCell(cell, {
          x, y, terrain, ant, foodSource, state
        });
      }
    }
  }

  /**
   * Update individual cell
   */
  updateCell(cell, { x, y, terrain, ant, foodSource, state }) {
    // Reset classes
    cell.className = 'colony-cell';
    
    // Determine content
    let content = terrain;
    let classes = [];
    
    // Ant takes priority
    if (ant) {
      content = this.getAntSymbol(ant);
      classes.push('ant');
      if (ant.carryingFood) classes.push('carrying-food');
    }
    // Food source
    else if (foodSource && foodSource.discovered && !foodSource.depleted) {
      content = this.getFoodSymbol(foodSource.type);
      classes.push('food');
    }
    // Hidden food (for scouts nearby)
    else if (foodSource && !foodSource.discovered && this.shouldShowHiddenFood(foodSource, state)) {
      content = '◦';
      classes.push('hidden-food');
    }
    // Trails (if enabled and no other content)
    else if (this.showTrails && content === '.' && this.hasTrailAt(x, y, state)) {
      content = '·';
      classes.push('trail');
    }
    
    // Special terrain classes
    if (content === '🏠') classes.push('nest');
    if (content.match(/[🪨🏔]/)) classes.push('obstacle');
    if (content.match(/[🌱🌿🍄]/)) classes.push('vegetation');
    if (content.match(/[🫐🪵🌸🍃]/)) classes.push('food');
    
    // Update cell
    cell.textContent = content;
    cell.className = 'colony-cell ' + classes.join(' ');
    
    // Store data for interactions
    cell.dataset.terrain = terrain;
    if (ant) {
      cell.dataset.antId = ant.id;
      cell.dataset.antRole = ant.role;
      cell.dataset.antState = ant.state;
    }
    if (foodSource) {
      cell.dataset.foodType = foodSource.type;
      cell.dataset.foodNutrition = foodSource.nutrition;
    }
  }

  /**
   * Get ant symbol based on role and state
   */
  getAntSymbol(ant) {
    if (!this.showBehaviorStates) {
      return ant.role === 'worker' ? 'W' : ant.role === 'scout' ? 'S' : 'D';
    }
    
    // Show behavior-specific symbols
    switch (ant.state) {
      case 'foraging':
        return ant.carryingFood ? 'w' : 'W';
      case 'returning':
        return ant.carryingFood ? '←' : '↑';
      case 'exploring':
        return 'S';
      case 'patrolling':
        return 'D';
      case 'resting':
        return '○';
      case 'fleeing':
        return '!';
      default:
        return ant.role === 'worker' ? 'W' : ant.role === 'scout' ? 'S' : 'D';
    }
  }

  /**
   * Get food symbol based on type
   */
  getFoodSymbol(type) {
    switch (type) {
      case 'berries': return '🫐';
      case 'seeds': return '🌸';
      case 'nectar': return '🍃';
      default: return '🪵';
    }
  }

  /**
   * Check if hidden food should be shown (scouts nearby)
   */
  shouldShowHiddenFood(food, state) {
    if (!state.ants) return false;
    
    for (const ant of state.ants) {
      if (ant.role === 'scout') {
        const distance = Utils.distance(ant.position.x, ant.position.y, food.x, food.y);
        if (distance <= 3) return true;
      }
    }
    return false;
  }

  /**
   * Check if there's a trail at position
   */
  hasTrailAt(x, y, state) {
    if (!state.recentMovements) return false;
    
    return state.recentMovements.some(movement => 
      (movement.to.x === x && movement.to.y === y) ||
      (movement.from.x === x && movement.from.y === y)
    );
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
   * Update activity feed with discoveries
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
   * Handle cell click for interactions
   */
  handleCellClick(x, y, event) {
    const cell = event.target;
    const antId = cell.dataset.antId;
    
    if (antId) {
      // Show ant details
      this.showAntDetails(antId);
    } else {
      // Show terrain info
      this.showTerrainInfo(x, y, cell);
    }
  }

  /**
   * Handle cell hover for tooltips
   */
  handleCellHover(x, y, event) {
    const cell = event.target;
    const terrain = cell.dataset.terrain;
    
    if (cell.dataset.antId) {
      const role = cell.dataset.antRole;
      const state = cell.dataset.antState;
      cell.title = `${role.toUpperCase()} ant (${state})`;
    } else if (cell.dataset.foodType) {
      const type = cell.dataset.foodType;
      const nutrition = cell.dataset.foodNutrition;
      cell.title = `${type} (${nutrition} nutrition)`;
    } else if (terrain && terrain !== '.') {
      cell.title = `Terrain: ${terrain}`;
    } else {
      cell.title = `Position: (${x}, ${y})`;
    }
  }

  /**
   * Show ant details modal
   */
  showAntDetails(antId) {
    if (!this.lastRenderedState || !this.lastRenderedState.ants) return;
    
    const ant = this.lastRenderedState.ants.find(a => a.id == antId);
    if (!ant) return;
    
    const details = `
      <div class="ant-detail-grid">
        <div><strong>Role:</strong> ${ant.role.toUpperCase()}</div>
        <div><strong>State:</strong> ${ant.state}</div>
        <div><strong>Position:</strong> (${ant.position.x}, ${ant.position.y})</div>
        <div><strong>Energy:</strong> ${ant.energy}/${ant.energyMax}</div>
        <div><strong>Carrying Food:</strong> ${ant.carryingFood ? 'Yes' : 'No'}</div>
      </div>
    `;
    
    Utils.showModal(`Ant #${ant.id} Details`, details);
  }

  /**
   * Show terrain info
   */
  showTerrainInfo(x, y, cell) {
    const terrain = cell.dataset.terrain || '.';
    const content = cell.textContent;
    
    let info = `<div>Position: (${x}, ${y})</div>`;
    info += `<div>Terrain: ${terrain}</div>`;
    
    if (content !== terrain) {
      info += `<div>Content: ${content}</div>`;
    }
    
    Utils.showModal('Terrain Information', info);
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
   * Set display options
   */
  setDisplayOptions(options) {
    if (options.showTrails !== undefined) this.showTrails = options.showTrails;
    if (options.showBehaviorStates !== undefined) this.showBehaviorStates = options.showBehaviorStates;
    if (options.showEnvironmentDetails !== undefined) this.showEnvironmentDetails = options.showEnvironmentDetails;
    
    this.forceRerender();
  }

  /**
   * Animate ant movement (future enhancement)
   */
  animateMovement(movements) {
    // Future: implement smooth CSS transitions for ant movement
    movements.forEach(movement => {
      const fromCell = this.mapCells[movement.from.y]?.[movement.from.x];
      const toCell = this.mapCells[movement.to.y]?.[movement.to.x];
      
      if (fromCell && toCell) {
        // Add animation classes
        fromCell.classList.add('ant-leaving');
        toCell.classList.add('ant-arriving');
        
        // Remove classes after animation
        setTimeout(() => {
          fromCell.classList.remove('ant-leaving');
          toCell.classList.remove('ant-arriving');
        }, this.animationDuration);
      }
    });
  }

  /**
   * Get renderer statistics
   */
  getStats() {
    return {
      lastRenderTime: this.lastRenderTime,
      cellCount: this.mapCells.flat().length,
      displayOptions: {
        showTrails: this.showTrails,
        showBehaviorStates: this.showBehaviorStates,
        showEnvironmentDetails: this.showEnvironmentDetails
      }
    };
  }
}

// Export for use in other modules
window.WebRenderer = WebRenderer;