# EPIC 14: Real Runtime Analysis & Integration Blocker Investigation

**Date:** July 23, 2026  
**Purpose:** Investigate existing runtime and identify why Phase 2 cannot connect to real games  
**Status:** ANALYSIS COMPLETE - BLOCKERS IDENTIFIED

---

## 1. Current Entry Point

### Command
```bash
pnpm chess
```

### Execution Path
```
package.json (scripts.chess)
  ↓
node ./arena.js
  ↓
ChessArena class instantiation
  ↓
ChessArena.run()
```

**File:** `arena.js` (442 lines)  
**Class:** `ChessArena`

---

## 2. Complete Execution Flow

### Arena Main Loop (arena.js:81-155)

```javascript
async run() {
  // 1. Display startup banner
  this.displayStartup();

  // 2. Set up SIGINT handler
  process.on('SIGINT', () => this.shutdown());

  // 3. Main loop (runs forever)
  let matchNumber = 1;
  while (true) {
    try {
      // 4. Update state
      this.state.matchCount = matchNumber;
      this.state.totalGames++;

      // 5. Verify Ollama available
      await this.ensureOllamaAvailable();

      // 6. Select random player pair
      const matchConfig = this.selectPlayers();

      // 7. Display match header
      this.displayMatchHeader(matchNumber, matchConfig);

      // 8. PLAY GAME - Returns complete game result
      const result = await this.playGame(matchConfig);

      // 9. Record statistics
      this.recordGameResult(result, matchConfig);

      // 10. Display result
      this.displayResult(result, matchConfig);

      // 11. Display statistics
      this.displayStatistics();

      // 12. Countdown to next match
      await this.countdownToNextMatch();

      matchNumber++;
    } catch (error) {
      // Error handling and recovery
      this.state.recoveryAttempts++;
      // ... recovery logic ...
    }
  }
}
```

---

## 3. Game Execution: RealChessGame Class

### File
`real-chess-game.js` (~700 lines)

### Initialization (lines 15-39)
```javascript
constructor(matchConfig, broadcastService = null, ui = null, wsServer = null) {
  this.matchConfig = matchConfig;
  this.broadcast = broadcastService;
  this.ui = ui;
  this.wsServer = wsServer;
  this.game = new Chess();  // Chess game state
  this.boardDisplay = new BoardDisplay();
  this.moves = [];          // Array of moves in this game
  this.startTime = Date.now();
  
  // Player configurations with model info
  this.playerModels = {
    white: { name, provider, model, temperature },
    black: { name, provider, model, temperature }
  };
}
```

### Game Execution: play() Method (lines 44-109)

```javascript
async play() {
  let moveCount = 0;
  const maxMoves = 500;
  const startTime = Date.now();
  let illegalMoveRetries = 0;

  while (!this.game.isGameOver() && moveCount < maxMoves) {
    const isWhiteToMove = moveCount % 2 === 0;
    const color = isWhiteToMove ? 'white' : 'black';
    const player = this.playerModels[color];

    try {
      // Get legal moves from chess.js
      const legalMoves = this.game.moves({ verbose: true });

      // Get position description (opening name)
      const positionDescription = this.getPositionDescription();

      // GET AI DECISION
      const moveResult = await this.getAIMove(player, legalMoves, color, moveCount);

      // Execute move and broadcast
      this.executeMove(
        moveResult.move, 
        color, 
        moveCount, 
        moveResult.latency, 
        moveResult.confidence,
        positionDescription
      );

      moveCount++;
    } catch (error) {
      // Error handling
    }
  }

  // Return complete game result
  return {
    moves: this.moves,           // Array of SAN notation moves
    result: this.getGameResult(),
    durationMs: Date.now() - startTime,
    moveCount: this.moves.length,
    pgn: this.game.pgn(),
    fen: this.game.fen(),
    illegalMoveRetries,
  };
}
```

### LLM Decision Generation: getOllamaMove() (lines 137-324)

**Key Points:**
- Sends structured prompt to Ollama with board FEN and legal moves
- Prompt includes chain-of-thought reasoning (8 steps)
- Receives response with reasoning and final move choice
- Extracts move from response using pattern matching
- Returns: `{ move: san_notation, latency: ms, confidence: 0-1 }`
- Console logs: `"⏱️  {player.name} ({move}) - Ollama latency: {ms}ms (confidence: {%})"`

### Move Execution: executeMove() (lines 582-646)

```javascript
executeMove(moveNotation, color, moveCount, latencyMs = 0, confidence = 0, description = '') {
  // Execute in chess.js
  const move = this.game.move(moveNotation);
  
  // Store move (push to array)
  this.moves.push(moveNotation);
  
  // Create move data for broadcast
  const moveData = {
    move: moveNotation,
    fen: this.game.fen(),        // After-move position
    color,
    moveCount,
    san: move.san,
    uci: move.uci,
    piece: move.piece,
    flags: move.flags,
    latency: latencyMs,
    confidence,
    description,                  // Opening name
  };
  
  // Emit to WebSocket spectators
  if (this.wsServer) {
    this.wsServer.emitMovePlayed(moveData, playerName, latencyMs);
  }
  
  // Process through broadcast service
  const broadcasts = this.broadcast.processMove(moveData, playerName);
  
  // Display broadcasts
  for (const broadcast of broadcasts) {
    this.broadcast.displayBroadcast(broadcast);
    if (this.wsServer) {
      this.wsServer.emitCommentaryGenerated(broadcast, ...);
    }
  }
  
  // Display move to user
  console.log(moveLog);
  this.boardDisplay.display(this.game.fen(), moveNotation);
}
```

---

## 4. Data Structures at Key Points

### Experiment Level
**Not currently tracked.** Each `arena.js` invocation is implicit:
- Start time: `this.state.startTime = Date.now()` (line 40)
- No explicit experiment creation
- No experiment metadata stored

### Run/Match Level
**Tracked in `ChessArena.state`:**
```javascript
this.state = {
  matchCount: 0,        // Current match number
  totalGames: 0,        // Total games played
  whiteWins: 0,
  blackWins: 0,
  draws: 0,
  startTime: Date.now(),
  gameHistory: [],      // Last 100 games
  totalMoves: 0,
  totalDurationMs: 0,
  illegalMoveRetries: 0,
  ollamaTimeouts: 0,
  ollamaCrashes: 0,
  recoveryAttempts: 0,
  successfulRecoveries: 0,
  avgDecisionLatency: 0,
  totalDecisionLatency: 0,
}
```

**Persisted to:** `arena-statistics.json` (line 340-346)

### Game Level
**Available in `playGame()` return value:**
```javascript
{
  moves: string[],          // ["e4", "c5", "Nf3", ...] - SAN notation only
  result: string,           // "white-win" | "black-win" | "draw"
  durationMs: number,
  moveCount: number,
  pgn: string,             // Complete game in PGN format
  fen: string,             // Final position
  illegalMoveRetries: number,
  whiteModel: string,      // Added by ChessArena.playGame
  blackModel: string,
}
```

**Not persisted to database.** Only `this.moves` array and statistics.json.

### Move Level
**Created in `executeMove()`:**
```javascript
{
  move: string,            // SAN notation: "e4", "Nxf6", "O-O"
  fen: string,             // FEN after move (but not stored)
  color: "white"|"black",
  moveCount: number,
  san: string,
  uci: string,             // Long algebraic
  piece: string,
  flags: string,
  latency: number,         // Milliseconds
  confidence: number,      // 0-1
  description: string,     // Opening name
}
```

**Emitted to:**
- WebSocket: `wsServer.emitMovePlayed(moveData)`
- Broadcast: `broadcast.processMove(moveData)`
- **NOT** persisted to database. Only console logged.

### LLM Decision Level
**Created in `getOllamaMove()`:**
```javascript
{
  move: san_notation,      // "e4"
  latency: milliseconds,
  confidence: 0-1,
}
```

**Stored in:**
- `moveResult` variable in `play()` method
- Passed to `executeMove()` as latencyMs and confidence
- **NOT** persisted. Not even stored as object.

**What's missing:**
- The prompt sent to Ollama
- The response from Ollama
- The reasoning/analysis
- The tokens used (in/out)
- The parsing status
- The parsing trace

### Position Level
**Current position:**
- `this.game.fen()` - Available in `executeMove()`
- Passed as description to moveData
- **NOT stored separately.** No position deduplication.

---

## 5. Where Experiments/Runs Are Created

### Current: No Explicit Experiment Creation

```javascript
// arena.js startup
const arena = new ChessArena();
arena.run();
```

**What happens:**
1. Arena instantiated
2. `run()` method called
3. Main loop starts
4. Games play forever

**What doesn't happen:**
- No "Experiment" concept created
- No "Run" concept created
- Each `arena.js` invocation is a separate implicit session
- No metadata about the session stored (except statistics.json)

### Where an Experiment Should Be Created

**Option 1: In ChessArena constructor**
```javascript
constructor() {
  // ... current code ...
  
  // NEW: Create experiment
  this.experiment = {
    id: uuid(),
    name: `Arena Run ${new Date().toISOString()}`,
    hypothesis: 'Continuous autonomous chess research',
    startedAt: Date.now(),
  };
}
```

**Option 2: In ChessArena.run()**
```javascript
async run() {
  // ... current startup code ...
  
  // NEW: Create experiment before main loop
  const experimentId = await researchStore.startExperiment({
    name: `Arena Run ${new Date().toISOString()}`,
    hypothesis: 'Continuous autonomous chess research',
  });
  
  // NEW: Create run
  const runId = await researchStore.startRun({
    experimentId,
    config: this.getArenaConfig(),
  });
  
  // ... rest of loop ...
}
```

---

## 6. Integration Blockers Identified

### BLOCKER 1: No Experiment Creation Concept

**Issue:** `ChessArena` doesn't create experiments. It just starts playing games.

**Evidence:**
- Line 21-76: Constructor sets up `this.state` for game tracking
- Line 81-155: `run()` method never calls any "start experiment" method
- Line 436-441: Arena instantiated and run directly without experiment context

**Impact:** 
- Research Data Store has no experiment to associate games with
- Cannot call `research.startExperiment()` because there's no hook in arena.js
- Cannot call `research.startRun()` because there's no run creation in arena.js

**Solution Required:**
- Add experiment creation hook in ChessArena before main loop
- Add run creation hook in ChessArena at loop start
- Wire these to research integration

### BLOCKER 2: No Run Creation Concept

**Issue:** `ChessArena` has no explicit "Run" - it just counts games.

**Evidence:**
- `this.state.matchCount` and `this.state.totalGames` track game count
- No concept of a "run" with metadata
- Statistics persisted to JSON file, not structured run records

**Impact:**
- Research Data Store expects runs, games belong to runs
- Cannot associate games with a run if there's no run creation

**Solution Required:**
- Create explicit run concept in arena.js
- Track run lifecycle (start, games, completion, stop)

### BLOCKER 3: Move Data Not Persisted (Only SAN Notation)

**Issue:** `real-chess-game.js` stores moves as string array:

```javascript
this.moves = [];  // line 23
this.moves.push(moveNotation);  // line 591 - Only stores "e4", "c5", etc.
```

**Full Move Data Created But Lost:**

```javascript
const moveData = {
  move: moveNotation,
  fen: this.game.fen(),
  color,
  moveCount,
  san: move.san,
  uci: move.uci,
  piece: move.piece,
  flags: move.flags,
  latency: latencyMs,
  confidence,
  description,
};  // lines 594-606
```

**This moveData is created in executeMove() but:**
- Emitted to WebSocket spectators (line 610)
- Sent to broadcast service (line 615)
- **Not stored in this.moves array** ← This is the problem!

**Evidence:**
```javascript
this.moves.push(moveNotation);  // Only SAN string

// Later, game result returns:
return {
  moves: this.moves,  // Only strings: ["e4", "c5", ...]
  // ... other data ...
}
```

**Impact:**
- Research Data Store receives only move SAN notation
- Missing: FEN before/after, latency, confidence, position description
- Cannot construct complete move records

**Solution Required:**
- Store full moveData in `this.moves` array instead of just SAN notation
- Or create separate `this.moveDetails` array in parallel with `this.moves`
- Pass complete move data back to arena.js

### BLOCKER 4: LLM Decision Data Not Captured

**Issue:** Ollama decision data discarded after use.

**Evidence:**
```javascript
const moveResult = await this.getOllamaMove(player, legalMoves, color, moveCount);
// Returns: { move, latency, confidence }
// Discards: prompt, response, reasoning, tokens
```

**In getOllamaMove():**
```javascript
const response = await fetch('http://localhost:11434/api/generate', {
  // ... request ...
});

const data = await response.json();
const responseText = data.response;  // Full reasoning
// This response is parsed for move but never stored
```

**What's Lost:**
- The prompt sent to Ollama
- The full response (reasoning)
- The response parsing (how move was extracted)
- Token counts (if available)

**Impact:**
- Research Data Store cannot record LLM decision details
- No visibility into AI reasoning
- Cannot reproduce decisions

**Solution Required:**
- Capture full Ollama request/response in moveResult object
- Return: `{ move, latency, confidence, prompt, response, parsingStatus, tokensIn, tokensOut }`
- Or create separate decision object

### BLOCKER 5: Position Data Not Tracked

**Issue:** No position deduplication or tracking.

**Evidence:**
- FEN is available in `moveData.fen` (line 596)
- But never stored or deduplicated
- Opening description captured but not stored

**Impact:**
- Research Data Store cannot track unique positions
- Cannot compute position frequency
- Cannot measure repetition

**Solution Required:**
- Capture FEN position for each move
- Return FEN data from game result
- Or provide separate position tracking

---

## 7. Call Graph: From Game Result to Persistence

### Current Flow

```
ChessArena.run()
  ├─ ChessArena.playGame(matchConfig)
  │   └─ RealChessGame.play()
  │       ├─ RealChessGame.getAIMove()
  │       │   └─ RealChessGame.getOllamaMove()
  │       │       └─ fetch('http://localhost:11434/api/generate')
  │       │           ├─ Send: prompt, temperature, model
  │       │           └─ Receive: response (with reasoning)
  │       │               ├─ Extract: move, confidence
  │       │               └─ Discard: response, reasoning, tokens ❌
  │       ├─ RealChessGame.executeMove()
  │       │   ├─ this.game.move(moveNotation)
  │       │   ├─ this.moves.push(moveNotation)  // Only SAN ❌
  │       │   ├─ Create moveData object (full data)
  │       │   ├─ wsServer.emitMovePlayed(moveData)  // WebSocket
  │       │   └─ broadcast.processMove(moveData)    // Commentary
  │       └─ Return: { moves[], result, pgn, fen, ... }
  │
  ├─ ChessArena.recordGameResult(result, matchConfig)
  │   ├─ Update this.state counters
  │   ├─ openingTracker.recordGame()
  │   └─ this.persistStatistics()
  │       └─ Write to arena-statistics.json (aggregate stats, not game details)
  │
  ├─ ChessArena.displayResult()
  └─ ChessArena.displayStatistics()
```

### What Would Be Needed for Research Data Store Integration

```
ChessArena.run()
  ├─ ① research.startExperiment()  ← NEED TO ADD
  ├─ ② research.startRun()         ← NEED TO ADD
  │
  ├─ ChessArena.playGame(matchConfig)
  │   └─ RealChessGame.play()
  │       ├─ For each move:
  │       │   ├─ ③ research.recordGameStarted() [First move only]
  │       │   ├─ getAIMove() → Capture full decision data ← NEED TO MODIFY
  │       │   ├─ executeMove() → Store full move data    ← NEED TO MODIFY
  │       │   └─ ④ research.recordMove()
  │       │   └─ ⑤ research.recordLLMDecision()
  │       │   └─ ⑥ research.recordPosition()
  │       └─ Return: { moves[], result, pgn, fen, ... }
  │
  ├─ ⑦ research.recordGameResult()  ← NEED TO ADD
  │
  ├─ ChessArena.recordGameResult()
  ├─ ChessArena.displayResult()
  └─ ChessArena.displayStatistics()
```

---

## 8. Why Integration Failed

The ArenaResearchWrapper I created (and ArenaLoop) tried to intercept between ChessStartup and the games, but:

1. **ChessStartup doesn't actually launch games** - it's a dependency checker
2. **The real arena is arena.js** - which has its own game loop
3. **Arena.js is NOT wired for research events**
4. **Real game data is generated but not captured at the right points**

The integration points don't exist in arena.js. The flow is:

```
arena.js ChessArena
  → playGame()
  → RealChessGame.play()
    → result object with moves
  → recordGameResult() [only records stats]
  → NO hook to call research.recordMove(), research.recordLLMDecision(), etc.
```

---

## 9. Root Cause Summary

### The Real Problem

**Data is being generated but is not being captured at the source.**

Specifically:
1. ✅ Experiments exist implicitly (one per arena.js invocation)
2. ❌ No explicit experiment creation hook
3. ❌ No explicit run creation hook
4. ✅ Games are played with real moves from Ollama
5. ❌ Move data is only stored as SAN strings, not full objects
6. ✅ LLM decisions are made (Ollama calls with responses)
7. ❌ Llm decision data (prompt, response, tokens) is discarded
8. ✅ Positions are calculated
9. ❌ Positions are never stored or deduplicated

### The Integration Challenge

The Research Data Store needs to hook into RealChessGame.play() execution:
- Before game starts: need gameId, game metadata
- During move execution: need full move data, full decision data
- After move execution: need resulting position
- After game completes: need game result

But currently:
- ChessArena has no hooks to call research methods
- RealChessGame has no way to signal events to research
- Game data is created but not exposed in a structured way

---

## 10. Next Steps: Do NOT Implement New Code

Before implementing any integration, we need:

1. **Verify the data is actually there:**
   - Run arena.js for 5 games with debug logging
   - Capture: which game objects are created, what move data exists, where it's discarded

2. **Identify the real integration points:**
   - Which methods in ChessArena should have research hooks?
   - Which methods in RealChessGame should emit events?
   - How to pass game/move/decision objects to research layer?

3. **Understand the constraint:**
   - Can we add hooks to arena.js without breaking existing functionality?
   - Can we capture full move data without changing game logic?
   - Can we create experiment/run structure without affecting arena behavior?

4. **Design the integration architecture:**
   - What events should arena.js emit?
   - What's the contract between arena.js and research store?
   - How to maintain backward compatibility?

---

## Conclusion

**The real execution path exists and works.** Games are played with real AI decisions. The issue is not that the data doesn't exist—it's that:

1. The data is **generated but not captured** at the source
2. The **architecture doesn't have hooks** for research integration
3. The **integration was designed for a different entry point** (ChessStartup) than the real one (arena.js)

The Research Data Store wrapper itself is correct, but it's connected to the wrong place. We need to **connect it to arena.js and RealChessGame**, not to a placeholder ChessStartup.

