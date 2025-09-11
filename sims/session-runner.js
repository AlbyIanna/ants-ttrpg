/**
 * Session runner for Ant Colony TTRPG prototype with visual display
 * Version: v0.2 - Added visual colony representation
 */

const SimulationEngine = require('./simulation-engine');
const VisualRenderer = require('./visual-renderer');

class SessionRunner {
  constructor(visualMode = false) {
    this.engine = new SimulationEngine();
    this.renderer = new VisualRenderer();
    this.state = null;
    this.history = [];
    this.visualMode = visualMode;
  }

  startSession() {
    this.state = this.engine.createInitialState();
    this.history = [];
    
    if (this.visualMode) {
      console.log(this.renderer.renderFullView(this.state));
      console.log("\n🎯 Goal: Survive 10 turns and grow your colony to 15+ ants!");
      console.log("🎮 Available actions: forage, explore, defend, rest\n");
    } else {
      console.log("=== ANT COLONY TTRPG - SESSION START ===");
      console.log("Your colony starts with:");
      console.log(`- Food: ${this.state.food}`);
      console.log(`- Population: ${this.state.population.total} (${this.state.population.workers}W, ${this.state.population.scouts}S, ${this.state.population.soldiers}D)`);
      console.log(`- Morale: ${this.state.morale}/10`);
      console.log("\nGoal: Survive 10 turns and grow your colony to 15+ ants!");
      console.log("\nAvailable actions: forage, explore, defend, rest");
      console.log("==========================================\n");
    }
    
    return this.state;
  }

  displayState() {
    console.log(`\n--- TURN ${this.state.turn} STATUS ---`);
    console.log(`Food: ${this.state.food}/100`);
    console.log(`Population: ${this.state.population.total} ants`);
    console.log(`  Workers: ${this.state.population.workers} | Scouts: ${this.state.population.scouts} | Soldiers: ${this.state.population.soldiers}`);
    console.log(`Morale: ${this.state.morale}/10`);
    
    if (this.state.morale <= 3) console.log("⚠️  Low morale - your ants are struggling!");
    if (this.state.food <= 5) console.log("⚠️  Food running low!");
    
    console.log("------------------------\n");
  }

  getAvailableActions() {
    const actions = [];
    const actionDefs = this.engine.actions.actions;
    
    for (const [actionName, actionDef] of Object.entries(actionDefs)) {
      const validation = this.engine.validateAction(actionName, this.state);
      if (validation.valid) {
        actions.push({
          name: actionName,
          description: actionDef.description,
          success_rate: Math.round(actionDef.success_rate * 100) + '%'
        });
      }
    }
    
    return actions;
  }

  async processPlayerAction(actionName) {
    if (!actionName || typeof actionName !== 'string') {
      return { error: "Invalid action" };
    }

    const result = this.engine.processTurn(actionName.toLowerCase(), this.state);
    
    if (!result.success) {
      return { error: result.error };
    }

    const oldState = { ...this.state };
    this.state = result.state;
    this.history.push({
      turn: this.state.turn - 1,
      action: actionName,
      results: result.results
    });

    if (this.visualMode) {
      // Show animation
      await this.renderer.animateAntMovement(oldState, this.state, actionName);
      
      // Show full visual update
      console.log(this.renderer.renderFullView(this.state, result.results));
    } else {
      console.log(`\n🐜 ACTION: ${actionName.toUpperCase()}`);
      for (const narrative of result.results.narrative) {
        console.log(`📖 ${narrative}`);
      }

      if (result.results.events.length > 0) {
        console.log(`⚡ Events triggered: ${result.results.events.join(', ')}`);
      }
    }

    const gameStatus = this.engine.getGameStatus(this.state);
    if (gameStatus !== 'ongoing') {
      console.log(`\n🎮 GAME OVER: ${gameStatus}`);
      return { gameOver: true, status: gameStatus, finalState: this.state };
    }

    return { success: true, newState: this.state, results: result.results };
  }

  runInteractiveSession() {
    this.startSession();
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const gameLoop = async () => {
      if (!this.visualMode) {
        this.displayState();
      }
      
      const actions = this.getAvailableActions();
      if (!this.visualMode) {
        console.log("Available actions:");
        actions.forEach(action => {
          console.log(`  ${action.name} - ${action.description} (${action.success_rate} success)`);
        });
      } else {
        console.log("\n🎮 Available actions: " + actions.map(a => a.name).join(', '));
      }
      
      rl.question('\nChoose your action: ', async (answer) => {
        const result = await this.processPlayerAction(answer.trim());
        
        if (result.error) {
          console.log(`❌ Error: ${result.error}`);
          gameLoop();
        } else if (result.gameOver) {
          if (!this.visualMode) {
            console.log("\nFinal colony status:");
            this.displayState();
          }
          rl.close();
        } else {
          setTimeout(gameLoop, this.visualMode ? 500 : 1000);
        }
      });
    };

    gameLoop();
  }

  runAutomaticDemo() {
    this.startSession();
    
    const demoActions = ['forage', 'explore', 'forage', 'defend', 'forage', 'rest', 'forage'];
    let actionIndex = 0;
    
    const demoLoop = async () => {
      if (!this.visualMode) {
        this.displayState();
      }
      
      if (actionIndex >= demoActions.length || this.engine.isGameOver(this.state)) {
        const status = this.engine.getGameStatus(this.state);
        console.log(`\n🎮 DEMO END: ${status}`);
        return;
      }
      
      const action = demoActions[actionIndex];
      if (!this.visualMode) {
        console.log(`\n🤖 Demo choosing: ${action}`);
      } else {
        console.log(`\n🤖 Demo action: ${action.toUpperCase()}`);
      }
      
      const result = await this.processPlayerAction(action);
      actionIndex++;
      
      if (result.gameOver) {
        console.log("\nDemo completed!");
        return;
      }
      
      setTimeout(demoLoop, this.visualMode ? 3000 : 2000);
    };
    
    demoLoop();
  }
}

if (require.main === module) {
  const mode = process.argv[2] || 'demo';
  const visualMode = process.argv.includes('--visual') || process.argv.includes('-v');
  
  const session = new SessionRunner(visualMode);
  
  if (mode === 'interactive') {
    session.runInteractiveSession();
  } else {
    session.runAutomaticDemo();
  }
}

module.exports = SessionRunner;