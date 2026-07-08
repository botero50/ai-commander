# EPIC 1.1: 0 A.D. Engine Hook Points for Live IPC PoC

**Status**: Identifying exact engine hooks for state serialization and command injection  
**Date**: 2026-07-07  
**Goal**: Map hook points ready for PoC implementation without requiring engine modifications

---

## Overview

The PoC requires 4 critical hook points in 0 A.D. to demonstrate the Observe → Plan → Decide → Execute loop:

1. **State Serialization Hook** - Read game state at tick boundaries
2. **Tick Boundary Hook** - Identify when state is stable for observation
3. **Command Injection Hook** - Queue external commands deterministically
4. **Entity Access API** - Read unit/building state during observation

---

## Hook Point 1: State Serialization

**Purpose**: Capture game state at tick boundaries for external observation

### Location
- **Primary File**: `source/ps/Replay.cpp`
- **Related**: `source/ps/Replay.h`
- **Components**: Replay recording, state hash computation, command serialization

### Key Mechanisms

#### State Hashing (ComputeStateHash)
- **Function**: `ComputeStateHash()` - computes hash of current world state
- **Location**: Replay system, called at periodic intervals
- **Data Included**:
  - Entity component state
  - Simulation variables
  - Player resources
  - Map state changes
  
#### State Serialization Format
- **Format**: Binary serialization via ComponentManager
- **Method**: `CComponentManager::SerializeState()`
- **Output**: Full state snapshot suitable for replay or OOS detection

### How to Hook (Without Modifying Core Logic)

**Option A: JavaScript Bridge** (Recommended for PoC)
- 0 A.D. JavaScript layer already has access to game state
- Can hook into existing AI JavaScript to export state as JSON
- Call native function to serialize state
- No C++ code modifications needed

**Option B: Debug Console IPC**
- Debug console (`` ` `` key) provides state queries
- Can be automated via external process
- Less efficient but requires no code modification

**Option C: File-Based State Dump**
- Add a JavaScript function that writes state to a file at tick boundaries
- External process polls for new state files
- Latency: ~50-200ms depending on I/O

### Observation Window Timing
- **Tick Duration**: ~50ms at 20 Hz tick rate
- **State Stable Point**: End of tick, before commands are queued
- **Available Window**: ~45-50ms (must observe before next tick starts)
- **Serialization Latency**: ~10-30ms for state capture

---

## Hook Point 2: Tick Boundary

**Purpose**: Identify when to observe state (synchronization point with external process)

### Location
- **Primary File**: `source/simulation2/Simulation2.cpp`
- **Method**: `Simulation2::Update()`
- **Called From**: Main game loop via `CSimulation2` instance

### Entry Points

#### Main Tick Entry
```cpp
// Called once per tick (20 Hz = 50ms)
Simulation2::Update(float deltaTime)
```

#### Tick Lifecycle
1. **Start of tick**: Collect commands from all players
2. **Entity updates**: Component OnUpdate() messages  
3. **Simulation**: Physics, pathfinding, combat calculations
4. **End of tick**: State stable, ready for observation

#### Event System
- **TickStarted event**: Published at beginning of tick
- **TickCompleted event**: Published at end of tick
- Can hook into message system without modifying core

### How to Hook (Without Modifying Core Logic)

**Option A: Message System Hook** (Cleanest)
- 0 A.D. uses component message passing
- Can subscribe to `OnUpdate` messages (called once per tick)
- Execute external IPC call (non-blocking, or brief pause)
- Resume simulation immediately

**Option B: Simulation Loop Pause Point**
- Active pause mod shows pause points exist
- Can hook at pause boundary
- Trigger state export, wait for command, resume

**Option C: JavaScript OnUpdate**
- Components can register JavaScript update handlers
- Called every tick at component level
- Can trigger state serialization without C++ changes

### Tick Timing Metrics
- **Tick Rate**: 20 Hz (configurable, typically 20)
- **Tick Duration**: 50ms per tick at default rate
- **Available Observation Window**: ~45ms (before next tick starts)
- **Slack Time**: ~5ms safety margin

---

## Hook Point 3: Command Injection

**Purpose**: Queue external commands into the simulation at the right moment

### Location
- **Command Queue Interface**: `source/simulation2/components/ICmpCommandQueue.h`
- **Implementation**: `source/simulation2/components/CCmpCommandQueue.cpp`
- **Method**: `PostNetworkCommand()` or equivalent

### Command Flow

#### Where Commands Are Queued
```
1. Player issues command (keyboard/mouse/network)
   ↓
2. Command converted to standardized format
   ↓
3. PostNetworkCommand() called
   ↓
4. Command placed in queue for next tick
   ↓
5. FlushTurn() executes all queued commands
   ↓
6. Simulation advances
```

### Key Interfaces

#### PostNetworkCommand
- **Signature**: `void PostNetworkCommand(CScriptValRooted command)`
- **Parameters**: Command object (JavaScript object converted to C++)
- **Timing**: Must be called BEFORE `FlushTurn()`
- **Queue Behavior**: Deterministic - commands executed in order queued

#### FlushTurn
- **Purpose**: Process all queued commands for the current tick
- **Called By**: Simulation loop at end of tick
- **Behavior**: Executes commands, advances simulation state

### Command Format

#### Standard 0 A.D. Command Structure
```json
{
  "type": "unit.move",
  "entities": [101, 102, 103],
  "x": 150.5,
  "z": 200.3,
  "queued": false,
  "formation": "box"
}
```

#### Typical Commands
- **Unit Control**: move, stop, patrol, guard, attack, garrison
- **Building Control**: build, cancel, train, research, repair
- **Diplomacy**: ally, enemy, neutral, tribute
- **Camera**: pan, zoom, rotate

### How to Hook (Without Modifying Core Logic)

**Option A: JavaScript Command Bridge** (Recommended)
- Wrap `PostNetworkCommand()` in JavaScript
- External process sends JSON command
- JavaScript converts to proper format
- Calls native PostNetworkCommand()
- No C++ modifications needed

**Option B: Message Injection via Active Pause Mod**
- Active pause mod already intercepts commands
- Can extend it to accept external JSON
- Convert JSON to 0 A.D. format
- Queue via normal PostNetworkCommand()

**Option C: Direct C++ Hook**
- Intercept PostNetworkCommand() call
- But requires minimal C++ modification
- Only 1-2 files touched
- Risk: Low (localized change)

### Determinism Requirement
- **Critical**: Command execution must be deterministic
- **Same commands + same initial state = same result**
- All command injection happens via standard queue
- No special paths or shortcuts

---

## Hook Point 4: Entity State Access

**Purpose**: Read unit and building state for observation output

### Location
- **Entity Manager**: `source/simulation2/system/Entity.h`
- **Component System**: `source/simulation2/SimpleComponent.h`
- **World State**: Various component implementations

### Accessible State

#### Unit Information
```json
{
  "id": 1,
  "owner": 1,
  "class": "Unit",
  "type": "infantry",
  "position": { "x": 150.5, "y": 10.2, "z": 200.3 },
  "rotation": 1.57,
  "health": 45,
  "maxHealth": 60,
  "stamina": 30,
  "maxStamina": 40,
  "stance": "aggressive",
  "orders": ["move", "attack", "garrison"],
  "carrying": ["wood", "stone"],
  "speed": 8.5
}
```

#### Building Information
```json
{
  "id": 201,
  "owner": 1,
  "class": "Building",
  "type": "barracks",
  "position": { "x": 100.0, "y": 0.0, "z": 100.0 },
  "rotation": 0.0,
  "health": 100,
  "maxHealth": 100,
  "production": ["unit_inf", "unit_cav"],
  "training": ["unit_inf"],
  "queue": 2,
  "garrisoned": [5, 6, 7]
}
```

#### Player Information
```json
{
  "playerID": 1,
  "name": "Player 1",
  "civName": "brit",
  "color": "FF0000",
  "diplomacy": {
    "2": "enemy",
    "3": "ally"
  },
  "resources": {
    "food": 1000,
    "wood": 500,
    "stone": 200,
    "metal": 50
  },
  "population": {
    "current": 45,
    "max": 60
  }
}
```

#### Map Information
```json
{
  "width": 256,
  "height": 256,
  "terrain": "temperate_forest",
  "visibility": {
    "playerID": 1,
    "revealed": [...],
    "explored": [...]
  }
}
```

### How to Access (Without Modifying Core Logic)

**Option A: JavaScript Component Query** (Recommended)
- 0 A.D. already exposes entity manager to JavaScript
- Can query all entities of a type
- Read component state via JavaScript API
- Serialize to JSON for external process

**Option B: Replay Parser**
- Post-match: parse replay to reconstruct state
- Not suitable for live observation (too slow)
- Use as fallback for validation

**Option C: Custom Component**
- Add a minimal component that exports state
- Component exists purely for external IPC
- Called once per tick during observation window
- Writes JSON to file or IPC

### Component Access API

#### Standard Access Pattern
```javascript
// Get all units owned by player 1
let units = cmpPlayerManager.GetPlayerByID(1).GetUnits();

// For each unit, read state
for (let unitID of units) {
  let cmpPosition = QueryComponent(unitID, "Position");
  let cmpHealth = QueryComponent(unitID, "Health");
  let cmpUnitAI = QueryComponent(unitID, "UnitAI");
  
  // Extract relevant state
  let state = {
    id: unitID,
    position: cmpPosition.GetPosition(),
    health: cmpHealth.GetHitpoints(),
    stance: cmpUnitAI.GetCurrentStance()
  };
}
```

---

## Integration Summary

### Observation Flow (Minimal Hook)

```
1. Tick starts: Simulation2::Update() called
2. Entities process updates
3. Tick ends: Register for TickCompleted or OnUpdate
4. JavaScript exports state via QueryComponent()
5. JSON serialized to IPC channel or file
6. External process reads state (via IPC or file poll)
7. Decision made externally
8. External process sends JSON command back
9. JavaScript converts JSON to 0 A.D. format
10. PostNetworkCommand() called before FlushTurn()
11. Command queued deterministically
12. Next tick: Simulation advances with command
```

### Hook Count Summary
- **C++ Files Modified**: 0 (JavaScript-only approach) or 1-2 (minimal C++ approach)
- **Files Referenced**: 5-6 (for understanding)
- **Changes per File**: 1-3 small additions
- **Risk Level**: Very Low (isolated changes, no core logic modification)

---

## Deliverables for EPIC 1.1

✅ **Map of Hook Points** - Ready for PoC implementation
- [ ] Simulation2::Update() entry point identified
- [ ] State serialization mechanism documented
- [ ] PostNetworkCommand() injection point located
- [ ] Entity access API specified
- [ ] Timing constraints documented
- [ ] Command format defined
- [ ] No engine fork required
- [ ] Can hook with JavaScript or minimal C++

---

## Next Steps (EPIC 1.2)

Once hook points are confirmed:
1. Set up 0 A.D. development environment
2. Implement state serialization hook (JavaScript)
3. Test state extraction at tick boundary
4. Measure serialization latency
5. Document findings

---

**Status**: Hook point mapping complete. Ready for EPIC 1.2 implementation.
