// Game constants
const GRID_WIDTH = 14;
const GRID_HEIGHT = 15; // Dirt area
const SKY_HEIGHT = 3;
const STATUS_HEIGHT = 1;
const TOTAL_HEIGHT = SKY_HEIGHT + GRID_HEIGHT + STATUS_HEIGHT;

// Enemy constants
const ENEMY_TYPES = {
    POOKA: 'pooka',
    FYGAR: 'fygar'
};

const ENEMY_SPEEDS = {
    POOKA_TUNNEL: 2.0,      // blocks per second in tunnels
    POOKA_DIRT: 0.5,        // blocks per second in dirt (ghost mode)
    FYGAR_TUNNEL: 1.5,      // blocks per second in tunnels
    FYGAR_DIRT: 0.5         // blocks per second in dirt (ghost mode)
};

const ENEMY_SPAWN_COUNTS = {
    MIN_POOKA: 2,
    MAX_POOKA: 4,
    MIN_FYGAR: 1,
    MAX_FYGAR: 2
};

// Fire breath constants
const FIRE_BREATH = {
    WARNING_DURATION: 0.5,  // seconds of warning before fire
    GROW_DURATION: 0.4,     // seconds to grow from 1 to 2 blocks
    FULL_DURATION: 0.3,     // seconds at full 2 blocks
    SHRINK_DURATION: 0.3,   // seconds to shrink back to 1 block
    TOTAL_DURATION: 1.5,    // total duration (warning + grow + full + shrink)
    COOLDOWN: 3.0,          // seconds between fire attempts
    PROBABILITY: 0.3,       // 30% chance to fire when conditions met
    DISTANCE_CHECK: 3       // horizontal distance to check for player
};

// Game state
const game = {
    canvas: null,
    ctx: null,
    blockSize: 0,
    dirt: [],
    player: {
        x: 7, // Grid position
        y: 3, // Grid position
        renderX: 7, // Smooth rendering position
        renderY: 3, // Smooth rendering position
        targetX: 7, // Target grid position
        targetY: 3, // Target grid position
        direction: 'down', // up, down, left, right
        isMoving: false,
        speed: 2.5 // blocks per second (slightly faster than Pooka's 2.0)
    },
    enemies: [], // Array of enemy objects
    fires: [], // Array of active fire breath objects
    level: 1, // Current level
    lives: 3, // Player lives
    score: 0, // Player score
    gameState: 'playing', // 'playing', 'levelComplete', 'gameOver'
    roundPaused: true, // Pause at start of each round
    pauseTimer: 0, // Timer for pause duration
    pauseDuration: 2.0, // Pause for 2 seconds at round start
    kiroImage: null,
    imageLoaded: false,
    lastTime: 0,
    keys: {} // Track currently pressed keys
};

// Enemy system functions

/**
 * Creates an enemy object with all required properties
 * @param {number} id - Unique identifier for the enemy
 * @param {string} type - Enemy type ('pooka' or 'fygar')
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {object} Enemy object with all properties initialized
 */
function createEnemy(id, type, x, y) {
    const baseSpeed = type === ENEMY_TYPES.POOKA ? ENEMY_SPEEDS.POOKA_TUNNEL : ENEMY_SPEEDS.FYGAR_TUNNEL;

    return {
        id: id,
        type: type,
        x: x,
        y: y,
        renderX: x,
        renderY: y,
        spawnX: x, // Store original spawn position
        spawnY: y, // Store original spawn position
        direction: 'down',
        speed: baseSpeed,
        isInDirt: true,
        inflationStage: 0,
        aliveTime: 0,
        lastFireTime: 0,
        isFiring: false, // Track if Fygar is currently breathing fire
        targetX: x,
        targetY: y,
        isMoving: false
    };
}

/**
 * Spawns enemies based on the current level
 * @param {number} level - Current game level (1-based)
 */
function spawnEnemies(level) {
    game.enemies = []; // Clear existing enemies
    let enemyId = 0;

    // Calculate enemy counts based on level
    // Pooka: 2-4 enemies, Fygar: 1-2 enemies
    const pookaCount = Math.min(ENEMY_SPAWN_COUNTS.MIN_POOKA + Math.floor(level / 2), ENEMY_SPAWN_COUNTS.MAX_POOKA);
    const fygarCount = Math.min(ENEMY_SPAWN_COUNTS.MIN_FYGAR + Math.floor(level / 3), ENEMY_SPAWN_COUNTS.MAX_FYGAR);

    // Track occupied positions to avoid spawning enemies on top of each other or the player
    const occupiedPositions = new Set();
    occupiedPositions.add(`${game.player.x},${game.player.y}`);

    /**
     * Generates a random spawn position in the dirt grid
     * @returns {object} Object with x and y coordinates
     */
    function getRandomSpawnPosition() {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * GRID_WIDTH);
            const y = Math.floor(Math.random() * GRID_HEIGHT);
            const posKey = `${x},${y}`;

            // Check if position is not occupied and has some distance from player
            const distanceFromPlayer = Math.abs(x - game.player.x) + Math.abs(y - game.player.y);
            if (!occupiedPositions.has(posKey) && distanceFromPlayer > 3) {
                occupiedPositions.add(posKey);
                return { x, y };
            }

            attempts++;
        }

        // Fallback: return any unoccupied position
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const posKey = `${x},${y}`;
                if (!occupiedPositions.has(posKey)) {
                    occupiedPositions.add(posKey);
                    return { x, y };
                }
            }
        }

        // Last resort: return a random position
        return {
            x: Math.floor(Math.random() * GRID_WIDTH),
            y: Math.floor(Math.random() * GRID_HEIGHT)
        };
    }

    /**
     * Clears dirt to create a horizontal tunnel line
     * @param {number} x - Center X position
     * @param {number} y - Y position for the horizontal line
     * @param {number} length - Length of the tunnel (in blocks)
     */
    function clearHorizontalTunnel(x, y, length) {
        const startX = Math.max(0, x - Math.floor(length / 2));
        const endX = Math.min(GRID_WIDTH - 1, startX + length - 1);

        for (let clearX = startX; clearX <= endX; clearX++) {
            if (y >= 0 && y < GRID_HEIGHT) {
                game.dirt[y][clearX] = false;
            }
        }
    }

    /**
     * Clears dirt to create a vertical tunnel line
     * @param {number} x - X position for the vertical line
     * @param {number} y - Center Y position
     * @param {number} length - Length of the tunnel (in blocks)
     */
    function clearVerticalTunnel(x, y, length) {
        const startY = Math.max(0, y - Math.floor(length / 2));
        const endY = Math.min(GRID_HEIGHT - 1, startY + length - 1);

        for (let clearY = startY; clearY <= endY; clearY++) {
            if (x >= 0 && x < GRID_WIDTH) {
                game.dirt[clearY][x] = false;
            }
        }
    }

    // Spawn Pooka enemies with horizontal tunnels
    for (let i = 0; i < pookaCount; i++) {
        const pos = getRandomSpawnPosition();
        const enemy = createEnemy(enemyId++, ENEMY_TYPES.POOKA, pos.x, pos.y);
        game.enemies.push(enemy);

        // Create horizontal tunnel line (5-8 blocks long)
        const tunnelLength = 5 + Math.floor(Math.random() * 4);
        clearHorizontalTunnel(pos.x, pos.y, tunnelLength);
    }

    // Spawn Fygar enemies with vertical tunnels
    for (let i = 0; i < fygarCount; i++) {
        const pos = getRandomSpawnPosition();
        const enemy = createEnemy(enemyId++, ENEMY_TYPES.FYGAR, pos.x, pos.y);
        game.enemies.push(enemy);

        // Create vertical tunnel line (4-7 blocks long)
        const tunnelLength = 4 + Math.floor(Math.random() * 4);
        clearVerticalTunnel(pos.x, pos.y, tunnelLength);
    }

    console.log(`Spawned ${pookaCount} Pooka and ${fygarCount} Fygar for level ${level}`);
}

/**
 * Calculates the best direction for an enemy to move toward the player
 * Uses Manhattan distance to find the direction that reduces distance to player
 * @param {object} enemy - The enemy object
 * @returns {string} Direction to move ('up', 'down', 'left', 'right')
 */
function calculateEnemyPath(enemy) {
    const currentDistance = Math.abs(enemy.x - game.player.x) + Math.abs(enemy.y - game.player.y);

    // Calculate distances for each possible direction
    const directions = [
        { dir: 'up', x: enemy.x, y: enemy.y - 1 },
        { dir: 'down', x: enemy.x, y: enemy.y + 1 },
        { dir: 'left', x: enemy.x - 1, y: enemy.y },
        { dir: 'right', x: enemy.x + 1, y: enemy.y }
    ];

    // Filter out directions that go out of bounds
    const validDirections = directions.filter(d =>
        d.x >= 0 && d.x < GRID_WIDTH && d.y >= 0 && d.y < GRID_HEIGHT
    );

    // Calculate Manhattan distance for each valid direction
    const directionsWithDistance = validDirections.map(d => ({
        ...d,
        distance: Math.abs(d.x - game.player.x) + Math.abs(d.y - game.player.y)
    }));

    // Find the minimum distance
    const minDistance = Math.min(...directionsWithDistance.map(d => d.distance));

    // Get all directions with the minimum distance
    const bestDirections = directionsWithDistance.filter(d => d.distance === minDistance);

    // If multiple directions are equally good, choose randomly
    const chosenDirection = bestDirections[Math.floor(Math.random() * bestDirections.length)];

    return chosenDirection.dir;
}

/**
 * Updates a single enemy's position and state
 * @param {object} enemy - The enemy object to update
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function moveEnemy(enemy, deltaTime) {
    // Fygar cannot move while firing
    if (enemy.isFiring) {
        return;
    }

    // If already moving, continue interpolating
    if (enemy.isMoving) {
        // Adjust speed based on ghost mode (isInDirt is updated in updateEnemies)
        let currentSpeed = enemy.speed;
        if (enemy.isInDirt) {
            // In dirt: use slow ghost mode speed
            currentSpeed = ENEMY_SPEEDS.POOKA_DIRT; // Both enemy types move at 0.5 in dirt
        } else {
            // In tunnel: use normal speed based on enemy type
            currentSpeed = enemy.type === ENEMY_TYPES.POOKA ?
                ENEMY_SPEEDS.POOKA_TUNNEL : ENEMY_SPEEDS.FYGAR_TUNNEL;
        }

        const moveAmount = currentSpeed * deltaTime;

        // Move towards target
        const dx = enemy.targetX - enemy.renderX;
        const dy = enemy.targetY - enemy.renderY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= moveAmount) {
            // Reached target
            enemy.renderX = enemy.targetX;
            enemy.renderY = enemy.targetY;
            enemy.x = enemy.targetX;
            enemy.y = enemy.targetY;
            enemy.isMoving = false;
        } else {
            // Continue moving
            enemy.renderX += (dx / distance) * moveAmount;
            enemy.renderY += (dy / distance) * moveAmount;
        }
    }

    // Check for new movement (only if not currently moving)
    if (!enemy.isMoving) {
        // Calculate best direction toward player
        const newDirection = calculateEnemyPath(enemy);
        enemy.direction = newDirection;

        // Calculate new position based on direction
        let newX = enemy.x;
        let newY = enemy.y;

        switch (newDirection) {
            case 'up':
                newY--;
                break;
            case 'down':
                newY++;
                break;
            case 'left':
                newX--;
                break;
            case 'right':
                newX++;
                break;
        }

        // Check bounds (should already be valid from calculateEnemyPath, but double-check)
        if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
            enemy.targetX = newX;
            enemy.targetY = newY;
            enemy.isMoving = true;
        }
    }
}

/**
 * Triggers Fygar fire breath attack if conditions are met
 * @param {object} enemy - The Fygar enemy object
 * @param {number} currentTime - Current game time in seconds
 */
function triggerFygarFire(enemy, currentTime) {
    // Only Fygar can breathe fire
    if (enemy.type !== ENEMY_TYPES.FYGAR) {
        return;
    }

    // Cannot breathe fire while in dirt (ghost mode)
    // Check the actual dirt grid at the enemy's current position
    const isCurrentlyInDirt = enemy.y >= 0 && enemy.y < GRID_HEIGHT &&
                              enemy.x >= 0 && enemy.x < GRID_WIDTH &&
                              game.dirt[enemy.y][enemy.x];

    if (isCurrentlyInDirt) {
        console.log(`Fygar ${enemy.id} cannot fire - in dirt at (${enemy.x}, ${enemy.y})`);
        return;
    }

    // Check cooldown (must be at least 3 seconds since last fire)
    if (currentTime - enemy.lastFireTime < FIRE_BREATH.COOLDOWN) {
        return;
    }

    // Check if Fygar is within 3 blocks horizontally of player
    const horizontalDistance = Math.abs(enemy.x - game.player.x);
    const verticalDistance = Math.abs(enemy.y - game.player.y);

    if (horizontalDistance > FIRE_BREATH.DISTANCE_CHECK || verticalDistance !== 0) {
        return; // Not in horizontal line with player or too far
    }

    // Check if Fygar is facing the player direction
    const isFacingPlayer =
        (enemy.direction === 'left' && enemy.x > game.player.x) ||
        (enemy.direction === 'right' && enemy.x < game.player.x);

    if (!isFacingPlayer) {
        return;
    }

    // Apply 30% probability check
    if (Math.random() > FIRE_BREATH.PROBABILITY) {
        return;
    }

    // All conditions met - create fire projectile with warning phase
    const fire = {
        id: Date.now() + Math.random(), // Unique ID
        x: enemy.x,
        y: enemy.y,
        direction: enemy.direction,
        createdTime: currentTime,
        duration: FIRE_BREATH.TOTAL_DURATION
    };

    game.fires.push(fire);
    enemy.lastFireTime = currentTime;

    console.log(`Fygar ${enemy.id} preparing fire at (${fire.x}, ${fire.y}) facing ${fire.direction} - NOT in dirt`);
}

/**
 * Updates all enemies in the game
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateEnemies(deltaTime) {
    const currentTime = game.lastTime / 1000; // Convert to seconds

    game.enemies.forEach(enemy => {
        // Update alive time
        enemy.aliveTime += deltaTime;

        // Update isInDirt state FIRST (before any other checks)
        const isInDirt = enemy.y >= 0 && enemy.y < GRID_HEIGHT &&
                        enemy.x >= 0 && enemy.x < GRID_WIDTH &&
                        game.dirt[enemy.y][enemy.x];
        enemy.isInDirt = isInDirt;

        // Update Fygar firing state
        if (enemy.type === ENEMY_TYPES.FYGAR) {
            // Check if this Fygar has an active fire
            const activeFire = game.fires.find(fire =>
                fire.x === enemy.x && fire.y === enemy.y
            );

            if (activeFire) {
                const fireAge = currentTime - activeFire.createdTime;
                enemy.isFiring = fireAge < FIRE_BREATH.TOTAL_DURATION;
            } else {
                enemy.isFiring = false;
            }

            // Try to trigger fire breath (only if not in dirt)
            if (!enemy.isFiring) {
                triggerFygarFire(enemy, currentTime);
            }
        }

        // Move the enemy (will be blocked if firing)
        moveEnemy(enemy, deltaTime);
    });
}

/**
 * Updates fire breath projectiles and checks for expiration
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateFires(deltaTime) {
    const currentTime = game.lastTime / 1000; // Convert to seconds

    // Remove expired fires (after 1 second duration)
    game.fires = game.fires.filter(fire => {
        const age = currentTime - fire.createdTime;
        return age < fire.duration;
    });
}

/**
 * Calculates the current range of a fire breath based on its age
 * @param {number} age - Age of the fire in seconds
 * @returns {number} Current range in blocks (0 during warning, 1-2 during active)
 */
function getFireRange(age) {
    // Warning phase - no damage
    if (age < FIRE_BREATH.WARNING_DURATION) {
        return 0;
    }

    const activeAge = age - FIRE_BREATH.WARNING_DURATION;

    // Growing phase: 1 to 2 blocks
    if (activeAge < FIRE_BREATH.GROW_DURATION) {
        return 1; // Start at 1 block
    }

    // Full phase: 2 blocks
    if (activeAge < FIRE_BREATH.GROW_DURATION + FIRE_BREATH.FULL_DURATION) {
        return 2; // Peak at 2 blocks
    }

    // Shrinking phase: back to 1 block
    if (activeAge < FIRE_BREATH.GROW_DURATION + FIRE_BREATH.FULL_DURATION + FIRE_BREATH.SHRINK_DURATION) {
        return 1; // Shrink back to 1 block
    }

    return 0; // Fire expired
}

/**
 * Checks if the player collides with any fire breath
 * Fire grows from 1 to 2 blocks then shrinks back
 */
function checkFireCollision() {
    // Don't check collisions during pause
    if (game.roundPaused) {
        return;
    }

    const currentTime = game.lastTime / 1000;

    for (let i = 0; i < game.fires.length; i++) {
        const fire = game.fires[i];
        const age = currentTime - fire.createdTime;
        const currentRange = getFireRange(age);

        // No collision during warning phase
        if (currentRange === 0) {
            continue;
        }

        // Check if player is in the fire's path
        for (let distance = 1; distance <= currentRange; distance++) {
            let fireX = fire.x;
            let fireY = fire.y;

            // Calculate fire position based on direction
            switch (fire.direction) {
                case 'left':
                    fireX = fire.x - distance;
                    break;
                case 'right':
                    fireX = fire.x + distance;
                    break;
                case 'up':
                    fireY = fire.y - distance;
                    break;
                case 'down':
                    fireY = fire.y + distance;
                    break;
            }

            // Check if player is at this fire position
            if (game.player.x === fireX && game.player.y === fireY) {
                console.log('Player hit by fire!');
                loseLife();
                return; // Exit after first collision
            }
        }
    }
}

/**
 * Checks if the player collides with any enemy
 * Collision occurs when player and enemy occupy the same grid position
 */
function checkEnemyCollision() {
    // Don't check collisions during pause
    if (game.roundPaused) {
        return;
    }

    for (let i = 0; i < game.enemies.length; i++) {
        const enemy = game.enemies[i];

        // Check if player position matches enemy position (using grid coordinates)
        if (game.player.x === enemy.x && game.player.y === enemy.y) {
            loseLife();
            return; // Exit after first collision
        }
    }
}

/**
 * Handles player losing a life
 * Decrements lives, resets player position, and checks for game over
 */
function loseLife() {
    // Decrement lives counter
    game.lives--;

    console.log(`Life lost! Lives remaining: ${game.lives}`);

    // Check for game over condition
    if (game.lives <= 0) {
        game.gameState = 'gameOver';
        return;
    }

    // Reset player position to starting location
    game.player.x = 7;
    game.player.y = 3;
    game.player.renderX = 7;
    game.player.renderY = 3;
    game.player.targetX = 7;
    game.player.targetY = 3;

    // Reset player direction
    game.player.direction = 'down';
    game.player.isMoving = false;

    // Clear starting position
    game.dirt[game.player.y][game.player.x] = false;

    // Reset all enemies to their spawn positions
    game.enemies.forEach(enemy => {
        console.log(`Resetting enemy ${enemy.id} from (${enemy.x}, ${enemy.y}) to spawn (${enemy.spawnX}, ${enemy.spawnY})`);
        enemy.x = enemy.spawnX;
        enemy.y = enemy.spawnY;
        enemy.renderX = enemy.spawnX;
        enemy.renderY = enemy.spawnY;
        enemy.targetX = enemy.spawnX;
        enemy.targetY = enemy.spawnY;
        enemy.direction = 'down';
        enemy.isMoving = false;
        enemy.aliveTime = 0;
    });

    // Start round pause
    game.roundPaused = true;
    game.pauseTimer = 0;
    console.log('Round paused - enemies and player reset');
}

/**
 * Displays the game over screen with final score
 */
function showGameOver() {
    const ctx = game.ctx;
    const bs = game.blockSize;

    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    // Draw "GAME OVER" text
    ctx.fillStyle = '#FF3333';
    ctx.font = `bold ${bs * 1.5}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', game.canvas.width / 2, game.canvas.height / 2 - bs);

    // Draw final score
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${bs * 0.8}px 'Courier New', monospace`;
    ctx.fillText(`Final Score: ${game.score}`, game.canvas.width / 2, game.canvas.height / 2 + bs * 0.5);

    // Draw restart instruction
    ctx.fillStyle = '#790ECB';
    ctx.font = `${bs * 0.6}px 'Courier New', monospace`;
    ctx.fillText('Press R to Restart', game.canvas.width / 2, game.canvas.height / 2 + bs * 2);

    // Reset text alignment
    ctx.textAlign = 'left';
}

/**
 * Restarts the game by resetting all state
 */
function restartGame() {
    console.log('Restarting game...');

    // Reset game state
    game.lives = 3;
    game.score = 0;
    game.level = 1;
    game.gameState = 'playing';
    game.roundPaused = true;
    game.pauseTimer = 0;

    // Reset player position
    game.player.x = 7;
    game.player.y = 3;
    game.player.renderX = 7;
    game.player.renderY = 3;
    game.player.targetX = 7;
    game.player.targetY = 3;
    game.player.direction = 'down';
    game.player.isMoving = false;

    // Reset dirt grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            game.dirt[y][x] = true;
        }
    }

    // Clear starting position
    game.dirt[game.player.y][game.player.x] = false;

    // Respawn enemies for level 1
    spawnEnemies(game.level);
}

// Initialize the game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');

    // Load Kiro image
    game.kiroImage = new Image();
    game.kiroImage.onload = () => {
        game.imageLoaded = true;
    };
    game.kiroImage.onerror = () => {
        console.log('Kiro image not found, using placeholder');
        game.imageLoaded = false;
    };
    game.kiroImage.src = 'kiro-logo.png';

    // Initialize dirt grid (true = dirt exists, false = dug out)
    for (let y = 0; y < GRID_HEIGHT; y++) {
        game.dirt[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            game.dirt[y][x] = true;
        }
    }

    // Clear starting position
    game.dirt[game.player.y][game.player.x] = false;

    // Spawn enemies for level 1
    spawnEnemies(game.level);

    // Setup keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Start game loop
    game.lastTime = performance.now();
    gameLoop();
}

// Resize canvas to fit window while maintaining aspect ratio
function resizeCanvas() {
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;

    const aspectRatio = GRID_WIDTH / TOTAL_HEIGHT;

    let canvasWidth, canvasHeight;

    if (containerWidth / containerHeight > aspectRatio) {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * aspectRatio;
    } else {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / aspectRatio;
    }

    game.canvas.width = canvasWidth;
    game.canvas.height = canvasHeight;
    game.blockSize = canvasWidth / GRID_WIDTH;
}

// Handle keyboard input
function handleKeyDown(e) {
    const key = e.key.toLowerCase();

    // Handle restart key (R) when game is over
    if (key === 'r' && game.gameState === 'gameOver') {
        restartGame();
        e.preventDefault();
        return;
    }

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        game.keys[key] = true;
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    game.keys[key] = false;
}

function updatePlayerMovement(deltaTime) {
    // If already moving, continue interpolating
    if (game.player.isMoving) {
        const moveAmount = game.player.speed * deltaTime;

        // Move towards target
        const dx = game.player.targetX - game.player.renderX;
        const dy = game.player.targetY - game.player.renderY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= moveAmount) {
            // Reached target
            game.player.renderX = game.player.targetX;
            game.player.renderY = game.player.targetY;
            game.player.x = game.player.targetX;
            game.player.y = game.player.targetY;
            game.player.isMoving = false;
        } else {
            // Continue moving
            game.player.renderX += (dx / distance) * moveAmount;
            game.player.renderY += (dy / distance) * moveAmount;
        }
    }

    // Check for new movement input (only if not currently moving)
    if (!game.player.isMoving) {
        let newX = game.player.x;
        let newY = game.player.y;
        let newDirection = game.player.direction;
        let hasInput = false;

        if (game.keys['arrowup'] || game.keys['w']) {
            newY--;
            newDirection = 'up';
            hasInput = true;
        } else if (game.keys['arrowdown'] || game.keys['s']) {
            newY++;
            newDirection = 'down';
            hasInput = true;
        } else if (game.keys['arrowleft'] || game.keys['a']) {
            newX--;
            newDirection = 'left';
            hasInput = true;
        } else if (game.keys['arrowright'] || game.keys['d']) {
            newX++;
            newDirection = 'right';
            hasInput = true;
        }

        if (hasInput) {
            game.player.direction = newDirection;

            // Check bounds
            if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
                game.player.targetX = newX;
                game.player.targetY = newY;
                game.player.isMoving = true;

                // Dig out dirt at target position
                game.dirt[newY][newX] = false;
            }
        }
    }
}

// Main game loop
function gameLoop(currentTime) {
    // Handle first frame where currentTime might be undefined
    if (!currentTime) {
        currentTime = performance.now();
    }

    const deltaTime = (currentTime - game.lastTime) / 1000; // Convert to seconds
    game.lastTime = currentTime;

    // Only update game logic if playing
    if (game.gameState === 'playing') {
        // Handle round pause
        if (game.roundPaused) {
            game.pauseTimer += deltaTime;
            if (game.pauseTimer >= game.pauseDuration) {
                game.roundPaused = false;
                game.pauseTimer = 0;
                console.log('Pause ended - gameplay resuming');
            }
        } else {
            // Normal gameplay - only update when not paused
            updatePlayerMovement(deltaTime);
            updateEnemies(deltaTime);
            updateFires(deltaTime);
            checkEnemyCollision();
            checkFireCollision();
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Draw everything
function draw() {
    const ctx = game.ctx;
    const bs = game.blockSize;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

    // Draw sky area
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GRID_WIDTH * bs, SKY_HEIGHT * bs);

    // Draw dirt grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (game.dirt[y][x]) {
                // Draw dirt block
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x * bs, (y + SKY_HEIGHT) * bs, bs, bs);

                // Add texture
                ctx.fillStyle = '#654321';
                ctx.fillRect(x * bs + bs * 0.2, (y + SKY_HEIGHT) * bs + bs * 0.2, bs * 0.3, bs * 0.3);
                ctx.fillRect(x * bs + bs * 0.6, (y + SKY_HEIGHT) * bs + bs * 0.5, bs * 0.25, bs * 0.25);
            } else {
                // Draw tunnel (empty space)
                ctx.fillStyle = '#000000';
                ctx.fillRect(x * bs, (y + SKY_HEIGHT) * bs, bs, bs);
            }
        }
    }

    // Draw enemies
    game.enemies.forEach(enemy => {
        const enemyScreenX = enemy.renderX * bs;
        const enemyScreenY = (enemy.renderY + SKY_HEIGHT) * bs;

        // Calculate opacity based on ghost mode (in dirt vs in tunnel)
        // Use render position to check current grid cell
        const gridX = Math.floor(enemy.renderX);
        const gridY = Math.floor(enemy.renderY);
        const isInDirt = gridY >= 0 && gridY < GRID_HEIGHT &&
                         gridX >= 0 && gridX < GRID_WIDTH &&
                         game.dirt[gridY][gridX];
        const opacity = isInDirt ? 0.5 : 1.0;

        // Calculate size based on inflation stage
        const inflationScale = 1 + (enemy.inflationStage * 0.25);
        const enemySize = bs * inflationScale;
        const offset = (bs - enemySize) / 2; // Center the scaled sprite

        ctx.save();
        ctx.globalAlpha = opacity;

        if (enemy.type === ENEMY_TYPES.POOKA) {
            // Draw Pooka as red circle with simple face
            ctx.fillStyle = '#FF3333';
            ctx.beginPath();
            ctx.arc(
                enemyScreenX + bs / 2,
                enemyScreenY + bs / 2,
                enemySize / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Draw eyes
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(
                enemyScreenX + bs / 2 - enemySize * 0.15,
                enemyScreenY + bs / 2 - enemySize * 0.1,
                enemySize * 0.1,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                enemyScreenX + bs / 2 + enemySize * 0.15,
                enemyScreenY + bs / 2 - enemySize * 0.1,
                enemySize * 0.1,
                0,
                Math.PI * 2
            );
            ctx.fill();

            // Draw pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
                enemyScreenX + bs / 2 - enemySize * 0.15,
                enemyScreenY + bs / 2 - enemySize * 0.1,
                enemySize * 0.05,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.beginPath();
            ctx.arc(
                enemyScreenX + bs / 2 + enemySize * 0.15,
                enemyScreenY + bs / 2 - enemySize * 0.1,
                enemySize * 0.05,
                0,
                Math.PI * 2
            );
            ctx.fill();

        } else if (enemy.type === ENEMY_TYPES.FYGAR) {
            // Draw Fygar as green dragon shape
            ctx.fillStyle = '#33FF33';

            // Body (main rectangle)
            ctx.fillRect(
                enemyScreenX - offset + enemySize * 0.2,
                enemyScreenY - offset + enemySize * 0.3,
                enemySize * 0.6,
                enemySize * 0.4
            );

            // Head (positioned based on direction)
            const headSize = enemySize * 0.35;
            let headX = enemyScreenX + bs / 2;
            let headY = enemyScreenY + bs / 2;

            switch (enemy.direction) {
                case 'left':
                    headX -= enemySize * 0.3;
                    break;
                case 'right':
                    headX += enemySize * 0.3;
                    break;
                case 'up':
                    headY -= enemySize * 0.3;
                    break;
                case 'down':
                    headY += enemySize * 0.3;
                    break;
            }

            ctx.beginPath();
            ctx.arc(headX, headY, headSize, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(headX - headSize * 0.3, headY - headSize * 0.2, headSize * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(headX + headSize * 0.3, headY - headSize * 0.2, headSize * 0.15, 0, Math.PI * 2);
            ctx.fill();

            // Spikes on back
            ctx.fillStyle = '#00CC00';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(enemyScreenX - offset + enemySize * (0.3 + i * 0.2), enemyScreenY - offset + enemySize * 0.3);
                ctx.lineTo(enemyScreenX - offset + enemySize * (0.35 + i * 0.2), enemyScreenY - offset + enemySize * 0.1);
                ctx.lineTo(enemyScreenX - offset + enemySize * (0.4 + i * 0.2), enemyScreenY - offset + enemySize * 0.3);
                ctx.fill();
            }
        }

        ctx.restore();
    });

    // Draw fire breath effects
    game.fires.forEach(fire => {
        const currentTime = game.lastTime / 1000;
        const age = currentTime - fire.createdTime;
        const animationPhase = (age * 10) % 1; // Animate 10 times per second
        const currentRange = getFireRange(age);

        // Warning phase - show pulsing indicator
        if (age < FIRE_BREATH.WARNING_DURATION) {
            const warningProgress = age / FIRE_BREATH.WARNING_DURATION;
            const pulseIntensity = Math.sin(warningProgress * Math.PI * 6) * 0.5 + 0.5; // Fast pulse

            // Draw warning on Fygar's position
            const fygarScreenX = fire.x * bs;
            const fygarScreenY = (fire.y + SKY_HEIGHT) * bs;

            ctx.save();
            ctx.globalAlpha = 0.6 + pulseIntensity * 0.4;
            ctx.fillStyle = '#FFFF00';

            // Draw exclamation mark or warning symbol
            const symbolSize = bs * 0.3;
            const symbolX = fygarScreenX + bs / 2;
            const symbolY = fygarScreenY + bs * 0.2;

            // Exclamation mark body
            ctx.fillRect(symbolX - symbolSize * 0.15, symbolY, symbolSize * 0.3, symbolSize * 0.6);
            // Exclamation mark dot
            ctx.fillRect(symbolX - symbolSize * 0.15, symbolY + symbolSize * 0.75, symbolSize * 0.3, symbolSize * 0.2);

            ctx.restore();
            return; // Don't draw fire during warning
        }

        // Draw fire extending based on current range
        for (let distance = 1; distance <= currentRange; distance++) {
            let fireX = fire.x;
            let fireY = fire.y;

            // Calculate fire position based on direction
            switch (fire.direction) {
                case 'left':
                    fireX = fire.x - distance;
                    break;
                case 'right':
                    fireX = fire.x + distance;
                    break;
                case 'up':
                    fireY = fire.y - distance;
                    break;
                case 'down':
                    fireY = fire.y + distance;
                    break;
            }

            // Check bounds
            if (fireX < 0 || fireX >= GRID_WIDTH || fireY < 0 || fireY >= GRID_HEIGHT) {
                continue;
            }

            const fireScreenX = fireX * bs;
            const fireScreenY = (fireY + SKY_HEIGHT) * bs;

            // Animated flame effect with alternating colors
            const isOrange = (distance + Math.floor(animationPhase * 2)) % 2 === 0;
            ctx.fillStyle = isOrange ? '#FF6600' : '#FF3300';

            // Draw flame shape (slightly smaller than block for visual effect)
            const flameSize = bs * (0.7 + animationPhase * 0.2); // Pulsing effect
            const offset = (bs - flameSize) / 2;

            ctx.save();
            ctx.globalAlpha = 0.9;

            // Main flame body
            ctx.fillRect(
                fireScreenX + offset,
                fireScreenY + offset,
                flameSize,
                flameSize
            );

            // Add bright center
            ctx.fillStyle = '#FFFF00';
            ctx.globalAlpha = 0.6;
            const centerSize = flameSize * 0.4;
            const centerOffset = (bs - centerSize) / 2;
            ctx.fillRect(
                fireScreenX + centerOffset,
                fireScreenY + centerOffset,
                centerSize,
                centerSize
            );

            ctx.restore();
        }
    });

    // Draw player (Kiro) using smooth render position
    const playerScreenY = (game.player.renderY + SKY_HEIGHT) * bs;
    const playerScreenX = game.player.renderX * bs;

    if (game.imageLoaded) {
        ctx.drawImage(game.kiroImage, playerScreenX, playerScreenY, bs, bs);
    } else {
        // Fallback: draw simple character
        ctx.fillStyle = '#790ECB';
        ctx.fillRect(playerScreenX + bs * 0.2, playerScreenY + bs * 0.2, bs * 0.6, bs * 0.6);

        // Draw direction indicator
        ctx.fillStyle = '#FFFFFF';
        switch(game.player.direction) {
            case 'up':
                ctx.fillRect(playerScreenX + bs * 0.4, playerScreenY + bs * 0.1, bs * 0.2, bs * 0.3);
                break;
            case 'down':
                ctx.fillRect(playerScreenX + bs * 0.4, playerScreenY + bs * 0.6, bs * 0.2, bs * 0.3);
                break;
            case 'left':
                ctx.fillRect(playerScreenX + bs * 0.1, playerScreenY + bs * 0.4, bs * 0.3, bs * 0.2);
                break;
            case 'right':
                ctx.fillRect(playerScreenX + bs * 0.6, playerScreenY + bs * 0.4, bs * 0.3, bs * 0.2);
                break;
        }
    }

    // Draw status bar
    const statusY = (SKY_HEIGHT + GRID_HEIGHT) * bs;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, statusY, GRID_WIDTH * bs, STATUS_HEIGHT * bs);

    // Draw status text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${bs * 0.4}px 'Courier New', monospace`;
    ctx.fillText('DIG IT KIRO', bs * 0.5, statusY + bs * 0.6);

    // Draw lives
    ctx.fillText(`Lives: ${game.lives}`, bs * 6, statusY + bs * 0.6);

    // Draw pause indicator if round is paused
    if (game.roundPaused && game.gameState === 'playing') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

        ctx.fillStyle = '#790ECB';
        ctx.font = `bold ${bs * 1.2}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('READY!', game.canvas.width / 2, game.canvas.height / 2);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${bs * 0.6}px 'Courier New', monospace`;
        const timeLeft = Math.ceil(game.pauseDuration - game.pauseTimer);
        ctx.fillText(`${timeLeft}`, game.canvas.width / 2, game.canvas.height / 2 + bs * 1.5);

        ctx.textAlign = 'left';
    }

    // Draw game over screen if game is over
    if (game.gameState === 'gameOver') {
        showGameOver();
    }
}

// Start the game when page loads
window.addEventListener('load', init);
