/**
 * Simple High-Performance Renderer for Ant Colony TTRPG
 * Version: v0.7 - Simplified Architecture Edition
 * 
 * Based on the turmites-main reference implementation
 * Focuses on performance and simplicity over complex features
 * Changelog:
 *   v0.7.1 - Underground UI palette, ants coloured by role / behaviour state,
 *            rival colonies in violet, pheromone-trail and territory overlays,
 *            nest rings, Terrain layer toggle, zoomBy() and auto-resize.
 *   v0.7.2 - Ants glide between cells over one tick (simulation unchanged);
 *            static layer cached offscreen, so frames only copy it and draw
 *            ants. Off under prefers-reduced-motion. FPS counts real frames.
 */

import { PALETTE, STATE_COLORS } from './pixel-art.js';

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
    
    // Color palette - shared with the UI (see pixel-art.js)
    this.colors = {
      background: PALETTE.ground,
      soil: PALETTE.soil,
      nest: PALETTE.nest,
      food: PALETTE.amber,
      trail: PALETTE.amber,
      rock: PALETTE.rock[0],
      grass: PALETTE.grass[1],
      water: PALETTE.water[0],
      mountain: '#5A4532',
      tree: PALETTE.grass[0],
      desertRock: PALETTE.rock[1],
      roles: { worker: PALETTE.worker, scout: PALETTE.scout, soldier: PALETTE.soldier },
      rival: PALETTE.rival,
      homeRing: PALETTE.worker
    };

    // Gliding ants: per-ant track from the last cell to the new one
    this.tracks = new Map();
    this.tickStart = 0;
    this.lastTickAt = 0;
    this.tickDuration = 800;
    this.reduceMotion = typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Layer toggles (driven by the HUD's Layers chips)
    this.showTrails = true;
    this.showBehaviorStates = false;
    this.showEnvironmentDetails = true;
    this.showTerritory = false;
    this.mixCache = new Map();
    
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

    // Keep the canvas matched to its (flexible) container
    if (typeof ResizeObserver !== 'undefined' && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.handleResize());
    }

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
      this.requestRedraw();
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
        this.requestRedraw();
      }
    });
    
    this.canvas.style.cursor = 'grab';
  }
  
  /**
   * Main render function
   */
  render(state, stats = {}) {
    if (!this.ctx || !state) return;
    this.lastState = state;

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
    
    // Ants glide between ticks: note who moved, then repaint the static
    // layer (terrain, overlays, nests, food) once and animate ants over it
    this.trackAnts(state);
    this.drawFull(state);
    this.needsFullRedraw = false;
    this.lastRenderTime = performance.now() - startTime;
  }

  /**
   * Record each ant's move since the last tick. A new tick starts a glide from
   * where the ant is drawn now to its new cell, over one tick's duration.
   * Renders without movement (pan, zoom, layer toggles) leave glides alone.
   */
  trackAnts(state) {
    const now = performance.now();
    const progress = this.glideProgress(now);
    const seen = new Set();
    let moved = false;

    (state.ants || []).forEach(ant => {
      const { x, y } = ant.position;
      seen.add(ant.id);
      const track = this.tracks.get(ant.id);
      if (!track) {
        this.tracks.set(ant.id, { fx: x, fy: y, tx: x, ty: y });
      } else if (track.tx !== x || track.ty !== y) {
        // Start from the drawn position; snap jumps longer than one cell (births, teleports)
        const jumped = Math.abs(x - track.tx) > 1.5 || Math.abs(y - track.ty) > 1.5;
        track.fx = jumped ? x : track.fx + (track.tx - track.fx) * progress;
        track.fy = jumped ? y : track.fy + (track.ty - track.fy) * progress;
        track.tx = x;
        track.ty = y;
        track.tick = now;
        moved = true;
      }
    });
    for (const id of this.tracks.keys()) {
      if (!seen.has(id)) this.tracks.delete(id);
    }

    if (moved) {
      // Ants that stood still this tick finish where they are
      this.tracks.forEach(track => {
        if (track.tick !== now) { track.fx = track.tx; track.fy = track.ty; }
      });
      // Glide for as long as a tick lasts (800 ms at 1x, shorter when sped up)
      if (this.lastTickAt) {
        this.tickDuration = Math.max(60, Math.min(1000, now - this.lastTickAt));
      }
      this.lastTickAt = now;
      this.tickStart = now;
    }
  }

  /**
   * When no frame is drawn for a second (paused, or nothing moved), show
   * "— FPS" instead of a stale number; a fresh count starts with the next frame.
   */
  markFpsIdleLater() {
    if (typeof setTimeout === 'undefined') return;
    clearTimeout(this.fpsIdleTimer);
    this.fpsIdleTimer = setTimeout(() => {
      this.frameCount = 0;
      this.lastFPSUpdate = Date.now();
      const fpsElement = typeof document !== 'undefined' && document.getElementById('fps');
      if (fpsElement) fpsElement.textContent = '— FPS';
    }, 1000);
  }

  /** 0 at the start of a tick's glide, 1 when ants reach their cells. */
  glideProgress(now) {
    if (this.reduceMotion || !this.tickStart) return 1;
    return Math.max(0, Math.min(1, (now - this.tickStart) / this.tickDuration));
  }

  /**
   * Paint one frame: the cached static layer, then ants at their glide
   * position. Keeps requesting frames until every glide has finished.
   */
  present() {
    const now = performance.now();
    if (this.background) {
      this.ctx.drawImage(this.background, 0, 0);
    }
    const progress = this.glideProgress(now);
    const size = Math.ceil(this.scale);
    (this.lastState?.ants || []).forEach(ant => {
      const track = this.tracks.get(ant.id);
      const wx = track ? track.fx + (track.tx - track.fx) * progress : ant.position.x;
      const wy = track ? track.fy + (track.ty - track.fy) * progress : ant.position.y;
      const px = Math.round(this.offsetX + wx * this.scale);
      const py = Math.round(this.offsetY + wy * this.scale);
      if (px + size > 0 && px < this.canvasWidth && py + size > 0 && py < this.canvasHeight) {
        this.ctx.fillStyle = this.antColor(ant);
        this.ctx.fillRect(px, py, size, size);
      }
    });
    this.updatePerformanceStats(this.lastRenderTime || 0);
    this.markFpsIdleLater();

    if (progress < 1 && !this.framePending) {
      this.framePending = true;
      requestAnimationFrame(() => {
        this.framePending = false;
        this.present();
      });
    }
  }
  
  /**
   * Full redraw - used when view changes or world resets
   */
  drawFull(state) {
    // Static layer goes to an offscreen canvas, so animation frames only copy it
    if (typeof document !== 'undefined') {
      if (!this.background) this.background = document.createElement('canvas');
      if (this.background.width !== this.canvasWidth) this.background.width = this.canvasWidth;
      if (this.background.height !== this.canvasHeight) this.background.height = this.canvasHeight;
    }
    const screen = this.ctx;
    const bgCtx = this.background?.getContext?.('2d');
    if (bgCtx) this.ctx = bgCtx;

    // Clear canvas
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Calculate visible bounds
    const bounds = this.getVisibleBounds();
    
    // Draw terrain/background (with trail and territory overlays)
    this.drawTerrain(state, bounds);

    // Nest rings: yours in parchment, rivals in violet
    this.drawNests(state, bounds);

    // Draw food sources
    this.drawFood(state, bounds);

    this.ctx = screen;
    if (bgCtx) {
      // Ants are drawn per frame, at their glide position
      this.present();
    } else {
      this.drawAnts(state, bounds);
    }
    
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
    const pheromones = this.showTrails ? state.environment.pheromoneMap : null;
    const territory = this.showTerritory ? state.environment.territoryMap : null;

    for (let y = bounds.startY; y < bounds.endY; y++) {
      for (let x = bounds.startX; x < bounds.endX; x++) {
        if (y >= terrain.length || x >= terrain[y].length) continue;

        const cell = terrain[y][x];
        // Stable per-cell soil grain so the ground doesn't flicker
        const soil = this.colors.soil[(((x * 73856093) ^ (y * 19349663)) >>> 0) % this.colors.soil.length];
        let color = soil;

        // Map terrain types to colors (nests always show; the rest is the Terrain layer)
        if (cell === '🏠') {
          color = this.colors.nest;
        } else if (this.showEnvironmentDetails) {
          switch (cell) {
            case '🪨': color = this.colors.rock; break;
            case '🌱': color = this.colors.grass; break;
            case '🌊': color = this.colors.water; break;
            case '⛰️': color = this.colors.mountain; break;
            case '🌲': color = this.colors.tree; break;
            case '🏔': color = this.colors.desertRock; break;
            default: break;
          }
        }

        const strength = pheromones?.[y]?.[x] || 0;
        if (strength > 0 && cell !== '🏠') {
          color = this.mix(color, this.colors.trail, Math.min(1, strength / 2) * 0.65);
        }

        const owner = territory?.[y]?.[x];
        if (owner !== null && owner !== undefined && owner >= 0) {
          color = owner === 0
            ? this.mix(color, this.colors.homeRing, 0.12)
            : this.mix(color, this.colors.rival, 0.22);
        }

        this.drawCell(x, y, color);
      }
    }
  }

  /**
   * Draw a one-cell ring around each nest
   */
  drawNests(state, bounds) {
    if (!state.nests) return;
    state.nests.forEach((nest, i) => {
      const { x, y } = nest.position || {};
      if (x === undefined) return;
      const ring = i === 0 ? this.colors.homeRing : this.colors.rival;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const cx = x + dx, cy = y + dy;
          if (cx >= bounds.startX && cx < bounds.endX && cy >= bounds.startY && cy < bounds.endY) {
            this.drawCell(cx, cy, ring);
          }
        }
      }
      this.drawCell(x, y, this.colors.nest);
    });
  }

  /**
   * Blend two #rrggbb colours (cached: the same few pairs repeat every frame)
   */
  mix(a, b, t) {
    // Cache by colour, then colour, then one of 21 steps: no per-cell key strings
    const index = Math.max(0, Math.min(20, Math.round(t * 20)));
    let byB = this.mixCache.get(a);
    if (!byB) { byB = new Map(); this.mixCache.set(a, byB); }
    let steps = byB.get(b);
    if (!steps) { steps = new Array(21); byB.set(b, steps); }
    let out = steps[index];
    if (!out) {
      const step = index / 20;
      const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
      const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
      out = '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * step).toString(16).padStart(2, '0')).join('');
      steps[index] = out;
    }
    return out;
  }

  /**
   * Colour for one ant: rivals in violet, yours by role or by behaviour state
   */
  antColor(ant) {
    if (ant.colonyId && ant.colonyId !== 0) return this.colors.rival;
    if (this.showBehaviorStates) return STATE_COLORS[ant.state] || this.colors.roles.worker;
    return this.colors.roles[ant.role] || this.colors.roles.worker;
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
        this.drawCell(ant.position.x, ant.position.y, this.antColor(ant));
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
    // Keep the world point at the centre of the view where it was;
    // setupCanvas() alone recentres the world and loses the player's pan
    const hadView = this.canvasWidth > 0 && this.lastState;
    const centreX = (this.canvasWidth / 2 - this.offsetX) / this.scale;
    const centreY = (this.canvasHeight / 2 - this.offsetY) / this.scale;
    this.setupCanvas();
    if (hadView) {
      this.offsetX = this.canvasWidth / 2 - centreX * this.scale;
      this.offsetY = this.canvasHeight / 2 - centreY * this.scale;
    }
    this.needsFullRedraw = true;
    // Resizing a canvas clears it; repaint now so a paused world doesn't go blank
    if (this.lastState) this.render(this.lastState);
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
    if (options.showTerritory !== undefined) this.showTerritory = options.showTerritory;
    this.needsFullRedraw = true;
  }

  /**
   * Redraw the last state on the next frame. Pan and zoom used to wait for
   * the next simulation tick (up to 800 ms at 1x), so the map lagged the mouse.
   */
  requestRedraw() {
    if (this.redrawPending || !this.lastState) return;
    this.redrawPending = true;
    requestAnimationFrame(() => {
      this.redrawPending = false;
      this.render(this.lastState);
    });
  }

  /**
   * Zoom around the centre of the view (HUD zoom buttons)
   */
  zoomBy(factor) {
    const newScale = Math.max(0.5, Math.min(50, this.scale * factor));
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    this.offsetX = cx - (cx - this.offsetX) * (newScale / this.scale);
    this.offsetY = cy - (cy - this.offsetY) * (newScale / this.scale);
    this.scale = newScale;
    this.needsFullRedraw = true;
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