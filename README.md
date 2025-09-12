# 🐜 Ant Colony TTRPG Prototype v0.4

A **browser-based** tabletop RPG prototype inspired by swarm intelligence mechanics. Watch autonomous ants forage, explore, and survive in real-time with perfect emoji rendering and interactive features.

## ✨ Quick Start

**🌟 Browser Edition** (Recommended):
```bash
cd web
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

**Features:**
- 🎮 **Interactive Controls**: Click ants for details, pause/resume with spacebar
- 🐜 **Real-time Simulation**: Watch 10 autonomous ants with individual AI
- 🌍 **Dynamic Environment**: Procedurally generated terrain with seasonal changes
- 📱 **Mobile Friendly**: Responsive design works on all devices
- ⚡ **Perfect Performance**: Smooth 60fps rendering with no emoji alignment issues

## 🎯 What You'll See

- **Workers** (W) forage for food and return to the nest (🏠)
- **Scouts** (S) explore unknown areas and discover food sources
- **Soldiers** (D) patrol the territory and defend against threats
- **Environment** changes with seasons, weather, and random events
- **Real-time Stats** showing food, population, morale, and performance

## 🔧 Terminal Version (Alternative)

For terminal enthusiasts, the original command-line version is also available:

```bash
# Enhanced turn-based simulation
node test-enhanced-simulation.js

# Real-time terminal simulation
node test-live-simulation.js

# Interactive session runner
node sims/session-runner.js interactive
```

## 🏗️ Project Structure

```
ants-ttrpg/
├── web/               # Browser edition (main)
│   ├── index.html     # Main application
│   ├── styles.css     # Dark theme styling
│   └── js/            # JavaScript modules
├── sims/              # Core simulation engine
├── rules/             # Game rule schemas
├── narrative/         # Story templates
└── tests/             # Example playthroughs
```

## 🎮 How to Play

1. **Start the simulation** - Click the play button or press spacebar
2. **Watch the colony** - Ants will automatically forage, explore, and work
3. **Interact with elements** - Click on ants, food, or terrain for details
4. **Control the experience** - Adjust speed, pause, or reset as needed
5. **Monitor progress** - Watch food levels, morale, and seasonal changes

The goal is to observe emergent swarm intelligence behaviors as your ant colony adapts to environmental challenges and works together for survival.

## 🌟 Why This Prototype?

This project explores **swarm intelligence** concepts through an engaging, visual simulation:

- **Individual Agent Behavior**: Each ant has its own AI, role, and decision-making
- **Emergent Phenomena**: Complex colony behaviors arise from simple rules
- **Environmental Adaptation**: Ants respond to seasonal changes and food scarcity
- **Real-time Visualization**: Watch swarm intelligence principles in action

Perfect for educators, game designers, and anyone curious about collective intelligence!

---

*Built with vanilla JavaScript for maximum compatibility and performance. No frameworks, no dependencies, just pure swarm intelligence simulation.* 🐜✨