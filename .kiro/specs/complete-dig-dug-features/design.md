# Design Document

## Overview

This design extends the existing Dig Dug game with enemy AI, combat mechanics, environmental hazards, and progression systems. The architecture maintains the current vanilla JavaScript approach with a single game loop, adding new state management for enemies, rocks, scoring, and level progression. All new features integrate seamlessly with the existing grid-based movement and rendering system.

## Architecture

### Core Game Loop Enhancement

The existing `gameLoop()` function will be extended to handle:
- Enemy AI updates (movement, pathfinding, attack logic)
- Rock physics (gravity checks, falling mechanics)
- Collision detection (player-enemy, player-fire, rock-entity)
- Pump mechanics (inflation progression, deflation)
- Level completion checks
- Game over conditions

### State Management Expansion

The `game` object will be extended with new properties:

```javascript
const game = {
    // Existing properties...
    canvas, ctx, blockSize, dirt, player, kiroImage, imageLoaded,

    // New properties
    enemies: [],           // Array of enemy objects
    rocks: [],            // Array of rock objects
    pump: null,           // Current pump state (null or object with target)
    score: 0,
    lives: 3,
    level: 1,
    gameState: 'playing', // 'playing', 'levelComplete', 'gameOver'
    levelTransitionTimer: 0,
    particles: []         // For visual effects
};
```

## Components and Interfaces

### Enemy System

#### Enemy Object Structure
```javascript
{
    id: uniqueId,
    type: 'pooka' | 'fygar',
    x: gridX,
    y: gridY,
    direction: 'up' | 'down' | 'left' | 'right',
    speed: baseSpeed,
    isInDirt: boolean,
    inflationStage: 0-4,
    aliveTime: seconds,
    lastFireTime: timestamp,
    targetX: playerX,
    targetY: playerY
}
```

#### Enemy AI Functions
- `spawnEnemies(level)`: Creates enemies based on level number
- `updateEnemies(deltaTime)`: Updates all enemy positions and states
- `moveEnemy(enemy, deltaTime)`: Handles individual enemy movement
- `calculateEnemyPath(enemy)`: Simple pathfinding using Manhattan distance
- `checkEnemyCollision(enemy)`: Detects collision with player
- `triggerFygarFire(enemy)`: Initiates fire breath attack

#### Enemy Rendering
- Pooka: Red circle with simple face pattern
- Fygar: Green dragon shape with directional orientation
- Ghost mode: 50% opacity when in dirt
- Inflation: Scale sprite by (1 + inflationStage * 0.25)

### Pump Mechanic System

#### Pump Object Structure
```javascript
{
    active: boolean,
    targetEnemy: enemyId | null,
    inflationProgress: 0-4,
    keyHeld: boolean,
    deflationTimer: 0
}
```

#### Pump Functions
- `firePump()`: Creates pump projectile in player direction
- `updatePump(deltaTime)`: Handles inflation/deflation logic
- `attachPump(enemy)`: Connects pump to enemy
- `detachPump()`: Releases pump from enemy
- `inflateEnemy(enemy, deltaTime)`: Increases inflation stage
- `deflateEnemy(enemy, deltaTime)`: Decreases inflation stage

### Rock and Gravity System

#### Rock Object Structure
```javascript
{
    id: uniqueId,
    x: gridX,
    y: gridY,
    state: 'stable' | 'wobbling' | 'falling',
    wobbleTimer: 0,
    fallSpeed: 0,
    crushedEnemies: []
}
```

#### Rock Functions
- `spawnRocks(level)`: Places rocks in dirt grid
- `updateRocks(deltaTime)`: Checks support and handles falling
- `checkRockSupport(rock)`: Determines if dirt exists below
- `fallRock(rock, deltaTime)`: Moves rock downward
- `checkRockCollision(rock)`: Detects entities in fall path
- `crushEntity(rock, entity)`: Handles collision damage

#### Gravity Logic
1. Every frame, check if dirt exists directly below rock
2. If no support, start wobble timer (0.5 seconds)
3. After wobble, transition to falling state
4. While falling, move at 8 blocks/second
5. Check collisions each frame
6. Stop when hitting dirt or bottom boundary

### Scoring System

#### Score Tracking
- Maintain `game.score` as integer
- Update on enemy defeat events
- Add level completion bonuses
- Display in status bar with formatted text

#### Score Functions
- `addScore(points, reason)`: Adds points and creates score popup
- `calculateRockBonus(crushedCount)`: Multiplies base rock score
- `awardLevelBonus()`: Adds completion bonus

### Lives and Game Over

#### Life Management
- Track `game.lives` (starts at 3)
- Decrement on player damage events
- Reset player position on life loss
- Trigger game over at 0 lives

#### Game Over Functions
- `loseLife()`: Decrements lives and resets position
- `checkGameOver()`: Tests if lives reached 0
- `showGameOver()`: Renders game over screen
- `restartGame()`: Resets all game state

### Level Progression

#### Level State
- Track `game.level` (starts at 1)
- Increase enemy count per level
- Scale enemy speed per level
- Reset grid on level advance

#### Level Functions
- `checkLevelComplete()`: Tests if all enemies defeated
- `advanceLevel()`: Increments level and resets state
- `calculateEnemyCount(level)`: Returns enemy spawn count
- `calculateEnemySpeed(level)`: Returns speed multiplier
- `resetLevel()`: Clears grid and spawns new entities

## Data Models

### Game State Flow
```
PLAYING → (all enemies defeated) → LEVEL_COMPLETE → (2 sec timer) → PLAYING (next level)
PLAYING → (lives = 0) → GAME_OVER → (press R) → PLAYING (level 1)
```

### Collision Detection Grid
- Maintain spatial hash for efficient collision checks
- Check player position against enemy positions each frame
- Check rock fall path against all entities
- Check pump projectile against enemy positions

### Timing and Delta Time
- Use `requestAnimationFrame` timestamp for delta calculation
- Convert delta to seconds for consistent speed across frame rates
- Apply delta to all movement and timer updates

## Error Handling

### Boundary Checks
- Validate all grid positions before array access
- Clamp entity positions to valid grid bounds
- Handle edge cases for pathfinding at boundaries

### Asset Loading
- Maintain existing fallback rendering for missing sprites
- Add simple geometric shapes for enemies if images unavailable
- Ensure game is playable without any image assets

### State Validation
- Check for null/undefined before accessing enemy/rock properties
- Validate game state transitions
- Handle rapid key presses without state corruption

## Testing Strategy

### Manual Testing Approach
1. Test enemy spawning and movement in tunnels
2. Verify ghost mode movement through dirt
3. Test pump inflation through all 4 stages
4. Verify rock falling and collision detection
5. Test score accumulation for all point sources
6. Verify life loss and respawn mechanics
7. Test level progression and difficulty scaling
8. Verify game over and restart functionality

### Key Test Scenarios
- Player surrounded by multiple enemies
- Rock falling on multiple enemies simultaneously
- Pump deflation when key released early
- Fygar fire breath at various distances
- Level completion with no remaining enemies
- Game over at 0 lives
- Rapid movement and collision edge cases

### Performance Considerations
- Limit enemy count to 8 maximum
- Use simple Manhattan distance for pathfinding (no A*)
- Minimize particle effects to maintain 60 FPS
- Efficient collision detection using grid positions
- Avoid expensive operations in game loop

## Visual Effects

### Particle System (Optional Enhancement)
- Enemy pop particles on inflation defeat
- Rock impact particles on crush
- Dust particles when digging through dirt
- Simple colored squares with velocity and lifetime

### Screen Effects
- Brief screen shake on rock impact
- Flash effect on player damage
- Smooth transitions between levels

### UI Elements
- Status bar shows: Score | Lives | Level
- Game over overlay with final score
- Level transition message
- Visual feedback for pump attachment

## Implementation Notes

### Code Organization
All new code will be added to `game.js` following existing patterns:
1. Constants section (enemy speeds, rock fall rate, etc.)
2. Game state expansion
3. New initialization in `init()`
4. Update functions called from `gameLoop()`
5. Rendering additions in `draw()`
6. New keyboard handlers for pump (spacebar) and restart (R)

### Incremental Development
Features should be implemented in this order:
1. Enemy spawning and basic movement
2. Collision detection and life system
3. Pump mechanics and inflation
4. Rock physics and gravity
5. Scoring system
6. Level progression
7. Polish and visual effects

This order ensures each feature builds on previous work and maintains a playable game at each step.
