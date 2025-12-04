# Project Structure

## Root Files
```
├── index.html          # Entry point, canvas container
├── game.js             # All game logic (constants, state, init, loop, rendering)
├── style.css           # Minimal styling with Kiro brand colors
└── kiro-logo.png       # Player sprite asset
```

## Code Organization (game.js)

### Constants Section
- Grid dimensions (GRID_WIDTH, GRID_HEIGHT, SKY_HEIGHT, etc.)
- Game configuration values

### Game State Object
- Canvas and context references
- Dirt grid (2D boolean array)
- Player state (position, direction)
- Asset loading state (kiroImage, imageLoaded)

### Core Functions
- `init()` - Setup canvas, load assets, initialize state, bind events
- `resizeCanvas()` - Responsive sizing with aspect ratio preservation
- `handleKeyPress()` - Input handling for movement
- `gameLoop()` - Main loop using requestAnimationFrame
- `draw()` - Render all game elements (sky, dirt, player, status bar)

## Conventions
- Grid coordinates: (0,0) is top-left
- Player position stored in grid coordinates, converted to screen pixels for rendering
- Dirt array: `true` = dirt exists, `false` = dug out tunnel
- Block size calculated dynamically based on canvas size
- All rendering uses the calculated `blockSize` for responsive scaling
