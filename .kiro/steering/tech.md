# Tech Stack

## Core Technologies
- **Vanilla JavaScript** (ES6+) - No frameworks or build tools
- **HTML5 Canvas** - For rendering game graphics
- **CSS3** - Minimal styling with Kiro brand colors

## Architecture
- Single-page application with no dependencies
- Game loop using `requestAnimationFrame` for 60 FPS rendering
- Delta time-based movement for frame-independent physics
- Event-driven input handling via keyboard events (keydown/keyup)
- Responsive canvas sizing with aspect ratio preservation
- State machine for game states (playing, levelComplete, gameOver)

## Key Libraries/APIs
- Canvas 2D Context API for all rendering
- Image API for sprite loading (kiro-logo.png)
- Performance API for high-resolution timestamps

## Game Systems Implemented
- **Enemy AI**: Pathfinding with tunnel following and ghost mode (through dirt)
- **Physics**: Gravity system for rocks with wobble and fall mechanics
- **Combat**: Pump inflation system (4 stages) and fire breath projectiles
- **Collision**: Grid-based collision detection for all entities
- **Particles**: Simple particle system for visual effects
- **Screen Effects**: Screen shake and damage flash effects
- **Scoring**: Point system with multiple scoring events
- **Progression**: Level-based difficulty scaling

## Running the Game
- Open `index.html` in any modern browser
- No build step or compilation required
- No package manager or dependencies needed
- For development: Use a local server (e.g., `python -m http.server` or VS Code Live Server) to avoid CORS issues with image loading

## File Structure
- `index.html` - Entry point and DOM structure
- `game.js` - All game logic (2546 lines), state management, and rendering
- `style.css` - Minimal styling and layout
- `kiro-logo.png` - Player character sprite

## Performance
- Target: 60 FPS
- Max entities: 8 enemies + 5 rocks + particles
- Efficient grid-based collision detection
- Optimized rendering with canvas transforms
