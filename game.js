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

// Pump constants
const PUMP_CONSTANTS = {
    INFLATION_TIME: 0.5,    // seconds per inflation stage
    DEFLATION_TIME: 0.5,    // seconds per deflation stage (same as inflation)
    MAX_INFLATION: 4,       // stages before enemy pops
    DEFEAT_POINTS: 200      // points for defeating enemy with pump
};

// Rock constants
const ROCK_CONSTANTS = {
    MIN_ROCKS: 3,           // minimum rocks per level
    MAX_ROCKS: 5,           // maximum rocks per level
    WOBBLE_DURATION: 1.0,   // seconds of wobble before falling (increased from 0.5)
    FALL_SPEED: 8.0,        // blocks per second when falling
    CRUSH_POINTS: 500,      // base points for crushing enemy with rock
    CRUSH_MULTIPLIER: 1     // multiplier for multiple crushes (applied per enemy)
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
    pump: null, // Current pump state (null or {active, targetEnemy, inflationProgress, keyHeld, timer})
    rocks: [], // Array of rock objects
    particles: [], // Array of particle objects
    level: 1, // Current level
    lives: 3, // Player lives
    score: 0, // Player score
    gameState: 'playing', // 'playing', 'levelComplete', 'gameOver'
    levelTransitionTimer: 0, // Timer for level transition
    roundPaused: true, // Pause at start of each round
    pauseTimer: 0, // Timer for pause duration
    pauseDuration: 2.0, // Pause for 2 seconds at round start
    screenShake: {
        active: false,
        intensity: 0,
        duration: 0,
        timer: 0,
        offsetX: 0,
        offsetY: 0
    }, // Screen shake effect state
    damageFlash: {
        active: false,
        duration: 0.3, // Flash duration in seconds
        timer: 0
    }, // Damage flash effect state
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
        speedBoosted: false, // Track if enemy has received aggression speed boost
        lastFireTime: 0,
        isFiring: false, // Track if Fygar is currently breathing fire
        targetX: x,
        targetY: y,
        isMoving: false,
        ghostTarget: null // Target position when in ghost mode (moving through dirt)
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
    // Total enemies increase by 1 per level, max 8 total
    // Start with 3 enemies (2 Pooka + 1 Fygar), increase to max 8
    const totalEnemies = Math.min(3 + (level - 1), 8);

    // Distribute between Pooka and Fygar (roughly 2:1 ratio)
    const fygarCount = Math.min(Math.max(1, Math.floor(totalEnemies / 3)), ENEMY_SPAWN_COUNTS.MAX_FYGAR);
    const pookaCount = totalEnemies - fygarCount;

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
 * Spawns rocks at random positions in the dirt grid
 * @param {number} level - Current game level (1-based)
 */
function spawnRocks(level) {
    game.rocks = []; // Clear existing rocks
    let rockId = 0;

    // Calculate rock count (3-5 rocks)
    const rockCount = ROCK_CONSTANTS.MIN_ROCKS + Math.floor(Math.random() * (ROCK_CONSTANTS.MAX_ROCKS - ROCK_CONSTANTS.MIN_ROCKS + 1));

    // Track occupied positions to avoid spawning rocks on player or enemies
    const occupiedPositions = new Set();
    occupiedPositions.add(`${game.player.x},${game.player.y}`);

    game.enemies.forEach(enemy => {
        occupiedPositions.add(`${enemy.x},${enemy.y}`);
    });

    /**
     * Generates a random spawn position for a rock
     * @returns {object} Object with x and y coordinates
     */
    function getRandomRockPosition() {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * GRID_WIDTH);
            const y = Math.floor(Math.random() * GRID_HEIGHT);
            const posKey = `${x},${y}`;

            // Check if position is not occupied and has dirt BELOW it (rocks sit on top of dirt)
            // Also ensure we're not at the bottom (need space below for dirt)
            const hasDirtBelow = y < GRID_HEIGHT - 1 && game.dirt[y + 1][x];
            if (!occupiedPositions.has(posKey) && hasDirtBelow) {
                occupiedPositions.add(posKey);
                return { x, y };
            }

            attempts++;
        }

        // Fallback: return any unoccupied position with dirt below
        for (let y = 0; y < GRID_HEIGHT - 1; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const posKey = `${x},${y}`;
                if (!occupiedPositions.has(posKey) && game.dirt[y + 1][x]) {
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

    // Spawn rocks
    for (let i = 0; i < rockCount; i++) {
        const pos = getRandomRockPosition();
        const rock = {
            id: rockId++,
            x: pos.x,
            y: pos.y,
            state: 'stable', // 'stable', 'wobbling', 'falling'
            wobbleTimer: 0,
            fallSpeed: 0
        };
        game.rocks.push(rock);
        console.log(`🪨 Spawned rock ${rock.id} at (${rock.x}, ${rock.y}) - dirt: ${game.dirt[rock.y][rock.x]}`);
    }

    console.log(`✅ Spawned ${rockCount} rocks for level ${level}`);
}

/**
 * Finds a tunnel position (no dirt) close to the player
 * @param {object} enemy - The enemy object
 * @returns {object} Object with x and y coordinates, or null if no tunnel found
 */
function findNearbyTunnelToPlayer(enemy) {
    // Search in expanding radius around player
    const maxRadius = 5;

    for (let radius = 1; radius <= maxRadius; radius++) {
        const candidates = [];

        // Check all positions at this radius from player
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Only check positions roughly at this radius (Manhattan distance)
                if (Math.abs(dx) + Math.abs(dy) !== radius) continue;

                const checkX = game.player.x + dx;
                const checkY = game.player.y + dy;

                // Check bounds
                if (checkX < 0 || checkX >= GRID_WIDTH || checkY < 0 || checkY >= GRID_HEIGHT) {
                    continue;
                }

                // Check if this is a tunnel (no dirt)
                if (!game.dirt[checkY][checkX]) {
                    candidates.push({ x: checkX, y: checkY });
                }
            }
        }

        // If we found tunnel positions at this radius, pick the closest one to enemy
        if (candidates.length > 0) {
            candidates.sort((a, b) => {
                const distA = Math.abs(a.x - enemy.x) + Math.abs(a.y - enemy.y);
                const distB = Math.abs(b.x - enemy.x) + Math.abs(b.y - enemy.y);
                return distA - distB;
            });
            return candidates[0];
        }
    }

    // Fallback: return player position if no tunnel found
    return { x: game.player.x, y: game.player.y };
}

/**
 * Estimates the time to reach the player via tunnel pathfinding
 * Uses a simple BFS to find tunnel path length
 * @param {object} enemy - The enemy object
 * @returns {number} Estimated time in seconds, or Infinity if no path
 */
function estimateTunnelPathTime(enemy) {
    // Simple BFS to find shortest tunnel path to player
    const queue = [{ x: enemy.x, y: enemy.y, distance: 0 }];
    const visited = new Set();
    visited.add(`${enemy.x},${enemy.y}`);

    const tunnelSpeed = enemy.type === ENEMY_TYPES.POOKA ?
        ENEMY_SPEEDS.POOKA_TUNNEL : ENEMY_SPEEDS.FYGAR_TUNNEL;

    while (queue.length > 0) {
        const current = queue.shift();

        // Check if we reached the player
        if (current.x === game.player.x && current.y === game.player.y) {
            return current.distance / tunnelSpeed;
        }

        // Stop searching if path is too long (optimization)
        if (current.distance > 20) {
            break;
        }

        // Check all 4 directions
        const directions = [
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 },
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y }
        ];

        for (const next of directions) {
            // Check bounds
            if (next.x < 0 || next.x >= GRID_WIDTH || next.y < 0 || next.y >= GRID_HEIGHT) {
                continue;
            }

            const key = `${next.x},${next.y}`;

            // Skip if already visited
            if (visited.has(key)) {
                continue;
            }

            // Only follow tunnels (no dirt)
            if (!game.dirt[next.y][next.x]) {
                visited.add(key);
                queue.push({ x: next.x, y: next.y, distance: current.distance + 1 });
            }
        }
    }

    return Infinity; // No tunnel path found
}

/**
 * Estimates the time to reach the player by going through dirt
 * Uses straight-line distance with dirt speed
 * @param {object} enemy - The enemy object
 * @returns {number} Estimated time in seconds
 */
function estimateDirtPathTime(enemy) {
    // Straight-line distance (diagonal movement allowed in dirt)
    const dx = Math.abs(enemy.x - game.player.x);
    const dy = Math.abs(enemy.y - game.player.y);
    const straightLineDistance = Math.max(dx, dy); // Diagonal distance

    // Use dirt speed (slower)
    const dirtSpeed = ENEMY_SPEEDS.POOKA_DIRT; // Both types move at 0.5 in dirt

    return straightLineDistance / dirtSpeed;
}

/**
 * Decides whether enemy should enter ghost mode (go through dirt)
 * Compares tunnel path time vs dirt path time with a preference for tunnels
 * @param {object} enemy - The enemy object
 * @returns {boolean} True if should go through dirt, false if should follow tunnels
 */
function shouldEnterGhostMode(enemy) {
    const tunnelTime = estimateTunnelPathTime(enemy);
    const dirtTime = estimateDirtPathTime(enemy);

    // Prefer tunnels: only go through dirt if it's significantly faster
    // Dirt path must be at least 40% faster to justify going ghost
    const GHOST_MODE_THRESHOLD = 0.6; // Dirt time must be <= 60% of tunnel time

    const shouldGhost = dirtTime < tunnelTime * GHOST_MODE_THRESHOLD;

    if (shouldGhost && !enemy.isInDirt) {
        console.log(`Enemy ${enemy.id}: Tunnel=${tunnelTime.toFixed(1)}s, Dirt=${dirtTime.toFixed(1)}s -> Going ghost`);
    }

    return shouldGhost;
}

/**
 * Calculates the best direction for an enemy to move toward the player
 * Intelligently chooses between tunnel pathfinding and ghost mode (through dirt)
 * In tunnels: moves in 4 directions following tunnel paths
 * In dirt (ghost mode): moves diagonally straight toward ghostTarget
 * @param {object} enemy - The enemy object
 * @returns {string} Direction to move ('up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right')
 */
function calculateEnemyPath(enemy) {
    // Check if enemy is currently in dirt
    const isInDirt = enemy.y >= 0 && enemy.y < GRID_HEIGHT &&
                     enemy.x >= 0 && enemy.x < GRID_WIDTH &&
                     game.dirt[enemy.y][enemy.x];

    // If in tunnel, decide whether to enter ghost mode
    if (!isInDirt && !enemy.ghostTarget) {
        // Check if going through dirt would be significantly faster
        if (shouldEnterGhostMode(enemy)) {
            // Decide to enter ghost mode - pick a direction into dirt
            const directions = [
                { dir: 'up', x: enemy.x, y: enemy.y - 1 },
                { dir: 'down', x: enemy.x, y: enemy.y + 1 },
                { dir: 'left', x: enemy.x - 1, y: enemy.y },
                { dir: 'right', x: enemy.x + 1, y: enemy.y }
            ];

            // Find directions that lead into dirt
            const dirtDirections = directions.filter(d => {
                if (d.x < 0 || d.x >= GRID_WIDTH || d.y < 0 || d.y >= GRID_HEIGHT) {
                    return false;
                }
                return game.dirt[d.y][d.x]; // True if there's dirt
            });

            // If there are dirt directions, pick the one closest to player
            if (dirtDirections.length > 0) {
                dirtDirections.sort((a, b) => {
                    const distA = Math.abs(a.x - game.player.x) + Math.abs(a.y - game.player.y);
                    const distB = Math.abs(b.x - game.player.x) + Math.abs(b.y - game.player.y);
                    return distA - distB;
                });

                // Set ghost target before entering dirt
                enemy.ghostTarget = findNearbyTunnelToPlayer(enemy);
                console.log(`Enemy ${enemy.id} choosing to enter ghost mode via ${dirtDirections[0].dir}`);
                return dirtDirections[0].dir;
            }
        }
    }

    // Ghost mode logic: already in dirt or has a ghost target
    if (enemy.ghostTarget) {
        // IMPORTANT: If enemy hit a tunnel while in ghost mode, cancel ghost path immediately
        if (!isInDirt) {
            console.log(`Enemy ${enemy.id} hit tunnel while ghosting - canceling ghost path and re-evaluating`);
            enemy.ghostTarget = null;
            // Fall through to tunnel pathfinding to re-evaluate
        } else {
            // Still in dirt - continue toward ghost target
            // If no ghostTarget set, find one
            if (!enemy.ghostTarget) {
                enemy.ghostTarget = findNearbyTunnelToPlayer(enemy);
                console.log(`Enemy ${enemy.id} in ghost mode, target: (${enemy.ghostTarget.x}, ${enemy.ghostTarget.y})`);
            }

            // Check if we've reached the ghost target
            if (enemy.x === enemy.ghostTarget.x && enemy.y === enemy.ghostTarget.y) {
                enemy.ghostTarget = null;
                console.log(`Enemy ${enemy.id} reached ghost target, returning to tunnel mode`);
                // Fall through to tunnel pathfinding
            } else {
                // Move toward ghostTarget
                const dx = enemy.ghostTarget.x - enemy.x;
                const dy = enemy.ghostTarget.y - enemy.y;

                // Determine diagonal or cardinal direction
                if (dx !== 0 && dy !== 0) {
                    // Diagonal movement
                    const horizontal = dx > 0 ? 'right' : 'left';
                    const vertical = dy > 0 ? 'down' : 'up';
                    return `${vertical}-${horizontal}`;
                } else if (dx !== 0) {
                    return dx > 0 ? 'right' : 'left';
                } else if (dy !== 0) {
                    return dy > 0 ? 'down' : 'up';
                }
            }
        }
    }

    // Tunnel pathfinding: follow tunnels toward player
    // Calculate distances for each possible direction (4-directional in tunnels)
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

    // Enemy cannot move while being pumped
    if (game.pump && game.pump.active && game.pump.targetEnemy === enemy.id) {
        return;
    }

    // Enemy cannot move while deflating (inflated at all)
    if (enemy.inflationStage > 0) {
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
            case 'up-left':
                newY--;
                newX--;
                break;
            case 'up-right':
                newY--;
                newX++;
                break;
            case 'down-left':
                newY++;
                newX--;
                break;
            case 'down-right':
                newY++;
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

    // Cannot breathe fire while being pumped
    if (game.pump && game.pump.active && game.pump.targetEnemy === enemy.id) {
        return;
    }

    // Cannot breathe fire while in dirt (ghost mode)
    // Check the actual dirt grid at the enemy's current position
    const isCurrentlyInDirt = enemy.y >= 0 && enemy.y < GRID_HEIGHT &&
                              enemy.x >= 0 && enemy.x < GRID_WIDTH &&
                              game.dirt[enemy.y][enemy.x];

    if (isCurrentlyInDirt) {
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

    // All conditions met - create fire projectile with warning phase and mark enemy as firing
    const fire = {
        id: Date.now() + Math.random(), // Unique ID
        x: enemy.x,
        y: enemy.y,
        direction: enemy.direction,
        createdTime: currentTime,
        duration: FIRE_BREATH.TOTAL_DURATION,
        enemyId: enemy.id // Link fire to enemy
    };

    game.fires.push(fire);
    enemy.lastFireTime = currentTime;
    enemy.isFiring = true; // Immediately set firing state
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

        // Apply speed boost after 30 seconds (20% increase)
        if (enemy.aliveTime > 30 && !enemy.speedBoosted) {
            const baseSpeed = enemy.type === ENEMY_TYPES.POOKA ?
                ENEMY_SPEEDS.POOKA_TUNNEL : ENEMY_SPEEDS.FYGAR_TUNNEL;

            // Apply level scaling first, then aggression boost
            const levelMultiplier = Math.min(1 + (game.level - 1) * 0.1, 2.0);
            enemy.speed = baseSpeed * levelMultiplier * 1.2;
            enemy.speedBoosted = true;

            console.log(`⚡ Enemy ${enemy.id} (${enemy.type}) became aggressive! Speed boosted to ${enemy.speed.toFixed(2)} blocks/sec`);
        }

        // Update isInDirt state FIRST (before any other checks)
        const isInDirt = enemy.y >= 0 && enemy.y < GRID_HEIGHT &&
                        enemy.x >= 0 && enemy.x < GRID_WIDTH &&
                        game.dirt[enemy.y][enemy.x];
        enemy.isInDirt = isInDirt;

        // Handle deflation when not being actively pumped
        const isBeingPumped = game.pump && game.pump.active && game.pump.targetEnemy === enemy.id;
        if (!isBeingPumped && enemy.inflationStage > 0) {
            // Initialize deflation timer if not present
            if (!enemy.deflationTimer) {
                enemy.deflationTimer = 0;
            }

            enemy.deflationTimer += deltaTime;

            // Deflate one stage every DEFLATION_TIME seconds
            if (enemy.deflationTimer >= PUMP_CONSTANTS.DEFLATION_TIME) {
                enemy.deflationTimer = 0;
                enemy.inflationStage--;
                console.log(`Enemy ${enemy.id} deflated to stage ${enemy.inflationStage}`);

                if (enemy.inflationStage <= 0) {
                    enemy.inflationStage = 0;
                    enemy.deflationTimer = 0;
                }
            }
        } else if (isBeingPumped) {
            // Reset deflation timer while being pumped
            enemy.deflationTimer = 0;
        }

        // Update Fygar firing state
        if (enemy.type === ENEMY_TYPES.FYGAR) {
            // Check if this Fygar has an active fire linked to it
            const activeFire = game.fires.find(fire => fire.enemyId === enemy.id);

            if (activeFire) {
                const fireAge = currentTime - activeFire.createdTime;
                enemy.isFiring = fireAge < FIRE_BREATH.TOTAL_DURATION;
            } else {
                enemy.isFiring = false;
            }

            // Try to trigger fire breath (only if not already firing and not in dirt)
            if (!enemy.isFiring && !enemy.isInDirt) {
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

// Pump mechanic functions

/**
 * Fires a pump projectile in the player's facing direction
 * Checks for enemy collision and attaches pump if hit (checks up to 2 blocks away)
 */
function firePump() {
    // Don't fire pump during pause or if pump already active
    if (game.roundPaused || (game.pump && game.pump.active)) {
        console.log('Cannot fire pump - paused or already active');
        return;
    }

    console.log(`Firing pump from (${game.player.x}, ${game.player.y}) facing ${game.player.direction}`);

    // Check for enemies in the facing direction (up to 2 blocks away)
    let hitEnemy = null;
    let hitDistance = 0;

    for (let distance = 1; distance <= 2; distance++) {
        let checkX = game.player.x;
        let checkY = game.player.y;

        switch (game.player.direction) {
            case 'up':
                checkY -= distance;
                break;
            case 'down':
                checkY += distance;
                break;
            case 'left':
                checkX -= distance;
                break;
            case 'right':
                checkX += distance;
                break;
        }

        // Check bounds
        if (checkX < 0 || checkX >= GRID_WIDTH || checkY < 0 || checkY >= GRID_HEIGHT) {
            break; // Out of bounds, stop checking
        }

        // Check for enemy at this position
        const enemy = game.enemies.find(e => e.x === checkX && e.y === checkY);
        if (enemy) {
            // Check if enemy is in dirt - cannot pump enemies in dirt
            const enemyInDirt = game.dirt[enemy.y][enemy.x];
            if (!enemyInDirt) {
                hitEnemy = enemy;
                hitDistance = distance;
                break; // Found closest enemy in tunnel
            } else {
                console.log(`Enemy ${enemy.id} at (${enemy.x}, ${enemy.y}) is in dirt - cannot pump`);
            }
        }
    }

    if (hitEnemy) {
        // If this is a Fygar that's currently breathing fire, stop it immediately
        if (hitEnemy.type === ENEMY_TYPES.FYGAR && hitEnemy.isFiring) {
            // Remove any active fire projectiles from this Fygar
            game.fires = game.fires.filter(fire => fire.enemyId !== hitEnemy.id);
            hitEnemy.isFiring = false;
            console.log(`Fygar ${hitEnemy.id} fire breath interrupted by pump!`);
        }

        // Attach pump to enemy
        game.pump = {
            active: true,
            targetEnemy: hitEnemy.id,
            inflationProgress: hitEnemy.inflationStage,
            keyHeld: true,
            timer: 0,
            visualTimer: 0 // For showing pump visual
        };
        console.log(`Pump attached to enemy ${hitEnemy.id} at (${hitEnemy.x}, ${hitEnemy.y}) - distance: ${hitDistance} blocks`);
    } else {
        // Show pump visual even when no enemy is hit
        game.pump = {
            active: false, // Not attached to enemy
            targetEnemy: null,
            visualOnly: true,
            visualTimer: 0.2, // Show for 0.2 seconds
            keyHeld: false
        };
        console.log(`No enemy found within 2 blocks. Showing pump visual.`);
    }
}

/**
 * Updates pump state for inflation/deflation
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updatePump(deltaTime) {
    if (!game.pump) {
        return;
    }

    // Handle visual-only pump (no enemy hit)
    if (game.pump.visualOnly) {
        game.pump.visualTimer -= deltaTime;
        if (game.pump.visualTimer <= 0) {
            game.pump = null; // Remove pump visual after timer expires
        }
        return;
    }

    // Handle active pump attached to enemy
    if (!game.pump.active) {
        return;
    }

    // Find the target enemy
    const targetEnemy = game.enemies.find(enemy => enemy.id === game.pump.targetEnemy);

    // If enemy no longer exists, reset pump
    if (!targetEnemy) {
        game.pump = null;
        return;
    }

    // Update timer
    game.pump.timer += deltaTime;

    if (game.pump.keyHeld) {
        // Inflate: increase stage every 0.5 seconds
        if (game.pump.timer >= PUMP_CONSTANTS.INFLATION_TIME) {
            game.pump.timer = 0;
            targetEnemy.inflationStage++;
            game.pump.inflationProgress = targetEnemy.inflationStage;

            console.log(`Enemy ${targetEnemy.id} inflated to stage ${targetEnemy.inflationStage}`);

            // Check if enemy should pop (stage 4)
            if (targetEnemy.inflationStage >= PUMP_CONSTANTS.MAX_INFLATION) {
                console.log(`Enemy ${targetEnemy.id} defeated by pump!`);

                // Spawn particles when enemy pops
                const particleColor = targetEnemy.type === ENEMY_TYPES.POOKA ? '#FF3333' : '#33FF33';
                spawnParticles(targetEnemy.x + 0.5, targetEnemy.y + 0.5, 15, particleColor, 1.5);

                // Award points
                addScore(PUMP_CONSTANTS.DEFEAT_POINTS, 'Pump defeat');

                // Remove enemy from game
                const enemyIndex = game.enemies.findIndex(enemy => enemy.id === targetEnemy.id);
                if (enemyIndex !== -1) {
                    game.enemies.splice(enemyIndex, 1);
                }

                // Reset pump
                game.pump = null;
            }
        }
    } else {
        // Key released - immediately detach pump so player can move
        // Enemy will deflate over time but player is free to move
        console.log(`Pump key released - player can now move. Enemy ${targetEnemy.id} will deflate.`);
        game.pump = null;

        // Enemy will continue to deflate naturally over time
        // This is handled in updateEnemies by checking inflationStage
    }
}

// Rock system functions

/**
 * Checks if a rock has support beneath it (dirt or bottom boundary)
 * Rocks sit ON TOP of dirt, so they check the position BELOW them
 * @param {object} rock - The rock object to check
 * @returns {boolean} True if rock has support, false otherwise
 */
function checkRockSupport(rock) {
    const rockGridY = Math.floor(rock.y);
    const rockGridX = Math.floor(rock.x);

    console.log(`Checking support for rock ${rock.id} at (${rockGridX}, ${rockGridY})`);

    // Check if rock is at bottom of grid
    if (rockGridY >= GRID_HEIGHT - 1) {
        console.log(`Rock ${rock.id} at bottom - has support`);
        return true; // Bottom boundary provides support
    }

    // Check if there's dirt directly below the rock
    const belowY = rockGridY + 1;
    if (belowY < GRID_HEIGHT && game.dirt[belowY][rockGridX]) {
        console.log(`Rock ${rock.id} has dirt below at (${rockGridX}, ${belowY}) - has support`);
        return true; // Dirt below provides support
    }

    console.log(`Rock ${rock.id} has NO support - dirt below at (${rockGridX}, ${belowY}) is ${game.dirt[belowY]?.[rockGridX]}`);
    return false; // No support
}

/**
 * Updates all rocks in the game (gravity, wobbling, falling)
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateRocks(deltaTime) {
    console.log(`Updating ${game.rocks.length} rocks`);

    game.rocks.forEach(rock => {
        console.log(`Rock ${rock.id} state: ${rock.state} at (${rock.x}, ${rock.y})`);

        if (rock.state === 'stable') {
            // Check if rock still has support
            if (!checkRockSupport(rock)) {
                // No support - start wobbling
                rock.state = 'wobbling';
                rock.wobbleTimer = 0;
                console.log(`🪨 Rock ${rock.id} at (${rock.x}, ${rock.y}) started WOBBLING`);
            }
        } else if (rock.state === 'wobbling') {
            // Update wobble timer
            rock.wobbleTimer += deltaTime;
            console.log(`Rock ${rock.id} wobbling: ${rock.wobbleTimer.toFixed(2)}s / ${ROCK_CONSTANTS.WOBBLE_DURATION}s`);

            // After wobble duration, start falling
            if (rock.wobbleTimer >= ROCK_CONSTANTS.WOBBLE_DURATION) {
                rock.state = 'falling';
                rock.fallSpeed = ROCK_CONSTANTS.FALL_SPEED;
                console.log(`⬇️ Rock ${rock.id} started FALLING from (${rock.x}, ${rock.y})`);
            }
        } else if (rock.state === 'falling') {
            // Move rock downward
            const fallDistance = rock.fallSpeed * deltaTime;
            const oldY = rock.y;
            rock.y += fallDistance;
            console.log(`Rock ${rock.id} falling: ${oldY.toFixed(2)} -> ${rock.y.toFixed(2)} (distance: ${fallDistance.toFixed(2)})`);

            // Check if rock hit bottom or dirt
            const gridY = Math.floor(rock.y);
            const gridX = Math.floor(rock.x);

            if (gridY >= GRID_HEIGHT - 1) {
                // Hit bottom - snap to bottom position but don't mark as landed yet
                // Collision check will happen first, then it will be removed
                rock.y = GRID_HEIGHT - 1;
                rock.state = 'landed-pending';
                console.log(`💥 Rock ${rock.id} hit BOTTOM at (${gridX}, ${gridY})`);
            } else {
                // Check if there's dirt at the next position below
                const nextGridY = gridY + 1;
                if (nextGridY < GRID_HEIGHT && game.dirt[nextGridY][gridX]) {
                    // Hit dirt - snap to position but don't mark as landed yet
                    // Collision check will happen first, then it will be removed
                    rock.y = gridY;
                    rock.state = 'landed-pending';
                    console.log(`💥 Rock ${rock.id} hit DIRT below at (${gridX}, ${nextGridY}), landed at (${gridX}, ${gridY})`);
                }
            }
        }
    });
}

/**
 * Checks for collisions between falling rocks and entities (player and enemies)
 * Awards points for enemy crushes and handles player damage
 * Also finalizes rock removal after collision checks
 */
function checkRockCollision() {
    // Don't check collisions during pause
    if (game.roundPaused) {
        return;
    }

    const rocksToRemove = [];

    game.rocks.forEach(rock => {
        // Check collisions for falling rocks and rocks that just landed
        if (rock.state !== 'falling' && rock.state !== 'landed-pending') {
            return;
        }

        const rockGridY = Math.floor(rock.y);
        const rockGridX = Math.floor(rock.x);

        console.log(`Checking rock ${rock.id} collision at grid (${rockGridX}, ${rockGridY})`);

        // Track crushed enemies for this rock
        const crushedEnemies = [];

        // Check collision with enemies
        game.enemies.forEach(enemy => {
            const enemyGridX = Math.floor(enemy.x);
            const enemyGridY = Math.floor(enemy.y);
            console.log(`  Enemy ${enemy.id} at grid (${enemyGridX}, ${enemyGridY})`);

            if (enemyGridX === rockGridX && enemyGridY === rockGridY) {
                console.log(`  💥 COLLISION! Rock hit enemy ${enemy.id}`);
                crushedEnemies.push(enemy.id);
            }
        });

        // Remove crushed enemies and award points
        if (crushedEnemies.length > 0) {
            crushedEnemies.forEach(enemyId => {
                const enemyIndex = game.enemies.findIndex(e => e.id === enemyId);
                if (enemyIndex !== -1) {
                    const enemy = game.enemies[enemyIndex];

                    // Spawn particles when rock crushes enemy
                    const particleColor = enemy.type === ENEMY_TYPES.POOKA ? '#FF3333' : '#33FF33';
                    spawnParticles(enemy.x + 0.5, enemy.y + 0.5, 20, particleColor, 2.0);

                    game.enemies.splice(enemyIndex, 1);
                }
            });

            // Spawn gray rock impact particles at crush location
            spawnParticles(rockGridX + 0.5, rockGridY + 0.5, 10, '#808080', 1.0);

            // Trigger screen shake on rock impact (stronger for multiple crushes)
            const shakeIntensity = 8 + (crushedEnemies.length * 4); // 12-20 pixels
            triggerScreenShake(shakeIntensity, 0.3);

            // Award points: 500 per enemy, multiplied for multiple crushes
            const points = ROCK_CONSTANTS.CRUSH_POINTS * crushedEnemies.length;
            const crushDescription = crushedEnemies.length > 1 ?
                `Rock crushed ${crushedEnemies.length} enemies (${points} = ${ROCK_CONSTANTS.CRUSH_POINTS} × ${crushedEnemies.length})` :
                'Rock crush';
            addScore(points, crushDescription);
        }

        // Check collision with player
        const playerGridX = Math.floor(game.player.x);
        const playerGridY = Math.floor(game.player.y);
        console.log(`  Player at grid (${playerGridX}, ${playerGridY})`);

        if (playerGridX === rockGridX && playerGridY === rockGridY) {
            console.log('💀 Player crushed by rock!');

            // Trigger screen shake on player crush (strong shake)
            triggerScreenShake(15, 0.4);

            loseLife();
        }

        // Mark rock for removal if it has landed
        if (rock.state === 'landed-pending') {
            rocksToRemove.push(rock.id);
        }
    });

    // Remove landed rocks after collision checks are complete
    if (rocksToRemove.length > 0) {
        const beforeCount = game.rocks.length;
        game.rocks = game.rocks.filter(rock => !rocksToRemove.includes(rock.id));
        const afterCount = game.rocks.length;
        console.log(`🗑️ Removed ${beforeCount - afterCount} landed rocks. ${afterCount} rocks remaining.`);
    }
}

// Particle system functions

/**
 * Creates a particle object
 * @param {number} x - X position in grid coordinates
 * @param {number} y - Y position in grid coordinates
 * @param {number} vx - X velocity in blocks per second
 * @param {number} vy - Y velocity in blocks per second
 * @param {string} color - Particle color
 * @param {number} lifetime - Lifetime in seconds
 * @returns {object} Particle object
 */
function createParticle(x, y, vx, vy, color, lifetime) {
    return {
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        color: color,
        lifetime: lifetime,
        maxLifetime: lifetime
    };
}

/**
 * Spawns multiple particles at a position
 * @param {number} x - X position in grid coordinates
 * @param {number} y - Y position in grid coordinates
 * @param {number} count - Number of particles to spawn
 * @param {string} color - Particle color
 * @param {number} speed - Particle speed multiplier
 */
function spawnParticles(x, y, count, color, speed = 1.0) {
    for (let i = 0; i < count; i++) {
        // Random velocity in all directions
        const angle = Math.random() * Math.PI * 2;
        const velocity = (Math.random() * 2 + 1) * speed; // 1-3 blocks/sec * speed
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        const lifetime = 0.3 + Math.random() * 0.4; // 0.3-0.7 seconds

        game.particles.push(createParticle(x, y, vx, vy, color, lifetime));
    }
}

/**
 * Updates all particles in the game
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateParticles(deltaTime) {
    // Update particle positions and lifetimes
    game.particles.forEach(particle => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.lifetime -= deltaTime;

        // Apply gravity to particles
        particle.vy += 5 * deltaTime; // Gravity acceleration
    });

    // Remove expired particles
    game.particles = game.particles.filter(particle => particle.lifetime > 0);
}

/**
 * Renders all particles in the game
 */
function renderParticles() {
    const ctx = game.ctx;
    const bs = game.blockSize;

    game.particles.forEach(particle => {
        const screenX = particle.x * bs;
        const screenY = (particle.y + SKY_HEIGHT) * bs;

        // Calculate alpha based on remaining lifetime
        const alpha = particle.lifetime / particle.maxLifetime;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;

        // Draw particle as small square
        const particleSize = bs * 0.15;
        ctx.fillRect(
            screenX - particleSize / 2,
            screenY - particleSize / 2,
            particleSize,
            particleSize
        );

        ctx.restore();
    });
}

// Screen shake system functions

/**
 * Triggers a screen shake effect
 * @param {number} intensity - Shake intensity in pixels (default: 10)
 * @param {number} duration - Shake duration in seconds (default: 0.3)
 */
function triggerScreenShake(intensity = 10, duration = 0.3) {
    game.screenShake.active = true;
    game.screenShake.intensity = intensity;
    game.screenShake.duration = duration;
    game.screenShake.timer = 0;
    console.log(`Screen shake triggered: intensity=${intensity}, duration=${duration}s`);
}

/**
 * Updates screen shake effect
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateScreenShake(deltaTime) {
    if (!game.screenShake.active) {
        game.screenShake.offsetX = 0;
        game.screenShake.offsetY = 0;
        return;
    }

    game.screenShake.timer += deltaTime;

    // Check if shake is complete
    if (game.screenShake.timer >= game.screenShake.duration) {
        game.screenShake.active = false;
        game.screenShake.offsetX = 0;
        game.screenShake.offsetY = 0;
        return;
    }

    // Calculate shake intensity with decay over time
    const progress = game.screenShake.timer / game.screenShake.duration;
    const decay = 1 - progress; // Linear decay from 1 to 0
    const currentIntensity = game.screenShake.intensity * decay;

    // Generate random offset
    const angle = Math.random() * Math.PI * 2;
    game.screenShake.offsetX = Math.cos(angle) * currentIntensity;
    game.screenShake.offsetY = Math.sin(angle) * currentIntensity;
}

/**
 * Updates the damage flash effect
 * @param {number} deltaTime - Time elapsed since last frame in seconds
 */
function updateDamageFlash(deltaTime) {
    if (!game.damageFlash.active) {
        return;
    }

    game.damageFlash.timer += deltaTime;

    // Check if flash is complete
    if (game.damageFlash.timer >= game.damageFlash.duration) {
        game.damageFlash.active = false;
        game.damageFlash.timer = 0;
    }
}

// Scoring system functions

/**
 * Adds points to the player's score
 * @param {number} points - Points to add
 * @param {string} reason - Optional reason for scoring (for logging)
 */
function addScore(points, reason = '') {
    game.score += points;

    if (reason) {
        console.log(`🎯 +${points} points: ${reason}. Total score: ${game.score}`);
    } else {
        console.log(`🎯 +${points} points. Total score: ${game.score}`);
    }
}

/**
 * Handles player losing a life
 * Decrements lives, resets player position, and checks for game over
 */
function loseLife() {
    // Trigger damage flash effect
    game.damageFlash.active = true;
    game.damageFlash.timer = 0;

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

    // Rocks persist across lives - they don't respawn

    // Start round pause
    game.roundPaused = true;
    game.pauseTimer = 0;
    console.log('Round paused - enemies and player reset (rocks persist)');
}

/**
 * Checks if the level is complete (all enemies defeated)
 * Transitions to 'levelComplete' state and starts transition timer
 */
function checkLevelComplete() {
    // Check if enemies array is empty
    if (game.enemies.length === 0 && game.gameState === 'playing') {
        console.log('🎉 Level complete! All enemies defeated.');

        // Transition to 'levelComplete' game state
        game.gameState = 'levelComplete';

        // Start 2-second transition timer
        game.levelTransitionTimer = 0;
    }
}

/**
 * Advances to the next level with increased difficulty
 * Resets the dirt grid, spawns new enemies and rocks, and awards level completion bonus
 */
function advanceLevel() {
    // Increment level counter
    game.level++;
    console.log(`🎮 Advancing to level ${game.level}`);

    // Award level completion bonus (1000 points)
    addScore(1000, `Level ${game.level - 1} complete`);

    // Reset dirt grid to full coverage
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            game.dirt[y][x] = true;
        }
    }

    // Reset player position to starting location
    game.player.x = 7;
    game.player.y = 3;
    game.player.renderX = 7;
    game.player.renderY = 3;
    game.player.targetX = 7;
    game.player.targetY = 3;
    game.player.direction = 'down';
    game.player.isMoving = false;

    // Clear player starting position
    game.dirt[game.player.y][game.player.x] = false;

    // Clear pump state
    game.pump = null;

    // Clear fires
    game.fires = [];

    // Spawn enemies with increased count and speed
    // Enemy count increases by 1 per level (max 8 enemies total)
    // Enemy speed increases by 10% per level (max 200% of base speed)
    spawnEnemies(game.level);

    // Apply speed scaling to enemies (10% increase per level, max 200%)
    const speedMultiplier = Math.min(1 + (game.level - 1) * 0.1, 2.0);
    game.enemies.forEach(enemy => {
        const baseSpeed = enemy.type === ENEMY_TYPES.POOKA ?
            ENEMY_SPEEDS.POOKA_TUNNEL : ENEMY_SPEEDS.FYGAR_TUNNEL;
        enemy.speed = baseSpeed * speedMultiplier;
        console.log(`Enemy ${enemy.id} (${enemy.type}) speed: ${enemy.speed.toFixed(2)} (${(speedMultiplier * 100).toFixed(0)}%)`);
    });

    // Spawn rocks for new level
    spawnRocks(game.level);

    // Return to playing state
    game.gameState = 'playing';

    // Start round pause
    game.roundPaused = true;
    game.pauseTimer = 0;

    console.log(`✅ Level ${game.level} started with ${game.enemies.length} enemies and ${game.rocks.length} rocks`);
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

    // Respawn rocks for level 1
    spawnRocks(game.level);
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

    // Spawn rocks for level 1
    spawnRocks(game.level);

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

    // Handle spacebar for pump attack
    if (key === ' ' || e.code === 'Space') {
        if (!game.keys['space']) {
            // First press - fire pump
            game.keys['space'] = true;
            firePump();
        }
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

    // Handle spacebar release for pump deflation
    if (key === ' ' || e.code === 'Space') {
        game.keys['space'] = false;

        // Mark pump as no longer held if active
        if (game.pump && game.pump.active) {
            game.pump.keyHeld = false;
        }
        e.preventDefault();
        return;
    }

    game.keys[key] = false;
}

function updatePlayerMovement(deltaTime) {
    // Cannot move while pumping
    if (game.pump && game.pump.active) {
        return;
    }

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
                // Check if there's a rock at the target position
                const rockAtTarget = game.rocks.find(rock =>
                    Math.floor(rock.x) === newX && Math.floor(rock.y) === newY
                );

                if (rockAtTarget) {
                    console.log(`Cannot move to (${newX}, ${newY}) - rock blocking path`);
                    return; // Cannot move into rock
                }

                // Spawn dirt particles when digging through dirt
                if (game.dirt[newY][newX]) {
                    spawnParticles(newX + 0.5, newY + 0.5, 5, '#8B4513', 0.5);
                }

                game.player.targetX = newX;
                game.player.targetY = newY;
                game.player.isMoving = true;

                // Dig out dirt at target position and award points
                if (game.dirt[newY][newX]) {
                    game.dirt[newY][newX] = false;
                    addScore(10, 'Digging dirt');
                    console.log(`Player digging at (${newX}, ${newY})`);
                }
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
            updatePump(deltaTime);
            updateRocks(deltaTime);
            updateParticles(deltaTime);
            checkEnemyCollision();
            checkFireCollision();
            checkRockCollision();

            // Check if level is complete
            checkLevelComplete();
        }
    } else if (game.gameState === 'levelComplete') {
        // Handle level transition
        game.levelTransitionTimer += deltaTime;

        // After 2 seconds, advance to next level
        if (game.levelTransitionTimer >= 2.0) {
            advanceLevel();
        }
    }

    // Always update screen shake (even during pause/game over)
    updateScreenShake(deltaTime);

    // Always update damage flash (even during pause/game over)
    updateDamageFlash(deltaTime);

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

    // Apply screen shake offset
    ctx.save();
    ctx.translate(game.screenShake.offsetX, game.screenShake.offsetY);

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

    // Draw rocks
    game.rocks.forEach(rock => {
        const rockScreenX = rock.x * bs;
        const rockScreenY = (rock.y + SKY_HEIGHT) * bs;

        ctx.save();

        // Draw rock as gray square
        ctx.fillStyle = '#808080';
        ctx.fillRect(rockScreenX, rockScreenY, bs, bs);

        // Add darker border for depth
        ctx.strokeStyle = '#404040';
        ctx.lineWidth = bs * 0.05;
        ctx.strokeRect(rockScreenX, rockScreenY, bs, bs);

        // Add highlight for 3D effect
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(rockScreenX + bs * 0.1, rockScreenY + bs * 0.1, bs * 0.3, bs * 0.3);

        // Wobble animation when unsupported
        if (rock.state === 'wobbling') {
            const wobbleProgress = rock.wobbleTimer / ROCK_CONSTANTS.WOBBLE_DURATION;
            const wobbleAmount = Math.sin(wobbleProgress * Math.PI * 8) * bs * 0.1;

            // Draw wobble indicator (small shake effect)
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.fillRect(
                rockScreenX + wobbleAmount,
                rockScreenY - bs * 0.2,
                bs,
                bs * 0.1
            );
        }

        // Motion blur/trail effect when falling
        if (rock.state === 'falling') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#808080';

            // Draw trail above the rock
            for (let i = 1; i <= 3; i++) {
                const trailY = rockScreenY - (i * bs * 0.2);
                ctx.fillRect(rockScreenX, trailY, bs, bs * 0.15);
            }

            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    });

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

    // Draw pump line if active or visual-only
    if (game.pump) {
        const playerCenterX = game.player.renderX * bs + bs / 2;
        const playerCenterY = (game.player.renderY + SKY_HEIGHT) * bs + bs / 2;

        if (game.pump.active) {
            // Draw pump attached to enemy
            const targetEnemy = game.enemies.find(enemy => enemy.id === game.pump.targetEnemy);

            if (targetEnemy) {
                // Draw line from player to enemy
                const enemyCenterX = targetEnemy.renderX * bs + bs / 2;
                const enemyCenterY = (targetEnemy.renderY + SKY_HEIGHT) * bs + bs / 2;

                ctx.save();

                // Draw pump hose
                ctx.strokeStyle = '#790ECB';
                ctx.lineWidth = bs * 0.15;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(playerCenterX, playerCenterY);
                ctx.lineTo(enemyCenterX, enemyCenterY);
                ctx.stroke();

                // Draw pump attachment point on enemy
                ctx.fillStyle = '#790ECB';
                ctx.beginPath();
                ctx.arc(enemyCenterX, enemyCenterY, bs * 0.2, 0, Math.PI * 2);
                ctx.fill();

                // Draw inflation indicator
                if (targetEnemy.inflationStage > 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = `bold ${bs * 0.4}px 'Courier New', monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        `${targetEnemy.inflationStage}`,
                        enemyCenterX,
                        enemyCenterY - bs * 0.8
                    );
                    ctx.textAlign = 'left';
                }

                ctx.restore();
            }
        } else if (game.pump.visualOnly) {
            // Draw pump visual extending in player's direction (2 blocks)
            ctx.save();

            // Calculate end position based on player direction
            let endX = game.player.x;
            let endY = game.player.y;

            switch (game.player.direction) {
                case 'up':
                    endY -= 2;
                    break;
                case 'down':
                    endY += 2;
                    break;
                case 'left':
                    endX -= 2;
                    break;
                case 'right':
                    endX += 2;
                    break;
            }

            // Clamp to grid bounds
            endX = Math.max(0, Math.min(GRID_WIDTH - 1, endX));
            endY = Math.max(0, Math.min(GRID_HEIGHT - 1, endY));

            const endCenterX = endX * bs + bs / 2;
            const endCenterY = (endY + SKY_HEIGHT) * bs + bs / 2;

            // Draw pump hose with fade effect
            const fadeAlpha = game.pump.visualTimer / 0.2; // Fade based on remaining time
            ctx.globalAlpha = fadeAlpha;
            ctx.strokeStyle = '#790ECB';
            ctx.lineWidth = bs * 0.15;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(endCenterX, endCenterY);
            ctx.stroke();

            // Draw pump end point
            ctx.fillStyle = '#790ECB';
            ctx.beginPath();
            ctx.arc(endCenterX, endCenterY, bs * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    // Draw particles
    renderParticles();

    // Draw player (Kiro) using smooth render position
    const playerScreenY = (game.player.renderY + SKY_HEIGHT) * bs;
    const playerScreenX = game.player.renderX * bs;

    if (game.imageLoaded) {
        // Calculate rotation angle based on direction
        let rotation = 0;
        switch (game.player.direction) {
            case 'up':
                rotation = -Math.PI / 2; // -90 degrees
                break;
            case 'down':
                rotation = Math.PI / 2; // 90 degrees
                break;
            case 'left':
                rotation = Math.PI; // 180 degrees
                break;
            case 'right':
                rotation = 0; // 0 degrees (default)
                break;
        }

        // Draw rotated sprite
        ctx.save();
        ctx.translate(playerScreenX + bs / 2, playerScreenY + bs / 2);
        ctx.rotate(rotation);
        ctx.drawImage(game.kiroImage, -bs / 2, -bs / 2, bs, bs);
        ctx.restore();
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

    // Draw score
    ctx.fillText(`Score: ${game.score}`, bs * 0.5, statusY + bs * 0.6);

    // Draw lives
    ctx.fillText(`Lives: ${game.lives}`, bs * 5, statusY + bs * 0.6);

    // Draw level
    ctx.fillText(`Level: ${game.level}`, bs * 9, statusY + bs * 0.6);

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

    // Draw level transition screen if level is complete
    if (game.gameState === 'levelComplete') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);

        ctx.fillStyle = '#790ECB';
        ctx.font = `bold ${bs * 1.2}px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${game.level} Complete!`, game.canvas.width / 2, game.canvas.height / 2 - bs);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${bs * 0.7}px 'Courier New', monospace`;
        ctx.fillText(`+1000 Bonus`, game.canvas.width / 2, game.canvas.height / 2 + bs * 0.5);

        // Show animated dots for transition
        const dots = '.'.repeat(Math.floor(game.levelTransitionTimer * 2) % 4);
        ctx.fillStyle = '#790ECB';
        ctx.font = `${bs * 0.6}px 'Courier New', monospace`;
        ctx.fillText(`Next level${dots}`, game.canvas.width / 2, game.canvas.height / 2 + bs * 2);

        ctx.textAlign = 'left';
    }

    // Draw game over screen if game is over
    if (game.gameState === 'gameOver') {
        showGameOver();
    }

    // Draw damage flash overlay
    if (game.damageFlash.active) {
        // Calculate flash opacity with fade out
        const progress = game.damageFlash.timer / game.damageFlash.duration;
        const opacity = 0.5 * (1 - progress); // Fade from 0.5 to 0

        ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
    }

    // Restore context after screen shake
    ctx.restore();
}

// Start the game when page loads
window.addEventListener('load', init);
