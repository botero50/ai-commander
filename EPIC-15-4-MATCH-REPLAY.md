# EPIC 15.4: Match Replay UI Component

**Status**: Ready for implementation  
**Goal**: Build React/Vue component for frame-by-frame match replay and playback control

---

## Overview

Implement a production-grade Match Replay UI that allows scrubbing through a completed match tick-by-tick with playback controls. This is the "rewatch and analyze" interface.

---

## Requirements

### Component Contract
- **Input**: `matchId` + replay data endpoint
- **Output**: Rendered match replay player with playback controls
- **Framework**: React or Vue (user's choice)
- **Dependencies**: Uses `MatchReplay` data structures + formatting utilities

### Visual Elements

#### Replay Player Header
- Match ID
- Brain 1 vs Brain 2
- Replay status: "Ready" | "Playing" | "Paused" | "Finished"

#### Game View (Frame Display)
- Display snapshot of game state at current tick
  - Unit positions/counts (text or basic visualization)
  - Building counts
  - Resource levels (if available)
  - Player statuses
- Update in real-time as user scrubs timeline

#### Timeline Scrubber
- Horizontal track from tick 0 to totalTicks
- Draggable thumb showing current tick
- Click to jump to any tick
- Hover shows tick number

#### Playback Controls
- **Play** button (start playback from current tick)
- **Pause** button (pause playback)
- **Stop** button (jump back to tick 0)
- **Step forward** button (advance 1 tick)
- **Step backward** button (go back 1 tick)
- Speed control (0.25x, 0.5x, 1x, 2x, 4x)
- Auto-pause at interesting events (e.g., winner determined)

#### Information Panel
- Current tick / Total ticks
- Elapsed time / Total duration (formatted)
- Decision at current tick (if available)
  - Which brain made a decision
  - Reasoning snippet
  - Commands issued
- Unit/building count at current tick
- Resource levels at current tick

#### Frame-by-Frame Analysis
- Show what changed since last tick
  - Units created/destroyed
  - Buildings completed
  - Resources changed
  - Commands executed
- Highlight changes visually (green for creation, red for destruction)

### State Management

Component fetches replay data and manages playback state:
```
// On mount, fetch replay data
const replay = await fetch(`/api/match/${matchId}/replay`)
  .then(r => r.json());

// Component state:
// - currentTick (0 to replay.totalTicks)
// - isPlaying (true/false)
// - playSpeed (0.25, 0.5, 1, 2, 4)

// Playback loop (when isPlaying):
// - Increment currentTick at interval
// - Update frame display
// - Stop when currentTick >= totalTicks
```

### Error Handling

- Display "Replay not found" if 404
- Show parsing errors for malformed replay data
- Handle corrupted frames gracefully
- Resume after brief network hiccup

### Testing

- Unit tests: Playback controls update currentTick correctly
- Integration: Load a real match replay, verify all frames display
- E2E: Play through a match at various speeds, verify accuracy

---

## Acceptance Criteria

- [ ] Replay header displays correctly
- [ ] Timeline scrubber displays tick range
- [ ] Clicking scrubber jumps to correct tick
- [ ] Play button starts playback
- [ ] Pause button pauses playback
- [ ] Step forward/backward advance/retreat by 1 tick
- [ ] Speed controls change playback speed correctly
- [ ] Frame display updates as currentTick changes
- [ ] Decision panel shows decision at current tick (if available)
- [ ] Change indicators (green/red) display correctly
- [ ] Playback stops when reaching end
- [ ] No TypeScript errors, all props typed
- [ ] Component is reusable (no hardcoded match IDs)
- [ ] Playback is smooth (no jank at high speeds)

---

## Files to Create/Modify

- `packages/zeroad-adapter/src/web/components/MatchReplay.tsx` (React) or `.vue` (Vue)
- `packages/zeroad-adapter/src/web/components/MatchReplay.test.ts`

---

## Related

- Input: Match replay data (src/tournament/match-replay.ts)
- State: `MatchViewState` (src/web/match-view-state.ts)
- Formatting: `formatMatchStatus()`, `formatDecision()`, `formatDuration()` (src/web/ui-components.ts)
- Data source: `GET /api/match/{id}/replay`
