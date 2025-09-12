/**
 * Vitest Setup File
 * Global test configuration and utilities
 */

import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock performance.now for consistent timing in tests
global.performance = {
  now: vi.fn(() => Date.now())
}

// Mock crypto.randomUUID for deterministic IDs in tests
if (!global.crypto) {
  global.crypto = {}
}
global.crypto.randomUUID = vi.fn(() => 'test-uuid-123')

// Mock window methods that might be used
global.window = {
  ...global.window,
  innerWidth: 1024,
  innerHeight: 768,
  prompt: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn()
}

// Mock getComputedStyle for CSS testing
global.window.getComputedStyle = vi.fn((element) => {
  // Mock computed style based on element classes
  const mockStyle = {
    display: 'block', // default
    visibility: 'visible',
    opacity: '1'
  }
  
  // If element has 'hidden' class and proper CSS rule exists, return display: none
  if (element && element.classList && element.classList.contains('hidden')) {
    // Check if element has classes that should have hidden behavior
    const hasHiddenRule = element.classList.contains('modal') || 
                         element.classList.contains('simulation-interface') ||
                         element.classList.contains('loading-overlay') ||
                         element.classList.contains('menu-overlay')
    
    if (hasHiddenRule) {
      // All elements with proper hidden rules should be display: none
      mockStyle.display = 'none'
    }
  }
  
  return mockStyle
})

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
})