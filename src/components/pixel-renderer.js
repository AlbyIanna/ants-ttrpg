/**
 * Pixel-based Canvas Renderer for Ant Colony TTRPG
 * Version: v0.5 - ES6 Module Version
 */

import { Utils } from './utils.js';

export class PixelRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.lastRenderedState = null;
    
    // World settings
    this.worldWidth = 75;
    this.worldHeight = 50;
    
    // Configurable pixel density for performance tuning
    this.pixelDensityOptions = {
      LOW: 1,    // 1px per cell - ultra performance
      MEDIUM: 2, // 2px per cell - balanced
      HIGH: 4,   // 4px per cell - high detail
      ULTRA: 10  // 10px per cell - maximum detail (default)
    };
    this.pixelSize = this.pixelDensityOptions.ULTRA; // Default to current size
    
    // Canvas dimensions
    this.canvasWidth = this.worldWidth * this.pixelSize;
    this.canvasHeight = this.worldHeight * this.pixelSize;
    
    // Display options
    this.showTrails = true;
    this.showBehaviorStates = true;
    this.showEnvironmentDetails = true;
    
    // Camera/viewport
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1
    };
    
    // Viewport dimensions (will be set in init)
    this.viewport = {
      width: 0,
      height: 0
    };
    
    // Colors for different elements
    this.colors = {
      background: '#0a0e1a',
      empty: '#1a202c',
      nest: '#ffd700',
      ant: '#ef4444',
      worker: '#22c55e',
      scout: '#3b82f6',
      soldier: '#dc2626',
      food: '#f59e0b',
      berries: '#8b5cf6',
      seeds: '#f97316',
      nectar: '#10b981',
      wood: '#a16207',
      rock: '#64748b',
      grass: '#22c55e',
      trail: '#4fd1c7',
      water: '#0ea5e9'
    };
    
    // Animation settings
    this.animationDuration = 300;
    this.lastRenderTime = 0;
    
    // Performance monitoring
    this.performanceStats = {
      frameCount: 0,
      lastFPSUpdate: Date.now(),
      fps: 0,
      renderTime: 0,
      memoryUsage: 0,
      visibleObjects: 0,
      totalObjects: 0,
      performanceStatus: 'optimal'
    };
    
    // Performance warning throttling (prevent spam)
    this.lastPerformanceWarning = 0;
    this.performanceWarningCooldown = 10000; // 10 seconds
    
    // Initialize when DOM is ready
    this.init();
  }

  /**
   * Initialize the pixel renderer
   */
  init() {
    // Get canvas element
    this.canvas = document.getElementById('colonyCanvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }
    
    // Get 2D context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Failed to get 2D context');
      return;
    }
    
    // Set canvas size - both internal resolution and display size
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    // Let canvas display at its natural size (no CSS scaling)
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    
    // Initialize viewport dimensions
    this.viewport.width = this.canvasWidth;
    this.viewport.height = this.canvasHeight;
    
    // Set rendering properties for pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Initial render
    this.clearCanvas();
    
    console.log('✅ Pixel renderer initialized', {
      worldSize: `${this.worldWidth}x${this.worldHeight}`,
      canvasSize: `${this.canvasWidth}x${this.canvasHeight}`,
      pixelSize: this.pixelSize
    });
  }

  /**
   * Set up canvas event handlers
   */
  setupEventHandlers() {
    // Mouse drag panning
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Mouse down - start dragging
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    // Mouse move - handle dragging and hovering
    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        // Calculate drag distance
        const deltaX = (e.clientX - lastMouseX) / this.camera.zoom / this.pixelSize;
        const deltaY = (e.clientY - lastMouseY) / this.camera.zoom / this.pixelSize;
        
        // Pan camera (opposite direction)
        this.panBy(-deltaX, -deltaY);
        
        // Update UI and re-render
        this.updateCameraUI();
        this.refreshRender();
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      } else {
        // Handle pixel hover
        const worldCoord = this.screenToWorldCoordinate(e);
        this.handlePixelHover(worldCoord.x, worldCoord.y);
      }
    });

    // Mouse up - stop dragging
    this.canvas.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Mouse leave - stop dragging
    this.canvas.addEventListener('mouseleave', () => {
      if (isDragging) {
        isDragging = false;
        this.canvas.style.cursor = 'crosshair';
      }
    });

    // Mouse click - handle inspection
    this.canvas.addEventListener('click', (e) => {
      if (!isDragging) {
        const worldCoord = this.screenToWorldCoordinate(e);
        this.handlePixelClick(worldCoord.x, worldCoord.y);
      }
    });

    // Mouse wheel - zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      this.zoomTowardPoint(this.camera.zoom * zoomFactor, mouseX, mouseY);
      this.updateCameraUI();
      this.refreshRender();
    });

    // Setup button event handlers
    this.setupButtonHandlers();
    
    // Setup keyboard handlers
    this.setupKeyboardHandlers();
    
    // Setup mini-map
    this.setupMiniMap();
  }

  /**
   * Convert screen event to world coordinates
   */
  screenToWorldCoordinate(event) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    return this.screenToWorld(screenX, screenY);
  }

  /**
   * Setup button event handlers
   */
  setupButtonHandlers() {
    const panStep = 10; // pixels to pan per button press
    
    // Pan buttons
    document.getElementById('panUp')?.addEventListener('click', () => {
      this.panBy(0, -panStep);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    document.getElementById('panDown')?.addEventListener('click', () => {
      this.panBy(0, panStep);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    document.getElementById('panLeft')?.addEventListener('click', () => {
      this.panBy(-panStep, 0);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    document.getElementById('panRight')?.addEventListener('click', () => {
      this.panBy(panStep, 0);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    // Zoom buttons
    document.getElementById('zoomIn')?.addEventListener('click', () => {
      this.zoomBy(1.25);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', () => {
      this.zoomBy(0.8);
      this.updateCameraUI();
      this.refreshRender();
    });
    
    // Reset view button
    document.getElementById('resetView')?.addEventListener('click', () => {
      this.resetCamera();
      this.updateCameraUI();
      this.refreshRender();
    });
  }

  /**
   * Setup keyboard event handlers
   */
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // Only handle if not typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const panStep = 15; // pixels to pan per key press
      let handled = false;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.panBy(0, -panStep);
          handled = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.panBy(0, panStep);
          handled = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.panBy(-panStep, 0);
          handled = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.panBy(panStep, 0);
          handled = true;
          break;
        case '+':
        case '=':
          this.zoomBy(1.25);
          handled = true;
          break;
        case '-':
        case '_':
          this.zoomBy(0.8);
          handled = true;
          break;
        case 'Escape':
        case 'Home':
          this.resetCamera();
          handled = true;
          break;
      }
      
      if (handled) {
        e.preventDefault();
        this.updateCameraUI();
        this.refreshRender();
      }
    });
  }

  /**
   * Update camera UI elements
   */
  updateCameraUI() {
    const zoomLevelElement = document.getElementById('zoomLevel');
    if (zoomLevelElement) {
      zoomLevelElement.textContent = `${this.camera.zoom.toFixed(1)}x`;
    }
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats(state, renderTime = 0) {
    const now = Date.now();
    
    // Update frame count and FPS
    this.performanceStats.frameCount++;
    if (now - this.performanceStats.lastFPSUpdate >= 1000) {
      this.performanceStats.fps = this.performanceStats.frameCount;
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFPSUpdate = now;
    }
    
    // Update render time
    this.performanceStats.renderTime = renderTime;
    
    // Update memory usage (if available)
    if (performance.memory) {
      this.performanceStats.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
    }
    
    // Calculate visible vs total objects
    if (state) {
      const bounds = this.getVisibleBounds();
      let visibleAnts = 0;
      let visibleFood = 0;
      
      if (state.ants) {
        visibleAnts = state.ants.filter(ant => 
          ant.position.x >= bounds.left && ant.position.x <= bounds.right &&
          ant.position.y >= bounds.top && ant.position.y <= bounds.bottom
        ).length;
      }
      
      if (state.environment?.foodSources) {
        visibleFood = state.environment.foodSources.filter(food => 
          food.x >= bounds.left && food.x <= bounds.right &&
          food.y >= bounds.top && food.y <= bounds.bottom
        ).length;
      }
      
      this.performanceStats.visibleObjects = visibleAnts + visibleFood;
      this.performanceStats.totalObjects = (state.ants?.length || 0) + (state.environment?.foodSources?.length || 0);
    }
    
    // Determine performance status
    if (this.performanceStats.fps >= 30 && renderTime <= 16) {
      this.performanceStats.performanceStatus = 'optimal';
    } else if (this.performanceStats.fps >= 20 && renderTime <= 33) {
      this.performanceStats.performanceStatus = 'good';
    } else if (this.performanceStats.fps >= 15 && renderTime <= 50) {
      this.performanceStats.performanceStatus = 'fair';
    } else {
      this.performanceStats.performanceStatus = 'poor';
    }
    
    // Update UI
    this.updatePerformanceUI();
  }

  /**
   * Update performance UI elements
   */
  updatePerformanceUI() {
    const stats = this.performanceStats;
    
    Utils.updateElement('renderTime', `${stats.renderTime.toFixed(1)}ms`);
    Utils.updateElement('visibleObjects', `${stats.visibleObjects}/${stats.totalObjects}`);
    Utils.updateElement('memoryUsage', `${stats.memoryUsage.toFixed(1)}MB`);
    
    // Update performance status indicator
    const perfStatusElement = document.getElementById('perfStatus');
    if (perfStatusElement) {
      const statusMap = {
        optimal: '🟢',
        good: '🟡',
        fair: '🟠', 
        poor: '🔴'
      };
      perfStatusElement.textContent = statusMap[stats.performanceStatus] || '🟢';
      perfStatusElement.title = `Performance: ${stats.performanceStatus} (${stats.fps} FPS, ${stats.renderTime.toFixed(1)}ms render)`;
    }
    
    // Add performance warnings to activity feed if needed
    if (stats.performanceStatus === 'poor' && stats.frameCount === 0) { // Only once per second
      this.addPerformanceWarning();
    }
  }

  /**
   * Add performance warning to activity feed (throttled to prevent spam)
   */
  addPerformanceWarning() {
    const now = Date.now();
    
    // Throttle warnings - only show once every 10 seconds
    if (now - this.lastPerformanceWarning < this.performanceWarningCooldown) {
      return;
    }
    
    const stats = this.performanceStats;
    let message = '';
    let suggestions = [];
    
    if (stats.fps < 15) {
      message = `⚠️ Low FPS (${stats.fps})`;
      suggestions.push('zoom out', 'reduce world size', 'lower pixel density');
    } else if (stats.renderTime > 50) {
      message = `⚠️ Slow rendering (${stats.renderTime.toFixed(1)}ms)`;
      suggestions.push('zoom out', 'lower pixel density');
    }
    
    if (message && suggestions.length > 0) {
      message += `. Try: ${suggestions.join(', ')}.`;
      Utils.addActivity(message, 'warning');
      this.lastPerformanceWarning = now;
    }
  }

  /**
   * Reset camera to default position and zoom
   */
  resetCamera() {
    this.camera.x = 0;
    this.camera.y = 0;
    this.camera.zoom = 1;
  }

  /**
   * Refresh rendering with current state
   */
  refreshRender() {
    if (this.lastRenderedState) {
      this.render(this.lastRenderedState);
    }
  }

  /**
   * Initialize and setup mini-map
   */
  setupMiniMap() {
    this.minimapCanvas = document.getElementById('minimapCanvas');
    if (!this.minimapCanvas) return;
    
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.minimapCtx.imageSmoothingEnabled = false;
    
    // Mini-map click handler
    this.minimapCanvas.addEventListener('click', (e) => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      const clickY = (e.clientY - rect.top) / rect.height;
      
      // Convert to world coordinates
      const worldX = clickX * this.worldWidth;
      const worldY = clickY * this.worldHeight;
      
      // Pan camera to clicked location
      this.panTo(worldX - this.viewport.width / this.camera.zoom / this.pixelSize / 2,
                 worldY - this.viewport.height / this.camera.zoom / this.pixelSize / 2);
      
      this.updateCameraUI();
      this.refreshRender();
    });
  }

  /**
   * Render mini-map
   */
  renderMiniMap(state) {
    if (!this.minimapCanvas || !this.minimapCtx || !state.environment) return;
    
    const miniWidth = this.minimapCanvas.width;
    const miniHeight = this.minimapCanvas.height;
    
    // Clear mini-map
    this.minimapCtx.fillStyle = '#000';
    this.minimapCtx.fillRect(0, 0, miniWidth, miniHeight);
    
    // Scale factors
    const scaleX = miniWidth / this.worldWidth;
    const scaleY = miniHeight / this.worldHeight;
    
    // Render world overview (simplified)
    const terrain = state.environment.terrain || [];
    for (let y = 0; y < Math.min(this.worldHeight, terrain.length); y += 2) {
      for (let x = 0; x < Math.min(this.worldWidth, terrain[y]?.length || 0); x += 2) {
        const terrainType = terrain[y][x];
        let color = '#1a202c'; // default empty
        
        switch (terrainType) {
          case '🏠': color = '#ffd700'; break; // nest
          case '🪨': color = '#64748b'; break; // rock
          case '🌱': color = '#22c55e'; break; // grass
          case '💧': color = '#0ea5e9'; break; // water
        }
        
        this.minimapCtx.fillStyle = color;
        this.minimapCtx.fillRect(x * scaleX, y * scaleY, scaleX * 2, scaleY * 2);
      }
    }
    
    // Render food sources
    if (state.environment.foodSources) {
      this.minimapCtx.fillStyle = '#f59e0b';
      state.environment.foodSources.forEach(food => {
        if (food.discovered && !food.depleted) {
          this.minimapCtx.fillRect(food.x * scaleX - 1, food.y * scaleY - 1, 2, 2);
        }
      });
    }
    
    // Render ants (simplified)
    if (state.ants && state.ants.length > 0) {
      this.minimapCtx.fillStyle = '#ef4444';
      state.ants.forEach(ant => {
        this.minimapCtx.fillRect(ant.position.x * scaleX, ant.position.y * scaleY, 1, 1);
      });
    }
    
    // Render camera viewport
    const viewBounds = this.getVisibleBounds();
    this.minimapCtx.strokeStyle = '#4fd1c7';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.strokeRect(
      viewBounds.left * scaleX,
      viewBounds.top * scaleY,
      (viewBounds.right - viewBounds.left) * scaleX,
      (viewBounds.bottom - viewBounds.top) * scaleY
    );
  }

  /**
   * Main render function
   */
  render(state, simulationStats = {}) {
    if (!state || !this.ctx) return;
    
    Utils.performance.start('pixelRender');
    
    // Clear canvas
    this.clearCanvas();
    
    // Render the world
    this.renderWorld(state);
    
    // Render mini-map
    this.renderMiniMap(state);
    
    // Update camera UI
    this.updateCameraUI();
    
    const renderTime = Utils.performance.end('pixelRender');
    
    // Update performance statistics
    this.updatePerformanceStats(state, renderTime);
    
    // Update status panels (reuse from old renderer for now)
    this.updateStatusPanels(state, simulationStats);
    
    // Update activity feed
    if (state.recentDiscoveries && state.recentDiscoveries.length > 0) {
      this.updateActivityFeed(state.recentDiscoveries);
    }
    
    this.lastRenderedState = state;
    this.lastRenderTime = Date.now();
  }

  /**
   * Clear the entire canvas
   */
  clearCanvas() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  /**
   * Render the world
   */
  renderWorld(state) {
    const environment = state.environment;
    const ants = state.ants || [];
    
    if (!environment) return;
    
    // Create ant position lookup
    const antPositions = {};
    ants.forEach(ant => {
      const key = `${ant.position.x},${ant.position.y}`;
      antPositions[key] = ant;
    });
    
    // Render terrain first
    this.renderTerrain(environment);
    
    // Render food sources
    this.renderFoodSources(environment);
    
    // Render trails if enabled
    if (this.showTrails && state.recentMovements) {
      this.renderTrails(state.recentMovements);
    }
    
    // Render ants on top
    this.renderAnts(ants);
  }

  /**
   * Render terrain (with viewport culling)
   */
  renderTerrain(environment) {
    const terrain = environment.terrain || [];
    
    // Get visible tile bounds for optimization
    const bounds = this.getVisibleTileBounds();
    
    // Only render visible tiles
    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        // Get terrain type (default to empty if beyond current environment)
        let terrainType = '.';
        if (terrain[y] && terrain[y][x]) {
          terrainType = terrain[y][x];
        }
        
        // Render terrain sprite
        this.drawTerrainSprite(x, y, terrainType);
      }
    }
  }

  /**
   * Render food sources (with viewport culling)
   */
  renderFoodSources(environment) {
    if (!environment.foodSources) return;
    
    const bounds = this.getVisibleBounds();
    
    environment.foodSources.forEach(food => {
      if (food.discovered && !food.depleted) {
        // Only render if food source is visible
        if (food.x >= bounds.left && food.x <= bounds.right &&
            food.y >= bounds.top && food.y <= bounds.bottom) {
          this.drawFoodSprite(food.x, food.y, food.type);
        }
      }
    });
  }

  /**
   * Render ant trails
   */
  renderTrails(movements) {
    movements.forEach(movement => {
      // Draw trail pixels at both from and to positions
      this.drawPixel(movement.from.x, movement.from.y, this.colors.trail, 0.3);
      this.drawPixel(movement.to.x, movement.to.y, this.colors.trail, 0.3);
    });
  }

  /**
   * Render ants (with viewport culling)
   */
  renderAnts(ants) {
    const bounds = this.getVisibleBounds();
    
    ants.forEach(ant => {
      // Only render if ant is visible
      if (ant.position.x >= bounds.left && ant.position.x <= bounds.right &&
          ant.position.y >= bounds.top && ant.position.y <= bounds.bottom) {
        this.drawAntSprite(ant.position.x, ant.position.y, ant);
      }
    });
  }

  /**
   * Draw a single pixel at world coordinates
   */
  drawPixel(x, y, color, alpha = 1) {
    if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) return;
    
    // Transform world coordinates to screen coordinates
    const screenPos = this.worldToScreen(x, y);
    const pixelSize = this.pixelSize * this.camera.zoom;
    
    if (alpha < 1) {
      this.ctx.globalAlpha = alpha;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
    
    if (alpha < 1) {
      this.ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw a terrain sprite
   */
  drawTerrainSprite(x, y, terrainType) {
    const screenPos = this.worldToScreen(x, y);
    const pixelSize = this.pixelSize * this.camera.zoom;
    
    switch (terrainType) {
      case '🏠': // Nest - brown with entrance
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, pixelSize - 2*this.camera.zoom, pixelSize - 2*this.camera.zoom);
        break;
        
      case '🪨': // Rock - gray with highlights
        this.ctx.fillStyle = '#64748b';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.fillRect(screenPos.x, screenPos.y, this.camera.zoom, this.camera.zoom);
        break;
        
      case '🌱': // Grass - green with texture
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#16a34a';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + 2*this.camera.zoom, this.camera.zoom, this.camera.zoom);
        this.ctx.fillRect(screenPos.x + 2*this.camera.zoom, screenPos.y + this.camera.zoom, this.camera.zoom, this.camera.zoom);
        break;
        
      case '💧': // Water - blue with ripples
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, this.camera.zoom, this.camera.zoom);
        this.ctx.fillRect(screenPos.x + 2*this.camera.zoom, screenPos.y + 2*this.camera.zoom, this.camera.zoom, this.camera.zoom);
        break;
        
      default: // Empty space
        this.ctx.fillStyle = this.colors.empty;
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        break;
    }
  }

  /**
   * Draw a food sprite
   */
  drawFoodSprite(x, y, foodType) {
    const screenPos = this.worldToScreen(x, y);
    const pixelSize = this.pixelSize * this.camera.zoom;
    
    switch (foodType) {
      case 'berries': // Purple berries
        this.ctx.fillStyle = '#8b5cf6';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#a855f7';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, 2*this.camera.zoom, 2*this.camera.zoom);
        break;
        
      case 'seeds': // Brown seeds
        this.ctx.fillStyle = '#f97316';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#ea580c';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, this.camera.zoom, this.camera.zoom);
        this.ctx.fillRect(screenPos.x + 2*this.camera.zoom, screenPos.y + 2*this.camera.zoom, this.camera.zoom, this.camera.zoom);
        break;
        
      case 'nectar': // Golden nectar
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#34d399';
        this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, 2*this.camera.zoom, 2*this.camera.zoom);
        break;
        
      case 'wood': // Brown wood
        this.ctx.fillStyle = '#a16207';
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        this.ctx.fillStyle = '#d97706';
        this.ctx.fillRect(screenPos.x, screenPos.y + this.camera.zoom, pixelSize, this.camera.zoom);
        break;
        
      default: // Generic food
        this.ctx.fillStyle = this.colors.food;
        this.ctx.fillRect(screenPos.x, screenPos.y, pixelSize, pixelSize);
        break;
    }
  }

  /**
   * Draw an ant sprite
   */
  drawAntSprite(x, y, ant) {
    const screenPos = this.worldToScreen(x, y);
    const pixelSize = this.pixelSize * this.camera.zoom;
    
    // Base ant body
    let bodyColor, accentColor;
    
    switch (ant.role) {
      case 'worker':
        bodyColor = '#22c55e';
        accentColor = '#16a34a';
        break;
      case 'scout':
        bodyColor = '#3b82f6';
        accentColor = '#1d4ed8';
        break;
      case 'soldier':
        bodyColor = '#dc2626';
        accentColor = '#991b1b';
        break;
      default:
        bodyColor = '#ef4444';
        accentColor = '#dc2626';
        break;
    }
    
    // Draw ant body
    this.ctx.fillStyle = bodyColor;
    this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y + this.camera.zoom, 2*this.camera.zoom, 2*this.camera.zoom);
    
    // Draw ant details
    this.ctx.fillStyle = accentColor;
    this.ctx.fillRect(screenPos.x, screenPos.y + this.camera.zoom, this.camera.zoom, this.camera.zoom); // Head
    this.ctx.fillRect(screenPos.x + 3*this.camera.zoom, screenPos.y + this.camera.zoom, this.camera.zoom, this.camera.zoom); // Abdomen
    
    // Add glow if carrying food
    if (ant.carryingFood) {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillRect(screenPos.x + this.camera.zoom, screenPos.y, 2*this.camera.zoom, this.camera.zoom);
    }
  }

  /**
   * Handle pixel click
   */
  handlePixelClick(x, y) {
    if (!this.lastRenderedState) return;
    
    // Find ant at this position
    const ant = this.lastRenderedState.ants?.find(a => 
      a.position.x === x && a.position.y === y
    );
    
    if (ant) {
      this.showAntDetails(ant);
    } else {
      this.showTerrainInfo(x, y);
    }
  }

  /**
   * Handle pixel hover
   */
  handlePixelHover(x, y) {
    if (!this.lastRenderedState) return;
    
    // Find ant at this position
    const ant = this.lastRenderedState.ants?.find(a => 
      a.position.x === x && a.position.y === y
    );
    
    if (ant) {
      this.canvas.title = `${ant.role.toUpperCase()} ant (${ant.state}) at (${x}, ${y})`;
    } else {
      // Check for food
      const food = this.lastRenderedState.environment?.foodSources?.find(f =>
        f.x === x && f.y === y && f.discovered && !f.depleted
      );
      
      if (food) {
        this.canvas.title = `${food.type} (${food.nutrition.toFixed(1)} nutrition) at (${x}, ${y})`;
      } else {
        this.canvas.title = `Position: (${x}, ${y})`;
      }
    }
  }

  /**
   * Show ant details modal
   */
  showAntDetails(ant) {
    const details = `
      <div class="ant-detail-grid">
        <div><strong>Role:</strong> ${ant.role.toUpperCase()}</div>
        <div><strong>State:</strong> ${ant.state}</div>
        <div><strong>Position:</strong> (${ant.position.x}, ${ant.position.y})</div>
        <div><strong>Energy:</strong> ${ant.energy}/${ant.energyMax || 100}</div>
        <div><strong>Carrying Food:</strong> ${ant.carryingFood ? 'Yes' : 'No'}</div>
      </div>
    `;
    
    Utils.showModal(`Ant #${ant.id} Details`, details);
  }

  /**
   * Show terrain info
   */
  showTerrainInfo(x, y) {
    const environment = this.lastRenderedState?.environment;
    let terrain = '.';
    
    if (environment && environment.terrain[y] && environment.terrain[y][x]) {
      terrain = environment.terrain[y][x];
    }
    
    let info = `<div>Position: (${x}, ${y})</div>`;
    info += `<div>Terrain: ${terrain}</div>`;
    
    Utils.showModal('Terrain Information', info);
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
   * Update activity feed
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
   * Set display options
   */
  setDisplayOptions(options) {
    if (options.showTrails !== undefined) this.showTrails = options.showTrails;
    if (options.showBehaviorStates !== undefined) this.showBehaviorStates = options.showBehaviorStates;
    if (options.showEnvironmentDetails !== undefined) this.showEnvironmentDetails = options.showEnvironmentDetails;
    
    this.forceRerender();
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
   * Get renderer statistics
   */
  getStats() {
    return {
      lastRenderTime: this.lastRenderTime,
      worldSize: { width: this.worldWidth, height: this.worldHeight },
      canvasSize: { width: this.canvasWidth, height: this.canvasHeight },
      pixelSize: this.pixelSize,
      displayOptions: {
        showTrails: this.showTrails,
        showBehaviorStates: this.showBehaviorStates,
        showEnvironmentDetails: this.showEnvironmentDetails
      }
    };
  }

  // Camera/Viewport Methods

  /**
   * Pan camera to specific world coordinates
   */
  panTo(x, y) {
    this.camera.x = this.clampCameraX(x);
    this.camera.y = this.clampCameraY(y);
  }

  /**
   * Pan camera by relative offset
   */
  panBy(deltaX, deltaY) {
    this.panTo(this.camera.x + deltaX, this.camera.y + deltaY);
  }

  /**
   * Zoom to specific level
   */
  zoomTo(zoomLevel) {
    this.camera.zoom = this.clampZoom(zoomLevel);
  }

  /**
   * Zoom by relative factor
   */
  zoomBy(factor) {
    this.zoomTo(this.camera.zoom * factor);
  }

  /**
   * Zoom toward a specific screen point
   */
  zoomTowardPoint(zoomLevel, screenX, screenY) {
    // Convert screen point to world coordinates before zoom
    const worldPoint = this.screenToWorld(screenX, screenY);
    
    // Apply zoom
    this.zoomTo(zoomLevel);
    
    // Convert world point back to screen coordinates after zoom
    const newScreenPoint = this.worldToScreen(worldPoint.x, worldPoint.y);
    
    // Calculate the difference in screen coordinates and convert to world coordinates
    const screenDeltaX = screenX - newScreenPoint.x;
    const screenDeltaY = screenY - newScreenPoint.y;
    
    // Convert screen delta to world delta (divide by zoom and pixel size)
    const worldDeltaX = screenDeltaX / (this.camera.zoom * this.pixelSize);
    const worldDeltaY = screenDeltaY / (this.camera.zoom * this.pixelSize);
    
    // Adjust camera to keep the world point at the same screen location
    this.panBy(worldDeltaX, worldDeltaY);
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    const worldX = (screenX / this.camera.zoom / this.pixelSize) + this.camera.x;
    const worldY = (screenY / this.camera.zoom / this.pixelSize) + this.camera.y;
    return { x: Math.floor(worldX), y: Math.floor(worldY) };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    const screenX = (worldX - this.camera.x) * this.pixelSize * this.camera.zoom;
    const screenY = (worldY - this.camera.y) * this.pixelSize * this.camera.zoom;
    return { x: screenX, y: screenY };
  }

  /**
   * Get visible world bounds
   */
  getVisibleBounds() {
    const viewportWidth = this.viewport.width / this.camera.zoom / this.pixelSize;
    const viewportHeight = this.viewport.height / this.camera.zoom / this.pixelSize;
    
    return {
      left: this.camera.x,
      top: this.camera.y,
      right: this.camera.x + viewportWidth,
      bottom: this.camera.y + viewportHeight
    };
  }

  /**
   * Get visible tile bounds for rendering optimization
   */
  getVisibleTileBounds() {
    const bounds = this.getVisibleBounds();
    
    return {
      startX: Math.max(0, Math.floor(bounds.left)),
      startY: Math.max(0, Math.floor(bounds.top)),
      endX: Math.min(this.worldWidth, Math.ceil(bounds.right)),
      endY: Math.min(this.worldHeight, Math.ceil(bounds.bottom))
    };
  }

  /**
   * Update world size and adjust camera if needed
   */
  updateWorldSize(width, height) {
    this.worldWidth = width;
    this.worldHeight = height;
    
    // Update canvas size calculations
    this.canvasWidth = this.worldWidth * this.pixelSize;
    this.canvasHeight = this.worldHeight * this.pixelSize;
    
    // Clamp camera to new bounds
    this.camera.x = this.clampCameraX(this.camera.x);
    this.camera.y = this.clampCameraY(this.camera.y);
  }

  /**
   * Clamp camera X position to world bounds
   */
  clampCameraX(x) {
    const viewportWidth = this.viewport.width / this.camera.zoom / this.pixelSize;
    
    // For large worlds or when world is bigger than viewport, allow free movement
    if (this.worldWidth > viewportWidth) {
      return x; // Free panning
    }
    
    // For very small worlds, clamp to prevent going beyond bounds
    const minX = 0;
    const maxX = Math.max(0, this.worldWidth - viewportWidth);
    return Math.max(minX, Math.min(maxX, x));
  }

  /**
   * Clamp camera Y position to world bounds
   */
  clampCameraY(y) {
    const viewportHeight = this.viewport.height / this.camera.zoom / this.pixelSize;
    
    // For large worlds or when world is bigger than viewport, allow free movement
    if (this.worldHeight > viewportHeight) {
      return y; // Free panning
    }
    
    // For very small worlds, clamp to prevent going beyond bounds
    const minY = 0;
    const maxY = Math.max(0, this.worldHeight - viewportHeight);
    return Math.max(minY, Math.min(maxY, y));
  }

  /**
   * Clamp zoom level to allowed range
   */
  clampZoom(zoom) {
    const minZoom = 0.1;
    const maxZoom = 5.0;
    return Math.max(minZoom, Math.min(maxZoom, zoom));
  }
  
  /**
   * Set pixel density for performance tuning
   */
  setPixelDensity(density) {
    if (!Object.values(this.pixelDensityOptions).includes(density)) {
      console.warn('Invalid pixel density:', density, 'Valid options:', Object.values(this.pixelDensityOptions));
      return;
    }
    
    const oldPixelSize = this.pixelSize;
    this.pixelSize = density;
    
    // Update canvas dimensions
    this.updateCanvasDimensions();
    
    console.log(`✅ Pixel density changed from ${oldPixelSize}px to ${this.pixelSize}px per cell`);
  }
  
  /**
   * Get current pixel density level name
   */
  getPixelDensityLevel() {
    for (const [level, size] of Object.entries(this.pixelDensityOptions)) {
      if (size === this.pixelSize) {
        return level;
      }
    }
    return 'CUSTOM';
  }
  
  /**
   * Update canvas dimensions based on current settings
   */
  updateCanvasDimensions() {
    this.canvasWidth = this.worldWidth * this.pixelSize;
    this.canvasHeight = this.worldHeight * this.pixelSize;
    
    if (this.canvas) {
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      
      // Update viewport
      this.viewport.width = this.canvasWidth;
      this.viewport.height = this.canvasHeight;
      
      console.log(`✅ Canvas resized to ${this.canvasWidth}x${this.canvasHeight} (${this.pixelSize}px per cell)`);
    }
  }
  
  /**
   * Cleanup resources to prevent memory leaks
   */
  dispose() {
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDown);
      this.canvas.removeEventListener('mousemove', this.onMouseMove);
      this.canvas.removeEventListener('mouseup', this.onMouseUp);
      this.canvas.removeEventListener('wheel', this.onWheel);
    }
    
    // Clear references
    this.canvas = null;
    this.ctx = null;
    this.camera = null;
    this.viewport = null;
    this.colors = null;
    
    console.log('✅ PixelRenderer disposed and cleaned up');
  }
}