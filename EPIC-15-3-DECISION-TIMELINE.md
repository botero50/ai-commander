# EPIC 15.3: Decision Timeline UI Component

**Status**: Ready for implementation  
**Goal**: Build React/Vue component for frame-by-frame decision visualization

---

## Overview

Implement a production-grade Decision Timeline UI that displays decisions made by each brain at each tick, with reasoning and command details. This is the "analyze decisions" interface.

---

## Requirements

### Component Contract
- **Input**: `DecisionEvent[]` array + `MatchViewState`
- **Output**: Rendered timeline showing all decisions with expandable details
- **Framework**: React or Vue (user's choice)
- **Dependencies**: Uses `DecisionEvent` type + formatting utilities

### Visual Elements

#### Timeline Header
- Match ID
- Brain 1 vs Brain 2
- Time range (tick 0 → max tick)

#### Timeline View (Vertical/Horizontal)
- Each row = one tick
- Each tick shows decisions from both brains side-by-side
- Color-code by player (e.g., blue for Player 1, red for Player 2)
- Highlight current tick (if watching live match)

#### Decision Card (Expandable)
- **Collapsed state:**
  - Tick number
  - Brain name
  - Command count (e.g., "5 commands")
  - Duration (e.g., "234ms")
  
- **Expanded state:**
  - Full reasoning text
  - Command list (human-readable or JSON)
  - Decision metrics:
    - Confidence score (if available)
    - Alternative options considered (if available)
  - Timestamp of decision
  - Latency metrics

#### Filtering/Search
- Filter by tick range (e.g., "show decisions from tick 100-200")
- Filter by player (Player 1 only, Player 2 only, or both)
- Search by reasoning keyword
- Filter by decision type (if categorized)

#### Timeline Controls
- Zoom in/out (expand/collapse ticks)
- Jump to tick number
- Play/pause if live match
- Scroll to current tick (if watching live)

### State Management

Component receives decision events as they arrive:
```
// During live match, decisions arrive via WebSocket
const manager = new MatchViewStateManager(...);
manager.subscribe((state) => {
  setDecisions(state.latestDecisions);
  setCurrentTick(state.currentTick);
});

// Or for replay, load all decisions at once
const decisions = await fetch(`/api/match/${matchId}/decisions`)
  .then(r => r.json());
```

### Error Handling

- Handle empty decision list gracefully
- Show "No decisions in this range" when filtered list is empty
- Display parsing errors for malformed command data

### Testing

- Unit tests: Component renders decision cards correctly
- Integration: Load decisions from match replay, verify display
- E2E: Watch live match, verify decisions appear in timeline in real-time

---

## Acceptance Criteria

- [ ] Timeline displays tick numbers correctly
- [ ] Decision cards show command count and duration
- [ ] Expanding decision card shows full reasoning
- [ ] Command list displays (human-readable or JSON)
- [ ] Color-coding distinguishes Player 1 vs Player 2
- [ ] Filtering by tick range works
- [ ] Filtering by player works
- [ ] Search by reasoning keyword works
- [ ] Zoom controls expand/collapse ticks
- [ ] Jump to tick number works
- [ ] Current tick is highlighted (if live match)
- [ ] No TypeScript errors, all props typed
- [ ] Component is reusable (no hardcoded match IDs)

---

## Files to Create/Modify

- `packages/zeroad-adapter/src/web/components/DecisionTimeline.tsx` (React) or `.vue` (Vue)
- `packages/zeroad-adapter/src/web/components/DecisionTimeline.test.ts`

---

## Related

- Input: `DecisionEvent` type (src/match/decision-overlay.ts)
- State: `MatchViewState` (src/web/match-view-state.ts)
- Formatting: `formatDecision()` (src/web/ui-components.ts)
- Data source: Live from WebSocket or batch from `/api/match/{id}/decisions`
