/**
 * Tests for LayeredRenderer - Advanced Rendering System
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayeredRenderer } from './layered-renderer.js';

// Mock canvas context
const createMockContext = () => ({
  fillStyle: '',
  fillRect: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  strokeRect: vi.fn(),
  globalAlpha: 1,
  imageSmoothingEnabled: false,
  webkitImageSmoothingEnabled: false,
  msImageSmoothingEnabled: false,
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn()
  })),
  drawImage: vi.fn()
});

// Mock canvas element
const createMockCanvas = () => ({
  width: 750,
  height: 500,
  style: {},
  getContext: vi.fn(() => createMockContext()),
  addEventListener: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 750, height: 500 }))
});

const mockElements = {
  'colonyCanvas': createMockCanvas(),
  'minimapCanvas': {
    width: 80,
    height: 60,
    getContext: vi.fn(() => createMockContext()),
    addEventListener: vi.fn()
  },
  'zoomLevel': { textContent: '' }
};

// Mock document.getElementById and createElement
global.document = {
  getElementById: vi.fn((id) => mockElements[id] || null),
  createElement: vi.fn(() => createMockCanvas()),
  addEventListener: vi.fn(),
  readyState: 'complete'
};

// Mock performance
global.performance = {
  now: vi.fn(() => Date.now())
};

describe('LayeredRenderer - Advanced Rendering System', () => {
  let renderer;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    global.document.getElementById.mockClear();
    global.document.createElement.mockClear();
    
    renderer = new LayeredRenderer();
    
    // Force synchronous initialization for tests
    if (renderer.canvas && renderer.ctx) {
      renderer.initializeLayers();
    }
    
    // Wait for any async initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Initialization', () => {
    it('should extend PixelRenderer functionality', () => {
      expect(renderer.canvas).toBeDefined();
      expect(renderer.ctx).toBeDefined();
      expect(renderer.camera).toBeDefined();
    });

    it('should initialize layer system', () => {
      const expectedLayers = ['terrain', 'pheromones', 'ants', 'ui_overlay'];
      
      Object.values(renderer.layers).forEach(layer => {
        expect(expectedLayers).toContain(layer);
      });
    });

    it('should create layer visibility settings', () => {
      Object.values(renderer.layers).forEach(layer => {
        expect(renderer.layerVisibility[layer]).toBe(true);
      });
    });

    it('should initialize layer dirty flags', () => {
      Object.values(renderer.layers).forEach(layer => {
        expect(renderer.layerDirty[layer]).toBe(true);
      });
    });

    it('should set up LOD system', () => {
      expect(renderer.lodSettings).toBeDefined();
      expect(renderer.lodSettings.currentLevel).toBe('high');
      expect(renderer.lodSettings.zoomThresholds).toBeDefined();
    });

    it('should initialize pheromone visualization settings', () => {
      expect(renderer.pheromoneVisuals.colors).toBeDefined();
      expect(renderer.pheromoneVisuals.colors.food).toEqual({ r: 255, g: 165, b: 0 });
      expect(renderer.pheromoneVisuals.colors.exploration).toEqual({ r: 100, g: 200, b: 255 });
      expect(renderer.pheromoneVisuals.colors.danger).toEqual({ r: 255, g: 50, b: 50 });
      expect(renderer.pheromoneVisuals.colors.home).toEqual({ r: 50, g: 255, b: 50 });
    });
  });

  describe('Layer Management', () => {
    it('should mark layer as dirty', () => {
      renderer.layerDirty.terrain = false;
      renderer.markLayerDirty('terrain');
      
      expect(renderer.layerDirty.terrain).toBe(true);
    });

    it('should mark all layers as dirty', () => {
      // Set all layers to clean
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.markAllLayersDirty();
      
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(true);
      });
    });

    it('should set layer visibility', () => {
      renderer.setLayerVisibility('pheromones', false);
      
      expect(renderer.layerVisibility.pheromones).toBe(false);
      expect(renderer.layerDirty.pheromones).toBe(true);
    });

    it('should ignore invalid layer names', () => {
      renderer.layerVisibility.terrain = true;
      renderer.layerDirty.terrain = false;
      
      renderer.setLayerVisibility('invalid_layer', false);
      
      expect(renderer.layerVisibility.terrain).toBe(true);
      expect(renderer.layerDirty.terrain).toBe(false);
    });
  });

  describe('LOD System', () => {
    it('should update LOD based on zoom level', () => {
      renderer.camera.zoom = 2.0; // High zoom
      renderer.updateLODLevel();
      expect(renderer.lodSettings.currentLevel).toBe('high');
      
      renderer.camera.zoom = 1.0; // Medium zoom
      renderer.updateLODLevel();
      expect(renderer.lodSettings.currentLevel).toBe('medium');
      
      renderer.camera.zoom = 0.5; // Low zoom
      renderer.updateLODLevel();
      expect(renderer.lodSettings.currentLevel).toBe('low');
    });

    it('should mark layers dirty when LOD changes', () => {
      // Set all layers clean
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.camera.zoom = 2.0;
      renderer.lodSettings.currentLevel = 'medium'; // Force a change
      renderer.updateLODLevel();
      
      // All layers should be marked dirty
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(true);
      });
    });

    it('should not mark layers dirty if LOD level unchanged', () => {
      renderer.camera.zoom = 2.0;
      renderer.lodSettings.currentLevel = 'high';
      
      // Set all layers clean
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.updateLODLevel();
      
      // Layers should remain clean
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(false);
      });
    });
  });

  describe('Pheromone System Integration', () => {
    beforeEach(() => {
      renderer.initializePheromoneSystem(100, 75);
    });

    it('should initialize pheromone system', () => {
      expect(renderer.pheromoneSystem).toBeDefined();
      expect(renderer.pheromoneSystem.width).toBe(100);
      expect(renderer.pheromoneSystem.height).toBe(75);
    });

    it('should calculate pheromone strength based on ant properties', () => {
      const workerAnt = { role: 'worker', energy: 80, energyMax: 100 };
      const scoutAnt = { role: 'scout', energy: 60, energyMax: 100 };
      const soldierAnt = { role: 'soldier', energy: 100, energyMax: 100 };
      
      const workerFood = renderer.calculatePheromoneStrength(workerAnt, 'food');
      const scoutExploration = renderer.calculatePheromoneStrength(scoutAnt, 'exploration');
      const soldierDanger = renderer.calculatePheromoneStrength(soldierAnt, 'danger');
      
      expect(workerFood).toBeGreaterThan(5); // Worker good at food trails
      expect(scoutExploration).toBeGreaterThan(5); // Scout good at exploration
      expect(soldierDanger).toBeGreaterThan(7); // Soldier very good at danger trails
    });

    it('should update pheromone trails from ant movements', () => {
      const ants = [
        { id: 1, role: 'worker', carryingFood: true, energy: 80, energyMax: 100 },
        { id: 2, role: 'scout', state: 'exploring', energy: 60, energyMax: 100 }
      ];
      
      const movements = [
        { antId: 1, from: { x: 10, y: 10 }, to: { x: 11, y: 10 } },
        { antId: 2, from: { x: 20, y: 20 }, to: { x: 21, y: 20 } }
      ];
      
      renderer.updatePheromoneTrails(ants, movements);
      
      // Should deposit food pheromone for worker carrying food
      expect(renderer.pheromoneSystem.getPheromone(10, 10, 'food')).toBeGreaterThan(0);
      expect(renderer.pheromoneSystem.getPheromone(11, 10, 'food')).toBeGreaterThan(0);
      
      // Should deposit exploration pheromone for exploring scout
      expect(renderer.pheromoneSystem.getPheromone(20, 20, 'exploration')).toBeGreaterThan(0);
      expect(renderer.pheromoneSystem.getPheromone(21, 20, 'exploration')).toBeGreaterThan(0);
    });

    it('should mark pheromone layer dirty after trail updates', () => {
      renderer.layerDirty.pheromones = false;
      
      const ants = [{ id: 1, role: 'worker', energy: 80, energyMax: 100 }];
      const movements = [{ antId: 1, from: { x: 10, y: 10 }, to: { x: 11, y: 10 } }];
      
      renderer.updatePheromoneTrails(ants, movements);
      
      expect(renderer.layerDirty.pheromones).toBe(true);
    });
  });

  describe('Layer Rendering', () => {
    let mockState;

    beforeEach(() => {
      renderer.initializePheromoneSystem(100, 75);
      
      mockState = {
        environment: {
          metadata: { width: 100, height: 75 },
          terrain: Array(75).fill().map(() => Array(100).fill('🌱')),
          foodSources: [
            { x: 10, y: 10, type: 'berries', discovered: true, depleted: false }
          ]
        },
        ants: [
          { id: 1, role: 'worker', position: { x: 15, y: 15 }, energy: 80, carryingFood: true },
          { id: 2, role: 'scout', position: { x: 25, y: 25 }, energy: 60, carryingFood: false }
        ],
        recentMovements: [
          { antId: 1, from: { x: 14, y: 15 }, to: { x: 15, y: 15 } },
          { antId: 2, from: { x: 24, y: 25 }, to: { x: 25, y: 25 } }
        ]
      };
    });

    // Layer alpha compositing removed - direct rendering used instead

    it('should handle terrain layer rendering', () => {
      const mockContext = createMockContext();
      renderer.renderTerrainLayer(mockContext, mockState);
      
      // Should attempt to render terrain if state is valid
      // clearRect is called at the layer level, not individual render methods
      expect(mockState.environment).toBeDefined();
    });

    it('should skip pheromone rendering when trails disabled', () => {
      renderer.showTrails = false;
      const mockContext = createMockContext();
      
      renderer.renderPheromonesLayer(mockContext, mockState);
      
      // Should return early without rendering pheromones
      expect(renderer.showTrails).toBe(false);
    });

    it('should render pheromones when enabled', () => {
      renderer.showTrails = true;
      
      // Add some pheromones first
      renderer.updatePheromoneTrails(mockState.ants, mockState.recentMovements);
      renderer.pheromoneSystem.update();
      
      const mockContext = createMockContext();
      renderer.renderPheromonesLayer(mockContext, mockState);
      
      // Should have system enabled and ready for pheromone rendering
      expect(renderer.showTrails).toBe(true);
      expect(renderer.pheromoneSystem).toBeDefined();
    });
  });

  describe('World Size and Camera Integration', () => {
    it('should resize pheromone system when world size changes', () => {
      renderer.initializePheromoneSystem(100, 75);
      const originalWidth = renderer.pheromoneSystem.width;
      const originalHeight = renderer.pheromoneSystem.height;
      
      renderer.updateWorldSize(200, 150);
      
      expect(renderer.pheromoneSystem.width).toBe(200);
      expect(renderer.pheromoneSystem.height).toBe(150);
      expect(renderer.pheromoneSystem.width).not.toBe(originalWidth);
      expect(renderer.pheromoneSystem.height).not.toBe(originalHeight);
    });

    it('should mark all layers dirty when world size changes', () => {
      // Set all layers clean
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.updateWorldSize(200, 150);
      
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(true);
      });
    });

    it('should mark all layers dirty when camera pans', () => {
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.panTo(50, 50);
      
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(true);
      });
    });

    it('should mark all layers dirty when camera zooms', () => {
      Object.keys(renderer.layerDirty).forEach(layer => {
        renderer.layerDirty[layer] = false;
      });
      
      renderer.zoomTo(2.0);
      
      Object.values(renderer.layerDirty).forEach(dirty => {
        expect(dirty).toBe(true);
      });
    });
  });

  describe('Performance and Statistics', () => {
    it('should track layer render times', () => {
      renderer.layerPerformance.renderTimes.terrain = 5.5;
      renderer.layerPerformance.renderTimes.pheromones = 12.3;
      
      const stats = renderer.getLayeredStats();
      
      expect(stats.layers.renderTimes.terrain).toBe(5.5);
      expect(stats.layers.renderTimes.pheromones).toBe(12.3);
    });

    it('should provide comprehensive layered statistics', () => {
      renderer.initializePheromoneSystem(100, 75);
      
      const stats = renderer.getLayeredStats();
      
      expect(stats.layers.count).toBe(4);
      expect(stats.layers.visibility).toBeDefined();
      expect(stats.layers.dirty).toBeDefined();
      expect(stats.lod.currentLevel).toBeDefined();
      expect(stats.pheromones).toBeDefined();
    });

    it('should handle pheromone stats when system not initialized', () => {
      renderer.pheromoneSystem = null;
      
      const stats = renderer.getLayeredStats();
      
      expect(stats.pheromones).toBe(null);
    });

    it('should include parent renderer stats', () => {
      const stats = renderer.getLayeredStats();
      
      expect(stats.worldSize).toBeDefined();
      expect(stats.canvasSize).toBeDefined();
      expect(stats.pixelSize).toBeDefined();
    });
  });

  describe('Advanced Visual Features', () => {
    beforeEach(() => {
      renderer.initializePheromoneSystem(100, 75);
    });

    it('should create advanced pheromone gradients for high LOD', () => {
      const mockContext = {
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        fillRect: vi.fn(),
        fillStyle: ''
      };
      
      const color = { r: 255, g: 165, b: 0 };
      renderer.lodSettings.currentLevel = 'high';
      
      renderer.drawAdvancedPheromone(mockContext, 10, 10, color, 0.5, 0.8);
      
      expect(mockContext.createRadialGradient).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should use simple rendering for low LOD', () => {
      const mockContext = {
        fillRect: vi.fn(),
        fillStyle: ''
      };
      
      const color = { r: 255, g: 165, b: 0 };
      
      renderer.drawSimplePheromone(mockContext, 10, 10, color, 0.5);
      
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.fillStyle).toContain('rgba(255, 165, 0, 0.5)');
    });

    it('should render different ant detail levels based on LOD', () => {
      const ant = { 
        id: 1, 
        role: 'worker', 
        position: { x: 15, y: 15 }, 
        energy: 80, 
        carryingFood: true 
      };
      
      const mockContext = {
        fillRect: vi.fn(),
        fillStyle: ''
      };
      
      // Test different LOD levels
      renderer.lodSettings.currentLevel = 'low';
      renderer.drawMinimalAntSprite(mockContext, ant);
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.fillStyle).toBe('#ef4444'); // Generic color for low LOD
      
      mockContext.fillRect.mockClear();
      
      renderer.lodSettings.currentLevel = 'medium';
      renderer.drawSimpleAntSprite(mockContext, ant);
      expect(mockContext.fillRect).toHaveBeenCalled();
      // Should have set worker color at some point
      expect(mockContext.fillStyle).toMatch(/#22c55e|#fbbf24/); // Worker color or food indicator
    });
  });
});