# 0 A.D. Integration Architecture Design

**Status**: Design Phase  
**Date**: 2026-07-07  
**Purpose**: Define optimal integration strategy for AI Commander adapter

---

## 1. COMMUNICATION MECHANISM (Recommended)

### Challenge

0 A.D. has **no built-in remote API** for external process communication. It's designed for:
- Single-machine gameplay
- Peer-to-peer multiplayer
- Built-in AI via JavaScript

### Solution: Process-Based IPC

**Architecture**:
```
[AI Commander]
    |
    v (spawn + manage)
[0 A.D. Process]
    |
    ├─ stdout (stream output)
    ├─ stderr (error logging)
    ├─ stdin (unused currently)
    └─ file system (save/replay files)
    |
    v (observe + control)
[File System]
    |
    ├─ Save Files (JSON state snapshots)
    ├─ Replay Files (.ogv format)
    ├─ Config Files (command-line args)
    └─ Logs (debug output)
```

### Recommended Approach: CLI + File-Based

**Mechanism**:
1. **Configuration**: Write match config to command-line arguments
2. **Execution**: Spawn 0 A.D. with command-line args
3. **Observation**: Poll save files or parse stdout
4. **Control**: Replace default AI with custom bot (JavaScript mod)
5. **Results**: Read replay file or final save state

**Advantages**:
- ✅ No game modification required
- ✅ Works with released builds
- ✅ Deterministic and reproducible
- ✅ Minimal latency concerns
- ✅ Supports batching multiple matches

**Limitations**:
- ❌ No real-time observation (only at game end or via file polling)
- ❌ No mid-game intervention (must replace AI before match)
- ❌ File I/O overhead for large state
- ❌ Loss of granular state visibility

### Alternative: Custom Mod + IPC Bridge

**If real-time observation needed**:
1. Create custom JavaScript mod for observation
2. Mod periodically writes state to file
3. External tool polls file for state updates
4. AI decisions sent back via mechanism TBD

**Trade-offs**:
- ✅ Real-time(ish) observation
- ✅ Fine-grained state visibility
- ❌ Requires custom mod development
- ❌ File I/O becomes bottleneck
- ❌ State synchronization complexity

### Decision: **Phase 1 - CLI + File-Based**

Start with simple CLI + file-based approach. If AI Commander requires real-time observation, implement Phase 2 (custom mod bridge) later.

---

## 2. RECOMMENDED COMMUNICATION MECHANISM (FINAL)

### Two-Phase Strategy

**Phase 1: Batch Mode (MVP)**
```
┌─────────────────────────────────────────┐
│ AI Commander Match Configuration        │
├─────────────────────────────────────────┤
│ • Players: [AI1, AI2]                   │
│ • Map: Alpine Lakes                     │
│ • Seed: 12345                           │
│ • Civs: [britons, gauls]                │
│ • Difficulties: [3, 3]                  │
└─────────────────────────────────────────┘
         |
         v (write to file)
┌─────────────────────────────────────────┐
│ .0ad-match.json (config file)           │
└─────────────────────────────────────────┘
         |
         v (CLI args)
[0 A.D. Process]
  - Load config
  - Run match to completion
  - Record replay
         |
         v (file output)
┌─────────────────────────────────────────┐
│ Replay File (.ogv)                      │
│ Save File (final state)                 │
│ Debug Log (game output)                 │
└─────────────────────────────────────────┘
         |
         v (read/parse)
┌─────────────────────────────────────────┐
│ AI Commander Results Parser             │
│ • Winner determination                  │
│ • Victory condition classification      │
│ • Match duration                        │
│ • Resource final state                  │
└─────────────────────────────────────────┘
```

**Phase 2: Real-Time Observation (Future)**
- Custom JavaScript mod for game state streaming
- Periodic JSON state export to file
- External polling of state updates
- Optional: HTTP API via side process

---

## 3. ADAPTER PACKAGE STRUCTURE

### Directory Layout

```
packages/adapter-0ad/
├── src/
│   ├── index.ts                         # Public API
│   ├── launcher.ts                      # Process management
│   ├── config.ts                        # Match configuration
│   ├── observer.ts                      # State observation & parsing
│   ├── parser/
│   │   ├── replay-parser.ts             # Parse .ogv replay files
│   │   ├── save-parser.ts               # Parse JSON save files
│   │   ├── log-parser.ts                # Parse stdout logs
│   │   └── entities.ts                  # Entity state extraction
│   ├── ai/
│   │   ├── petra-adapter.ts             # Petra AI integration
│   │   ├── custom-ai.ts                 # Custom AI bot creation
│   │   └── templates/
│   │       └── ai-bot-template.js       # Template for custom AI bots
│   ├── types.ts                         # TypeScript interfaces
│   ├── constants.ts                     # Game constants
│   └── util.ts                          # Helper functions
├── mods/
│   └── ai-commander-bridge/             # Optional observation mod
│       ├── mod.json                     # Mod metadata
│       └── simulation/
│           └── ai/
│               └── observer.js          # State observation script
├── test/
│   ├── fixtures/
│   │   ├── sample-replay.ogv            # Test replay file
│   │   ├── sample-save.json             # Test save file
│   │   └── maps/                        # Test maps
│   └── integration.test.ts              # Integration tests
└── README.md
```

### Core Interfaces

```typescript
// Match configuration
interface Match0ADConfig {
  players: PlayerConfig[];
  map: {
    name: string;           // "Alpine Lakes"
    seed?: number;          // Random seed (optional)
  };
  settings: {
    difficulty: number;     // 0-5 (0=sandbox, 5=hardest)
    cheatsEnabled: boolean;
    turnLimit?: number;
  };
}

interface PlayerConfig {
  slot: number;            // 0-7
  civilization: string;    // "britons", "gauls", etc.
  ai?: {
    name: string;          // "petra", "arch_admiral", etc.
    difficulty: number;    // 0-5
  };
}

// Match result
interface Match0ADResult {
  winner: number;          // Player slot that won
  victoryCondition: string; // "conquest", "wonder", "relics", "time_limit"
  duration: number;        // Ticks elapsed
  finalState: GameState;   // Parsed final game state
  replay: ReplayData;      // Parsed replay
}

interface GameState {
  players: PlayerState[];
  entities: EntityState[];
  tick: number;
  timeElapsed: number;
}

interface EntityState {
  id: number;
  template: string;
  owner: number;
  position: {x: number; z: number; angle: number};
  health?: number;
  state: string;
  components: Record<string, unknown>;
}
```

---

## 4. RUNTIME LIFECYCLE

### Process Lifecycle

```
[Adapter] ─spawn─> [0 A.D. Process]
    |                    |
    ├─ write config ────>│ (read from args)
    |                    ├─ setup match
    |                    ├─ run simulation
    |                    ├─ save replay
    |                    ├─ save final state
    |                    └─> (exit)
    |<─ poll files ──────┤
    |                    |
    └─ parse results ────└─> [Match Result]
```

### State Machine

```
[Starting]
    |
    v
[Waiting for Game Init]  (poll for startup)
    |
    v
[Match Running]          (game simulation in progress)
    |
    v
[Match Complete]        (game ended or time limit reached)
    |
    v
[Parsing Results]       (read replay and save file)
    |
    v
[Results Ready]         (return to caller)
```

### Timeout & Error Handling

```
[Spawn Process]
    |
    ├─ Process hangs for >5 min? → Kill and retry
    ├─ Process crashes? → Return error
    ├─ Replay file corrupted? → Return partial result
    └─ Save file missing? → Attempt recovery from logs
```

---

## 5. MATCH LIFECYCLE

### Pre-Match Setup

1. **Configuration**:
   - Create Match0ADConfig object
   - Validate player slots, civilizations
   - Select map and seed
   - Set difficulty levels

2. **File Preparation**:
   - Write config to temporary JSON
   - Prepare any custom mods

3. **Process Launch**:
   - Build command-line arguments from config
   - Spawn 0 A.D. process
   - Monitor for startup completion

### During Match

1. **Simulation**:
   - 0 A.D. runs simulation at fixed timestep
   - AI makes decisions every N ticks
   - Commands execute and state updates
   - Replay recorded continuously

2. **Monitoring** (optional):
   - Poll save files for intermediate state
   - Parse logs for game events
   - Monitor for crashes/errors

### Post-Match

1. **Termination**:
   - Match ends (victory, defeat, time limit)
   - Game saves final state
   - Replay file finalized
   - Process exits cleanly

2. **Result Collection**:
   - Read replay file
   - Parse save file (final state)
   - Extract match outcome
   - Calculate statistics

---

## 6. OBSERVATION LIFECYCLE

### State Observation Strategy

**Approach**: File-based observation (batch mode)

```
[During Match]
    |
    (0 A.D. periodically auto-saves)
    |
    v (Option A: Polling)
[External Tool Polls]
    |
    ├─ Read save file snapshot
    ├─ Parse game state JSON
    ├─ Extract entity positions/states
    ├─ Compute derived metrics
    └─> [Current Game State]

(Option B: End-of-Match Analysis)
[Match Complete]
    |
    v
[Read Replay File]
    |
    ├─ Decompress .ogv format
    ├─ Extract command sequence
    ├─ Replay and reconstruct tick-by-tick state
    └─> [Complete Game History]
```

### Observable State

**From Save File** (JSON):
- Player resources (food, wood, stone, metal)
- Entity count by type
- Building inventory
- Technology research progress
- Current phase (Village, Town, City)

**From Replay File** (.ogv):
- Complete command history
- Exact sequence of actions
- Timing of each command
- Final outcome

**From Logs** (stdout):
- Game events (unit trained, building completed)
- Error messages
- Performance metrics

### Observation Granularity

**Coarse** (end-of-match only):
- ✅ Winner determination
- ✅ Victory condition
- ✅ Final statistics
- ❌ Mid-game decisions
- ❌ Real-time state

**Fine** (periodic polling):
- ✅ Entity positions
- ✅ Resource levels
- ✅ Building state
- ❌ Sub-tick precision
- ❌ Unit AI decisions

**Ultra-Fine** (replay analysis):
- ✅ Every command executed
- ✅ Exact timing
- ✅ Deterministic reconstruction
- ❌ Subjective AI reasoning
- ❌ Real-time (only after match)

### Recommended: Coarse + Replay Analysis

For AI Commander, focus on:
1. **End-of-match outcome** (winner, victory type)
2. **Final statistics** (parsed from save file)
3. **Replay analysis** (command sequence and timing)

This provides sufficient visibility without real-time observation complexity.

---

## 7. COMMAND LIFECYCLE

### How AI Commands Work (Current Design)

In 0 A.D., AI commands are **internal only** - no external command injection is possible.

```
[Built-in AI Decision]
    |
    v (runs at fixed interval, e.g., every 5 ticks)
[JavaScript AI Logic]
    |
    ├─ Analyze game state
    ├─ Make decisions
    └─> Return command array
    |
    v (queue commands)
[Command Queue]
    |
    v (on next tick)
[Command Execution]
    |
    v
[Simulation Update]
```

### Custom AI Integration (Recommended)

**Instead of injecting commands, replace the AI**:

```
[Custom JavaScript AI Bot]
    |
    ├─ Placed in: mods/custom-ai-bot/simulation/ai/
    ├─ Loaded by: Mod system
    ├─ Executes: During game simulation
    └─> Return commands (same as built-in AI)
    |
    v (same pipeline)
[Command Queue → Execution → State Update]
```

**Advantages**:
- ✅ AI runs during simulation (not external)
- ✅ Has full access to game APIs
- ✅ Can observe full game state
- ✅ Deterministic execution
- ✅ Works with replay system

**Limitations**:
- ❌ Must define AI before match starts
- ❌ Cannot change AI mid-game
- ❌ No real-time external decision-making
- ❌ Requires JavaScript implementation

### Command Execution Model

```
Custom AI (JavaScript Mod)
    |
    v (tick % AI_INTERVAL == 0)
[Make Decision]
    |
    ├─ Query current game state
    ├─ Run decision logic (Petra-like or custom)
    ├─ Generate command array
    └─> Return commands
    |
    v (queue into command queue)
[Queue Commands]
    |
    v (next simulation tick)
[Apply Commands]
    |
    ├─ Unit.Move(x, z)
    ├─ Unit.Attack(targetId)
    ├─ Unit.Build(template, x, z)
    └─...more commands
    |
    v
[Update Simulation State]
```

### Adapter's Role

The adapter doesn't directly send commands. Instead:

1. **Before match**: Create JavaScript AI bot that implements desired strategy
2. **During match**: Let 0 A.D. run with custom AI bot
3. **After match**: Analyze replay to see what decisions were made

---

## 8. REPLAY LIFECYCLE

### Replay File Format

**Type**: `.ogv` (0 A.D. game recording)  
**Compression**: Binary, zlib-compressed  
**Content**: 
- Match metadata (players, map, seed, settings)
- Complete command sequence (all player actions)
- Deterministic simulation signature

### Replay Parsing

```
[Replay File (.ogv)]
    |
    v (decompress/parse)
[Extract Metadata]
    |
    ├─ Match start time
    ├─ Player civilizations
    ├─ Map name and seed
    └─ Game settings
    |
    v
[Extract Command Sequence]
    |
    ├─ Player 1: [cmd1, cmd2, cmd3, ...]
    ├─ Player 2: [cmd1, cmd2, cmd3, ...]
    └─ ...
    |
    v (deterministically replay)
[Reconstruct Game State]
    |
    ├─ Tick 0: Initial state
    ├─ Tick N: Apply commands from tick N-1
    ├─ Tick N+1: Apply commands from tick N
    └─ ... (repeat until match end)
    |
    v
[Extract Observations]
    |
    ├─ When was each unit trained?
    ├─ When were buildings constructed?
    ├─ Resource flow over time
    ├─ Military events (attacks, formations)
    └─ Victory condition met
```

### Replay Usage in AI Commander

**Analysis**:
1. **Strategy Classification**: Analyze command patterns to classify strategy (rush, turtle, etc.)
2. **Timing Analysis**: Extract when key events occurred
3. **Decision Tracing**: See exact sequence of player decisions
4. **Determinism Verification**: Confirm match is fully reproducible

**Comparison**:
1. **Divergence Detection**: Compare replays of same seed with different AIs
2. **Consistency Checking**: Ensure same AI produces similar strategies
3. **Performance Comparison**: Compare command frequencies and efficiency

---

## 9. ERROR HANDLING STRATEGY

### Error Categories

| Category | Example | Handling |
|----------|---------|----------|
| **Launch** | Can't find 0 A.D. executable | Fail fast, provide path suggestion |
| **Config** | Invalid civilization name | Validate before launch, return error |
| **Crash** | Game segfault | Capture stderr, log crash dump |
| **Timeout** | Game never finishes | Kill process after timeout, partial result |
| **Desync** | Multiplayer OOS | Replay from checkpoint or retry |
| **Parse** | Malformed replay file | Log error, attempt recovery, return partial |
| **IO** | Save file not created | Retry, poll for file creation |

### Recovery Strategies

**Process Failures**:
```
Process Crash
    |
    ├─ Capture last known state
    ├─ Check stderr for error message
    ├─ Attempt cleanup (kill orphaned processes)
    └─ Return error with context
```

**Timeout**:
```
Process Running > timeout
    |
    ├─ Send kill signal
    ├─ Wait for graceful shutdown
    ├─ Force kill if necessary
    └─ Attempt to parse partial results
```

**File I/O Errors**:
```
Expected File Missing
    |
    ├─ Poll with backoff (exponential delay)
    ├─ Retry N times
    ├─ Timeout after M seconds
    └─ Return error if still missing
```

### Logging & Debugging

**Captured Output**:
- stdout (game logs)
- stderr (errors)
- Crash dumps (if available)

**Retention**:
- Store on failure for debugging
- Include in error report
- Archive for analysis

---

## 10. CAPABILITY MATRIX

### Adapter Capabilities

| Capability | Support | Notes |
|------------|---------|-------|
| **Match Setup** | ✅ Full | Configure all match parameters |
| **Multiple Players** | ✅ Full | Support 2-8 player matches |
| **Custom AI** | ✅ Full | Inject JavaScript AI bot |
| **Replay Recording** | ✅ Full | Automatic via 0 A.D. |
| **Replay Analysis** | ✅ Full | Parse command sequence |
| **Real-time Observation** | ❌ No | Only possible with custom mod |
| **Mid-game Intervention** | ❌ No | AI set before match |
| **Headless Execution** | ⚠️ Partial | Renders GUI (not true headless) |
| **Determinism** | ✅ Full | Same seed = same result |
| **Network Play** | ❌ No | Matches are local only |
| **Save/Load Game** | ✅ Partial | Can load savegame as start state |
| **State Validation** | ✅ Full | Can parse final state |
| **Mod Loading** | ✅ Full | Can inject custom mods |
| **Map Variety** | ✅ Full | Supports all included maps |
| **Civilization Variety** | ✅ Full | Supports all civilizations |

### Recommended MVP Scope

**For Initial Release**:
- ✅ Match setup and configuration
- ✅ Two-player matches (P1 vs P2 AI)
- ✅ Petra AI integration
- ✅ Replay recording and parsing
- ✅ End-of-match result extraction
- ✅ Victory condition determination

**For Future Enhancement**:
- Real-time observation (custom mod)
- N-player matches (3+ players)
- Custom AI development framework
- Advanced strategy analysis
- Headless mode (if 0 A.D. adds support)

---

## 11. RISK ASSESSMENT

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Determinism Breaks** | Low | High | Use sealed 0 A.D. release, extensive testing |
| **Process Hangs** | Medium | Medium | Implement timeouts, kill signals |
| **Replay Format Changes** | Low | Medium | Pin to specific 0 A.D. version |
| **Game Crashes** | Medium | Low | Capture error logs, retry |
| **File I/O Race Conditions** | Low | Low | Poll with backoff, unique filenames |

### Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **AI Framework Incompatibility** | Low | High | Keep framework generic, minimize 0 A.D. coupling |
| **Performance Too Slow** | Medium | Medium | Profile early, optimize file I/O |
| **Mod System Changes** | Low | Medium | Monitor 0 A.D. updates, maintain mod |
| **Community 0 A.D. Divergence** | Low | Low | Use official releases, not community forks |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **0 A.D. Updates Break Compat** | Medium | High | Version pin, update testing protocol |
| **Large Match File Sizes** | Medium | Low | Archive/compress replays, clean temp files |
| **Cross-Platform Issues** | Medium | Medium | Test on Windows/Mac/Linux |
| **Licensing Compliance** | Low | High | Use official 0 A.D., document dependencies |

---

## 12. RECOMMENDED IMPLEMENTATION ROADMAP

### Phase 1: MVP - Basic Integration (Weeks 1-2)

**Objectives**:
- ✅ Spawn and manage 0 A.D. process
- ✅ Configure matches via CLI args
- ✅ Parse replay files
- ✅ Extract match outcomes

**Deliverables**:
- `@ai-commander/adapter-0ad` package
- Process launcher
- Replay parser
- Integration tests

### Phase 2: AI Integration (Weeks 3-4)

**Objectives**:
- ✅ Create JavaScript AI bot template
- ✅ Integrate Petra AI analysis
- ✅ Support custom AI mods
- ✅ Command sequence analysis

**Deliverables**:
- AI bot framework
- Petra integration guide
- Custom AI examples
- Strategy analyzer

### Phase 3: Analysis & Reporting (Weeks 5-6)

**Objectives**:
- ✅ Extract detailed game statistics
- ✅ Classify strategies from replay
- ✅ Timing and efficiency analysis
- ✅ Comparison across matches

**Deliverables**:
- Statistics extractor
- Strategy classifier
- Comparison tools
- Report templates

### Phase 4: Optimization & Polish (Weeks 7-8)

**Objectives**:
- ✅ Performance optimization
- ✅ Error handling & recovery
- ✅ Cross-platform testing
- ✅ Documentation

**Deliverables**:
- Optimized file I/O
- Comprehensive error handling
- CI/CD integration
- User documentation

### Phase 5: Advanced Features (Future)

**Objectives**:
- Real-time observation (custom mod)
- Multi-player (3+ players) support
- Advanced AI analysis
- Headless mode support (if 0 A.D. adds)

---

## ARCHITECTURAL DECISIONS

### Decision 1: CLI + File-Based IPC (vs. Mod Bridge)

**Chosen**: CLI + File-Based  
**Rationale**: 
- Simpler to implement initially
- Works with unmodified 0 A.D. releases
- No performance overhead
- Can upgrade to mod bridge later

### Decision 2: Custom AI Bot (vs. External Injection)

**Chosen**: Custom AI Bot (JavaScript mod)  
**Rationale**:
- 0 A.D. doesn't support external command injection
- JavaScript AI runs in-process (has full game access)
- Deterministic and reproducible
- Follows 0 A.D. design patterns

### Decision 3: Batch Analysis (vs. Real-Time Observation)

**Chosen**: Batch Analysis  
**Rationale**:
- MVP scope requires end result only
- Replay provides complete history
- No real-time latency concerns
- Real-time can be added later

### Decision 4: Replay File Format (vs. Save File)

**Chosen**: Both (replay primary, save secondary)  
**Rationale**:
- Replay gives complete deterministic history
- Save gives final state snapshot
- Complementary information
- Both automatically generated

### Decision 5: Version Pinning (vs. Latest)

**Chosen**: Version Pinning  
**Rationale**:
- Determinism across releases not guaranteed
- Community compatibility important
- Updates can be managed explicitly
- Minimizes surprise breakage

---

## CONCLUSION

The recommended integration strategy leverages 0 A.D.'s strengths (determinism, modding, open-source) while working around its limitations (no remote API, process-based only). 

The **CLI + File-Based + Custom AI Bot** approach is:
- **Simple**: Easy to understand and implement
- **Robust**: Works with unmodified 0 A.D. releases
- **Scalable**: Can handle batch match execution
- **Upgradeable**: Foundation for future real-time observation

This architecture provides a solid foundation for the AI Commander 0 A.D. adapter while keeping initial complexity manageable.

