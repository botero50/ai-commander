# EPIC 1.4: Inject Commands into 0 A.D. Command Queue

**Status**: Planning  
**Date**: 2026-07-07  
**Goal**: Convert JSON commands to 0 A.D. format and queue via PostNetworkCommand()

---

## Overview

Implement the command reception and injection path:
- **Read** JSON commands written by external controller
- **Convert** JSON → 0 A.D. command format
- **Queue** via PostNetworkCommand() before FlushTurn()
- **Verify** determinism (same commands = reproducible game state)

Success = Commands from external process deterministically affect game

---

## Implementation Strategy

### Phase 1: Command Format Converter (Day 1)

#### 1.1: JSON → 0 A.D. Format Mapping

**File**: `source/simulation2/js-interface/CommandConverter.js` (new)

```javascript
/**
 * CommandConverter: Converts JSON commands to 0 A.D. format
 * Ensures deterministic command execution
 */

class CommandConverter {
  /**
   * Convert external JSON command to 0 A.D. format
   */
  static convert(jsonCommand) {
    const type = jsonCommand.type;

    switch (type) {
      case 'unit.move':
        return CommandConverter.createMoveCommand(jsonCommand);
      
      case 'unit.attack':
        return CommandConverter.createAttackCommand(jsonCommand);
      
      case 'unit.patrol':
        return CommandConverter.createPatrolCommand(jsonCommand);
      
      case 'building.train':
        return CommandConverter.createTrainCommand(jsonCommand);
      
      case 'building.research':
        return CommandConverter.createResearchCommand(jsonCommand);
      
      default:
        throw new Error(`Unknown command type: ${type}`);
    }
  }

  static createMoveCommand(json) {
    // Validate required fields
    if (!json.entities || !json.x || !json.z) {
      throw new Error('Move command requires: entities, x, z');
    }

    return {
      type: 'move',
      entities: json.entities,
      x: json.x,
      z: json.z,
      queued: json.queued || false,
      formation: json.formation || 'loose'
    };
  }

  static createAttackCommand(json) {
    // Format: attack entity/position
    if (!json.entities || !json.target) {
      throw new Error('Attack command requires: entities, target');
    }

    return {
      type: 'attack',
      entities: json.entities,
      target: json.target,
      allowCapture: json.allowCapture !== false,
      queued: json.queued || false
    };
  }

  static createPatrolCommand(json) {
    if (!json.entities || !json.x || !json.z) {
      throw new Error('Patrol command requires: entities, x, z');
    }

    return {
      type: 'patrol',
      entities: json.entities,
      x: json.x,
      z: json.z,
      queued: json.queued || false
    };
  }

  static createTrainCommand(json) {
    if (!json.entity || !json.template) {
      throw new Error('Train command requires: entity, template');
    }

    return {
      type: 'train',
      entity: json.entity,
      template: json.template,
      count: json.count || 1
    };
  }

  static createResearchCommand(json) {
    if (!json.entity || !json.technology) {
      throw new Error('Research command requires: entity, technology');
    }

    return {
      type: 'research',
      entity: json.entity,
      technology: json.technology
    };
  }

  /**
   * Validate command has all required fields
   */
  static validate(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('Command must be an object');
    }

    if (!command.type) {
      throw new Error('Command must have a type field');
    }

    // Type-specific validation
    switch (command.type) {
      case 'move':
        if (!Array.isArray(command.entities) || command.entities.length === 0) {
          throw new Error('Move command entities must be non-empty array');
        }
        if (typeof command.x !== 'number' || typeof command.z !== 'number') {
          throw new Error('Move command x and z must be numbers');
        }
        break;

      case 'attack':
        if (!Array.isArray(command.entities) || command.entities.length === 0) {
          throw new Error('Attack command entities must be non-empty array');
        }
        if (typeof command.target !== 'number') {
          throw new Error('Attack command target must be entity ID (number)');
        }
        break;

      case 'train':
        if (typeof command.entity !== 'number') {
          throw new Error('Train command entity must be entity ID (number)');
        }
        if (typeof command.template !== 'string') {
          throw new Error('Train command template must be string');
        }
        break;
    }

    return true;
  }
}

module.exports = CommandConverter;
```

---

### Phase 2: Command Queue Hook (Day 1-2)

#### 2.1: File-Based Command Queue

**File**: `source/simulation2/js-interface/CommandQueueListener.js` (new)

```javascript
/**
 * CommandQueueListener
 * Monitors file for external commands and injects into 0 A.D. queue
 */

class CommandQueueListener {
  constructor(config = {}) {
    this.config = {
      commandFile: config.commandFile || 'cache/command.json',
      commandReadyFile: config.commandReadyFile || 'cache/command.ready',
      playerID: config.playerID || 1,
      ...config
    };

    this.commandQueue = [];
    this.processedCommands = new Set();
    this.converter = CommandConverter;
  }

  /**
   * Called once per tick to check for new commands
   */
  onTickUpdate(cmpCommandQueue) {
    // Read any new commands from file
    this.checkForNewCommands();

    // Process queued commands
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      
      try {
        // Convert JSON to 0 A.D. format
        const adCommand = this.converter.convert(command.jsonCommand);

        // Validate before queuing
        this.converter.validate(adCommand);

        // Queue in 0 A.D.
        // This must be called BEFORE FlushTurn()
        this.queueCommand(cmpCommandQueue, adCommand);

        // Mark as processed
        this.processedCommands.add(command.sequenceID);

        console.log(`[COMMAND] Queued: ${command.jsonCommand.type}`);
      } catch (err) {
        console.error(`[COMMAND ERROR] Failed to queue command: ${err.message}`);
        console.error(`[COMMAND ERROR] Command was: ${JSON.stringify(command)}`);
      }
    }

    // Signal that commands have been read (delete marker file)
    this.clearCommandReady();
  }

  checkForNewCommands() {
    try {
      // Read command file if it exists
      const fs = require('fs');
      
      if (!fs.existsSync(this.config.commandFile)) {
        return; // File not yet written
      }

      const content = fs.readFileSync(this.config.commandFile, 'utf8');
      const jsonCommand = JSON.parse(content);

      // Check if we've already processed this command
      // (Use sequenceID to avoid duplicate processing)
      if (jsonCommand.sequenceID && 
          this.processedCommands.has(jsonCommand.sequenceID)) {
        return; // Already processed
      }

      // Add to queue for processing
      this.commandQueue.push({
        jsonCommand: jsonCommand,
        sequenceID: jsonCommand.sequenceID || Date.now(),
        receivedTime: Date.now()
      });

      console.log(`[COMMAND] Received: ${jsonCommand.type}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[COMMAND FILE ERROR] ${err.message}`);
      }
    }
  }

  queueCommand(cmpCommandQueue, adCommand) {
    // Convert command to proper format expected by PostNetworkCommand
    // This varies by command type, but general pattern is:
    
    // Create command object
    const command = {
      type: 'PlayerCommand',
      playerID: this.config.playerID,
      action: adCommand.type,
      ...adCommand
    };

    // Queue it in the command system
    // Note: This must be called during OnUpdate, BEFORE FlushTurn()
    cmpCommandQueue.PostNetworkCommand(command);
  }

  clearCommandReady() {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.config.commandReadyFile)) {
        fs.unlinkSync(this.config.commandReadyFile);
      }
    } catch (err) {
      // Ignore errors
    }
  }
}

module.exports = CommandQueueListener;
```

#### 2.2: Hook into Tick Cycle

**File**: `source/simulation2/components/AIManager.js` (modify existing)

```javascript
// Add to existing AIManager component

class AIManager {
  OnUpdate(msg) {
    // ... existing code ...

    // NEW: Check for external commands
    if (this.commandListener) {
      const cmpCommandQueue = QueryComponent(SYSTEM_ENTITY, 'CommandQueue');
      this.commandListener.onTickUpdate(cmpCommandQueue);
    }

    // ... rest of existing code ...
  }

  // Add initialization
  SetupCommandListener(config) {
    this.commandListener = new CommandQueueListener(config);
    console.log('[AIManager] Command listener initialized');
  }
}
```

---

### Phase 3: Determinism Verification (Day 2)

#### 3.1: Create Replay Comparison Tool

**File**: `poc/verify-determinism.js`

```javascript
/**
 * Determinism Verifier
 * Compares two replays with same commands to verify deterministic execution
 */

const fs = require('fs');
const crypto = require('crypto');

class DeterminismVerifier {
  /**
   * Run two matches with identical commands
   * Verify they produce identical state hashes
   */
  static async verifyDeterminism(commands, numMatches = 2) {
    console.log(`Running ${numMatches} matches with identical commands...`);

    const results = [];

    for (let i = 0; i < numMatches; i++) {
      console.log(`\nMatch ${i + 1}:`);
      
      // Write commands to file
      this.writeCommandsToFile(commands);

      // Start 0 A.D. match
      const matchResult = await this.runMatch(300); // 5-minute match

      // Collect replay and state hashes
      const replay = this.parseReplay(matchResult.replayFile);
      const stateHashes = this.extractStateHashes(replay);

      results.push({
        matchNum: i + 1,
        stateHashes: stateHashes,
        finalState: this.computeFinalStateHash(stateHashes)
      });

      console.log(`Final state hash: ${results[i].finalState}`);
    }

    // Compare results
    return this.compareResults(results);
  }

  static writeCommandsToFile(commands) {
    // Write commands in sequence to be read by game
    // Game will read and execute in order
  }

  static async runMatch(durationSeconds) {
    // Start game, wait for duration, collect results
    // Returns: { replayFile: path, stateFile: path }
  }

  static parseReplay(replayFile) {
    // Parse replay file and extract state hashes
  }

  static extractStateHashes(replay) {
    // Get state hash at each tick boundary
    // Returns: [hash1, hash2, hash3, ...]
  }

  static computeFinalStateHash(stateHashes) {
    // Compute final hash from all intermediate hashes
    return crypto.createHash('sha256')
      .update(JSON.stringify(stateHashes))
      .digest('hex');
  }

  static compareResults(results) {
    // Check if all matches have identical final state
    const firstFinal = results[0].finalState;
    const allSame = results.every(r => r.finalState === firstFinal);

    if (allSame) {
      console.log('\n✅ DETERMINISM VERIFIED');
      console.log(`All ${results.length} matches produced identical final state`);
      return { verified: true, matches: results.length };
    } else {
      console.log('\n❌ DETERMINISM VIOLATION DETECTED');
      results.forEach((r, i) => {
        console.log(`Match ${i + 1}: ${r.finalState}`);
      });
      return { verified: false, matches: results.length, results: results };
    }
  }
}

module.exports = DeterminismVerifier;
```

---

### Phase 4: Integration Testing (Day 2-3)

#### 4.1: Command Injection Test

**Test Procedure**:
```bash
# 1. Start 0 A.D. with state observation enabled
# 2. Start external controller
# 3. External controller sends commands:
#    - Move units
#    - Attack enemies
#    - Build structures

# Expected: Commands execute within next tick
```

#### 4.2: Determinism Test

```bash
# Run two identical matches with same command sequence
# Compare final state hashes
# Expected: Identical final state

node poc/verify-determinism.js
```

---

## Success Metrics for EPIC 1.4

✅ **Commands injected and executed**
- [ ] JSON commands converted to 0 A.D. format
- [ ] Commands queued via PostNetworkCommand()
- [ ] Commands execute in correct order
- [ ] Determinism verified (identical commands = identical outcome)
- [ ] No game crashes or instability
- [ ] Command execution visible in game

---

## Deliverables for EPIC 1.4

1. **Command Converter** (`CommandConverter.js`)
   - JSON → 0 A.D. format mapping
   - Validation logic
   - Type-specific handlers

2. **Queue Listener** (`CommandQueueListener.js`)
   - Monitors for new commands
   - Injects into queue
   - Handles errors gracefully

3. **AIManager Hook** (modified)
   - Calls CommandQueueListener.onTickUpdate()
   - Integrates with tick cycle

4. **Determinism Verifier** (`verify-determinism.js`)
   - Runs two matches with identical commands
   - Compares final state hashes
   - Confirms deterministic execution

5. **Test Results**
   - Command injection working
   - Determinism verified
   - Performance metrics

---

## Next Steps (EPIC 1.5)

Once command injection is proven:
1. Run full Observe → Plan → Decide → Execute loop
2. Measure end-to-end latency
3. Document all findings
4. Assess framework compatibility

---

**Estimated Timeline**: 2 days (implementation + testing)
