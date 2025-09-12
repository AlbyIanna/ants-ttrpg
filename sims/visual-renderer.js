/**
 * Enhanced Visual renderer for Ant Colony TTRPG
 * Version: v0.4 - Dynamic environment display with realistic ant movement and trails
 */

const MovementAnimator = require('./movement-animator');
const EnvironmentEngine = require('./environment-engine');
const DisplayEngine = require('./display-engine');

class VisualRenderer {
  constructor() {
    this.mapWidth = 35;
    this.mapHeight = 20;
    this.nestPosition = { x: 17, y: 10 };
    this.animator = new MovementAnimator();
    this.environmentEngine = new EnvironmentEngine();
    this.displayEngine = new DisplayEngine();
    
    // Visual enhancement settings
    this.showTrails = true;
    this.showPaths = false;
    this.showBehaviorStates = true;
    this.animationEnabled = true;
    
    // Layout settings for proper alignment
    this.fixedPanelWidth = 63;
    this.useFixedLayout = true;
  }

  createEnvironmentMap(state) {
    // Use the new environment system if available
    if (state.environment && state.environment.terrain) {
      return this.renderEnvironmentTerrain(state);
    }
    
    // Fallback to legacy map generation
    return this.createLegacyMap(state);
  }

  renderEnvironmentTerrain(state) {
    const environment = state.environment;
    const map = [];
    
    // Initialize map from environment terrain
    for (let y = 0; y < environment.metadata.height; y++) {
      map[y] = [];
      for (let x = 0; x < environment.metadata.width; x++) {
        const terrain = environment.terrain[y][x];
        map[y][x] = this.environmentEngine.getTerrainSymbol(terrain);
      }
    }

    // Add borders
    for (let x = 0; x < environment.metadata.width; x++) {
      map[0][x] = '═';
      map[environment.metadata.height - 1][x] = '═';
    }
    for (let y = 0; y < environment.metadata.height; y++) {
      map[y][0] = '║';
      map[y][environment.metadata.width - 1] = '║';
    }
    
    // Corners
    map[0][0] = '╔';
    map[0][environment.metadata.width - 1] = '╗';
    map[environment.metadata.height - 1][0] = '╚';
    map[environment.metadata.height - 1][environment.metadata.width - 1] = '╝';

    // Add nest
    const nx = this.environmentEngine.nestPosition.x;
    const ny = this.environmentEngine.nestPosition.y;
    map[ny][nx] = '🏠';

    // Add food sources
    for (const food of environment.foodSources) {
      if (food.discovered && !food.depleted) {
        map[food.y][food.x] = this.environmentEngine.getFoodSymbol(food.type);
      } else if (!food.discovered && this.shouldShowHiddenFood(food, state)) {
        // Faint indication of undiscovered food
        map[food.y][food.x] = '◦';
      }
    }

    // Add hazards
    for (const hazard of environment.hazards) {
      if (hazard.active) {
        map[hazard.y][hazard.x] = this.environmentEngine.getHazardSymbol(hazard.type);
      }
    }

    // Add trails if enabled
    if (this.showTrails && state.antTrails) {
      this.addTrailsToMap(map, state.antTrails);
    }

    return map;
  }

  createLegacyMap(state) {
    const map = [];
    
    // Initialize empty map with legacy dimensions
    for (let y = 0; y < this.mapHeight; y++) {
      map[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        map[y][x] = '.';
      }
    }

    // Add borders and nest as before
    for (let x = 0; x < this.mapWidth; x++) {
      map[0][x] = '═';
      map[this.mapHeight - 1][x] = '═';
    }
    for (let y = 0; y < this.mapHeight; y++) {
      map[y][0] = '║';
      map[y][this.mapWidth - 1] = '║';
    }
    
    map[0][0] = '╔';
    map[0][this.mapWidth - 1] = '╗';
    map[this.mapHeight - 1][0] = '╚';
    map[this.mapHeight - 1][this.mapWidth - 1] = '╝';

    const nx = this.nestPosition.x;
    const ny = this.nestPosition.y;
    map[ny][nx] = '🏠';
    
    map[ny - 1][nx] = '▪';
    map[ny + 1][nx] = '▪';
    map[ny][nx - 1] = '▪';
    map[ny][nx + 1] = '▪';

    // Add some environmental features
    this.addEnvironmentalFeatures(map, state);

    return map;
  }

  shouldShowHiddenFood(food, state) {
    // Show hint of undiscovered food for scouts nearby
    if (!state.ants) return false;
    
    for (const ant of state.ants) {
      if (ant.role === 'scout') {
        const distance = Math.sqrt(
          Math.pow(ant.position.x - food.x, 2) + 
          Math.pow(ant.position.y - food.y, 2)
        );
        if (distance <= 3) return true;
      }
    }
    return false;
  }

  addTrailsToMap(map, trails) {
    for (const trail of trails) {
      if (!trail.points || trail.points.length === 0) continue;
      for (let i = 0; i < trail.points.length - 1; i++) {
        const point = trail.points[i];
        const strength = point.strength;
        
        if (strength > 0.3 && 
            point.x > 0 && point.x < map[0].length - 1 &&
            point.y > 0 && point.y < map.length - 1) {
          
          // Don't overwrite important terrain features
          const current = map[point.y][point.x];
          if (current === '.' || current === '▪' || current === '▫') {
            // Use different trail symbols based on strength and role
            if (strength > 0.7) {
              map[point.y][point.x] = '●'; // Strong trail
            } else if (strength > 0.4) {
              map[point.y][point.x] = '•'; // Medium trail
            } else {
              map[point.y][point.x] = '·'; // Faint trail
            }
          }
        }
      }
    }
  }

  addEnvironmentalFeatures(map, state) {
    // Add some rocks and obstacles
    if (Math.random() < 0.3) map[4][8] = '🪨';
    if (Math.random() < 0.3) map[9][15] = '🪨';
    
    // Add grass patches
    map[2][3] = '🌱';
    map[12][8] = '🌱';
    map[5][22] = '🌱';
    
    // Winter effects
    if (state.turn >= 5) {
      // Add some frost/snow
      map[1][1] = '❄';
      map[1][this.mapWidth - 2] = '❄';
      map[this.mapHeight - 2][1] = '❄';
      map[this.mapHeight - 2][this.mapWidth - 2] = '❄';
    }

    // Predator warning if recent predator encounter
    if (state.recent_events && state.recent_events.includes('predator_encounter')) {
      map[1][12] = '🦅'; // Bird overhead
    }
  }

  distributeAnts(state) {
    // Use actual ant positions if available (new system)
    if (state.ants && state.ants.length > 0) {
      return this.renderActualAnts(state.ants);
    }
    
    // Fallback to legacy random distribution
    return this.distributeLegacyAnts(state);
  }

  renderActualAnts(ants) {
    const renderedAnts = [];
    
    for (const ant of ants) {
      const symbol = this.getAntSymbol(ant);
      renderedAnts.push({
        id: ant.id,
        type: ant.role,
        symbol: symbol,
        x: ant.position.x,
        y: ant.position.y,
        state: ant.state,
        carryingFood: ant.carryingFood,
        energy: ant.energy,
        energyMax: ant.energyMax
      });
    }
    
    return renderedAnts;
  }

  getAntSymbol(ant) {
    // Base symbols
    let symbol = ant.role === 'worker' ? 'W' : 
                 ant.role === 'scout' ? 'S' : 'D';
    
    // Add state indicators if enabled
    if (this.showBehaviorStates) {
      switch (ant.state) {
        case 'foraging':
          symbol = ant.carryingFood ? 'w' : 'W'; // Lowercase when carrying food
          break;
        case 'exploring':
          symbol = 'S';
          break;
        case 'returning':
          symbol = ant.carryingFood ? '←' : '↑'; // Arrow showing direction
          break;
        case 'patrolling':
          symbol = 'D';
          break;
        case 'resting':
          symbol = '○'; // Resting symbol
          break;
        case 'fleeing':
          symbol = '!'; // Alert symbol
          break;
      }
    }
    
    return symbol;
  }

  distributeLegacyAnts(state) {
    const ants = [];
    const roles = state.population;
    
    // Use updated map dimensions
    const mapWidth = state.environment ? state.environment.metadata.width : this.mapWidth;
    const mapHeight = state.environment ? state.environment.metadata.height : this.mapHeight;
    const nestPos = state.environment ? this.environmentEngine.nestPosition : this.nestPosition;
    
    // Workers around nest and foraging areas
    for (let i = 0; i < roles.workers; i++) {
      if (i < 3) {
        ants.push({
          type: 'worker',
          symbol: 'W',
          x: nestPos.x + (Math.random() > 0.5 ? 1 : -1),
          y: nestPos.y + (Math.random() > 0.5 ? 1 : -1)
        });
      } else {
        ants.push({
          type: 'worker', 
          symbol: 'W',
          x: Math.floor(Math.random() * (mapWidth - 4)) + 2,
          y: Math.floor(Math.random() * (mapHeight - 4)) + 2
        });
      }
    }

    // Scouts at edges and exploring
    for (let i = 0; i < roles.scouts; i++) {
      ants.push({
        type: 'scout',
        symbol: 'S',
        x: Math.floor(Math.random() * (mapWidth - 6)) + 3,
        y: i % 2 === 0 ? 2 : mapHeight - 3
      });
    }

    // Soldiers near nest for defense
    for (let i = 0; i < roles.soldiers; i++) {
      ants.push({
        type: 'soldier',
        symbol: 'D',
        x: nestPos.x + (i % 2 === 0 ? 2 : -2),
        y: nestPos.y
      });
    }

    return ants;
  }

  renderColonyView(state) {
    const map = this.createEnvironmentMap(state);
    const ants = this.distributeAnts(state);
    
    // Use map dimensions based on environment
    const mapWidth = state.environment ? state.environment.metadata.width : this.mapWidth;
    const mapHeight = state.environment ? state.environment.metadata.height : this.mapHeight;
    
    // Place ants on map
    for (const ant of ants) {
      if (ant.x >= 0 && ant.x < mapWidth && ant.y >= 0 && ant.y < mapHeight) {
        // Don't overwrite important terrain features
        const current = map[ant.y][ant.x];
        if (current === '.' || current === '▪' || current === '▫' || 
            current === '●' || current === '•' || current === '·') {
          map[ant.y][ant.x] = ant.symbol;
        }
      }
    }

    if (this.useFixedLayout) {
      // Use display engine for proper colony map rendering
      const mapPanel = this.displayEngine.createColonyMapPanel(map, mapWidth, mapHeight);
      
      // Add legend as separate panel
      const legendContent = this.createLegendContent();
      const legendPanel = this.displayEngine.createPanel('LEGEND', legendContent, this.fixedPanelWidth);
      
      return '\n' + mapPanel + '\n\n' + legendPanel;
    } else {
      // Fallback to old method (for compatibility)
      return this.renderColonyViewLegacy(map, mapWidth, mapHeight);
    }
  }

  createLegendContent() {
    let legend = '';
    legend += '🐜 W=Worker  S=Scout  D=Soldier  🏠=Nest  🫐🪵🌸=Food\n';
    legend += '🪨=Rock  🌱=Grass  ❄=Winter  🦅=Predator Warning';
    
    if (this.showBehaviorStates) {
      legend += '\nw=Carrying Food  ←↑=Returning  ○=Resting  !=Fleeing';
    }
    if (this.showTrails) {
      legend += '\n●•·=Ant Trails  ◦=Hidden Food Source';
    }
    
    return legend;
  }

  renderColonyViewLegacy(map, mapWidth, mapHeight) {
    // Legacy rendering method with fixed width
    let output = '\n';
    const fixedWidth = this.fixedPanelWidth;
    
    // Top border
    output += '┌─ COLONY VIEW ' + '─'.repeat(fixedWidth - 16) + '┐\n';
    
    for (let y = 0; y < mapHeight; y++) {
      output += '│ ';
      for (let x = 0; x < mapWidth; x++) {
        output += map[y][x];
      }
      // Calculate exact padding needed
      const contentWidth = mapWidth + 2; // map + borders
      const padding = ' '.repeat(Math.max(0, fixedWidth - contentWidth));
      output += padding + ' │\n';
    }
    
    // Bottom border  
    output += '└' + '─'.repeat(fixedWidth) + '┘\n';
    
    return output;
  }

  renderStatusPanel(state) {
    // Create status content
    let content = `Turn: ${state.turn.toString().padEnd(3)} │ Food: ${state.food.toString().padEnd(3)} │ Population: ${state.population.total.toString().padEnd(3)} │ Morale: ${state.morale}/10\n`;
    content += `Workers: ${state.population.workers.toString().padEnd(2)} │ Scouts: ${state.population.scouts.toString().padEnd(2)} │ Soldiers: ${state.population.soldiers.toString().padEnd(2)} │ Locations: ${(state.locations ? state.locations.length : 1).toString().padEnd(2)}`;

    // Use display engine for consistent borders
    let panel = '\n' + this.displayEngine.createPanel('COLONY STATUS', content, this.fixedPanelWidth) + '\n';

    // Add status warnings
    if (state.morale <= 3) {
      panel += '⚠️  MORALE CRISIS: Ants are demoralized and working poorly!\n';
    }
    if (state.food <= 5) {
      panel += '🍯 FOOD SHORTAGE: Colony is running dangerously low on food!\n';
    }
    if (state.turn >= 5) {
      panel += '❄️  WINTER SEASON: Food consumption doubled, foraging harder!\n';
    }

    return panel;
  }

  renderActionResults(results, aiMode = false) {
    if (!results) return '';
    
    let output = '\n';
    
    if (aiMode && results.ai_action_narrative) {
      // Enhanced AI narrative display
      output += '┌─ GAMEMASTER NARRATIVE ────────────────────────────────────┐\n';
      const wrappedNarrative = this.wrapText(results.ai_action_narrative, 57);
      for (const line of wrappedNarrative) {
        output += `│ ${line.padEnd(57)} │\n`;
      }
      
      // Add AI event narratives if present
      if (results.ai_narrative && results.ai_narrative.length > 0) {
        output += '├───────────────────────────────────────────────────────────┤\n';
        for (const eventNarrative of results.ai_narrative) {
          const wrappedEvent = this.wrapText(eventNarrative, 57);
          for (const line of wrappedEvent) {
            output += `│ ${line.padEnd(57)} │\n`;
          }
        }
      }
      
      output += '└───────────────────────────────────────────────────────────┘\n';
    } else if (results.narrative) {
      // Standard narrative display
      output += '┌─ ACTION RESULTS ──────────────────────────────────────────┐\n';
      
      for (const narrative of results.narrative) {
        const line = `│ ${narrative.padEnd(57)} │`;
        output += line + '\n';
      }
      
      if (results.events && results.events.length > 0) {
        output += '├───────────────────────────────────────────────────────────┤\n';
        const eventLine = `│ ⚡ Events: ${results.events.join(', ').padEnd(46)} │`;
        output += eventLine + '\n';
      }
      
      output += '└───────────────────────────────────────────────────────────┘\n';
    }
    
    // Display ant movement activity if available
    if (results.antMovements && results.antMovements.length > 0) {
      output += this.renderMovementActivity(results);
    }
    
    // Display discoveries if any
    if (results.discoveries && results.discoveries.length > 0) {
      output += this.renderDiscoveries(results.discoveries);
    }
    
    return output;
  }

  renderMovementActivity(results) {
    if (!results.antMovements || results.antMovements.length === 0) return '';
    
    let output = '\n';
    output += '┌─ ANT MOVEMENT ACTIVITY ───────────────────────────────────┐\n';
    
    // Group movements by behavior
    const behaviorGroups = {};
    for (const movement of results.antMovements) {
      const key = movement.behavior || 'moving';
      if (!behaviorGroups[key]) behaviorGroups[key] = [];
      behaviorGroups[key].push(movement);
    }
    
    for (const [behavior, movements] of Object.entries(behaviorGroups)) {
      const count = movements.length;
      const description = this.getBehaviorDescription(behavior, count);
      const line = `│ ${description.padEnd(57)} │`;
      output += line + '\n';
    }
    
    output += '└───────────────────────────────────────────────────────────┘\n';
    
    return output;
  }

  renderDiscoveries(discoveries) {
    let output = '\n';
    output += '┌─ DISCOVERIES ─────────────────────────────────────────────┐\n';
    
    for (const discovery of discoveries) {
      let description = '';
      if (discovery.type === 'food_source') {
        description = `🔍 Scout found ${discovery.foodType} at (${discovery.position.x}, ${discovery.position.y})`;
      } else if (discovery.type === 'food') {
        description = `🍯 Worker collected ${discovery.amount} nutrition`;
      } else {
        description = `✨ Discovery: ${discovery.type}`;
      }
      
      const line = `│ ${description.padEnd(57)} │`;
      output += line + '\n';
    }
    
    output += '└───────────────────────────────────────────────────────────┘\n';
    
    return output;
  }

  getBehaviorDescription(behavior, count) {
    const descriptions = {
      'foraging': `${count} worker${count > 1 ? 's' : ''} searching for food`,
      'exploring': `${count} scout${count > 1 ? 's' : ''} exploring new areas`,
      'returning': `${count} ant${count > 1 ? 's' : ''} returning to nest`,
      'patrolling': `${count} soldier${count > 1 ? 's' : ''} patrolling territory`,
      'resting': `${count} ant${count > 1 ? 's' : ''} resting at nest`,
      'moving': `${count} ant${count > 1 ? 's' : ''} moving`
    };
    
    return descriptions[behavior] || `${count} ant${count > 1 ? 's' : ''} ${behavior}`;
  }

  wrapText(text, maxLength) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  renderFullView(state, lastResults = null, aiMode = false) {
    let output = '';
    
    // Clear screen effect
    output += '\x1b[2J\x1b[0f';
    
    // Title with AI mode indicator
    output += '\n';
    output += '╔═══════════════════════════════════════════════════════════╗\n';
    if (aiMode) {
      output += '║              🐜 ANT COLONY TTRPG 🐜 [AI GM]               ║\n';
    } else {
      output += '║                    🐜 ANT COLONY TTRPG 🐜                 ║\n';
    }
    output += '╚═══════════════════════════════════════════════════════════╝\n';
    
    // Status panel
    output += this.renderStatusPanel(state);
    
    // Environment stats (for enhanced environment system)
    if (state.environment && state.environment.metadata) {
      output += this.renderEnvironmentStats(state);
    }
    
    // Colony view
    output += this.renderColonyView(state);
    
    // Action results if any
    if (lastResults) {
      output += this.renderActionResults(lastResults, aiMode);
    }
    
    return output;
  }

  async animateAntMovement(fromState, toState, action, results = null) {
    // Enhanced animation using the movement animator
    console.log(`\n🐜 ${action.toUpperCase()} - Ants are moving...`);
    
    if (results && results.antMovements && results.antMovements.length > 0) {
      // Use the advanced animation system
      await this.animator.animateMovements(
        results.antMovements, 
        this, 
        toState,
        {
          showTrails: this.showTrails,
          showPaths: this.showPaths,
          animationSpeed: this.animationEnabled ? 1 : 3,
          showNarrative: true
        }
      );
    } else {
      // Fallback to simple animation
      if (action === 'forage') {
        console.log('Workers spread out across the territory seeking food...');
      } else if (action === 'explore') {
        console.log('Scouts venture into unknown areas...');
      } else if (action === 'defend') {
        console.log('Soldiers take defensive positions around the nest...');
      } else if (action === 'rest') {
        console.log('Ants gather near the nest to rest and recover...');
      }
      
      // Simulate movement delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Display movement summary
    if (this.animator && results && results.antMovements) {
      const summary = this.animator.generateMovementSummary(results.antMovements, toState);
      if (summary) {
        console.log(`\n📊 ${summary}`);
      }
    }
  }

  /**
   * Display real-time environment statistics
   */
  renderEnvironmentStats(state) {
    if (!state.environment) return '';
    
    const env = state.environment;
    const biome = env.biome ? env.biome.replace('_', ' ').toUpperCase() : 'UNKNOWN';
    const season = state.narrative_context?.current_season?.toUpperCase() || 'SPRING';
    
    // Food source stats
    const totalFood = env.foodSources?.length || 0;
    const discoveredFood = env.foodSources?.filter(f => f.discovered)?.length || 0;
    const depletedFood = env.foodSources?.filter(f => f.depleted)?.length || 0;
    
    // Hazard stats
    const hazards = env.hazards?.length || 0;
    const activeHazards = env.hazards?.filter(h => h.active)?.length || 0;
    
    // Create content
    let content = `Biome: ${biome.padEnd(15)} │ Season: ${season.padEnd(15)}\n`;
    content += `Food Sources: ${totalFood.toString().padEnd(4)} │ Discovered: ${discoveredFood.toString().padEnd(4)} │ Depleted: ${depletedFood.toString().padEnd(4)}\n`;
    content += `Hazards: ${hazards.toString().padEnd(9)} │ Active: ${activeHazards.toString().padEnd(9)} │ Turn: ${state.turn.toString().padEnd(9)}`;
    
    // Use display engine for consistent borders
    return '\n' + this.displayEngine.createPanel('ENVIRONMENT', content, this.fixedPanelWidth) + '\n';
  }

  /**
   * Set animation and display preferences  
   */
  setDisplayOptions(options = {}) {
    this.showTrails = options.showTrails !== undefined ? options.showTrails : this.showTrails;
    this.showPaths = options.showPaths !== undefined ? options.showPaths : this.showPaths;
    this.showBehaviorStates = options.showBehaviorStates !== undefined ? options.showBehaviorStates : this.showBehaviorStates;
    this.animationEnabled = options.animationEnabled !== undefined ? options.animationEnabled : this.animationEnabled;
  }

  /**
   * Render live simulation view with real-time updates
   */
  renderLiveView(state, simulationStats = {}) {
    const terminalSize = this.displayEngine.getTerminalSize();
    
    // If terminal is small, use compact view to prioritize colony map
    if (terminalSize.height < 35) {
      return this.renderCompactLiveView(state, simulationStats);
    }
    
    const sections = [];
    
    // Title section
    const titleContent = '🐜 ANT COLONY LIVE SIMULATION 🐜';
    sections.push({
      content: this.displayEngine.createPanel('', titleContent, this.fixedPanelWidth),
      height: 3
    });
    
    // Live status panel
    const statusContent = this.createLiveStatusContent(state, simulationStats);
    sections.push({
      content: this.displayEngine.createPanel('LIVE COLONY STATUS', statusContent, this.fixedPanelWidth),
      height: 6
    });
    
    // Environment stats (for enhanced environment system)
    if (state.environment && state.environment.metadata) {
      const envContent = this.createEnvironmentStatsContent(state);
      sections.push({
        content: this.displayEngine.createPanel('ENVIRONMENT', envContent, this.fixedPanelWidth),
        height: 4
      });
    }
    
    // Colony view with real-time ant positions
    const colonyView = this.renderColonyView(state);
    sections.push({
      content: colonyView,
      height: this.mapHeight + 6 // Map + borders + legend (more accurate estimate)
    });
    
    // Recent activity panel
    const activityContent = this.createRecentActivityContent(state, simulationStats);
    sections.push({
      content: this.displayEngine.createPanel('RECENT ACTIVITY', activityContent, this.fixedPanelWidth),
      height: 6
    });
    
    // Controls help
    const controlsContent = this.createControlsContent();
    sections.push({
      content: this.displayEngine.createPanel('CONTROLS', controlsContent, this.fixedPanelWidth),
      height: 4
    });
    
    // Use display engine to create responsive layout
    return this.displayEngine.createResponsiveLayout(sections);
  }

  /**
   * Render compact live view that prioritizes showing the colony map
   */
  renderCompactLiveView(state, simulationStats = {}) {
    const sections = [];
    
    // Essential status in compact form
    const compactStatus = this.createCompactStatusContent(state, simulationStats);
    sections.push({
      content: this.displayEngine.createPanel('LIVE STATUS', compactStatus, this.fixedPanelWidth),
      height: 4
    });
    
    // Colony view is highest priority
    const colonyView = this.renderColonyView(state);
    sections.push({
      content: colonyView,
      height: this.mapHeight + 6
    });
    
    // Only add activity if there's room
    const activityContent = this.createRecentActivityContent(state, simulationStats);
    sections.push({
      content: this.displayEngine.createPanel('ACTIVITY', activityContent, this.fixedPanelWidth),
      height: 4
    });
    
    return this.displayEngine.createResponsiveLayout(sections);
  }

  createCompactStatusContent(state, simulationStats) {
    const elapsed = simulationStats.elapsedTime ? Math.floor(simulationStats.elapsedTime) : 0;
    const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
    const status = simulationStats.isPaused ? 'PAUSED' : 'RUNNING';
    const speed = simulationStats.speed || 1;
    
    return `Time: ${timeStr} | Food: ${Math.floor(state.food)} | Ants: ${state.population.total} | ${status} | ${speed}x\nWorkers: ${state.population.workers} | Scouts: ${state.population.scouts} | Soldiers: ${state.population.soldiers} | Morale: ${state.morale.toFixed(1)}/10`;
  }

  createLiveStatusContent(state, simulationStats) {
    const elapsed = simulationStats.elapsedTime ? Math.floor(simulationStats.elapsedTime) : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    let content = `Time: ${timeStr} │ Food: ${Math.floor(state.food)} │ Population: ${state.population.total} │ Morale: ${state.morale.toFixed(1)}/10\n`;
    content += `Workers: ${state.population.workers} │ Scouts: ${state.population.scouts} │ Soldiers: ${state.population.soldiers} │ Speed: ${simulationStats.speed || 1}x`;
    
    if (simulationStats.performance) {
      const fps = simulationStats.performance.updatesPerSecond || 0;
      const avgTime = simulationStats.performance.averageUpdateTime || 0;
      content += `\nFPS: ${fps} │ Avg Update: ${avgTime.toFixed(1)}ms │ Status: ${simulationStats.isPaused ? 'PAUSED' : 'RUNNING'}`;
    }
    
    return content;
  }

  createEnvironmentStatsContent(state) {
    const env = state.environment;
    const biome = env.biome ? env.biome.replace('_', ' ').toUpperCase() : 'UNKNOWN';
    const season = state.narrative_context?.current_season?.toUpperCase() || 'SPRING';
    
    const totalFood = env.foodSources?.length || 0;
    const discoveredFood = env.foodSources?.filter(f => f.discovered)?.length || 0;
    const depletedFood = env.foodSources?.filter(f => f.depleted)?.length || 0;
    const hazards = env.hazards?.length || 0;
    const activeHazards = env.hazards?.filter(h => h.active)?.length || 0;
    
    return `Biome: ${biome} │ Season: ${season}\nFood Sources: ${totalFood} │ Discovered: ${discoveredFood} │ Depleted: ${depletedFood}\nHazards: ${hazards} │ Active: ${activeHazards} │ Turn: ${state.turn}`;
  }

  createRecentActivityContent(state, simulationStats) {
    let content = '';
    
    // Show recent movements
    if (state.recentMovements && state.recentMovements.length > 0) {
      const movementSummary = this.summarizeMovements(state.recentMovements);
      content += `Movement: ${movementSummary}\n`;
    }
    
    // Show recent discoveries
    if (state.recentDiscoveries && state.recentDiscoveries.length > 0) {
      for (const discovery of state.recentDiscoveries.slice(-1)) { // Show last 1
        if (discovery.type === 'food_source') {
          content += `🔍 Found ${discovery.foodType}\n`;
        } else if (discovery.type === 'food') {
          content += `🍯 Collected ${discovery.amount} food\n`;
        }
      }
    }
    
    // Colony performance metrics
    const activeAnts = state.ants ? state.ants.filter(a => a.state !== 'resting').length : 0;
    const foodRate = (state.discoveredFood || 0) / Math.max(1, (simulationStats.elapsedTime || 1) / 60);
    
    content += `Active Ants: ${activeAnts} │ Food/min: ${foodRate.toFixed(1)} │ Frame: ${simulationStats.frameCount || 0}`;
    
    return content || 'Colony at rest...';
  }

  createControlsContent() {
    return 'SPACE: Pause/Resume │ +/-: Speed │ Q: Quit │ R: Reset';
  }

  /**
   * Render live status panel with real-time metrics
   */
  renderLiveStatusPanel(state, simulationStats) {
    let panel = '\n';
    panel += '┌─ LIVE COLONY STATUS ──────────────────────────────────────┐\n';
    
    // Basic colony stats
    const elapsed = simulationStats.elapsedTime ? Math.floor(simulationStats.elapsedTime) : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    panel += `│ Time: ${timeStr} │ Food: ${Math.floor(state.food)} │ Population: ${state.population.total} │ Morale: ${state.morale.toFixed(1)}/10 │\n`;
    
    // Population breakdown
    panel += '├───────────────────────────────────────────────────────────┤\n';
    panel += `│ Workers: ${state.population.workers.toString().padEnd(2)} │ Scouts: ${state.population.scouts.toString().padEnd(2)} │ Soldiers: ${state.population.soldiers.toString().padEnd(2)} │ Speed: ${simulationStats.speed || 1}x │\n`;
    
    // Live performance metrics
    if (simulationStats.performance) {
      const fps = simulationStats.performance.updatesPerSecond || 0;
      const avgTime = simulationStats.performance.averageUpdateTime || 0;
      panel += '├───────────────────────────────────────────────────────────┤\n';
      panel += `│ FPS: ${fps.toString().padEnd(4)} │ Avg Update: ${avgTime.toFixed(1)}ms │ Status: ${simulationStats.isPaused ? 'PAUSED' : 'RUNNING'} │\n`;
    }
    
    panel += '└───────────────────────────────────────────────────────────┘\n';

    // Add status warnings
    if (state.morale <= 3) {
      panel += '⚠️  MORALE CRISIS: Ants are demoralized and working poorly!\n';
    }
    if (state.food <= 5) {
      panel += '🍯 FOOD SHORTAGE: Colony is running dangerously low on food!\n';
    }
    if (state.narrative_context && state.narrative_context.current_season === 'winter') {
      panel += '❄️  WINTER SEASON: Food consumption increased, foraging harder!\n';
    }

    return panel;
  }

  /**
   * Render recent activity panel showing live ant actions
   */
  renderRecentActivityPanel(state, simulationStats) {
    let output = '\n';
    output += '┌─ RECENT ACTIVITY ─────────────────────────────────────────┐\n';
    
    // Show recent movements
    if (state.recentMovements && state.recentMovements.length > 0) {
      const movementSummary = this.summarizeMovements(state.recentMovements);
      output += `│ Movement: ${movementSummary.padEnd(49)} │\n`;
    }
    
    // Show recent discoveries
    if (state.recentDiscoveries && state.recentDiscoveries.length > 0) {
      for (const discovery of state.recentDiscoveries.slice(-2)) { // Show last 2
        let desc = '';
        if (discovery.type === 'food_source') {
          desc = `🔍 Found ${discovery.foodType}`;
        } else if (discovery.type === 'food') {
          desc = `🍯 Collected ${discovery.amount} food`;
        }
        output += `│ ${desc.padEnd(57)} │\n`;
      }
    }
    
    // Colony performance metrics
    const activeAnts = state.ants ? state.ants.filter(a => a.state !== 'resting').length : 0;
    const foodRate = (state.discoveredFood || 0) / Math.max(1, (simulationStats.elapsedTime || 1) / 60);
    
    output += '├───────────────────────────────────────────────────────────┤\n';
    output += `│ Active Ants: ${activeAnts.toString().padEnd(4)} │ Food/min: ${foodRate.toFixed(1).padEnd(8)} │ Frame: ${simulationStats.frameCount || 0} │\n`;
    
    output += '└───────────────────────────────────────────────────────────┘\n';
    
    return output;
  }

  /**
   * Summarize movements for display
   */
  summarizeMovements(movements) {
    const behaviorCounts = {};
    
    for (const movement of movements) {
      const behavior = movement.behavior || 'moving';
      behaviorCounts[behavior] = (behaviorCounts[behavior] || 0) + 1;
    }
    
    const summaries = [];
    for (const [behavior, count] of Object.entries(behaviorCounts)) {
      summaries.push(`${count} ${behavior}`);
    }
    
    return summaries.join(', ') || 'Colony at rest';
  }

  /**
   * Render controls help
   */
  renderControlsHelp() {
    let output = '\n';
    output += '┌─ CONTROLS ────────────────────────────────────────────────┐\n';
    output += '│ SPACE: Pause/Resume │ +/-: Speed │ Q: Quit │ R: Reset    │\n';
    output += '└───────────────────────────────────────────────────────────┘\n';
    return output;
  }

  /**
   * Render minimal live view for performance
   */
  renderMinimalLiveView(state, simulationStats) {
    const elapsed = simulationStats.elapsedTime ? Math.floor(simulationStats.elapsedTime) : 0;
    const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
    const status = simulationStats.isPaused ? 'PAUSED' : 'RUNNING';
    const speed = simulationStats.speed || 1;
    
    return `🐜 Live: ${timeStr} | Food: ${Math.floor(state.food)} | Ants: ${state.population.total} | ${status} | ${speed}x`;
  }

  /**
   * Get formatted ant status for live display
   */
  getFormattedAntStatus(ants) {
    const statuses = {};
    
    for (const ant of ants) {
      const key = `${ant.role}_${ant.state}`;
      statuses[key] = (statuses[key] || 0) + 1;
    }
    
    const formatted = [];
    for (const [status, count] of Object.entries(statuses)) {
      const [role, state] = status.split('_');
      formatted.push(`${count}${role[0].toUpperCase()}:${state}`);
    }
    
    return formatted.join(' ');
  }
}

module.exports = VisualRenderer;