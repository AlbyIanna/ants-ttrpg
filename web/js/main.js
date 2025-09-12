/**
 * Main Application Controller for Ant Colony TTRPG Browser Edition
 * Version: v0.4 - Complete browser implementation
 */

class AntColonyApp {
  constructor() {
    // Core components
    this.simulation = null;
    this.renderer = null;
    
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
  }

  /**
   * Initialize the application
   */
  async init() {
    Utils.addActivity('🔧 Initializing ant colony simulation...', 'info');
    Utils.setLoading(true, 10);
    
    try {
      // Initialize core systems
      await this.initializeSystems();
      Utils.setLoading(true, 30);
      
      // Set up UI controls
      this.setupUIControls();
      Utils.setLoading(true, 50);
      
      // Set up event handlers
      this.setupEventHandlers();
      Utils.setLoading(true, 70);
      
      // Load saved settings
      this.loadSettings();
      Utils.setLoading(true, 90);
      
      // Final setup
      this.isInitialized = true;
      Utils.setLoading(true, 100);
      
      // Hide loading overlay
      setTimeout(() => {
        Utils.setLoading(false);
        Utils.addActivity('✅ Application initialized successfully!', 'info');
        
        // Auto-start if enabled
        if (this.settings.autoStart) {
          setTimeout(() => this.startSimulation(), 1000);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to initialize application:', error);
      Utils.addActivity('❌ Failed to initialize application', 'warning');
      Utils.setLoading(false);
    }
  }

  /**
   * Initialize core systems
   */
  async initializeSystems() {
    // Create simulation engine
    this.simulation = new WebSimulation();
    
    // Set up simulation callbacks
    this.simulation.onStateUpdate = (state, stats) => {
      this.handleStateUpdate(state, stats);
    };
    
    this.simulation.onDiscovery = (discoveries) => {
      this.handleDiscoveries(discoveries);
    };
    
    this.simulation.onEnvironmentChange = (change) => {
      this.handleEnvironmentChange(change);
    };
    
    // Create renderer
    this.renderer = new WebRenderer();
    
    // Wait for renderer to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Set up UI controls
   */
  setupUIControls() {
    // Get control elements
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.speedSlider = document.getElementById('speedSlider');
    this.speedValue = document.getElementById('speedValue');
    
    // Initialize button states
    this.updatePlayPauseButton(false, false);
    this.updateSpeedDisplay(1);
    
    console.log('✅ UI controls initialized');
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Simulation controls
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => this.toggleSimulation());
    }
    
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetSimulation());
    }
    
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        this.setSimulationSpeed(speed);
      });
    }
    
    // Keyboard shortcuts
    Utils.events.on('keydown:space', () => this.toggleSimulation());
    Utils.events.on('keydown:reset', () => this.resetSimulation());
    Utils.events.on('keydown:escape', () => Utils.hideModal());
    
    // Modal close handler
    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', () => Utils.hideModal());
    }
    
    // Modal background click to close
    const modal = document.getElementById('antModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          Utils.hideModal();
        }
      });
    }
    
    // Settings checkboxes
    const settingsElements = {
      showTrails: document.getElementById('showTrails'),
      showBehaviorStates: document.getElementById('showBehaviorStates'),
      showEnvironmentDetails: document.getElementById('showEnvironmentDetails')
    };
    
    Object.entries(settingsElements).forEach(([setting, element]) => {
      if (element) {
        element.addEventListener('change', (e) => {
          this.settings[setting] = e.target.checked;
          this.saveSettings();
          this.renderer?.setDisplayOptions(this.settings);
        });
      }
    });
    
    console.log('✅ Event handlers set up');
  }

  /**
   * Start or resume simulation
   */
  startSimulation() {
    if (!this.isInitialized) {
      Utils.addActivity('⚠️ Application not yet initialized', 'warning');
      return;
    }
    
    if (!this.simulation.isRunning) {
      // Start new simulation
      const success = this.simulation.start('forest_floor');
      if (success) {
        this.isSimulationRunning = true;
        Utils.addActivity('🚀 Simulation started!', 'info');
      }
    } else if (this.simulation.isPaused) {
      // Resume paused simulation
      this.simulation.togglePause();
      Utils.addActivity('▶️ Simulation resumed', 'info');
    }
    
    this.updatePlayPauseButton(this.simulation.isRunning, this.simulation.isPaused);
  }

  /**
   * Pause simulation
   */
  pauseSimulation() {
    if (this.simulation && this.simulation.isRunning && !this.simulation.isPaused) {
      this.simulation.togglePause();
      Utils.addActivity('⏸️ Simulation paused', 'info');
      this.updatePlayPauseButton(this.simulation.isRunning, this.simulation.isPaused);
    }
  }

  /**
   * Toggle simulation play/pause
   */
  toggleSimulation() {
    if (!this.simulation) return;
    
    if (!this.simulation.isRunning) {
      this.startSimulation();
    } else {
      if (this.simulation.isPaused) {
        this.startSimulation(); // Resume
      } else {
        this.pauseSimulation();
      }
    }
  }

  /**
   * Reset simulation
   */
  resetSimulation() {
    if (this.simulation) {
      this.simulation.reset();
      this.isSimulationRunning = false;
      this.updatePlayPauseButton(false, false);
      
      // Clear the display
      if (this.renderer) {
        this.renderer.forceRerender();
      }
      
      Utils.addActivity('🔄 Simulation reset', 'info');
    }
  }

  /**
   * Set simulation speed
   */
  setSimulationSpeed(speed) {
    if (this.simulation) {
      this.simulation.setSpeed(speed);
      this.updateSpeedDisplay(speed);
      Utils.addActivity(`⚡ Speed set to ${speed}x`, 'info');
    }
  }

  /**
   * Handle simulation state updates
   */
  handleStateUpdate(state, stats) {
    if (this.renderer) {
      // Add simulation stats to the stats object
      const enhancedStats = {
        ...stats,
        isRunning: this.simulation?.isRunning || false,
        isPaused: this.simulation?.isPaused || false,
        fps: this.simulation?.getPerformanceStats()?.fps || 0,
        updatesPerSecond: this.simulation?.getPerformanceStats()?.updatesPerSecond || 0
      };
      
      this.renderer.render(state, enhancedStats);
    }
  }

  /**
   * Handle discoveries
   */
  handleDiscoveries(discoveries) {
    // Discoveries are handled by the renderer in handleStateUpdate
    // This is for any additional processing
    console.log('Discoveries:', discoveries);
  }

  /**
   * Handle environment changes
   */
  handleEnvironmentChange(change) {
    let message = '';
    
    switch (change.type) {
      case 'season_change':
        message = `🍂 Season changed to ${change.season}!`;
        break;
      default:
        message = `🌍 Environment change: ${change.type}`;
    }
    
    if (message) {
      Utils.addActivity(message, 'info');
    }
  }

  /**
   * Update play/pause button
   */
  updatePlayPauseButton(isRunning, isPaused) {
    if (!this.playPauseBtn) return;
    
    if (!isRunning) {
      this.playPauseBtn.textContent = '▶️ Start';
      this.playPauseBtn.classList.add('primary');
    } else if (isPaused) {
      this.playPauseBtn.textContent = '▶️ Resume';
      this.playPauseBtn.classList.add('primary');
    } else {
      this.playPauseBtn.textContent = '⏸️ Pause';
      this.playPauseBtn.classList.remove('primary');
    }
  }

  /**
   * Update speed display
   */
  updateSpeedDisplay(speed) {
    if (this.speedValue) {
      this.speedValue.textContent = `${speed}x`;
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const savedSettings = Utils.storage.get('antColonySettings', {});
    this.settings = { ...this.settings, ...savedSettings };
    
    // Apply settings to UI
    Object.entries(this.settings).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element && element.type === 'checkbox') {
        element.checked = value;
      }
    });
    
    // Apply to renderer
    if (this.renderer) {
      this.renderer.setDisplayOptions(this.settings);
    }
    
    console.log('✅ Settings loaded:', this.settings);
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    Utils.storage.set('antColonySettings', this.settings);
  }

  /**
   * Get application status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isSimulationRunning: this.isSimulationRunning,
      simulationState: this.simulation?.getState(),
      performanceStats: this.simulation?.getPerformanceStats(),
      rendererStats: this.renderer?.getStats(),
      settings: this.settings
    };
  }

  /**
   * Enable debug mode
   */
  enableDebugMode() {
    window.app = this;
    window.simulation = this.simulation;
    window.renderer = this.renderer;
    console.log('🐛 Debug mode enabled. Access via window.app, window.simulation, window.renderer');
  }
}

// Global error handling
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  Utils.addActivity(`❌ Error: ${e.message}`, 'warning');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  Utils.addActivity(`❌ Promise rejection: ${e.reason}`, 'warning');
});

// Initialize app when script loads
const app = new AntColonyApp();

// Enable debug mode in development
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  app.enableDebugMode();
}

// Export for debugging
window.AntColonyApp = app;