# EPIC 61.3 — Architecture Review & Real Runtime Validation

**Date:** 2026-07-11

**Status:** DESIGN FLAW IDENTIFIED — Requires Immediate Refactoring

## Critical Finding: Design Mismatch

### The Problem

**BroadcastState (as designed in 61.2) expects:**
- Arena service
- Match persistence service  
- Brain service
- Commentary service
- SessionEventBus

**What actually exists in run-arena-loop.ts:**
- RLHTTPClient (direct game communication)
- WorldState (from WorldStateMapper)
- OllamaAIBrain (conditionally, only if Ollama available)
- EventFeed (for camera events)
- TrashTalkGenerator
- MatchRotation, CivilizationRotation

**Critical Gap:** SessionEventBus does NOT exist in the Arena loop. BroadcastState requires it but arena doesn't create one.

### Why This Matters

1. **BroadcastState cannot be initialized** — it expects `initialize({arena, matchPersistence, brain, commentary, eventBus})` but arena loop has different data sources
2. **Architectural duplication** — BroadcastState tries to aggregate data that should come directly from arena
3. **Second source of truth** — BroadcastState creates its own player stats cache instead of reading from live WorldState
4. **Event subscription model doesn't fit** — SessionEventBus model assumes a decoupled event architecture, but arena loop is tightly coupled

## Architecture Assessment

### BroadcastState vs BroadcastDataBridge

| Aspect | BroadcastDataBridge | BroadcastState |
|--------|-------------------|-----------------|
| Purpose | Transform SessionEventBus events to broadcast format | Aggregate data from multiple services |
| Data Sources | SessionEventBus only | Arena, Brain, Commentary, Persistence, EventBus |
| Integration | Event-driven | Synchronous pull model |
| Status | Designed but unused | Just created, incompatible with Arena |
| Lines of Code | 347 | 470 |
| Test Coverage | 90+ tests | 20 tests |

**Verdict:** BroadcastDataBridge was the right approach (event-driven), but it was never integrated into Arena. BroadcastState repeats the same data aggregation design without fixing the root problem.

### What BroadcastState Got Right

1. ✅ Complete broadcast data types (BroadcastMatch, BroadcastPlayer, BroadcastStreamState)
2. ✅ All 15 civilizations with faction mapping
3. ✅ Military value calculation
4. ✅ Match state tracking (intro/running/conclusion/ended)
5. ✅ Event buffer for recent events
6. ✅ Comprehensive test coverage

### What BroadcastState Got Wrong

1. ❌ Assumes multiple service layers (Arena, Brain, Commentary) that don't exist in Arena loop
2. ❌ Expects SessionEventBus which doesn't exist
3. ❌ Creates its own player stats cache instead of reading live from WorldState
4. ❌ 470 lines of code for what should be a simple data transformation
5. ❌ Tries to aggregate data that should come directly from existing sources
6. ❌ No actual integration with run-arena-loop.ts

## Actual Data Sources in Arena Loop

### Available NOW

1. **WorldState** (every tick, from RLHTTPClient)
   - Players (with resources, population)
   - Agents (units and buildings with positions)
   - Time (current tick)
   - Technologies

2. **Player Info**
   - Player 1: Ollama AI (if available) or Petra
   - Player 2: Petra AI
   - Civilization selected via CivilizationRotation
   - Map selected via MapDiscovery

3. **Match Context**
   - matchId (generated at start)
   - mapSelected (from MapDiscovery)
   - civilization for rotation (from CivilizationRotation)
   - tick counter
   - Unit/building counts (calculated from WorldState)

4. **Events**
   - EventFeed (used for camera)
   - TrashTalkGenerator (generates taunts every 500 ticks)

### NOT Available

- SessionEventBus (would need to be created)
- Arena service (doesn't exist)
- MatchPersistence service (doesn't exist)
- Brain service (only OllamaAIBrain exists, conditionally)
- Commentary system (TrashTalkGenerator exists but no comment timeline)

## Real Runtime Validation Result

### What Should Happen

During a real 0 A.D. match:

1. Arena loop creates context with actual game data
2. Every tick: adapter converts WorldState → BroadcastState
3. Broadcast state is streamed to OBS Browser Source
4. All fields are traced to real runtime sources

### What Actually Happened

**BroadcastState.buildState()** requires:
```typescript
async buildState(matchId: string): Promise<BroadcastStreamState> {
  // Tries to read from this.arena (null)
  const matchInfo = await this.getMatchInfo(matchId);
  
  // Tries to read from this.matchPersistence (null)
  const matchResult = await this.getMatchResult(matchId);
  
  // Tries to read from this.brain (null)
  const brainstats = await this.getAIMetadata(playerId, matchId);
  
  // Tries to read from this.commentary (null)
  const trashTalk = await this.getLatestTrashTalk(playerId, matchId);
}
```

**Result:** Falls back to defaults everywhere. No real data flows through.

## Recommended Solution

### Option 1: Simplify BroadcastState (RECOMMENDED)

**Remove** the "multi-service aggregation" design.

**Replace** with lightweight adapter that transforms WorldState → BroadcastState:

```typescript
class ArenaBroadcastAdapter {
  buildBroadcastState(
    worldState: WorldState,
    arenaContext: {
      matchId: string;
      map: string;
      player1: {name, model, civilization};
      player2: {name, model, civilization};
      tick: number;
      winner?: string;
    }
  ): BroadcastStreamState {
    // Simple transformation: worldState → broadcast format
    // No service aggregation, no caching, no event subscriptions
  }
}
```

**Advantages:**
- Direct integration with Arena loop
- Real data only (no defaults)
- Lightweight (100 lines instead of 470)
- Testable with real WorldState fixtures
- No duplication

**Disadvantages:**
- Discards the service-aggregation design from 61.2
- Requires rewriting most of BroadcastState

### Option 2: Create SessionEventBus in Arena Loop

Wire arena loop to emit events that BroadcastState can consume.

**Advantages:**
- Preserves BroadcastState design
- Event-driven architecture

**Disadvantages:**
- Extra complexity
- Creates a new architectural layer just for broadcast
- BroadcastDataBridge was already designed for this (but unused)

## Architecture Decision

**RECOMMENDED: Option 1** — Replace BroadcastState with a lightweight ArenaBroadcastAdapter.

Rationale:
- Arena loop is the canonical state source
- Broadcast is a VIEW, not an aggregator
- Simpler = easier to validate = fewer bugs
- Real data from first day, no fallbacks

## Next Steps

1. Refactor BroadcastState to ArenaBroadcastAdapter (100 lines)
2. Wire into run-arena-loop.ts during match execution
3. Run real 2-match validation
4. Collect actual broadcast output
5. Verify all fields are real data

## Files to Create

- `broadcast-state-arena-integration.ts` (adapter)
- Real integration test in Arena loop

## Files to Deprecate

- `broadcast-state.ts` (keep tests, archive design)
- OR: Simplify broadcast-state.ts to be the view layer
