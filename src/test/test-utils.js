/**
 * Test Utilities for Ant Colony TTRPG
 * Common functions and mocks for testing
 */

import { vi } from 'vitest'

/**
 * Create a mock HTML structure for menu testing
 */
export function createMenuHTML() {
  document.body.innerHTML = `
    <div class="app-container">
      <!-- Main Menu Overlay -->
      <div id="mainMenu" class="menu-overlay">
        <div class="menu-content">
          <header class="menu-header">
            <h1>🐜 ANT COLONY SIMULATOR 🐜</h1>
            <div class="version-info">Version v0.5 - Configurable Worlds Edition</div>
          </header>
          
          <div class="menu-options">
            <button id="resumeWorldBtn" class="menu-btn primary" disabled>
              🔄 Resume Last World
            </button>
            <button id="createWorldBtn" class="menu-btn">
              ✨ Create New World
            </button>
            <button id="loadWorldBtn" class="menu-btn">
              📁 Load Saved World
            </button>
            <button id="settingsBtn" class="menu-btn">
              ⚙️ Global Settings
            </button>
          </div>
          
          <div class="saved-worlds-preview" id="savedWorldsPreview">
            <h3>Recent Worlds</h3>
            <div class="worlds-list" id="worldsList">
              <div class="no-worlds">No saved worlds yet. Create your first ant colony!</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simulation Interface (initially hidden) -->
      <div id="simulationInterface" class="simulation-interface hidden">
        <header class="header">
          <h1>🐜 ANT COLONY TTRPG - LIVE SIMULATION 🐜</h1>
          <button id="backToMenuBtn" class="back-btn">🏠 Main Menu</button>
        </header>
        <main class="main-content">
          <section class="status-panel">
            <div class="status-group">
              <div class="status-item">
                <span class="status-label">Time:</span>
                <span id="elapsedTime">0:00</span>
              </div>
            </div>
          </section>
          <div id="activityFeed" class="activity-feed">
            <div class="activity-item">🔄 Simulation ready to start...</div>
          </div>
        </main>
      </div>
      
      <!-- World Configuration Modal -->
      <div id="worldConfigModal" class="modal hidden">
        <div class="modal-content world-config-modal">
          <span class="modal-close" id="worldConfigClose">&times;</span>
          <h2>✨ Create New World</h2>
          <form id="worldConfigForm" class="world-config-form">
            <input type="text" id="worldName" placeholder="My Ant Colony" maxlength="30">
            <button type="submit" class="config-btn primary">🚀 Create World</button>
          </form>
        </div>
      </div>
    </div>
  `
}

/**
 * Create mock app instance
 */
export function createMockApp() {
  return {
    simulation: {
      initializeColony: vi.fn().mockResolvedValue({ population: { total: 10 } }),
      stop: vi.fn(),
      start: vi.fn(),
      getState: vi.fn().mockReturnValue({ environment: {}, population: {} })
    },
    renderer: {
      render: vi.fn()
    },
    timeScaleManager: {
      setTimeScale: vi.fn(),
      reset: vi.fn()
    },
    isInitialized: false,
    isSimulationRunning: false,
    settings: {
      showTrails: true,
      showBehaviorStates: true,
      showEnvironmentDetails: true
    },
    initializeSystems: vi.fn().mockResolvedValue(),
    setupUIControls: vi.fn(),
    setupKeyboardControls: vi.fn(),
    updateRendererSettings: vi.fn()
  }
}

/**
 * Create mock Utils with all required methods
 */
export function createMockUtils() {
  return {
    addActivity: vi.fn(),
    setLoading: vi.fn(),
    updateElement: vi.fn(),
    createElement: vi.fn((tag, attrs = {}) => {
      const element = document.createElement(tag)
      Object.keys(attrs).forEach(key => {
        if (key === 'className') {
          element.className = attrs[key]
        } else if (key === 'textContent') {
          element.textContent = attrs[key]
        } else {
          element.setAttribute(key, attrs[key])
        }
      })
      return element
    }),
    storage: {
      get: vi.fn((key, defaultValue = null) => {
        // Return default value for unmocked keys
        return defaultValue
      }),
      set: vi.fn(),
      remove: vi.fn()
    },
    eventEmitter: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    }
  }
}

/**
 * Create sample world configuration for testing
 */
export function createSampleWorldConfig() {
  return {
    worldName: 'Test Colony',
    worldSize: 'medium',
    biomeType: 'forest',
    startingPopulation: 12,
    maxPopulation: 50,
    workerRatio: 60,
    scoutRatio: 25,
    soldierRatio: 15,
    foodAbundance: 'normal',
    hazardLevel: 'peaceful',
    startingSeason: 'spring',
    startingTimeScale: 60,
    createdAt: Date.now(),
    version: 'v0.5',
    id: 'test-uuid-123'
  }
}

/**
 * Wait for DOM updates and async operations
 */
export function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Check if element has specific CSS class
 */
export function hasClass(element, className) {
  return element && element.classList && element.classList.contains(className)
}

/**
 * Check if element is visible (doesn't have 'hidden' class)
 */
export function isVisible(element) {
  return element && !hasClass(element, 'hidden')
}

/**
 * Check if element is hidden (has 'hidden' class)
 */
export function isHidden(element) {
  return element && hasClass(element, 'hidden')
}