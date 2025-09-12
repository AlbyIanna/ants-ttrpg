/**
 * Browser utilities for Ant Colony TTRPG
 * Version: v0.4 - Browser adaptation utilities
 */

// Common utility functions
const Utils = {
    /**
     * Format elapsed time in MM:SS format
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Linear interpolation
     */
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    },

    /**
     * Calculate distance between two points
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    /**
     * Generate random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Generate random float between min and max
     */
    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Choose random element from array
     */
    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
    },

    /**
     * Create DOM element with attributes and children
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        }
        
        // Append children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    /**
     * Add activity to the feed
     */
    addActivity(message, type = 'info') {
        const feed = document.getElementById('activityFeed');
        const activity = this.createElement('div', {
            className: `activity-item ${type}`
        }, [message]);
        
        feed.insertBefore(activity, feed.firstChild);
        
        // Limit to 20 items
        while (feed.children.length > 20) {
            feed.removeChild(feed.lastChild);
        }
        
        // Auto-scroll to top
        feed.scrollTop = 0;
    },

    /**
     * Update DOM element text content safely
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    },

    /**
     * Show/hide loading overlay
     */
    setLoading(isLoading, progress = 0) {
        const overlay = document.getElementById('loadingOverlay');
        const bar = document.getElementById('loadingBar');
        
        if (isLoading) {
            overlay.classList.remove('hidden');
            bar.style.width = `${progress}%`;
        } else {
            overlay.classList.add('hidden');
        }
    },

    /**
     * Show modal with content
     */
    showModal(title, content) {
        const modal = document.getElementById('antModal');
        const modalTitle = modal.querySelector('h3');
        const modalContent = modal.querySelector('#antDetails');
        
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        modal.classList.remove('hidden');
    },

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('antModal');
        modal.classList.add('hidden');
    },

    /**
     * Performance measurement
     */
    performance: {
        marks: {},
        
        start(label) {
            this.marks[label] = performance.now();
        },
        
        end(label) {
            const startTime = this.marks[label];
            if (startTime) {
                const duration = performance.now() - startTime;
                delete this.marks[label];
                return duration;
            }
            return 0;
        }
    },

    /**
     * Local storage helpers
     */
    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Failed to read from localStorage:', e);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Failed to remove from localStorage:', e);
                return false;
            }
        }
    },

    /**
     * Event emitter for loose coupling
     */
    events: {
        listeners: {},
        
        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        },
        
        off(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        },
        
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error(`Error in event listener for ${event}:`, e);
                    }
                });
            }
        }
    },

    /**
     * Keyboard handling
     */
    keyboard: {
        init() {
            document.addEventListener('keydown', (e) => {
                switch (e.code) {
                    case 'Space':
                        e.preventDefault();
                        Utils.events.emit('keydown:space');
                        break;
                    case 'KeyR':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            Utils.events.emit('keydown:reset');
                        }
                        break;
                    case 'Escape':
                        Utils.events.emit('keydown:escape');
                        break;
                }
            });
        }
    }
};

// Initialize keyboard handling when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Utils.keyboard.init());
} else {
    Utils.keyboard.init();
}

// Export for use in other modules
window.Utils = Utils;