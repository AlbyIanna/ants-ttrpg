/**
 * Menu Manager for Ant Colony TTRPG
 * Version: v0.7 - Underground UI Edition
 * Purpose: Manages main menu, world selection, and world configuration
 * Changelog:
 *   v0.7 - Full-page world creation driven by world-form.js, pixel-art title
 *          screen and world thumbnails, menu keyboard shortcuts, nest count
 *          and pheromone trails passed to the simulation; each world keeps its
 *          random seed, so Resume / Load rebuild the same map.
 */

import { Utils } from './utils.js';
import { bindWorldForm } from './world-form.js';
import { drawCells, nestCrossSectionCells, worldThumbCells } from './pixel-art.js';

const escapeHTML = (text) => String(text ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));

const BIOME_NAMES = {
  forest: 'Forest floor', desert: 'Desert oasis', grassland: 'Grassland', wetland: 'Wetland', mixed: 'Mixed terrain'
};
const SIZE_NAMES = {
  small: 'Small 100 × 75', medium: 'Medium 200 × 150', large: 'Large 300 × 200', huge: 'Huge 500 × 300'
};

export class MenuManager {
  constructor(app) {
    this.app = app;
    this.isMenuVisible = true;
    
    // UI elements
    this.mainMenu = null;
    this.simulationInterface = null;
    this.worldConfigModal = null;
    this.worldConfigForm = null;
    
    // Current world configuration
    this.currentWorldConfig = null;
    
    // Default world configurations
    this.defaultConfigs = {
      quickStart: {
        worldName: "Quick Start Colony",
        worldSize: "medium",
        biomeType: "forest",
        startingPopulation: 15,
        maxPopulation: 60,
        workerRatio: 60,
        scoutRatio: 25,
        soldierRatio: 15,
        foodAbundance: "normal",
        hazardLevel: "peaceful",
        startingSeason: "spring",
        startingTimeScale: 60
      },
      survival: {
        worldName: "Survival Challenge",
        worldSize: "small",
        biomeType: "desert",
        startingPopulation: 8,
        maxPopulation: 30,
        workerRatio: 70,
        scoutRatio: 20,
        soldierRatio: 10,
        foodAbundance: "scarce",
        hazardLevel: "dangerous",
        startingSeason: "autumn",
        startingTimeScale: 60
      },
      evolution: {
        worldName: "Evolution Laboratory",
        worldSize: "large",
        biomeType: "mixed",
        startingPopulation: 25,
        maxPopulation: 150,
        workerRatio: 50,
        scoutRatio: 30,
        soldierRatio: 20,
        foodAbundance: "abundant",
        hazardLevel: "normal",
        startingSeason: "spring",
        startingTimeScale: 3600
      }
    };
    
    this.init();
  }
  
  /**
   * Initialize the menu manager
   */
  init() {
    this.setupUI();
    this.setupEventHandlers();
    this.setupKeyboardShortcuts();
    this.drawTitleArt();
    this.loadSavedWorlds();
    this.showMenu();
  }

  /**
   * Draw the nest cross-section on the title screen
   */
  drawTitleArt() {
    const canvas = document.getElementById('nestCrossSection');
    if (!canvas) return;
    const { cols, rows, cells } = nestCrossSectionCells();
    drawCells(canvas, cols, rows, cells);
  }

  /**
   * Title-screen shortcuts: Enter resumes, N creates, L loads, S opens settings.
   * Only active while the title screen itself is showing.
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!this.isMenuVisible || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName) && e.key === 'Enter') return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const overlayOpen = [this.worldConfigModal, this.loadWorldModal]
        .some((el) => el && !el.classList.contains('hidden'));
      if (overlayOpen) return;

      const actions = {
        Enter: 'resumeWorldBtn',
        n: 'createWorldBtn',
        l: 'loadWorldBtn',
        s: 'settingsBtn'
      };
      const id = actions[e.key] || actions[e.key.toLowerCase?.()];
      const btn = id && document.getElementById(id);
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
    });
  }
  
  /**
   * Set up UI element references
   */
  setupUI() {
    this.mainMenu = document.getElementById('mainMenu');
    this.simulationInterface = document.getElementById('simulationInterface');
    this.worldConfigModal = document.getElementById('worldConfigModal');
    this.worldConfigForm = document.getElementById('worldConfigForm');
    this.loadWorldModal = document.getElementById('loadWorldModal');
  }
  
  /**
   * Set up event handlers for menu interactions
   */
  setupEventHandlers() {
    // Main menu buttons
    const resumeBtn = document.getElementById('resumeWorldBtn');
    const createBtn = document.getElementById('createWorldBtn');
    const loadBtn = document.getElementById('loadWorldBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.resumeLastWorld());
    }
    
    if (createBtn) {
      createBtn.addEventListener('click', () => this.showWorldConfig());
    }
    
    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.showLoadWorld());
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showGlobalSettings());
    }
    
    // World config modal handlers
    const configClose = document.getElementById('worldConfigClose');
    if (configClose) {
      configClose.addEventListener('click', () => this.hideWorldConfig());
    }
    
    // Load world modal handlers
    const loadClose = document.getElementById('loadWorldClose');
    const cancelLoadBtn = document.getElementById('cancelLoadBtn');
    const loadSelectedBtn = document.getElementById('loadSelectedBtn');
    const deleteWorldBtn = document.getElementById('deleteWorldBtn');
    
    if (loadClose) {
      loadClose.addEventListener('click', () => this.hideLoadWorldModal());
    }
    
    if (cancelLoadBtn) {
      cancelLoadBtn.addEventListener('click', () => this.hideLoadWorldModal());
    }
    
    if (loadSelectedBtn) {
      loadSelectedBtn.addEventListener('click', () => this.loadSelectedWorld());
    }
    
    if (deleteWorldBtn) {
      deleteWorldBtn.addEventListener('click', () => this.deleteSelectedWorld());
    }
    
    // Preset buttons
    const presetQuickStart = document.getElementById('presetQuickStart');
    const presetSurvival = document.getElementById('presetSurvival');
    const presetEvolution = document.getElementById('presetEvolution');
    
    if (presetQuickStart) {
      presetQuickStart.addEventListener('click', () => this.applyPreset('quickStart'));
    }
    
    if (presetSurvival) {
      presetSurvival.addEventListener('click', () => this.applyPreset('survival'));
    }
    
    if (presetEvolution) {
      presetEvolution.addEventListener('click', () => this.applyPreset('evolution'));
    }
    
    // World config form
    if (this.worldConfigForm) {
      this.worldConfigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createWorld();
      });
    }
    
    // Back to menu button in simulation
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
      backToMenuBtn.addEventListener('click', () => this.showMenu());
    }
    
    // Dynamic form updates
    this.setupFormUpdates();
    
    // Click outside modal to close
    if (this.worldConfigModal) {
      this.worldConfigModal.addEventListener('click', (e) => {
        if (e.target === this.worldConfigModal) {
          this.hideWorldConfig();
        }
      });
    }
    
    if (this.loadWorldModal) {
      this.loadWorldModal.addEventListener('click', (e) => {
        if (e.target === this.loadWorldModal) {
          this.hideLoadWorldModal();
        }
      });
    }
  }
  
  /**
   * Set up dynamic form updates (sliders, percentages, etc.)
   */
  setupFormUpdates() {
    // Population slider
    const populationSlider = document.getElementById('startingPopulation');
    const populationValue = document.getElementById('populationValue');
    if (populationSlider && populationValue) {
      populationSlider.addEventListener('input', (e) => {
        populationValue.textContent = `${e.target.value} ants`;
      });
    }
    
    // Max population slider
    const maxPopSlider = document.getElementById('maxPopulation');
    const maxPopValue = document.getElementById('maxPopulationValue');
    if (maxPopSlider && maxPopValue) {
      maxPopSlider.addEventListener('input', (e) => {
        maxPopValue.textContent = `${e.target.value} ants`;
      });
    }
    
    // Role distribution sliders
    const workerSlider = document.getElementById('workerRatio');
    const scoutSlider = document.getElementById('scoutRatio');
    const soldierSlider = document.getElementById('soldierRatio');
    
    const workerPercent = document.getElementById('workerPercent');
    const scoutPercent = document.getElementById('scoutPercent');
    const soldierPercent = document.getElementById('soldierPercent');
    
    const updateRoleDistribution = () => {
      if (workerSlider && scoutSlider && soldierSlider && 
          workerPercent && scoutPercent && soldierPercent) {
        
        // Values are kept at 100% by world-form.js (steppers) and by the
        // presets; createWorld() still normalises as a final safeguard.
        // Normalising here, on every single input event, corrupted values
        // while a preset or stepper was mid-way through updating all three.
        const worker = parseInt(workerSlider.value);
        const scout = parseInt(scoutSlider.value);
        const soldier = parseInt(soldierSlider.value);

        workerPercent.textContent = `${worker}%`;
        scoutPercent.textContent = `${scout}%`;
        soldierPercent.textContent = `${soldier}%`;
      }
    };
    
    if (workerSlider) workerSlider.addEventListener('input', updateRoleDistribution);
    if (scoutSlider) scoutSlider.addEventListener('input', updateRoleDistribution);
    if (soldierSlider) soldierSlider.addEventListener('input', updateRoleDistribution);

    // Card choices, role steppers and the live summary/preview
    this.worldForm = bindWorldForm(this.worldConfigForm);
  }
  
  /**
   * Show the main menu
   */
  showMenu() {
    if (this.mainMenu) {
      this.mainMenu.classList.remove('hidden');
      this.isMenuVisible = true;
    }
    
    if (this.simulationInterface) {
      this.simulationInterface.classList.add('hidden');
    }
    
    // Stop any running simulation
    if (this.app.simulation && this.app.isSimulationRunning) {
      this.app.simulation.stop();
      this.app.isSimulationRunning = false;
    }
    
    this.updateMenuButtons();
  }
  
  /**
   * Hide the main menu and show simulation
   */
  hideMenu() {
    if (this.mainMenu) {
      this.mainMenu.classList.add('hidden');
      this.isMenuVisible = false;
    }
    
    if (this.simulationInterface) {
      this.simulationInterface.classList.remove('hidden');
    }
  }
  
  /**
   * Show world configuration modal
   */
  showWorldConfig() {
    if (this.worldConfigModal) {
      this.worldConfigModal.classList.remove('hidden');
      this.resetConfigForm();
      // World creation is a full screen of its own: take the title screen away
      if (this.mainMenu) this.mainMenu.classList.add('hidden');
      if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
    }
  }

  /**
   * Hide world configuration modal
   */
  hideWorldConfig() {
    if (this.worldConfigModal) {
      this.worldConfigModal.classList.add('hidden');
    }
    if (this.mainMenu && this.isMenuVisible) {
      this.mainMenu.classList.remove('hidden');
    }
  }
  
  /**
   * Apply a preset configuration
   */
  applyPreset(presetName) {
    const preset = this.defaultConfigs[presetName];
    if (!preset || !this.worldConfigForm) return;
    
    // Apply all preset values to form
    Object.keys(preset).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.value = preset[key];
        
        // Trigger change events for dynamic updates
        element.dispatchEvent(new Event('input'));
      }
    });
    
    Utils.addActivity(`🎯 Applied ${presetName} preset`, 'info');
  }
  
  /**
   * Reset configuration form to defaults
   */
  resetConfigForm() {
    if (!this.worldConfigForm) return;
    
    this.worldConfigForm.reset();
    
    // Trigger updates for sliders
    const sliders = this.worldConfigForm.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.dispatchEvent(new Event('input'));
    });
  }
  
  /**
   * Create a new world based on form configuration
   */
  async createWorld() {
    if (!this.worldConfigForm) return;
    
    // Gather form data
    const formData = new FormData(this.worldConfigForm);
    const config = {};
    
    // Extract all form values
    const inputs = this.worldConfigForm.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.type === 'range') {
        config[input.id] = parseInt(input.value);
      } else {
        config[input.id] = input.value;
      }
    });
    
    // Validation and sanitization
    if (!config.worldName || config.worldName.trim() === '') {
      config.worldName = 'My Ant Colony';
    }
    config.worldName = config.worldName.trim().substring(0, 30);
    
    // Ensure population constraints
    if (config.maxPopulation < config.startingPopulation) {
      config.maxPopulation = Math.max(config.startingPopulation * 2, 30);
      Utils.addActivity('⚠️ Max population adjusted to accommodate starting population', 'info');
    }
    
    // Validate role distribution totals 100%
    const totalRoles = config.workerRatio + config.scoutRatio + config.soldierRatio;
    if (totalRoles !== 100) {
      const scale = 100 / totalRoles;
      config.workerRatio = Math.round(config.workerRatio * scale);
      config.scoutRatio = Math.round(config.scoutRatio * scale);
      config.soldierRatio = 100 - config.workerRatio - config.scoutRatio;
      Utils.addActivity('⚠️ Role distribution normalized to 100%', 'info');
    }
    
    // Add metadata
    config.createdAt = Date.now();
    config.version = 'v0.7';
    config.id = crypto.randomUUID();
    
    this.currentWorldConfig = config;
    
    // Hide modal and menu
    this.hideWorldConfig();
    this.hideMenu();
    
    // Show loading
    Utils.setLoading(true, 0);
    Utils.addActivity(`🌍 Creating world: ${config.worldName}`, 'info');
    
    try {
      // Initialize the simulation with the new world config
      console.log(1122, config)
      await this.initializeWorldWithConfig(config);
      
      // Save world configuration
      this.saveWorldConfig(config);
      
      Utils.setLoading(false);
      Utils.addActivity(`✅ World "${config.worldName}" created successfully!`, 'success');
      
    } catch (error) {
      console.error('Failed to create world:', error);
      Utils.addActivity(`❌ Failed to create world: ${error.message}`, 'error');
      Utils.setLoading(false);
      this.showMenu();
    }
  }
  
  /**
   * Initialize world with specific configuration
   */
  async initializeWorldWithConfig(config) {
    // Map our config values to simulation parameters
    const biomeMap = {
      'forest': 'forest_floor',
      'desert': 'desert_oasis',
      'grassland': 'grassland',
      'wetland': 'wetland',
      'mixed': 'mixed_terrain'
    };
    
    const biome = biomeMap[config.biomeType] || 'forest_floor';
    
    // Initialize the app's systems if not done already
    if (!this.app.isInitialized) {
      await this.app.initializeSystems();
      this.app.setupUIControls();
      this.app.setupKeyboardControls();
    }
    
    // Set initial time scale if time manager is available
    if (this.app.timeScaleManager) {
      const scaleMap = {
        1: 'REAL_TIME',
        60: 'MINUTE_SCALE', 
        3600: 'HOUR_SCALE',
        86400: 'DAY_SCALE',
        604800: 'WEEK_SCALE',
        2628000: 'MONTH_SCALE'
      };
      const scaleName = scaleMap[config.startingTimeScale] || 'MINUTE_SCALE';
      this.app.timeScaleManager.setTimeScale(scaleName);
    }
    
    // Initialize colony with our configuration
    const state = await this.app.simulation.initializeColony(biome, {
      worldSize: config.worldSize,
      startingPopulation: config.startingPopulation,
      maxPopulation: config.maxPopulation,
      nestCount: config.nestCount || 1,
      seed: config.seed,
      // decayRate: trails fade (decay only runs when it is set); colonySpecific:
      // each colony follows its own trails, not its rivals'
      pheromoneSystem: { enabled: true, decayRate: 0.05, colonySpecific: true },
      roleDistribution: {
        workers: config.workerRatio / 100,
        scouts: config.scoutRatio / 100,
        soldiers: config.soldierRatio / 100
      },
      environment: {
        foodAbundance: config.foodAbundance,
        hazardLevel: config.hazardLevel,
        season: config.startingSeason
      },
      timeScale: config.startingTimeScale
    });
    
    // Update UI with world info
    if (config.biomeType) {
      Utils.updateElement('biomeType', config.biomeType.replace('_', ' ').toUpperCase());
    }
    if (config.startingSeason) {
      Utils.updateElement('currentSeason', config.startingSeason);
    }
    Utils.updateElement('hudWorldName', config.worldName || 'Colony');
    const nests = config.nestCount || 1;
    Utils.updateElement('hudWorldMeta', [
      BIOME_NAMES[config.biomeType] || config.biomeType,
      SIZE_NAMES[config.worldSize] || config.worldSize,
      nests === 1 ? '1 colony' : `${nests} colonies`
    ].filter(Boolean).join(' · '));
    
    // Keep the seed with the world so Resume / Load rebuild this exact map
    // (worlds saved before v0.7 have none: they get one now, saved on next create)
    if (config.seed === undefined && state?.seed !== undefined) {
      config.seed = state.seed;
    }

    // Mark as initialized
    this.app.isInitialized = true;

    // Draw the new world straight away, before the first simulation tick
    if (typeof this.app.redraw === 'function') {
      this.app.redraw();
      this.app.updateSimpleUI?.(state, this.app.simulation.getSimulationStats?.());
    }

    return state;
  }
  
  /**
   * Resume the last saved world
   */
  async resumeLastWorld() {
    const lastWorld = Utils.storage.get('lastWorld');
    if (!lastWorld) {
      Utils.addActivity('❌ No world to resume', 'error');
      return;
    }
    
    // Fix: Use worldName instead of name property
    Utils.addActivity(`🔄 Resuming world: ${lastWorld.worldName}`, 'info');
    this.currentWorldConfig = lastWorld;
    
    this.hideMenu();
    
    try {
      await this.initializeWorldWithConfig(lastWorld);
      Utils.addActivity(`✅ Resumed world: ${lastWorld.worldName}`, 'success');
    } catch (error) {
      console.error('Failed to resume world:', error);
      Utils.addActivity(`❌ Failed to resume world: ${error.message}`, 'error');
      this.showMenu();
    }
  }
  
  /**
   * Show load world interface
   */
  showLoadWorld() {
    const savedWorlds = Utils.storage.get('savedWorlds', []);
    const worlds = Array.isArray(savedWorlds) ? savedWorlds : [];
    
    if (worlds.length === 0) {
      Utils.addActivity('📁 No saved worlds found. Create a world first!', 'info');
      return;
    }
    
    this.showLoadWorldModal();
    this.populateLoadWorldModal(worlds);
  }
  
  /**
   * Show load world modal
   */
  showLoadWorldModal() {
    if (this.loadWorldModal) {
      this.loadWorldModal.classList.remove('hidden');
    }
  }
  
  /**
   * Hide load world modal
   */
  hideLoadWorldModal() {
    if (this.loadWorldModal) {
      this.loadWorldModal.classList.add('hidden');
    }
    this.selectedWorldId = null;
    this.updateDeleteButton();
  }
  
  /**
   * Populate the load world modal with saved worlds
   */
  populateLoadWorldModal(worlds) {
    const grid = document.getElementById('savedWorldsGrid');
    if (!grid) return;
    
    if (worlds.length === 0) {
      grid.innerHTML = '<div class="no-saved-worlds">No saved worlds found. Create your first ant colony!</div>';
      return;
    }
    
    grid.innerHTML = worlds.map(world => {
      const date = new Date(world.savedAt || Date.now()).toLocaleDateString();
      const biomeIcon = this.getBiomeIcon(world.biomeType);
      
      return `
        <div class="saved-world-item" data-world-id="${world.id}" tabindex="0">
          <div class="saved-world-header">
            <div class="saved-world-name">${world.worldName}</div>
            <div class="saved-world-date">${date}</div>
          </div>
          <div class="saved-world-details">
            <div class="saved-world-detail">
              <span class="icon">${biomeIcon}</span>
              <span>${world.biomeType || 'Unknown'}</span>
            </div>
            <div class="saved-world-detail">
              <span class="icon">🐜</span>
              <span>${world.startingPopulation || 0} ants</span>
            </div>
            <div class="saved-world-detail">
              <span class="icon">📏</span>
              <span>${world.worldSize || 'medium'}</span>
            </div>
            <div class="saved-world-detail">
              <span class="icon">🌡️</span>
              <span>${world.startingSeason || 'spring'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers for world selection
    grid.querySelectorAll('.saved-world-item').forEach(item => {
      item.addEventListener('click', () => this.selectWorldItem(item));
      item.addEventListener('dblclick', () => this.loadSelectedWorld());
      
      // Keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectWorldItem(item);
        }
      });
    });
  }
  
  /**
   * Select a world item in the grid
   */
  selectWorldItem(item) {
    // Remove selection from other items
    const grid = document.getElementById('savedWorldsGrid');
    if (grid) {
      grid.querySelectorAll('.saved-world-item').forEach(worldItem => {
        worldItem.classList.remove('selected');
      });
    }
    
    // Select this item
    item.classList.add('selected');
    this.selectedWorldId = item.dataset.worldId;
    
    this.updateDeleteButton();
  }
  
  /**
   * Load the currently selected world
   */
  loadSelectedWorld() {
    if (!this.selectedWorldId) {
      Utils.addActivity('❌ No world selected', 'error');
      return;
    }
    
    const savedWorlds = Utils.storage.get('savedWorlds', []);
    const worlds = Array.isArray(savedWorlds) ? savedWorlds : [];
    const world = worlds.find(w => w.id === this.selectedWorldId);
    
    if (world) {
      this.hideLoadWorldModal();
      this.loadWorldById(world);
    } else {
      Utils.addActivity('❌ Selected world not found', 'error');
    }
  }
  
  /**
   * Delete the currently selected world
   */
  deleteSelectedWorld() {
    if (!this.selectedWorldId) return;
    
    const savedWorlds = Utils.storage.get('savedWorlds', []);
    const worlds = Array.isArray(savedWorlds) ? savedWorlds : [];
    const world = worlds.find(w => w.id === this.selectedWorldId);
    
    if (!world) return;
    
    if (confirm(`Are you sure you want to delete "${world.worldName}"? This action cannot be undone.`)) {
      // Remove from saved worlds
      const filtered = worlds.filter(w => w.id !== this.selectedWorldId);
      Utils.storage.set('savedWorlds', filtered);
      
      // Clear if this was the last world
      if (world.id === Utils.storage.get('lastWorld')?.id) {
        Utils.storage.remove('lastWorld');
      }
      
      Utils.addActivity(`🗑️ Deleted world: ${world.worldName}`, 'info');
      
      // Refresh the modal
      this.populateLoadWorldModal(filtered);
      this.selectedWorldId = null;
      this.updateDeleteButton();
      this.updateMenuButtons();
    }
  }
  
  /**
   * Update delete button state
   */
  updateDeleteButton() {
    const deleteBtn = document.getElementById('deleteWorldBtn');
    const loadBtn = document.getElementById('loadSelectedBtn');
    
    const hasSelection = !!this.selectedWorldId;
    
    if (deleteBtn) {
      deleteBtn.disabled = !hasSelection;
    }
    
    if (loadBtn) {
      loadBtn.disabled = !hasSelection;
    }
  }
  
  /**
   * Get icon for biome type
   */
  getBiomeIcon(biome) {
    const icons = {
      forest: '🌲',
      desert: '🏜️',
      grassland: '🌾',
      wetland: '🌿',
      mixed: '🗺️'
    };
    return icons[biome] || '🌍';
  }
  
  /**
   * Show global settings
   */
  showGlobalSettings() {
    const settings = Utils.storage.get('globalSettings', {
      autoSave: true,
      showTutorial: true,
      performanceMode: false,
      soundEnabled: true
    });
    
    const settingsText = `Current Global Settings:
    
1. Auto-save worlds: ${settings.autoSave ? 'ON' : 'OFF'}
2. Show tutorial: ${settings.showTutorial ? 'ON' : 'OFF'}  
3. Performance mode: ${settings.performanceMode ? 'ON' : 'OFF'}
4. Sound enabled: ${settings.soundEnabled ? 'ON' : 'OFF'}
5. Clear all saved worlds
6. Reset all settings

Enter number to toggle (1-6) or cancel:`;
    
    const selection = prompt(settingsText);
    
    if (selection && !isNaN(selection)) {
      const option = parseInt(selection);
      
      switch (option) {
        case 1:
          settings.autoSave = !settings.autoSave;
          Utils.addActivity(`✅ Auto-save ${settings.autoSave ? 'enabled' : 'disabled'}`, 'info');
          break;
        case 2:
          settings.showTutorial = !settings.showTutorial;
          Utils.addActivity(`✅ Tutorial ${settings.showTutorial ? 'enabled' : 'disabled'}`, 'info');
          break;
        case 3:
          settings.performanceMode = !settings.performanceMode;
          Utils.addActivity(`✅ Performance mode ${settings.performanceMode ? 'enabled' : 'disabled'}`, 'info');
          break;
        case 4:
          settings.soundEnabled = !settings.soundEnabled;
          Utils.addActivity(`✅ Sound ${settings.soundEnabled ? 'enabled' : 'disabled'}`, 'info');
          break;
        case 5:
          if (confirm('Are you sure you want to delete ALL saved worlds? This cannot be undone.')) {
            Utils.storage.remove('savedWorlds');
            Utils.storage.remove('lastWorld');
            this.updateMenuButtons();
            Utils.addActivity('🗑️ All saved worlds deleted', 'info');
          }
          break;
        case 6:
          if (confirm('Reset all settings to defaults?')) {
            Utils.storage.remove('globalSettings');
            Utils.addActivity('🔧 Settings reset to defaults', 'info');
          }
          break;
        default:
          Utils.addActivity('❌ Invalid option', 'error');
          return;
      }
      
      if (option <= 4) {
        Utils.storage.set('globalSettings', settings);
      }
    }
  }
  
  /**
   * Save world configuration to localStorage
   */
  saveWorldConfig(config) {
    // Save as last world
    Utils.storage.set('lastWorld', config);
    
    // Add to saved worlds list
    const savedWorlds = Utils.storage.get('savedWorlds', []);
    
    // Remove existing world with same name
    const filtered = savedWorlds.filter(w => w.worldName !== config.worldName);
    
    // Add new world with timestamp
    filtered.unshift({
      ...config,
      savedAt: Date.now(),
      id: crypto.randomUUID()
    });
    
    // Keep only last 10 worlds
    const trimmed = filtered.slice(0, 10);
    
    Utils.storage.set('savedWorlds', trimmed);
    this.updateMenuButtons();
  }
  
  /**
   * Load saved worlds and update UI
   */
  loadSavedWorlds() {
    const savedWorlds = Utils.storage.get('savedWorlds', []);
    const worldsList = document.getElementById('worldsList');
    
    if (!worldsList) return;
    
    // Ensure savedWorlds is an array
    const worlds = Array.isArray(savedWorlds) ? savedWorlds : [];
    
    if (worlds.length === 0) {
      worldsList.innerHTML = '<li class="no-worlds">No saved worlds yet. Create your first ant colony!</li>';
    } else {
      worldsList.innerHTML = worlds.slice(0, 3).map(world =>
        `<li><button type="button" class="world-item" data-world-id="${escapeHTML(world.id)}">
          <canvas class="pixel-canvas world-thumb" aria-hidden="true"></canvas>
          <span class="world-text">
            <span class="world-name">${escapeHTML(world.worldName)}</span>
            <span class="world-info">${escapeHTML(BIOME_NAMES[world.biomeType] || world.biomeType)}</span>
            <span class="world-meta">${escapeHTML(world.startingPopulation)} ants · ${new Date(world.savedAt).toLocaleDateString()}</span>
          </span>
        </button></li>`
      ).join('');

      worldsList.querySelectorAll('.world-item').forEach((item, i) => {
        drawCells(item.querySelector('canvas'), 10, 6, worldThumbCells(worlds[i]));
      });

      // Add click handlers for world items
      worldsList.querySelectorAll('.world-item').forEach(item => {
        item.addEventListener('click', () => {
          const worldId = item.dataset.worldId;
          const world = worlds.find(w => w.id === worldId);
          if (world) {
            this.loadWorldById(world);
          }
        });
      });
    }
  }
  
  /**
   * Load specific world by ID
   */
  async loadWorldById(world) {
    this.currentWorldConfig = world;
    this.hideMenu();
    
    Utils.addActivity(`🔄 Loading world: ${world.worldName}`, 'info');
    
    try {
      await this.initializeWorldWithConfig(world);
      Utils.addActivity(`✅ Loaded world: ${world.worldName}`, 'success');
    } catch (error) {
      console.error('Failed to load world:', error);
      Utils.addActivity(`❌ Failed to load world: ${error.message}`, 'error');
      this.showMenu();
    }
  }
  
  /**
   * Update menu buttons based on available actions
   */
  updateMenuButtons() {
    const resumeBtn = document.getElementById('resumeWorldBtn');
    const lastWorld = Utils.storage.get('lastWorld');
    
    if (resumeBtn) {
      const title = lastWorld ? `Resume ${escapeHTML(lastWorld.worldName)}` : 'Resume last world';
      const sub = lastWorld
        ? [BIOME_NAMES[lastWorld.biomeType], lastWorld.startingSeason, `${lastWorld.startingPopulation} ants`]
            .filter(Boolean).map(escapeHTML).join(' · ')
        : 'No saved world yet';
      resumeBtn.disabled = !lastWorld;
      resumeBtn.innerHTML = `
        <svg aria-hidden="true"><use href="#i-play"/></svg>
        <span class="menu-btn-text">
          <span class="menu-btn-title">${title}</span>
          <span class="menu-btn-sub">${sub}</span>
        </span>
        <kbd>Enter</kbd>`;
    }
    
    // Update saved worlds list
    this.loadSavedWorlds();
  }
  
  /**
   * Get current world configuration
   */
  getCurrentWorldConfig() {
    return this.currentWorldConfig;
  }
  
  /**
   * Check if menu is currently visible
   */
  isVisible() {
    return this.isMenuVisible;
  }
}