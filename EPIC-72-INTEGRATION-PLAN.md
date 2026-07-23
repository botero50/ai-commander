# EPIC 72: Live Chess Spectator Experience - Integration Plan

## Overview
EPIC 72 integrates all completed backend systems to create a production-ready live chess spectator experience.

## Current Status

### ✅ Completed Components

1. **WebSocket Server** (`websocket-server.js`)
   - Supports multiple concurrent clients
   - Broadcasts real-time events
   - Handles reconnection
   - 5-second heartbeat
   - Event history (last 1000 events)

2. **Arena** (`arena.js`)
   - Manages continuous match execution
   - Configures two Ollama brains
   - Calls WebSocket server for broadcasts
   - Emits GameStarted, MovePlayed, GameFinished, ArenaStatisticsUpdated

3. **Real Chess Game** (`real-chess-game.js`)
   - Uses chess.js for move validation
   - Queries Ollama for AI decisions
   - Executes moves through BroadcastService
   - Emits MovePlayed events to WebSocket server

4. **React Spectator UI** (`apps/web/src/components/ChessSpectator/ChessSpectator.tsx`)
   - Connects to WebSocket at localhost:9000
   - Displays live chessboard with current FEN
   - Shows player names and Ollama models
   - Displays move history with latency
   - Shows game status and arena statistics
   - EPIC 73: Health status, match restart countdown

5. **WebSocket Hook** (`apps/web/src/hooks/useWebSocket.ts`)
   - Manages WebSocket connection lifecycle
   - Auto-reconnect with exponential backoff
   - Parses all message types
   - Updates game state in real-time

6. **Styling** (`apps/web/src/components/ChessSpectator/ChessSpectator.css`)
   - Dark esports theme
   - Professional layout
   - Responsive design
   - EPIC 73 components styled

## Architecture Flow

```
Ollama
  ↓
Chess Arena (arena.js)
  ├─→ RealChessGame (play moves)
  │   └─→ Ollama (AI decisions)
  │       └─→ Move execution
  │           └─→ WebSocket: emitMovePlayed()
  │
  └─→ WebSocket Server (websocket-server.js port 9000)
      └─→ Broadcast to all clients
          └─→ React UI (apps/web)
              └─→ Chessboard updated
```

## Production Checklist

### Story 72.1: WebSocket Server ✅
- [x] Single WebSocket server on port 9000
- [x] Auto-startup from arena.js
- [x] Multiple concurrent clients supported
- [x] Heartbeat (5 seconds)
- [x] Real events (no fakes)

### Story 72.2: Chess Spectator Application ✅
- [x] React UI with chess board
- [x] Top: Player names + models + ELO + thinking indicator
- [x] Center: Large chess board
- [x] Right: Move history, commentary, evaluation, captured pieces, arena stats
- [x] No RTS widgets

### Story 72.3: Live Synchronization ✅
- [x] FEN updates instantly
- [x] Move history updates
- [x] Commentary receives
- [x] Evaluation displays
- [x] No polling (WebSocket only)
- [x] <100ms latency

### Story 72.4: Production Broadcast Mode (Pending)
- [ ] OBS integration
- [ ] Fullscreen mode without browser chrome
- [ ] Auto-hide mouse cursor
- [ ] Dark esports theme (CSS done)
- [ ] Automatic transitions
- [ ] Large move animations
- [ ] Winner animations

## Integration Testing Plan

### Phase 1: Start Services
1. Ensure Ollama is running (`ollama serve`)
2. Run: `pnpm chess` (starts arena + WebSocket)
3. In another terminal: `cd apps/web && npm run dev`
4. Open: http://localhost:5173

### Phase 2: Verify WebSocket Connection
- [ ] Connection status shows "Connected to Arena" (green indicator)
- [ ] Message count increases in console
- [ ] No connection errors

### Phase 3: Verify Game Flow
- [ ] Game starts: Players appear in ribbons
- [ ] Chessboard displays starting position
- [ ] Game status shows "🔴 LIVE"
- [ ] Move count increments

### Phase 4: Verify Moves
- [ ] Each move updates FEN
- [ ] Move history shows latest moves
- [ ] Latency displayed correctly
- [ ] Captured pieces appear when pieces are taken

### Phase 5: Verify Commentary
- [ ] Commentary events appear in real-time
- [ ] Severity colors correct
- [ ] Max 5 recent shown

### Phase 6: Verify Arena Stats
- [ ] Total games increments after each game
- [ ] W/B/D shows correct ratios
- [ ] Games/Hour calculates correctly
- [ ] Avg Moves shown

### Phase 7: Verify Health (EPIC 73)
- [ ] Ollama health status shows (🟢 healthy, 🔴 unhealthy)
- [ ] Updates every 30 seconds

### Phase 8: Verify Reconnection
- [ ] Disconnect WebSocket in DevTools
- [ ] Status shows "Connecting..."
- [ ] Auto-reconnects within 5 seconds
- [ ] Game state resumes

## Known Limitations
- No OBS integration yet (Story 72.4)
- No fullscreen broadcast mode (Story 72.4)
- No animation of piece movements yet
- No reply/seek functionality yet

## Files to Review

### Backend
- `/websocket-server.js` — Event broadcasting
- `/arena.js` — Main loop, event emission
- `/real-chess-game.js` — Move execution, WebSocket integration
- `/broadcast-service.js` — Commentary generation

### Frontend
- `/apps/web/src/components/ChessSpectator/ChessSpectator.tsx` — Main UI
- `/apps/web/src/hooks/useWebSocket.ts` — WebSocket management
- `/apps/web/src/components/ChessSpectator/ChessSpectator.css` — Styling
- `/apps/web/src/App.tsx` — App entry point

## Success Criteria
When `pnpm chess` is executed:
1. Arena starts and shows match headers
2. WebSocket server starts on port 9000
3. Opening second terminal: `cd apps/web && npm run dev`
4. Browser: http://localhost:5173 shows live chessboard
5. Moves update in real-time from live Ollama matches
6. Arena statistics update after each game
7. Connection never drops (or reconnects automatically)

## Next Steps (EPIC 72 Story 72.4)
- Add OBS broadcast integration
- Create fullscreen mode
- Add piece movement animations
- Add winner celebration animation
- Test with YouTube streaming
