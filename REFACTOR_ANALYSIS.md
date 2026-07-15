# Refactor Analysis: Extracting Game-Agnostic AI Framework

## Current Architecture Issues

1. **429 TypeScript files tightly coupled to 0 A.D.**
2. **0 A.D.-specific adapter** prevents using other games
3. **Camera system** is unnecessary for AI tournament framework
4. **RL Interface HTTP protocol** is game-specific
5. **Game state mapper** assumes 0 A.D. entity format

---

## Extractable Components (Game-Agnostic)

These can be moved to a public `@ai-commander/core` package:

### ✅ Completely Reusable
- **Tournament System** (`tournament/`)
  - EloRating system
  - Match history tracking
  - Tournament orchestration (round-robin, elimination, etc.)
  - ✅ ZERO 0 A.D. dependencies
  
- **Streaming & Broadcast** (`broadcast/`, `stream/`)
  - WebSocket server infrastructure
  - Message types for game events
  - Streaming pipeline
  - ✅ Game-agnostic (just needs JSON events)
  
- **AI Brain Framework** (`rl-interface/`, `model/`)
  - OllamaAIBrain (LLM decision-making)
  - Brain factory pattern
  - DecisionLogger
  - ✅ Not tied to specific game protocol
  
- **Analytics & Statistics** (`analytics/`)
  - Match comparison
  - Meta-gaming trends
  - Prediction system
  - ✅ Works with any game data
  
- **Config & Logger** (`config/`, `utils/`)
  - Logger abstraction
  - Configuration management
  - ✅ Pure utilities
  
- **Types & Interfaces** (`types/`)
  - Most type definitions are game-agnostic
  - Just need game-specific adaptations
  
- **Commentary & Trash Talk** (`commentary/`, `match/`)
  - Event-based commentary
  - Trash talk generation
  - ✅ Works with any game events

### ⚠️ Partially Reusable (Needs Adapter)
- **State Management** (`state/`)
  - Can be extracted but needs game-specific state format
  
- **Resilience & Recovery** (`resilience/`)
  - Generic recovery patterns
  - Game-agnostic error handling
  
- **Validation Harness** (`validation/`)
  - Can be reused with different metrics
  
- **Command System** (`commands/`)
  - Generic command structure
  - Needs game-specific command types

### ❌ 0 A.D.-Specific (Remove/Replace)
- **Camera System** (`camera/`)
  - Specific to 0 A.D. viewport control
  - Unnecessary for AI tournaments
  - **REMOVE ENTIRELY** (~50 files)
  
- **RL Interface** (`rl-interface/`)
  - HTTP protocol specific to 0 A.D.
  - Needs replacement for each game
  - Keep pattern, replace implementation
  
- **Screen Controller** (`screen/`)
  - AutoHotkey/Windows input automation
  - Only needed for 0 A.D. GUI interaction
  - **REMOVE ENTIRELY** (~30 files)
  
- **World State Mapper** (`rl-interface/world-state-mapper.ts`)
  - Converts 0 A.D. JSON to WorldState
  - Each game needs its own mapper
  
- **Game Process Management** (`process/`)
  - 0 A.D. process spawning
  - Each game needs custom launcher

---

## Proposed New Architecture

```
ai-commander/
├── packages/
│   ├── core/                    # NEW: Game-agnostic framework
│   │   ├── src/
│   │   │   ├── tournament/      # EloRating, match management
│   │   │   ├── brain/           # OllamaAIBrain, BrainFactory
│   │   │   ├── streaming/       # WebSocket broadcast
│   │   │   ├── analytics/       # Statistics & prediction
│   │   │   ├── commentary/      # Trash talk, event commentary
│   │   │   ├── types/           # TypeScript interfaces
│   │   │   └── utils/           # Generic utilities
│   │   └── package.json
│   │
│   ├── adapters/                # Game-specific implementations
│   │   ├── zeroad-adapter/      # 0 A.D. (for reference)
│   │   ├── openra-adapter/      # OpenRA adapter (if adding)
│   │   ├── chess-adapter/       # Chess adapter (example)
│   │   └── game-template/       # Template for new games
│   │
│   └── web/                     # React dashboard (unchanged)
│
└── docs/
    ├── ADAPTER_TEMPLATE.md      # How to add new games
    ├── ARCHITECTURE.md          # New modular design
    └── API_REFERENCE.md         # Core package API
```

---

## What Each Adapter Needs

To support a new game, implement:

```typescript
// game-adapter/src/game-interface.ts
export interface GameAdapter {
  // Launch the game with config
  async launchGame(config: GameConfig): Promise<GameProcess>;
  
  // Connect to game and get state
  async connectToGame(): Promise<GameClient>;
  
  // Send commands to game
  async executeCommands(commands: GameCommand[]): Promise<void>;
  
  // Get current game state
  async getGameState(): Promise<GameState>;
  
  // Map raw game state to framework WorldState
  mapToWorldState(rawState: any): WorldState;
  
  // Check if game is finished
  isGameOver(state: GameState): boolean;
}

// game-adapter/src/adapters/
export class ZeroADAdapter implements GameAdapter { ... }
export class ChessAdapter implements GameAdapter { ... }
export class OpenRAAdapter implements GameAdapter { ... }
```

---

## Migration Strategy

### Phase 1: Extract Core Package
1. Move all game-agnostic code to `packages/core/`
2. Keep 0 A.D. adapter as reference implementation
3. Create `GameAdapter` interface
4. Update imports in zeroad-adapter to use `@ai-commander/core`

### Phase 2: Remove 0 A.D.-Specific Code
1. Delete `camera/` directory (~50 files, ~2000 LOC)
2. Delete `screen/` directory (~30 files, ~1500 LOC)
3. Delete 0 A.D. process management from `process/`
4. Keep only `rl-interface/http-client.ts` pattern for reference

### Phase 3: Create Game Template
1. Document how to implement GameAdapter
2. Create example adapters for simpler games
3. Provide template for new game integration

### Phase 4: Alternative Game Implementations
1. Chess adapter (simple, turn-based, great for testing)
2. OpenRA adapter (if available API)
3. Other games as community contributions

---

## Benefits

✅ **Cleaner Codebase**: Remove 2000+ lines of 0 A.D. cruft
✅ **Reusable Framework**: Other games can use tournament/streaming/AI
✅ **Maintainable**: Clear separation of concerns
✅ **Testable**: Core components tested independently
✅ **Open Source Ready**: Can share `@ai-commander/core` publicly

---

## Recommended Games for AI Tournaments

### Tier 1: Recommended (Good APIs)
1. **Chess** (UCI protocol)
   - Pros: Simple, deterministic, perfect information
   - Cons: Turn-based only
   - Engine: Stockfish, LCZero, etc.

2. **OpenRA** (If API available)
   - Pros: RTS like 0 A.D., active community
   - Cons: Limited API exposure

3. **Board Game Arena / Tabletopia**
   - Pros: HTTP API, many games supported
   - Cons: Subscription-based

### Tier 2: Possible (Limited APIs)
4. **StarCraft II** (Python API)
   - Pros: Professional esports game
   - Cons: Proprietary, complex
   
5. **DoTA 2 / League of Legends**
   - Pros: MOBA tournaments existing
   - Cons: Very proprietary, anti-bot

6. **Go** (GTP protocol)
   - Pros: Well-defined protocol
   - Cons: Extremely complex game

### Tier 3: Not Recommended
7. **Civilization VI** (No API)
8. **Factorio** (No API)
9. **Minecraft** (Complex mod ecosystem)

---

## Immediate Actions

### HIGH PRIORITY
- [ ] Create `packages/core/` structure
- [ ] Move game-agnostic code
- [ ] Delete camera/ and screen/ directories
- [ ] Create GameAdapter interface
- [ ] Document migration in ADAPTER_TEMPLATE.md

### MEDIUM PRIORITY
- [ ] Implement Chess adapter (simple test case)
- [ ] Update tests for extracted components
- [ ] Create core package NPM publish
- [ ] Refactor zeroad-adapter to use core

### LOW PRIORITY
- [ ] OpenRA adapter (if APIs available)
- [ ] Other game adapters
- [ ] Community contribution guidelines

---

## Estimated Lines of Code

| Component | Files | LOC | Game-Specific? |
|-----------|-------|-----|---|
| camera/ | 50 | ~2000 | 100% ❌ |
| screen/ | 30 | ~1500 | 100% ❌ |
| rl-interface/ (minus HTTP client) | 25 | ~1500 | 95% ❌ |
| process/ (0 A.D. specific) | 15 | ~800 | 100% ❌ |
| **TOTAL TO REMOVE** | **120** | **~5800** | - |
| **CORE REUSABLE** | **~300** | **~15000** | 5% ✅ |

### Result: ~80% core framework, ~20% game-specific!

---

## Next Steps

1. Decide: Keep 0 A.D. or replace with Chess/OpenRA?
2. Create `packages/core/` with extracted code
3. Implement first alternative game adapter
4. Document for community contributors
5. Publish `@ai-commander/core` as npm package
