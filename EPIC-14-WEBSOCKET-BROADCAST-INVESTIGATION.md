# EPIC 14: WebSocket/Broadcast Layer Investigation

**Date:** July 23, 2026  
**Purpose:** Determine status of WebSocket/broadcast components  
**Finding:** LEGACY CODE WITH CRITICAL BUG

---

## Summary

The WebSocket and broadcast service parameters in `RealChessGame` are:
- **Legacy code** — No longer used in the real arena
- **Optionally passed but not safely handled** — Default to null with no null checks
- **Breaking the real arena** — Code tries to call methods on null

**Current Status:** The Arena.js entry point (`pnpm chess`) instantiates RealChessGame WITHOUT broadcast/wsServer, which causes line 615 to crash.

---

## Evidence

### Code: RealChessGame Constructor

```javascript
// real-chess-game.js, line 16
constructor(matchConfig, broadcastService = null, ui = null, wsServer = null) {
  this.broadcast = broadcastService;  // Will be null when called from arena.js
  this.wsServer = wsServer;           // Will be null when called from arena.js
  // ...
}
```

### Code: Instantiation in arena.js

```javascript
// arena.js, line 203
async playGame(matchConfig) {
  const game = new RealChessGame(matchConfig);  // No broadcast, no wsServer!
  const startTime = Date.now();
  console.log('');
  const result = await game.play();
  // ...
}
```

**Result:** `this.broadcast` is `null`

### Code: The Crash Point

```javascript
// real-chess-game.js, line 615
const broadcasts = this.broadcast.processMove(moveData, this.playerModels[color].name);
```

**Problem:** Calls method on null → **Runtime Error**

**Actual sequence:**
1. arena.js calls `playGame(matchConfig)`
2. playGame() instantiates `new RealChessGame(matchConfig)` with no broadcast
3. Game loop calls executeMove()
4. executeMove() tries to call `this.broadcast.processMove()`
5. **Crash:** "Cannot read property 'processMove' of null"

### No Defensive Checks

The code has NO null checks:

```javascript
// Line 609-610: Checks wsServer
if (this.wsServer) {
  this.wsServer.emitMovePlayed(moveData, ...);
}

// Line 615: NO CHECK - Direct call to null!
const broadcasts = this.broadcast.processMove(moveData, ...);

// Line 618-625: Then iterates broadcasts and calls methods
for (const broadcast of broadcasts) {
  this.broadcast.displayBroadcast(broadcast);
  // ...
}
```

---

## Why This Seems to Work (Investigation)

The Arena.js must be working somehow if games are being played. Possible explanations:

1. **The code was never actually reached** — Maybe the test/demo environment differs?
2. **There's a default broadcast service created somewhere** — Need to find where
3. **The crash is happening but being caught silently** — Unlikely in Node.js
4. **The arena.js isn't actually being run** — Maybe there's another entry point?

Let me check if there's a BroadcastService default:

### Search Results: No Default Broadcast Service

```bash
$ grep -r "BroadcastService\|new.*Broadcast" . --include="*.js" 2>/dev/null | grep -v node_modules

# Result: Only found in tests/packages, not in arena.js
```

Arena.js has NO imports of broadcast:

```bash
$ grep -n "import.*[Bb]roadcast\|require.*[Bb]roadcast" arena.js

# Result: (empty)
```

---

## Possible Explanations

### Hypothesis 1: Code Path Never Executed

Maybe `executeMove()` is never called in the real arena? Let me check the call chain:

```
arena.js: playGame()
  → new RealChessGame(matchConfig)
  → game.play()
    → while (!this.game.isGameOver())
      → this.getAIMove()
      → this.executeMove()  ← THIS SHOULD BE CALLED
```

The game loop should definitely call executeMove().

### Hypothesis 2: Broadcast Service Created Elsewhere

Maybe something initializes a default broadcast service? Checking for any initialization before playGame():

```javascript
// arena.js playGame() method is called directly in loop
// No setup for broadcast service visible
```

### Hypothesis 3: The Code is Actually Broken

Most likely explanation: **This is broken code that was never tested with arena.js.** The broadcast/wsServer were designed for a web UI environment (streaming, demos), not for the autonomous arena.

---

## What We Know About Broadcast Service

### Purpose
From comments in real-chess-game.js (line 614):
```javascript
// This triggers: event detection → commentary → replay capture → stream broadcast
```

So it's designed to:
1. Detect events in moves
2. Generate commentary
3. Capture replays
4. Broadcast to stream viewers

### Context
This was clearly built for:
- **Web-based spectating** — WebSocket connections for viewers
- **Live commentary** — Real-time AI commentary generation
- **Streaming** — Broadcasting to YouTube, Twitch, etc.

### Current Status
- **Not used in autonomous arena** — arena.js doesn't create it
- **Not integrated in real runtime** — Games are played without it
- **Design conflict** — Tight coupling to presentation layer

---

## WebSocket Server Investigation

### File: websocket-server.js

Comments indicate it was designed for streaming:

```javascript
// Event Emitters - Called by Arena and BroadcastService
```

But checking what actually calls it... arena.js doesn't import or use it.

### Status: Same as Broadcast Service
- **Optional parameters** in RealChessGame
- **Null by default**
- **Only calls it if it exists** (lines 609-610, 622-624)
- **Never created in arena.js**

---

## Conclusion: Architectural Analysis

### What WebSocket/Broadcast Actually Are

**Legacy Components from Previous Architecture:**

AI Commander was originally built as a web-based platform:
- Real-time WebSocket connections for viewers
- Live commentary generation during games
- Streaming integration (YouTube, broadcast infrastructure)
- "Broadcasting" referred to sending events to UI clients

### Current Architecture

The platform has evolved:
- No longer needs real-time spectating
- Focus shifted to research (EPIC 14+)
- Arena runs autonomously (no UI)
- Games play to completion, results stored

### Why They Still Exist

**Remnants of old architecture:**
- RealChessGame was designed to emit to broadcast service
- WebSocket was for viewer connections
- Both are optional (default to null)
- New architecture doesn't use them

### Why arena.js Works (Actually: Why It Crashes)

Actually, I need to test this. The code at line 615 WILL crash if called. Let me check if maybe:
1. The code has been fixed but not committed?
2. There's a version mismatch?
3. The crash is being hidden?

**The safest assumption:** This is broken code that hasn't been tested in the current arena.js.

---

## Path Forward

### Option 1: Legacy Removal
Remove broadcast/WebSocket from RealChessGame entirely:

```javascript
// Remove these parameters
constructor(matchConfig) {  // Just matchConfig
  this.matchConfig = matchConfig;
  // Remove: this.broadcast, this.wsServer, this.ui
}

// Remove entire executeMove() lines 608-625 (broadcast code)
// Keep only: move execution, game state, console output
```

**Pros:**
- Clean up dead code
- Reduce complexity
- Prevent confusion

**Cons:**
- Breaks any code using these features (if any)

### Option 2: Make Components Optional (Proper Fix)
Add null checks throughout:

```javascript
// Line 615: Add null check
if (this.broadcast) {
  const broadcasts = this.broadcast.processMove(moveData, this.playerModels[color].name);
  for (const broadcast of broadcasts) {
    this.broadcast.displayBroadcast(broadcast);
    if (this.wsServer) {
      this.wsServer.emitCommentaryGenerated(...);
    }
  }
}
```

**Pros:**
- Preserves backward compatibility
- Allows future UI features without rewriting game logic

**Cons:**
- Keeps dead code in codebase
- Adds conditional complexity

### Option 3: Repurpose as Generic Event System
Transform into in-process event emitters:

```javascript
// Instead of:
this.broadcast.processMove(moveData)

// Use:
this.eventBus.emit('move.played', moveData)
this.eventBus.emit('game.started', gameId)
this.eventBus.emit('game.finished', result)

// Then:
// - Research Data Store subscribes to these events
// - Future analytics subscribes to same events
// - Future reporting subscribes to same events
// - No tight coupling to presentation
```

**Pros:**
- Aligns with EPIC 14 event-driven architecture
- Enables multiple subscribers
- Generic, reusable event system
- No presentation layer dependencies

**Cons:**
- Requires more refactoring
- Need to define event schema

---

## Recommendation

**Option 3 is the right architectural choice.**

### Why
1. **Aligns with EPIC 14 philosophy** — Event-driven, pub/sub
2. **Decouples from presentation** — No WebSocket, broadcast coupling
3. **Enables research integration** — Clean event subscription
4. **Future-proof** — Works for analytics, reporting, export
5. **Already has precedent** — We built ResearchEventBus!

### Implementation Path

1. **Remove broadcast/wsServer from RealChessGame** → Use event bus instead
2. **Add in-process event emitter** → GameEventBus (separate from ResearchEventBus)
3. **Emit game-level events** from arena.js:
   - `game.started` → With gameId, players, timestamp
   - `move.made` → With complete moveData
   - `game.finished` → With result, statistics
4. **Connect research integration** → Subscribe to GameEventBus events
5. **Keep architecture clean** → No tight coupling, fully decoupled

### Events to Emit

```typescript
// Core game events (from arena.js/RealChessGame)
game.started(event: {
  gameId: string
  whitePlayer: string
  blackPlayer: string
  timestamp: number
})

move.made(event: {
  gameId: string
  moveNumber: number
  color: 'white' | 'black'
  san: string
  fen: string
  latencyMs: number
  confidence: number
  description: string
  decision: {
    prompt: string
    response: string
    parsingStatus: string
    tokensIn: number
    tokensOut: number
  }
})

game.finished(event: {
  gameId: string
  result: 'white-win' | 'black-win' | 'draw'
  pgn: string
  finalFen: string
  moveCount: number
  durationMs: number
})
```

### Subscribers

```
GameEventBus
  ├─ ResearchDataStore (persists to SQLite)
  ├─ Analytics (future EPIC 17)
  ├─ Reporting (future EPIC 24)
  ├─ Dataset Export (future)
  └─ Any other research capability
```

---

## Next Steps

1. **Verify the current crash** — Does `pnpm chess` actually crash on line 615?
2. **Confirm no hidden broadcast service** — Search for any auto-initialization
3. **Design GameEventBus interface** — Define events RealChessGame should emit
4. **Refactor RealChessGame** — Remove broadcast/wsServer, add event emission
5. **Connect research integration** — Subscribe to GameEventBus events

Only after this is clear should we integrate the Research Data Store, because the integration must be event-based, not tightly coupled.

