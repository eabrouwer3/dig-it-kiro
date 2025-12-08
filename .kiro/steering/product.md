# Product Overview

A browser-based Dig Dug-inspired arcade game where the player controls a character (Kiro) that digs through underground dirt to create tunnels. The game features a retro pixel art aesthetic with modern polish using Kiro brand colors.

## Core Gameplay
- Player navigates through a dirt-filled grid, creating tunnels by movement
- Grid-based movement system (14x15 dirt area with sky and status sections)
- Arrow keys or WASD controls for four-directional movement
- Kiro logo sprite used as the player character
- Pump mechanic to inflate and defeat enemies (spacebar)
- Falling rocks that crush enemies and player
- Two enemy types: Pooka (red) and Fygar (green dragon with fire breath)
- Scoring system with bonuses for rock crushes and level completion
- Lives system (3 lives) with game over and restart (R key)
- Progressive difficulty through level advancement

## Current State
**Phase: FULLY IMPLEMENTED ✅**

All core features are complete and functional:
- ✅ Enemy system (Pooka and Fygar with AI pathfinding)
- ✅ Ghost mode (enemies move through dirt slowly)
- ✅ Pump mechanics (inflate enemies to defeat them)
- ✅ Rock physics (wobble, fall, crush mechanics)
- ✅ Fire breath attacks (Fygar special ability)
- ✅ Collision detection (player-enemy, fire, rocks)
- ✅ Scoring system (digging, pump defeats, rock crushes, level bonuses)
- ✅ Lives system (3 lives, respawn on death)
- ✅ Level progression (increasing difficulty, enemy count/speed scaling)
- ✅ Visual effects (particles, screen shake, damage flash)
- ✅ Game states (playing, level complete, game over)
- ✅ Round pause system (2-second countdown at start)

## Game Features
- **Enemies**: 3-8 enemies per level (Pooka and Fygar)
- **Scoring**: 10 pts/dirt, 200 pts/pump defeat, 500 pts/rock crush, 1000 pts/level
- **Difficulty**: Enemies speed up 10% per level (max 200%), become aggressive after 30s
- **Rocks**: 3-5 rocks per level, wobble 1s before falling
- **Lives**: Start with 3, lose on enemy/fire/rock contact
- **Controls**: WASD/Arrows to move, Spacebar to pump, R to restart

## Next Steps
The game is feature-complete! Possible enhancements:
- Additional enemy types or behaviors
- Power-ups or special items
- Sound effects and music
- High score persistence
- Additional visual polish
