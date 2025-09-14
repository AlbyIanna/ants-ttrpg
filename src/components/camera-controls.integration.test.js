/**
 * Integration Tests for Camera Controls UI
 * Tests the interaction between PixelRenderer and HTML UI elements
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PixelRenderer } from './pixel-renderer.js';

// Mock DOM elements
const mockElement = (id, properties = {}) => {
  const element = {
    id,
    addEventListener: vi.fn(),
    textContent: '',
    style: {},
    getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
    ...properties
  };
  return element;
};

// Mock document.getElementById
const mockElements = {
  'colonyCanvas': mockElement('colonyCanvas', {
    width: 750,
    height: 500,
    getContext: vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: vi.fn(),
      globalAlpha: 1,
      imageSmoothingEnabled: false,
      webkitImageSmoothingEnabled: false,
      msImageSmoothingEnabled: false
    }))
  }),
  'minimapCanvas': mockElement('minimapCanvas', {
    width: 80,
    height: 60,
    getContext: vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: vi.fn(),
      imageSmoothingEnabled: false
    }))
  }),
  'panUp': mockElement('panUp'),
  'panDown': mockElement('panDown'),
  'panLeft': mockElement('panLeft'),
  'panRight': mockElement('panRight'),
  'zoomIn': mockElement('zoomIn'),
  'zoomOut': mockElement('zoomOut'),
  'resetView': mockElement('resetView'),
  'zoomLevel': mockElement('zoomLevel')
};

// Mock getElementById
global.document = {
  getElementById: vi.fn((id) => mockElements[id] || null),
  addEventListener: vi.fn(),
  readyState: 'complete'
};

describe('Camera Controls Integration', () => {
  let renderer;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockElements).forEach(element => {
      if (element.addEventListener) element.addEventListener.mockClear();
      if (element.textContent !== undefined) element.textContent = '';
    });
    global.document.getElementById.mockClear();
    global.document.addEventListener.mockClear();

    renderer = new PixelRenderer();
    // Use large world size to allow free camera movement in tests
    renderer.updateWorldSize(300, 200);
  });

  describe('Button Event Handlers', () => {
    it('should register event handlers for all camera control buttons', () => {
      // Verify each button has event listeners attached
      expect(mockElements.panUp.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.panDown.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.panLeft.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.panRight.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.zoomIn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.zoomOut.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.resetView.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should pan camera when pan buttons are clicked', () => {
      // Start camera at a position where it can move in all directions
      renderer.panTo(20, 20);
      const initialX = renderer.camera.x;
      const initialY = renderer.camera.y;

      // Get the click handler for panUp button
      const panUpHandler = mockElements.panUp.addEventListener.mock.calls[0][1];
      
      // Simulate click
      panUpHandler();

      // Camera should have moved up (negative Y direction)
      expect(renderer.camera.y).toBeLessThan(initialY);
      expect(renderer.camera.x).toBe(initialX); // X should be unchanged
    });

    it('should zoom camera when zoom buttons are clicked', () => {
      const initialZoom = renderer.camera.zoom;

      // Get the click handler for zoomIn button
      const zoomInHandler = mockElements.zoomIn.addEventListener.mock.calls[0][1];
      
      // Simulate click
      zoomInHandler();

      // Camera should have zoomed in
      expect(renderer.camera.zoom).toBeGreaterThan(initialZoom);
    });

    it('should reset camera when reset button is clicked', () => {
      // Move and zoom camera first
      renderer.panTo(10, 15);
      renderer.zoomTo(2.0);

      // Get the click handler for resetView button
      const resetHandler = mockElements.resetView.addEventListener.mock.calls[0][1];
      
      // Simulate click
      resetHandler();

      // Camera should be reset to origin
      expect(renderer.camera.x).toBe(0);
      expect(renderer.camera.y).toBe(0);
      expect(renderer.camera.zoom).toBe(1);
    });

    it('should update zoom level UI when zoom changes', () => {
      renderer.zoomTo(1.5);
      renderer.updateCameraUI();

      expect(mockElements.zoomLevel.textContent).toBe('1.5x');
    });
  });

  describe('Canvas Event Handlers', () => {
    it('should register mouse and wheel event handlers on canvas', () => {
      const canvas = mockElements.colonyCanvas;
      
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    it('should handle wheel zoom events', () => {
      const canvas = mockElements.colonyCanvas;
      const wheelHandler = canvas.addEventListener.mock.calls.find(
        call => call[0] === 'wheel'
      )[1];

      const initialZoom = renderer.camera.zoom;

      // Simulate wheel zoom in
      const wheelEvent = {
        preventDefault: vi.fn(),
        deltaY: -100, // Zoom in
        clientX: 50,
        clientY: 50
      };

      wheelHandler(wheelEvent);

      expect(wheelEvent.preventDefault).toHaveBeenCalled();
      expect(renderer.camera.zoom).toBeGreaterThan(initialZoom);
    });

    it('should handle drag panning', () => {
      const canvas = mockElements.colonyCanvas;
      const mouseDownHandler = canvas.addEventListener.mock.calls.find(
        call => call[0] === 'mousedown'
      )[1];
      const mouseMoveHandler = canvas.addEventListener.mock.calls.find(
        call => call[0] === 'mousemove'
      )[1];

      // Start camera at a position where it can move
      renderer.panTo(20, 20);
      const initialX = renderer.camera.x;
      const initialY = renderer.camera.y;

      // Start dragging
      mouseDownHandler({
        button: 0,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn()
      });

      // Simulate significant drag
      mouseMoveHandler({
        clientX: 200,
        clientY: 200
      });

      // Camera should have moved (direction depends on zoom and pixel size)
      expect(renderer.camera.x !== initialX || renderer.camera.y !== initialY).toBe(true);
    });
  });

  describe('Keyboard Event Handlers', () => {
    it('should register keyboard event handlers on document', () => {
      expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should handle arrow key panning', () => {
      const keyHandler = global.document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // Start camera at a position where it can move
      renderer.panTo(20, 20);
      const initialX = renderer.camera.x;
      const initialY = renderer.camera.y;

      // Simulate arrow up
      keyHandler({
        key: 'ArrowUp',
        target: { tagName: 'DIV' }, // Not an input
        preventDefault: vi.fn()
      });

      // Camera should have moved up
      expect(renderer.camera.y).toBeLessThan(initialY);
      expect(renderer.camera.x).toBe(initialX);
    });

    it('should handle WASD panning', () => {
      const keyHandler = global.document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      // Start camera at a position where it can move left
      renderer.panTo(20, 20);
      const initialX = renderer.camera.x;

      // Simulate 'a' key (pan left)
      keyHandler({
        key: 'a',
        target: { tagName: 'DIV' },
        preventDefault: vi.fn()
      });

      // Camera should have moved left
      expect(renderer.camera.x).toBeLessThan(initialX);
    });

    it('should handle zoom keyboard shortcuts', () => {
      const keyHandler = global.document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const initialZoom = renderer.camera.zoom;

      // Simulate '+' key (zoom in)
      keyHandler({
        key: '+',
        target: { tagName: 'DIV' },
        preventDefault: vi.fn()
      });

      // Camera should have zoomed in
      expect(renderer.camera.zoom).toBeGreaterThan(initialZoom);
    });

    it('should ignore key events when typing in input fields', () => {
      const keyHandler = global.document.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const initialX = renderer.camera.x;
      const preventDefault = vi.fn();

      // Simulate arrow key while focused on input
      keyHandler({
        key: 'ArrowUp',
        target: { tagName: 'INPUT' },
        preventDefault
      });

      // Camera should not move and preventDefault should not be called
      expect(renderer.camera.x).toBe(initialX);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Mini-map Integration', () => {
    it('should setup mini-map click handler', () => {
      const minimap = mockElements.minimapCanvas;
      
      expect(minimap.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should pan camera when mini-map is clicked', () => {
      const minimap = mockElements.minimapCanvas;
      const clickHandler = minimap.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      // Use a larger world size to test mini-map functionality properly
      renderer.updateWorldSize(200, 150);
      renderer.panTo(0, 0); // Start at origin
      const initialX = renderer.camera.x;
      const initialY = renderer.camera.y;

      // Simulate mini-map click at far edge (should move camera significantly)
      clickHandler({
        clientX: 70, // Click near right edge of 80px wide mini-map
        clientY: 50  // Click near bottom edge of 60px high mini-map
      });

      // Camera should have moved to clicked location
      expect(renderer.camera.x !== initialX || renderer.camera.y !== initialY).toBe(true);
    });
  });

  describe('Camera State Persistence', () => {
    it('should maintain camera state across UI interactions', () => {
      // Use larger world so coordinates aren't clamped
      renderer.updateWorldSize(200, 150);
      
      // Pan and zoom
      renderer.panTo(25, 30);
      renderer.zoomTo(2.5);

      // Verify state is maintained
      expect(renderer.camera.x).toBe(25);
      expect(renderer.camera.y).toBe(30);
      expect(renderer.camera.zoom).toBe(2.5);

      // UI update should reflect current state
      renderer.updateCameraUI();
      expect(mockElements.zoomLevel.textContent).toBe('2.5x');
    });

    it('should validate camera bounds during UI operations', () => {
      // Set very small world for testing bounds
      renderer.updateWorldSize(10, 10);
      
      // Try to pan beyond world bounds
      renderer.panTo(-50, -50);
      
      // Camera should be clamped to valid bounds (0 is minimum for small worlds)
      expect(renderer.camera.x).toBeGreaterThanOrEqual(0);
      expect(renderer.camera.y).toBeGreaterThanOrEqual(0);
    });

    it('should handle zoom limits during UI operations', () => {
      // Try to zoom beyond limits
      renderer.zoomTo(100); // Way beyond max zoom
      expect(renderer.camera.zoom).toBeLessThanOrEqual(5.0); // Max zoom limit
      
      renderer.zoomTo(-5); // Below min zoom
      expect(renderer.camera.zoom).toBeGreaterThanOrEqual(0.1); // Min zoom limit
    });
  });
});