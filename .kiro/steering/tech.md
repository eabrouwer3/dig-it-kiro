# Tech Stack

## Core Technologies
- **Vanilla JavaScript** (ES6+) - No frameworks or build tools
- **HTML5 Canvas** - For rendering game graphics
- **CSS3** - Minimal styling with Kiro brand colors

## Architecture
- Single-page application with no dependencies
- Game loop using `requestAnimationFrame` for 60 FPS rendering
- Event-driven input handling via keyboard events
- Responsive canvas sizing with aspect ratio preservation

## Key Libraries/APIs
- Canvas 2D Context API for all rendering
- Image API for sprite loading (kiro-logo.png)

## Running the Game
- Open `index.html` in any modern browser
- No build step or compilation required
- No package manager or dependencies needed
- For development: Use a local server (e.g., `python -m http.server` or VS Code Live Server) to avoid CORS issues with image loading

## File Structure
- `index.html` - Entry point and DOM structure
- `game.js` - All game logic, state management, and rendering
- `style.css` - Minimal styling and layout
- `kiro-logo.png` - Player character sprite
