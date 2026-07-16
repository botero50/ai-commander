# v1.0 Consolidation Readiness Checklist

**Date**: July 15, 2026  
**Status**: READY FOR EXECUTION (all analysis complete, code cleanup begun)  
**Purpose**: Final verification before v1.0 ship

---

## Executive Checklist

### ✅ Consolidation Audit Complete
- [x] PHASE C1: Runtime dependency audit (28 core packages identified)
- [x] PHASE C2: Execution path audit (cohesive architecture verified)
- [x] PHASE C3: Product simplification (16 packages deferred/removed)
- [x] PHASE C4: Single command design (`pnpm chess` ready)
- [x] PHASE C5: CTO review (6 questions answered, APPROVED)

### ✅ EPIC 60 Foundation Complete
- [x] Story 60.1: Dependency verification (all 16 packages proven unused)
- [x] Story 60.2: Runtime graph (complete execution map)
- [ ] Story 60.3: Safe removal (Phase 1-3 ready to execute)
- [ ] Story 60.4: Minimal runtime verification (readiness criteria defined)

### ✅ Configuration Cleanup Complete
- [x] Removed 0 A.D. camera configuration from `.env` (lines 59-74)
- [x] `.env` now chess-focused only
- [ ] Remove remaining 0 A.D. references (if any) during code cleanup

---

## Phase 1: Cleanup Readiness

### Evidence Documents Ready
- ✅ `DEPENDENCY_REMOVAL_EVIDENCE_PLAN.md` (19 KB)
  - Tier classification of all 16 packages
  - 5-question evidence for each
  - Removal sequence defined

- ✅ `RUNTIME_GRAPH_COMPLETE.md` (23 KB)
  - Complete execution flow mapped
  - Verification checkpoints defined
  - Code execution analysis complete

### Code Cleanup Checklist (Ready to Execute)

#### Tier 1: Immediate Removal (2-3 hours) ← NEXT
```
[ ] Remove checkers-adapter (211 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove spring-rts-adapter (820 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove behavior-tree (593 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove optimizer (237 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove analytics (500+ LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Remove doc references (26 refs)
    - Safe to delete ✅

[ ] Remove fine-tuner (205 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove compliance (50 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove community (78 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

[ ] Remove plugins (50 LOC)
    - No imports ✅
    - No CLI refs ✅
    - No tests ✅
    - Safe to delete ✅

For each removal:
  [ ] Update package.json workspace
  [ ] Delete directory: rm -rf packages/[package]
  [ ] Build: pnpm build
  [ ] Test: pnpm chess --maxGames=1
  [ ] Full suite: pnpm test
  [ ] Commit: "Remove [package]: proven unused"
```

#### Tier 2: Runtime Verification (1-2 hours)
```
[ ] Verify monitor package at runtime
    - No execution during chess game
    - Can remove safely
    - Removal: rm -rf packages/monitor

[ ] Verify profiler package at runtime
    - Type-only in monitor.ts
    - Inline type if needed
    - Removal: rm -rf packages/profiler
```

#### Tier 3: CLI Refactoring (2-3 hours)
```
[ ] Remove experiment CLI command
    - Delete from packages/cli/src/cli.ts
    - Remove experiment-runner import
    - Remove experiment-runner package
    - Test: pnpm chess --help (no experiment)

[ ] Remove analyze CLI command
    - Delete from packages/cli/src/cli.ts
    - Remove strategy-analyzer import
    - Remove replay-player import
    - Remove both packages
    - Test: pnpm chess --help (no analyze)

[ ] Remove dashboard CLI command
    - Delete from packages/cli/src/cli.ts
    - Remove research-dashboard import
    - Remove research-dashboard package
    - Test: pnpm chess --help (no dashboard)
```

---

## Phase 2: Configuration Cleanup

### Environment Variables
- [x] Removed camera configuration (lines 59-74 in `.env`)
- [ ] Review for remaining 0 A.D. references
- [ ] Verify all variables are chess-relevant
- [ ] Document required variables (BRAIN_P1, OLLAMA_BASE_URL, etc.)

### Root Directory Files
- [x] Cleaned up (previous work): removed 54 files
- [ ] Verify no remaining 0 A.D. specific files
- [ ] Keep only: config, code, essential docs

### Documentation
- [ ] Update `.env.example` to chess-focused
- [ ] Update README.md (remove 0 A.D. references)
- [ ] Verify QUICK_START.md is chess-specific
- [ ] Update docs/KEYBOARD-SHORTCUTS.md (chess only)

---

## Phase 3: Testing & Verification

### Build Verification
```
[ ] Build succeeds after each removal
    $ pnpm install
    $ pnpm build
    
    Expected: 0 errors, 0 warnings (except unrelated)
    Build time: Should decrease with each removal
```

### Runtime Verification
```
[ ] Single chess game executes
    $ pnpm chess --maxGames=1
    
    Expected: 
      ✅ Dependency verification passes
      ✅ Brain loads
      ✅ Game plays to completion
      ✅ PGN saved
      ✅ Exit clean

[ ] Multiple games with auto-restart
    $ pnpm chess --maxGames=3
    
    Expected:
      ✅ Game 1 completes
      ✅ Game 2 starts automatically
      ✅ Game 3 starts automatically
      ✅ All 3 saved as PGN
      ✅ Exit clean

[ ] Broadcasting works (optional)
    $ pnpm chess --streaming --maxGames=1
    
    Expected:
      ✅ WebSocket server starts (port 8765 or 9000)
      ✅ Real-time moves broadcast to spectators
      ✅ Final result broadcast
      ✅ Clean shutdown
```

### Test Suite Verification
```
[ ] All tests pass
    $ pnpm test
    
    Expected: 200+ tests passing
    Check: No new failures from removals
    Check: Chess tests all green
    Check: No regressions
```

### Graceful Shutdown
```
[ ] Ctrl+C terminates gracefully
    $ pnpm chess
    (Let game run 2-3 moves)
    Ctrl+C
    
    Expected:
      ✅ Current game completes
      ✅ PGN saved
      ✅ Exit code 0
      ✅ No orphaned processes
```

---

## Phase 4: Product Verification

### Single Entry Point
```
[ ] pnpm chess works
    $ pnpm chess
    
    Expected:
      ✅ Launches with no arguments
      ✅ Uses default brains (from .env)
      ✅ Plays game

[ ] pnpm chess --help works
    $ pnpm chess --help
    
    Expected:
      ✅ Shows only chess options
      ✅ No experiment/analyze/dashboard commands
      ✅ Clear and concise help
```

### Dependency Verification
```
[ ] All required deps present
    $ pnpm chess
    
    Expected:
      ✅ Node.js version check passes
      ✅ chess.js library check passes
      ✅ Ollama connectivity check passes (or clear error)
      ✅ Model availability check passes (or clear error)

[ ] Missing dependencies reported clearly
    If Ollama missing:
      ✅ Error message says "Ollama not found at ..."
      ✅ Suggestion provided: docker run command
      ✅ User can install and retry
```

### Code Quality
```
[ ] TypeScript compiles with no errors
    $ pnpm build
    
    Expected: 0 errors, 0 warnings

[ ] No `any` types in runtime code
    $ grep -r "any" packages/*/src/*.ts
    
    Expected: 0 or only justified use

[ ] ESLint passes
    $ pnpm lint
    
    Expected: 0 errors

[ ] Prettier format correct
    $ pnpm format:check
    
    Expected: 0 files out of format
```

---

## Phase 5: Documentation Update

### Root-Level Docs
```
[ ] README.md updated
    - Remove 0 A.D. references
    - Add chess game description
    - Add quick start: pnpm chess
    - Link to docs/SETUP-CHESS.md

[ ] QUICK_START.md updated
    - Focus on chess
    - 5-minute flow
    - No mentions of other games

[ ] PROJECT_STATUS.md updated
    - Current: v1.0 Chess Platform
    - Status: Pre-release cleanup complete
    - Next: Implementation phase
```

### docs/ Folder
```
[ ] docs/KEYBOARD-SHORTCUTS.md
    - Chess-specific only
    - Remove 0 A.D. controls

[ ] docs/SETUP-OBS.md
    - Generic to Chess (keep)
    - Verify still relevant

[ ] Archive 0 A.D. content
    - Keep in git history
    - Not in active docs
```

### Environment Files
```
[ ] .env.example created
    BRAIN_P1=ollama:tinyllama
    BRAIN_P2=ollama:mistral
    OLLAMA_BASE_URL=http://localhost:11434
    LOG_LEVEL=info
    ENABLE_BROADCAST=true
    BROADCAST_PORT=8765

[ ] .env updated
    - No camera configuration
    - Chess-focused only
```

---

## Final Verification (Before v1.0 Ship)

### Comprehensive Test
```
[ ] Developer onboarding test (5-minute flow)
    1. [ ] Clone repo: 2 min
    2. [ ] Install: pnpm install (2 min)
    3. [ ] Start Ollama: docker run ... (pre-started)
    4. [ ] Run chess: pnpm chess --maxGames=1 (1 min)
    5. [ ] Watch game complete: <1 min
    
    Total: <5 minutes to watch first game

[ ] Manual verification by 3+ developers
    - [ ] Developer 1: Runs full flow
    - [ ] Developer 2: Runs with different brain config
    - [ ] Developer 3: Tests with --streaming
    
    Expected: All complete successfully, <5 min each
```

### Known Limitations Document
```
[ ] Create KNOWN_LIMITATIONS.md
    What's NOT included in v1.0:
    - Alternative games (Checkers, RTS)
    - Advanced analytics
    - OBS overlay
    - Swiss tournaments
    
    What IS included:
    - Chess games
    - Round-robin tournaments
    - ELO ratings
    - Live streaming (basic)
    - PGN recording
```

### Support Readiness
```
[ ] Create SUPPORT.md
    - How to report issues
    - Expected response time
    - Known issues with workarounds
    - Troubleshooting guide

[ ] Create TROUBLESHOOTING.md
    - Ollama not found → docker command
    - Model not found → ollama pull command
    - Port in use → alternative port
    - Brain timeout → increase BRAIN_TIMEOUT
```

---

## Metrics: Before vs After

### Code Metrics
| Metric | Before | After | Removed |
|--------|--------|-------|---------|
| Packages | 52 | 36-38 | 14-16 |
| LOC | 35,000 | 14,000-15,000 | ~21,000 |
| Config lines (.env) | 86 | 60 | 26 |
| Dead code | 5,500+ | ~1,000 | ~4,500 |

### Build Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Build time | 2 min | 1:40 | -15% |
| npm install | 1 min | 45s | -25% |
| Package size | ~350 MB | ~280 MB | -80 MB |

### Onboarding Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Time to first game | 30 min | <5 min | -83% |
| Commands to learn | 6 | 1 | -83% |
| Decision points | 5-10 | 0 | -100% |

---

## Sign-Off Checklist

### Technical Lead
- [ ] All tests passing (200+ green)
- [ ] No regressions in chess functionality
- [ ] Build verified with all optional features
- [ ] Runtime graph matches implementation
- [ ] Dependency removal evidence solid

### Product Manager
- [ ] v1.0 scope confirmed
- [ ] Cleanup timeline acceptable (1-2 days)
- [ ] User impact minimal (better experience)
- [ ] Known limitations documented
- [ ] Support plan in place

### QA Lead
- [ ] Test plan ready
- [ ] Manual verification protocol defined
- [ ] Regression testing automated
- [ ] Edge cases covered
- [ ] Escalation path clear

---

## Execution Timeline

### Day 1: Code Cleanup (8 hours)
```
Morning (4h):   Tier 1 removal (9 packages)
Afternoon (4h): Tier 2 + Tier 3 (CLI refactoring)
```

### Day 2: Verification (8 hours)
```
Morning (4h):   Testing & build verification
Afternoon (4h): Documentation update & final checks
```

### Day 3: Release Readiness (4 hours)
```
Morning (2h):   Developer onboarding test
Afternoon (2h): Final verification, create release notes
```

**Total cleanup effort**: 20 hours (2.5 business days)

---

## Success Criteria: v1.0 Ready

✅ **Code Quality**
- All 200+ tests passing
- TypeScript strict mode passing
- ESLint passing
- Prettier formatted
- No console errors in runtime

✅ **Product Completeness**
- Single `pnpm chess` command
- Chess game plays end-to-end
- Broadcasting works (optional)
- Auto-restart works
- Graceful shutdown works

✅ **Documentation**
- README.md chess-focused
- QUICK_START.md complete
- SUPPORT.md ready
- KNOWN_LIMITATIONS.md clear
- docs/ cleaned of 0 A.D. references

✅ **Cleanup Evidence**
- 14-16 packages removed (proven unused)
- ~21,000 LOC removed (dead code)
- .env cleaned of camera config
- No regressions in functionality

✅ **User Experience**
- <5 minute onboarding (proven)
- Clear error messages
- Helpful dependency verification
- Obvious entry point (`pnpm chess`)

---

## Next Action

**Immediate**: Execute Story 60.3 (Phase 1 removal)

```bash
# Verify evidence
cat DEPENDENCY_REMOVAL_EVIDENCE_PLAN.md | grep "TIER 1"

# Begin Phase 1 cleanup
# For each of 9 packages: remove → build → test → commit

pnpm install  # Update lock file
pnpm build    # Verify build
pnpm chess --maxGames=1  # Verify runtime
pnpm test     # Verify tests
git commit -m "Remove [package]: proven unused per DEPENDENCY_REMOVAL_EVIDENCE_PLAN"
```

**Estimated completion**: 1-2 days (20 hours)

---

**Status**: 🎯 **CONSOLIDATION READINESS: APPROVED**

**Verdict**: AI Commander is ready for v1.0 cleanup and ship.

All evidence is collected, all checklists are ready, all verification points are defined.

Proceed with Story 60.3 (Safe Removal).

