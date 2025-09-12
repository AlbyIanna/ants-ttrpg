# CLAUDE.md — Ant Colony TTRPG Prototype

# Project Purpose
- Goal: Build a lightweight, interactive swarm intelligence simulation inspired by *Of Ants and Dinosaurs*, demonstrating emergent behaviors through real-time ant colony simulation.
- Deliverables:
  1. **Modern browser-based simulation** with Vite HMR and pixel art graphics (primary)
  2. Modular ES6 components for simulation engine and rendering
  3. Legacy simulation modules for reference and potential CLI version
  4. Example playthroughs and educational demonstrations

# Folder structure
- /src/          → **Main Vite application** (ES6 modules, components, styles)
- /public/       → Static assets for Vite build
- /sims/         → Legacy simulation logic (JS) - kept for reference
- /web/          → Legacy browser version - candidate for removal
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
- Claude Code is allowed to edit files in `/src/`, `/sims/`, `/rules/`, `/prompts/`
- Modern Vite implementation in `/src/` is the primary focus
- Legacy `/web/` folder maintained for reference but deprecated
- Narrative folder edits allowed only when narrative artifacts are requested
- Require human review of any changes to core simulation logic

# Versioning & Release Guidelines
- Current version: **prototype-v0.5** (Vite Edition)
- Use semantic versioning: `prototype-v0.x` for prototypes, `v1.x.x` for stable releases
- ALWAYS update RELEASE_NOTES.md before tagging a new version
- Before committing major changes, review entire project for consistency:
  - Ensure Vite build and dev server work correctly
  - Update README.md with clear development instructions
  - Verify HMR and build processes function properly
  - Test pixel rendering and Canvas performance
  - Review ES6 module imports and dependencies
- Tag format: `prototype-v0.5`, `prototype-v0.6`, etc. for iterations
- Each release must include: features added, build compatibility, development instructions

# Common commands / templates
- `npm run dev` → Start Vite development server with HMR
- `npm run build` → Build production version
- `npm run preview` → Preview production build
- `/gen-rule <informal description>` → produces JSON rule schema + tests
- `/simulate-turn <state> <actions>` → produces code stubs or simulation result
- `/design-session` → produces one-shot scenario + character roles + atmosphere notes

- Always update the documentation when making changes and especially before committing