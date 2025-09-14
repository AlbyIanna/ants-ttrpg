/**
 * Generic Object Pool for Memory Management
 * Version: v0.6 - Performance Optimization Edition
 * 
 * Reduces garbage collection overhead by reusing objects
 */

export class ObjectPool {
  constructor(createFn, resetFn = null, initialSize = 10) {
    this.createFn = createFn;      // Function to create new objects
    this.resetFn = resetFn;        // Function to reset objects for reuse
    this.pool = [];                // Available objects
    this.active = new Set();       // Currently in use objects
    this.totalCreated = 0;         // Statistics
    this.totalReused = 0;
    this.maxPoolSize = 1000;       // Prevent memory bloat
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
      this.totalCreated++;
    }
    
    console.log(`✅ ObjectPool initialized with ${initialSize} objects`);
  }
  
  /**
   * Get an object from the pool
   */
  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
      this.totalReused++;
    } else {
      obj = this.createFn();
      this.totalCreated++;
    }
    
    this.active.add(obj);
    return obj;
  }
  
  /**
   * Return an object to the pool
   */
  release(obj) {
    if (!this.active.has(obj)) {
      console.warn('Attempting to release object not from this pool');
      return;
    }
    
    this.active.delete(obj);
    
    // Reset object if reset function provided
    if (this.resetFn) {
      this.resetFn(obj);
    }
    
    // Only add back to pool if under size limit
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(obj);
    }
  }
  
  /**
   * Release multiple objects at once
   */
  releaseAll(objects) {
    objects.forEach(obj => this.release(obj));
  }
  
  /**
   * Clear the pool and release all active objects
   */
  clear() {
    this.pool.length = 0;
    this.active.clear();
    console.log(`✅ ObjectPool cleared`);
  }
  
  /**
   * Get pool statistics
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeObjects: this.active.size,
      totalCreated: this.totalCreated,
      totalReused: this.totalReused,
      reuseRate: this.totalReused / (this.totalCreated + this.totalReused),
      memoryEfficiency: `${((this.totalReused / this.totalCreated) * 100).toFixed(1)}%`
    };
  }
  
  /**
   * Resize pool for optimal performance
   */
  resize(newSize) {
    if (newSize < this.pool.length) {
      // Shrink pool
      this.pool.length = newSize;
    } else if (newSize > this.pool.length) {
      // Grow pool
      const toAdd = newSize - this.pool.length;
      for (let i = 0; i < toAdd; i++) {
        this.pool.push(this.createFn());
        this.totalCreated++;
      }
    }
    
    console.log(`✅ ObjectPool resized to ${newSize} objects`);
  }
  
  /**
   * Dispose of pool and cleanup
   */
  dispose() {
    this.clear();
    this.createFn = null;
    this.resetFn = null;
    console.log('✅ ObjectPool disposed');
  }
}

/**
 * Specialized pool for ant entities
 */
export class AntPool extends ObjectPool {
  constructor(initialSize = 50) {
    super(
      () => ({
        id: Math.random().toString(36).substr(2, 9),
        position: { x: 0, y: 0 },
        previousPosition: { x: 0, y: 0 },
        targetPosition: { x: 0, y: 0 },
        role: 'worker',
        state: 'exploring',
        energy: 100,
        carryingFood: false,
        age: 0,
        lastAction: '',
        behavior: {},
        stats: {
          foodCollected: 0,
          distanceTraveled: 0,
          timeAlive: 0
        }
      }),
      (ant) => {
        // Reset ant to default state
        ant.position.x = 0;
        ant.position.y = 0;
        ant.previousPosition.x = 0;
        ant.previousPosition.y = 0;
        ant.targetPosition.x = 0;
        ant.targetPosition.y = 0;
        ant.role = 'worker';
        ant.state = 'exploring';
        ant.energy = 100;
        ant.carryingFood = false;
        ant.age = 0;
        ant.lastAction = '';
        ant.behavior = {};
        ant.stats.foodCollected = 0;
        ant.stats.distanceTraveled = 0;
        ant.stats.timeAlive = 0;
      },
      initialSize
    );
  }
}

/**
 * Pool for pheromone visual particles
 */
export class PheromoneParticlePool extends ObjectPool {
  constructor(initialSize = 100) {
    super(
      () => ({
        x: 0,
        y: 0,
        type: 'food',
        strength: 0,
        alpha: 1,
        age: 0,
        maxAge: 100
      }),
      (particle) => {
        // Reset particle
        particle.x = 0;
        particle.y = 0;
        particle.type = 'food';
        particle.strength = 0;
        particle.alpha = 1;
        particle.age = 0;
        particle.maxAge = 100;
      },
      initialSize
    );
  }
}

/**
 * Pool for movement/animation objects
 */
export class MovementPool extends ObjectPool {
  constructor(initialSize = 200) {
    super(
      () => ({
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        timestamp: 0,
        antId: '',
        type: 'movement'
      }),
      (movement) => {
        movement.from.x = 0;
        movement.from.y = 0;
        movement.to.x = 0;
        movement.to.y = 0;
        movement.timestamp = 0;
        movement.antId = '';
        movement.type = 'movement';
      },
      initialSize
    );
  }
}