/**
 * Main Application Controller for Ant Colony TTRPG Browser Edition
 * Version: v0.5 - ES6 Module Version with Vite HMR support
 */

import { Utils } from './components/utils.js';
import { WebSimulation } from './components/web-simulation.js';
import { SimpleRenderer } from './components/simple-renderer.js';
import { MenuManager } from './components/menu-manager.js';
import { GameMasterScreen } from './components/game-master.js';
import { PALETTE, STATE_COLORS } from './components/pixel-art.js';
import './styles/styles.css';

class AntColonyApp {
  constructor() {
    // Core components
    this.simulation = null;
    this.renderer = null;
    this.menuManager = null;
    
    // App state
    this.isInitialized = false;
    this.isSimulationRunning = false;
    
    // UI elements
    this.playPauseBtn = null;
    this.resetBtn = null;
    this.speedGroup = null;
    this.pausedBadge = null;
    this.gameMaster = null;
    this.speed = 1.0;

    // Settings (mirrors the HUD's Layers chips)
    this.settings = {
      showTrails: true,
      showBehaviorStates: false,
      showEnvironmentDetails: true,
      showTerritory: false,
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
      import.meta.hot.accept('./components/simple-renderer.js', (newModule) => {
        console.log('🔄 Hot reloading simple renderer...');
        this.renderer = new newModule.SimpleRenderer();
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
    // Create simulation engine
    this.simulation = new WebSimulation();
    this.setupSimulationCallbacks();
    
    // Create simple, high-performance renderer
    console.log("🎨 Initializing SimpleRenderer...");
    this.renderer = new SimpleRenderer();
    console.log("✅ SimpleRenderer initialized successfully");
    
    // Wait for renderer to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load user preferences from previous session
    this.loadUserPreferences();
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
    this.speedGroup = document.getElementById('speedGroup');
    this.pausedBadge = document.getElementById('pausedBadge');

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

    // Speed: one pressed button in a segmented group
    if (this.speedGroup) {
      this.speedGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-speed]');
        if (!btn) return;
        this.setSimulationSpeed(parseFloat(btn.dataset.speed));
      });
    }
    this.updateSpeedButtons();

    // Layers chips -> renderer display options
    const layers = {
      layerTerrain: 'showEnvironmentDetails',
      layerTrails: 'showTrails',
      layerStates: 'showBehaviorStates',
      layerTerritory: 'showTerritory'
    };
    Object.entries(layers).forEach(([id, setting]) => {
      const box = document.getElementById(id);
      if (!box) return;
      box.checked = !!this.settings[setting];
      box.addEventListener('change', () => {
        this.settings[setting] = box.checked;
        this.updateRendererSettings();
        this.renderLegend();
        this.redraw();
      });
    });
    this.renderLegend();

    // Map view buttons
    document.getElementById('zoomInBtn')?.addEventListener('click', () => { this.renderer?.zoomBy(1.25); this.redraw(); });
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => { this.renderer?.zoomBy(0.8); this.redraw(); });
    document.getElementById('resetViewBtn')?.addEventListener('click', () => { this.renderer?.resetView(); this.redraw(); });

    // GameMaster: the turn-based TTRPG screen on top of the live colony
    this.gameMaster = new GameMasterScreen({
      getWorldConfig: () => this.menuManager?.getCurrentWorldConfig(),
      onBack: () => this.redraw()
    });
    document.getElementById('openGameMasterBtn')?.addEventListener('click', () => this.gameMaster.open());

    // Intervene: drop a few new food sources onto the map
    document.getElementById('spawnFoodBtn')?.addEventListener('click', () => {
      const env = this.simulation?.state?.environment;
      if (!env || typeof this.simulation.addFoodSources !== 'function') return;
      this.simulation.addFoodSources(env, 3);
      Utils.addActivity('Three new food sources appeared on the map.', 'warning');
      this.redraw();
    });

    
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
      // Map shortcuts belong to the live colony, not the GameMaster screen
      if (this.gameMaster?.isOpen()) return;
      
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
      this.setPlayButton(!this.simulation.isPaused, this.simulation.isPaused);
    } else {
      this.startSimulation();
    }
  }

  /**
   * Swap the play/pause icon and label, and show the paused badge on the map
   */
  setPlayButton(running, paused = false) {
    if (this.playPauseBtn) {
      const icon = running ? 'i-pause' : 'i-play';
      const label = running ? 'Pause simulation' : (paused ? 'Resume simulation' : 'Start simulation');
      this.playPauseBtn.innerHTML = `<svg aria-hidden="true"><use href="#${icon}"/></svg>`;
      this.playPauseBtn.setAttribute('aria-label', label);
      this.playPauseBtn.title = `${label} (Space)`;
    }
    if (this.pausedBadge) {
      this.pausedBadge.classList.toggle('hidden', !paused);
    }
  }

  /**
   * Start the simulation
   */
  startSimulation() {
    if (!this.simulation || !this.isInitialized) return;
    
    this.simulation.start();
    this.isSimulationRunning = true;
    
    this.setPlayButton(true);

    Utils.addActivity('Simulation started.', 'info');
  }

  /**
   * Reset the simulation
   */
  async resetSimulation() {
    if (!this.simulation) return;
    
    // Stop current simulation
    this.simulation.stop();
    this.isSimulationRunning = false;
    
    this.setPlayButton(false);

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
    this.speed = Utils.clamp(speed, 0.5, 20.0);
    if (this.simulation) {
      this.simulation.setSpeed(this.speed);
    }
    this.updateSpeedButtons();

    // Save speed preference
    this.saveUserPreferences();
  }

  /**
   * Step to the next slower/faster speed preset (- and = keys)
   */
  adjustSpeed(delta) {
    const steps = [0.5, 1, 2, 5, 10, 20];
    const current = steps.findIndex((s) => s >= (this.speed || 1));
    const index = Utils.clamp((current === -1 ? steps.length - 1 : current) + Math.sign(delta), 0, steps.length - 1);
    this.setSimulationSpeed(steps[index]);
  }

  /**
   * Mark the active speed in the segmented control
   */
  updateSpeedButtons() {
    this.speedGroup?.querySelectorAll('button[data-speed]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(parseFloat(btn.dataset.speed) === (this.speed || 1)));
    });
  }

  /**
   * Force a full redraw of the current state (after layer, zoom or map changes)
   */
  redraw() {
    if (this.renderer && this.simulation?.state) {
      this.renderer.needsFullRedraw = true;
      this.renderer.render(this.simulation.state, this.simulation.getSimulationStats());
    }
  }

  /**
   * Map legend: role colours, or behaviour-state colours when that layer is on
   */
  renderLegend() {
    const legend = document.getElementById('mapLegend');
    if (!legend) return;
    const items = this.settings.showBehaviorStates
      ? [['Foraging', STATE_COLORS.foraging], ['Exploring', STATE_COLORS.exploring], ['Returning', STATE_COLORS.returning], ['Resting', STATE_COLORS.resting]]
      : [['Worker', PALETTE.worker], ['Scout', PALETTE.scout], ['Soldier', PALETTE.soldier]];
    items.push(['Rival ant', PALETTE.rival], ['Food', PALETTE.amber]);
    legend.replaceChildren(...items.map(([name, color]) => {
      const li = document.createElement('li');
      li.className = 'legend-item';
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.setProperty('--c', color);
      li.append(sw, name);
      return li;
    }));
  }

  /**
   * Update renderer settings
   */
  updateRendererSettings() {
    if (this.renderer) {
      this.renderer.setDisplayOptions(this.settings);
    }
    
    // Save display preferences
    this.saveUserPreferences();
  }

  /**
   * Save user preferences to localStorage
   */
  saveUserPreferences() {
    const preferences = {
      speed: this.speed || 1.0,
      showTrails: this.settings.showTrails,
      showBehaviorStates: this.settings.showBehaviorStates,
      showEnvironmentDetails: this.settings.showEnvironmentDetails,
      showTerritory: this.settings.showTerritory,
      lastSaved: Date.now()
    };
    
    Utils.storage.set('userPreferences', preferences);
  }

  /**
   * Load user preferences from localStorage
   */
  loadUserPreferences() {
    const preferences = Utils.storage.get('userPreferences', {});
    
    // Restore speed setting
    if (preferences.speed) {
      this.speed = preferences.speed;
      if (this.simulation) {
        this.simulation.setSpeed(preferences.speed);
      }
      this.updateSpeedButtons();
    }

    if (preferences.showTerritory !== undefined) {
      this.settings.showTerritory = preferences.showTerritory;
    }
    
    // Restore display settings (internal only - no UI checkboxes in simplified interface)
    if (preferences.showTrails !== undefined) {
      this.settings.showTrails = preferences.showTrails;
    }
    
    if (preferences.showBehaviorStates !== undefined) {
      this.settings.showBehaviorStates = preferences.showBehaviorStates;
    }
    
    if (preferences.showEnvironmentDetails !== undefined) {
      this.settings.showEnvironmentDetails = preferences.showEnvironmentDetails;
    }
    
    // Apply settings to renderer
    this.updateRendererSettings();
  }

  /**
   * Debug canvas state for troubleshooting
   */
  debugCanvasState() {
    const canvas = document.getElementById('colonyCanvas');
    const minimap = document.getElementById('minimapCanvas');
    console.log("🖼️ Canvas debug info:", {
      mainCanvas: {
        exists: !!canvas,
        width: canvas?.width,
        height: canvas?.height,
        context: !!canvas?.getContext('2d'),
        parent: canvas?.parentElement?.tagName
      },
      minimap: {
        exists: !!minimap,
        width: minimap?.width,
        height: minimap?.height,
        context: !!minimap?.getContext('2d')
      }
    });
  }



  /**
   * Handle simulation state updates
   */
  handleStateUpdate(state, stats) {
    if (this.renderer && state) {
      this.renderer.render(state, stats);
      
      // Update simple UI elements
      this.updateSimpleUI(state, stats);
    }
  }
  
  /**
   * Update simple UI elements
   */
  updateSimpleUI(state, stats) {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(text)) el.textContent = text;
    };
    const ants = state.ants || [];
    const yours = ants.filter((a) => !a.colonyId);

    // Your colony: total, cap and the role split
    set('totalPopulation', yours.length);
    set('populationCap', state.maxPopulation ? `ants of ${state.maxPopulation}` : 'ants');
    const counts = { worker: 0, scout: 0, soldier: 0 };
    yours.forEach((a) => { if (counts[a.role] !== undefined) counts[a.role]++; });
    set('workerCount', counts.worker);
    set('scoutCount', counts.scout);
    set('soldierCount', counts.soldier);
    const total = Math.max(1, yours.length);
    [['hudWorkerBar', counts.worker], ['hudScoutBar', counts.scout], ['hudSoldierBar', counts.soldier]].forEach(([id, n]) => {
      const bar = document.getElementById(id);
      if (bar) bar.style.width = `${(n / total) * 100}%`;
    });

    // Stores, food on the map, morale, season and clock
    set('foodStores', Math.round(state.food ?? 0));
    set('foodCount', state.environment?.foodSources?.length ?? 0);
    if (typeof state.morale === 'number') {
      set('moraleValue', state.morale >= 7 ? 'High' : state.morale >= 4 ? 'Steady' : 'Low');
    }
    if (state.narrative_context?.current_season) set('currentSeason', state.narrative_context.current_season);
    if (stats?.elapsedTime !== undefined) set('hudClock', Utils.formatTime(Math.floor(stats.elapsedTime)));

    this.updateColoniesList(state);
  }

  /**
   * One row per nest on the map; rebuilt only when the numbers change
   */
  updateColoniesList(state) {
    const list = document.getElementById('coloniesList');
    if (!list || !state.nests) return;
    const rows = state.nests.map((nest, i) => ({
      name: i === 0 ? (this.menuManager?.getCurrentWorldConfig()?.worldName || 'Your colony') : `Rival colony ${i}`,
      tag: i === 0 ? 'you' : 'rival',
      color: i === 0 ? PALETTE.worker : PALETTE.rival,
      count: (state.ants || []).filter((a) => (a.colonyId || 0) === i).length
    }));
    const signature = rows.map((r) => `${r.name}:${r.count}`).join('|');
    if (signature === this.coloniesSignature) return;
    this.coloniesSignature = signature;

    list.replaceChildren(...rows.map((r) => {
      const li = document.createElement('li');
      li.className = 'colony-row';
      const sw = document.createElement('span');
      sw.className = 'swatch ring';
      sw.style.setProperty('--c', r.color);
      sw.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'grow';
      name.textContent = r.name;
      const tag = document.createElement('span');
      tag.className = 'muted';
      tag.textContent = ` · ${r.tag}`;
      name.append(tag);
      const count = document.createElement('span');
      count.className = 'mono';
      count.textContent = r.count;
      li.append(sw, name, count);
      return li;
    }));
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