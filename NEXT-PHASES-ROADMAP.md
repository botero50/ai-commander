# EPIC 73-75 Roadmap: What's Next

## Overview

EPIC 72 (Live Chess Spectator) is complete ✅

The following EPICs are ready for implementation:

- **EPIC 73:** Continuous Arena Mode (24/7 streaming)
- **EPIC 74:** Streaming Experience (OBS, highlights, YouTube)
- **EPIC 75:** Production Polish (performance, animations, validation)

---

## 🎬 EPIC 73: Continuous Arena Mode

**Status:** Features already integrated, ready for comprehensive testing

### Current State

Already implemented in code:
- ✅ Auto match restart countdown (emitMatchRestartIn)
- ✅ Health monitoring (emitHealthStatus)
- ✅ Graceful recovery logic
- ✅ Statistics persistence
- ✅ Game history tracking

**Files involved:**
- `arena.js` - Main loop with health checks, restart countdown
- `websocket-server.js` - Health and restart event emission
- `real-chess-game.js` - Error handling & recovery
- `ChessSpectator.tsx` - Display countdown & health status

### Story 73.1: Automatic Match Restart

**Requirement:** When a game finishes, wait configurable delay, start new game

**Current Implementation:**
```javascript
// In arena.js:
await this.countdownToNextMatch(this.config.matchDelayMs);
this.wsServer.emitMatchRestartIn(secondsRemaining, nextMatchNumber);
```

**Status:** ✅ Complete - Needs testing

**Testing Plan:**
1. Start `pnpm chess`
2. Watch first game complete
3. Verify countdown appears in browser
4. Verify next game starts automatically
5. Run 10+ games continuously
6. Check `arena-statistics.json` for correct count

### Story 73.2: Random Civilization Assignment

**Requirement:** For future chess/other games, randomize player assignment

**Current Implementation:**
```javascript
// In arena.js selectPlayers():
const whiteIdx = Math.floor(Math.random() * this.players.length);
let blackIdx = Math.floor(Math.random() * this.players.length);
while (blackIdx === whiteIdx) {
  blackIdx = Math.floor(Math.random() * this.players.length);
}
```

**Status:** ✅ Complete - Already randomizes players and personalities

**Testing Plan:**
1. Run `pnpm chess` for 5+ games
2. Verify players change (should not be same twice in a row)
3. Verify personalities change (Aggressive, Defensive, etc.)
4. Check output in Terminal showing different matchups

### Story 73.3: Arena Rotation

**Requirement:** Maintain and display live statistics:
- Games played
- Wins/Losses/Draws
- Average duration
- Average thinking time
- Average moves

**Current Implementation:**
```javascript
// In arena.js:
this.arenaState = {
  totalGames: 0,
  whiteWins: 0,
  blackWins: 0,
  draws: 0,
  gameHistory: [],
};

this.broadcastStatistics(); // Emits to WebSocket
```

**Status:** ✅ Complete - Statistics tracked and broadcast

**Testing Plan:**
1. Start arena
2. Browser shows Arena Stats panel
3. After 1 game: check stats update
4. After 10 games: verify W/B/D ratios correct
5. Check `arena-statistics.json` for historical data

### Story 73.4: 24/7 Streaming Mode

**Requirement:** Arena never stops. Auto-restart on disconnects.

**Current Implementation:**
```javascript
// In arena.js - main loop:
while (true) {  // Infinite loop
  try {
    // Play game
    // Update stats
    // Restart countdown
  } catch (error) {
    console.error(`Match error: ${error.message}`);
    this.wsServer.emitGameError({error: error.message, matchNumber});
    await this.delay(10000);  // Wait 10s before retry
  }
}

// Health monitoring every 30 seconds
this.startHealthMonitor();

// Graceful shutdown (Ctrl+C)
process.on('SIGINT', () => this.shutdown());
```

**Status:** ✅ Complete - Core loop infinite with error handling

**Testing Plan:**
1. Start arena: `pnpm chess`
2. Let it run for 1 hour continuously
3. Monitor memory usage (should stay stable)
4. Check CPU usage (should be consistent)
5. Verify statistics file grows (one game ~10 min)
6. Kill Ollama, verify arena detects and reports error
7. Restart Ollama, verify arena recovers
8. Test browser disconnect and reconnect
9. Verify WebSocket reconnects automatically
10. Check for any memory leaks

### EPIC 73 Acceptance Criteria

- [ ] Run continuously for 24 hours without intervention
- [ ] Games auto-restart every 5 seconds (configurable)
- [ ] Health monitoring reports Ollama status
- [ ] Graceful recovery from Ollama disconnect
- [ ] Statistics persist to disk
- [ ] Browser can disconnect/reconnect without losing stream
- [ ] Memory usage stable over 24 hours
- [ ] CPU usage consistent
- [ ] No crash or hang scenarios

---

## 🎥 EPIC 74: Streaming Experience

**Status:** Planning phase - Not yet implemented

### Story 74.1: Professional Overlay

Display on stream:
- Player names and models
- Move count
- Evaluation (from engine)
- Thinking time
- Arena score (W/B/D)
- FPS counter
- Game number
- Stream uptime

**Implementation Plan:**
1. Create `StreamingOverlay` component
2. Add FPS counter (use requestAnimationFrame)
3. Display metrics from WebSocket events
4. Update every move
5. Professional esports styling
6. OBS integration for fullscreen

**Estimated Effort:** 8-12 hours

### Story 74.2: Automatic Highlights

Generate highlights for:
- Check
- Checkmate
- Sacrifice
- Fork
- Pin
- Skewer
- Brilliant move
- Blunder

**Implementation Plan:**
1. Analysis service to detect these positions
2. Tag moves when they occur
3. Store highlight timestamps
4. Replay system shows highlights
5. Auto-generate highlight reel after match
6. Export as clip for social media

**Existing systems:**
- Commentary already detects some events
- Need to formalize event detection
- Need clip/replay generation

**Estimated Effort:** 12-16 hours

### Story 74.3: Replay Integration

Integrate existing replay system:
- Replay button in UI
- Timeline scrubber
- Speed controls (0.5x, 1x, 2x)
- Pause/resume
- Seek to specific move
- Click move history to jump

**Current Status:**
- Replay system exists (`replay-system.js`)
- Need to wire to UI
- Need to handle FEN-to-move conversion

**Estimated Effort:** 4-6 hours

### Story 74.4: YouTube Production Mode

One command auto-launches everything:
```bash
pnpm chess:stream
```

Should:
1. Start Ollama
2. Start arena
3. Start WebSocket
4. Launch web dev server
5. Open browser in fullscreen
6. Show professional overlay
7. Ready to stream to YouTube
8. No manual configuration

**Implementation Plan:**
1. Create `stream.js` orchestrator
2. Check Ollama running
3. Launch all services
4. Wait for WebSocket ready
5. Open browser fullscreen
6. Start streaming mode UI

**Estimated Effort:** 4-8 hours

### EPIC 74 Acceptance Criteria

- [ ] Professional overlay displays all metrics
- [ ] Highlights auto-detected for key moments
- [ ] Replay system fully integrated to UI
- [ ] One command starts everything: `pnpm chess:stream`
- [ ] Output ready for YouTube streaming
- [ ] OBS can capture at 1080p 60FPS
- [ ] No visible lag or artifacts

---

## ✨ EPIC 75: Production Polish

**Status:** Planning phase - Not yet implemented

### Story 75.1: Performance

Target:
- 60 FPS UI
- No unnecessary rerenders
- Virtualized move history (only show visible items)
- Efficient WebSocket updates (batch when needed)

**Implementation Plan:**
1. Profile UI with React DevTools
2. Add React.memo to components
3. Virtualize move history list
4. Batch WebSocket updates if needed
5. Optimize CSS animations
6. Load test with 1000+ concurrent clients

**Estimated Effort:** 6-10 hours

### Story 75.2: Professional Animations

Animate:
- Piece movement (smooth slide)
- Capture animation (piece disappears with effect)
- Check animation (red highlight board)
- Checkmate animation (crown/celebration)
- Game start (board enters from side)
- Winner animation (confetti, bouncing)
- Replay scrubbing (smooth rewind)

**Implementation Plan:**
1. Add CSS keyframes for each animation
2. Trigger on specific events
3. Use `requestAnimationFrame` for smooth movement
4. Add sound effects (optional)
5. Test performance impact

**Estimated Effort:** 8-12 hours

### Story 75.3: Spectator UX

Ensure:
- Dark esports theme (✅ done)
- Responsive design (✅ done)
- Keyboard shortcuts (H=HUD, M=Minimap, Esc=Close)
- Fullscreen mode (F key)
- Reconnect notification
- Loading screen
- Professional branding

**Implementation Plan:**
1. Add keyboard shortcut handler
2. Create fullscreen toggle
3. Add reconnect toast notification
4. Improve loading screen
5. Add logo/branding
6. Test on 720p, 1080p, 1440p, 2K

**Estimated Effort:** 6-10 hours

### Story 75.4: Production Validation

Run for 100 continuous games, measure:
- Memory usage (should stay stable)
- CPU usage (should be consistent)
- WebSocket latency (should be <100ms)
- Frame rate (should stay 60 FPS)
- Dropped frames (should be 0)
- Reconnects (should auto-recover)
- Failures (should be 0)

**Implementation Plan:**
1. Create metrics collection system
2. Run automated test suite
3. Generate performance report
4. Document any issues found
5. Fix critical issues
6. Report production readiness

**Estimated Effort:** 4-8 hours

### EPIC 75 Acceptance Criteria

- [ ] UI runs at constant 60 FPS
- [ ] No visible jank or stuttering
- [ ] Animations smooth and professional
- [ ] Responsive on all screen sizes
- [ ] Keyboard shortcuts working
- [ ] Fullscreen mode available
- [ ] 100 game stress test passes
- [ ] Memory stable over 24+ hours
- [ ] Production validation report generated

---

## 📊 Implementation Priority

### Phase 1 (Immediate) - EPIC 73
Focus: Test and validate continuous arena mode
- All code already written
- Just needs comprehensive testing
- Can start immediately
- ~40 hours of testing

### Phase 2 (Week 1-2) - EPIC 74.1 & 74.3
Focus: Replay integration and overlay
- UI work (most effort)
- Integrate existing systems
- ~20 hours

### Phase 3 (Week 2-3) - EPIC 74.2 & 74.4
Focus: Highlights and production startup
- Event detection (already partially done)
- Orchestration script
- ~24 hours

### Phase 4 (Week 3-4) - EPIC 75
Focus: Polish and production validation
- Performance optimization
- Animations
- Testing & validation
- ~30 hours

---

## 🎯 Success Metrics by EPIC

### EPIC 73: Continuous Arena Mode
✅ **Done when:**
- 24+ hours of continuous play without manual intervention
- All games auto-restart correctly
- Statistics tracked accurately
- Health monitoring working
- Browser reconnection seamless

### EPIC 74: Streaming Experience
✅ **Done when:**
- Professional overlay displays all metrics
- One command `pnpm chess:stream` launches everything
- Ready for YouTube streaming
- OBS can capture full HD
- Highlights auto-generated

### EPIC 75: Production Polish
✅ **Done when:**
- 60 FPS consistent performance
- 100 game stress test passes
- Memory stable 24+ hours
- All animations smooth
- Zero production issues found

---

## 🚀 Starting EPIC 73 Testing

Ready to start testing EPIC 73 immediately:

```bash
# Terminal 0
ollama serve

# Terminal 1
pnpm chess

# Terminal 2
cd apps/web && npm run dev

# Terminal 3 - Monitor statistics
watch 'cat arena-statistics.json | jq'

# Terminal 4 - Monitor performance
watch 'top -p $(pgrep -f "ollama serve")'
```

Then observe:
1. Games auto-restart every 5 seconds
2. Move count increments continuously
3. Statistics update after each game
4. Health status shows Ollama healthy
5. No crashes or hangs
6. Browser stays connected

Run for 24+ hours and document results.

---

## 📝 Next Steps

1. **Read this roadmap** - Understand phases ahead
2. **Start EPIC 73 testing** - Run continuous arena for 24 hours
3. **Document results** - Note any issues
4. **Plan EPIC 74** - Design overlay and highlight system
5. **Execute EPIC 74.1 & 74.3** - Replay + overlay
6. **Execute EPIC 74.2 & 74.4** - Highlights + startup
7. **Execute EPIC 75** - Polish and validation

---

## 💭 Questions Before Starting?

Check these documents:
- EPIC-72-README.md - Current system overview
- EPIC-72-PRODUCTION-DEPLOYMENT.md - How to run 24/7
- EPIC-72-ENV-CONFIG-GUIDE.md - Configuration options

Then proceed to EPIC 73 testing phase!
