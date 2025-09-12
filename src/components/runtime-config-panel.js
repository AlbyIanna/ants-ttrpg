/**
 * Runtime Configuration Panel for Ant Colony TTRPG
 * Version: v0.5 - Live Parameter Adjustment System
 * Purpose: Allows real-time adjustment of simulation parameters while running
 */

import { Utils } from './utils.js';

export class RuntimeConfigPanel {
  constructor(app) {
    this.app = app;
    this.isVisible = false;
    this.isDocked = false;
    this.currentTab = 'environment';
    
    // Panel position for dragging
    this.position = { x: 20, y: 100 };
    this.dragState = { isDragging: false, startX: 0, startY: 0 };
    
    // Configuration categories
    this.configTabs = {
      environment: '🌍 Environment',
      population: '🐜 Population', 
      behavior: '🧠 Behavior',
      display: '👁️ Display',
      advanced: '⚙️ Advanced'
    };
    
    // Current parameter values (cached for performance)
    this.currentParams = {
      foodAbundance: 1.0,
      hazardLevel: 0.5,
      maxPopulation: 50,
      antSpeed: 1.0,
      explorationRate: 0.3,
      socialCohesion: 0.7,
      showTrails: true,
      showBehaviorStates: true,
      showEnvironmentDetails: true,
      season: 'Spring',
      weatherIntensity: 0.5
    };
    
    this.init();
  }
  
  /**
   * Initialize runtime config panel
   */
  init() {
    this.createPanel();
    this.setupEventHandlers();
    this.loadUserPreferences();
  }
  
  /**
   * Create the floating configuration panel
   */
  createPanel() {
    // Create main panel container
    this.panel = Utils.createElement('div', {
      id: 'runtimeConfigPanel',
      className: 'runtime-config-panel hidden'
    });
    
    // Panel header with drag handle and controls
    const header = Utils.createElement('div', {
      className: 'config-panel-header'
    });
    
    const dragHandle = Utils.createElement('div', {
      className: 'drag-handle',
      textContent: '⚙️ Runtime Configuration'
    });
    
    const headerControls = Utils.createElement('div', {
      className: 'header-controls'
    });
    
    const dockBtn = Utils.createElement('button', {
      className: 'dock-btn',
      textContent: '📌',
      title: 'Dock/Undock panel'
    });
    
    const minimizeBtn = Utils.createElement('button', {
      className: 'minimize-btn',
      textContent: '➖',
      title: 'Minimize panel'
    });
    
    const closeBtn = Utils.createElement('button', {
      className: 'close-btn', 
      textContent: '✖',
      title: 'Close panel'
    });
    
    headerControls.appendChild(dockBtn);
    headerControls.appendChild(minimizeBtn);
    headerControls.appendChild(closeBtn);
    
    header.appendChild(dragHandle);
    header.appendChild(headerControls);
    
    // Tab navigation
    const tabNav = Utils.createElement('div', {
      className: 'config-tab-nav'
    });
    
    Object.keys(this.configTabs).forEach(tabKey => {
      const tab = Utils.createElement('button', {
        className: `config-tab ${tabKey === this.currentTab ? 'active' : ''}`,
        'data-tab': tabKey,
        textContent: this.configTabs[tabKey]
      });
      tabNav.appendChild(tab);
    });
    
    // Panel content area
    const content = Utils.createElement('div', {
      className: 'config-panel-content'
    });
    
    // Assemble panel
    this.panel.appendChild(header);
    this.panel.appendChild(tabNav);
    this.panel.appendChild(content);
    
    // Add to document
    document.body.appendChild(this.panel);
    
    // Create initial content
    this.renderTabContent();
    
    // Add CSS
    this.addPanelCSS();
  }
  
  /**
   * Add CSS styles for the runtime config panel
   */
  addPanelCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .runtime-config-panel {
        position: fixed;
        top: 100px;
        right: 20px;
        width: 320px;
        background: linear-gradient(145deg, #F5DEB3, #D2B48C);
        border: 3px solid #8B4513;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        z-index: 1000;
        backdrop-filter: blur(8px);
        max-height: 70vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .runtime-config-panel.hidden {
        opacity: 0;
        transform: translateX(100%);
        pointer-events: none;
      }
      
      .runtime-config-panel.docked {
        position: relative;
        top: auto;
        right: auto;
        margin: 12px;
        width: calc(100% - 24px);
        max-width: 400px;
      }
      
      .config-panel-header {
        background: linear-gradient(90deg, #8B4513, #A0522D);
        color: white;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 8px 8px 0 0;
        font-weight: bold;
        font-size: 0.9em;
      }
      
      .drag-handle {
        cursor: move;
        user-select: none;
        flex-grow: 1;
      }
      
      .header-controls {
        display: flex;
        gap: 4px;
      }
      
      .header-controls button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 0.8em;
        transition: background 0.2s;
      }
      
      .header-controls button:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .config-tab-nav {
        display: flex;
        background: rgba(139, 69, 19, 0.1);
        overflow-x: auto;
      }
      
      .config-tab {
        background: none;
        border: none;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 0.8em;
        color: #8B4513;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: all 0.2s;
      }
      
      .config-tab:hover {
        background: rgba(139, 69, 19, 0.1);
      }
      
      .config-tab.active {
        background: rgba(139, 69, 19, 0.2);
        border-bottom-color: #8B4513;
        font-weight: bold;
      }
      
      .config-panel-content {
        padding: 12px;
        overflow-y: auto;
        flex-grow: 1;
      }
      
      .config-group {
        margin-bottom: 16px;
      }
      
      .config-group-title {
        font-weight: bold;
        color: #8B4513;
        font-size: 0.9em;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(139, 69, 19, 0.3);
      }
      
      .config-control {
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .config-control label {
        font-size: 0.8em;
        color: #654321;
        font-weight: 500;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .config-control input[type="range"] {
        width: 100%;
        accent-color: #8B4513;
      }
      
      .config-control input[type="checkbox"] {
        accent-color: #8B4513;
      }
      
      .config-control select {
        padding: 4px 8px;
        border: 1px solid #8B4513;
        border-radius: 4px;
        background: white;
        font-size: 0.8em;
      }
      
      .control-value {
        font-weight: bold;
        color: #2D4A2B;
        font-family: 'Courier New', monospace;
        font-size: 0.75em;
      }
      
      .config-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(139, 69, 19, 0.3);
      }
      
      .config-actions button {
        flex: 1;
        padding: 6px 12px;
        border: 1px solid #8B4513;
        border-radius: 4px;
        background: #F5DEB3;
        color: #8B4513;
        font-size: 0.8em;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .config-actions button:hover {
        background: #8B4513;
        color: white;
      }
      
      .config-actions .primary {
        background: #8B4513;
        color: white;
      }
      
      .config-actions .primary:hover {
        background: #A0522D;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Header controls
    const dockBtn = this.panel.querySelector('.dock-btn');
    const minimizeBtn = this.panel.querySelector('.minimize-btn');
    const closeBtn = this.panel.querySelector('.close-btn');
    
    if (dockBtn) {
      dockBtn.addEventListener('click', () => this.toggleDock());
    }
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Tab navigation
    const tabs = this.panel.querySelectorAll('.config-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });
    
    // Dragging functionality
    const dragHandle = this.panel.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
    }
    
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', () => this.endDrag());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        this.toggle();
      }
    });
    
    // Add toggle button to simulation interface
    this.addToggleButton();
  }
  
  /**
   * Add toggle button to main interface
   */
  addToggleButton() {
    const controlPanel = document.querySelector('.control-panel .simulation-controls');
    if (!controlPanel) return;
    
    const toggleBtn = Utils.createElement('button', {
      id: 'runtimeConfigToggle',
      className: 'control-btn',
      textContent: '⚙️ Live Config',
      title: 'Open runtime configuration (Ctrl+Shift+C)'
    });
    
    toggleBtn.addEventListener('click', () => this.toggle());
    controlPanel.appendChild(toggleBtn);
  }
  
  /**
   * Render content for current tab
   */
  renderTabContent() {
    const content = this.panel.querySelector('.config-panel-content');
    if (!content) return;
    
    content.innerHTML = '';
    
    switch (this.currentTab) {
      case 'environment':
        this.renderEnvironmentTab(content);
        break;
      case 'population':
        this.renderPopulationTab(content);
        break;
      case 'behavior':
        this.renderBehaviorTab(content);
        break;
      case 'display':
        this.renderDisplayTab(content);
        break;
      case 'advanced':
        this.renderAdvancedTab(content);
        break;
    }
  }
  
  /**
   * Render environment configuration tab
   */
  renderEnvironmentTab(container) {
    const envGroup = this.createConfigGroup('🌍 Environment Controls');
    
    // Food abundance
    envGroup.appendChild(this.createSliderControl(
      'foodAbundance',
      'Food Abundance',
      this.currentParams.foodAbundance,
      { min: 0.1, max: 3.0, step: 0.1, format: (v) => `${v.toFixed(1)}x` }
    ));
    
    // Hazard level
    envGroup.appendChild(this.createSliderControl(
      'hazardLevel',
      'Hazard Level',
      this.currentParams.hazardLevel,
      { min: 0.0, max: 1.0, step: 0.1, format: (v) => `${Math.round(v * 100)}%` }
    ));
    
    // Season control
    envGroup.appendChild(this.createSelectControl(
      'season',
      'Current Season',
      this.currentParams.season,
      [
        { value: 'Spring', label: '🌸 Spring' },
        { value: 'Summer', label: '☀️ Summer' },
        { value: 'Autumn', label: '🍂 Autumn' },
        { value: 'Winter', label: '❄️ Winter' }
      ]
    ));
    
    // Weather intensity
    envGroup.appendChild(this.createSliderControl(
      'weatherIntensity',
      'Weather Intensity',
      this.currentParams.weatherIntensity,
      { min: 0.0, max: 1.0, step: 0.1, format: (v) => `${Math.round(v * 100)}%` }
    ));
    
    container.appendChild(envGroup);
    
    // Action buttons
    const actions = Utils.createElement('div', { className: 'config-actions' });
    
    const triggerEventBtn = Utils.createElement('button', {
      textContent: '🌧️ Weather Event'
    });
    
    const addFoodBtn = Utils.createElement('button', {
      textContent: '🍯 Spawn Food'
    });
    
    triggerEventBtn.addEventListener('click', () => this.triggerWeatherEvent());
    addFoodBtn.addEventListener('click', () => this.spawnFood());
    
    actions.appendChild(triggerEventBtn);
    actions.appendChild(addFoodBtn);
    container.appendChild(actions);
  }
  
  /**
   * Render population configuration tab
   */
  renderPopulationTab(container) {
    const popGroup = this.createConfigGroup('🐜 Population Controls');
    
    // Max population
    popGroup.appendChild(this.createSliderControl(
      'maxPopulation',
      'Maximum Population',
      this.currentParams.maxPopulation,
      { min: 10, max: 200, step: 5, format: (v) => `${v} ants` }
    ));
    
    // Ant speed
    popGroup.appendChild(this.createSliderControl(
      'antSpeed',
      'Ant Movement Speed',
      this.currentParams.antSpeed,
      { min: 0.1, max: 3.0, step: 0.1, format: (v) => `${v.toFixed(1)}x` }
    ));
    
    container.appendChild(popGroup);
    
    // Population actions
    const actions = Utils.createElement('div', { className: 'config-actions' });
    
    const addAntsBtn = Utils.createElement('button', {
      textContent: '➕ Add Ants',
      className: 'primary'
    });
    
    const removeAntsBtn = Utils.createElement('button', {
      textContent: '➖ Remove Ants'
    });
    
    addAntsBtn.addEventListener('click', () => this.addAnts());
    removeAntsBtn.addEventListener('click', () => this.removeAnts());
    
    actions.appendChild(addAntsBtn);
    actions.appendChild(removeAntsBtn);
    container.appendChild(actions);
  }
  
  /**
   * Render behavior configuration tab
   */
  renderBehaviorTab(container) {
    const behaviorGroup = this.createConfigGroup('🧠 Behavior Parameters');
    
    // Exploration rate
    behaviorGroup.appendChild(this.createSliderControl(
      'explorationRate',
      'Exploration Rate',
      this.currentParams.explorationRate,
      { min: 0.0, max: 1.0, step: 0.05, format: (v) => `${Math.round(v * 100)}%` }
    ));
    
    // Social cohesion
    behaviorGroup.appendChild(this.createSliderControl(
      'socialCohesion',
      'Social Cohesion',
      this.currentParams.socialCohesion,
      { min: 0.0, max: 1.0, step: 0.05, format: (v) => `${Math.round(v * 100)}%` }
    ));
    
    container.appendChild(behaviorGroup);
    
    // Behavior actions
    const actions = Utils.createElement('div', { className: 'config-actions' });
    
    const resetBehaviorBtn = Utils.createElement('button', {
      textContent: '🔄 Reset Behaviors'
    });
    
    resetBehaviorBtn.addEventListener('click', () => this.resetAntBehaviors());
    actions.appendChild(resetBehaviorBtn);
    container.appendChild(actions);
  }
  
  /**
   * Render display configuration tab
   */
  renderDisplayTab(container) {
    const displayGroup = this.createConfigGroup('👁️ Display Options');
    
    // Show trails
    displayGroup.appendChild(this.createCheckboxControl(
      'showTrails',
      'Show Ant Trails',
      this.currentParams.showTrails
    ));
    
    // Show behavior states
    displayGroup.appendChild(this.createCheckboxControl(
      'showBehaviorStates',
      'Show Behavior States',
      this.currentParams.showBehaviorStates
    ));
    
    // Show environment details
    displayGroup.appendChild(this.createCheckboxControl(
      'showEnvironmentDetails',
      'Show Environment Details',
      this.currentParams.showEnvironmentDetails
    ));
    
    container.appendChild(displayGroup);
  }
  
  /**
   * Render advanced configuration tab
   */
  renderAdvancedTab(container) {
    const advancedGroup = this.createConfigGroup('⚙️ Advanced Settings');
    
    // Performance mode toggle
    advancedGroup.appendChild(this.createCheckboxControl(
      'performanceMode',
      'Performance Mode (Simplified Rendering)',
      false
    ));
    
    container.appendChild(advancedGroup);
    
    // Advanced actions
    const actions = Utils.createElement('div', { className: 'config-actions' });
    
    const exportConfigBtn = Utils.createElement('button', {
      textContent: '📤 Export Config'
    });
    
    const importConfigBtn = Utils.createElement('button', {
      textContent: '📥 Import Config'
    });
    
    exportConfigBtn.addEventListener('click', () => this.exportConfiguration());
    importConfigBtn.addEventListener('click', () => this.importConfiguration());
    
    actions.appendChild(exportConfigBtn);
    actions.appendChild(importConfigBtn);
    container.appendChild(actions);
  }
  
  /**
   * Create configuration group container
   */
  createConfigGroup(title) {
    const group = Utils.createElement('div', { className: 'config-group' });
    const titleEl = Utils.createElement('div', {
      className: 'config-group-title',
      textContent: title
    });
    group.appendChild(titleEl);
    return group;
  }
  
  /**
   * Create slider control
   */
  createSliderControl(key, label, value, options = {}) {
    const control = Utils.createElement('div', { className: 'config-control' });
    
    const labelEl = Utils.createElement('label', {
      textContent: label
    });
    
    const valueDisplay = Utils.createElement('span', {
      className: 'control-value',
      textContent: options.format ? options.format(value) : value
    });
    
    labelEl.appendChild(valueDisplay);
    
    const slider = Utils.createElement('input', {
      type: 'range',
      min: options.min || 0,
      max: options.max || 1,
      step: options.step || 0.1,
      value: value
    });
    
    slider.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);
      valueDisplay.textContent = options.format ? options.format(newValue) : newValue;
      this.updateParameter(key, newValue);
    });
    
    control.appendChild(labelEl);
    control.appendChild(slider);
    return control;
  }
  
  /**
   * Create checkbox control
   */
  createCheckboxControl(key, label, value) {
    const control = Utils.createElement('div', { className: 'config-control' });
    
    const labelEl = Utils.createElement('label', {
      textContent: label
    });
    
    const checkbox = Utils.createElement('input', {
      type: 'checkbox',
      checked: value
    });
    
    checkbox.addEventListener('change', (e) => {
      this.updateParameter(key, e.target.checked);
    });
    
    labelEl.insertBefore(checkbox, labelEl.firstChild);
    labelEl.insertBefore(document.createTextNode(' '), labelEl.children[1]);
    
    control.appendChild(labelEl);
    return control;
  }
  
  /**
   * Create select control
   */
  createSelectControl(key, label, value, options) {
    const control = Utils.createElement('div', { className: 'config-control' });
    
    const labelEl = Utils.createElement('label', {
      textContent: label
    });
    
    const select = Utils.createElement('select');
    
    options.forEach(option => {
      const optionEl = Utils.createElement('option', {
        value: option.value,
        textContent: option.label,
        selected: option.value === value
      });
      select.appendChild(optionEl);
    });
    
    select.addEventListener('change', (e) => {
      this.updateParameter(key, e.target.value);
    });
    
    control.appendChild(labelEl);
    control.appendChild(select);
    return control;
  }
  
  /**
   * Update a parameter value
   */
  updateParameter(key, value) {
    this.currentParams[key] = value;
    
    // Apply parameter to simulation
    this.applyParameterChange(key, value);
    
    Utils.addActivity(`⚙️ ${key} updated to ${value}`, 'info');
  }
  
  /**
   * Apply parameter change to simulation
   */
  applyParameterChange(key, value) {
    if (!this.app.simulation) return;
    
    switch (key) {
      case 'foodAbundance':
        // Update food spawn rate
        if (this.app.simulation.setFoodAbundance) {
          this.app.simulation.setFoodAbundance(value);
        }
        break;
        
      case 'maxPopulation':
        if (this.app.simulation.setMaxPopulation) {
          this.app.simulation.setMaxPopulation(value);
        }
        break;
        
      case 'antSpeed':
        if (this.app.simulation.setAntSpeed) {
          this.app.simulation.setAntSpeed(value);
        }
        break;
        
      case 'showTrails':
      case 'showBehaviorStates':
      case 'showEnvironmentDetails':
        this.app.settings[key] = value;
        this.app.updateRendererSettings();
        break;
        
      case 'season':
        if (this.app.simulation.setSeason) {
          this.app.simulation.setSeason(value);
        }
        break;
    }
  }
  
  /**
   * Switch to different tab
   */
  switchTab(tabKey) {
    if (this.configTabs[tabKey]) {
      this.currentTab = tabKey;
      
      // Update tab UI
      const tabs = this.panel.querySelectorAll('.config-tab');
      tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabKey);
      });
      
      // Re-render content
      this.renderTabContent();
    }
  }
  
  /**
   * Show the configuration panel
   */
  show() {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    this.updateParametersFromSimulation();
    Utils.addActivity('⚙️ Runtime configuration panel opened', 'info');
  }
  
  /**
   * Hide the configuration panel
   */
  hide() {
    this.isVisible = false;
    this.panel.classList.add('hidden');
    this.saveUserPreferences();
  }
  
  /**
   * Toggle panel visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Toggle dock state
   */
  toggleDock() {
    this.isDocked = !this.isDocked;
    this.panel.classList.toggle('docked', this.isDocked);
    
    const dockBtn = this.panel.querySelector('.dock-btn');
    if (dockBtn) {
      dockBtn.textContent = this.isDocked ? '🔓' : '📌';
      dockBtn.title = this.isDocked ? 'Undock panel' : 'Dock panel';
    }
  }
  
  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    const content = this.panel.querySelector('.config-panel-content');
    const tabNav = this.panel.querySelector('.config-tab-nav');
    
    if (content && tabNav) {
      const isMinimized = content.style.display === 'none';
      
      content.style.display = isMinimized ? 'block' : 'none';
      tabNav.style.display = isMinimized ? 'flex' : 'none';
      
      const minimizeBtn = this.panel.querySelector('.minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.textContent = isMinimized ? '➖' : '➕';
        minimizeBtn.title = isMinimized ? 'Minimize panel' : 'Expand panel';
      }
    }
  }
  
  /**
   * Start dragging the panel
   */
  startDrag(e) {
    if (this.isDocked) return;
    
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX - this.position.x;
    this.dragState.startY = e.clientY - this.position.y;
    
    this.panel.style.cursor = 'grabbing';
  }
  
  /**
   * Handle drag movement
   */
  onDrag(e) {
    if (!this.dragState.isDragging || this.isDocked) return;
    
    e.preventDefault();
    
    this.position.x = e.clientX - this.dragState.startX;
    this.position.y = e.clientY - this.dragState.startY;
    
    // Keep panel within viewport bounds
    this.position.x = Math.max(0, Math.min(this.position.x, window.innerWidth - this.panel.offsetWidth));
    this.position.y = Math.max(0, Math.min(this.position.y, window.innerHeight - this.panel.offsetHeight));
    
    this.panel.style.left = `${this.position.x}px`;
    this.panel.style.top = `${this.position.y}px`;
    this.panel.style.right = 'auto';
  }
  
  /**
   * End dragging
   */
  endDrag() {
    this.dragState.isDragging = false;
    this.panel.style.cursor = '';
  }
  
  /**
   * Update parameters from current simulation state
   */
  updateParametersFromSimulation() {
    if (!this.app.simulation) return;
    
    // Get current simulation parameters
    const simState = this.app.simulation.getState?.() || {};
    
    // Update cached parameters
    if (simState.environment) {
      this.currentParams.foodAbundance = simState.environment.foodAbundance || 1.0;
      this.currentParams.hazardLevel = simState.environment.hazardLevel || 0.5;
      this.currentParams.season = simState.environment.season || 'Spring';
    }
    
    if (simState.population) {
      this.currentParams.maxPopulation = simState.population.maxPopulation || 50;
    }
    
    // Update display settings from app
    if (this.app.settings) {
      this.currentParams.showTrails = this.app.settings.showTrails;
      this.currentParams.showBehaviorStates = this.app.settings.showBehaviorStates;
      this.currentParams.showEnvironmentDetails = this.app.settings.showEnvironmentDetails;
    }
  }
  
  /**
   * Trigger a weather event
   */
  triggerWeatherEvent() {
    if (this.app.simulation && this.app.simulation.triggerWeatherEvent) {
      this.app.simulation.triggerWeatherEvent();
      Utils.addActivity('🌧️ Weather event triggered', 'info');
    }
  }
  
  /**
   * Spawn food at random location
   */
  spawnFood() {
    if (this.app.simulation && this.app.simulation.spawnFood) {
      this.app.simulation.spawnFood();
      Utils.addActivity('🍯 Food spawned', 'success');
    }
  }
  
  /**
   * Add ants to the colony
   */
  addAnts() {
    const count = parseInt(prompt('How many ants to add?', '5'));
    if (count > 0 && this.app.simulation && this.app.simulation.addAnts) {
      this.app.simulation.addAnts(count);
      Utils.addActivity(`➕ Added ${count} ants to colony`, 'success');
    }
  }
  
  /**
   * Remove ants from the colony
   */
  removeAnts() {
    const count = parseInt(prompt('How many ants to remove?', '3'));
    if (count > 0 && this.app.simulation && this.app.simulation.removeAnts) {
      this.app.simulation.removeAnts(count);
      Utils.addActivity(`➖ Removed ${count} ants from colony`, 'info');
    }
  }
  
  /**
   * Reset ant behaviors to defaults
   */
  resetAntBehaviors() {
    if (this.app.simulation && this.app.simulation.resetAntBehaviors) {
      this.app.simulation.resetAntBehaviors();
      Utils.addActivity('🔄 Ant behaviors reset to defaults', 'info');
    }
  }
  
  /**
   * Export current configuration
   */
  exportConfiguration() {
    const config = {
      parameters: this.currentParams,
      worldConfig: this.app.menuManager?.getCurrentWorldConfig(),
      timestamp: Date.now(),
      version: 'v0.5'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ant-colony-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Utils.addActivity('📤 Configuration exported', 'success');
  }
  
  /**
   * Import configuration
   */
  importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const config = JSON.parse(e.target.result);
            
            if (config.parameters) {
              Object.keys(config.parameters).forEach(key => {
                if (this.currentParams.hasOwnProperty(key)) {
                  this.updateParameter(key, config.parameters[key]);
                }
              });
            }
            
            this.renderTabContent();
            Utils.addActivity('📥 Configuration imported', 'success');
          } catch (error) {
            Utils.addActivity('❌ Failed to import configuration', 'error');
          }
        };
        reader.readAsText(file);
      }
    });
    
    input.click();
  }
  
  /**
   * Load user preferences
   */
  loadUserPreferences() {
    const prefs = Utils.storage.get('runtimeConfigPrefs', {});
    
    if (prefs.position) {
      this.position = prefs.position;
      this.panel.style.left = `${this.position.x}px`;
      this.panel.style.top = `${this.position.y}px`;
      this.panel.style.right = 'auto';
    }
    
    if (prefs.isDocked !== undefined) {
      this.isDocked = prefs.isDocked;
      if (this.isDocked) {
        this.toggleDock();
      }
    }
    
    if (prefs.currentTab) {
      this.currentTab = prefs.currentTab;
    }
  }
  
  /**
   * Save user preferences
   */
  saveUserPreferences() {
    const prefs = {
      position: this.position,
      isDocked: this.isDocked,
      currentTab: this.currentTab
    };
    
    Utils.storage.set('runtimeConfigPrefs', prefs);
  }
}