# EPIC 1.3: Build External Node.js Controller Process

**Status**: Planning  
**Date**: 2026-07-07  
**Goal**: Create external decision-making process to complete Observe → Decide → Execute loop

---

## Overview

Build a standalone Node.js process that:
- **Listens** for JSON state from 0 A.D. (file-based or IPC)
- **Processes** state and makes deterministic decisions
- **Sends** JSON commands back to 0 A.D.
- **Measures** round-trip IPC latency

Success = prove external Brain can maintain loop without restarting game

---

## Implementation Strategy

### Phase 1: IPC Communication Layer (Day 1)

#### 1.1: State Listener (File-based for PoC)

**File**: `poc/external-controller/state-listener.js`

```javascript
const fs = require('fs');
const path = require('path');

class StateListener {
  constructor(stateFilePath, onStateReceived) {
    this.stateFilePath = stateFilePath;
    this.onStateReceived = onStateReceived;
    this.lastModified = 0;
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    console.log(`Listening for state on: ${this.stateFilePath}`);
    
    // Poll for state file changes every 5ms
    this.pollInterval = setInterval(() => {
      this.checkForNewState();
    }, 5);
  }

  stop() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  checkForNewState() {
    try {
      const stats = fs.statSync(this.stateFilePath);
      
      // Check if file was modified since last read
      if (stats.mtimeMs > this.lastModified) {
        this.lastModified = stats.mtimeMs;
        
        // Read and parse state
        const content = fs.readFileSync(this.stateFilePath, 'utf8');
        const state = JSON.parse(content);
        
        // Notify listener
        this.onStateReceived(state);
      }
    } catch (err) {
      // File not yet written, or parsing error
      if (err.code !== 'ENOENT') {
        console.error('Error reading state file:', err.message);
      }
    }
  }
}

module.exports = StateListener;
```

#### 1.2: Command Sender (File-based for PoC)

**File**: `poc/external-controller/command-sender.js`

```javascript
const fs = require('fs');
const path = require('path');

class CommandSender {
  constructor(commandFilePath, commandReadyFilePath) {
    this.commandFilePath = commandFilePath;
    this.commandReadyFilePath = commandReadyFilePath;
  }

  /**
   * Send a command to 0 A.D.
   * Returns promise that resolves when command is read by game
   */
  async sendCommand(command) {
    const startTime = Date.now();
    
    // Write command to file
    fs.writeFileSync(
      this.commandFilePath,
      JSON.stringify({
        ...command,
        timestamp: startTime,
        sequenceID: Date.now()
      })
    );
    
    // Create marker file to signal command is ready
    fs.writeFileSync(this.commandReadyFilePath, '');
    
    // Wait for game to read command (timeout: 200ms)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command read timeout (game may not be listening)'));
      }, 200);
      
      const checkInterval = setInterval(() => {
        try {
          // If marker file is deleted, game has read the command
          if (!fs.existsSync(this.commandReadyFilePath)) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            
            const endTime = Date.now();
            resolve({
              latency: endTime - startTime,
              sequenceID: startTime
            });
          }
        } catch (err) {
          // Ignore errors
        }
      }, 5);
    });
  }
}

module.exports = CommandSender;
```

---

### Phase 2: Deterministic Decision Engine (Day 1-2)

#### 2.1: Simple AI (For PoC - Hardcoded Behavior)

**File**: `poc/external-controller/simple-ai.js`

```javascript
/**
 * Simple AI for PoC
 * Makes deterministic decisions based on game state
 * Real AI would integrate Claude, GPT, etc.
 */

class SimpleAI {
  constructor() {
    this.state = null;
    this.lastDecisionTime = 0;
  }

  /**
   * Update with new game state
   */
  setState(state) {
    this.state = state;
  }

  /**
   * Make decision and return command
   * Deterministic: same state → same command
   */
  decide() {
    const startTime = Date.now();
    
    if (!this.state) {
      return null; // No state yet
    }

    // Simple PoC behavior:
    // 1. If we have idle units, move them toward enemy
    // 2. If we have resources, train units at barracks
    // 3. Always maintain defensive stance

    const commands = [];

    // Strategy 1: Move idle units toward enemy
    const idleUnits = this.findIdleUnits();
    if (idleUnits.length > 0) {
      const targetPosition = this.findEnemyPosition();
      if (targetPosition) {
        commands.push(this.createMoveCommand(idleUnits, targetPosition));
      }
    }

    // Strategy 2: Train units if we have resources
    const barracks = this.findBuilding('barracks');
    if (barracks && this.hasEnoughResources()) {
      commands.push(this.createTrainCommand(barracks, 'infantry'));
    }

    // Pick first command (deterministic)
    const command = commands.length > 0 ? commands[0] : null;

    const endTime = Date.now();
    console.log(`Decision made in ${endTime - startTime}ms: ${JSON.stringify(command)}`);

    return command;
  }

  findIdleUnits() {
    // Find units not currently doing anything
    if (!this.state || !this.state.entities) return [];

    return this.state.entities.filter(entity => {
      return entity.owner === 1 && // Our player
             entity.class === 'Unit' &&
             (!entity.orders || entity.orders.length === 0);
    });
  }

  findEnemyPosition() {
    // Find center of enemy units
    if (!this.state || !this.state.entities) return null;

    const enemyUnits = this.state.entities.filter(e => e.owner === 2);
    if (enemyUnits.length === 0) return null;

    const avgX = enemyUnits.reduce((sum, u) => sum + u.position.x, 0) / enemyUnits.length;
    const avgZ = enemyUnits.reduce((sum, u) => sum + u.position.z, 0) / enemyUnits.length;

    return { x: avgX, z: avgZ };
  }

  findBuilding(type) {
    if (!this.state || !this.state.entities) return null;

    return this.state.entities.find(entity => {
      return entity.owner === 1 &&
             entity.class === 'Building' &&
             entity.type === type;
    });
  }

  hasEnoughResources() {
    if (!this.state || !this.state.players) return false;

    const player = this.state.players.find(p => p.playerID === 1);
    return player && player.resources.food >= 50;
  }

  createMoveCommand(units, target) {
    return {
      type: 'unit.move',
      entities: units.map(u => u.id),
      x: target.x,
      z: target.z,
      queued: false
    };
  }

  createTrainCommand(building, unitType) {
    return {
      type: 'entity.production.train',
      entity: building.id,
      template: `units/brit/${unitType}`,
      count: 1
    };
  }
}

module.exports = SimpleAI;
```

---

### Phase 3: Controller Main Process (Day 2)

#### 3.1: Main Loop

**File**: `poc/external-controller/controller.js`

```javascript
const fs = require('fs');
const path = require('path');
const StateListener = require('./state-listener');
const CommandSender = require('./command-sender');
const SimpleAI = require('./simple-ai');

/**
 * ExternalController
 * Main loop for external decision-making process
 */
class ExternalController {
  constructor(config = {}) {
    this.config = {
      stateFile: path.join(process.env.HOME || process.env.USERPROFILE, 
                           '.local/share/0ad/cache/observation.json'),
      commandFile: path.join(process.env.HOME || process.env.USERPROFILE,
                             '.local/share/0ad/cache/command.json'),
      commandReadyFile: path.join(process.env.HOME || process.env.USERPROFILE,
                                  '.local/share/0ad/cache/command.ready'),
      decisionInterval: 100, // ms between decisions (can be slower than game)
      ...config
    };

    this.stateListener = new StateListener(this.config.stateFile, 
      (state) => this.handleStateReceived(state));
    this.commandSender = new CommandSender(this.config.commandFile,
      this.config.commandReadyFile);
    this.ai = new SimpleAI();

    this.stats = {
      statesReceived: 0,
      commandsSent: 0,
      totalLatency: 0,
      lastObservationTime: 0,
      lastDecisionTime: 0,
      lastExecutionTime: 0
    };

    this.lastDecisionTime = 0;
  }

  start() {
    console.log('Starting external controller...');
    console.log(`Config:`, this.config);

    this.stateListener.start();

    // Main decision loop (independent of game tick rate)
    this.decisionInterval = setInterval(() => {
      this.makeDecision();
    }, this.config.decisionInterval);

    console.log('Controller running. Waiting for state from 0 A.D...');
  }

  stop() {
    clearInterval(this.decisionInterval);
    this.stateListener.stop();
    this.printStats();
  }

  handleStateReceived(state) {
    const now = Date.now();
    this.stats.lastObservationTime = now;
    this.stats.statesReceived++;

    // Update AI with new state
    this.ai.setState(state);

    console.log(`[OBSERVE] Tick ${state.tick}, Entities: ${state.entities?.length || 0}`);
  }

  async makeDecision() {
    const decisionStart = Date.now();

    // Only make decision if we have recent state (within last 500ms)
    if (this.stats.lastObservationTime === 0 ||
        decisionStart - this.stats.lastObservationTime > 500) {
      return; // Waiting for state from game
    }

    // Ask AI for decision
    const command = this.ai.decide();
    if (!command) return; // No decision yet

    this.stats.lastDecisionTime = decisionStart;

    // Send command to game
    try {
      const result = await this.commandSender.sendCommand(command);
      
      this.stats.commandsSent++;
      this.stats.lastExecutionTime = Date.now();
      this.stats.totalLatency += result.latency;

      const avgLatency = this.stats.totalLatency / this.stats.commandsSent;
      console.log(`[EXECUTE] Command sent: ${command.type}, Latency: ${result.latency}ms, Avg: ${avgLatency.toFixed(1)}ms`);
    } catch (err) {
      console.error(`[ERROR] Failed to send command: ${err.message}`);
    }
  }

  printStats() {
    console.log('\n=== Final Statistics ===');
    console.log(`States received: ${this.stats.statesReceived}`);
    console.log(`Commands sent: ${this.stats.commandsSent}`);
    console.log(`Average latency: ${(this.stats.totalLatency / Math.max(1, this.stats.commandsSent)).toFixed(1)}ms`);
    console.log(`Duration: ${(this.stats.lastExecutionTime - this.stats.lastObservationTime) / 1000}s`);
  }
}

// Main execution
if (require.main === module) {
  const controller = new ExternalController();
  controller.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    controller.stop();
    process.exit(0);
  });
}

module.exports = ExternalController;
```

---

### Phase 4: Testing (Day 2-3)

#### 4.1: Startup Test

```bash
# Terminal 1: Start 0 A.D.
# Create 1v1 skirmish match
# Game will write state to observation.json every tick

# Terminal 2: Start controller
node poc/external-controller/controller.js

# Expected output:
# [OBSERVE] Tick 100, Entities: 45
# [DECIDE] Decision made in 2ms: { type: 'unit.move', ... }
# [EXECUTE] Command sent: unit.move, Latency: 15ms, Avg: 14.2ms
```

#### 4.2: Measure Latency

**Latency Breakdown**:
```
1. State written to file by 0 A.D.: ~5ms
2. Controller polls and reads file: ~2ms
3. Decision making: ~2-5ms
4. Write command to file: ~1ms
5. 0 A.D. reads command: ~5ms
────────────────────────────────
Total round-trip: ~20-25ms
```

**Success Criteria**:
- [ ] Controller receives state within 50ms of tick
- [ ] Decision made within 10ms
- [ ] Command received by game within 50ms
- [ ] Total loop: < 100ms per iteration
- [ ] No crashes over 5+ minutes
- [ ] Can send commands at 1+ Hz

#### 4.3: Stability Test

**5-Minute Test**:
```bash
# Start match
# Run controller for 5 minutes (6000 ticks)
# Record:
#   - States received: Expected ~100 (at 1 observation per 50ms)
#   - Commands sent: Expected ~50 (at 1 command per 100ms)
#   - Latency distribution
#   - Any errors or crashes
```

---

## Success Metrics for EPIC 1.3

✅ **External controller implemented**
- [ ] StateListener polls for new state
- [ ] SimpleAI makes deterministic decisions
- [ ] CommandSender writes commands to file
- [ ] IPC latency measured and documented
- [ ] Loop runs for 5+ minutes without issues
- [ ] Latency < 100ms per decision cycle

---

## Deliverables for EPIC 1.3

1. **State Listener** (`state-listener.js`)
   - Polls file for new observations
   - Parses JSON state
   - Triggers on-state-received callback

2. **Decision Engine** (`simple-ai.js`)
   - Makes deterministic decisions
   - Outputs JSON commands
   - < 5ms per decision

3. **Command Sender** (`command-sender.js`)
   - Writes JSON commands to file
   - Waits for game to read
   - Measures latency

4. **Main Controller** (`controller.js`)
   - Runs independent decision loop
   - Manages IPC communication
   - Records performance metrics

5. **Test Results**
   - Latency measurements
   - Stability report (5+ minute run)
   - Command delivery rate
   - Performance profile

---

## Next Steps (EPIC 1.4)

Once external controller is proven:
1. Modify 0 A.D. to read commands from file
2. Convert JSON commands to 0 A.D. format
3. Inject via PostNetworkCommand()
4. Verify determinism (same commands = same game)

---

**Estimated Timeline**: 2 days (implementation + testing)
