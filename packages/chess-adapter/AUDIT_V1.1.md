# AUDIT V1.1: Component Classification

## Runtime Critical Components
*(Required for: Observe → Plan → Decide → Execute → Broadcast)*

### 1. **ChessGameLoop** 
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** Core orchestration loop (Observe→Decide→Execute)
- **Used By:** Integration harness, real game execution
- **Dependencies:** ChessGameSession, Brain interface, WorldState
- **Runtime Evidence:** `run()` method orchestrates full game cycle

### 2. **ChessGameSession**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** Game state management and board lifecycle
- **Used By:** ChessGameLoop, game initialization
- **Dependencies:** ChessObservationProvider, ChessCommandExecutor
- **Runtime Evidence:** Creates session, manages board state

### 3. **ChessAdapter**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** GameAdapter interface implementation (framework requirement)
- **Used By:** Framework to create chess games
- **Dependencies:** ChessGameSession, chess.js
- **Runtime Evidence:** `createSession()` instantiates game

### 4. **ChessObservationProvider**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** Board state → WorldState conversion (Observe phase)
- **Used By:** ChessGameLoop, brain observation
- **Dependencies:** chess.js, WorldState factory
- **Runtime Evidence:** `createWorldState()` called each turn

### 5. **ChessCommandExecutor**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** Brain command → move execution (Execute phase)
- **Used By:** ChessGameLoop, move validation
- **Dependencies:** chess.js, move validation
- **Runtime Evidence:** `executeCommand()` applies moves to board

### 6. **ChessDecisionTranslator**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** UCI ↔ Brain notation conversion (Decision translation)
- **Used By:** ChessGameLoop, brain decision parsing
- **Dependencies:** UCI protocol, notation helpers
- **Runtime Evidence:** Converts brain moves to UCI format

### 7. **ChessGameRecorder**
- **Status:** ✅ RUNTIME CRITICAL
- **Purpose:** PGN generation and move recording
- **Used By:** Game completion, export
- **Dependencies:** Move history, game metadata
- **Runtime Evidence:** `recordMove()` captures every move

---

## Product Feature Components
*(Used for tournaments, rankings, or user-facing features)*

### 8. **ChessTournamentManager**
- **Status:** ⚙️ PRODUCT FEATURE
- **Purpose:** ELO rating system and tournament standings
- **Used By:** Multi-match tournaments
- **Runtime Evidence:** `recordMatchResult()` updates ratings

### 9. **ChessTournamentScheduler**
- **Status:** ⚙️ PRODUCT FEATURE
- **Purpose:** Bracket generation (4 formats)
- **Used By:** Tournament orchestration
- **Runtime Evidence:** `generateBracket()` creates match list

### 10. **ChessConcurrentExecutor**
- **Status:** ⚙️ PRODUCT FEATURE
- **Purpose:** Parallel match execution
- **Used By:** Tournament execution
- **Runtime Evidence:** `start()` runs matches concurrently

### 11. **ChessResultsAggregator**
- **Status:** ⚙️ PRODUCT FEATURE
- **Purpose:** Real-time standings and analytics
- **Used By:** Leaderboard generation
- **Runtime Evidence:** `recordMatchResult()` updates standings

### 12. **ChessMetricsCollector**
- **Status:** ⚙️ PRODUCT FEATURE
- **Purpose:** Decision latency and performance metrics
- **Used By:** Analytics, performance tracking
- **Runtime Evidence:** `recordMoveMetrics()` collects data

---

## Nice to Have Components
*(Broadcasting, research, analysis - not required for core execution)*

### 13. **ChessSpectatorStreamer**
- **Status:** 🎬 NICE TO HAVE
- **Purpose:** Real-time spectator broadcasting
- **Used By:** Broadcast integration
- **Runtime Evidence:** Optional feature

### 14. **ChessBroadcastOverlay**
- **Status:** 🎬 NICE TO HAVE
- **Purpose:** UI rendering for broadcasts
- **Used By:** Overlay generation
- **Runtime Evidence:** Optional feature

### 15. **ChessBroadcastManager**
- **Status:** 🎬 NICE TO HAVE
- **Purpose:** Broadcast orchestration
- **Used By:** Broadcasting pipeline
- **Runtime Evidence:** Optional feature

### 16. **ChessResearchPlatform**
- **Status:** 🎬 NICE TO HAVE
- **Purpose:** Data analysis and export
- **Used By:** Post-game analysis
- **Runtime Evidence:** Optional feature

---

## Dead Code Components
*(Not used in runtime execution)*

### 17. **ChessEngine**
- **Status:** 💀 DEAD CODE
- **Reason:** UCI process management requires Stockfish installation; not used in Ollama-only execution
- **Risk:** Dependencies on Node child_process, no alternatives
- **Verdict:** Can be removed for Ollama-only deployment

### 18. **ChessObservationAdapter**
- **Status:** 💀 DEAD CODE
- **Reason:** Appears to be a legacy wrapper; actual observation uses ChessObservationProvider
- **Verdict:** Verify before removal

### 19. **ChessIntegrationHarness**
- **Status:** 💀 DEAD CODE
- **Reason:** Mock tournament simulator; not real game execution
- **Verdict:** Remove - uses fake match simulations

### 20. **ChessTypes**
- **Status:** ⚠️ TYPE DEFINITIONS ONLY
- **Purpose:** Shared type definitions
- **Verdict:** Keep - required for type safety

---

## Dependency Graph

```
RUNTIME CRITICAL PATH:
═════════════════════════════════════════════

ChessGameLoop (orchestrator)
├── ChessGameSession (board state)
│   ├── ChessObservationProvider (Observe)
│   │   └── chess.js
│   └── ChessCommandExecutor (Execute)
│       └── chess.js
├── Brain Interface (Plan/Decide)
│   └── ChessDecisionTranslator (notation conversion)
└── ChessGameRecorder (output)
    └── chess.js

TOURNAMENT FEATURES:
═════════════════════════════════════════════

ChessTournamentScheduler
├── Match generation
└── Bracket formats (4 types)

ChessConcurrentExecutor
└── Runs matches in parallel (uses ChessGameLoop internally)

ChessTournamentManager + ChessResultsAggregator
└── ELO ratings, standings

BROADCASTING (Optional):
═════════════════════════════════════════════

ChessBroadcastManager (optional)
├── ChessSpectatorStreamer
└── ChessBroadcastOverlay

RESEARCH (Optional):
═════════════════════════════════════════════

ChessResearchPlatform (optional)
```

---

## Summary

| Category | Count | Components |
|----------|-------|------------|
| **Runtime Critical** | 7 | GameLoop, Session, Adapter, Observation, Command, Translator, Recorder |
| **Product Features** | 5 | Tournament Manager, Scheduler, Executor, Results, Metrics |
| **Nice to Have** | 4 | Streamer, Overlay, Manager, Research |
| **Dead Code** | 3 | Engine (needs Stockfish), ObservationAdapter (legacy), IntegrationHarness (mocked) |
| **Type Definitions** | 1 | ChessTypes |

**Total: 20 components**

---

## Critical Finding

**For Ollama-only execution (two local models playing):**
- ✅ 7 runtime critical components are sufficient
- ❌ ChessEngine can be removed (requires Stockfish)
- ❌ ChessIntegrationHarness can be removed (mocked tournaments)
- ⚠️ Optional components can be disabled

**Minimum viable runtime: 7 components + chess.js library**

