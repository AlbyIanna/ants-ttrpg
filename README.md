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

Run with AI GameMaster (enhanced narrative):
```bash
node sims/session-runner.js demo --visual  # AI enabled by default
```

Run without AI (classic mode):
```bash
node sims/session-runner.js demo --visual --no-ai
```

Run interactive mode:
```bash  
node sims/session-runner.js interactive
```

Run interactive with full AI GameMaster:
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
- `/sims/` - Core simulation engine, AI GameMaster, and session runner
- `/prompts/` - AI narrative templates and GameMaster prompts
- `/config/` - AI provider configuration and settings
- `/narrative/` - Flavor text and scenario templates
- `/tests/` - Example playthroughs and unit tests

## Architecture

Built with modular design supporting:
- **AI GameMaster**: Dynamic narrative generation with contextual storytelling
- **Visual Colony Display**: Real-time ASCII representation of ant world
- **Rule-based Simulation**: Action validation and emergent gameplay
- **Swarm Intelligence**: Simple rules creating complex behaviors
- **Extensible Framework**: Easy expansion via JSON configuration

## AI GameMaster Features

- **Dynamic Storytelling**: Context-aware narrative generation
- **Multiple Providers**: Support for OpenAI, Claude, local LLMs, or built-in mock AI
- **Immersive Perspective**: Stories told from ant-scale viewpoint  
- **Adaptive Narrative**: Responds to colony personality and stress levels
- **Rich Visual Integration**: Enhanced visual display with AI-generated content