# EPIC 15.2: Tournament Dashboard UI Component

**Status**: Ready for implementation  
**Goal**: Build React/Vue component for tournament leaderboard and match history display

---

## Overview

Implement a production-grade Tournament Dashboard UI that displays leaderboard, recent matches, and tournament progress. This is the "tournament overview" interface.

---

## Requirements

### Component Contract
- **Input**: `TournamentDashboardState` snapshot + polling endpoint
- **Output**: Rendered tournament dashboard with live ranking updates
- **Framework**: React or Vue (user's choice)
- **Dependencies**: Uses existing `TournamentDashboard` + `TournamentDashboardState`

### Visual Elements

#### Tournament Header
- Tournament name
- Tournament ID
- Status: "Setup" | "Running" | "Completed"
- Start time (formatted)
- End time (if completed)
- Duration (formatted)

#### Progress Indicator
- "X of Y matches completed" text
- Progress bar showing percentage
- Completion percentage

#### Rankings Table
- Sortable by: Rank, Name, Rating, Wins, Losses, Draws, Win Rate, Error Rate
- Columns:
  - Rank (1, 2, 3, ...)
  - Brain Name
  - ELO Rating (numeric)
  - Wins
  - Losses
  - Draws
  - Win Rate (%)
  - Error Rate (%)
  - Trend (↑ up, ↓ down, → stable)
- Highlight top 3 visually (gold, silver, bronze)
- Click on brain name → open brain details modal

#### Recent Matches Section
- Last 20 matches displayed in reverse chronological order
- For each match:
  - Player 1 name
  - vs
  - Player 2 name
  - Result (win/loss/draw)
  - Player 1 commands, Player 2 commands
  - Duration
  - Timestamp
  - "Watch Replay" button
- Pagination or scrollable list

#### Tournament Statistics
- Total matches played
- Total draws
- Unique brains participating
- Average match duration

### State Management

Component receives periodic updates via polling or WebSocket:
```
// Option 1: Polling (REST)
fetch('/api/tournament/{id}/dashboard')
  .then(r => r.json())
  .then(state => setDashboardState(state))

// Option 2: WebSocket stream (if tournament-runner emits events)
ws.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  if (event.type === 'tournament_update') {
    setDashboardState(event.data);
  }
})
```

### Error Handling

- Display "Tournament not found" if 404
- Show "Disconnected from server" if polling fails
- Retry with exponential backoff
- Show last-known state while retrying

### Testing

- Unit tests: Component renders rankings and recent matches
- Integration: Fetch real dashboard state, render correctly
- E2E: Run a tournament, watch dashboard update in real-time

---

## Acceptance Criteria

- [ ] Tournament header displays correctly
- [ ] Progress bar shows correct percentage
- [ ] Rankings table displays all columns
- [ ] Rankings sort by each column
- [ ] Recent matches display in reverse chronological order
- [ ] Win rate and error rate format correctly (%)
- [ ] Trend indicators (↑↓→) display correctly
- [ ] "Watch Replay" buttons are clickable (link or callback)
- [ ] Click on brain name opens brain details (if implemented)
- [ ] Error messages display appropriately
- [ ] No TypeScript errors, all props typed
- [ ] Component is reusable (no hardcoded tournament IDs)

---

## Files to Create/Modify

- `packages/zeroad-adapter/src/web/components/TournamentDashboard.tsx` (React) or `.vue` (Vue)
- `packages/zeroad-adapter/src/web/components/TournamentDashboard.test.ts`

---

## Related

- Input: `TournamentDashboardState` (src/tournament/tournament-dashboard.ts)
- Data source: Tournament runner (src/tournament/tournament-runner.ts)
- Server endpoint: `GET /api/tournament/{id}/dashboard`
