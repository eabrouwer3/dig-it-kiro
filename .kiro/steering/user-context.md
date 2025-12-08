# User Context

## Project Type
Dig Dug-inspired arcade game

## Technology Choices
- **Language**: Vanilla JavaScript (ES6+)
- **Framework**: None (pure JavaScript)
- **Rendering**: HTML5 Canvas 2D Context
- **Build Tools**: None required
- **Dependencies**: Zero dependencies

## User Preferences
- Retro pixel art aesthetic
- Kiro brand colors (purple #790ECB, dark backgrounds)
- Grid-based movement system
- Classic arcade game feel with modern polish
- 60 FPS target performance

## Game Design Decisions
- **Grid Size**: 14x15 dirt area + 3 sky rows + 1 status row
- **Player Character**: Kiro logo sprite (kiro-logo.png)
- **Enemy Types**: Pooka (red, fast) and Fygar (green dragon, fire breath)
- **Combat**: Pump inflation mechanic (4 stages to defeat)
- **Hazards**: Falling rocks with wobble warning
- **Lives**: 3 lives system
- **Scoring**: Multiple point sources (digging, defeats, crushes, levels)
- **Difficulty**: Progressive scaling per level (enemy count, speed)

## Implementation Approach
- Started with basic movement and tunnel digging
- Created comprehensive spec with requirements, design, and tasks
- Implemented all features incrementally through task list
- All 11 main tasks completed (tasks 1-11)
- Task 12 (testing) marked for future refinement

## Current Status
**FULLY IMPLEMENTED** - All core features complete and functional

## Visual Effects Implemented
- Particle system for explosions and digging
- Screen shake on rock impacts
- Damage flash on player hit
- Smooth interpolated movement
- Animated fire breath with warning phase
- Wobble animation for unstable rocks
- Ghost mode transparency for enemies in dirt

## Controls
- **Movement**: Arrow keys or WASD
- **Attack**: Spacebar (pump)
- **Restart**: R key (when game over)

## Known Features
- Round pause system (2-second countdown at start)
- Enemy aggression after 30 seconds
- Ghost mode AI (enemies can move through dirt)
- Intelligent pathfinding (tunnel vs dirt path comparison)
- Fire breath with warning indicator
- Rock persistence across lives
- Level completion bonuses
