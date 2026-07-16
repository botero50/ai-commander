# AUDIT V1.3: Simulations and Fakes Inventory

## Complete List of Non-Real Execution

### TIER 1: FAKE TOURNAMENTS (Complete mock execution)

#### ChessIntegrationHarness
**Location:** `chess-integration-harness.ts`

**Fake #1: simulateMatch() - Random result generation**
```typescript
async simulateMatch(matchId, whiteBrain, blackBrain) {
  // Random move count (10-200)
  const moveCount = Math.floor(Math.random() * (maxMovesPerGame - 10)) + 10;
  
  // Random result (35% white, 35% black, 30% draw)
  const resultRoll = Math.random();
  if (resultRoll < 0.35) {
    result = 'white-win';
  } else if (resultRoll < 0.7) {
    result = 'black-win';
  } else {
    result = 'draw';
  }
  
  // NO ACTUAL GAME PLAYED
}
```
**Impact:** 41 integration harness tests are statistical simulations, not chess games.
**Verdict:** ❌ REMOVE

**Fake #2: Mock ELO calculation**
```typescript
const baseRatingChange = this.calculateRatingChange(result);
// Simplified K-factor of 32
const ratingChange = result === 'draw' ? 0 : 32;
```
**Impact:** Fake rating updates (not actual tournament results)
**Verdict:** ❌ REMOVE

**Fake #3: generateTournamentReport() - Synthetic standings**
```typescript
private calculateStandings() {
  // Creates standings from fake match results
  // Games, wins, losses are all from simulated data
}
```
**Verdict:** ❌ REMOVE

---

### TIER 2: FALLBACK RANDOM MOVES (Execution fallback when brain fails)

#### ChessCommand
**Location:** `chess-command.ts:120-130`
```typescript
if (!move || !legalMoves.includes(move)) {
  // Fallback to random move if brain fails
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  return {
    success: true,
    move: randomMove,
    notation: move  // BUG: returns original invalid move
  };
}
```
**Impact:** If brain returns invalid move, game uses random fallback.
**Risk:** Game produces non-deterministic results
**Verdict:** ⚠️ PROBLEMATIC - Brain should never return invalid moves

#### ChessDecisionTranslator
**Location:** `chess-decision-translator.ts:40-50`
```typescript
if (!uciMove || !legalMoves.includes(uciMove)) {
  // Fallback to random move
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
}
```
**Impact:** Notation translation failure uses random fallback
**Verdict:** ⚠️ Should be error, not fallback

#### ChessGameLoop
**Location:** `chess-game-loop.ts:145-155`
```typescript
if (!move || !validMoves.includes(move)) {
  // Fallback: pick random legal move
  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
}
```
**Impact:** Game loop fallback for invalid brain decision
**Verdict:** ⚠️ Should fail explicitly, not hide error

---

### TIER 3: PLACEHOLDERS AND STUBS

#### ChessGameLoop
**Location:** `chess-game-loop.ts:200`
```typescript
// For short algebraic, we'll use a placeholder from square
```
**Status:** ⚠️ Incomplete notation support

#### ChessTournamentScheduler
**Location:** `chess-tournament-scheduler.ts:45`
```typescript
if (participants.length === 0) {
  participants = ['placeholder1', 'placeholder2'];
}
```
**Status:** ⚠️ Silently creates placeholder brains instead of error

#### ChessResearchPlatform
**Location:** `chess-research-platform.ts:285`
```typescript
private analyzeMostCommonOpenings() {
  // Simplified: would parse PGN for opening names
  // For now, return empty array
  return [];
}
```
**Status:** ⚠️ Opening analysis not implemented

---

### TIER 4: MOCKED BROADCASTS (No real data, fake streams)

#### ChessSpectatorStreamer
**Location:** `chess-spectator-streamer.ts`

**Mock #1: Move broadcasting**
```typescript
recordMove(moveNumber, color, move, fen, brainName, decisionTime) {
  // Records to in-memory array
  this.moveHistory.push(update);
  // Broadcasts to spectators (no real WebSocket)
  this.broadcastMove(update);  // In-memory only
}
```
**Impact:** 42 tests on spectator streaming are in-memory message queues, not real broadcast
**Verdict:** ⚠️ Tests validate queueing, not broadcasting

#### ChessBroadcastOverlay
**Location:** `chess-broadcast-overlay.ts`

**Mock #1: HTML rendering**
```typescript
renderHTML(): string {
  // Returns HTML string, never displayed
  return `<div class="chess-overlay">...</div>`;
}
```
**Impact:** 41 tests validate HTML generation, not actual display
**Verdict:** ⚠️ Tests validate template, not rendering

**Mock #2: JSON rendering**
```typescript
renderJSON() {
  return {
    config: this.getConfig(),
    players: this.getPlayerCards(),
    // All data is in-memory
  };
}
```
**Impact:** Tests validate data structure, not JSON serialization
**Verdict:** ⚠️ Tests validate schema, not real usage

---

### TIER 5: MOCKED TOURNAMENT DATA

#### ChessTournamentManager
**Location:** `chess-tournament-manager.ts`
**Issue:** All tests use fabricated match results
```typescript
// From tests:
const match1 = {
  matchId: 'm1',
  result: 'white-win',  // MOCKED
  moveCount: 25,         // MOCKED
  duration: 4000,        // MOCKED
};
```
**Impact:** 34 tests validate ELO math, not tournament results
**Verdict:** ⚠️ Tests are correct, but data is synthetic

#### ChessResultsAggregator
**Location:** `chess-results-aggregator.ts`
**Issue:** All tests create fake match data
```typescript
const match = {
  whiteBrainName: 'Alpha',
  result: 'white-win',  // MOCKED - never actually played
  moveCount: 30,
  duration: 5000,
};
```
**Impact:** 39 tests validate standings math, not actual tournament results
**Verdict:** ⚠️ Tests are logically correct, but based on fake games

---

### TIER 6: RESEARCH PLATFORM FAKES

#### ChessResearchPlatform
**Location:** `chess-research-platform.ts`

**Mock #1: Comparative analysis**
```typescript
compareBrains(brain1, brain2) {
  // Compares heads-to-head records
  // But all records are from simulated/mocked matches
}
```
**Impact:** 31 tests analyze data that never came from real games
**Verdict:** ⚠️ Logic is correct, input is synthetic

---

## SUMMARY: WHAT IS NOT REAL

| Category | File | Issue | Tests |
|----------|------|-------|-------|
| **Mock Tournaments** | chess-integration-harness | Random results, never plays | 41 |
| **Fallback Random Moves** | chess-command, decision-translator, game-loop | Game uses random if brain fails | N/A |
| **Placeholders** | game-loop, scheduler, research | Incomplete features | N/A |
| **In-Memory Broadcasts** | spectator-streamer, broadcast-overlay | No real WebSocket/display | 120 |
| **Synthetic Match Data** | tournament-manager, results-aggregator | All data is mocked | 73 |
| **Research on Fake Data** | research-platform | Analysis of synthetic data | 31 |
| **Skipped Real Tests** | game-loop | 20 tests commented out | 20 |

---

## COMPLETE INVENTORY

### In Production Code:
- ❌ **ChessIntegrationHarness** - Complete mock tournament simulator (remove entirely)
- ⚠️ **3 random move fallbacks** - Hide errors when brain fails (fix to throw errors)
- ⚠️ **2 placeholders** - Silently create fake data (fix to throw errors)
- ⚠️ **1 unimplemented feature** - Opening analysis returns empty (document as TODO)

### In Tests:
- ❌ **41 fake tournament tests** - Remove chess-integration-harness.test.ts
- ❌ **20 skipped real tests** - Remove or unskip chess-game-loop.test.ts
- ❌ **22 broken tests** - Remove chess-engine.test.ts (Stockfish required)
- ⚠️ **73 tournament tests with synthetic data** - Keep but mark as "math validation"
- ⚠️ **120 broadcast tests** - Keep but mark as "interface validation"

---

## Recommendation

**Remove 155 tests that don't execute real chess:**
1. chess-integration-harness.test.ts (41 tests) ✅
2. chess-game-loop.test.ts (20 tests) ✅
3. chess-engine.test.ts (22 tests) ✅
4. chess-concurrent-executor.test.ts: unskip or remove 3 tests

**Fix production code:**
1. Remove random move fallbacks - throw errors instead
2. Remove placeholder brains - throw errors instead
3. Add error handling for invalid brain decisions

**Result:** Move from 389 "passing" tests to ~160 real validation tests + integration tests with real games

