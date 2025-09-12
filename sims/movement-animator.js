/**
 * Movement Animator for Ant Colony TTRPG
 * Version: v0.4 - Smooth visual transitions and ant trail visualization
 */

class MovementAnimator {
  constructor() {
    this.frameRate = 10; // Frames per second for animation
    this.trailHistory = new Map(); // Track ant trails
    this.maxTrailLength = 20;
    this.animationQueue = [];
    this.isAnimating = false;
  }

  /**
   * Animate ant movements with smooth transitions
   */
  async animateMovements(movements, renderer, state, options = {}) {
    if (movements.length === 0) return;

    const config = {
      showTrails: options.showTrails !== false,
      showPaths: options.showPaths || false,
      animationSpeed: options.animationSpeed || 1,
      highlightMovingAnts: options.highlightMovingAnts !== false,
      ...options
    };

    // Update trail history
    this.updateTrailHistory(movements);

    // Group movements by type for better animation coordination
    const movementGroups = this.groupMovementsByBehavior(movements, state);

    // Animate each group with appropriate narrative
    for (const group of movementGroups) {
      await this.animateMovementGroup(group, renderer, state, config);
      
      // Small delay between groups for visual clarity
      if (movementGroups.length > 1) {
        await this.delay(300);
      }
    }
  }

  updateTrailHistory(movements) {
    for (const movement of movements) {
      const antId = movement.antId;
      
      if (!this.trailHistory.has(antId)) {
        this.trailHistory.set(antId, []);
      }
      
      const trail = this.trailHistory.get(antId);
      
      // Add new position to trail
      trail.push({
        position: { ...movement.to },
        timestamp: Date.now(),
        strength: 1.0
      });
      
      // Limit trail length
      if (trail.length > this.maxTrailLength) {
        trail.shift();
      }
      
      // Update trail strength (fading over time)
      this.updateTrailStrength(trail);
    }
  }

  updateTrailStrength(trail) {
    const now = Date.now();
    const fadeTime = 30000; // 30 seconds for full fade
    
    for (const point of trail) {
      const age = now - point.timestamp;
      point.strength = Math.max(0, 1 - (age / fadeTime));
    }
    
    // Remove completely faded points
    trail.splice(0, trail.length, ...trail.filter(p => p.strength > 0));
  }

  groupMovementsByBehavior(movements, state) {
    const groups = new Map();
    
    for (const movement of movements) {
      const ant = state.ants.find(a => a.id === movement.antId);
      if (!ant) continue;
      
      const key = `${ant.role}_${ant.state}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          behavior: ant.state,
          role: ant.role,
          movements: [],
          narrative: this.getBehaviorNarrative(ant.state, ant.role)
        });
      }
      
      groups.get(key).movements.push({
        ...movement,
        ant: ant
      });
    }
    
    return Array.from(groups.values());
  }

  getBehaviorNarrative(behavior, role) {
    const narratives = {
      'worker_foraging': 'Workers spread out in search of food sources...',
      'worker_returning': 'Workers carry their harvest back to the nest...',
      'scout_exploring': 'Scouts venture into uncharted territory...',
      'scout_returning': 'Scouts return with valuable intelligence...',
      'soldier_patrolling': 'Soldiers patrol the perimeter, watching for threats...',
      'worker_resting': 'Workers gather near the nest to rest...',
      'scout_resting': 'Scouts take a moment to recover their strength...',
      'soldier_resting': 'Guards remain vigilant while resting...'
    };
    
    return narratives[`${role}_${behavior}`] || `${role}s are on the move...`;
  }

  async animateMovementGroup(group, renderer, state, config) {
    if (group.movements.length === 0) return;

    // Show movement narrative
    if (config.showNarrative !== false) {
      console.log(`\n🐜 ${group.narrative}`);
    }

    // For smooth animation, we could show intermediate frames
    // For now, we'll show the movement with trails
    if (config.showTrails) {
      this.renderMovementWithTrails(group, renderer, state, config);
    }

    // Delay for visual effect
    await this.delay(1000 / config.animationSpeed);
  }

  renderMovementWithTrails(group, renderer, state, config) {
    // This would integrate with the visual renderer to show trails
    // For now, we'll add trail information to the state for the renderer to use
    
    const trailsToRender = [];
    
    for (const movement of group.movements) {
      const trail = this.trailHistory.get(movement.antId);
      if (trail && trail.length > 1) {
        trailsToRender.push({
          antId: movement.antId,
          role: movement.ant.role,
          trail: trail.map(point => ({
            x: point.position.x,
            y: point.position.y,
            strength: point.strength
          }))
        });
      }
    }
    
    // Store trails in state for renderer
    state.antTrails = trailsToRender;
  }

  /**
   * Create animation for specific ant behaviors
   */
  createBehaviorAnimation(behavior, ants, environment) {
    const animations = [];
    
    switch (behavior) {
      case 'foraging':
        animations.push(...this.createForagingAnimation(ants, environment));
        break;
      case 'exploring':
        animations.push(...this.createExploringAnimation(ants, environment));
        break;
      case 'returning':
        animations.push(...this.createReturningAnimation(ants, environment));
        break;
      case 'patrolling':
        animations.push(...this.createPatrollingAnimation(ants, environment));
        break;
    }
    
    return animations;
  }

  createForagingAnimation(ants, environment) {
    const animations = [];
    
    // Show ants spreading out from nest
    for (const ant of ants.filter(a => a.state === 'foraging')) {
      animations.push({
        type: 'spread_out',
        antId: ant.id,
        from: ant.nestPosition,
        to: ant.position,
        speed: 1.2,
        description: 'searches for food'
      });
    }
    
    return animations;
  }

  createExploringAnimation(ants, environment) {
    const animations = [];
    
    // Show scouts moving to unexplored areas
    for (const ant of ants.filter(a => a.state === 'exploring')) {
      animations.push({
        type: 'explore',
        antId: ant.id,
        from: ant.lastPosition,
        to: ant.position,
        speed: 1.5,
        description: 'explores unknown territory'
      });
    }
    
    return animations;
  }

  createReturningAnimation(ants, environment) {
    const animations = [];
    
    // Show ants returning to nest
    for (const ant of ants.filter(a => a.state === 'returning')) {
      animations.push({
        type: 'return',
        antId: ant.id,
        from: ant.lastPosition,
        to: ant.position,
        speed: ant.carryingFood ? 0.8 : 1.0, // Slower when carrying food
        description: ant.carryingFood ? 'returns with food' : 'returns to nest'
      });
    }
    
    return animations;
  }

  createPatrollingAnimation(ants, environment) {
    const animations = [];
    
    // Show soldiers patrolling defensively
    for (const ant of ants.filter(a => a.state === 'patrolling')) {
      animations.push({
        type: 'patrol',
        antId: ant.id,
        from: ant.lastPosition,
        to: ant.position,
        speed: 0.9,
        description: 'patrols for threats'
      });
    }
    
    return animations;
  }

  /**
   * Animate food discovery
   */
  async animateDiscovery(discovery, renderer, state) {
    console.log(`\n✨ Discovery Animation: ${discovery.type} found!`);
    
    if (discovery.type === 'food_source') {
      console.log(`🔍 Scout discovers ${discovery.foodType} at (${discovery.position.x}, ${discovery.position.y})`);
      
      // Add sparkle effect to the discovery location (visual enhancement)
      this.addVisualEffect(discovery.position, 'sparkle', 2000);
    } else if (discovery.type === 'food') {
      console.log(`🍯 Worker collects ${discovery.amount} nutrition`);
      
      // Add collection effect
      this.addVisualEffect(discovery.position, 'collection', 1000);
    }
    
    await this.delay(800);
  }

  addVisualEffect(position, type, duration) {
    // Store visual effects for the renderer to display
    const effect = {
      position: { ...position },
      type: type,
      startTime: Date.now(),
      duration: duration,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    if (!this.visualEffects) {
      this.visualEffects = [];
    }
    
    this.visualEffects.push(effect);
    
    // Clean up expired effects
    setTimeout(() => {
      this.visualEffects = this.visualEffects.filter(e => e.id !== effect.id);
    }, duration);
  }

  /**
   * Generate movement summary for narrative
   */
  generateMovementSummary(movements, state) {
    if (movements.length === 0) return '';
    
    const summary = {
      foraging: 0,
      exploring: 0,
      returning: 0,
      patrolling: 0,
      resting: 0
    };
    
    for (const movement of movements) {
      const ant = state.ants.find(a => a.id === movement.antId);
      if (ant && summary.hasOwnProperty(ant.state)) {
        summary[ant.state]++;
      }
    }
    
    const activities = [];
    if (summary.foraging > 0) activities.push(`${summary.foraging} foraging`);
    if (summary.exploring > 0) activities.push(`${summary.exploring} exploring`);
    if (summary.returning > 0) activities.push(`${summary.returning} returning`);
    if (summary.patrolling > 0) activities.push(`${summary.patrolling} patrolling`);
    
    if (activities.length === 0) return 'The colony rests quietly...';
    
    return `Colony activity: ${activities.join(', ')} ants on the move.`;
  }

  /**
   * Get trail data for visualization
   */
  getTrailsForVisualization() {
    const trails = [];
    
    for (const [antId, trail] of this.trailHistory.entries()) {
      if (trail.length > 1) {
        trails.push({
          antId: antId,
          points: trail.map(point => ({
            x: point.position.x,
            y: point.position.y,
            strength: point.strength
          }))
        });
      }
    }
    
    return trails;
  }

  /**
   * Clear old trails and effects
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [antId, trail] of this.trailHistory.entries()) {
      const filteredTrail = trail.filter(point => 
        now - point.timestamp < maxAge && point.strength > 0.1
      );
      
      if (filteredTrail.length === 0) {
        this.trailHistory.delete(antId);
      } else {
        this.trailHistory.set(antId, filteredTrail);
      }
    }
    
    // Clean up visual effects
    if (this.visualEffects) {
      this.visualEffects = this.visualEffects.filter(effect => 
        now - effect.startTime < effect.duration
      );
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about current animations
   */
  getAnimationStats() {
    return {
      activeTrails: this.trailHistory.size,
      totalTrailPoints: Array.from(this.trailHistory.values())
        .reduce((sum, trail) => sum + trail.length, 0),
      visualEffects: this.visualEffects ? this.visualEffects.length : 0,
      isAnimating: this.isAnimating
    };
  }
}

module.exports = MovementAnimator;