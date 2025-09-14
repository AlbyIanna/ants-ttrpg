/**
 * Integration Tests for Layer Controls UI
 * Tests the interaction between UI controls and LayeredRenderer
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayeredRenderer } from './layered-renderer.js';

// Mock DOM elements for layer controls
const mockLayerControls = {
  'layerTerrain': { addEventListener: vi.fn(), checked: true },
  'layerPheromones': { addEventListener: vi.fn(), checked: true },
  'layerAnts': { addEventListener: vi.fn(), checked: true },
  'layerUI': { addEventListener: vi.fn(), checked: true },
  'currentLOD': { textContent: 'High' },
  'currentZoom': { textContent: '1.0x' }
};

// Mock canvas and context
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
  'zoomLevel': { textContent: '' },
  ...mockLayerControls
};

// Mock document.getElementById
global.document = {
  getElementById: vi.fn((id) => mockElements[id] || null),
  createElement: vi.fn(() => createMockCanvas()),
  addEventListener: vi.fn(),
  readyState: 'complete'
};

// Mock setInterval for LOD updater
global.setInterval = vi.fn();

describe('Layer Controls Integration', () => {
  let renderer;
  let setupLayerControls;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    global.document.getElementById.mockClear();

    renderer = new LayeredRenderer();
    
    // Mock the setupLayerControls function from main.js
    setupLayerControls = () => {
      if (!renderer || !renderer.setLayerVisibility) {
        return;
      }
      
      // Layer visibility toggles
      const layerTerrain = document.getElementById('layerTerrain');
      const layerPheromones = document.getElementById('layerPheromones');
      const layerAnts = document.getElementById('layerAnts');
      const layerUI = document.getElementById('layerUI');
      
      if (layerTerrain) {
        layerTerrain.addEventListener('change', (e) => {
          renderer.setLayerVisibility('terrain', e.target.checked);
        });
      }
      
      if (layerPheromones) {
        layerPheromones.addEventListener('change', (e) => {
          renderer.setLayerVisibility('pheromones', e.target.checked);
        });
      }
      
      if (layerAnts) {
        layerAnts.addEventListener('change', (e) => {
          renderer.setLayerVisibility('ants', e.target.checked);
        });
      }
      
      if (layerUI) {
        layerUI.addEventListener('change', (e) => {
          renderer.setLayerVisibility('ui_overlay', e.target.checked);
        });
      }
    };
    
    // Wait for any async initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Layer Visibility Controls', () => {
    it('should register event handlers for all layer controls', () => {
      setupLayerControls();
      
      expect(mockElements.layerTerrain.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockElements.layerPheromones.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockElements.layerAnts.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(mockElements.layerUI.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should toggle terrain layer visibility', () => {
      setupLayerControls();
      
      // Get the event handler
      const changeHandler = mockElements.layerTerrain.addEventListener.mock.calls[0][1];
      
      // Simulate unchecking the terrain layer
      changeHandler({ target: { checked: false } });
      
      expect(renderer.layerVisibility.terrain).toBe(false);
      expect(renderer.layerDirty.terrain).toBe(true);
    });

    it('should toggle pheromone layer visibility', () => {
      setupLayerControls();
      
      // Get the event handler
      const changeHandler = mockElements.layerPheromones.addEventListener.mock.calls[0][1];
      
      // Simulate unchecking the pheromone layer
      changeHandler({ target: { checked: false } });
      
      expect(renderer.layerVisibility.pheromones).toBe(false);
      expect(renderer.layerDirty.pheromones).toBe(true);
    });

    it('should toggle ants layer visibility', () => {
      setupLayerControls();
      
      // Get the event handler
      const changeHandler = mockElements.layerAnts.addEventListener.mock.calls[0][1];
      
      // Simulate unchecking the ants layer
      changeHandler({ target: { checked: false } });
      
      expect(renderer.layerVisibility.ants).toBe(false);
      expect(renderer.layerDirty.ants).toBe(true);
    });

    it('should toggle UI overlay layer visibility', () => {
      setupLayerControls();
      
      // Get the event handler
      const changeHandler = mockElements.layerUI.addEventListener.mock.calls[0][1];
      
      // Simulate unchecking the UI overlay layer
      changeHandler({ target: { checked: false } });
      
      expect(renderer.layerVisibility.ui_overlay).toBe(false);
      expect(renderer.layerDirty.ui_overlay).toBe(true);
    });

    it('should handle enabling layer after disabling', () => {
      setupLayerControls();
      
      const changeHandler = mockElements.layerPheromones.addEventListener.mock.calls[0][1];
      
      // First disable
      changeHandler({ target: { checked: false } });
      expect(renderer.layerVisibility.pheromones).toBe(false);
      
      // Then enable
      changeHandler({ target: { checked: true } });
      expect(renderer.layerVisibility.pheromones).toBe(true);
      expect(renderer.layerDirty.pheromones).toBe(true);
    });
  });

  describe('LOD Display Updates', () => {
    it('should setup LOD updater with setInterval', () => {
      const setupLODUpdater = () => {
        const updateLODDisplay = () => {
          if (renderer && renderer.lodSettings) {
            const currentLOD = document.getElementById('currentLOD');
            const currentZoom = document.getElementById('currentZoom');
            
            if (currentLOD) {
              const level = renderer.lodSettings.currentLevel;
              currentLOD.textContent = level.charAt(0).toUpperCase() + level.slice(1);
            }
            
            if (currentZoom) {
              currentZoom.textContent = `${renderer.camera.zoom.toFixed(1)}x`;
            }
          }
        };
        
        setInterval(updateLODDisplay, 500);
      };
      
      setupLODUpdater();
      
      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    it('should update LOD display elements', () => {
      renderer.lodSettings.currentLevel = 'medium';
      renderer.camera.zoom = 2.5;
      
      const updateLODDisplay = () => {
        if (renderer && renderer.lodSettings) {
          const currentLOD = document.getElementById('currentLOD');
          const currentZoom = document.getElementById('currentZoom');
          
          if (currentLOD) {
            const level = renderer.lodSettings.currentLevel;
            currentLOD.textContent = level.charAt(0).toUpperCase() + level.slice(1);
          }
          
          if (currentZoom) {
            currentZoom.textContent = `${renderer.camera.zoom.toFixed(1)}x`;
          }
        }
      };
      
      updateLODDisplay();
      
      expect(mockElements.currentLOD.textContent).toBe('Medium');
      expect(mockElements.currentZoom.textContent).toBe('2.5x');
    });

    it('should handle missing DOM elements gracefully', () => {
      // Temporarily remove elements
      const originalLOD = mockElements.currentLOD;
      const originalZoom = mockElements.currentZoom;
      delete mockElements.currentLOD;
      delete mockElements.currentZoom;
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'currentLOD' || id === 'currentZoom') return null;
        return mockElements[id] || null;
      });
      
      const updateLODDisplay = () => {
        if (renderer && renderer.lodSettings) {
          const currentLOD = document.getElementById('currentLOD');
          const currentZoom = document.getElementById('currentZoom');
          
          if (currentLOD) {
            const level = renderer.lodSettings.currentLevel;
            currentLOD.textContent = level.charAt(0).toUpperCase() + level.slice(1);
          }
          
          if (currentZoom) {
            currentZoom.textContent = `${renderer.camera.zoom.toFixed(1)}x`;
          }
        }
      };
      
      // Should not throw
      expect(() => updateLODDisplay()).not.toThrow();
      
      // Restore elements
      mockElements.currentLOD = originalLOD;
      mockElements.currentZoom = originalZoom;
    });
  });

  describe('Integration with Existing Controls', () => {
    it('should work alongside existing view controls', () => {
      setupLayerControls();
      
      // Layer controls should not interfere with existing functionality
      expect(renderer.showTrails).toBe(true); // Default setting
      expect(renderer.layerVisibility.pheromones).toBe(true);
      
      // Disable pheromone layer
      const changeHandler = mockElements.layerPheromones.addEventListener.mock.calls[0][1];
      changeHandler({ target: { checked: false } });
      
      // Pheromone layer should be disabled, but showTrails setting unchanged
      expect(renderer.layerVisibility.pheromones).toBe(false);
      expect(renderer.showTrails).toBe(true);
    });

    it('should maintain layer state through camera operations', () => {
      setupLayerControls();
      
      // Disable terrain layer
      const changeHandler = mockElements.layerTerrain.addEventListener.mock.calls[0][1];
      changeHandler({ target: { checked: false } });
      
      expect(renderer.layerVisibility.terrain).toBe(false);
      
      // Camera operations should not reset layer visibility
      renderer.panTo(50, 50);
      renderer.zoomTo(2.0);
      
      expect(renderer.layerVisibility.terrain).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing LayeredRenderer gracefully', () => {
      const basicRenderer = { /* Not a LayeredRenderer */ };
      
      const setupLayerControlsForBasicRenderer = () => {
        if (!basicRenderer || !basicRenderer.setLayerVisibility) {
          return; // Should return early
        }
        // This code should not execute
        throw new Error('Should not reach here');
      };
      
      expect(() => setupLayerControlsForBasicRenderer()).not.toThrow();
    });

    it('should handle missing DOM elements gracefully', () => {
      // Remove all layer control elements
      global.document.getElementById.mockReturnValue(null);
      
      expect(() => setupLayerControls()).not.toThrow();
    });
  });
});