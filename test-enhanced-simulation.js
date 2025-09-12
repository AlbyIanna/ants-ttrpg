/**
 * Test script for enhanced environment simulation v0.4
 * Tests the integration of all new systems: environment, pathfinding, ant behavior, and visual rendering
 */

const SimulationEngine = require('./sims/simulation-engine');
const VisualRenderer = require('./sims/visual-renderer');

async function testEnhancedSimulation() {
  console.log('🧪 Testing Enhanced Ant Colony Simulation v0.4');
  console.log('===============================================\n');

  // Initialize systems
  const sim = new SimulationEngine();
  const renderer = new VisualRenderer();
  
  // Configure renderer for testing
  renderer.setDisplayOptions({
    showTrails: true,
    showBehaviorStates: true,
    animationEnabled: true
  });

  // Create initial game state with procedural environment
  console.log('🌍 Generating procedural environment...');
  const initialState = sim.createInitialState('forest_floor');
  
  console.log(`✅ Environment generated: ${initialState.biome}`);
  console.log(`   - Map size: ${initialState.environment.metadata.width}x${initialState.environment.metadata.height}`);
  console.log(`   - Food sources: ${initialState.environment.foodSources.length}`);
  console.log(`   - Hazards: ${initialState.environment.hazards.length}`);
  console.log(`   - Individual ants: ${initialState.ants.length}`);

  // Display initial view
  console.log(renderer.renderFullView(initialState));

  // Run several turns to see ants in action
  let currentState = initialState;
  const actions = ['forage', 'explore', 'forage', 'explore', 'defend'];
  
  for (let turn = 0; turn < actions.length; turn++) {
    const action = actions[turn];
    console.log(`\n🎮 Turn ${turn + 1}: Performing ${action} action...`);
    
    // Process turn
    const result = sim.processTurn(action, currentState);
    
    if (result.success) {
      currentState = result.state;
      const results = result.results;
      
      // Animate ant movements if any
      if (results.antMovements && results.antMovements.length > 0) {
        console.log(`🐜 ${results.antMovements.length} ants are moving...`);
        await renderer.animateAntMovement(initialState, currentState, action, results);
      }
      
      // Display updated view
      console.log(renderer.renderFullView(currentState, results));
      
      // Check for discoveries
      if (results.discoveries && results.discoveries.length > 0) {
        console.log(`\n🎉 Discoveries this turn: ${results.discoveries.length}`);
        for (const discovery of results.discoveries) {
          if (discovery.type === 'food_source') {
            console.log(`   - Found ${discovery.foodType} at (${discovery.position.x}, ${discovery.position.y})`);
          } else if (discovery.type === 'food') {
            console.log(`   - Collected ${discovery.amount} nutrition`);
          }
        }
      }
      
      // Pause between turns for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } else {
      console.log(`❌ Action failed: ${result.error}`);
      break;
    }
  }

  // Display final statistics
  console.log('\n📊 Final Simulation Statistics:');
  console.log(`   - Final turn: ${currentState.turn}`);
  console.log(`   - Colony food: ${currentState.food}`);
  console.log(`   - Colony morale: ${currentState.morale}/10`);
  console.log(`   - Total population: ${currentState.population.total}`);
  console.log(`   - Food discovered: ${currentState.discoveredFood || 0}`);
  
  if (currentState.ants) {
    const antStates = {};
    for (const ant of currentState.ants) {
      antStates[ant.state] = (antStates[ant.state] || 0) + 1;
    }
    console.log(`   - Ant behavior states:`, antStates);
  }

  // Test game status
  const gameStatus = sim.getGameStatus(currentState);
  console.log(`   - Game status: ${gameStatus}`);

  console.log('\n✅ Enhanced simulation test completed successfully!');
}

// Run the test
testEnhancedSimulation().catch(console.error);