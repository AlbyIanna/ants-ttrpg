# 🐜 Ant Colony TTRPG - Browser Edition

A browser-based real-time ant colony simulation with perfect emoji rendering and interactive features.

## Quick Start

1. **Open the simulation:**
   ```bash
   # Simple way - open index.html directly in browser
   open web/index.html
   
   # Or serve with a local server (recommended)
   cd web
   python3 -m http.server 8080
   # Then open http://localhost:8080
   ```

2. **Start simulation:**
   - Click "▶️ Start" to begin the live simulation
   - Use controls to pause, adjust speed, or reset
   - Click on ants and terrain for details

## Features

### 🎮 Interactive Controls
- **Play/Pause**: Space bar or click the button
- **Speed Control**: 0.5x to 5x simulation speed
- **Reset**: Ctrl+R or click reset button
- **View Options**: Toggle trails, behavior states, environment details

### 🐜 Real-time Simulation
- **Autonomous Ants**: Workers, scouts, and soldiers with individual AI
- **Live Environment**: Procedurally generated terrain with food sources
- **Seasonal Changes**: Dynamic seasons affecting gameplay
- **Performance Stats**: Real-time FPS and update tracking

### 🖱️ Click Interactions
- **Ant Details**: Click on ants to see individual stats
- **Terrain Info**: Click on terrain for position and content info
- **Hover Tooltips**: Hover over elements for quick information

### 📱 Responsive Design
- **Mobile Support**: Works on phones and tablets
- **Dark Theme**: Easy on the eyes terminal-inspired design
- **Accessibility**: High contrast support and keyboard navigation

## Technical Details

### Architecture
- **WebSimulation**: Browser-adapted simulation engine
- **WebRenderer**: DOM-based visual rendering with perfect emoji support
- **Utils**: Comprehensive utility library for browser operations
- **Main App**: Application controller with event management

### Performance
- **Efficient Rendering**: Only updates changed cells
- **Smooth Animations**: CSS transitions and requestAnimationFrame
- **Memory Management**: Automatic cleanup and optimization
- **Real-time Stats**: Performance monitoring and display

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet
- **Features Used**: CSS Grid, ES6 modules, requestAnimationFrame

## Controls

| Key | Action |
|-----|--------|
| **Space** | Play/Pause simulation |
| **Ctrl+R** | Reset simulation |
| **Escape** | Close modal |
| **Click** | Ant/terrain details |
| **Hover** | Quick tooltips |

## Customization

The simulation supports various display options:
- **Show Trails**: Visualize ant movement paths
- **Behavior States**: Show ant state symbols (W/w, ←, ○, etc.)
- **Environment Details**: Display terrain and seasonal effects

Settings are automatically saved to browser localStorage.

## Comparison to Terminal Version

### ✅ Advantages
- **Perfect Emoji Rendering**: No terminal width issues
- **Interactive Elements**: Click and hover interactions
- **Better Performance**: No terminal refresh overhead
- **Mobile Support**: Works on touch devices
- **Visual Enhancements**: CSS animations and styling
- **Easier Sharing**: Just send a URL

### 📊 Features Maintained
- **Same Simulation Logic**: Identical ant behavior and environment
- **Real-time Updates**: Live autonomous simulation
- **Performance Tracking**: FPS and statistics display
- **All Visual Elements**: Same emojis and symbols
- **Speed Controls**: Variable simulation speed

## Development

Built with vanilla JavaScript for maximum compatibility:
- No frameworks or dependencies
- Modern ES6+ features
- Modular architecture
- Comprehensive error handling

Perfect for demonstrating swarm intelligence concepts in an accessible, interactive format! 🎯