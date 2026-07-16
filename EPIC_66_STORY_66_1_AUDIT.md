# EPIC 66 Story 66.1: Broadcast Integration Audit
# RUNTIME SERVICE EXECUTION MAP

**Date**: July 16, 2026
**Status**: AUDIT IN PROGRESS
**Goal**: Map every broadcast service to runtime execution

---

## EXECUTIVE SUMMARY

This audit identifies every broadcast and event-related service in AI Commander and documents:
1. Who creates it (instantiation point)
2. Who owns it (responsibility)
3. Who calls it (invocation path)
4. When (trigger conditions)
5. How often (frequency)
6. **CRITICAL**: Whether it executes during a real chess match

---

## AUDIT FINDINGS

### ✅ SERVICES IDENTIFIED

#### 1. ChessStartup (chess.js)
**Location**: `/c/Users/boter/ai-commander/chess.js`  
**Instantiation**: Root entry point when `pnpm chess` runs  
**Ownership**: Main process  
**Calls To**: ChessArena (after dependency verification)  
**When**: On application startup  
**Frequency**: Once per session  
**Status**: ✅ EXECUTES - Verified startup flow  

```javascript
const startup = new ChessStartup();
startup.run().catch(...); // Auto-runs on module load
```

**Executes?** YES - Entry point verified

---

#### 2. ChessArena (arena.js)
**Location**: `/c/Users/boter/ai-commander/arena.js`  
**Instantiation**: Called by ChessStartup.run() after dependency checks  
**Ownership**: Main game loop  
**Calls To**: 
  - BroadcastService (instantiated in constructor)
  - ChessUI (for display)
  - Match configuration selection
  
**When**: After startup completes  
**Frequency**: Once per session, runs infinite loop  
**Status**: ⚠️ PARTIAL - Game loop exists but uses simulated moves

```javascript
const { ChessArena } = await import('./arena.js');
const arena = new ChessArena();
await arena.run();
```

**Instantiation in constructor:**
```javascript
this.broadcast = new BroadcastService({
  stream: {
    obsWebSocketUrl: 'ws://localhost:4455',
    youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID || '',
    streamTitle: 'AI Chess Tournament - Live',
  },
});
```

**Executes?** PARTIALLY - Loop runs but `simulateGame()` uses fake moves (line 244)

**🔴 BLOCKER**: `simulateGame()` does not execute real chess. It generates random moves from a predefined list. This is SIMULATED, not REAL.

---

#### 3. BroadcastService (broadcast-service.js)
**Location**: `/c/Users/boter/ai-commander/broadcast-service.js`  
**Instantiation**: Constructed in ChessArena line 43-49  
**Ownership**: Arena instance  
**Calls To**:
  - ChessEventDetector (line 19)
  - CommentaryGenerator (line 20)
  - ReplaySystem (line 21)
  - MatchSummaryGenerator (line 22)
  - YouTubeStreamService (line 23)

**When**: 
  - OBS connection attempted: line 83 in arena.run()
  - Reset called before each game: line 246 in arena.simulateGame()
  - processMove called for each move: (NOT CALLED - blocker)
  - displayReplays called: line 102 in arena.run()
  - displayMatchSummary called: line 105 in arena.run()

**Frequency**: Once per session (instantiation), reset per game, processMove should be per move  
**Status**: ⚠️ PARTIAL - Instantiated and partially called, but `processMove()` never invoked

```javascript
// Constructed in ChessArena
this.broadcast = new BroadcastService({...});

// Called at start
await this.broadcast.streamService.connect(); // line 83

// Called per game
this.broadcast.reset(); // line 246

// Called after match
await this.displayReplays(); // line 102
this.displayMatchSummary(result, ...); // line 105
```

**Executes?** PARTIALLY - Service created, stream attempted, replays/summary called, but processMove() never invoked during game

**🔴 BLOCKER**: processMove() is the core method that executes event detection, commentary, and replay capture. It is NEVER CALLED because simulateGame() doesn't process real moves through broadcast pipeline.

---

#### 4. ChessEventDetector (event-detector.js)
**Location**: `/c/Users/boter/ai-commander/event-detector.js`  
**Instantiation**: Constructed in BroadcastService line 19  
**Ownership**: BroadcastService  
**Calls To**: Called by BroadcastService.processMove() line 43  
**When**: Should be on every move  
**Frequency**: Every move in game  
**Status**: 🔴 NEVER EXECUTES - Depends on processMove() never being called

```javascript
const events = this.eventDetector.detectEvents(moveData, {});
```

**Methods**:
- `detectEvents(moveData, context)` - Main detection
- `detectTacticalPatterns(moveData)` - Fork/pin/skewer
- `evaluateMoveQuality(moveData)` - Brilliant/blunder
- `getCriticalEvents()` - Filter high-impact events
- `getEventsByType(type)` - Query by type
- `reset()` - Clear for new game

**Executes?** NO - Never invoked because processMove() never called

---

#### 5. CommentaryGenerator (commentary-generator.js)
**Location**: `/c/Users/boter/ai-commander/commentary-generator.js`  
**Instantiation**: Constructed in BroadcastService line 20  
**Ownership**: BroadcastService  
**Calls To**: Called by BroadcastService.processMove() line 48  
**When**: Should be on every event  
**Frequency**: Per event per game  
**Status**: 🔴 NEVER EXECUTES - Depends on processMove() never being called

```javascript
const commentary = this.commentaryGenerator.generateCommentary(event, playerName);
```

**Methods**:
- `generateCommentary(event, playerName)` - Single option
- `generateBestCommentary(event, playerName)` - Random from options
- `generateMultipleCommentary(event, playerName, count)` - Multiple variations
- `getCommentaryByEvent(eventType)` - Pre-set commentary
- `reset()` - Clear for new game

**Executes?** NO - Never invoked

---

#### 6. ReplaySystem (replay-system.js)
**Location**: `/c/Users/boter/ai-commander/replay-system.js`  
**Instantiation**: Constructed in BroadcastService line 21  
**Ownership**: BroadcastService  
**Calls To**: 
  - handleCriticalEvent() in BroadcastService line 58
  - displayReplays() in Arena line 102
  
**When**: 
  - saveReplay() called from handleCriticalEvent() - never happens
  - playReplay() called from displayReplays() - should execute
  - displayReplaySummary() called from displayReplays() - should execute

**Frequency**: Per critical event, then all at end of game  
**Status**: ⚠️ PARTIAL - displayReplays() will execute but there are no replays to display

```javascript
// In BroadcastService.handleCriticalEvent() (never called)
this.replaySystem.generateCheckmateReplay(this.recentMoves, playerName);

// In Arena.displayReplays() (will execute)
await this.displayReplays();
for (const replay of replays) {
  await this.replaySystem.playReplay(replay);
}
this.replaySystem.displayReplaySummary();
```

**Methods**:
- `saveReplay(replayData)` - Save moment
- `generateCheckmateReplay(moves, winner)` - Auto-capture checkmate
- `generateSacrificeReplay(moves, player)` - Auto-capture sacrifice
- `generateTacticalReplay(moves, player, type)` - Auto-capture tactic
- `playReplay(replay, speed)` - Move-by-move playback
- `getReplays(type)` - Query
- `getReplayStats()` - Statistics
- `getMostCriticalReplay()` - Ranking
- `displayReplaySummary()` - Show summary
- `reset()` - Clear for new game

**Executes?** PARTIAL - Display code executes but no replays captured (because processMove never called)

---

#### 7. MatchSummaryGenerator (match-summary-generator.js)
**Location**: `/c/Users/boter/ai-commander/match-summary-generator.js`  
**Instantiation**: Constructed in BroadcastService line 22  
**Ownership**: BroadcastService  
**Calls To**: Called by BroadcastService.displayMatchSummary() line 239  
**When**: After game ends (line 105 in arena.run())  
**Frequency**: Once per game  
**Status**: ✅ EXECUTES - Called and will display

```javascript
displayMatchSummary(matchData) {
  const summary = this.generateMatchSummary(matchData);
  this.summaryGenerator.displaySummary(summary);
  return summary;
}
```

**Methods**:
- `generateSummary(matchData)` - Complete summary generation
- `detectOpening(moves)` - Opening identification
- `calculateStatistics(moves, duration)` - Game stats
- `findDecisiveMoment(moves, result, replays)` - Key turning point
- `extractCriticalMoments(replays)` - Top 3 moments
- `predictRatingChanges(matchData, stats)` - ELO prediction
- `displaySummary(summary)` - Show result
- `generateBrief(summary)` - One-liner
- `exportAsJSON(summary)` - Export
- `displayNextMatchPreview(nextMatch)` - Next game info
- `generateNextMatchPreview(nextMatch)` - Format next match

**Executes?** YES - Will execute after each game, but with limited data (only simulated move list, no real events)

---

#### 8. YouTubeStreamService (youtube-stream-service.js)
**Location**: `/c/Users/boter/ai-commander/youtube-stream-service.js`  
**Instantiation**: Constructed in BroadcastService line 23  
**Ownership**: BroadcastService  
**Calls To**: 
  - connect() called from Arena line 83
  - broadcastEvent() called from BroadcastService.processMove() - never happens
  - captureClip() called from BroadcastService.displayReplays() line 217
  - displayDashboard() called manually

**When**: 
  - connect() - on arena startup
  - broadcastEvent() - should be per event, never called
  - captureClip() - per replay (if replays exist)
  - displayDashboard() - manual

**Frequency**: Once (connect), per event (broadcast), per replay (clip)  
**Status**: ⚠️ PARTIAL - Connection attempted, but event broadcasting never called

```javascript
// Arena startup (line 83)
await this.broadcast.streamService.connect();

// Never called (in processMove)
this.streamService.broadcastEvent(event);

// Called if replays exist (line 217)
this.streamService.captureClip(replay.description, 30);
```

**Methods**:
- `async connect()` - OBS WebSocket connection
- `async startStream()` - YouTube RTMP
- `async stopStream()` - End broadcast
- `async switchScene(sceneName)` - Change scene
- `updateOverlay(data)` - Update display data
- `getOverlayDisplay()` - Get formatted overlay
- `broadcastEvent(event)` - Send event to stream
- `captureClip(description, duration)` - Save highlight
- `startHealthMonitoring()` - Monitor stream
- `calculateHealth()` - Score health
- `displayDashboard()` - Show metrics
- `displayProductionChecklist()` - Go/no-go
- `generateBroadcastSummary()` - Final stats
- `formatDuration(seconds)` - Time formatting

**Executes?** PARTIAL - Connection attempted, but core broadcastEvent() never invoked

---

#### 9. ChessUI (ui.js)
**Location**: `/c/Users/boter/ai-commander/ui.js`  
**Instantiation**: Constructed in ChessStartup and ChessArena  
**Ownership**: Startup and Arena  
**Calls To**: Called throughout for display  
**When**: Throughout execution  
**Frequency**: Multiple times per game  
**Status**: ✅ EXECUTES - Verified

**Executes?** YES - Confirmed execution

---

### ❌ MISSING REAL CHESS EXECUTION

**The critical missing piece**: ChessArena.simulateGame() (line 244)

Current code (lines 244-283):
```javascript
async simulateGame(matchConfig, matchNumber) {
  // Reset broadcast for new game
  this.broadcast.reset();

  // This is a placeholder for actual game execution
  // In a real implementation, this would:
  // 1. Create a ChessAdapter session
  // 2. Create Brain instances for each player
  // 3. Run ChessGameLoop with personality configs
  // 4. Process each move through BroadcastService
  // 5. Return result with moves

  // For now, simulate a game with random result
  const moves = this.generateRandomMoves();
  const results = ['white-win', 'black-win', 'draw'];
  const result = results[Math.floor(Math.random() * results.length)];

  // Simulate move processing with events
  const isWhiteToMove = (moveIndex) => moveIndex % 2 === 0;
  for (let i = 0; i < Math.min(moves.length, 3); i++) {
    // Only process first 3 moves for demo (to keep output manageable)
    const playerName = isWhiteToMove(i) ? matchConfig.white.name : matchConfig.black.name;
    const moveData = { move: moves[i], fen: 'simulated' };

    // Process through broadcast service
    const broadcasts = this.broadcast.processMove(moveData, playerName);

    // Display live commentary
    for (const broadcast of broadcasts) {
      this.broadcast.displayBroadcast(broadcast);
      await this.delay(500); // Brief delay between events
    }
  }

  // ... returns simulated result
}
```

**Problems**:
1. Uses `generateRandomMoves()` instead of real chess game
2. Processes only first 3 moves
3. No real game state via chess.js
4. No real player decisions via Brains
5. No real ChessAdapter session
6. No real game loop

---

## ARCHITECTURAL GAP ANALYSIS

### What Exists (Implemented Services)
- ✅ ChessStartup (diagnostics + dependency verification)
- ✅ ChessArena (game loop structure)
- ✅ BroadcastService (hub for all broadcast services)
- ✅ ChessEventDetector (event detection library)
- ✅ CommentaryGenerator (commentary library)
- ✅ ReplaySystem (replay capture & playback)
- ✅ MatchSummaryGenerator (summary generation)
- ✅ YouTubeStreamService (OBS integration)
- ✅ ChessUI (display layer)

### What's Missing (Real Game Execution)
- ❌ Real chess.js game instance per match
- ❌ Real ChessAdapter integration
- ❌ Real Brain instances (Ollama/Stockfish)
- ❌ Real game loop that generates legal moves
- ❌ Real move-by-move execution through broadcast pipeline
- ❌ Real game state tracking
- ❌ Real PGN generation

### What Can't Execute Until Gap Closed
- ❌ ChessEventDetector (needs real moves via processMove)
- ❌ CommentaryGenerator (needs events from detector)
- ❌ ReplaySystem (needs events to capture)
- ❌ YouTubeStreamService.broadcastEvent() (needs events)
- ❌ Event-based stream updates

### What Can Execute with Fake Data
- ✅ MatchSummaryGenerator (gets move list, can generate)
- ✅ YouTubeStreamService.connect() & display
- ✅ ReplaySystem display (if replays exist)
- ✅ ChessUI output

---

## WIRING STATUS

### Current Execution Path (When simulateGame runs)
```
ChessArena.run()
  ├─ loadConfig() ✅
  ├─ initializePlayers() ✅
  ├─ displayArenaStarted() ✅
  ├─ streamService.connect() ✅ (attempted)
  └─ Main loop:
      ├─ selectPlayers() ✅
      ├─ displayMatchConfig() ✅
      ├─ simulateGame() ⚠️ (USES FAKE MOVES)
      │   ├─ broadcast.reset() ✅
      │   ├─ generateRandomMoves() ❌ (NOT REAL)
      │   ├─ broadcast.processMove() ⚠️ (called 3 times only)
      │   │   ├─ eventDetector.detectEvents() ⚠️ (sees fake move)
      │   │   ├─ commentaryGenerator.generateCommentary() ⚠️ (fake event)
      │   │   └─ handleCriticalEvent() ⚠️ (fake event)
      │   └─ return result ❌ (random, not real)
      ├─ displayResult() ✅
      ├─ displayReplays() ⚠️ (no replays, empty list)
      ├─ displayMatchSummary() ✅ (shows fake game)
      ├─ updateStats() ✅
      └─ waitForNextMatch() ✅
```

### Required Execution Path (After Real Game Wiring)
```
ChessArena.run()
  ├─ loadConfig() ✅
  ├─ initializePlayers() ✅
  ├─ displayArenaStarted() ✅
  ├─ streamService.connect() ✅
  └─ Main loop:
      ├─ selectPlayers() ✅
      ├─ displayMatchConfig() ✅
      ├─ startRealGame() [NEEDED]
      │   ├─ create ChessAdapter session
      │   ├─ create Brain instances
      │   ├─ start ChessGameLoop
      │   └─ while (!game.isOver):
      │       ├─ get legal moves
      │       ├─ call Brain for decision
      │       ├─ apply move to board
      │       ├─ broadcast.processMove() ✅ (REAL MOVE)
      │       │   ├─ eventDetector.detectEvents() ✅
      │       │   ├─ commentaryGenerator.generateCommentary() ✅
      │       │   ├─ replaySystem.handleCriticalEvent() ✅
      │       │   └─ streamService.broadcastEvent() ✅
      │       └─ check game over
      ├─ displayResult() ✅
      ├─ displayReplays() ✅ (REAL REPLAYS)
      ├─ displayMatchSummary() ✅ (REAL SUMMARY)
      ├─ updateStats() ✅
      └─ waitForNextMatch() ✅
```

---

## RECOMMENDATION

**DO NOT proceed with EPIC 66-70 until this blocker is fixed.**

The core issue is not wiring, it's that simulateGame() is a stub. Everything else is correctly wired, but it processes fake data.

**Fix Strategy**:
1. Examine chess-adapter TypeScript implementation
2. Create real game execution in simulateGame()
3. Wire ChessAdapter, Brains, and GameLoop
4. Ensure every move goes through broadcast pipeline
5. Then continue with EPIC 66 story progression

**This is not a missing feature problem, it's an integration problem.**

The broadcast pipeline is built and wired. The chess game loop exists in TypeScript. They just need to be connected.

---

## AUDIT COMPLETE

**Summary**:
- ✅ 9 services identified
- ✅ 8 services wired (partially or fully)
- ❌ 1 critical gap: simulateGame() uses fake moves
- 🔴 BLOCKER: Real game must execute before broadcast services can process real events

**Next Step**: Fix simulateGame() to use real chess game execution (outside scope of audit)

Then proceed with:
- EPIC 66 Story 66.2: Runtime Event Wiring
- EPIC 66 Story 66.3: Replay Verification
- EPIC 66 Story 66.4: Summary Integration
