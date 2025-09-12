/**
 * Test script for Live Ant Colony Simulation v0.5
 * Demonstrates real-time autonomous ant behavior without turn-based mechanics
 */

const LiveSessionRunner = require('./sims/live-session-runner');

async function testLiveSimulation() {
  console.log('🧪 Testing Live Ant Colony Simulation v0.5');
  console.log('===========================================\n');
  
  console.log('This demo will start a live ant colony simulation where:');
  console.log('- Ants move and behave autonomously in real-time');
  console.log('- No player actions required - just watch!');
  console.log('- Use keyboard controls to interact with the simulation');
  console.log('- Press H after starting for help\n');

  // Create live session with full display
  const liveSession = new LiveSessionRunner({
    fullDisplay: true,
    refreshRate: 1000, // Update display every second
    minimalMode: false
  });

  // Start the live simulation
  console.log('Starting live simulation in 3 seconds...\n');
  
  // Wait a moment, then start
  setTimeout(() => {
    const success = liveSession.startSession('forest_floor');
    
    if (!success) {
      console.log('❌ Failed to start live simulation');
      process.exit(1);
    }
    
    // The session will run until the user quits with 'Q' or Ctrl+C
    
  }, 3000);
}

// Handle command line arguments
const args = process.argv.slice(2);
const minimal = args.includes('--minimal');
const biome = args.find(arg => ['forest_floor', 'garden', 'meadow', 'desert'].includes(arg)) || 'forest_floor';

if (minimal) {
  console.log('🧪 Starting minimal live simulation...');
  const liveSession = new LiveSessionRunner({
    fullDisplay: false,
    refreshRate: 500,
    minimalMode: true
  });
  
  liveSession.startSession(biome);
} else {
  // Run the full test
  testLiveSimulation();
}