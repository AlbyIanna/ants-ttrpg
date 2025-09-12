/**
 * Time Scale Manager for Ant Colony TTRPG
 * Version: v0.5 - Advanced Time Scaling System
 * Purpose: Manages extreme time scaling from 1:1 to 1 game month per real second
 */

import { Utils } from './utils.js';

export class TimeScaleManager {
  constructor() {
    // Time scale presets (simulation seconds per real second)
    this.timeScales = {
      REAL_TIME: 1,              // 1:1 - Real time
      MINUTE_SCALE: 60,          // 1 minute per second
      HOUR_SCALE: 3600,          // 1 hour per second
      DAY_SCALE: 86400,          // 1 day per second
      WEEK_SCALE: 604800,        // 1 week per second
      MONTH_SCALE: 2628000       // 1 month per second (30.4 days average)
    };
    
    // Current time scale
    this.currentScale = this.timeScales.MINUTE_SCALE;
    this.currentScaleName = 'MINUTE_SCALE';
    
    // Time tracking
    this.simulationTime = 0;      // Total simulation seconds elapsed
    this.lastUpdateTime = 0;      // Last real time update
    this.simulationStartTime = Date.now();
    
    // Time display formats
    this.timeFormats = {
      REAL_TIME: 'HH:MM:SS',
      MINUTE_SCALE: 'HH:MM:SS',
      HOUR_SCALE: 'DD/MM HH:MM',
      DAY_SCALE: 'DD/MM/YYYY',
      WEEK_SCALE: 'MM/YYYY Week WW',
      MONTH_SCALE: 'MM/YYYY'
    };
    
    // Simulation calendar
    this.calendar = {
      year: 1,
      month: 1,  // 1-12
      day: 1,    // 1-30
      hour: 6,   // 0-23 (start at 6 AM)
      minute: 0, // 0-59
      second: 0  // 0-59
    };
    
    // Season calculation
    this.seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    
    this.init();
  }
  
  /**
   * Initialize time scale manager
   */
  init() {
    this.lastUpdateTime = performance.now();
    this.setupUI();
  }
  
  /**
   * Set up time scale UI controls
   */
  setupUI() {
    // Add time scale controls to the control panel
    this.createTimeScaleControls();
    this.updateTimeDisplay();
  }
  
  /**
   * Create time scale control UI
   */
  createTimeScaleControls() {
    const controlPanel = document.querySelector('.control-panel .simulation-controls');
    if (!controlPanel) return;
    
    // Create time scale container
    const timeScaleContainer = Utils.createElement('div', {
      className: 'time-scale-control'
    });
    
    // Time scale selector
    const timeScaleSelect = Utils.createElement('select', {
      id: 'timeScaleSelect',
      className: 'time-scale-select'
    });
    
    const scaleOptions = [
      { value: 'REAL_TIME', label: 'Real Time (1:1)' },
      { value: 'MINUTE_SCALE', label: 'Minute Scale (1:60)' },
      { value: 'HOUR_SCALE', label: 'Hour Scale (1:3600)' },
      { value: 'DAY_SCALE', label: 'Day Scale (1 day/sec)' },
      { value: 'WEEK_SCALE', label: 'Week Scale (1 week/sec)' },
      { value: 'MONTH_SCALE', label: 'Month Scale (1 month/sec)' }
    ];
    
    scaleOptions.forEach(option => {
      const optionElement = Utils.createElement('option', {
        value: option.value,
        textContent: option.label
      });
      if (option.value === this.currentScaleName) {
        optionElement.selected = true;
      }
      timeScaleSelect.appendChild(optionElement);
    });
    
    // Time display
    const timeDisplay = Utils.createElement('div', {
      id: 'simulationTimeDisplay',
      className: 'simulation-time-display'
    });
    
    // Season display
    const seasonDisplay = Utils.createElement('div', {
      id: 'seasonDisplay', 
      className: 'season-display'
    });
    
    // Assemble controls
    const label = Utils.createElement('label', {
      textContent: 'Time Scale:'
    });
    
    timeScaleContainer.appendChild(label);
    timeScaleContainer.appendChild(timeScaleSelect);
    timeScaleContainer.appendChild(timeDisplay);
    timeScaleContainer.appendChild(seasonDisplay);
    
    // Insert after speed control
    const speedControl = controlPanel.querySelector('.speed-control');
    if (speedControl) {
      speedControl.insertAdjacentElement('afterend', timeScaleContainer);
    } else {
      controlPanel.appendChild(timeScaleContainer);
    }
    
    // Add event listener
    timeScaleSelect.addEventListener('change', (e) => {
      this.setTimeScale(e.target.value);
    });
    
    // Add CSS for the new controls
    this.addTimeScaleCSS();
  }
  
  /**
   * Add CSS for time scale controls
   */
  addTimeScaleCSS() {
    const style = document.createElement('style');
    style.textContent = `
      .time-scale-control {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 8px;
      }
      
      .time-scale-control label {
        font-size: 0.9em;
        font-weight: bold;
        color: #8B4513;
      }
      
      .time-scale-select {
        padding: 4px 8px;
        border: 2px solid #8B4513;
        border-radius: 4px;
        background: #F5DEB3;
        font-size: 0.85em;
        cursor: pointer;
      }
      
      .time-scale-select:hover {
        background: #DDBF94;
      }
      
      .simulation-time-display {
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
        font-weight: bold;
        color: #2D4A2B;
        text-align: center;
        background: rgba(255, 255, 255, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
      }
      
      .season-display {
        font-size: 0.85em;
        text-align: center;
        color: #5D4E37;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Update simulation time based on real time elapsed
   */
  update() {
    const now = performance.now();
    const realTimeDelta = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    
    if (realTimeDelta > 0) {
      const simulationTimeDelta = realTimeDelta * this.currentScale;
      this.simulationTime += simulationTimeDelta;
      
      // Update calendar
      this.updateCalendar(simulationTimeDelta);
      
      // Update display
      this.updateTimeDisplay();
      
      this.lastUpdateTime = now;
    }
    
    return {
      realTimeDelta,
      simulationTimeDelta: realTimeDelta * this.currentScale,
      totalSimulationTime: this.simulationTime,
      calendar: { ...this.calendar },
      season: this.getCurrentSeason(),
      timeScale: this.currentScale
    };
  }
  
  /**
   * Update calendar based on simulation time delta
   */
  updateCalendar(deltaSeconds) {
    this.calendar.second += deltaSeconds;
    
    // Handle second overflow
    if (this.calendar.second >= 60) {
      const minutes = Math.floor(this.calendar.second / 60);
      this.calendar.second = this.calendar.second % 60;
      this.calendar.minute += minutes;
    }
    
    // Handle minute overflow  
    if (this.calendar.minute >= 60) {
      const hours = Math.floor(this.calendar.minute / 60);
      this.calendar.minute = this.calendar.minute % 60;
      this.calendar.hour += hours;
    }
    
    // Handle hour overflow
    if (this.calendar.hour >= 24) {
      const days = Math.floor(this.calendar.hour / 24);
      this.calendar.hour = this.calendar.hour % 24;
      this.calendar.day += days;
    }
    
    // Handle day overflow (simplified 30-day months)
    if (this.calendar.day > 30) {
      const months = Math.floor(this.calendar.day / 30);
      this.calendar.day = ((this.calendar.day - 1) % 30) + 1;
      this.calendar.month += months;
    }
    
    // Handle month overflow
    if (this.calendar.month > 12) {
      const years = Math.floor(this.calendar.month / 12);
      this.calendar.month = ((this.calendar.month - 1) % 12) + 1;
      this.calendar.year += years;
    }
  }
  
  /**
   * Get current season based on calendar
   */
  getCurrentSeason() {
    const seasonIndex = Math.floor((this.calendar.month - 1) / 3);
    return this.seasons[seasonIndex];
  }
  
  /**
   * Format time for display based on current scale
   */
  formatTime() {
    const { year, month, day, hour, minute, second } = this.calendar;
    
    switch (this.currentScaleName) {
      case 'REAL_TIME':
      case 'MINUTE_SCALE':
        return `${hour.toString().padStart(2, '0')}:${Math.floor(minute).toString().padStart(2, '0')}:${Math.floor(second).toString().padStart(2, '0')}`;
        
      case 'HOUR_SCALE':
        return `Day ${day}, ${hour.toString().padStart(2, '0')}:${Math.floor(minute).toString().padStart(2, '0')}`;
        
      case 'DAY_SCALE':
        return `Year ${year}, Month ${month}, Day ${day}`;
        
      case 'WEEK_SCALE':
        const week = Math.ceil(day / 7);
        return `Year ${year}, Month ${month}, Week ${week}`;
        
      case 'MONTH_SCALE':
        return `Year ${year}, Month ${month}`;
        
      default:
        return 'Unknown Time';
    }
  }
  
  /**
   * Update time display in UI
   */
  updateTimeDisplay() {
    const timeDisplay = document.getElementById('simulationTimeDisplay');
    const seasonDisplay = document.getElementById('seasonDisplay');
    const elapsedTime = document.getElementById('elapsedTime');
    
    if (timeDisplay) {
      timeDisplay.textContent = this.formatTime();
    }
    
    if (seasonDisplay) {
      seasonDisplay.textContent = `${this.getCurrentSeason()} (${this.currentScaleName.replace('_', ' ')})`;
    }
    
    if (elapsedTime) {
      elapsedTime.textContent = this.formatTime();
    }
  }
  
  /**
   * Set time scale
   */
  setTimeScale(scaleName) {
    if (this.timeScales[scaleName]) {
      const oldScale = this.currentScale;
      this.currentScale = this.timeScales[scaleName];
      this.currentScaleName = scaleName;
      
      Utils.addActivity(`⏰ Time scale changed to ${scaleName.replace('_', ' ')} (${this.currentScale}:1)`, 'info');
      
      // Update display immediately
      this.updateTimeDisplay();
      
      // Emit time scale change event
      Utils.eventEmitter.emit('timeScaleChanged', {
        oldScale,
        newScale: this.currentScale,
        scaleName
      });
    }
  }
  
  /**
   * Get simulation time info
   */
  getTimeInfo() {
    return {
      simulationTime: this.simulationTime,
      calendar: { ...this.calendar },
      season: this.getCurrentSeason(),
      timeScale: this.currentScale,
      scaleName: this.currentScaleName,
      formattedTime: this.formatTime()
    };
  }
  
  /**
   * Reset simulation time
   */
  reset() {
    this.simulationTime = 0;
    this.calendar = {
      year: 1,
      month: 1,
      day: 1,
      hour: 6,
      minute: 0,
      second: 0
    };
    this.lastUpdateTime = performance.now();
    this.simulationStartTime = Date.now();
    
    this.updateTimeDisplay();
    Utils.addActivity('⏰ Simulation time reset', 'info');
  }
  
  /**
   * Set specific calendar date
   */
  setCalendar(year, month, day, hour = 6, minute = 0, second = 0) {
    this.calendar = { year, month, day, hour, minute, second };
    this.updateTimeDisplay();
    
    Utils.addActivity(`📅 Calendar set to Year ${year}, Month ${month}, Day ${day}`, 'info');
  }
  
  /**
   * Get time scale multiplier effect on various game systems
   */
  getScaleEffects() {
    const baseScale = this.currentScale;
    
    return {
      antMovementSpeed: Math.min(baseScale / 60, 10), // Cap movement speed boost
      foodGrowthRate: baseScale,
      seasonChangeRate: baseScale,
      populationGrowthRate: Math.sqrt(baseScale), // Slower population growth
      eventFrequency: Math.log10(Math.max(baseScale, 10)), // Logarithmic event scaling
      weatherChangeRate: baseScale
    };
  }
}