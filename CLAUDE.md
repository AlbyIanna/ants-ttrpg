# CLAUDE.md — Ant Colony TTRPG Prototype

# Project Purpose
- Goal: Build a lightweight, one-shot tabletop RPG prototype inspired by *Of Ants and Dinosaurs*, using mechanics from swarm intelligence.
- Deliverables:
  1. Rule schemas and code artifacts (resource, population, events).
  2. Narrative + scenario templates for sessions.
  3. Simulation engine modules (resource update, encounter resolution).
  4. Example playthroughs / unit tests.

# Folder structure
- /rules/        → JSON/pseudocode of rule schemas
- /sims/         → simulation logic (JS or other code) for game state transitions
- /narrative/    → narrative templates & flavor text
- /prompts/      → prompt templates for GameMaster & subagents
- /tests/        → unit tests for rules and simulation

# Style / conventions
- All artifacts must include: version, description/purpose, changelog
- Prefer JSON schemas for data definitions
- Code style: functions modular, avoid long monoliths
- Names: use kebab-case for file/folder names

# Permissions / Tools
- Claude Code is allowed to edit files in `/rules/`, `/sims/`, `/prompts/`
- Narrative folder edits allowed only when narrative artifacts are requested
- Require human review of any changes to core rule logic

# Common commands / templates
- `/gen-rule <informal description>` → produces JSON rule schema + tests
- `/simulate-turn <state> <actions>` → produces code stubs or simulation result
- `/design-session` → produces one-shot scenario + character roles + atmosphere notes
