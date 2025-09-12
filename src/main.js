/**
 * Main Application Controller for Ant Colony TTRPG Browser Edition
 * Version: v0.5 - ES6 Module Version with Vite HMR support
 */

import { Utils } from './components/utils.js';
import { WebSimulation } from './components/web-simulation.js';
import { PixelRenderer } from './components/pixel-renderer.js';
import { MenuManager } from './components/menu-manager.js';
import { TimeScaleManager } from './components/time-scale-manager.js';
import { RuntimeConfigPanel } from './components/runtime-config-panel.js';
import './styles/styles.css';

class AntColonyApp {
  constructor() {
    // Core components
    this.simulation = null;
    this.renderer = null;
    this.menuManager = null;
    this.timeScaleManager = null;
    this.runtimeConfigPanel = null;
    
    // App state
    this.isInitialized = false;
    this.isSimulationRunning = false;
    
    // UI elements
    this.playPauseBtn = null;
    this.resetBtn = null;
    this.speedSlider = null;
    this.speedValue = null;
    
    // Settings
    this.settings = {
      showTrails: true,
      showBehaviorStates: true,
      showEnvironmentDetails: true,
      autoStart: false
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }

    // Vite HMR support
    if (import.meta.hot) {
      import.meta.hot.accept('./components/pixel-renderer.js', (newModule) => {
        console.log('🔄 Hot reloading pixel renderer...');
        this.renderer = new newModule.PixelRenderer();
        this.setupRendererCallbacks();
        if (this.simulation && this.simulation.state) {
          this.renderer.render(this.simulation.state, this.simulation.getSimulationStats());
        }
      });

      import.meta.hot.accept('./components/web-simulation.js', (newModule) => {
        console.log('🔄 Hot reloading simulation engine...');
        const wasRunning = this.isSimulationRunning;
        if (this.simulation) {
          this.simulation.stop();
        }
        this.simulation = new newModule.WebSimulation();
        this.setupSimulationCallbacks();
        if (wasRunning) {
          this.startSimulation();
        }
      });
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    Utils.addActivity('🔧 Initializing ant colony application...', 'info');
    Utils.setLoading(true, 50);
    
    try {
      // Create menu manager first - this will show the menu
      this.menuManager = new MenuManager(this);
      Utils.setLoading(true, 100);
      
      // Complete initialization
      Utils.setLoading(false);
      Utils.addActivity('✅ Ant colony application ready!', 'success');
      
      console.log('🐜 Ant Colony TTRPG Application initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      Utils.addActivity('❌ Initialization failed: ' + error.message, 'error');
      Utils.setLoading(false);
    }
  }

  /**
   * Initialize core simulation systems
   */
  async initializeSystems() {
    // Create time scale manager first
    this.timeScaleManager = new TimeScaleManager();
    
    // Create simulation engine
    this.simulation = new WebSimulation();
    this.setupSimulationCallbacks();
    
    // Pass time manager to simulation
    if (this.simulation.setTimeScaleManager) {
      this.simulation.setTimeScaleManager(this.timeScaleManager);
    }
    
    // Create renderer
    this.renderer = new PixelRenderer();
    this.setupRendererCallbacks();
    
    // Create runtime configuration panel
    this.runtimeConfigPanel = new RuntimeConfigPanel(this);
    
    // Wait for renderer to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Set up simulation event callbacks
   */
  setupSimulationCallbacks() {
    // State updates
    this.simulation.onStateUpdate = (state, stats) => {
      this.handleStateUpdate(state, stats);
    };
    
    // Ant actions
    this.simulation.onAntAction = (action) => {
      this.handleAntAction(action);
    };
    
    // Discoveries
    this.simulation.onDiscovery = (discovery) => {
      this.handleDiscovery(discovery);
    };
    
    // Environment changes
    this.simulation.onEnvironmentChange = (change) => {
      this.handleEnvironmentChange(change);
    };
  }

  /**
   * Set up renderer callbacks
   */
  setupRendererCallbacks() {
    // Currently no specific renderer callbacks needed
    // Could add viewport change, zoom events, etc. here
  }

  /**
   * Set up UI control event handlers
   */
  setupUIControls() {
    // Get UI elements
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    
    // Play/Pause button
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.toggleSimulation();
      });
    }
    
    // Reset button
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        this.resetSimulation();
      });
    }
    
    // Speed slider
    if (this.speedSlider && this.speedValue) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.setSimulationSpeed(speed);
        this.speedValue.textContent = `${speed}x`;
      });
    }
    
    // View control checkboxes
    const showTrails = document.getElementById('showTrails');
    const showBehaviorStates = document.getElementById('showBehaviorStates');
    const showEnvironmentDetails = document.getElementById('showEnvironmentDetails');
    
    if (showTrails) {
      showTrails.addEventListener('change', (e) => {
        this.settings.showTrails = e.target.checked;
        this.updateRendererSettings();
      });
    }
    
    if (showBehaviorStates) {
      showBehaviorStates.addEventListener('change', (e) => {
        this.settings.showBehaviorStates = e.target.checked;
        this.updateRendererSettings();
      });
    }
    
    if (showEnvironmentDetails) {
      showEnvironmentDetails.addEventListener('change', (e) => {
        this.settings.showEnvironmentDetails = e.target.checked;
        this.updateRendererSettings();
      });
    }
    
    // Modal close handlers
    const modal = document.getElementById('antModal');
    if (modal) {
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modal.classList.add('hidden');
        });
      }
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.toggleSimulation();
          break;
        
        case 'KeyR':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.resetSimulation();
          }
          break;
        
        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault();
          this.adjustSpeed(-0.5);
          break;
        
        case 'Equal':
        case 'NumpadAdd':
          e.preventDefault();
          this.adjustSpeed(0.5);
          break;
      }
    });
  }

  /**
   * Initialize the ant colony
   */
  async initializeColony(biome = 'forest_floor', config = {}) {
    if (!this.simulation) return;
    
    Utils.addActivity('🏗️ Generating environment and colony...', 'info');
    
    const state = await this.simulation.initializeColony(biome, config);
    
    if (this.renderer && state) {
      this.renderer.render(state, this.simulation.getSimulationStats());
    }
    
    Utils.addActivity(`🌍 ${biome.replace('_', ' ').toUpperCase()} biome generated`, 'success');
    Utils.addActivity(`🐜 Colony established with ${state.population?.total || config.startingPopulation || 12} ants`, 'success');
    
    return state;
  }

  /**
   * Toggle simulation play/pause
   */
  toggleSimulation() {
    if (!this.simulation || !this.isInitialized) return;
    
    if (this.isSimulationRunning) {
      this.simulation.pause();
      this.isSimulationRunning = !this.simulation.isPaused;
      
      if (this.playPauseBtn) {
        this.playPauseBtn.innerHTML = this.simulation.isPaused ? '▶️ Resume' : '⏸️ Pause';
      }
    } else {
      this.startSimulation();
    }
  }

  /**
   * Start the simulation
   */
  startSimulation() {
    if (!this.simulation || !this.isInitialized) return;
    
    this.simulation.start();
    this.isSimulationRunning = true;
    
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = '⏸️ Pause';
      this.playPauseBtn.classList.remove('primary');
    }
    
    Utils.addActivity('▶️ Simulation started', 'info');
  }

  /**
   * Reset the simulation
   */
  async resetSimulation() {
    if (!this.simulation) return;
    
    // Stop current simulation
    this.simulation.stop();
    this.isSimulationRunning = false;
    
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = '▶️ Start';
      this.playPauseBtn.classList.add('primary');
    }
    
    // Reset time scale manager
    if (this.timeScaleManager) {
      this.timeScaleManager.reset();
    }
    
    // Reinitialize colony
    await this.initializeColony();
    
    Utils.addActivity('🔄 Colony reset', 'info');
  }

  /**
   * Set simulation speed
   */
  setSimulationSpeed(speed) {
    if (this.simulation) {
      this.simulation.setSpeed(speed);
    }
  }

  /**
   * Adjust simulation speed by delta
   */
  adjustSpeed(delta) {
    if (this.speedSlider && this.speedValue) {
      const currentSpeed = parseFloat(this.speedSlider.value);
      const newSpeed = Utils.clamp(currentSpeed + delta, 0.5, 5.0);
      
      this.speedSlider.value = newSpeed;
      this.speedValue.textContent = `${newSpeed}x`;
      this.setSimulationSpeed(newSpeed);
    }
  }

  /**
   * Update renderer settings
   */
  updateRendererSettings() {
    if (this.renderer) {
      this.renderer.setDisplayOptions(this.settings);
    }
  }

  /**
   * Handle simulation state updates
   */
  handleStateUpdate(state, stats) {
    // Update time scale manager
    if (this.timeScaleManager && this.isSimulationRunning) {
      const timeInfo = this.timeScaleManager.update();
      
      // Pass time info to stats for display
      if (stats) {
        stats.timeInfo = timeInfo;
      }
    }
    
    if (this.renderer) {
      this.renderer.render(state, stats);
    }
  }

  /**
   * Handle ant actions
   */
  handleAntAction(action) {
    // Could add specific ant action handling here
    // For now, just log interesting actions
    if (action.type === 'food_collected') {
      Utils.addActivity(`🍯 Ant #${action.antId} collected food`, 'success');
    }
  }

  /**
   * Handle discoveries
   */
  handleDiscovery(discovery) {
    let message = '';
    
    switch (discovery.type) {
      case 'food_discovered':
        message = `🔍 Ant #${discovery.ant.id} discovered ${discovery.food.type}!`;
        break;
      case 'hazard_detected':
        message = `⚠️ Ant #${discovery.ant.id} detected a hazard`;
        break;
      default:
        message = `✨ Discovery: ${discovery.type}`;
    }
    
    Utils.addActivity(message, 'discovery');
  }

  /**
   * Handle environment changes
   */
  handleEnvironmentChange(change) {
    let message = '';
    
    switch (change.type) {
      case 'season_change':
        message = `🍂 Season changed to ${change.season}`;
        break;
      case 'weather_change':
        message = `🌤️ Weather changed to ${change.weather}`;
        break;
      default:
        message = `🌍 Environment: ${change.type}`;
    }
    
    Utils.addActivity(message, 'environment');
  }
}

// Initialize application
const app = new AntColonyApp();

// Export for debugging purposes
window.AntColonyApp = app;

// Vite HMR cleanup
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app.simulation) {
      app.simulation.stop();
    }
  });
}