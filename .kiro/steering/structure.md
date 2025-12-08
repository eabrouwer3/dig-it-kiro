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
- Enemy constants (types, speeds, spawn counts)
- Fire breath constants (duration, range, cooldown)
- Pump constants (inflation time, max stages)
- Rock constants (fall speed, wobble duration)

### Game State Object
- Canvas and context references
- Dirt grid (2D boolean array)
- Player state (position, direction, movement, speed)
- Enemies array (Pooka and Fygar with AI state)
- Rocks array (position, state, wobble/fall timers)
- Fires array (active fire breath projectiles)
- Pump state (active, target, inflation progress)
- Particles array (visual effects)
- Score, lives, level tracking
- Game state (playing, levelComplete, gameOver)
- Screen shake and damage flash effects
- Round pause system
- Asset loading state (kiroImage, imageLoaded)

### Core Functions
- `init()` - Setup canvas, load assets, initialize state, bind events, spawn enemies/rocks
- `resizeCanvas()` - Responsive sizing with aspect ratio preservation
- `handleKeyDown/Up()` - Input handling for movement, pump, restart
- `gameLoop()` - Main loop using requestAnimationFrame with delta time
- `draw()` - Render all game elements (sky, dirt, enemies, rocks, fire, pump, player, particles, UI)

### Enemy System Functions
- `createEnemy()` - Creates enemy object with properties
- `spawnEnemies()` - Spawns enemies based on level with tunnels
- `updateEnemies()` - Updates all enemy states and movement
- `moveEnemy()` - Handles individual enemy movement
- `calculateEnemyPath()` - AI pathfinding (tunnel vs ghost mode)
- `checkEnemyCollision()` - Detects player-enemy collisions
- `triggerFygarFire()` - Initiates fire breath attacks
- `updateFires()` - Updates fire projectiles
- `checkFireCollision()` - Detects player-fire collisions

### Pump System Functions
- `firePump()` - Fires pump in player direction (2 block range)
- `updatePump()` - Handles inflation/deflation logic
- Pump attaches to enemies, inflates over time, pops at stage 4

### Rock System Functions
- `spawnRocks()` - Places rocks in dirt grid
- `checkRockSupport()` - Checks if dirt exists below rock
- `updateRocks()` - Handles wobble and falling states
- `checkRockCollision()` - Detects rock-entity collisions

### Scoring & Progression Functions
- `addScore()` - Adds points and logs events
- `loseLife()` - Decrements lives, resets positions, triggers effects
- `checkLevelComplete()` - Checks if all enemies defeated
- `advanceLevel()` - Increments level, resets grid, spawns entities
- `showGameOver()` - Renders game over screen
- `restartGame()` - Resets all game state

### Visual Effects Functions
- `spawnParticles()` - Creates particle effects
- `updateParticles()` - Updates particle physics
- `renderParticles()` - Draws particles with fade
- `triggerScreenShake()` - Initiates screen shake effect
- `updateScreenShake()` - Updates shake offset
- `updateDamageFlash()` - Updates red flash on damage

## Conventions
- Grid coordinates: (0,0) is top-left
- Player position stored in grid coordinates, converted to screen pixels for rendering
- Dirt array: `true` = dirt exists, `false` = dug out tunnel
- Block size calculated dynamically based on canvas size
- All rendering uses the calculated `blockSize` for responsive scaling
