# 🐜 Ant Colony TTRPG Prototype v0.6

A **fully configurable world management system** for swarm intelligence simulation featuring autonomous ant colonies, extreme time scaling, and Game of Life-style world creation. Built with Vite and comprehensive testing coverage.

## 🚀 Quick Start

```bash
npm install           # Install dependencies
npm run dev          # Start development server with HMR
# Open http://localhost:8000 in your browser
```

**Testing & Production:**
```bash
npm test             # Run comprehensive test suite (29 tests)
npm run build        # Build optimized bundle (69KB JS + 11KB CSS)
npm run preview      # Preview production build
```

## ✨ Key Features

- 🌍 **Configurable Worlds**: Create custom ant colonies with 15+ parameters (size, biome, population, time scaling)
- ⏰ **Extreme Time Scaling**: From real-time to 1 month per second (1:2628000 ratio)
- 💾 **Save/Load System**: Persistent world storage with professional management interface
- 🔧 **Runtime Configuration**: Live parameter adjustment during simulation
- 🧪 **Comprehensive Testing**: 29 test cases with full menu and functionality coverage
- 🎨 **Pixel Art Canvas**: 450×300 pixel world with hand-crafted 6×6 sprites
- 🔥 **Hot Module Reload**: Instant updates during development (~50ms)
- 🐜 **Autonomous AI**: Role-based ant behaviors (workers, scouts, soldiers)
- ⚡ **60 FPS Performance**: Smooth Canvas rendering with hardware acceleration

## 🎯 Simulation Overview

Watch autonomous ants exhibit realistic swarm intelligence behaviors:

- 🟢 **Workers**: Forage for food, optimize collection routes, manage resources
- 🔵 **Scouts**: Explore unknown territories, discover food sources, mark trails  
- 🔴 **Soldiers**: Patrol colony perimeter, detect threats, defend nest
- 🌍 **Dynamic Environment**: Procedural terrain with rocks, grass, water, and food
- 📊 **Real-time Analytics**: Population stats, food reserves, colony morale

## 🏗️ Modern Architecture

```
src/                    # ES6 modules with Vite HMR
├── main.js            # Application controller
├── components/
│   ├── utils.js       # Performance & DOM helpers  
│   ├── web-simulation.js    # Ant AI & environment
│   └── pixel-renderer.js    # Canvas graphics
└── styles/styles.css  # Responsive design

Legacy: sims/*, rules/*, narrative/* (reference)
```

## 🎮 Controls & Interaction

**Basic Controls:**
- `Space` - Play/Pause simulation
- `+/-` - Adjust simulation speed (0.5x to 5x)
- `Ctrl+R` - Reset colony to initial state
- `Click ants` - View detailed information modal
- `Hover terrain` - See coordinates and terrain type

**Advanced Controls:**
- `Ctrl+Shift+C` - Open runtime configuration panel
- `+/-` - Adjust time scale (Real Time to Month Scale)
- `Ctrl+R` - Reset colony to initial state

**Development Controls:**
- `npm test` - Run comprehensive test suite
- Edit any `.js` file → See instant updates via HMR
- `npm run build` → Create optimized production bundle
- `F12 → Console` → View performance metrics and debug info

## 🧬 Swarm Intelligence Features

**Emergent Behaviors:**
- **Trail Formation**: Ants create efficient paths to food sources
- **Division of Labor**: Automatic role switching based on colony needs  
- **Resource Optimization**: Collective foraging strategies emerge
- **Threat Response**: Coordinated defense against environmental hazards

**Individual AI:**
- **State Machines**: Each ant has foraging, exploring, returning, resting states
- **Energy Management**: Ants must balance work and rest for survival
- **Environmental Awareness**: Pathfinding around obstacles, food detection
- **Role-Specific Logic**: Workers prioritize food, scouts explore, soldiers patrol

## 🎯 Educational Value

Perfect for studying collective intelligence, emergence, and complex adaptive systems:

- **Computer Science**: Agent-based modeling, AI behaviors, Canvas optimization
- **Biology**: Ant colony organization, foraging strategies, social insects
- **Game Development**: Real-time simulation, pixel art, performance optimization  
- **Systems Thinking**: How simple rules create complex group behaviors

## 🔧 Technical Highlights

- **Zero Dependencies**: Pure vanilla JavaScript with modern ES6 modules
- **Comprehensive Testing**: 29 test cases with Vitest and jsdom environment
- **Vite Build System**: Lightning-fast development with hot module reload
- **Canvas Optimization**: 60fps pixel-perfect rendering on 450×300 display
- **World Management**: Professional save/load system with localStorage persistence
- **Time Scaling Engine**: Advanced calendar system supporting extreme time acceleration
- **Responsive Design**: Scales beautifully on desktop, tablet, and mobile
- **Clean Architecture**: Modular components with clear separation of concerns

---

*Experience the fascinating world of swarm intelligence through interactive simulation!* 🐜✨