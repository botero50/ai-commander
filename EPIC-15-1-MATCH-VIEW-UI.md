# EPIC 15.1: Match View UI Component

**Status**: Ready for implementation  
**Goal**: Build React/Vue component for live match viewing with real-time WebSocket updates

---

## Overview

Implement a production-grade Match View UI component that consumes `MatchViewStateManager` and displays real-time match progress. This is the "watch the match" interface.

---

## Requirements

### Component Contract
- **Input**: `MatchViewStateManager` instance + WebSocket URL
- **Output**: Rendered match view with live updates
- **Framework**: React or Vue (user's choice)
- **Dependencies**: Uses existing `MatchViewStateManager` (framework-agnostic)

### Visual Elements

#### Status Bar
- Match ID, brain names (Player 1 vs Player 2)
- Match status: "Starting" | "Running" | "Completed"
- Connection indicator (green/red)

#### Progress Display
- Current tick / Total ticks
- Progress bar (%)
- Elapsed time (formatted)

#### Player Stats Panels
- Player 1 & Player 2 side-by-side
  - Command count
  - Error count
  - Error rate (%)
  - Commands per tick

#### Timeline Metrics
- Unit count trend (increasing/decreasing/stable)
- Building count trend (increasing/decreasing/stable)
- Total snapshots collected

#### Decision Feed
- Last 5 decisions displayed
- For each: Tick, player, brain name, reasoning snippet, duration
- Auto-scrolling as new decisions arrive

#### Winner Display (when completed)
- Winner name
- Final stats summary
- Play/Replay button link

### State Management

The component receives state updates via subscription:
```
const manager = new MatchViewStateManager(matchId, brain1, brain2);
const unsubscribe = manager.subscribe((newState) => {
  // React: setState or update hook
  // Vue: update reactive property
});
```

### Error Handling

- Display connection errors prominently
- Show "Reconnecting..." during WebSocket failures
- Auto-reconnect with exponential backoff (handled by manager)
- Graceful fallback if WebSocket drops mid-match

### Testing

- Unit tests: Component renders without crashes
- Integration: Component handles state updates correctly
- E2E: Start match, verify live updates, watch to completion

---

## Acceptance Criteria

- [ ] Component renders match status correctly
- [ ] Progress bar updates in real-time
- [ ] Player stats display and update live
- [ ] Decision feed scrolls as decisions arrive
- [ ] Connection status indicator works
- [ ] Error display works (kill WebSocket, verify error shown)
- [ ] Winner display appears after match completion
- [ ] No TypeScript errors, all props typed
- [ ] Component is reusable (no hardcoded IDs/brains)

---

## Files to Create/Modify

- `packages/zeroad-adapter/src/web/components/MatchView.tsx` (React) or `.vue` (Vue)
- `packages/zeroad-adapter/src/web/components/MatchView.test.ts`

---

## Related

- Input: `MatchViewStateManager` (src/web/match-view-state.ts)
- Formatting: `formatMatchStatus()`, `formatDecision()`, `formatDuration()` (src/web/ui-components.ts)
- Server: `MatchServer` provides WebSocket endpoints (src/web/match-server.ts)
