# EPIC 14: Complete Investigation Summary

**Date:** July 23, 2026  
**Status:** ✅ INVESTIGATION COMPLETE | ⏹️ IMPLEMENTATION PENDING

---

## Three Investigations Completed

### 1. Real Runtime Analysis
**File:** `EPIC-14-REAL-RUNTIME-ANALYSIS.md`

**Finding:** The real arena exists in `arena.js` and plays real games with real AI.

**Key Points:**
- Arena.js runs autonomous game loop forever
- RealChessGame executes games via Ollama AI decisions
- Complete game/move/decision data is created
- **Data is generated but not captured** for research
- **Integration points don't exist** in current architecture

**Result:** Identified 5 specific blockers preventing research integration

---

### 2. Architecture Misalignment Analysis
**File:** `EPIC-14-INTEGRATION-BLOCKER-SUMMARY.md`

**Finding:** Integration was wired to the wrong entry point.

**Key Points:**
- I created integration in `chess-startup.ts` (dependency checker)
- Real arena is `arena.js` (game launcher)
- `pnpm chess` runs `arena.js`, not `chess-startup.ts`
- Research hooks don't exist in the actual game loop

**Result:** Complete path forward for proper integration identified

---

### 3. WebSocket/Broadcast Investigation
**File:** `EPIC-14-WEBSOCKET-BROADCAST-INVESTIGATION.md`

**Finding:** WebSocket/Broadcast components are legacy with architectural problems.

**Key Points:**
- Legacy from old streaming/web UI architecture
- Optional parameters in RealChessGame (default to null)
- **Critical bug:** Code calls methods on null (line 615)
- Not used in autonomous `arena.js`
- **Blocks clean Research Data Store integration**

**Result:** Recommendation to implement generic GameEventBus instead

---

## Consolidated Findings

### What Exists ✅
- Real autonomous arena (arena.js)
- Real game execution (RealChessGame)
- Real AI decisions (Ollama integration)
- Complete game/move/decision data generated
- Phase 2 research store implementation
- Event bus architecture

### What's Missing ⏹️
- **Integration hooks in arena.js**
  - No experiment creation
  - No run creation
  - No game result recording
  - No move recording
  - No decision recording

- **Complete move data capture**
  - Only SAN strings stored (lose FEN, latency, confidence)
  - LLM decisions discarded after parsing (lose prompt, response, tokens)
  - Positions never stored

- **Generic event system**
  - WebSocket/Broadcast tightly coupled to game logic
  - Must be replaced with decoupled event bus
  - Same pattern as ResearchEventBus

---

## Three Blocked Issues

### BLOCKER 1: Wrong Integration Entry Point
**Status:** Can be fixed by modifying `arena.js`

**Required:**
1. Add research integration to ChessArena class
2. Call startExperiment() at arena startup
3. Call startRun/recordGameResult/etc. in game loop
4. Call finishExperiment() on shutdown

**Timeline:** 2-3 hours

---

### BLOCKER 2: Incomplete Move Data
**Status:** Can be fixed by modifying RealChessGame

**Required:**
1. Preserve full moveData objects (not just SAN strings)
2. Capture LLM decision data (prompt, response, tokens)
3. Return position data from game result
4. Pass complete data to arena.js

**Timeline:** 1-2 hours

---

### BLOCKER 3: Legacy Presentation Coupling
**Status:** Can be fixed by redesigning event system

**Required:**
1. Remove broadcast/wsServer from RealChessGame
2. Implement generic GameEventBus
3. Emit: game.started, move.made, game.finished events
4. Subscribe research store to events
5. Enable other future subscribers (analytics, reporting, export)

**Timeline:** 3-4 hours

---

## Architecture After Fixes

### Current (Broken)
```
ChessArena (arena.js)
  └─ playGame()
    └─ RealChessGame.play()
      ├─ Ollama (AI decisions)
      ├─ chess.js (game state)
      └─ broadcast.processMove() [CRASHES - calls null method]
        └─ Data created but discarded

Result: No research data captured
```

### Target (After Fixes)
```
ChessArena (arena.js)
  ├─ research.startExperiment() ← Hook 1
  ├─ Game loop:
  │  ├─ research.startRun() ← Hook 2
  │  ├─ playGame()
  │  │  └─ RealChessGame.play()
  │  │     ├─ Ollama (AI decisions)
  │  │     ├─ chess.js (game state)
  │  │     └─ gameEventBus.emit('move.made') ← Event emission
  │  ├─ research.recordGameResult() ← Hook 3
  │  └─ research.finishRun() ← Hook 4
  └─ research.finishExperiment() ← Hook 5
  └─ research.stop() ← Hook 6

       ↓

GameEventBus
  ├─ ResearchDataStore ← Subscribes
  ├─ Analytics (future)
  ├─ Reporting (future)
  └─ Export (future)

Result: Complete immutable research artifacts persisted
```

---

## Implementation Sequence

### Phase 1: Fix Event System (4 hours)
1. Remove broadcast/wsServer from RealChessGame
2. Create GameEventBus in-process event system
3. Emit game lifecycle events from RealChessGame
4. Verify events emit correctly

### Phase 2: Capture Complete Data (2 hours)
1. Store full moveData objects in RealChessGame
2. Preserve LLM decision details
3. Capture position data
4. Return complete data from game result

### Phase 3: Add Arena Integration (3 hours)
1. Add research hooks to ChessArena
2. Subscribe to GameEventBus events
3. Call research record methods
4. Handle experiment/run lifecycle

### Phase 4: Validation (2 hours)
1. Run `pnpm chess` with real arena
2. Verify research.db created
3. Check data integrity
4. Measure overhead

**Total: ~11 hours of focused work**

---

## Why This Architecture is Right

### Decoupling
- ✅ Game logic independent of persistence
- ✅ Persistence independent of presentation
- ✅ Multiple subscribers possible
- ✅ No tight coupling

### Event-Driven
- ✅ Aligns with EPIC 14 philosophy
- ✅ Same pattern as ResearchEventBus
- ✅ Extensible for future systems
- ✅ Clean separation of concerns

### Data Completeness
- ✅ Captures full immutable artifacts
- ✅ No data loss
- ✅ Scientific reproducibility
- ✅ Complete decision trail

### Future-Proof
- ✅ Analytics can subscribe to events
- ✅ Reporting can subscribe to events
- ✅ Export can subscribe to events
- ✅ No modification to core game logic needed

---

## Next Steps

### Do NOT Proceed With Current Code
1. Don't use `chess-startup.ts` (wrong entry point)
2. Don't use mock game generation (violates principles)
3. Don't integrate with broadcast layer (legacy coupling)

### Do This Instead
1. **Design GameEventBus interface** — Define events RealChessGame should emit
2. **Implement GameEventBus** — Generic in-process event system
3. **Refactor RealChessGame** — Emit events instead of broadcast calls
4. **Add arena.js hooks** — Wire research integration
5. **Modify for complete data** — Preserve full move/decision/position data
6. **Test with real arena** — Run `pnpm chess` and validate

---

## Conclusion

All blockers have been identified, understood, and have clear solutions.

The issue is **architectural alignment**, not missing functionality:
- Real arena ✅ works
- Research store ✅ works
- They just need to be **properly connected** via **generic events**

The path forward is clear:
1. Generic event system (GameEventBus)
2. Research integration hooks
3. Complete data capture
4. Real validation

**Ready to implement with confidence.**

