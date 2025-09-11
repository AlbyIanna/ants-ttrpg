/**
 * Simple session runner for Ant Colony TTRPG prototype
 * Version: v1.0
 */

const SimulationEngine = require('./simulation-engine');

class SessionRunner {
  constructor() {
    this.engine = new SimulationEngine();
    this.state = null;
    this.history = [];
  }

  startSession() {
    this.state = this.engine.createInitialState();
    this.history = [];
    
    console.log("=== ANT COLONY TTRPG - SESSION START ===");
    console.log("Your colony starts with:");
    console.log(`- Food: ${this.state.food}`);
    console.log(`- Population: ${this.state.population.total} (${this.state.population.workers}W, ${this.state.population.scouts}S, ${this.state.population.soldiers}D)`);
    console.log(`- Morale: ${this.state.morale}/10`);
    console.log("\nGoal: Survive 10 turns and grow your colony to 15+ ants!");
    console.log("\nAvailable actions: forage, explore, defend, rest");
    console.log("==========================================\n");
    
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

  processPlayerAction(actionName) {
    if (!actionName || typeof actionName !== 'string') {
      return { error: "Invalid action" };
    }

    const result = this.engine.processTurn(actionName.toLowerCase(), this.state);
    
    if (!result.success) {
      return { error: result.error };
    }

    this.state = result.state;
    this.history.push({
      turn: this.state.turn - 1,
      action: actionName,
      results: result.results
    });

    console.log(`\n🐜 ACTION: ${actionName.toUpperCase()}`);
    for (const narrative of result.results.narrative) {
      console.log(`📖 ${narrative}`);
    }

    if (result.results.events.length > 0) {
      console.log(`⚡ Events triggered: ${result.results.events.join(', ')}`);
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

    const gameLoop = () => {
      this.displayState();
      
      const actions = this.getAvailableActions();
      console.log("Available actions:");
      actions.forEach(action => {
        console.log(`  ${action.name} - ${action.description} (${action.success_rate} success)`);
      });
      
      rl.question('\nChoose your action: ', (answer) => {
        const result = this.processPlayerAction(answer.trim());
        
        if (result.error) {
          console.log(`❌ Error: ${result.error}`);
          gameLoop();
        } else if (result.gameOver) {
          console.log("\nFinal colony status:");
          this.displayState();
          rl.close();
        } else {
          setTimeout(gameLoop, 1000);
        }
      });
    };

    gameLoop();
  }

  runAutomaticDemo() {
    this.startSession();
    
    const demoActions = ['forage', 'explore', 'forage', 'defend', 'forage', 'rest', 'forage'];
    let actionIndex = 0;
    
    const demoLoop = () => {
      this.displayState();
      
      if (actionIndex >= demoActions.length || this.engine.isGameOver(this.state)) {
        const status = this.engine.getGameStatus(this.state);
        console.log(`\n🎮 DEMO END: ${status}`);
        return;
      }
      
      const action = demoActions[actionIndex];
      console.log(`\n🤖 Demo choosing: ${action}`);
      
      const result = this.processPlayerAction(action);
      actionIndex++;
      
      if (result.gameOver) {
        console.log("\nDemo completed!");
        return;
      }
      
      setTimeout(demoLoop, 2000);
    };
    
    demoLoop();
  }
}

if (require.main === module) {
  const session = new SessionRunner();
  const mode = process.argv[2] || 'demo';
  
  if (mode === 'interactive') {
    session.runInteractiveSession();
  } else {
    session.runAutomaticDemo();
  }
}

module.exports = SessionRunner;