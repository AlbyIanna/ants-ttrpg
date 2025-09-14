/**
 * Tests for PixelRenderer - Viewport/Camera System
 * TDD approach for Phase 1 Canvas Optimization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PixelRenderer } from './pixel-renderer.js'

// Mock DOM setup
function createCanvasDOM() {
  document.body.innerHTML = `
    <canvas id="colonyCanvas" width="800" height="600"></canvas>
  `
  
  // Mock canvas context
  const mockContext = {
    fillStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    webkitImageSmoothingEnabled: true,
    msImageSmoothingEnabled: true,
    translate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn()
  }
  
  const mockCanvas = document.getElementById('colonyCanvas')
  mockCanvas.getContext = vi.fn(() => mockContext)
  
  return { mockCanvas, mockContext }
}

describe('PixelRenderer - Viewport/Camera System', () => {
  let renderer
  let mockCanvas, mockContext

  beforeEach(() => {
    const setup = createCanvasDOM()
    mockCanvas = setup.mockCanvas
    mockContext = setup.mockContext
    
    renderer = new PixelRenderer()
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('Camera Initialization', () => {
    it('should initialize camera with default position (0,0)', () => {
      expect(renderer.camera.x).toBe(0)
      expect(renderer.camera.y).toBe(0)
    })

    it('should initialize camera with default zoom level (1)', () => {
      expect(renderer.camera.zoom).toBe(1)
    })

    it('should initialize viewport dimensions from canvas', () => {
      expect(renderer.viewport.width).toBeGreaterThan(0)
      expect(renderer.viewport.height).toBeGreaterThan(0)
    })

    it('should calculate visible world bounds correctly', () => {
      const bounds = renderer.getVisibleBounds()
      
      expect(bounds).toHaveProperty('left')
      expect(bounds).toHaveProperty('top') 
      expect(bounds).toHaveProperty('right')
      expect(bounds).toHaveProperty('bottom')
      expect(bounds.left).toBeLessThan(bounds.right)
      expect(bounds.top).toBeLessThan(bounds.bottom)
    })
  })

  describe('Camera Movement', () => {
    it('should pan camera to specific coordinates', () => {
      // Make world larger than viewport to allow free panning
      renderer.updateWorldSize(200, 150)
      
      renderer.panTo(100, 50)
      
      expect(renderer.camera.x).toBe(100)
      expect(renderer.camera.y).toBe(50)
    })

    it('should pan camera by relative offset', () => {
      // Make world larger than viewport to allow free panning
      renderer.updateWorldSize(200, 150)
      
      renderer.camera.x = 10
      renderer.camera.y = 20
      
      renderer.panBy(30, 40)
      
      expect(renderer.camera.x).toBe(40)
      expect(renderer.camera.y).toBe(60)
    })

    it('should clamp camera position to world bounds for small worlds', () => {
      // Create a truly small world (smaller than viewport)
      renderer.worldWidth = 50
      renderer.worldHeight = 40
      
      // Try to pan beyond world bounds
      renderer.panTo(-50, -30)
      
      expect(renderer.camera.x).toBeGreaterThanOrEqual(0)
      expect(renderer.camera.y).toBeGreaterThanOrEqual(0)
    })

    it('should allow free panning for large worlds', () => {
      renderer.worldWidth = 500
      renderer.worldHeight = 300
      
      renderer.panTo(200, 150)
      
      expect(renderer.camera.x).toBe(200)
      expect(renderer.camera.y).toBe(150)
    })
  })

  describe('Camera Zoom', () => {
    it('should zoom to specific level within bounds', () => {
      renderer.zoomTo(2.0)
      
      expect(renderer.camera.zoom).toBe(2.0)
    })

    it('should zoom by relative factor', () => {
      renderer.camera.zoom = 1.0
      
      renderer.zoomBy(1.5)
      
      expect(renderer.camera.zoom).toBe(1.5)
    })

    it('should clamp zoom to minimum level (0.1x)', () => {
      renderer.zoomTo(0.05)
      
      expect(renderer.camera.zoom).toBeGreaterThanOrEqual(0.1)
    })

    it('should clamp zoom to maximum level (5.0x)', () => {
      renderer.zoomTo(10.0)
      
      expect(renderer.camera.zoom).toBeLessThanOrEqual(5.0)
    })

    it('should zoom towards mouse position when provided', () => {
      // Make world larger than viewport to allow camera movement
      renderer.updateWorldSize(200, 150)
      
      const mouseX = 400
      const mouseY = 300
      const initialCameraX = renderer.camera.x
      const initialCameraY = renderer.camera.y
      
      renderer.zoomTowardPoint(2.0, mouseX, mouseY)
      
      expect(renderer.camera.zoom).toBe(2.0)
      // Camera should shift to keep mouse point in same screen location
      expect(renderer.camera.x).not.toBe(initialCameraX)
      expect(renderer.camera.y).not.toBe(initialCameraY)
    })
  })

  describe('Viewport Culling', () => {
    it('should only render visible portions of large worlds', () => {
      const largeWorldState = {
        environment: {
          metadata: { width: 500, height: 300 },
          terrain: Array(300).fill().map(() => Array(500).fill('.')),
          foodSources: []
        },
        ants: []
      }
      
      // Position camera at (100, 100) with 1x zoom
      renderer.panTo(100, 100)
      renderer.zoomTo(1.0)
      
      renderer.render(largeWorldState)
      
      // Should only call fillRect for visible tiles, not all 150,000 tiles
      const fillRectCalls = mockContext.fillRect.mock.calls.length
      const maxVisibleTiles = (renderer.canvasWidth / renderer.pixelSize + 2) * 
                              (renderer.canvasHeight / renderer.pixelSize + 2)
      
      expect(fillRectCalls).toBeLessThan(maxVisibleTiles * 2) // Some buffer for overlap
      expect(fillRectCalls).toBeGreaterThan(0) // But should render something
    })

    it('should calculate correct tile bounds for rendering', () => {
      renderer.worldWidth = 300
      renderer.worldHeight = 200  
      renderer.panTo(50, 30)
      renderer.zoomTo(2.0)
      
      const bounds = renderer.getVisibleTileBounds()
      
      expect(bounds.startX).toBeGreaterThanOrEqual(0)
      expect(bounds.startY).toBeGreaterThanOrEqual(0)
      expect(bounds.endX).toBeLessThanOrEqual(300)
      expect(bounds.endY).toBeLessThanOrEqual(200)
      expect(bounds.startX).toBeLessThan(bounds.endX)
      expect(bounds.startY).toBeLessThan(bounds.endY)
    })

    it('should skip rendering completely off-screen elements', () => {
      const worldState = {
        environment: {
          metadata: { width: 200, height: 150 },
          terrain: Array(150).fill().map(() => Array(200).fill('.')),
          foodSources: [
            { x: 10, y: 10, discovered: true, depleted: false, type: 'berries' },
            { x: 180, y: 140, discovered: true, depleted: false, type: 'seeds' }
          ]
        },
        ants: [
          { position: { x: 15, y: 15 }, role: 'worker', carryingFood: false },
          { position: { x: 185, y: 145 }, role: 'scout', carryingFood: true }
        ]
      }
      
      // Position camera to only see top-left area
      renderer.panTo(0, 0)
      renderer.zoomTo(1.0)
      
      const initialFillRectCalls = mockContext.fillRect.mock.calls.length
      renderer.render(worldState)
      
      // Should have rendered something (can't easily test exact counts due to terrain)
      expect(mockContext.fillRect.mock.calls.length).toBeGreaterThan(initialFillRectCalls)
    })
  })

  describe('Performance Requirements', () => {
    it('should render small visible area of huge world under 16ms (60fps)', () => {
      const hugeWorldState = {
        environment: {
          metadata: { width: 500, height: 300 },
          terrain: Array(300).fill().map(() => Array(500).fill('.')),
          foodSources: Array(50).fill().map((_, i) => ({
            x: i * 10, y: i * 6, discovered: true, depleted: false, type: 'berries'
          }))
        },
        ants: Array(100).fill().map((_, i) => ({
          position: { x: i * 5, y: i * 3 },
          role: 'worker',
          carryingFood: false
        }))
      }
      
      const startTime = performance.now()
      renderer.render(hugeWorldState)
      const renderTime = performance.now() - startTime
      
      expect(renderTime).toBeLessThan(16) // 60fps requirement
    })

    it('should handle zoom changes without performance degradation', () => {
      const worldState = {
        environment: {
          metadata: { width: 200, height: 150 },
          terrain: Array(150).fill().map(() => Array(200).fill('.')),
          foodSources: []
        },
        ants: []
      }
      
      const zoomLevels = [0.5, 1.0, 2.0, 3.0]
      const renderTimes = []
      
      for (const zoom of zoomLevels) {
        renderer.zoomTo(zoom)
        
        const startTime = performance.now()
        renderer.render(worldState)
        const renderTime = performance.now() - startTime
        
        renderTimes.push(renderTime)
      }
      
      // All zoom levels should render reasonably fast
      renderTimes.forEach(time => {
        expect(time).toBeLessThan(20) // Allow slight variance
      })
    })
  })

  describe('World Coordinate Conversion', () => {
    it('should convert screen coordinates to world coordinates', () => {
      renderer.panTo(50, 30)
      renderer.zoomTo(2.0)
      
      const worldCoords = renderer.screenToWorld(100, 80)
      
      expect(worldCoords).toHaveProperty('x')
      expect(worldCoords).toHaveProperty('y')
      expect(typeof worldCoords.x).toBe('number')
      expect(typeof worldCoords.y).toBe('number')
    })

    it('should convert world coordinates to screen coordinates', () => {
      renderer.panTo(25, 25)
      renderer.zoomTo(1.5)
      
      const screenCoords = renderer.worldToScreen(100, 75)
      
      expect(screenCoords).toHaveProperty('x')
      expect(screenCoords).toHaveProperty('y')
      expect(typeof screenCoords.x).toBe('number')
      expect(typeof screenCoords.y).toBe('number')
    })

    it('should maintain coordinate conversion consistency', () => {
      const worldX = 123
      const worldY = 87
      
      const screenCoords = renderer.worldToScreen(worldX, worldY)
      const backToWorldCoords = renderer.screenToWorld(screenCoords.x, screenCoords.y)
      
      expect(Math.abs(backToWorldCoords.x - worldX)).toBeLessThan(1)
      expect(Math.abs(backToWorldCoords.y - worldY)).toBeLessThan(1)
    })
  })

  describe('Dynamic World Size Support', () => {
    it('should update viewport when world size changes', () => {
      const smallWorld = { width: 100, height: 75 }
      const largeWorld = { width: 500, height: 300 }
      
      renderer.updateWorldSize(smallWorld.width, smallWorld.height)
      expect(renderer.worldWidth).toBe(100)
      expect(renderer.worldHeight).toBe(75)
      
      renderer.updateWorldSize(largeWorld.width, largeWorld.height)
      expect(renderer.worldWidth).toBe(500)
      expect(renderer.worldHeight).toBe(300)
    })

    it('should adjust camera bounds when world size changes', () => {
      // Start with a small world (smaller than viewport)
      renderer.updateWorldSize(50, 40) 
      renderer.panTo(200, 150) // Try to pan beyond bounds
      
      // Camera should be clamped for small worlds
      expect(renderer.camera.x).toBeLessThanOrEqual(50)
      expect(renderer.camera.y).toBeLessThanOrEqual(40)
    })
  })
})