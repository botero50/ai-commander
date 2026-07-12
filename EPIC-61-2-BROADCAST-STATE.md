# EPIC 61.2 — Unified Broadcast State

**Status:** ✅ COMPLETE

**Date:** 2026-07-11

**Tests:** 20/20 passing

## Overview

Created a unified `BroadcastState` service that reads from multiple data sources (Arena, Match persistence, Brain, Commentary, SessionEventBus) and exposes a single, real-time broadcast data contract for the overlay.

## What Was Built

### 1. BroadcastState Service (`broadcast-state.ts` — 470 lines)

Complete service that:

- **Initializes** with all required data sources (Arena, Match persistence, Brain, Commentary, SessionEventBus)
- **Builds state** from multiple sources on demand: `await broadcastState.buildState(matchId)`
- **Subscribes to real-time events** from SessionEventBus (observations, decisions, match lifecycle)
- **Caches player stats** and updates them on observation events
- **Enriches player data** with AI metadata (objective, confidence, provider, model, latency)
- **Includes trash talk** from Commentary layer
- **Tracks match history** (previous results between same players)
- **Determines match state** (intro → running → conclusion → ended)
- **Handles graceful degradation** if data sources unavailable

### 2. Broadcast Data Types

```typescript
// Single unified data contract
export interface BroadcastStreamState {
  match: BroadcastMatch;
  timestamp: string;
  recentEvents: Array<{
    type: string;
    playerId?: number;
    tick: number;
    description: string;
  }>;
}

export interface BroadcastMatch {
  matchId: string;
  map: { name: string; displayName: string; players: number };
  players: BroadcastPlayer[];
  state: 'intro' | 'running' | 'conclusion' | 'ended';
  startTick: number;
  currentTick: number;
  result?: { winner, losers, duration, reason };
  history?: { matchNumber, previousResults };
}

export interface BroadcastPlayer {
  id: number;
  name: string;
  civilization: string;
  faction: string;
  resources: { wood, stone, food, metal };
  units: number;
  buildings: number;
  population: number;
  militaryValue: number;
  objective?: string;
  confidence?: number;
  provider?: string;
  model?: string;
  latency?: number;
  currentTrashTalk?: { message: string; tick: number };
}
```

### 3. Core Features

✅ **Multiple Data Sources**
- Arena: match metadata, players, map, civilization
- Match persistence: match results, history
- Brain: AI objectives, confidence levels
- Commentary: trash talk, decision timeline
- SessionEventBus: real-time game state

✅ **Real-Time Updates**
- Listens to observation events for player stat changes
- Listens to decision events for AI metadata
- Listens to match lifecycle events
- Maintains recent event buffer (20 events)

✅ **Complete Player Data**
- Resources (wood, stone, food, metal)
- Units, buildings, population
- Military value calculation
- AI objectives and confidence
- Trash talk messages
- Civilization and faction mapping

✅ **Match State Tracking**
- Intro phase (tick < 1)
- Running phase (1 ≤ tick < endTick - 300)
- Conclusion phase (endTick - 300 ≤ tick < endTick)
- Ended phase (tick ≥ endTick)

✅ **Civilization Mapping**
- All 15 civilizations with faction assignments
- Athenians, Britons, Carthaginians, Gauls, Germans, Han, Iberians, Kushites, Macedonians, Mauryas, Persians, Ptolemies, Romans, Seleucids, Spartans

✅ **Graceful Degradation**
- Works with partial data sources
- Provides sensible defaults
- Doesn't crash if Arena/Brain/Commentary unavailable

## Test Coverage (20 tests)

### Initialization (2 tests)
- ✅ Initializes with all data sources
- ✅ Handles partial initialization gracefully

### State Building (4 tests)
- ✅ Builds complete broadcast state from all sources
- ✅ Includes player information with civilizations
- ✅ Initializes player stats with defaults
- ✅ Includes match history when available

### Match Result Handling (2 tests)
- ✅ Includes match result when available
- ✅ Handles missing arena gracefully

### Real-Time Updates (3 tests)
- ✅ Updates player stats on observation event
- ✅ Calculates military value correctly
- ✅ Records events in recent event buffer

### Match State Determination (4 tests)
- ✅ Returns intro state for early ticks
- ✅ Returns running state during match
- ✅ Returns conclusion state near end
- ✅ Returns ended state after match

### Faction Mapping (15 civs)
- ✅ Maps all 15 civilizations to correct factions

### State Retrieval & Subscriptions (2 tests)
- ✅ Returns current state via getState()
- ✅ Returns null before building state
- ✅ Notifies on state updates

### Disconnection (1 test)
- ✅ Disconnects from event bus properly

## Integration Example

```typescript
const broadcastState = new BroadcastState(logger);

await broadcastState.initialize({
  arena,
  matchPersistence,
  brain,
  commentary,
  eventBus,
});

// Build state
const state = await broadcastState.buildState(matchId);

// Subscribe to updates
broadcastState.onStateUpdated((state) => {
  console.log('Updated:', state.match.players[0].resources);
  broadcastToBrowserSource(state);
});

// When done
broadcastState.disconnect();
```

## Usage Pattern

```
Arena (match metadata)
  ↓
BroadcastState.buildState()
  ↓
BroadcastStreamState (unified contract)
  ↓
React Component / OBS Browser Source / WebSocket
```

## Data Flow for Broadcast Overlay

1. **On Match Start:** Build initial state from Arena
2. **Every Observation:** Real-time player stats update
3. **Every Decision:** AI metadata (objective, confidence) update
4. **Every TrashTalk:** Player current trash talk update
5. **On Match End:** Result and reason populated

## Files Created

- `packages/zeroad-adapter/src/broadcast/broadcast-state.ts` (470 lines)
- `packages/zeroad-adapter/src/broadcast/broadcast-state.test.ts` (463 lines)
- `packages/zeroad-adapter/src/broadcast/broadcast-state-integration.example.ts` (200+ lines)

## Build Status

✅ TypeScript compilation: PASS
✅ All tests: 20/20 PASS
✅ No regressions in existing broadcast tests

## What's Next

### EPIC 61.3: Broadcast State Validation
- Run real match and verify all exposed fields come from real data sources
- Test real Arena state, real match config, real AI output
- Verify RL Interface observations and completed-match results

### EPIC 62: AI Trash Talk Experience
- Wire TrashTalkGenerator output to broadcast event stream (50 lines)
- Display trash talk in broadcast overlay

### EPIC 63: Competitive Scoreboard
- Persistent win/loss aggregation
- Head-to-head statistics display

### EPIC 64: Live Match Overlay
- HTML/WebSocket broadcast overlay with BroadcastState data
- Player info, metrics, trash-talk feed

## Key Design Decisions

1. **Single Source of Truth:** BroadcastState is the only data contract for broadcast UI
2. **Event-Driven Updates:** Real-time stats via SessionEventBus subscription
3. **Graceful Degradation:** Doesn't fail if Arena/Brain/Commentary unavailable
4. **Caching Strategy:** Maintains player stat cache, updates on observations
5. **Event Buffering:** Keeps 20 most recent events for context display
6. **Faction Mapping:** All 15 civilizations pre-mapped for display purposes

## Known Limitations

- Relies on EventBus connectivity (will work but won't auto-update if disconnected)
- Military value is approximate calculation (militaryUnits * 10)
- Recent event buffer is in-memory (lost on disconnect)
- No persistence layer for historical state snapshots
