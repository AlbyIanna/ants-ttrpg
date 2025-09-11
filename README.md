# Ant Colony TTRPG Prototype v1.0

A lightweight tabletop RPG prototype inspired by swarm intelligence mechanics.

## Quick Start

Run the demo:
```bash
node sims/session-runner.js demo
```

Run with visual colony display:
```bash
node sims/session-runner.js demo --visual
```

Run interactive mode:
```bash  
node sims/session-runner.js interactive
```

Run interactive with visual display:
```bash  
node sims/session-runner.js interactive --visual
```

## Game Overview

Players manage an ant colony through survival challenges. Make decisions about foraging, exploration, defense, and rest while managing:

- **Food**: Colony sustenance (consumed each turn)
- **Population**: Workers, scouts, soldiers with different abilities  
- **Morale**: Affects performance and decision outcomes
- **Random Events**: Environmental challenges and opportunities

## Victory Conditions

- Survive 10 turns
- Maintain colony population above critical levels
- Adapt to environmental changes (winter, predators, etc.)

## File Structure

- `/rules/` - JSON schemas for game mechanics
- `/sims/` - Core simulation engine and session runner
- `/narrative/` - Flavor text and scenario templates
- `/tests/` - Example playthroughs and unit tests

## Architecture

Built with modular design supporting:
- Rule-based action validation
- Event-driven narrative system
- Emergent gameplay from simple mechanics
- Easy expansion via JSON configuration