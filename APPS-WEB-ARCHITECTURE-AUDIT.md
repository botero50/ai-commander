# Apps/Web Architecture Audit Report

## Executive Summary

The React application in `apps/web` is **NOT PRODUCTION-READY** for the chess spectator UI without significant architectural work. The application has the right component structure and design, but **it is completely disconnected from the live chess runtime**. It expects to connect to a non-existent WebSocket server on `ws://localhost:3000/ws`, which does not exist in the codebase.

---

## Question 1: Is the current React application connected to the live chess runtime?

### **Answer: NO - Complete Disconnection**

**Evidence:**

1. **No WebSocket Server in Chess Runtime** (`chess.js`, `arena.js`, `broadcast-service.js`)
   - Location: None found in codebase
   - The chess arena broadcasts events only to console output (via `display*` methods)
   - No actual WebSocket server is instantiated or listening on any port

2. **Hardcoded WebSocket URL Mismatch**
   - File: `apps/web/src/providers/MatchDataProvider.tsx` (line 103)
     ```typescript
     wsUrl = 'ws://localhost:3000/ws'
     ```
   - File: `apps/web/src/components/MatchViewer/MatchViewer.tsx` (line 11)
     ```typescript
     wsUrl = 'ws://localhost:3000/ws'
     ```
   - Neither chess.js nor any runtime component listens on port 3000
   - No `/ws` endpoint exists anywhere in the codebase

3. **BroadcastService Only Outputs to Console**
   - File: `broadcast-service.js`
   - Methods: `displayBroadcast()`, `displayReplays()`, `displayMatchSummary()`
   - All output is `console.log()` - not network streaming
   - No WebSocket client emission code

4. **OBS WebSocket Hardcoded Instead**
   - File: `arena.js` (line 46)
     ```javascript
     obsWebSocketUrl: 'ws://localhost:4455'
     ```
   - This connects to OBS (for streaming overlay), NOT game data streaming

**Verdict:** The web UI is wired to listen for events that are never sent. It will fail to connect on startup.

---

## Question 2: Does it already render a real chess board?

### **Answer: NO - No Chess Board Component**

**Evidence:**

1. **No Chess Board Rendering**
   - Searched all components: NO chess.js board component found
   - Searched imports: NO react-chessboard, chessboardjsx, or similar library found
   - Searched MatchViewer tree: Only `MatchHeader`, `MatchProgress`, `MatchStats` - no board

2. **Components Present in `MatchViewer.tsx`:**
   ```typescript
   <MatchHeader state={state} />        // Shows names and match ID
   <MatchProgress state={state} />      // Unknown component
   <MatchStats state={state} />         // Unknown component
   ```
   - None of these render a visual board

3. **Data Structures for Game State Exist But Unused**
   - File: `apps/web/src/providers/MatchDataProvider.tsx` (lines 18-32)
   - Type: `GameState` - defines resources, population, units, buildings
   - **CRITICAL**: This is designed for RTS games (0 A.D. style), not chess
   - No FEN, no board squares, no piece positions
   - **This is a blocker** - the data model doesn't match chess requirements

4. **Tournament Dashboard Renders Instead**
   - File: `apps/web/src/App.tsx` (line 226)
   - Shows tournament standings and recent matches, NOT live game board

5. **Mock Data Uses RTS Terminology**
   - File: `apps/web/src/App.tsx` (lines 13-44)
   - Mock decisions include: `scout`, `move`, `build_worker`, `gather`, `train_unit`, `attack`
   - These are 0 A.D./RTS commands, not chess moves (e1-e4, Nf3, etc.)

**Verdict:** Zero chess board rendering code. The entire UI is designed for real-time strategy games, not chess.

---

## Question 3: Is it using demo data or real runtime events?

### **Answer: DEMO DATA ONLY - No Runtime Integration**

**Evidence:**

1. **Mock Data Hardcoded in App.tsx**
   - File: `apps/web/src/App.tsx` (lines 12-115)
   - `mockDecisions` array (lines 13-44)
   - `mockTournamentState` object (lines 47-115)
   - All data created with `Date.now()` - never actually connected to chess runtime

2. **MatchDataProvider Has Empty Control Methods**
   - File: `apps/web/src/providers/MatchDataProvider.tsx` (lines 192-210)
   ```typescript
   const play = useCallback(() => {
     if (!metadata) return;
     // Send play command to server  // <-- COMMENT ONLY, NO IMPLEMENTATION
   }, [metadata]);
   ```
   - Methods `play()`, `pause()`, `seek()`, `setSpeed()` are stubs
   - No actual WebSocket message sending code

3. **Fallback to Mock Data is Default**
   - File: `apps/web/src/App.tsx` (line 121)
     ```typescript
     const playback = useDecisionPlayback(mockDecisions, 10000);
     ```
   - Uses mock decisions unconditionally
   - No switch between "live from WebSocket" vs "mock data"

4. **Coming Soon Placeholders**
   - File: `apps/web/src/App.tsx` (lines 229-230)
     ```typescript
     <div>Replay Browser - Coming Soon (Story 15.3)</div>
     ```

**Verdict:** 100% demo/mock data. No live event consumption implemented.

---

## Question 4: Is there already a WebSocket client?

### **Answer: YES - But Non-Functional (Wrong Server)**

**Evidence:**

1. **WebSocket Client Code Exists**
   - File: `apps/web/src/types/index.ts` (lines 99-170)
   - Class: `MatchViewStateManager`
   - Methods: `connect()`, `disconnect()`, `handleMessage()`, `attemptReconnect()`
   - Line 102: `this.ws = new WebSocket(url);`

2. **Client Implementation Details**
   - Reconnection logic (lines 160-169): Up to 5 reconnect attempts with exponential backoff
   - Message handler (lines 147-152): Expects `{type: 'state_update', state: ...}`
   - Subscription pattern (lines 89-96): Supports multiple listeners

3. **BUT: The Server It Connects To Doesn't Exist**
   - Default URL: `ws://localhost:3000/ws` (hardcoded in 3 places)
   - No actual WebSocket server listening on port 3000
   - No broadcast-service.js integration to emit messages

4. **Protocol Mismatch If Server Existed**
   - Client expects: `{type: 'state_update', state: MatchViewState}`
   - Chess runtime sends: Nothing (console.log only)
   - MatchViewState type is RTS-specific, not chess-specific

**Verdict:** WebSocket client exists but will immediately fail to connect. The server it's designed for doesn't exist.

---

## Question 5: Does the existing MatchViewer consume live moves?

### **Answer: NO - Uses Mock Moves Only**

**Evidence:**

1. **MatchViewer Receives Mock Decisions**
   - File: `apps/web/src/App.tsx` (line 221)
     ```typescript
     <DecisionTimeline decisions={mockDecisions} highlightedTick={playback.currentTick} />
     ```
   - Hard-coded array, not from WebSocket

2. **DecisionTimeline Component**
   - File: `apps/web/src/components/DecisionTimeline/DecisionTimeline.tsx`
   - Accepts decisions as prop (no live subscription)
   - No real-time updates from WebSocket stream

3. **DecisionEvent Type is RTS-Based**
   - File: `apps/web/src/types/index.ts` (lines 34-44)
   ```typescript
   interface DecisionEvent {
     readonly tick: number;
     readonly timestamp: number;
     readonly player: 'player1' | 'player2';
     readonly brainName: string;
     readonly reasoning?: string;
     readonly commands: readonly string[];  // <-- RTS commands, not chess moves
     readonly commandCount: number;
     readonly durationMs: number;
   }
   ```
   - `commands: readonly string[]` - expects `['scout', 'move']`, not `['e4', 'Nf3']`

4. **No Chess Move Parsing**
   - Grep search: No code to convert FEN/SAN notation to UI representation
   - No board state tracking
   - No piece position updates from moves

**Verdict:** MatchViewer displays static mock data. Zero live move consumption.

---

## Question 6: Is the architecture reusable or should it be replaced?

### **Answer: PARTIALLY REUSABLE - Major Rework Required**

**Reusable Components:**

1. **Layout & Navigation Structure** ✅
   - File: `apps/web/src/App.tsx` (lines 124-197)
   - Tab-based view switching: Match Viewer, Tournament Dashboard, Replay Browser
   - Can be retained with minimal changes

2. **Tournament Dashboard** ✅
   - File: `apps/web/src/components/TournamentDashboard/`
   - Standings, recent matches, ELO ratings
   - Independent of game type (works for chess or RTS)
   - Can be reused as-is once real data flows

3. **Design System & Styling** ✅
   - Files: `apps/web/src/styles/` (colors.ts, typography.ts, animations.ts)
   - Professional esports styling with color palette, animations
   - Reusable across any game type

4. **Hook Architecture** ⚠️ Partially
   - File: `apps/web/src/hooks/`
   - Pattern of custom hooks for data fetching is sound
   - BUT they're RTS-specific (useGameStateHUD, useObjectiveTracker)
   - Core WebSocket connection pattern can be reused with new message types

**NOT Reusable - Must Replace:**

1. **Data Models** ❌
   - `GameState` (RTS: resources, population, units, buildings)
   - Must become: `ChessGameState` (FEN, move history, player clocks, evaluation)
   
2. **MatchViewState Type** ❌
   - File: `apps/web/src/types/index.ts` (lines 7-32)
   - Designed for RTS matches (currentTick, totalTicks, timeline trends)
   - Must become chess-specific: board state, move list, captured pieces

3. **Game Board Rendering** ❌
   - Does not exist - must be created or imported from library

4. **WebSocket Protocol** ❌
   - Current: `{type: 'state_update', state: MatchViewState}`
   - Must match chess runtime's actual event schema (doesn't exist yet)

5. **Mock Data** ❌
   - All RTS-based commands and decisions
   - Complete replacement needed for chess move notation

**Verdict:** ~40% code reusable (layout, styling, tournament view, hook patterns). ~60% must be rebuilt (data models, board rendering, WebSocket protocol). Not worth trying to adapt - cleaner to keep layout/styling, replace data layer.

---

## Question 7: Effort Estimate: Adapt vs Replace

### **Adaptation Effort (Use Existing Framework)**

| Task | Effort | Files | Notes |
|------|--------|-------|-------|
| Update GameState type for chess | 2 hours | types/index.ts | Replace RTS fields with FEN, move history, clocks |
| Update MatchViewState type | 1 hour | types/index.ts | Remove ticks/trends, add chess-specific data |
| Implement chess board component | 16 hours | NEW file | OR integrate react-chessboard (4h) |
| Update WebSocket protocol | 4 hours | broadcast-service.js + web provider | Define & implement message schema |
| Update DecisionEvent for moves | 1 hour | types/index.ts | Replace commands with UCI notation, FEN |
| Wire chess runtime → WebSocket server | 8 hours | chess.js + NEW broadcast server | Add WebSocket server to chess arena |
| Update hooks for chess data | 4 hours | hooks/ | New hooks for board state, move history |
| Remove RTS-specific components | 3 hours | components/ | Delete GameHUD, Minimap, ObjectiveTracker |
| **TOTAL ADAPTATION** | **~39 hours** | - | Keep layout, styling, tournament view |

### **Replacement Effort (Build Fresh)**

| Task | Effort | Files | Notes |
|------|--------|-------|-------|
| Create new React app with chess board | 8 hours | NEW app | react-vite + react-chessboard + tailwind |
| Implement WebSocket connection | 4 hours | NEW provider | Generic message handler |
| Create match viewer component | 6 hours | NEW component | Board + move history + controls |
| Create tournament dashboard | 2 hours | COPY from existing | ~180 lines, minimal changes |
| Add design system | 2 hours | NEW styles | Color palette, animations |
| Wire chess runtime → WebSocket | 8 hours | chess.js + NEW server | Same as adaptation |
| **TOTAL REPLACEMENT** | **~30 hours** | - | Start fresh, no legacy code |

### **Recommendation Matrix**

| Scenario | Best Approach |
|----------|---------------|
| If you want to keep the tournament dashboard | **Adapt existing** (39h) - reuse layout, styling, tournament view |
| If you need it done fastest | **Replace** (30h) - less cognitive load, cleaner code |
| If you need to ship soon | **Minimal adaptation** (24h) - Keep only layout/styling, rebuild data layer |
| If you want maximum reusability | **Adapt carefully** (39h) - Extract design system, reuse hooks pattern |

---

## Detailed Architecture Issues

### WebSocket Connection Path

**Currently Expected (Non-Existent):**
```
chess.js → ??? → WebSocket Server (port 3000)
↓
apps/web → ws://localhost:3000/ws (tries to connect, fails)
```

**Must Be Implemented:**
```
chess.js (RealChessGame) 
  ↓
broadcast-service.processMove()
  ↓
NEW: WebSocket Server (port 9000 or similar)
  ↓
apps/web (MatchDataProvider)
  ↓
React Components (render board, moves, stats)
```

### Data Model Transformation Required

**Current (RTS):**
```typescript
interface GameState {
  player1: { resources: {...}, population: {...}, units: number, buildings: number }
  player2: { resources: {...}, population: {...}, units: number, buildings: number }
}
```

**Needed (Chess):**
```typescript
interface ChessGameState {
  fen: string;
  moves: string[];  // e.g., ['e2e4', 'e7e5']
  capturedPieces: { white: string[], black: string[] };
  castlingRights: { white: string, black: string };
  halfmoveClock: number;  // For 50-move rule
  fullmoveNumber: number;
}
```

### Component Tree Mismatch

**Current MatchViewer:**
```
MatchViewer
  ├── MatchHeader (player names, status) ✅ Reusable
  ├── MatchProgress (RTS metrics)         ❌ Delete
  ├── MatchStats (RTS stats)              ❌ Replace
```

**Needed MatchViewer:**
```
MatchViewer
  ├── MatchHeader (player names, status)  ✅ Keep
  ├── ChessBoard (visual board)           🆕 New
  ├── MoveHistory (move list)             🆕 New
  ├── CapturedPieces (pieces taken)       🆕 New
  └── GameStats (time controls, eval)     🆕 New
```

---

## File-by-File Connection Status

| File | Purpose | Live Connected | Notes |
|------|---------|-----------------|-------|
| `chess.js` | Entry point | ❌ | Console output only, no WebSocket emission |
| `arena.js` | Game loop | ❌ | Drives games, calls broadcast, no streaming |
| `broadcast-service.js` | Event processing | ❌ | Logs to console, no network output |
| `real-chess-game.js` | Chess execution | ❌ | Pure chess logic, no networking |
| `board-display.js` | ASCII board | ✅ | Works great for terminal, not for web |
| `apps/web/src/App.tsx` | Main UI | ❌ | Expects WebSocket, gets mock data |
| `apps/web/src/providers/MatchDataProvider.tsx` | Data source | ❌ | WebSocket client to non-existent server |
| `apps/web/src/components/MatchViewer/*` | Board display | ❌ | No board component exists |
| `apps/web/src/types/index.ts` | Data models | ❌ | RTS types, not chess types |

---

## Critical Blockers for Production

1. **No WebSocket Server in Chess Runtime**
   - Blocker: Cannot stream live moves to web UI
   - Fix: Implement WebSocket server in broadcast-service.js

2. **Data Model Mismatch**
   - Blocker: MatchViewState/GameState designed for RTS, not chess
   - Fix: Define new chess-specific data types

3. **No Chess Board Component**
   - Blocker: Cannot render chess board visually
   - Fix: Implement board rendering (use react-chessboard library, ~4h)

4. **Protocol Undefined**
   - Blocker: What message format does chess runtime send?
   - Fix: Define protocol before implementing server/client

5. **Terminal ASCII Board ≠ Web Board**
   - The ASCII board in `board-display.js` is brilliant for terminal
   - But web needs interactive, clickable board
   - These are completely different implementations

---

## Recommendation

### **SHORT TERM (72 hours): Use ASCII Board**

For EPIC 71 Story 71.2 (20 complete games), continue using the working ASCII board in terminal:
```bash
npm run chess  # Terminal shows board + moves
# (optional) cd apps/web && npm run dev  # Web dashboard shows tournament standings only
```

**Pros:**
- Works today
- Real game execution proven
- Move visualization working
- Zero implementation time

**Cons:**
- Terminal-only (not "production" web UI)
- Can't click to select moves (read-only)

### **MEDIUM TERM (1-2 weeks): Build Chess Web UI**

Create a **new, purpose-built chess spectator UI**:

1. Keep `apps/web/src/` structure/styling (design system is solid)
2. Replace the data layer entirely:
   - New types for chess (FEN, moves, captured pieces)
   - New WebSocket protocol (move events with FEN)
3. Add chess board component (use react-chessboard library)
4. Implement WebSocket server in `broadcast-service.js` or standalone

**Estimated Effort:**
- WebSocket server: 4 hours
- Data layer replacement: 4 hours  
- Chess board component: 4-8 hours (or 2h with library)
- Wiring: 4 hours
- **Total: 16-20 hours**

**Result:** Clean, maintainable web spectator UI that actually works with live chess games.

### **LONG TERM: Migrate Architecture**

Once chess UI is working, consider extracting the game-agnostic parts:
- Layout/navigation patterns
- Design system
- Tournament dashboard
- WebSocket subscription pattern

These could serve future game adapters (Checkers, Go, etc.).

---

## Summary Table

| Question | Answer | Confidence | Blocker |
|----------|--------|-----------|---------|
| 1. Connected to runtime? | NO | 100% | YES - No WebSocket server |
| 2. Renders chess board? | NO | 100% | YES - No board component |
| 3. Uses live data? | NO | 100% | YES - Mock data only |
| 4. Has WebSocket client? | YES (broken) | 100% | Connects to non-existent server |
| 5. Consumes live moves? | NO | 100% | YES - Mock decisions only |
| 6. Architecture reusable? | PARTIAL (40%) | 85% | Data models must be rebuilt |
| 7. Effort to adapt/replace? | 39h / 30h | 70% | Significant work either way |

---

## Conclusion

**The current `apps/web` is NOT production-ready for chess spectator viewing.**

It is a **well-structured but completely non-functional prototype** designed for a different game type (0 A.D./RTS). The framework, styling, and patterns are solid, but the application is disconnected from runtime and displays mock data only.

### Production Readiness Path:

| Phase | Status | Timeline |
|-------|--------|----------|
| **EPIC 71.2 (20 games)** | Use ASCII board in terminal | 1 week ✅ |
| **Chess Web UI (MVP)** | Rebuild data layer + add board | 2-3 weeks 🔄 |
| **Production Ready** | Full feature set + testing | 4-5 weeks 📅 |

**Recommendation: Continue with ASCII board for EPIC 71.2. Allocate 20 hours in the following sprint to build a proper chess web UI using the existing design system.**
