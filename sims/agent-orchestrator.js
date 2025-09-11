/**
 * AI Agent Orchestrator for Ant Colony TTRPG
 * Version: v0.3 - Adds AI GameMaster integration with dynamic narrative generation
 */

const fs = require('fs');
const path = require('path');

class AgentOrchestrator {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'mock', // 'openai', 'claude', 'mock'
      apiKey: config.apiKey || null,
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 150,
      temperature: config.temperature || 0.7,
      fallbackMode: config.fallbackMode || true
    };
    
    this.prompts = this.loadPrompts();
    this.narrativeHistory = [];
    this.contextMemory = {
      colonyPersonality: null,
      significantEvents: [],
      currentThreat: null,
      seasonalContext: 'spring'
    };
  }

  loadPrompts() {
    try {
      const promptsPath = path.join(__dirname, '../prompts');
      if (!fs.existsSync(promptsPath)) {
        return this.getDefaultPrompts();
      }
      
      const prompts = {};
      const files = fs.readdirSync(promptsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(promptsPath, file), 'utf8');
          const promptName = file.replace('.json', '');
          prompts[promptName] = JSON.parse(content);
        }
      }
      
      return Object.keys(prompts).length > 0 ? prompts : this.getDefaultPrompts();
    } catch (error) {
      console.warn('Failed to load prompts, using defaults:', error.message);
      return this.getDefaultPrompts();
    }
  }

  getDefaultPrompts() {
    return {
      gamemaster: {
        system: "You are a GameMaster for an ant colony survival RPG. Create vivid, concise descriptions that bring the ant world to life. Focus on sensory details and the perspective of tiny creatures in a vast, dangerous world.",
        templates: {
          action_success: "Describe the successful {action} by the ant colony in 1-2 sentences, emphasizing the coordination and effectiveness of the ants.",
          action_failure: "Describe the failed {action} attempt in 1-2 sentences, showing the challenges faced by the tiny ants.",
          event_narrative: "Describe the {event} that affects the ant colony, making it dramatic but appropriate for their scale.",
          environmental_description: "Describe the current environment around the ant nest, noting weather, dangers, and opportunities.",
          colony_status: "Provide a brief atmospheric description of the colony's current mood and situation."
        }
      },
      narrative_enhancer: {
        system: "You enhance game events with rich, immersive descriptions while maintaining the perspective of an ant colony.",
        templates: {
          predator_encounter: "A {predator} threatens the colony! Describe the terror and chaos from the ants' perspective.",
          food_discovery: "The colony discovers {food_type}! Describe the excitement and coordination of the harvest.",
          seasonal_change: "The season shifts to {season}. Describe how this affects the ant colony's world.",
          moral_crisis: "The colony faces despair. Describe the atmosphere of uncertainty and fear.",
          triumph: "The colony achieves a victory! Describe the celebration and renewed hope."
        }
      }
    };
  }

  updateContext(gameState, lastAction, results) {
    // Update seasonal context
    if (gameState.turn >= 5) {
      this.contextMemory.seasonalContext = 'winter';
    }
    
    // Track significant events
    if (results && results.events) {
      for (const event of results.events) {
        this.contextMemory.significantEvents.push({
          turn: gameState.turn,
          event: event,
          action: lastAction
        });
        
        // Keep only recent significant events
        if (this.contextMemory.significantEvents.length > 5) {
          this.contextMemory.significantEvents.shift();
        }
      }
    }
    
    // Determine colony personality based on actions and outcomes
    if (!this.contextMemory.colonyPersonality) {
      if (gameState.morale >= 7) {
        this.contextMemory.colonyPersonality = 'bold';
      } else if (gameState.morale <= 3) {
        this.contextMemory.colonyPersonality = 'desperate';
      } else {
        this.contextMemory.colonyPersonality = 'cautious';
      }
    }
  }

  async generateNarrative(type, context = {}) {
    const prompt = this.buildPrompt(type, context);
    
    if (this.config.provider === 'mock' || this.config.fallbackMode) {
      return this.generateMockNarrative(type, context);
    }
    
    try {
      // In a real implementation, this would call actual AI APIs
      return await this.callAIProvider(prompt);
    } catch (error) {
      console.warn('AI provider failed, using fallback:', error.message);
      return this.generateMockNarrative(type, context);
    }
  }

  buildPrompt(type, context) {
    const gamemaster = this.prompts.gamemaster || this.getDefaultPrompts().gamemaster;
    let template = '';
    
    if (gamemaster.templates && gamemaster.templates[type]) {
      template = gamemaster.templates[type];
    }
    
    // Replace template variables
    let prompt = template;
    for (const [key, value] of Object.entries(context)) {
      prompt = prompt.replace(`{${key}}`, value);
    }
    
    // Add context about colony state
    const contextInfo = this.buildContextInformation();
    
    return {
      system: gamemaster.system,
      user: `${prompt}\n\nColony Context: ${contextInfo}`
    };
  }

  buildContextInformation() {
    const recent = this.contextMemory.significantEvents.slice(-2);
    const recentEvents = recent.map(e => e.event).join(', ');
    
    return `Colony personality: ${this.contextMemory.colonyPersonality}. Season: ${this.contextMemory.seasonalContext}. Recent events: ${recentEvents || 'none'}.`;
  }

  generateMockNarrative(type, context) {
    const mockResponses = {
      action_success: {
        forage: [
          "Your workers move with perfect coordination, each ant knowing exactly where to search. Their antennae twitch with excitement as they locate scattered crumbs.",
          "The foraging party spreads out in an efficient pattern, their tiny legs carrying them swiftly across the terrain as they gather precious sustenance.",
          "Like a well-oiled machine, your workers fan out across the territory, their keen senses guiding them to hidden food sources."
        ],
        explore: [
          "Your scouts venture into uncharted territory, their keen eyes scanning for both opportunity and danger in the vast landscape.",
          "Brave explorers push beyond the known boundaries, leaving scent trails for others to follow as they map new regions.",
          "The exploration team moves with calculated caution, each step revealing new secrets of the world beyond your nest."
        ],
        defend: [
          "Your soldiers take strategic positions, their mandibles gleaming as they form an impenetrable defensive line around the precious nest.",
          "The colony mobilizes its defenses with military precision, every ant knowing their role in protecting the heart of your civilization.",
          "Guards patrol the perimeter with heightened alertness, their presence a reassuring shield against the dangers that lurk beyond."
        ],
        rest: [
          "The colony settles into a peaceful rhythm, ants grooming each other and sharing food in a display of unity and care.",
          "A calm descends over the nest as workers tend to the young and maintain the tunnels, strengthening the bonds that hold your society together.",
          "The gentle hum of domestic activity fills the air as your ants take time to recover and reconnect with one another."
        ]
      },
      action_failure: {
        forage: [
          "The foraging party returns empty-handed, their antennae drooping with disappointment as they report barren territory.",
          "Your workers scatter in confusion, unable to coordinate effectively as exhaustion and low morale take their toll.",
          "The search for food proves fruitless as your tired workers struggle to maintain focus in their increasingly desperate hunt."
        ],
        explore: [
          "The scouts return with disturbing news - the paths ahead seem treacherous and the familiar scent trails have gone cold.",
          "Your exploration team retreats hastily, overwhelmed by the vastness of the unknown territory and the dangers it might hold.",
          "The brave scouts lose their way in the maze of grass and debris, forced to return without expanding your territorial knowledge."
        ],
        defend: [
          "The defensive preparations fall into disarray as tired soldiers struggle to maintain their positions effectively.",
          "Your guards seem sluggish and disorganized, their usual military precision hampered by low morale and fatigue.",
          "The defensive formation crumbles as ants abandon their posts, more concerned with their own survival than the colony's safety."
        ],
        rest: [
          "Even at rest, anxiety pervades the colony as ants remain on edge, unable to find the peace they desperately need.",
          "The attempt at recovery is disrupted by internal tensions, with ants unable to settle into their usual harmonious routine.",
          "Rest brings little relief as the weight of recent hardships continues to press down on the weary colony."
        ]
      },
      event_narrative: {
        predator_encounter: [
          "A shadow falls across your territory as a massive bird descends from the sky, its talons seeking easy prey among your foraging workers!",
          "The ground trembles as a hunting spider emerges from its hiding place, its eight eyes fixed hungrily on your vulnerable ants!",
          "Terror ripples through the ranks as a lizard's forked tongue flicks out, tasting the air for the scent of your colony!"
        ],
        food_discovery: [
          "Celebration erupts as your scouts return with news of a magnificent discovery - enough sustenance to feed the colony for days!",
          "The air fills with excited pheromones as word spreads of the incredible bounty your explorers have uncovered!",
          "Your ants work together with renewed vigor, forming efficient chains to transport the precious food back to your nest!"
        ],
        winter_arrives: [
          "A bitter chill settles over the land as winter's grip tightens, making every step a struggle against the freezing air.",
          "Frost begins to coat the ground, transforming your familiar territory into a harsh and unforgiving landscape.",
          "The world grows cold and hostile as winter claims dominion, forcing your colony to adapt or perish."
        ]
      }
    };
    
    const responses = mockResponses[type];
    if (!responses) return "The ants continue their endless work...";
    
    const actionResponses = responses[context.action];
    if (actionResponses) {
      return actionResponses[Math.floor(Math.random() * actionResponses.length)];
    }
    
    const eventResponses = responses[context.event];
    if (eventResponses) {
      return eventResponses[Math.floor(Math.random() * eventResponses.length)];
    }
    
    return "The colony adapts to the changing circumstances with remarkable resilience.";
  }

  async callAIProvider(prompt) {
    // Placeholder for actual AI API integration
    // Would implement OpenAI, Claude, or other provider calls here
    throw new Error('AI provider not implemented yet');
  }

  async narrateAction(action, gameState, results) {
    this.updateContext(gameState, action, results);
    
    const type = results.success ? 'action_success' : 'action_failure';
    const narrative = await this.generateNarrative(type, { 
      action: action,
      colony_state: this.getColonyStateDescription(gameState)
    });
    
    this.narrativeHistory.push({
      turn: gameState.turn,
      type: 'action',
      action: action,
      success: results.success,
      narrative: narrative
    });
    
    return narrative;
  }

  async narrateEvent(eventName, gameState) {
    const narrative = await this.generateNarrative('event_narrative', {
      event: eventName,
      colony_state: this.getColonyStateDescription(gameState)
    });
    
    this.narrativeHistory.push({
      turn: gameState.turn,
      type: 'event',
      event: eventName,
      narrative: narrative
    });
    
    return narrative;
  }

  getColonyStateDescription(gameState) {
    const conditions = [];
    
    if (gameState.morale <= 3) conditions.push('demoralized');
    if (gameState.morale >= 8) conditions.push('confident');
    if (gameState.food <= 5) conditions.push('hungry');
    if (gameState.food >= 20) conditions.push('well-fed');
    if (gameState.turn >= 5) conditions.push('winter-weary');
    
    return conditions.join(', ') || 'stable';
  }

  getRecentNarrative(count = 3) {
    return this.narrativeHistory.slice(-count);
  }

  reset() {
    this.narrativeHistory = [];
    this.contextMemory = {
      colonyPersonality: null,
      significantEvents: [],
      currentThreat: null,
      seasonalContext: 'spring'
    };
  }
}

module.exports = AgentOrchestrator;