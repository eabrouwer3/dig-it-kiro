# Implementation Plan

- [x] 1. Set up enemy system foundation
  - Add enemy array to game state object
  - Define enemy constants (speeds, types, spawn counts)
  - Create enemy object structure with all required properties
  - _Requirements: 1.1, 2.1_

- [x] 2. Implement enemy spawning logic
  - [x] 2.1 Create spawnEnemies() function that generates enemies based on level
    - Calculate enemy count from level number (2-4 Pooka, 1-2 Fygar)
    - Generate random spawn positions in dirt grid
    - Initialize enemy objects with proper type, position, and default values
    - _Requirements: 1.1, 2.1_

  - [x] 2.2 Add enemy rendering in draw() function
    - Render Pooka as red circles with simple face pattern
    - Render Fygar as green dragon shapes with directional orientation
    - Apply opacity based on ghost mode (50% in dirt, 100% in tunnels)
    - Scale sprites based on inflation stage
    - _Requirements: 1.5, 2.7_

- [x] 3. Implement basic enemy movement and AI
  - [x] 3.1 Create updateEnemies() function in game loop
    - Calculate delta time for frame-independent movement
    - Call movement logic for each enemy
    - Update enemy positions based on speed and direction
    - _Requirements: 1.2, 1.3, 2.2, 2.3_

  - [x] 3.2 Implement calculateEnemyPath() for pathfinding
    - Use Manhattan distance to find direction toward player
    - Choose movement direction that reduces distance to player
    - Handle cases where multiple directions are equally good
    - _Requirements: 8.1_

  - [x] 3.3 Add ghost mode detection and speed adjustment
    - Check if enemy position has dirt block
    - Set isInDirt flag and adjust speed accordingly (tunnel: 2 blocks/sec for Pooka, 1.5 for Fygar; dirt: 0.5 blocks/sec)
    - Update rendering opacity based on ghost mode state
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 8.3, 8.4_

  - [x] 3.4 Implement enemy boundary checking
    - Prevent enemies from moving outside grid bounds
    - Handle edge cases at grid boundaries
    - _Requirements: 8.5_

- [x] 4. Implement collision detection and life system
  - [x] 4.1 Add lives tracking to game state
    - Initialize lives to 3 in game state
    - Add lives display to status bar rendering
    - _Requirements: 6.1, 6.5_

  - [x] 4.2 Create checkEnemyCollision() function
    - Check if player position matches any enemy position
    - Call loseLife() when collision detected
    - _Requirements: 1.4, 2.6_

  - [x] 4.3 Implement loseLife() function
    - Decrement lives counter
    - Reset player position to starting location
    - Reset player direction
    - Check for game over condition
    - _Requirements: 6.2, 6.3_

  - [x] 4.4 Create game over system
    - Add gameState property to track 'playing', 'levelComplete', 'gameOver'
    - Implement showGameOver() to render game over screen with final score
    - Add keyboard handler for R key to restart game
    - Create restartGame() function to reset all state
    - _Requirements: 6.3, 6.4_

- [x] 5. Implement Fygar fire breath attack
  - [x] 5.1 Add fire breath state to Fygar enemies
    - Track lastFireTime for each Fygar
    - Add fire object structure to game state
    - _Requirements: 2.4_

  - [x] 5.2 Create triggerFygarFire() function
    - Check if Fygar is within 3 blocks horizontally of player
    - Check if Fygar is facing player direction
    - Apply 30% probability check every 2 seconds
    - Create fire projectile extending 3 blocks
    - _Requirements: 2.4, 2.5_

  - [x] 5.3 Implement fire collision detection
    - Check if player position intersects with fire hitbox
    - Call loseLife() when fire hits player
    - Remove fire after 1 second duration
    - _Requirements: 2.6_

  - [x] 5.4 Add fire rendering
    - Draw horizontal flame effect in Fygar's facing direction
    - Use orange/red colors with animated effect
    - _Requirements: 2.5_

- [ ] 6. Implement pump attack mechanic
  - [ ] 6.1 Add pump state to game object
    - Create pump object structure (active, targetEnemy, inflationProgress, keyHeld)
    - Initialize pump as null
    - _Requirements: 3.1_

  - [ ] 6.2 Create keyboard handler for spacebar
    - Detect spacebar press to fire pump
    - Detect spacebar hold for continued inflation
    - Detect spacebar release for deflation
    - _Requirements: 3.1, 3.5_

  - [ ] 6.3 Implement firePump() function
    - Create pump projectile 1 block in player's facing direction
    - Check for enemy at projectile position
    - Attach pump to enemy if collision detected
    - _Requirements: 3.1, 3.2_

  - [ ] 6.4 Create updatePump() function for inflation/deflation
    - Increase inflation stage every 0.5 seconds while spacebar held
    - Decrease inflation stage every 0.3 seconds when released
    - Remove enemy and award points at stage 4
    - Reset pump when enemy defeated or fully deflated
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 6.5 Add pump and inflation rendering
    - Draw pump line from player to attached enemy
    - Scale enemy sprite based on inflation stage (1 + stage * 0.25)
    - Add visual feedback for pump attachment
    - _Requirements: 3.6_

- [ ] 7. Implement rock and gravity system
  - [ ] 7.1 Add rocks array to game state
    - Create rock object structure (id, x, y, state, wobbleTimer, fallSpeed)
    - Define rock constants (fall speed, wobble duration)
    - _Requirements: 4.1_

  - [ ] 7.2 Create spawnRocks() function
    - Generate 3-5 rocks at random positions in dirt grid
    - Ensure rocks don't spawn on player or enemy positions
    - Initialize rocks in 'stable' state
    - _Requirements: 4.1_

  - [ ] 7.3 Implement updateRocks() function
    - Check support beneath each rock using checkRockSupport()
    - Start wobble timer when support removed
    - Transition to falling state after 0.5 seconds
    - Move falling rocks at 8 blocks/second
    - _Requirements: 4.2, 4.5_

  - [ ] 7.4 Create checkRockCollision() function
    - Check if falling rock position matches enemy positions
    - Check if falling rock position matches player position
    - Call appropriate damage/defeat functions
    - Award points for enemy crushes (500 per enemy, multiplied for multiple)
    - Remove rock when it reaches bottom or hits dirt
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ] 7.5 Add rock rendering
    - Draw rocks as gray squares distinct from dirt
    - Add wobble animation when unsupported
    - Show motion blur or trail effect when falling
    - _Requirements: 4.6_

- [ ] 8. Implement scoring system
  - [ ] 8.1 Add score tracking to game state
    - Initialize score to 0
    - Add score display to status bar
    - _Requirements: 5.1, 5.6_

  - [ ] 8.2 Create addScore() function
    - Add points to game.score
    - Create optional score popup particle effect at event location
    - _Requirements: 5.1_

  - [ ] 8.3 Integrate scoring with game events
    - Award 200 points for pump defeats in updatePump()
    - Award 500 points per enemy for rock crushes in checkRockCollision()
    - Multiply rock bonus for multiple crushes
    - Award 1000 points for level completion
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement level progression system
  - [ ] 9.1 Add level tracking to game state
    - Initialize level to 1
    - Add level display to status bar
    - _Requirements: 7.5_

  - [ ] 9.2 Create checkLevelComplete() function
    - Check if enemies array is empty
    - Transition to 'levelComplete' game state
    - Start 2-second transition timer
    - _Requirements: 7.1_

  - [ ] 9.3 Implement advanceLevel() function
    - Increment level counter
    - Reset dirt grid to full coverage
    - Clear player starting position
    - Increase enemy count by 1 (max 8 enemies)
    - Increase enemy speed by 10% (max 200% of base)
    - Call spawnEnemies() and spawnRocks() with new level
    - Award level completion bonus
    - _Requirements: 7.2, 7.3, 7.4, 5.5_

  - [ ] 9.4 Add level transition rendering
    - Display "Level X Complete" message during transition
    - Show brief animation or effect
    - _Requirements: 7.1_

- [ ] 10. Implement enemy aggression scaling
  - [ ] 10.1 Add aliveTime tracking to enemies
    - Initialize aliveTime to 0 for each enemy
    - Increment aliveTime in updateEnemies()
    - _Requirements: 8.2_

  - [ ] 10.2 Apply speed boost after 30 seconds
    - Check if enemy.aliveTime > 30
    - Multiply enemy speed by 1.2
    - Apply visual indicator (optional)
    - _Requirements: 8.2_

- [ ] 11. Add polish and visual effects
  - [ ] 11.1 Create particle system
    - Add particles array to game state
    - Create particle object structure (x, y, vx, vy, color, lifetime)
    - Implement updateParticles() and renderParticles() functions
    - _Requirements: Design - Visual Effects_

  - [ ] 11.2 Add particle effects for game events
    - Spawn particles when enemy pops from inflation
    - Spawn particles when rock crushes enemy
    - Spawn particles when digging through dirt
    - _Requirements: Design - Visual Effects_

  - [ ] 11.3 Implement screen shake effect
    - Add screen shake on rock impact
    - Add brief camera offset to rendering
    - _Requirements: Design - Visual Effects_

  - [ ] 11.4 Add damage flash effect
    - Flash screen red when player takes damage
    - Brief overlay effect on loseLife()
    - _Requirements: Design - Visual Effects_

- [ ]* 12. Testing and refinement
  - [ ]* 12.1 Test all enemy behaviors
    - Verify Pooka and Fygar movement in tunnels and dirt
    - Test pathfinding accuracy
    - Verify collision detection reliability
    - _Requirements: All enemy requirements_

  - [ ]* 12.2 Test combat mechanics
    - Verify pump inflation through all stages
    - Test deflation timing
    - Verify rock falling and collision
    - Test Fygar fire breath trigger conditions
    - _Requirements: 3.1-3.6, 4.1-4.6, 2.4-2.6_

  - [ ]* 12.3 Test progression systems
    - Verify level advancement
    - Test difficulty scaling
    - Verify score accumulation
    - Test game over and restart
    - _Requirements: 5.1-5.6, 6.1-6.4, 7.1-7.5_

  - [ ]* 12.4 Performance testing
    - Verify 60 FPS with maximum enemies
    - Test with multiple falling rocks
    - Verify no memory leaks over extended play
    - _Requirements: Design - Performance Considerations_
