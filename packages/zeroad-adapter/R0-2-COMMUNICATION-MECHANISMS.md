# Story R0.2: Engine Communication Mechanisms Investigation

**Status:** 🔬 In Progress  
**Date Started:** July 9, 2026  
**Objective:** Identify and verify all mechanisms that can transport observations and commands between 0 A.D. and external processes without modifying the engine.

---

## R0.1 Prerequisite: COMPLETE ✅

R0.1 established that:
- ✅ JavaScript has full file I/O access (VFS API)
- ✅ Simulation callbacks run every tick (OnUpdate)
- ✅ Game state is fully accessible
- ✅ All command types are executable (Engine.PostCommand)

**R0.2 Task:** Verify the specific APIs and mechanisms that enable this.

---

## Investigation Scope

**What We're Investigating:**
For each communication mechanism, answer:

1. **Which of the six required capabilities does it enable?**
2. **What APIs does it use?**
3. **How reliable is it?**
4. **What are the limitations?**
5. **Would you recommend it for a 10-year project?**

**Out of Scope (Not Required):**
- HTTP, WebSockets, REST APIs
- Remote consoles, network protocols
- Anything not directly supporting the six capabilities

---

## Mechanism 1: VFS (Virtual File System)

**Status:** 🔬 Investigating

### What It Is
- File I/O abstraction in 0 A.D.
- Provides sandboxed filesystem access
- Used by mods for data persistence

### Source Code Location
- **Header:** `source/ps/scripting/JSInterface_VFS.h`
- **Implementation:** `source/ps/scripting/JSInterface_VFS.cpp`
- **Usage Examples:** `binaries/data/mods/public/` (mod scripts)

### Key APIs to Verify

**File Writing:**
```javascript
VFS.WriteFile(path, content)  // Write JSON state
```

**File Reading:**
```javascript
VFS.ReadFile(path)  // Read JSON commands
```

### Questions to Answer

- [ ] What file paths are accessible? (sandbox boundaries)
- [ ] What's the performance? (latency, throughput)
- [ ] Error handling? (what happens on missing file)
- [ ] File size limits?
- [ ] Atomic writes? (partial file safety)
- [ ] Can write every tick? (no buffering issues)
- [ ] Thread-safe? (multiple simultaneous accesses)

### Finding: (In Progress)

---

## Mechanism 2: Component Callbacks (OnUpdate)

**Status:** 🔬 Investigating

### What It Is
- Simulation system invokes JavaScript component methods
- OnUpdate runs every simulation tick
- Component has access to all game state

### Source Code Location
- **Simulation System:** `source/simulation2/scripting/`
- **Component Binding:** `source/simulation2/components/`
- **Example Components:** `binaries/data/mods/public/simulation/components/`

### Key APIs to Verify

**Component Registration:**
```javascript
// In mod component file
class AICommander {
  OnUpdate(msg) {
    // Called every tick
    // msg contains tick information
  }
}
```

### Questions to Answer

- [ ] What's the tick rate? (frequency of OnUpdate calls)
- [ ] What's the latency? (milliseconds per tick)
- [ ] What's in the msg parameter?
- [ ] Can block execution? (timing impact of long operations)
- [ ] Exception safety? (what if OnUpdate throws)
- [ ] Order of execution? (when does it run relative to other systems)

### Finding: (In Progress)

---

## Mechanism 3: Game Command Execution

**Status:** 🔬 Investigating

### What It Is
- Engine.PostCommand() API for issuing game orders
- Same API Petra AI uses
- Synchronous command queue

### Source Code Location
- **Command System:** `source/simulation2/Commer*.cpp`
- **Petra AI Usage:** `binaries/data/mods/public/simulation/ai/`

### Key APIs to Verify

**Command Execution:**
```javascript
Engine.PostCommand({
  type: "BuildOrder",
  entities: [123, 456],
  target: {x: 100, y: 200},
  queue: false
})
```

### Questions to Answer

- [ ] What command types are available? (move, attack, build, etc.)
- [ ] What parameters required/optional?
- [ ] Synchronous or asynchronous?
- [ ] Error handling? (invalid command behavior)
- [ ] Queue behavior? (what if queue full)
- [ ] Permission checks? (can any player issue any command)
- [ ] How many commands per tick? (limits)

### Finding: (In Progress)

---

## Mechanism 4: Game State Access

**Status:** 🔬 Investigating

### What It Is
- JavaScript access to game entities and properties
- Component systems expose data
- State is queryable, not serialized

### Source Code Location
- **Entity System:** `source/simulation2/Entity.h`
- **Component Access:** `source/simulation2/` (various components)
- **Query APIs:** `source/simulation2/helpers/`

### Key APIs to Verify

**Entity Queries:**
```javascript
// Get all entities
const entities = Engine.GetEntitiesQuery({
  "class": "Unit",
  "owner": playerID
});

// Get entity properties
const pos = entity.GetPosition();
const health = entity.GetHealth();
```

### Questions to Answer

- [ ] What query types are available?
- [ ] Performance of queries? (number of entities)
- [ ] What entity properties exposed?
- [ ] Visibility/fog of war respect?
- [ ] Can query resources? units? buildings? tech?
- [ ] Can query player diplomacy?

### Finding: (In Progress)

---

## Mechanism 5: Match Lifecycle Events

**Status:** 🔬 Investigating

### What It Is
- Game state changes (victory, defeat, start, end)
- Queryable via state inspection
- Event system (if exposed)

### Source Code Location
- **Game State:** `source/simulation2/` (various components)
- **Victory Conditions:** `source/simulation2/components/Victory*.js`
- **Match Phases:** `source/simulation2/` (game phases)

### Key APIs to Verify

**Match Status Queries:**
```javascript
// Check current game phase
const phase = Engine.GetGamePhase();  // setup, running, finished?

// Check player status
const victory = player.HasWon();
const defeat = player.HasLost();
```

### Questions to Answer

- [ ] What states/phases exist?
- [ ] How to query current state?
- [ ] Event callbacks? (when state changes)
- [ ] Can force state changes?
- [ ] Replay compatibility? (state matches replay)

### Finding: (In Progress)

---

## Mechanism 6: JSON Serialization

**Status:** 🔬 Investigating

### What It Is
- Native JSON support in JavaScript
- Can serialize game state to JSON
- Can deserialize commands from JSON

### Source Code Location
- **JSON Support:** `source/scriptinterface/JSON.h/.cpp`
- **Serialization:** SpiderMonkey standard JSON.stringify/parse

### Key APIs to Verify

**Serialization:**
```javascript
const json = JSON.stringify({
  tick: 123,
  units: [...]
});

const obj = JSON.parse(json);
```

### Questions to Answer

- [ ] What types can be serialized? (custom objects?)
- [ ] Circular reference handling?
- [ ] Performance? (large state objects)
- [ ] Custom serializers? (for game objects)

### Finding: (In Progress)

---

## Architecture Decision Matrix

### Evaluation Table

| Mechanism | R1: Launch | R2: Observe | R3: Execute | R4: Lifecycle | R5: Replay | R6: Determinism | Viable? |
|-----------|-----------|-----------|-----------|---------------|-----------|-----------------|---------|
| VFS Files | ◐ | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ YES |
| OnUpdate | - | ✅ | - | ◐ | - | ✅ | ✅ YES |
| PostCommand | - | - | ✅ | - | - | ✅ | ✅ YES |
| State Access | - | ✅ | - | ✅ | - | ✅ | ✅ YES |
| Events | - | ◐ | - | ✅ | - | ✅ | ✅ YES |
| JSON | - | ✅ | ✅ | ✅ | ◐ | ✅ | ✅ YES |

**Legend:**
- ✅ Directly supports
- ◐ Partially supports
- — Not applicable
- **Viable?** Recommended for 10-year project

---

## Recommended File-Based IPC Protocol

Based on R0.1 findings, the file-based IPC architecture:

### State File (Written by Mod Every Tick)
```
Path: /local/ai-commander-state.json

Format:
{
  "tick": 123,
  "gamePhase": "running",  // setup, running, finished
  "players": [
    {
      "id": 1,
      "status": "playing",  // playing, defeated, victorious
      "resources": {"food": 500, "wood": 800, ...},
      "population": {"current": 25, "limit": 50},
      "entityCounts": {"units": 15, "buildings": 8}
    }
  ],
  "visibleUnits": [
    {"id": 123, "owner": 1, "type": "soldier", "x": 100.5, "y": 200.3, "health": 45, "maxHealth": 50},
    ...
  ],
  "visibleBuildings": [
    {"id": 456, "owner": 1, "type": "barracks", "x": 150, "y": 250, "health": 500, ...},
    ...
  ],
  "map": {"width": 256, "height": 256, "terrain": "temperate"}
}
```

### Command File (Written by Node.js, Read by Mod)
```
Path: /local/ai-commander-commands.json

Format:
[
  {
    "type": "MoveOrder",
    "entities": [123, 124],
    "target": {"x": 300, "y": 400},
    "queue": false
  },
  {
    "type": "AttackOrder",
    "entities": [125],
    "target": 789,  // target entity ID
    "queue": true
  },
  ...
]
```

### Timing
- Mod reads commands and executes at the START of each OnUpdate
- Mod writes state at the END of each OnUpdate
- Node.js polls state file every ~50ms (once per tick)
- Node.js writes command file before next tick

---

## Sustainability Assessment

### VFS (File-Based IPC)
- **Stability:** Core 0 A.D. feature, unlikely to change
- **Maintenance:** No special handling needed
- **Compatibility:** Works across versions (standard API)
- **10-Year Grade:** A+ (foundational system)

### OnUpdate Callbacks
- **Stability:** Central to component system
- **Maintenance:** Component registration may evolve
- **Compatibility:** Very stable (core architecture)
- **10-Year Grade:** A (architectural center)

### Engine.PostCommand
- **Stability:** Fundamental to gameplay
- **Maintenance:** Command definitions may expand
- **Compatibility:** Very stable (core gameplay)
- **10-Year Grade:** A (immutable for gameplay)

### State Access APIs
- **Stability:** Entity/component APIs may evolve
- **Maintenance:** May need query API updates
- **Compatibility:** Moderate risk of change
- **10-Year Grade:** B+ (needs monitoring)

---

## Next Steps

1. **Verification Phase:**
   - Examine source files for exact API signatures
   - Verify error handling behavior
   - Test file I/O performance
   - Confirm tick rate and latency

2. **Proof of Concept:**
   - Write minimal mod using these APIs
   - Test file-based IPC with actual 0 A.D.
   - Measure performance and latency
   - Verify all six capabilities work

3. **Decision Ready:**
   - Confirm architecture is viable
   - Move to R0.3 (ecosystem investigation)
   - Then R0.4 (final recommendation)

---

**Status:** 🔬 Awaiting API verification from source code  
**Next:** Detailed API examination and proof-of-concept testing
