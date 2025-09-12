/**
 * Live Session Runner for Ant Colony TTRPG
 * Version: v0.5 - Real-time autonomous ant colony with player interaction
 */

const LiveSimulationEngine = require('./live-simulation-engine');
const VisualRenderer = require('./visual-renderer');
const readline = require('readline');

class LiveSessionRunner {
  constructor(options = {}) {
    this.engine = new LiveSimulationEngine();
    this.renderer = new VisualRenderer();
    
    // Display options
    this.fullDisplay = options.fullDisplay !== false; // Default to full display
    this.refreshRate = options.refreshRate || 1000; // Display refresh rate in ms
    this.minimalMode = options.minimalMode || false;
    
    // Control state
    this.isRunning = false;
    this.shouldExit = false;
    this.displayInterval = null;
    
    // Setup keyboard input
    this.rl = null;
    this.setupKeyboardInput();
    
    // Bind engine callbacks
    this.setupEngineCallbacks();
  }

  /**
   * Setup keyboard input for real-time controls
   */
  setupKeyboardInput() {
    // Enable raw mode for immediate key detection
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    // Handle key presses
    process.stdin.on('data', (key) => {
      this.handleKeyPress(key);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      this.stopSession();
    });
  }

  /**
   * Handle keyboard input
   */
  handleKeyPress(key) {
    const keyStr = key.toString();
    
    switch (keyStr) {
      case ' ': // Space bar - pause/resume
        this.engine.pauseSimulation();
        break;
        
      case '+':
      case '=': // Increase speed
        const currentSpeed = this.engine.simulationSpeed;
        this.engine.setSimulationSpeed(Math.min(5, currentSpeed + 0.5));
        break;
        
      case '-':
      case '_': // Decrease speed
        const currentSpeed2 = this.engine.simulationSpeed;
        this.engine.setSimulationSpeed(Math.max(0.1, currentSpeed2 - 0.5));
        break;
        
      case 'r':
      case 'R': // Reset simulation
        this.resetSimulation();
        break;
        
      case 'm':
      case 'M': // Toggle minimal mode
        this.minimalMode = !this.minimalMode;
        console.log(this.minimalMode ? '📱 Minimal mode enabled' : '🖥️  Full display mode enabled');
        break;
        
      case 'f':
      case 'F': // Toggle full display
        this.fullDisplay = !this.fullDisplay;
        break;
        
      case 'h':
      case 'H': // Show help
        this.showHelp();
        break;
        
      case 'q':
      case 'Q':
      case '\u0003': // Ctrl+C
        this.stopSession();
        break;
        
      case 's':
      case 'S': // Show statistics
        this.showStatistics();
        break;
        
      default:
        // Ignore other keys
        break;
    }
  }

  /**
   * Setup engine event callbacks
   */
  setupEngineCallbacks() {
    // State update callback - handled by display refresh
    this.engine.onStateUpdate = null; // We'll poll instead
    
    // Ant action callback - log interesting actions
    this.engine.onAntAction = (actions) => {
      for (const action of actions) {
        if (action.action === 'food_delivery') {
          console.log(`\n🍯 Ant ${action.antId} delivered ${action.amount} food!`);
        }
      }
    };
    
    // Discovery callback - announce discoveries
    this.engine.onDiscovery = (discoveries) => {
      for (const discovery of discoveries) {
        if (discovery.type === 'food_source') {
          console.log(`\n🔍 Ant ${discovery.antId} discovered ${discovery.foodType}!`);
        }
      }
    };
    
    // Environment change callback
    this.engine.onEnvironmentChange = (change) => {
      if (change.type === 'season_change') {
        console.log(`\n🍂 Season changed to ${change.season}!`);
      }
    };
  }

  /**
   * Start the live session
   */
  startSession(biome = null) {
    if (this.isRunning) {
      console.log('⚠️  Session already running');
      return false;
    }

    console.log('🚀 Starting Live Ant Colony Simulation...');
    console.log('⌨️  Press H for help, SPACE to pause/resume, Q to quit\n');
    
    // Start the simulation engine
    const success = this.engine.startLiveSimulation(biome);
    if (!success) {
      console.log('❌ Failed to start simulation');
      return false;
    }
    
    this.isRunning = true;
    
    // Start display refresh loop
    this.startDisplayLoop();
    
    return true;
  }

  /**
   * Start the display refresh loop
   */
  startDisplayLoop() {
    this.displayInterval = setInterval(() => {
      if (!this.shouldExit && this.engine.isRunning) {
        this.refreshDisplay();
      }
    }, this.refreshRate);
    
    // Initial display
    this.refreshDisplay();
  }

  /**
   * Refresh the display
   */
  refreshDisplay() {
    if (!this.engine.state) return;
    
    const stats = this.engine.getSimulationStats();
    
    try {
      if (this.minimalMode) {
        // Minimal mode - use status line for in-place updates
        const statusText = this.renderer.renderMinimalLiveView(this.engine.state, stats);
        this.renderer.displayEngine.renderStatusLine(statusText);
      } else if (this.fullDisplay) {
        // Full display mode - use display engine for proper in-place rendering
        const output = this.renderer.renderLiveView(this.engine.state, stats);
        this.renderer.displayEngine.render(output);
      }
    } catch (error) {
      console.error('Display error:', error.message);
    }
  }

  /**
   * Reset the simulation
   */
  resetSimulation() {
    console.log('🔄 Resetting simulation...');
    
    // Stop current simulation
    this.engine.stopSimulation();
    
    // Start new simulation
    setTimeout(() => {
      this.engine.startLiveSimulation();
      console.log('✅ Simulation reset complete');
    }, 500);
  }

  /**
   * Show help information
   */
  showHelp() {
    const helpText = `
╔═══════════════════════════════════════════════════════════╗
║                    LIVE SIMULATION HELP                   ║
╠═══════════════════════════════════════════════════════════╣
║ SPACE     - Pause/Resume simulation                       ║
║ +/=       - Increase simulation speed                     ║
║ -/_       - Decrease simulation speed                     ║
║ R         - Reset simulation                              ║
║ M         - Toggle minimal/full display mode              ║
║ F         - Toggle full display on/off                    ║
║ S         - Show detailed statistics                      ║
║ H         - Show this help                                ║
║ Q         - Quit simulation                               ║
╠═══════════════════════════════════════════════════════════╣
║ Watch your ant colony live in action! Ants will          ║
║ autonomously forage, explore, and build their nest.      ║
║ You can observe and control the simulation parameters.    ║
╚═══════════════════════════════════════════════════════════╝
`;
    console.log(helpText);
  }

  /**
   * Show detailed statistics
   */
  showStatistics() {
    const stats = this.engine.getSimulationStats();
    const state = this.engine.state;
    
    if (!state) {
      console.log('❌ No simulation data available');
      return;
    }

    const statsText = `
╔═══════════════════════════════════════════════════════════╗
║                   SIMULATION STATISTICS                   ║
╠═══════════════════════════════════════════════════════════╣
║ Runtime: ${Math.floor(stats.elapsedTime / 60)}m ${Math.floor(stats.elapsedTime % 60)}s                                   ║
║ Frames: ${stats.frameCount}                                          ║
║ Speed: ${stats.speed}x                                         ║
║ Status: ${stats.isRunning ? 'RUNNING' : 'STOPPED'}                                       ║
╠═══════════════════════════════════════════════════════════╣
║ Colony Food: ${Math.floor(state.food)}                                    ║
║ Colony Morale: ${state.morale.toFixed(1)}/10                              ║
║ Total Ants: ${stats.colony.totalAnts}                                     ║
║ Food Discovered: ${stats.colony.discoveredFood}                               ║
╠═══════════════════════════════════════════════════════════╣
║ Workers: ${state.population.workers} | Scouts: ${state.population.scouts} | Soldiers: ${state.population.soldiers}        ║
║ Season: ${state.narrative_context?.current_season || 'spring'}                                      ║
║ Environment: ${state.biome}                                ║
╠═══════════════════════════════════════════════════════════╣
║ FPS: ${stats.performance.updatesPerSecond || 0}                                            ║
║ Avg Update Time: ${(stats.performance.averageUpdateTime || 0).toFixed(1)}ms                   ║
╚═══════════════════════════════════════════════════════════╝
`;
    console.log(statsText);
  }

  /**
   * Stop the session
   */
  stopSession() {
    if (!this.isRunning) return;
    
    // Clean up display engine first
    this.renderer.displayEngine.cleanup();
    
    console.log('\n🛑 Stopping live simulation...');
    
    this.shouldExit = true;
    this.isRunning = false;
    
    // Stop display refresh
    if (this.displayInterval) {
      clearInterval(this.displayInterval);
      this.displayInterval = null;
    }
    
    // Stop simulation engine
    this.engine.stopSimulation();
    
    // Show final statistics
    const stats = this.engine.getSimulationStats();
    console.log(`\n📊 Final Results:`);
    console.log(`   Runtime: ${Math.floor(stats.elapsedTime / 60)}m ${Math.floor(stats.elapsedTime % 60)}s`);
    console.log(`   Food Collected: ${stats.colony.discoveredFood || 0}`);
    console.log(`   Final Population: ${stats.colony.totalAnts}`);
    console.log(`   Final Morale: ${stats.colony.morale.toFixed(1)}/10`);
    
    console.log('\n✅ Live simulation ended. Thanks for watching!');
    
    // Restore terminal
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    // Exit process
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

module.exports = LiveSessionRunner;