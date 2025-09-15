/**
 * Simple High-Performance Renderer for Ant Colony TTRPG
 * Version: v0.7 - Simplified Architecture Edition
 * 
 * Based on the turmites-main reference implementation
 * Focuses on performance and simplicity over complex features
 */

export class SimpleRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    
    // Viewport and scaling
    this.scale = 8; // Initial zoom level - larger pixels for visibility
    this.offsetX = 0;
    this.offsetY = 0;
    
    // World dimensions
    this.worldWidth = 75;
    this.worldHeight = 50;
    
    // Canvas dimensions (will be set dynamically)
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    
    // Grid state for differential rendering
    this.grid = null;
    this.cellsToUpdate = new Set(); // Track cells that need redrawing
    this.needsFullRedraw = true;
    
    // Color palette - simple and clear
    this.colors = {
      background: '#000000',    // Black background
      empty: '#111111',         // Dark gray for empty space
      nest: '#FFD700',          // Gold for nest
      ant: '#FF0000',           // Red for ants
      food: '#00FF00',          // Green for food
      trail: '#444444',         // Gray for trails
      rock: '#666666',          // Gray for obstacles
      grass: '#004400'          // Dark green for grass
    };
    
    // Performance tracking
    this.fps = 0;
    this.frameCount = 0;
    this.lastFPSUpdate = Date.now();
    this.renderTimes = [];
    this.avgRenderTime = 0;
    this.memoryUsage = 0;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the renderer
   */
  init() {
    // Get canvas element
    this.canvas = document.getElementById('colonyCanvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }
    
    // Get context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Failed to get 2D context');
      return;
    }
    
    // Set up canvas sizing
    this.setupCanvas();
    
    // Initialize grid
    this.initGrid();
    
    // Set up mouse controls for pan/zoom
    this.setupControls();
    
    console.log('✅ SimpleRenderer initialized successfully');
  }
  
  /**
   * Set up canvas with proper sizing
   */
  setupCanvas() {
    // Get parent container size
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Set canvas to fill container
    this.canvasWidth = Math.floor(containerRect.width) || 800;
    this.canvasHeight = Math.floor(containerRect.height) || 600;
    
    // Set both internal and display size
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    
    // Center the view on the world
    this.offsetX = (this.canvasWidth - this.worldWidth * this.scale) / 2;
    this.offsetY = (this.canvasHeight - this.worldHeight * this.scale) / 2;
    
    // Disable image smoothing for pixel art
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    
    console.log(`Canvas setup: ${this.canvasWidth}x${this.canvasHeight}, scale: ${this.scale}`);
  }
  
  /**
   * Initialize the grid for differential rendering
   */
  initGrid() {
    // Create grid to track cell colors for differential rendering
    this.grid = Array(this.worldHeight).fill(null).map(() => 
      Array(this.worldWidth).fill(0) // 0 = background color
    );
    
    this.needsFullRedraw = true;
    console.log(`Grid initialized: ${this.worldWidth}x${this.worldHeight}`);
  }
  
  /**
   * Set up mouse controls for pan and zoom
   */
  setupControls() {
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    
    // Mouse down - start dragging
    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });
    
    // Mouse move - pan view
    this.canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;
      
      this.offsetX += deltaX;
      this.offsetY += deltaY;
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      
      this.needsFullRedraw = true;
    });
    
    // Mouse up - stop dragging
    this.canvas.addEventListener('mouseup', () => {
      isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
    
    // Mouse leave - stop dragging
    this.canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      this.canvas.style.cursor = 'grab';
    });
    
    // Mouse wheel - zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
      const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(50, this.scale * zoomFactor));
      
      if (newScale !== this.scale) {
        // Zoom towards mouse position
        this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / this.scale);
        this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / this.scale);
        
        this.scale = newScale;
        this.needsFullRedraw = true;
      }
    });
    
    this.canvas.style.cursor = 'grab';
  }
  
  /**
   * Main render function
   */
  render(state, stats = {}) {
    if (!this.ctx || !state) return;
    
    const startTime = performance.now();
    
    // Update world dimensions if changed
    if (state.environment?.metadata) {
      const newWidth = state.environment.metadata.width;
      const newHeight = state.environment.metadata.height;
      
      if (newWidth !== this.worldWidth || newHeight !== this.worldHeight) {
        this.worldWidth = newWidth;
        this.worldHeight = newHeight;
        this.initGrid();
      }
    }
    
    // Decide between full redraw or differential update
    if (this.needsFullRedraw) {
      this.drawFull(state);
      this.needsFullRedraw = false;
    } else {
      this.drawUpdates(state);
    }
    
    // Update performance stats
    const renderTime = performance.now() - startTime;
    this.updatePerformanceStats(renderTime);
  }
  
  /**
   * Full redraw - used when view changes or world resets
   */
  drawFull(state) {
    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Calculate visible bounds
    const bounds = this.getVisibleBounds();
    
    // Draw terrain/background
    this.drawTerrain(state, bounds);
    
    // Draw food sources
    this.drawFood(state, bounds);
    
    // Draw ants
    this.drawAnts(state, bounds);
    
    // Clear update set since we drew everything
    this.cellsToUpdate.clear();
  }
  
  /**
   * Differential update - only redraw changed cells
   */
  drawUpdates(state) {
    // For now, do a full redraw - we'll optimize this later
    // The reference implementation shows how to track individual cell changes
    this.drawFull(state);
  }
  
  /**
   * Get visible bounds for viewport culling
   */
  getVisibleBounds() {
    const startX = Math.max(0, Math.floor(-this.offsetX / this.scale));
    const startY = Math.max(0, Math.floor(-this.offsetY / this.scale));
    const endX = Math.min(this.worldWidth, Math.ceil((this.canvasWidth - this.offsetX) / this.scale));
    const endY = Math.min(this.worldHeight, Math.ceil((this.canvasHeight - this.offsetY) / this.scale));
    
    return { startX, startY, endX, endY };
  }
  
  /**
   * Draw terrain/background
   */
  drawTerrain(state, bounds) {
    if (!state.environment?.terrain) return;
    
    const terrain = state.environment.terrain;
    
    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        if (y >= terrain.length || x >= terrain[y].length) continue;
        
        const cell = terrain[y][x];
        let color = this.colors.empty;
        
        // Map terrain types to colors
        switch (cell) {
          case '🏠': color = this.colors.nest; break;
          case '🪨': color = this.colors.rock; break;
          case '🌱': color = this.colors.grass; break;
          case '🌊': color = '#0066CC'; break; // Blue for rivers
          case '⛰️': color = '#8B4513'; break; // Brown for mountains  
          case '🌲': color = '#228B22'; break; // Forest green for trees
          case '🏔': color = '#696969'; break; // Gray for desert rocks
          default: color = this.colors.empty; break;
        }
        
        this.drawCell(x, y, color);
      }
    }
  }
  
  /**
   * Draw food sources
   */
  drawFood(state, bounds) {
    if (!state.environment?.foodSources) return;
    
    state.environment.foodSources.forEach(food => {
      if (food.x >= bounds.startX && food.x < bounds.endX &&
          food.y >= bounds.startY && food.y < bounds.endY) {
        this.drawCell(food.x, food.y, this.colors.food);
      }
    });
  }
  
  /**
   * Draw ants
   */
  drawAnts(state, bounds) {
    if (!state.ants) return;
    
    state.ants.forEach(ant => {
      if (ant.position.x >= bounds.startX && ant.position.x < bounds.endX &&
          ant.position.y >= bounds.startY && ant.position.y < bounds.endY) {
        this.drawCell(ant.position.x, ant.position.y, this.colors.ant);
      }
    });
  }
  
  /**
   * Draw a single cell at world coordinates
   */
  drawCell(worldX, worldY, color) {
    const pixelX = Math.floor(this.offsetX + worldX * this.scale);
    const pixelY = Math.floor(this.offsetY + worldY * this.scale);
    const size = Math.ceil(this.scale);
    
    // Only draw if visible
    if (pixelX + size > 0 && pixelX < this.canvasWidth &&
        pixelY + size > 0 && pixelY < this.canvasHeight) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(pixelX, pixelY, size, size);
    }
  }
  
  /**
   * Update performance statistics
   */
  updatePerformanceStats(renderTime) {
    this.frameCount++;
    const now = Date.now();
    
    // Track render times (keep last 60 samples)
    this.renderTimes.push(renderTime);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
    
    // Calculate average render time
    this.avgRenderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    
    if (now - this.lastFPSUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
      
      // Get memory usage if available
      if (performance.memory) {
        this.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
      }
      
      // Update performance displays
      const fpsElement = document.getElementById('fps');
      if (fpsElement) {
        fpsElement.textContent = `${this.fps} FPS`;
      }
      
      // Log detailed performance info
      console.log(`🎯 Performance: ${this.fps} FPS, ${this.avgRenderTime.toFixed(2)}ms render, ${this.memoryUsage.toFixed(1)}MB memory`);
    }
  }
  
  /**
   * Reset view to center on world
   */
  resetView() {
    this.offsetX = (this.canvasWidth - this.worldWidth * this.scale) / 2;
    this.offsetY = (this.canvasHeight - this.worldHeight * this.scale) / 2;
    this.scale = 8;
    this.needsFullRedraw = true;
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    this.setupCanvas();
    this.needsFullRedraw = true;
  }
  
  /**
   * Compatibility methods for main.js interface
   */
  
  /**
   * Set display options (compatibility with old renderer interface)
   */
  setDisplayOptions(options) {
    // SimpleRenderer doesn't have complex display options
    // Just store them for potential future use
    if (options.showTrails !== undefined) this.showTrails = options.showTrails;
    if (options.showBehaviorStates !== undefined) this.showBehaviorStates = options.showBehaviorStates;
    if (options.showEnvironmentDetails !== undefined) this.showEnvironmentDetails = options.showEnvironmentDetails;
  }
  
  /**
   * Set layer visibility (no-op for SimpleRenderer)
   */
  setLayerVisibility(layer, visible) {
    // SimpleRenderer doesn't have layers, so this is a no-op
    console.log(`Layer visibility change ignored: ${layer} = ${visible}`);
  }
  
  /**
   * Set pixel density (no-op for SimpleRenderer)
   */
  setPixelDensity(density) {
    // SimpleRenderer uses dynamic scaling, so this is a no-op
    console.log(`Pixel density change ignored: ${density}`);
  }
  
  /**
   * Get pixel density level (compatibility method)
   */
  getPixelDensityLevel() {
    // Return a fixed level since SimpleRenderer doesn't have configurable density
    return 'dynamic';
  }
  
  /**
   * Camera object for compatibility
   */
  get camera() {
    return {
      zoom: this.scale / 8, // Normalize to 1.0 base
      x: this.offsetX,
      y: this.offsetY
    };
  }
  
  /**
   * LOD settings for compatibility
   */
  get lodSettings() {
    return {
      currentLevel: 'high' // SimpleRenderer always uses high quality
    };
  }
}