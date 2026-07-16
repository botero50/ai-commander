# AUDIT V1.4: External Dependency Verification

## Runtime Dependencies

### 1. chess.js (v1.0.0-beta.8)
**Status:** ✅ CRITICAL RUNTIME DEPENDENCY

**Where Used:**
- `chess-adapter.ts` - Game initialization
- `chess-game-session.ts` - Board state management
- `chess-observation.ts` - Legal move generation
- `chess-command.ts` - Move validation and execution
- `chess-game-recorder.ts` - PGN generation

**Verification:**
```bash
grep -r "from 'chess.js'\|import.*chess" packages/chess-adapter/src --exclude="*.test.ts"
```

**Result:** ✅ Used in 5 runtime files for:
1. Board state initialization
2. Legal move generation
3. Move validation
4. PGN export
5. Game termination detection

**Verdict:** ✅ KEEP - Core game rules engine

---

### 2. @ai-commander/contracts (workspace:*)
**Status:** ✅ FRAMEWORK DEPENDENCY

**Where Used:**
- `chess-adapter.ts` - GameAdapter interface
- `chess-game-session.ts` - GameSession interface
- `chess-observation.ts` - WorldState, Agent factories
- All brain-facing interfaces

**Verification:**
```bash
grep -r "from '@ai-commander" packages/chess-adapter/src --exclude="*.test.ts"
```

**Result:** ✅ Used for:
1. GameAdapter interface (required by framework)
2. GameSession interface (required by framework)
3. WorldState immutable factory (required by brains)
4. Command interface (required by brains)
5. Brain interface (consumed, not provided)

**Verdict:** ✅ KEEP - Framework contract

---

### 3. Node child_process (built-in)
**Status:** ❌ UNUSED IN OLLAMA DEPLOYMENT

**Where Used:**
- `chess-engine.ts` - Stockfish process management

**Verification:**
```bash
grep -r "child_process\|spawn\|exec" packages/chess-adapter/src --exclude="*.test.ts"
```

**Result:**
```
chess-engine.ts: import { spawn } from 'child_process';
```

**Usage:**
- Spawns Stockfish UCI process
- Sends commands to engine
- Parses UCI responses

**Verdict:** ❌ REMOVE FOR OLLAMA-ONLY DEPLOYMENT
- Not used when brains are Ollama models
- Requires Stockfish installation
- Adds system dependency
- Alternative: Remove entire chess-engine.ts

---

## Dev Dependencies

### 1. TypeScript
**Status:** ✅ BUILD DEPENDENCY

**Verdict:** ✅ KEEP

### 2. Vitest + @vitest/ui
**Status:** ⚠️ TEST FRAMEWORK

**Verdict:** ⚠️ Keep but consolidate tests (remove 155 fake tests)

---

## Optional/Unused Dependencies

### ❌ Stockfish (system-level)
**Status:** NOT IN package.json

**Where Required:**
- chess-engine.ts spawns `/usr/bin/stockfish` or similar
- chess-engine.test.ts tries to use it

**Verification:**
```bash
grep -r "stockfish" packages/chess-adapter/src --exclude="*.test.ts"
```

**Result:**
```
chess-engine.ts:
  private enginePath = 'stockfish';
  this.process = spawn('stockfish', [...]);
```

**Status:** ❌ NOT AVAILABLE IN TEST ENVIRONMENT
- Tests fail: "spawn stockfish ENOENT"
- Integration tests skipped because of this

**For Ollama-only:** ✅ NOT NEEDED

---

## Dependency Graph (Runtime Critical Path)

```
ChessGameLoop (orchestrator)
├── ChessGameSession
│   ├── ChessObservationProvider
│   │   └── chess.js ✅
│   └── ChessCommandExecutor
│       └── chess.js ✅
├── Brain Interface
│   └── @ai-commander/contracts ✅
└── ChessGameRecorder
    └── chess.js ✅

NOT USED IN RUNTIME:
├── ChessEngine
│   └── child_process (Stockfish) ❌
├── ChessBroadcastManager (optional)
└── ChessIntegrationHarness (mock) ❌
```

---

## Unused Components Analysis

### Dead Code Dependency Chain

**ChessEngine** (UNUSED in Ollama):
```
child_process
└── spawn('stockfish')
```

**ChessIntegrationHarness** (MOCK):
```
Math.random
└── Fake tournament generation
```

**ChessBroadcastOverlay** (OPTIONAL):
```
No external dependencies
└── Pure data manipulation
```

**ChessBroadcastStreamer** (OPTIONAL):
```
No external dependencies
└── Message queueing
```

**ChessResearchPlatform** (OPTIONAL):
```
No external dependencies
└── Data analysis
```

---

## Actual Runtime Dependencies (Minimal)

For "Two Ollama brains play one chess game":

**Mandatory:**
1. ✅ chess.js - Board rules and validation
2. ✅ @ai-commander/contracts - Interface compatibility
3. ✅ TypeScript - Language

**NOT Needed:**
- ❌ Stockfish
- ❌ Child process management
- ❌ Integration harness
- ❌ Broadcasting
- ❌ Tournament management
- ❌ Research platform

---

## Summary

| Dependency | Used | Required | Verdict |
|------------|------|----------|---------|
| chess.js | Yes | Yes | ✅ KEEP |
| @ai-commander/contracts | Yes | Yes | ✅ KEEP |
| TypeScript | Yes | Yes | ✅ KEEP |
| child_process | Stockfish only | No | ❌ REMOVE (or make optional) |
| Stockfish | chess-engine.ts | No | ❌ NOT IN PACKAGE.JSON |
| Vitest | Tests | Yes | ✅ KEEP |

---

## Recommendation

**For Minimal Ollama Deployment:**

1. Remove chess-engine.ts entirely
2. Remove chess-engine.test.ts entirely
3. Keep only 7 runtime critical components
4. Dependencies reduce to: chess.js + contracts

**Actual minimal package.json:**
```json
{
  "dependencies": {
    "@ai-commander/contracts": "workspace:*",
    "chess.js": "^1.0.0-beta.8"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^0.34.0"
  }
}
```

**Removed implicit dependencies:**
- ❌ child_process (system dependency)
- ❌ Stockfish (system dependency)
- ❌ Node >18 (if using earlier)

