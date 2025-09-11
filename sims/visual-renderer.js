/**
 * Visual renderer for Ant Colony TTRPG
 * Version: v0.2 - Adds visual representation of colony and environment
 */

class VisualRenderer {
  constructor() {
    this.mapWidth = 25;
    this.mapHeight = 15;
    this.nestPosition = { x: 12, y: 7 };
  }

  createEnvironmentMap(state) {
    const map = [];
    
    // Initialize empty map
    for (let y = 0; y < this.mapHeight; y++) {
      map[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        map[y][x] = '.';
      }
    }

    // Add borders
    for (let x = 0; x < this.mapWidth; x++) {
      map[0][x] = '═';
      map[this.mapHeight - 1][x] = '═';
    }
    for (let y = 0; y < this.mapHeight; y++) {
      map[y][0] = '║';
      map[y][this.mapWidth - 1] = '║';
    }
    
    // Corners
    map[0][0] = '╔';
    map[0][this.mapWidth - 1] = '╗';
    map[this.mapHeight - 1][0] = '╚';
    map[this.mapHeight - 1][this.mapWidth - 1] = '╝';

    // Add nest
    const nx = this.nestPosition.x;
    const ny = this.nestPosition.y;
    map[ny][nx] = '🏠';
    
    // Add nest tunnels
    map[ny - 1][nx] = '▪';
    map[ny + 1][nx] = '▪';
    map[ny][nx - 1] = '▪';
    map[ny][nx + 1] = '▪';

    // Add food sources based on discovered locations
    if (state.locations && state.locations.includes('berry_bush')) {
      map[3][20] = '🫐';
    }
    if (state.locations && state.locations.includes('fallen_log')) {
      map[11][5] = '🪵';
    }
    if (state.locations && state.locations.includes('flower_patch')) {
      map[6][18] = '🌸';
    }

    // Add environmental features
    this.addEnvironmentalFeatures(map, state);

    return map;
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
    const ants = [];
    const roles = state.population;
    
    // Workers around nest and foraging areas
    for (let i = 0; i < roles.workers; i++) {
      if (i < 3) {
        // Some workers near nest
        ants.push({
          type: 'worker',
          symbol: 'W',
          x: this.nestPosition.x + (Math.random() > 0.5 ? 1 : -1),
          y: this.nestPosition.y + (Math.random() > 0.5 ? 1 : -1)
        });
      } else {
        // Others spread out foraging
        ants.push({
          type: 'worker', 
          symbol: 'W',
          x: Math.floor(Math.random() * (this.mapWidth - 4)) + 2,
          y: Math.floor(Math.random() * (this.mapHeight - 4)) + 2
        });
      }
    }

    // Scouts at edges and exploring
    for (let i = 0; i < roles.scouts; i++) {
      ants.push({
        type: 'scout',
        symbol: 'S',
        x: Math.floor(Math.random() * (this.mapWidth - 6)) + 3,
        y: i % 2 === 0 ? 2 : this.mapHeight - 3
      });
    }

    // Soldiers near nest for defense
    for (let i = 0; i < roles.soldiers; i++) {
      ants.push({
        type: 'soldier',
        symbol: 'D',
        x: this.nestPosition.x + (i % 2 === 0 ? 2 : -2),
        y: this.nestPosition.y
      });
    }

    return ants;
  }

  renderColonyView(state) {
    const map = this.createEnvironmentMap(state);
    const ants = this.distributeAnts(state);
    
    // Place ants on map
    for (const ant of ants) {
      if (ant.x >= 0 && ant.x < this.mapWidth && ant.y >= 0 && ant.y < this.mapHeight) {
        if (map[ant.y][ant.x] === '.' || map[ant.y][ant.x] === '▪') {
          map[ant.y][ant.x] = ant.symbol;
        }
      }
    }

    // Convert map to string
    let output = '\n';
    output += '┌─ COLONY VIEW ─────────────────────────────────────────────┐\n';
    for (let y = 0; y < this.mapHeight; y++) {
      output += '│ ';
      for (let x = 0; x < this.mapWidth; x++) {
        output += map[y][x];
      }
      output += ' │\n';
    }
    output += '└───────────────────────────────────────────────────────────┘\n';
    
    // Add legend
    output += '\n🐜 LEGEND: W=Worker  S=Scout  D=Soldier  🏠=Nest  🫐🪵🌸=Food\n';
    output += '         🪨=Rock  🌱=Grass  ❄=Winter  🦅=Predator Warning\n';

    return output;
  }

  renderStatusPanel(state) {
    let panel = '\n';
    panel += '┌─ COLONY STATUS ───────────────────────────────────────────┐\n';
    panel += `│ Turn: ${state.turn.toString().padEnd(3)} │ Food: ${state.food.toString().padEnd(3)} │ Population: ${state.population.total.toString().padEnd(3)} │ Morale: ${state.morale}/10 │\n`;
    panel += '├───────────────────────────────────────────────────────────┤\n';
    panel += `│ Workers: ${state.population.workers.toString().padEnd(2)} │ Scouts: ${state.population.scouts.toString().padEnd(2)} │ Soldiers: ${state.population.soldiers.toString().padEnd(2)} │ Locations: ${(state.locations ? state.locations.length : 1).toString().padEnd(2)} │\n`;
    panel += '└───────────────────────────────────────────────────────────┘\n';

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
    
    return output;
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
    
    // Colony view
    output += this.renderColonyView(state);
    
    // Action results if any
    if (lastResults) {
      output += this.renderActionResults(lastResults, aiMode);
    }
    
    return output;
  }

  animateAntMovement(fromState, toState, action) {
    // Simple animation showing ant movement based on action
    console.log(`\n🐜 ${action.toUpperCase()} - Ants are moving...`);
    
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
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
}

module.exports = VisualRenderer;