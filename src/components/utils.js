/**
 * Utility Functions for Ant Colony TTRPG
 * Version: v0.5 - ES6 Module Version
 */

export class Utils {
  /**
   * Create DOM element with attributes
   */
  static createElement(tag, attributes = {}) {
    const element = document.createElement(tag);
    Object.keys(attributes).forEach(key => {
      if (key === 'className') {
        element.className = attributes[key];
      } else if (key === 'textContent') {
        element.textContent = attributes[key];
      } else {
        element.setAttribute(key, attributes[key]);
      }
    });
    return element;
  }

  /**
   * Update element text content safely
   */
  static updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = content;
    }
  }

  /**
   * Format time in MM:SS format
   */
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate distance between two points
   */
  static distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  static randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation
   */
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Get random element from array
   */
  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Shuffle array in place
   */
  static shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Deep clone object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Debounce function calls
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Add activity to feed
   */
  static addActivity(message, type = 'info') {
    const feed = document.getElementById('activityFeed');
    if (feed) {
      // The colony log is an <ol>; leading emoji are dropped to match the UI's icon style
      const text = String(message).replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '');
      const item = Utils.createElement(feed.tagName === 'OL' || feed.tagName === 'UL' ? 'li' : 'div', {
        className: `activity-item activity-${type}`,
        textContent: text
      });
      
      feed.insertBefore(item, feed.firstChild);
      
      // Limit to 20 items
      while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
      }
      
      // Auto scroll to top
      feed.scrollTop = 0;
    }
  }

  /**
   * Show modal dialog
   */
  static showModal(title, content) {
    const modal = document.getElementById('antModal');
    const titleElement = modal.querySelector('h3');
    const contentElement = document.getElementById('antDetails');
    
    if (titleElement) titleElement.textContent = title;
    if (contentElement) contentElement.innerHTML = content;
    
    modal.classList.remove('hidden');
    
    // Close on click outside
    const closeHandler = (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) {
        modal.classList.add('hidden');
        modal.removeEventListener('click', closeHandler);
      }
    };
    
    modal.addEventListener('click', closeHandler);
  }

  /**
   * Set loading state
   */
  static setLoading(isLoading, progress = 0) {
    const overlay = document.getElementById('loadingOverlay');
    const progressBar = document.getElementById('loadingBar');
    
    if (overlay) {
      overlay.style.display = isLoading ? 'flex' : 'none';
    }
    
    if (progressBar && isLoading) {
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }

  /**
   * Performance measurement utilities
   */
  static performance = {
    timers: {},
    
    start(name) {
      this.timers[name] = performance.now();
    },
    
    end(name) {
      if (this.timers[name]) {
        const duration = performance.now() - this.timers[name];
        delete this.timers[name];
        return duration;
      }
      return 0;
    },
    
    measure(name, fn) {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    }
  };

  /**
   * Local storage utilities
   */
  static storage = {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    },
    
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
        return defaultValue;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
      }
    }
  };

  /**
   * Event emitter for loose coupling
   */
  static eventEmitter = {
    events: {},
    
    on(event, callback) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(callback);
    },
    
    off(event, callback) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
    },
    
    emit(event, ...args) {
      if (this.events[event]) {
        this.events[event].forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error(`Error in event handler for '${event}':`, error);
          }
        });
      }
    }
  };
}