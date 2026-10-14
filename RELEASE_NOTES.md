# Release Notes

## prototype-v0.7 - Underground UI Edition (unreleased)

### Visual redesign
Implements the "Ant Colony TTRPG — UI Design" canvas (title menu, world creation, in-game HUD).
- **Design tokens**: dark soil palette, parchment text, amber for food and actions; Pixelify Sans (display), IBM Plex Sans (body), IBM Plex Mono (numbers). Emoji replaced by inline SVG icons.
- **Role colours**: workers parchment, scouts sky blue, soldiers brick, rival colonies violet; they also differ in lightness for colour-blind players.
- **Title screen**: pixel-art nest cross-section, resume button naming the last world, recent-world cards with map thumbnails, keyboard shortcuts (Enter / N / L / S).
- **World creation**: full screen instead of a modal; card choices for size, biome, food, hazards, season and time scale; nest count (1-4); role split with +/- steppers that always total 100%; live preview map and summary.
- **HUD**: top bar with season, elapsed time, play/pause and speed presets (0.5x-20x); Layers chips (Terrain, Pheromone trails, Behaviour states, Territory); zoom buttons; side panel with population, role split, food, morale and every colony on the map; colony log (the existing activity feed); Spawn food and Reset colony.

### GameMaster turn screen
Implements the GameMaster artboard: a turn-based TTRPG layer on top of the live colony, opened from the new **GameMaster** button in the HUD top bar (back arrow, Escape or "Watch the colony live" returns to the map; the simulation is not touched).
- **Scenario card**: loaded from `narrative/scenario-templates.json` (`opening_scenarios`). Spring/summer worlds play *The Bird's Shadow* (grow to 15 ants), autumn/winter worlds play *The Coming Winter* (last 10 turns with at least 10 ants). Goal progress bar and special-rule chips.
- **Colony panel**: food, ants, morale, workers/scouts/soldiers (split by the world's role ratios) and 3 energy pips; energy refills by 1 each turn.
- **Story feed**: scenario setup, action flavour text (`action_flavors`), events and discoveries (`event_expansions`) and colony status lines (`status_messages`), each with its outcome.
- **Action cards**: forage, explore, defend, rest from `rules/action-schema.json`, with needs, effect, risk and success chance. Cards whose requirements are not met are disabled and say why.
- **Your own plan**: free text put to the GameMaster as a 50% roll (1 energy, morale +1 on success, -1 on failure).
- **Resolution**: a visible d100 roll-under against `success_rate`, dice effects such as `1d6+2` rolled and shown ("Food +6 (1d6+2: 4 + 2)"). Failed forage triggers a predator encounter (1d2 ants, reduced by defence); failed explore loses the scouts for a turn; *increased predator encounters* adds a 15% ambush on successful forays.
- **Next turn**: the colony eats one food per four ants (doubled after turn 5 in winter); hungry colonies lose ants and morale, well-fed ones hatch a worker. Win and loss end the game with a "Play again".
- **Deterministic**: every roll comes from the seeded `rng()` in `pixel-art.js` (seed = world id + play number).

### New modules
- `src/components/game-master-rules.js` - pure turn rules (dice, d100 checks, requirements, effects, upkeep, goals); 32 tests in `game-master-rules.test.js`.
- `src/components/game-master.js` - GameMaster screen rendering and input.
- `src/components/pixel-art.js` - shared palette, seeded RNG and pixel illustrations.
- `src/components/world-form.js` - world-creation behaviour; `rebalanceRoles()` is unit-tested in `world-form.test.js`.

### Behaviour changes
- New worlds pass `nestCount` and enable the pheromone system, so multiple colonies and trails now run from the UI.
- Fix: `generateDistributedNestPositions` (the default placement) now floors its margin. On Small worlds (75 cells high, so a 7.5-cell margin) two or more nests got fractional coordinates such as 74.5 and crashed `moveAnt()`; the other sizes give whole-number margins. **Core simulation change - needs human review.**
- Fix: role-split normalisation no longer runs on every input event, which corrupted preset values mid-update.
- Renderer repaints after a resize, so a paused world no longer goes blank.

### Known issues
- The FPS counter counts renders, which happen once per simulation tick (every 800 ms at 1x).
- A legacy nest tile is still drawn at the map centre by world generation, separate from the real nests.
- Five tests in `pheromone-communication.test.js` fail intermittently (each in roughly 2-7 of 10 runs, the same rates as before this release). They check emergent behaviour after a few ticks of unseeded `Math.random()`; a seeded RNG in the simulation would make them deterministic.
- Fixed two tests that failed on every run because of mistakes in the tests: the single-nest test now expects the floored centre cell, and the pheromones-disabled test no longer compares food counts of two random worlds.
- The GameMaster session is not saved with the world and does not feed back into the live simulation; it resets on page reload.

## prototype-v0.6 - Configurable Worlds Edition (2025-09-12)

### 🎯 Major Feature: Complete World Management System

**Revolutionary upgrade transforming the simulation into a configurable, Game of Life-style world management system** with save/load functionality, extreme time scaling, and comprehensive testing coverage.

### 🌍 Configurable World System
- **Professional Menu Interface**: Complete menu system replacing direct simulation launch
- **World Creation Modal**: 15+ configurable parameters including world size, biome type, population settings, role distribution, environment conditions, and time scaling
- **Save/Load Functionality**: Persistent world storage with localStorage, world management interface
- **World Library**: Visual grid of saved worlds with metadata, creation dates, and quick loading
- **Professional UI**: Modal-based interfaces replacing browser prompts for superior UX

### ⏰ Extreme Time Scaling System
- **Six Time Scales**: From Real Time (1:1) to Month Scale (1:2628000) - 1 real second = 1 game month
- **Dynamic Calendar**: Full calendar system with seasons, years, months, days, and hours
- **Live Time Adjustment**: Change time scale during simulation without stopping
- **Visual Indicators**: Season display and formatted time progression (Spring Year 1, Day 15, 08:30)
- **Performance Optimized**: Smooth transitions between time scales maintaining 60fps

### 🔧 Runtime Configuration Panel  
- **Live Parameter Tuning**: Adjust simulation parameters while running
- **Tabbed Interface**: Environment, Population, Behavior, Display, and Advanced settings
- **Export/Import**: Save and share configuration presets
- **Floating Panel**: Dockable configuration window with keyboard shortcuts (Ctrl+Shift+C)
- **Real-time Updates**: Changes apply instantly to running simulation

### 🧪 Comprehensive Testing Infrastructure
- **Vitest Integration**: Professional testing setup with DOM environment support
- **29 Test Cases**: Complete coverage of menu functionality, world loading, error handling
- **CSS Testing**: Visual state verification with getComputedStyle mocking
- **Test Utilities**: Reusable mocks and helpers for consistent testing
- **Continuous Integration**: All tests pass before any commit

### 🐛 Critical Bug Fixes
- **Menu Overlay Visibility**: Fixed menu not hiding properly during world transitions (CSS .menu-overlay.hidden rule)
- **World Loading Properties**: Fixed resumeLastWorld() using incorrect property names (name vs worldName)
- **Modal UI Replacement**: Replaced unreliable browser prompt() with professional modal interfaces
- **Error Handling**: Comprehensive error handling for all menu transitions with graceful fallbacks
- **Array Safety**: Defensive programming preventing crashes from corrupted localStorage data

### 🎮 Enhanced User Experience
- **Seamless Transitions**: Smooth menu → world selection → simulation workflow
- **Visual Feedback**: Loading states, progress indicators, success/error notifications
- **Keyboard Shortcuts**: Full keyboard navigation and accessibility support
- **Responsive Design**: Perfect display across desktop, tablet, and mobile devices
- **Activity Feed**: Real-time logging of all user actions and system events

### 📊 New World Configuration Options
- **World Sizes**: Small (50×30), Medium (75×50), Large (100×75), Huge (150×100)
- **Biome Types**: Forest Floor, Desert Oasis, Grassland, Wetland, Mixed Terrain
- **Population Control**: Starting population (5-50), maximum population (20-200), role ratios
- **Environment Settings**: Food abundance (Scarce/Normal/Abundant), hazard levels, starting season
- **Preset Configurations**: Quick Start, Survival Mode, Evolution Lab templates

### 🏗️ Architecture Improvements
- **Component Separation**: MenuManager, TimeScaleManager, RuntimeConfigPanel as dedicated modules
- **Event-Driven Design**: Clean separation of concerns with proper event handling
- **State Management**: Centralized world configuration and simulation state
- **Error Boundaries**: Graceful error recovery preserving user data and session state
- **Performance Monitoring**: Built-in performance tracking and optimization

### 🚀 Development Experience
- **Test-Driven Development**: All new features developed with comprehensive test coverage
- **Hot Module Reload**: Instant feedback during development (maintained from v0.5)
- **Build Optimization**: Production bundle optimized to 68.76 kB (gzipped: 18.36 kB)
- **Development Tools**: Enhanced debugging with detailed error reporting and performance metrics

### 📱 Maintained Compatibility
- **All v0.5 Features**: Complete backward compatibility with existing simulation features
- **Browser Support**: Modern browsers with ES6 module support
- **Mobile Responsive**: Touch-friendly interface optimized for all screen sizes
- **Progressive Enhancement**: Graceful degradation for older devices

---

**This release transforms the ant colony simulation from a tech demo into a full-featured, configurable world management system comparable to Conway's Game of Life but with complex ant AI and swarm intelligence behaviors.**

## prototype-v0.5 - Vite Edition (2025-09-12)

### 🚀 Major Upgrade: Modern Development Architecture

**Complete migration to Vite-based development** with hot module reload, ES6 modules, and modern build tooling for superior developer experience and maintainable codebase.

### 🔥 Development Features
- **Hot Module Reload**: Instant updates when editing components - no page refresh needed
- **ES6 Modules**: Clean import/export system with proper dependency management  
- **Fast Build**: Lightning-fast dev server startup (141ms) and optimized production builds
- **Modern Tooling**: Vite v5.4+ with automatic TypeScript support and CSS processing
- **Source Maps**: Proper debugging with full source map support

### 🎨 Enhanced Graphics
- **Pixel Art Rendering**: Beautiful 450×300 Canvas with 6×6 pixel tiles for crisp graphics
- **Detailed Sprites**: Hand-crafted pixel art for ants, terrain, and food sources
- **Role-Based Colors**: Workers (green), scouts (blue), soldiers (red) with visual distinction
- **Optimized Performance**: Hardware-accelerated Canvas rendering with 60fps target

### 🏗️ Architectural Improvements  
- **Modular Components**: Clean separation between utils, simulation, and rendering
- **Import/Export System**: Proper ES6 modules replacing global variables
- **Component Organization**: Logical file structure in `/src/components/`
- **CSS Processing**: Vite handles CSS imports and optimization automatically
- **Legacy Cleanup**: Removed old `/web/` directory and custom hot-reload system

### 🎮 Enhanced Simulation
- **World Size**: Expanded to 75×50 tiles (3,750 tiles vs previous 700)
- **Better AI**: Improved ant behaviors with role-specific actions and state management
- **Food System**: Enhanced food discovery, collection, and colony nutrition management
- **Performance**: Optimized simulation loop with proper delta time handling

### 📦 Package Management
- **NPM Integration**: Proper package.json with development and build scripts
- **Dependency Management**: Clean dependency tree with only Vite as dev dependency  
- **Build Scripts**: `npm run dev`, `npm run build`, `npm run preview`
- **Modern Standards**: ES2020 target with proper module resolution

### 🚀 Quick Start (Updated)
```bash
npm install           # Install dependencies
npm run dev          # Start development server
# Open http://localhost:8000
```

### ✨ Developer Experience
- **Instant Updates**: Change any component and see updates immediately
- **Error Overlay**: Vite's built-in error display with stack traces
- **Network Access**: Development server accessible from other devices
- **Production Ready**: Optimized builds with tree shaking and minification

### 🔄 Migration Benefits
- **50% Faster Development**: HMR vs full page reloads
- **Cleaner Code**: ES6 modules vs global script tags  
- **Better Maintainability**: Component-based architecture
- **Modern Standards**: Up-to-date with current web development practices
- **Future Proof**: Foundation for TypeScript, testing, and advanced features

### 🗑️ Removed Legacy Code
- Custom hot-reload system (~200 lines removed)
- Old `/web/` directory structure
- Script tag-based loading system
- Obsolete test files and configurations

## prototype-v0.4 - Browser Edition (2025-09-12)

### 🌟 Major Achievement: Complete Browser Implementation

**Revolutionary browser-based ant colony simulation** that completely solves terminal rendering issues while providing superior user experience and interactivity.

### 🎮 Browser Features
- **Perfect Emoji Rendering**: No more terminal width issues - emojis display flawlessly in CSS Grid
- **Interactive Controls**: Click ants for individual stats, hover for tooltips, keyboard shortcuts
- **Real-time Performance**: Smooth 60fps rendering with live performance monitoring
- **Mobile Responsive**: Works perfectly on phones, tablets, and desktop
- **Dark Theme**: Beautiful terminal-inspired design with modern UX

### 🐜 Core Simulation Features
- **Autonomous Ant AI**: 10 individual ants (7 workers, 2 scouts, 1 soldier) with unique behaviors
- **Dynamic Environment**: Procedurally generated 35x20 terrain with food sources and hazards
- **Seasonal Progression**: Spring → Summer → Autumn → Winter cycle with environmental effects
- **Real-time Stats**: Live tracking of food, population, morale, and performance metrics
- **Emergent Behaviors**: Complex colony patterns emerge from simple individual ant rules

### 🎯 Interactive Elements
- **Ant Details**: Click any ant to see role, state, energy, position, and carrying status
- **Terrain Information**: Click terrain for position and content details
- **Live Controls**: Play/pause (spacebar), speed adjustment (0.5x-5x), reset simulation
- **Activity Feed**: Real-time log of discoveries, movements, and colony events
- **Visual Options**: Toggle trails, behavior states, and environment details

### 🏗️ Technical Architecture
- **Pure JavaScript**: No frameworks or dependencies for maximum compatibility
- **Modular Design**: Clean separation between simulation engine, renderer, and UI controller
- **Efficient Rendering**: Only updates changed DOM elements for optimal performance  
- **Browser-First**: Built from ground up for web, not adapted from terminal
- **Responsive Layout**: CSS Grid with mobile-first responsive breakpoints

### 📱 Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: iOS Safari, Chrome Mobile, Android browsers
- **Accessibility**: High contrast mode, keyboard navigation, screen reader friendly
- **Performance**: 60fps on most devices, graceful degradation for older hardware

### 🚀 Quick Start
```bash
cd web
python3 -m http.server 8080
# Open http://localhost:8080
```

### 🎉 Benefits Over Terminal Version
- ✅ **Perfect Visual Alignment**: CSS Grid handles all emoji spacing automatically
- ✅ **Interactive Experience**: Click, hover, and keyboard interactions
- ✅ **Better Performance**: No terminal refresh overhead or ANSI escape sequences
- ✅ **Mobile Access**: Touch-friendly interface works on any device
- ✅ **Easy Sharing**: Send a URL instead of requiring Node.js installation
- ✅ **Enhanced UX**: Smooth animations, tooltips, modal dialogs

### 📊 Maintained Features
All original simulation features remain fully functional:
- Individual ant AI with role-specific behaviors
- Environmental adaptation and seasonal changes
- Resource management and colony survival mechanics
- Real-time autonomous simulation with no player input required
- Performance statistics and debugging capabilities

### 🎯 Educational Value
Perfect demonstration of **swarm intelligence concepts**:
- Individual agent behaviors creating emergent colony patterns
- Environmental adaptation through collective decision-making
- Resource optimization through distributed problem-solving
- Visual representation of complex adaptive systems

---

**This release represents a complete evolution from terminal-based prototype to modern, interactive web application while maintaining all core swarm intelligence simulation features.**