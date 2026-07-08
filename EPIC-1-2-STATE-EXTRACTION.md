# EPIC 1.2: Extract Live World State at Tick Boundary

**Status**: Implementation planning  
**Date**: 2026-07-07  
**Goal**: Implement and test state serialization hook for live observation

---

## Overview

This epic implements the first hook: live state observation at tick boundaries. Success means:
- 0 A.D. exports full game state as JSON at each tick
- Latency < 30ms per observation
- Can observe 5+ consecutive ticks without restart
- Format ready for external Brain processing

---

## Implementation Strategy

### Phase 1: Setup (Day 1)

#### 1.1: Install 0 A.D. Development Environment

```bash
# Clone the active repository (Gitea, not deprecated GitHub)
git clone https://gitea.wildfiregames.com/0ad/0ad.git
cd 0ad

# Build from source
# See https://trac.wildfiregames.com/wiki/BuildInstructions
# Tested on: Linux, macOS, Windows MSVC

# For Windows (recommended for testing):
# Use MSVC 2017+ or follow Windows build guide
```

**Goal**: Get 0 A.D. compiling and running locally

#### 1.2: Verify Development Build

```bash
# Run with JavaScript debugging enabled
# Look for: "Simulation2" log messages
# Verify tick rate: ~20 Hz expected

# Start a test match: Single-player skirmish
# Smallest map, 1v1 AI opponent
# 5-minute match to test
```

---

### Phase 2: Identify Hook Point (Day 1-2)

#### 2.1: Locate Tick Boundary

**Option A: Message System Hook** (Preferred)

0 A.D. components use a message passing system. At each tick:

```cpp
// In Simulation2::Update()
CMessageUpdate msg(deltaTime);
GetSimulation()->GetComponentManager()->BroadcastMessage(msg);
```

JavaScript can subscribe to this:

```javascript
// In a component's Init()
cmpThis.OnUpdate = function(msg) {
  // Called every tick
  // This is our observation window
};
```

**Where to Add**: Minimal JavaScript component registration

**Files to Check**:
- `simulation2/Simulation2.cpp` - Main tick entry
- `simulation2/SimpleComponent.h` - Component message interface
- Any `.js` file in `simulation/components/` for examples

---

#### 2.2: Verify Hook Timing

**Measurement Plan**:
1. Add timestamp at OnUpdate start
2. Add timestamp at OnUpdate end
3. Log delta between timestamps
4. Expected: ~1-5ms per tick for overhead

**Success**: Hook fires exactly once per tick, ~50ms apart

---

### Phase 3: Implement State Serialization (Day 2-3)

#### 3.1: Create State Extraction Module

**File**: `simulation/js-interface/StateSerializer.js` (new file)

```javascript
/**
 * StateSerializer: Exports game state to JSON
 * Called once per tick during observation window
 */

class StateSerializer {
  constructor(cmpPlayerManager, cmpRangeManager, cmpTerrain) {
    this.cmpPlayerManager = cmpPlayerManager;
    this.cmpRangeManager = cmpRangeManager;
    this.cmpTerrain = cmpTerrain;
  }

  serialize() {
    const state = {
      tick: this.getTick(),
      players: this.serializePlayers(),
      entities: this.serializeEntities(),
      map: this.serializeMap(),
      timestamp: Date.now()
    };
    return state;
  }

  getTick() {
    // Get current simulation tick number
    const cmpTimer = QueryComponent(SYSTEM_ENTITY, "Timer");
    return cmpTimer.GetCurrentTurn();
  }

  serializePlayers() {
    // Extract all players and their state
    const players = [];
    for (let playerID = 1; playerID < this.cmpPlayerManager.GetNumPlayers(); playerID++) {
      const cmpPlayer = this.cmpPlayerManager.GetPlayerByID(playerID);
      
      players.push({
        playerID: playerID,
        civName: cmpPlayer.GetCiv(),
        diplomacy: this.serializeDiplomacy(playerID),
        resources: this.serializeResources(cmpPlayer),
        population: this.serializePopulation(cmpPlayer)
      });
    }
    return players;
  }

  serializeEntities() {
    // Walk entity manager and extract all units/buildings
    const entities = [];
    
    // Get all living entities
    for (let ent of GetEntityCollection()) {
      const cmpOwnership = QueryComponent(ent, "Ownership");
      if (!cmpOwnership) continue; // Not owned, skip
      
      const entity = {
        id: ent,
        owner: cmpOwnership.GetOwner(),
        class: this.getEntityClass(ent),
        type: this.getEntityType(ent),
        ...this.serializePosition(ent),
        ...this.serializeHealth(ent),
        ...this.serializeUnitState(ent)
      };
      
      entities.push(entity);
    }
    
    return entities;
  }

  serializePosition(ent) {
    const cmpPosition = QueryComponent(ent, "Position");
    if (!cmpPosition) return {};
    
    const pos = cmpPosition.GetPosition();
    return {
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: cmpPosition.GetRotation().y
    };
  }

  serializeHealth(ent) {
    const cmpHealth = QueryComponent(ent, "Health");
    if (!cmpHealth) return {};
    
    return {
      health: cmpHealth.GetHitpoints(),
      maxHealth: cmpHealth.GetMaxHitpoints()
    };
  }

  serializeUnitState(ent) {
    // Unit-specific state
    const cmpUnitAI = QueryComponent(ent, "UnitAI");
    const cmpResourceGatherer = QueryComponent(ent, "ResourceGatherer");
    const cmpProduction = QueryComponent(ent, "Production");
    
    let state = {};
    
    if (cmpUnitAI) {
      state.stance = cmpUnitAI.GetCurrentStance();
      state.orders = cmpUnitAI.GetOrders();
    }
    
    if (cmpResourceGatherer) {
      state.carrying = cmpResourceGatherer.GetCarryingStatus();
    }
    
    if (cmpProduction) {
      state.production = cmpProduction.GetQueue();
    }
    
    return state;
  }

  serializeMap() {
    // Map dimensions and terrain
    const cmpTerrain = QueryComponent(SYSTEM_ENTITY, "Terrain");
    return {
      width: cmpTerrain.GetMapSize(),
      height: cmpTerrain.GetMapSize(),
      terrain: "temperate" // Simplified for PoC
    };
  }

  // Helper methods
  getEntityClass(ent) {
    const cmpIdentity = QueryComponent(ent, "Identity");
    if (!cmpIdentity) return "Unknown";
    return cmpIdentity.GetClass();
  }

  getEntityType(ent) {
    const cmpIdentity = QueryComponent(ent, "Identity");
    if (!cmpIdentity) return "Unknown";
    return cmpIdentity.GetSpecificName();
  }

  serializeDiplomacy(playerID) {
    // Relations with other players
    const cmpDiplomacy = QueryComponent(playerID, "Diplomacy");
    if (!cmpDiplomacy) return {};
    
    const diplomacy = {};
    for (let i = 1; i < this.cmpPlayerManager.GetNumPlayers(); i++) {
      if (i === playerID) continue;
      diplomacy[i] = cmpDiplomacy.GetDiplomacyString(i);
    }
    return diplomacy;
  }

  serializeResources(cmpPlayer) {
    // Player resources
    return {
      food: cmpPlayer.GetResourceCounts().food,
      wood: cmpPlayer.GetResourceCounts().wood,
      stone: cmpPlayer.GetResourceCounts().stone,
      metal: cmpPlayer.GetResourceCounts().metal
    };
  }

  serializePopulation(cmpPlayer) {
    // Population count
    return {
      current: cmpPlayer.GetPopulationCount(),
      max: cmpPlayer.GetPopulationLimit()
    };
  }
}
```

**Note**: Exact component names and APIs may vary - consult actual 0 A.D. source

---

#### 3.2: Hook into Tick Cycle

**File**: `simulation/components/AIManager.js` (modify existing or create hook)

```javascript
/**
 * Hook into tick cycle for state observation
 */

class AIManagerObserver {
  constructor() {
    this.serializer = null;
    this.stateObservers = [];
    this.lastObservationTime = 0;
  }

  OnUpdate(msg) {
    // Called once per tick automatically
    
    // Initialize on first call
    if (!this.serializer) {
      this.setupSerializer();
    }

    // Mark start of observation window
    const startTime = performance.now();

    // Serialize state
    const state = this.serializer.serialize();

    // Mark end of observation window
    const endTime = performance.now();
    const latency = endTime - startTime;

    // Notify external observers
    this.publishStateObservation({
      state: state,
      latency: latency,
      observationTime: startTime
    });

    // Log for debugging
    if (latency > 30) {
      warn(`State serialization took ${latency}ms (target: <30ms)`);
    }
  }

  setupSerializer() {
    const cmpPlayerManager = QueryComponent(SYSTEM_ENTITY, "PlayerManager");
    const cmpRangeManager = QueryComponent(SYSTEM_ENTITY, "RangeManager");
    const cmpTerrain = QueryComponent(SYSTEM_ENTITY, "Terrain");

    this.serializer = new StateSerializer(
      cmpPlayerManager,
      cmpRangeManager,
      cmpTerrain
    );
  }

  publishStateObservation(observation) {
    // Publish to all registered observers
    // Used by IPC layer to send to external process
    this.stateObservers.forEach(observer => {
      observer(observation);
    });

    // Also write to file for IPC testing
    this.writeStateToFile(observation);
  }

  writeStateToFile(observation) {
    // Write JSON to a file in the game's writable directory
    // Path: ~/.local/share/0ad/cache/observation.json (Linux)
    //       ~/Library/Application Support/0 A.D/cache/observation.json (macOS)
    //       %APPDATA%\0ad\cache\observation.json (Windows)
    
    // This requires calling into C++ to write files
    // Or use debug console output as fallback
  }

  registerObserver(callback) {
    this.stateObservers.push(callback);
  }
}
```

**Hook Point**: Register this component and ensure OnUpdate() is called each tick

---

### Phase 4: Test State Extraction (Day 3)

#### 4.1: Verify Hook Fires

**Test Setup**:
```bash
# Start game in debug mode
# Play a 2-minute test match (1v1 skirmish)
# Check logs for state serialization messages
```

**Expected Output** (every 50ms):
```
[STATE] Tick 120, Entities: 45, Latency: 8ms
[STATE] Tick 121, Entities: 45, Latency: 7ms
[STATE] Tick 122, Entities: 46, Latency: 9ms
```

#### 4.2: Verify JSON Format

**Sample Output**:
```json
{
  "tick": 120,
  "players": [
    {
      "playerID": 1,
      "civName": "brit",
      "resources": { "food": 1200, "wood": 600, "stone": 150, "metal": 50 },
      "population": { "current": 35, "max": 60 }
    },
    {
      "playerID": 2,
      "civName": "gaul",
      "resources": { "food": 1000, "wood": 400, "stone": 200, "metal": 100 },
      "population": { "current": 28, "max": 50 }
    }
  ],
  "entities": [
    {
      "id": 1,
      "owner": 1,
      "class": "Unit",
      "type": "infantry",
      "position": { "x": 150.5, "y": 10.2, "z": 200.3 },
      "rotation": 1.57,
      "health": 45,
      "maxHealth": 60,
      "stance": "aggressive"
    },
    ...
  ],
  "map": { "width": 256, "height": 256 },
  "timestamp": 1688640120000
}
```

#### 4.3: Measure Latency

**Methodology**:
```javascript
// Time the entire observation cycle
const start = performance.now();

// 1. Call state serializer
const state = serializer.serialize();

// 2. Convert to JSON
const json = JSON.stringify(state);

// 3. Write to IPC (file or socket)
writeToIPC(json);

const end = performance.now();
console.log(`Total observation latency: ${end - start}ms`);
```

**Success Criteria**:
- [ ] Single observation latency: < 30ms
- [ ] Multiple observations: consistent latency
- [ ] No memory leaks over 1000+ observations
- [ ] No performance degradation over time

#### 4.4: Run Consecutive Observations

**Test Procedure**:
1. Start match (1v1 skirmish, 3 minutes)
2. Observe state at every tick (20 times per second)
3. Record latency for each observation
4. Capture 5+ minutes of data (6000+ observations)
5. Analyze for:
   - Average latency
   - Max latency
   - Outliers
   - Stability

**Expected Results**:
- Average latency: 5-15ms
- Max latency: < 30ms
- Outliers: < 5% of observations
- No game crashes or instability

---

## Success Metrics for EPIC 1.2

✅ **State extraction hook implemented**
- [ ] 0 A.D. compiles and runs locally
- [ ] Hook fires exactly once per tick
- [ ] State serialization to JSON works
- [ ] Latency < 30ms per observation
- [ ] 5+ consecutive observations without issue
- [ ] JSON format matches specification
- [ ] No game restart required

---

## Deliverables for EPIC 1.2

1. **Working State Serializer** (`StateSerializer.js`)
   - Exports full game state to JSON
   - Called once per tick
   - < 30ms latency per observation

2. **Hook Implementation** (`AIManagerObserver.js` or equivalent)
   - Registered with tick system
   - Publishes observations to external system

3. **Test Results Document**
   - Latency measurements (average, max, distribution)
   - 5+ minute observation log
   - Format validation
   - No crashes or issues

4. **Findings**
   - Actual observation window duration
   - Serialization overhead
   - Component access performance
   - Ready for command injection phase

---

## Risk Assessment

**Low Risk**:
- ✅ No core engine modifications needed
- ✅ JavaScript-only changes
- ✅ Can be reverted easily
- ✅ No multiplayer synchronization impact

**Potential Issues**:
- 🟡 Component API differences (handle per-version)
- 🟡 Performance on slower machines (optimize as needed)
- 🟡 File I/O for IPC (use sockets if available)

---

## Next Steps (EPIC 1.3)

Once state extraction is proven:
1. Build external Node.js controller process
2. Listen for JSON state from 0 A.D.
3. Make deterministic decisions (hardcoded AI)
4. Send JSON commands back to game
5. Measure IPC latency

---

**Estimated Timeline**: 3 days (setup + implementation + testing)
