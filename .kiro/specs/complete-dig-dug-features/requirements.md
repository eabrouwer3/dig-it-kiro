# Requirements Document

## Introduction

This document specifies the requirements for completing the Dig Dug-inspired game by adding enemies, combat mechanics, environmental hazards, scoring, and progression systems. The game currently has basic movement and tunnel digging implemented. These requirements will transform it into a complete arcade experience with enemy AI, pump mechanics, falling rocks, scoring, and level progression.

## Glossary

- **Game System**: The complete Dig Dug-inspired browser game application
- **Player Character**: The Kiro sprite controlled by the user via keyboard input
- **Pooka**: Round red enemy that moves through tunnels and can ghost through dirt
- **Fygar**: Green dragon enemy that moves through tunnels, ghosts through dirt, and breathes fire
- **Pump Mechanic**: The player's attack system that inflates enemies until they pop
- **Rock**: Environmental hazard that falls when unsupported and crushes entities below
- **Tunnel**: Empty space created by player movement through dirt
- **Ghost Mode**: Enemy ability to move slowly through solid dirt blocks
- **Inflation State**: Progressive visual state of an enemy being pumped (4 stages before popping)
- **Level**: A complete game round with a specific number of enemies to defeat
- **Score**: Numerical value tracking player performance
- **Lives**: Number of attempts remaining before game over

## Requirements

### Requirement 1: Enemy System - Pooka

**User Story:** As a player, I want to encounter Pooka enemies that chase me through tunnels, so that the game provides challenge and requires strategic movement.

#### Acceptance Criteria

1. WHEN the level starts, THE Game System SHALL spawn between 2 and 4 Pooka enemies at random positions in the dirt grid
2. WHILE a Pooka is in a tunnel, THE Game System SHALL move the Pooka toward the Player Character at a speed of 2 blocks per second
3. WHILE a Pooka is in solid dirt, THE Game System SHALL move the Pooka toward the Player Character at a speed of 0.5 blocks per second in ghost mode
4. WHEN a Pooka collides with the Player Character, THE Game System SHALL remove one life from the Player Character
5. THE Game System SHALL render Pooka as round red sprites with distinct visual appearance from the Player Character

### Requirement 2: Enemy System - Fygar

**User Story:** As a player, I want to face Fygar enemies that can breathe fire, so that I must approach combat situations more carefully.

#### Acceptance Criteria

1. WHEN the level starts, THE Game System SHALL spawn between 1 and 2 Fygar enemies at random positions in the dirt grid
2. WHILE a Fygar is in a tunnel, THE Game System SHALL move the Fygar toward the Player Character at a speed of 1.5 blocks per second
3. WHILE a Fygar is in solid dirt, THE Game System SHALL move the Fygar toward the Player Character at a speed of 0.5 blocks per second in ghost mode
4. WHEN a Fygar is within 3 blocks horizontally of the Player Character and facing the player, THE Game System SHALL trigger a fire breath attack with 30 percent probability every 2 seconds
5. WHEN a Fygar breathes fire, THE Game System SHALL project a horizontal flame extending 3 blocks in the direction the Fygar is facing for 1 second
6. WHEN fire collides with the Player Character, THE Game System SHALL remove one life from the Player Character
7. THE Game System SHALL render Fygar as green dragon sprites with distinct visual appearance from Pooka and the Player Character

### Requirement 3: Pump Attack Mechanic

**User Story:** As a player, I want to pump enemies to inflate and defeat them, so that I have an active combat mechanic.

#### Acceptance Criteria

1. WHEN the player presses the spacebar key, THE Game System SHALL fire a pump projectile 1 block in the direction the Player Character is facing
2. WHEN a pump projectile collides with an enemy, THE Game System SHALL attach the pump to that enemy and begin inflation
3. WHILE the spacebar key is held down and a pump is attached, THE Game System SHALL increase the enemy inflation state by 1 stage every 0.5 seconds
4. WHEN an enemy reaches inflation stage 4, THE Game System SHALL remove the enemy from the game and award 200 points to the player
5. WHEN the spacebar key is released before stage 4, THE Game System SHALL detach the pump and decrease the enemy inflation state by 1 stage every 0.3 seconds until reaching stage 0
6. THE Game System SHALL render inflated enemies with progressively larger visual size corresponding to their inflation stage

### Requirement 4: Rock and Gravity System

**User Story:** As a player, I want rocks to fall when I dig beneath them and crush enemies, so that I have strategic environmental combat options.

#### Acceptance Criteria

1. WHEN the level starts, THE Game System SHALL place between 3 and 5 rocks at random positions within the dirt grid
2. WHILE a rock has no dirt blocks directly beneath it, THE Game System SHALL wait 0.5 seconds then cause the rock to fall downward at 8 blocks per second
3. WHEN a falling rock collides with an enemy, THE Game System SHALL remove the enemy from the game and award 500 points to the player
4. WHEN a falling rock collides with the Player Character, THE Game System SHALL remove one life from the Player Character
5. WHEN a falling rock reaches the bottom of the grid or lands on dirt, THE Game System SHALL stop the rock movement and remove the rock from the game
6. THE Game System SHALL render rocks as gray square sprites distinct from dirt blocks

### Requirement 5: Scoring System

**User Story:** As a player, I want to see my score increase as I defeat enemies and complete levels, so that I can track my performance.

#### Acceptance Criteria

1. WHEN the game starts, THE Game System SHALL initialize the player score to 0
2. WHEN an enemy is defeated by pumping, THE Game System SHALL add 200 points to the player score
3. WHEN an enemy is defeated by a falling rock, THE Game System SHALL add 500 points to the player score
4. WHEN multiple enemies are defeated by a single falling rock, THE Game System SHALL multiply the rock bonus by the number of enemies crushed
5. WHEN a level is completed, THE Game System SHALL add a level completion bonus of 1000 points to the player score
6. THE Game System SHALL display the current score in the status bar area at all times

### Requirement 6: Lives and Game Over System

**User Story:** As a player, I want a limited number of lives so that mistakes have consequences and the game has stakes.

#### Acceptance Criteria

1. WHEN the game starts, THE Game System SHALL initialize the player with 3 lives
2. WHEN the Player Character loses a life, THE Game System SHALL reset the Player Character position to the starting location
3. WHEN the player lives reach 0, THE Game System SHALL display a game over screen showing the final score
4. WHEN the game over screen is displayed, THE Game System SHALL provide an option to restart the game by pressing the R key
5. THE Game System SHALL display the current number of lives remaining in the status bar area at all times

### Requirement 7: Level Progression System

**User Story:** As a player, I want to progress through increasingly difficult levels, so that the game remains challenging and engaging.

#### Acceptance Criteria

1. WHEN all enemies in the current level are defeated, THE Game System SHALL advance to the next level after 2 seconds
2. WHEN advancing to a new level, THE Game System SHALL reset the dirt grid to full coverage
3. WHEN advancing to a new level, THE Game System SHALL increase the total enemy count by 1 enemy up to a maximum of 8 enemies
4. WHEN advancing to a new level, THE Game System SHALL increase enemy movement speed by 10 percent up to a maximum of 200 percent of base speed
5. THE Game System SHALL display the current level number in the status bar area at all times

### Requirement 8: Enemy AI Behavior

**User Story:** As a player, I want enemies to behave intelligently and become more aggressive over time, so that the game feels dynamic and challenging.

#### Acceptance Criteria

1. WHILE an enemy is choosing a movement direction, THE Game System SHALL calculate the shortest path to the Player Character using Manhattan distance
2. WHEN an enemy has been alive for more than 30 seconds, THE Game System SHALL increase that enemy movement speed by 20 percent
3. WHEN an enemy is in ghost mode moving through dirt, THE Game System SHALL render the enemy with 50 percent opacity
4. WHEN an enemy transitions from dirt to tunnel, THE Game System SHALL render the enemy with 100 percent opacity
5. THE Game System SHALL prevent enemies from moving outside the dirt grid boundaries
