# CLAUDE.md — Ant Colony TTRPG Prototype

# Project Purpose
- Goal: Build a lightweight, interactive swarm intelligence simulation inspired by *Of Ants and Dinosaurs*, demonstrating emergent behaviors through real-time ant colony simulation.
- Deliverables:
  1. **Browser-based simulation** with perfect emoji rendering and interactive features (primary)
  2. Rule schemas and simulation engine modules for game state transitions
  3. Terminal-compatible version for command-line enthusiasts
  4. Example playthroughs and educational demonstrations

# Folder structure
- /web/          → **Main browser application** (HTML, CSS, JS)
- /sims/         → Core simulation logic (JS) for game state transitions
- /rules/        → JSON schemas for rule definitions
- /narrative/    → Narrative templates & flavor text
- /prompts/      → Prompt templates for GameMaster & subagents
- /tests/        → Unit tests and example playthroughs

# Style / conventions
- All artifacts must include: version, description/purpose, changelog
- Prefer JSON schemas for data definitions
- Code style: functions modular, avoid long monoliths
- Names: use kebab-case for file/folder names

# Permissions / Tools
- Claude Code is allowed to edit files in `/web/`, `/sims/`, `/rules/`, `/prompts/`
- Browser implementation in `/web/` is the primary focus
- Narrative folder edits allowed only when narrative artifacts are requested
- Require human review of any changes to core simulation logic

# Versioning & Release Guidelines
- Current version: **prototype-v0.4** (Browser Edition)
- Use semantic versioning: `prototype-v0.x` for prototypes, `v1.x.x` for stable releases
- ALWAYS update RELEASE_NOTES.md before tagging a new version
- Before committing major changes, review entire project for consistency:
  - Ensure browser version works correctly
  - Update README.md with clear browser-first instructions
  - Verify web assets are properly referenced
  - Test responsive design and mobile compatibility
  - Review performance and accessibility
- Tag format: `prototype-v0.4`, `prototype-v0.5`, etc. for iterations
- Each release must include: features added, browser compatibility, usage examples

# Common commands / templates
- `/gen-rule <informal description>` → produces JSON rule schema + tests
- `/simulate-turn <state> <actions>` → produces code stubs or simulation result
- `/design-session` → produces one-shot scenario + character roles + atmosphere notes

- Always update the documentation when making changes and especially before committing