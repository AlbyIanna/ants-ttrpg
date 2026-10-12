/**
 * Tests for MenuManager
 * Comprehensive testing for menu functionality and world management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  createMenuHTML, 
  createMockApp, 
  createMockUtils,
  createSampleWorldConfig,
  waitForAsync,
  isVisible,
  isHidden
} from '../test/test-utils.js'

// Mock Utils module
const mockUtils = createMockUtils()
vi.mock('./utils.js', () => ({
  Utils: mockUtils
}))

// Import after mocking
const { MenuManager } = await import('./menu-manager.js')

describe('MenuManager', () => {
  let menuManager
  let mockApp

  beforeEach(() => {
    // Setup DOM
    createMenuHTML()
    
    // Create mocks
    mockApp = createMockApp()

    // Create MenuManager instance
    menuManager = new MenuManager(mockApp)
  })

  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('Initialization', () => {
    it('should initialize with menu visible', () => {
      expect(menuManager.isMenuVisible).toBe(true)
      
      const mainMenu = document.getElementById('mainMenu')
      expect(isVisible(mainMenu)).toBe(true)
    })

    it('should setup UI elements correctly', () => {
      expect(menuManager.mainMenu).toBeTruthy()
      expect(menuManager.simulationInterface).toBeTruthy()
      expect(menuManager.worldConfigModal).toBeTruthy()
      expect(menuManager.worldConfigForm).toBeTruthy()
    })

    it('should setup event handlers for menu buttons', () => {
      const resumeBtn = document.getElementById('resumeWorldBtn')
      const createBtn = document.getElementById('createWorldBtn')
      const loadBtn = document.getElementById('loadWorldBtn')
      const settingsBtn = document.getElementById('settingsBtn')

      expect(resumeBtn).toBeTruthy()
      expect(createBtn).toBeTruthy()
      expect(loadBtn).toBeTruthy()
      expect(settingsBtn).toBeTruthy()
    })
  })

  describe('Menu Visibility Management', () => {
    it('should show menu and hide simulation interface', () => {
      menuManager.showMenu()
      
      const mainMenu = document.getElementById('mainMenu')
      const simulationInterface = document.getElementById('simulationInterface')
      
      expect(isVisible(mainMenu)).toBe(true)
      expect(isHidden(simulationInterface)).toBe(true)
      expect(menuManager.isMenuVisible).toBe(true)
    })

    it('should hide menu and show simulation interface', () => {
      menuManager.hideMenu()
      
      const mainMenu = document.getElementById('mainMenu')
      const simulationInterface = document.getElementById('simulationInterface')
      
      expect(isHidden(mainMenu)).toBe(true)
      expect(isVisible(simulationInterface)).toBe(true)
      expect(menuManager.isMenuVisible).toBe(false)
    })

    it('should stop simulation when showing menu', () => {
      mockApp.isSimulationRunning = true
      
      menuManager.showMenu()
      
      expect(mockApp.simulation.stop).toHaveBeenCalled()
      expect(mockApp.isSimulationRunning).toBe(false)
    })
  })

  describe('Resume Last World', () => {
    it('should resume last world successfully', async () => {
      // Setup: Mock has valid lastWorld data
      mockUtils.storage.get.mockReturnValue({
        worldName: 'Test World',
        biomeType: 'forest',
        startingPopulation: 12
      })

      await menuManager.resumeLastWorld()

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining('Resuming world: Test World'), 
        'info'
      )
      expect(menuManager.isMenuVisible).toBe(false)
      expect(mockApp.initializeSystems).toHaveBeenCalled()
    })

    it('should handle no last world available', async () => {
      // Setup: No saved world
      mockUtils.storage.get.mockReturnValue(null)

      await menuManager.resumeLastWorld()

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        '❌ No world to resume', 
        'error'
      )
      expect(menuManager.isMenuVisible).toBe(true) // Menu should stay visible
    })

    it('should handle world loading errors', async () => {
      // Setup: Mock world exists but initialization fails
      mockUtils.storage.get.mockReturnValue({
        worldName: 'Broken World'
      })
      mockApp.simulation.initializeColony.mockRejectedValue(new Error('Failed to load'))

      await menuManager.resumeLastWorld()

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining('Failed to resume world'), 
        'error'
      )
      expect(menuManager.isMenuVisible).toBe(true) // Should return to menu
    })
  })

  describe('World Loading', () => {
    it('should load world by ID successfully', async () => {
      const sampleWorld = createSampleWorldConfig()
      
      await menuManager.loadWorldById(sampleWorld)

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining(`Loading world: ${sampleWorld.worldName}`),
        'info'
      )
      expect(menuManager.currentWorldConfig).toEqual(sampleWorld)
      expect(menuManager.isMenuVisible).toBe(false)
    })

    it('should handle world loading by ID errors', async () => {
      const sampleWorld = createSampleWorldConfig()
      mockApp.simulation.initializeColony.mockRejectedValue(new Error('Loading failed'))
      
      await menuManager.loadWorldById(sampleWorld)

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load world'),
        'error'
      )
      expect(menuManager.isMenuVisible).toBe(true) // Should return to menu
    })

    it('should show error when no saved worlds exist', () => {
      mockUtils.storage.get.mockReturnValue([]) // Empty saved worlds array
      
      menuManager.showLoadWorld()

      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        '📁 No saved worlds found. Create a world first!',
        'info'
      )
    })
  })

  describe('World Configuration', () => {
    it('should show world configuration modal', () => {
      menuManager.showWorldConfig()
      
      const modal = document.getElementById('worldConfigModal')
      expect(isVisible(modal)).toBe(true)
    })

    it('should hide world configuration modal', () => {
      menuManager.hideWorldConfig()
      
      const modal = document.getElementById('worldConfigModal')
      expect(isHidden(modal)).toBe(true)
    })

    it('should create world with valid configuration', async () => {
      const form = document.getElementById('worldConfigForm')
      const worldNameInput = document.getElementById('worldName')
      
      worldNameInput.value = 'New Test World'
      
      await menuManager.createWorld()

      expect(menuManager.isMenuVisible).toBe(false)
      expect(mockApp.initializeSystems).toHaveBeenCalled()
      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining('Creating world'),
        'info'
      )
    })

    it('should apply preset configurations correctly', () => {
      const presetConfig = menuManager.defaultConfigs.quickStart
      
      menuManager.applyPreset('quickStart')
      
      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        '🎯 Applied quickStart preset',
        'info'
      )
    })
  })

  describe('Menu Button States', () => {
    it('should enable resume button when last world exists', () => {
      mockUtils.storage.get.mockReturnValue({
        worldName: 'Last World'
      })
      
      menuManager.updateMenuButtons()
      
      const resumeBtn = document.getElementById('resumeWorldBtn')
      expect(resumeBtn.disabled).toBe(false)
      expect(resumeBtn.textContent).toContain('Resume Last World')
    })

    it('should disable resume button when no last world exists', () => {
      mockUtils.storage.get.mockReturnValue(null)
      
      menuManager.updateMenuButtons()
      
      const resumeBtn = document.getElementById('resumeWorldBtn')
      expect(resumeBtn.disabled).toBe(true)
      expect(resumeBtn.textContent).toContain('Resume last world')
    })
  })

  describe('Saved Worlds List', () => {
    it('should display saved worlds in the list', () => {
      const savedWorlds = [
        { id: 'world-1', worldName: 'World 1', biomeType: 'forest', startingPopulation: 10, savedAt: Date.now() },
        { id: 'world-2', worldName: 'World 2', biomeType: 'desert', startingPopulation: 8, savedAt: Date.now() }
      ]
      mockUtils.storage.get.mockReturnValue(savedWorlds)
      
      menuManager.loadSavedWorlds()
      
      const worldsList = document.getElementById('worldsList')
      expect(worldsList.children.length).toBe(2)
      expect(worldsList.innerHTML).toContain('World 1')
      expect(worldsList.innerHTML).toContain('World 2')
    })

    it('should show no worlds message when list is empty', () => {
      mockUtils.storage.get.mockReturnValue([])
      
      menuManager.loadSavedWorlds()
      
      const worldsList = document.getElementById('worldsList')
      expect(worldsList.innerHTML).toContain('No saved worlds yet')
    })
  })

  describe('World Configuration Validation', () => {
    it('should sanitize world name input', async () => {
      // Setup form with invalid world name
      const worldNameInput = document.getElementById('worldName')
      worldNameInput.value = '   Very Long World Name That Exceeds The Maximum Length Limit   '
      
      await menuManager.createWorld()
      
      expect(menuManager.currentWorldConfig.worldName).toBe('Very Long World Name That Exce') // Trimmed to 30 chars
    })

    it('should provide default world name when empty', async () => {
      const worldNameInput = document.getElementById('worldName')
      worldNameInput.value = '   ' // Only whitespace
      
      await menuManager.createWorld()
      
      expect(menuManager.currentWorldConfig.worldName).toBe('My Ant Colony')
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      mockApp.initializeSystems.mockRejectedValue(new Error('Init failed'))
      
      const world = createSampleWorldConfig()
      
      // Should not throw
      try {
        await menuManager.initializeWorldWithConfig(world)
      } catch (error) {
        // Expected to catch error
      }
      
      // Should have attempted initialization
      expect(mockApp.initializeSystems).toHaveBeenCalled()
    })

    it('should return to menu when world creation fails', async () => {
      mockApp.simulation.initializeColony.mockRejectedValue(new Error('Creation failed'))
      
      await menuManager.createWorld()
      
      expect(mockUtils.addActivity).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create world'),
        'error'
      )
      expect(menuManager.isMenuVisible).toBe(true)
    })
  })

  describe('Menu Overlay Visibility Bug', () => {
    it('should actually hide menu overlay when hideMenu() is called', () => {
      // Setup: Menu is initially visible
      menuManager.showMenu()
      const mainMenu = document.getElementById('mainMenu')
      expect(isVisible(mainMenu)).toBe(true)
      
      // Action: Hide menu
      menuManager.hideMenu()
      
      // Assert: Menu should have hidden class
      expect(mainMenu.classList.contains('hidden')).toBe(true)
      expect(isHidden(mainMenu)).toBe(true)
      
      // Critical: The menu should actually be hidden visually
      // This test exposes the CSS bug where .menu-overlay.hidden doesn't exist
      const computedStyle = window.getComputedStyle(mainMenu)
      expect(computedStyle.display).toBe('none')
    })
    
    it('should properly transition from menu to simulation view', async () => {
      // Setup: Start with menu visible
      menuManager.showMenu()
      const mainMenu = document.getElementById('mainMenu')
      const simulationInterface = document.getElementById('simulationInterface')
      
      expect(isVisible(mainMenu)).toBe(true)
      expect(isHidden(simulationInterface)).toBe(true)
      
      // Action: Load a world (which should hide menu and show simulation)
      const world = createSampleWorldConfig()
      await menuManager.loadWorldById(world)
      
      // Assert: Menu should be completely hidden, simulation visible
      expect(isHidden(mainMenu)).toBe(true)
      expect(isVisible(simulationInterface)).toBe(true)
      
      // Critical: Menu overlay should not be blocking simulation interface
      const menuComputedStyle = window.getComputedStyle(mainMenu)
      expect(menuComputedStyle.display).toBe('none')
    })
    
    it('should restore menu visibility when returning from simulation', () => {
      // Setup: Start in simulation
      menuManager.hideMenu()
      const mainMenu = document.getElementById('mainMenu')
      const simulationInterface = document.getElementById('simulationInterface')
      
      expect(isHidden(mainMenu)).toBe(true)
      expect(isVisible(simulationInterface)).toBe(true)
      
      // Action: Return to menu
      menuManager.showMenu()
      
      // Assert: Menu visible, simulation hidden
      expect(isVisible(mainMenu)).toBe(true)
      expect(isHidden(simulationInterface)).toBe(true)
      
      // Critical: Menu should be fully visible and interactive
      const menuComputedStyle = window.getComputedStyle(mainMenu)
      expect(menuComputedStyle.display).not.toBe('none')
    })
  })

  describe('Integration with App Components', () => {
    it('should initialize systems when app is not initialized', async () => {
      mockApp.isInitialized = false
      
      const world = createSampleWorldConfig()
      await menuManager.initializeWorldWithConfig(world)
      
      expect(mockApp.initializeSystems).toHaveBeenCalled()
      expect(mockApp.setupUIControls).toHaveBeenCalled()
      expect(mockApp.setupKeyboardControls).toHaveBeenCalled()
    })

    it('should set time scale when time manager is available', async () => {
      const world = createSampleWorldConfig()
      world.startingTimeScale = 3600
      
      await menuManager.initializeWorldWithConfig(world)
      
      expect(mockApp.timeScaleManager.setTimeScale).toHaveBeenCalledWith('HOUR_SCALE')
    })
  })

  describe('World Size Integration Bug', () => {
    it('should pass correct dimensions for small world size to simulation', async () => {
      // Setup form with small world size
      const worldSizeSelect = document.getElementById('worldSize')
      worldSizeSelect.value = 'small'
      
      await menuManager.createWorld()
      
      // Should pass worldSize config to simulation, not old dimensions
      expect(mockApp.simulation.initializeColony).toHaveBeenCalledWith(
        'forest_floor',
        expect.objectContaining({
          worldSize: 'small'
        })
      )
      
      // Should not pass old MenuManager dimensions
      expect(mockApp.simulation.initializeColony).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 50,
          height: 30
        })
      )
    })

    it('should pass correct dimensions for large world size to simulation', async () => {
      const worldSizeSelect = document.getElementById('worldSize')
      worldSizeSelect.value = 'large'
      
      await menuManager.createWorld()
      
      expect(mockApp.simulation.initializeColony).toHaveBeenCalledWith(
        'forest_floor',
        expect.objectContaining({
          worldSize: 'large'
        })
      )
    })

    it('should pass correct dimensions for huge world size to simulation', async () => {
      const worldSizeSelect = document.getElementById('worldSize')
      worldSizeSelect.value = 'huge'
      
      await menuManager.createWorld()
      
      expect(mockApp.simulation.initializeColony).toHaveBeenCalledWith(
        'forest_floor',
        expect.objectContaining({
          worldSize: 'huge'
        })
      )
    })
  })
})