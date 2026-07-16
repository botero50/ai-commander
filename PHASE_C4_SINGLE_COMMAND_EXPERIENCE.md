# PHASE C4: Single Command Experience Design

**Date**: July 15, 2026  
**Goal**: Design ONE production command that launches continuous AI chess streams  
**Status**: DESIGN COMPLETE (ready for implementation in next phase)

---

## Executive Summary

Currently, AI Commander has scattered CLI commands (match, tournament, experiment, analyze) spread across multiple files. This phase designs a unified **production command** that launches live chess indefinitely with proper verification and bootstrapping.

**Primary Command**: `pnpm chess` or `pnpm chess:arena`

**Purpose**: Launch one chess stream, verifying dependencies, then loop indefinitely with automatic match scheduling, result recording, and spectator broadcasting.

---

## Current State

### Existing CLI Commands
```
ai-commander tournament    # Tournament runner (0 A.D. era, needs update)
ai-commander match         # Single match (0 A.D. era, needs update)
ai-commander experiment    # Experimental configs (DEFER)
ai-commander analyze       # Replay analysis (DEFER)
ai-commander dashboard     # Research UI (DEFER)
```

### Issues with Current Design
1. ❌ Commands are 0 A.D. / checkers era (reference checkers game)
2. ❌ No chess-specific entry point
3. ❌ No dependency verification (Ollama, Stockfish)
4. ❌ No continuous loop/arena mode
5. ❌ No configuration for brain selection
6. ❌ Tournament mode requires config file (not user-friendly)
7. ❌ No auto-restart on game completion

---

## Proposed Production Command

### Command Definition

```bash
pnpm chess [--mode=arena|match|tournament] [--white=<brain>] [--black=<brain>] [--streaming] [--port=9000]
```

### Variants

#### 1. Arena Mode (Default, Continuous)
```bash
pnpm chess
# or explicitly:
pnpm chess --mode=arena

# Starts: One continuous stream with auto-matching two random brains
# Behavior: Verify deps → Load brains → Play → Record → Broadcast → Auto-restart
# Duration: Indefinite (run until Ctrl+C)
# Output: Live spectators on http://localhost:9000
```

#### 2. Single Match Mode
```bash
pnpm chess --mode=match --white=ollama:mistral --black=claude

# Starts: One chess match between specified brains
# Behavior: Verify deps → Load brains → Play → Record → Exit
# Duration: One game (40 moves average)
# Output: PGN file + broadcast (if --streaming enabled)
```

#### 3. Tournament Mode
```bash
pnpm chess --mode=tournament --players=5 --format=round-robin

# Starts: Multi-player tournament
# Behavior: Verify deps → Schedule matches → Play all → Calculate ratings → Exit
# Output: Leaderboard + PGN files for all matches
```

---

## Technical Design

### Command File Structure

```
packages/cli/src/
├── commands/
│   ├── chess-arena.ts          (Main arena/streaming loop)
│   ├── chess-match.ts          (Single match execution)
│   ├── chess-tournament.ts     (Multi-player tournament)
│   └── chess-verify-deps.ts    (Dependency check)
├── cli.ts                       (Updated: add chess command)
└── config/
    └── chess-config.ts         (Default brain configs, port, etc.)
```

### Entry Point: `chess-arena.ts`

**File**: `packages/cli/src/commands/chess-arena.ts`

**Interface**:
```typescript
async function startChessArena(options: {
  mode: 'arena' | 'match' | 'tournament',
  white?: string,           // e.g., 'ollama:mistral', 'claude:opus'
  black?: string,
  streaming?: boolean,
  port?: number,            // default 9000
  maxGames?: number,        // for arena (default: Infinity)
  outputDir?: string,       // default: ./games/
  verbose?: boolean
}): Promise<void>
```

---

## Step-by-Step Execution Flow

### Pre-Launch Verification

**Function**: `verifyDependencies()`  
**File**: `packages/cli/src/commands/chess-verify-deps.ts`

**Checks** (in order):

1. ✅ **Node.js Version Check**
   ```
   Required: >=22.0.0
   Check: process.version
   Failure: Abort with "Please upgrade Node.js"
   ```

2. ✅ **Chess.js Library Check**
   ```
   Check: require('chess.js') loads without error
   Failure: Abort with "Missing chess.js dependency"
   ```

3. ✅ **Ollama Availability** (if using ollama brains)
   ```
   Check: HTTP GET http://localhost:11434/api/tags
   Timeout: 5 seconds
   Failure: Abort with "Ollama not running at http://localhost:11434"
   Suggestion: "Run: docker run -d -p 11434:11434 ollama/ollama"
   ```

4. ✅ **Ollama Model Check** (if model specified)
   ```
   Check: ollama list | grep mistral (or specified model)
   Timeout: 5 seconds
   Failure: Abort with "Model 'mistral' not found in Ollama"
   Suggestion: "Run: ollama pull mistral"
   ```

5. ✅ **Stockfish Availability** (optional, for engine analysis)
   ```
   Check: Can spawn stockfish process
   Timeout: 5 seconds
   Failure: Warn (continue, will use unevaluated moves)
   Suggestion: "Optional: Install Stockfish for move evaluation"
   ```

6. ✅ **Disk Space Check**
   ```
   Check: At least 1 GB free in output directory
   Failure: Warn (continue, games will be recorded)
   ```

**Output on Success**:
```
✅ All dependencies verified
  • Node.js v22.5.0 ✓
  • chess.js ^1.0.0 ✓
  • Ollama (mistral) ✓
  • Stockfish (optional) ⊘
  
Ready to start chess arena!
```

---

### Initialization Phase

**Function**: `initializeArena()`

**Sequence**:

1. **Load Configuration**
   ```typescript
   const config = loadChessConfig({
     brains: parseArguments(args),
     port: args.port || 9000,
     maxGames: args.maxGames || Infinity,
     outputDir: args.outputDir || './games/',
     streaming: args.streaming !== false,
   });
   ```

2. **Initialize Logger**
   ```typescript
   const logger = createLogger({ level: 'info', name: 'ChessArena' });
   ```

3. **Initialize Metrics**
   ```typescript
   const metrics = new ArenaMetrics();
   metrics.recordStart();
   ```

4. **Initialize Broadcast System** (if streaming enabled)
   ```typescript
   const broadcaster = new ChessBroadcaster({
     port: config.port,
     onConnected: (viewer) => logger.info(`Viewer #${viewer.id} connected`),
     onDisconnected: (viewer) => logger.info(`Viewer #${viewer.id} left`),
   });
   ```

5. **Initialize Tournament Manager** (for ELO tracking)
   ```typescript
   const tournament = new ChessTournamentManager({
     format: 'arena',  // continuous, not bracketed
     recordRatings: true,
   });
   ```

---

### Main Arena Loop

**Function**: `runArenaLoop()`

**Pseudocode**:
```typescript
const games = [];

while (!shutdown && games.length < config.maxGames) {
  try {
    // 1. Select brains for this match
    const [whiteBrain, blackBrain] = selectBrains(config.brains);
    logger.info(`Starting game: ${whiteBrain.name} vs ${blackBrain.name}`);

    // 2. Create fresh game session
    const session = chessAdapter.createSession({
      white: whiteBrain,
      black: blackBrain,
      recordGameState: true,
      streaming: config.streaming,
    });

    // 3. Emit broadcast event: MATCH_START
    broadcaster.emit('MATCH_START', {
      gameId: session.id,
      white: whiteBrain.name,
      black: blackBrain.name,
      timestamp: Date.now(),
    });

    // 4. Run game to completion
    const result = await chessGameLoop.run(session, {
      onMove: (move) => {
        broadcaster.emit('MOVE_EXECUTED', {
          gameId: session.id,
          moveNumber: move.moveNumber,
          color: move.color,
          move: move.notation,
          fen: move.fen,
          timestamp: Date.now(),
        });
      },
      onGameOver: (result) => {
        broadcaster.emit('GAME_OVER', {
          gameId: session.id,
          result: result.result,
          winner: result.winner,
          pgnFinal: result.pgn,
          duration: result.duration,
          timestamp: Date.now(),
        });
      },
    });

    // 5. Record result
    tournament.recordMatchResult({
      white: whiteBrain.name,
      black: blackBrain.name,
      result: result.result,
      pgn: result.pgn,
      moves: result.moves,
      startTime: result.startTime,
      endTime: result.endTime,
    });

    // 6. Save PGN to disk
    const pgnFile = `${config.outputDir}/game-${session.id}.pgn`;
    fs.writeFileSync(pgnFile, result.pgn);
    logger.info(`✅ Game saved: ${pgnFile}`);

    games.push(result);

    // 7. Display live standings
    const standings = tournament.getStandings();
    broadcaster.emit('STANDINGS_UPDATE', standings);
    logger.info(`Standings: ${formatStandings(standings)}`);

    // 8. Update metrics
    metrics.recordGameCompletion({
      white: whiteBrain.name,
      black: blackBrain.name,
      duration: result.duration,
      moves: result.moves.length,
      result: result.result,
    });

    // 9. Brief pause before next game (allow viewers to digest)
    await sleep(2000);

  } catch (error) {
    logger.error(`Game failed: ${error.message}`);
    metrics.recordGameFailure(error);
    
    // Log error, continue to next game (resilience)
    await sleep(5000);
  }
}

logger.info(`Arena completed: ${games.length} games played`);
metrics.recordEnd();
broadcaster.emit('ARENA_SHUTDOWN', metrics.toJSON());
```

---

### Graceful Shutdown

**Signals Handled**: SIGINT (Ctrl+C), SIGTERM (Docker stop)

**Cleanup Sequence**:
```typescript
process.on('SIGINT', async () => {
  logger.info('Shutdown signal received...');
  
  shutdown = true;
  
  // 1. Notify viewers
  broadcaster.emit('ARENA_SHUTTING_DOWN', {
    reason: 'Manual shutdown',
    timestamp: Date.now(),
  });
  
  // 2. Let current game finish (don't abort mid-game)
  if (currentSession && !currentSession.isGameOver()) {
    logger.info('Waiting for current game to complete...');
    await gameLoopPromise;
  }
  
  // 3. Close broadcaster
  await broadcaster.close();
  
  // 4. Generate final report
  const report = metrics.generateReport();
  fs.writeFileSync(`${config.outputDir}/arena-summary.json`, JSON.stringify(report, null, 2));
  
  // 5. Exit cleanly
  logger.info('Arena shutdown complete.');
  process.exit(0);
});
```

---

## Configuration Format

### Default Configuration (No Arguments)

```typescript
const defaultConfig = {
  mode: 'arena',
  brains: [
    { provider: 'ollama', model: 'mistral' },
    { provider: 'ollama', model: 'neural-chat' },
    // Or add more for variety
  ],
  streaming: true,
  port: 9000,
  maxGames: Infinity,
  outputDir: './games/',
  verbose: false,
  timeout: 60000,  // per-move timeout
  maxMovesPerGame: 200,
};
```

### Brain Specification Syntax

```bash
# Ollama (local)
pnpm chess --white=ollama:mistral --black=ollama:neural-chat

# Claude (API)
pnpm chess --white=claude:opus --black=claude:sonnet

# OpenAI (API)
pnpm chess --white=openai:gpt4 --black=openai:gpt4-turbo

# Mixed
pnpm chess --white=ollama:mistral --black=claude:opus

# File-based (advanced)
pnpm chess --config=chess-config.json
```

### Config File Format (chess-config.json)

```json
{
  "mode": "arena",
  "streaming": true,
  "port": 9000,
  "maxGames": 100,
  "outputDir": "./games/",
  "brains": [
    {
      "provider": "ollama",
      "model": "mistral",
      "temperature": 0.7,
      "topK": 40,
      "topP": 0.9
    },
    {
      "provider": "claude",
      "model": "claude-opus-20240229",
      "temperature": 0.8,
      "maxTokens": 500
    },
    {
      "provider": "openai",
      "model": "gpt-4",
      "temperature": 0.7,
      "topP": 0.95
    }
  ]
}
```

---

## Spectator Interface (Broadcasting)

### WebSocket Events Published

```typescript
// Game lifecycle
broadcaster.emit('MATCH_START', { gameId, white, black, timestamp });
broadcaster.emit('MOVE_EXECUTED', { gameId, moveNum, color, move, fen });
broadcaster.emit('CHECK', { gameId, color });
broadcaster.emit('GAME_OVER', { gameId, result, winner, pgn });

// Meta events
broadcaster.emit('STANDINGS_UPDATE', standings);
broadcaster.emit('ARENA_STATS', { gamesPlayed, avgDuration, errors });
broadcaster.emit('ARENA_SHUTDOWN', { reason, summary });
```

### Spectator JSON Response

```json
{
  "type": "STANDINGS_UPDATE",
  "data": {
    "standings": [
      {
        "rank": 1,
        "name": "ollama-mistral",
        "rating": 1643,
        "wins": 12,
        "losses": 3,
        "draws": 2,
        "winRate": 0.75
      }
    ]
  }
}
```

---

## Error Handling & Resilience

### Game-Level Errors

| Error | Action |
|-------|--------|
| Brain timeout (60s) | Fallback to random legal move |
| Brain API unavailable | Retry 3x with backoff, fail game |
| Invalid move from brain | Fallback to random legal move |
| Stockfish crash | Continue without evaluation, warn |
| Disk full | Log error, pause, notify viewers |

### Arena-Level Errors

| Error | Action |
|-------|--------|
| Ollama goes offline | Pause, wait 30s, retry (once) |
| Broadcaster port in use | Retry on next port (9001, 9002, ...) |
| Catastrophic error | Log, save state, exit with code 1 |

---

## Output & Logging

### Console Output Example

```
🎮 AI Commander Chess Arena
================================

✅ Dependency verification passed
✅ Brains loaded: ollama-mistral, claude-opus
✅ Broadcasting on http://localhost:9000

📊 Starting arena mode (continuous, press Ctrl+C to stop)

Game 1: ollama-mistral (white) vs claude-opus (black)
  1. e2e4 c7c5
  2. Nf3 d6
  ...
  15. Ng5 Nxe4
  Game over: ollama-mistral won by checkmate in 15 moves (4.2s)
  ✅ Saved: ./games/game-uuid-1.pgn

📈 Live Standings:
  1. ollama-mistral    1 W, 0 L, 0 D (1643 ELO)
  2. claude-opus       0 W, 1 L, 0 D (1357 ELO)

Game 2: claude-opus (white) vs ollama-mistral (black)
  ...
```

### File Outputs

```
./games/
├── game-uuid-1.pgn              (PGN notation)
├── game-uuid-2.pgn
├── game-uuid-3.pgn
├── arena-summary.json           (Final metrics)
└── arena-stream-archive.jsonl   (Event log for replay)
```

---

## Implementation Roadmap

### Phase 1: Core Command (Day 1, 4 hours)
- [ ] Create `chess-arena.ts` with main loop
- [ ] Implement `chess-verify-deps.ts` 
- [ ] Add `chess-config.ts` with defaults
- [ ] Update `cli.ts` to add `chess` command
- [ ] Basic logging and error handling
- **Tests**: 5+ for verification, 5+ for initialization

### Phase 2: Integration (Day 2, 4 hours)
- [ ] Wire up ChessAdapter → ChessGameLoop
- [ ] Implement result recording (PGN + metrics)
- [ ] Implement graceful shutdown (SIGINT handling)
- [ ] Brain selection / config parsing
- **Tests**: 10+ for game execution, 5+ for shutdown

### Phase 3: Broadcasting (Day 3, 4 hours)
- [ ] Implement ChessBroadcaster (WebSocket hub)
- [ ] Emit game lifecycle events
- [ ] Publish standings updates
- [ ] Test with mock spectators
- **Tests**: 8+ for broadcasting, 5+ for events

### Phase 4: Polish & Testing (Day 4, 4 hours)
- [ ] Manual end-to-end test (launch, play 5 games, stop)
- [ ] Verify all files created correctly
- [ ] Performance profiling (latency, memory)
- [ ] Documentation & help text
- [ ] Clean shutdown on errors
- **Tests**: 10+ integration tests

### Total Effort: **4 days, 16 hours, ~20 tests**

---

## Success Criteria

✅ **Single Command Works**
```bash
pnpm chess
# Launches indefinitely with no configuration needed
```

✅ **All Verification Passes**
```
✅ Dependencies verified (Node, chess.js, Ollama, Stockfish optional)
✅ Models loaded
✅ Broadcasting ready
✅ Arena started
```

✅ **Games Execute Properly**
- Each game completes within 5-10 minutes average
- All moves recorded and saved as PGN
- Results recorded with ELO updates
- Spectators see live moves via WebSocket

✅ **Auto-Restart Works**
- After each game, next game starts immediately
- No manual intervention needed
- Can run 24+ hours continuously

✅ **Graceful Shutdown**
- Ctrl+C allows current game to finish
- Saves summary.json with final metrics
- Closes broadcaster cleanly
- No orphaned processes

✅ **Production-Ready**
- Clear, helpful error messages
- Zero crashes on expected errors
- Logs all important events
- PGN files are valid and parseable

---

## Remaining Design Questions

### Q1: Multi-Brain Selection in Arena
**Q**: How to choose white/black brains each round?
**A**: Rotate through configured list (round-robin), or random selection (if you want unpredictability)
**Decision**: Default to **random selection** (more interesting spectator experience)

### Q2: ELO Rating Scope
**Q**: Should ELO be per-session or accumulated across all games?
**A**: Accumulated (tournament-wide), reset on arena restart
**Decision**: **Accumulate** (shows learning/performance trends)

### Q3: Spectator Reconnection
**Q**: If a viewer reconnects, what do they see?
**A**: Current game state + last N moves, or full replay from start?
**Decision**: **Current game state + last 20 moves** (balance freshness and completeness)

### Q4: Max Games Limit
**Q**: Should arena have a max games limit or run forever?
**A**: Both options available via --maxGames flag
**Decision**: **Default to infinity** (run forever, user can interrupt)

---

## Dependencies (Existing)

All required dependencies already in codebase:

- ✅ `@ai-commander/chess-adapter` — Chess game execution
- ✅ `@ai-commander/core` — Brain orchestration
- ✅ `@ai-commander/tournament-engine` — ELO ratings
- ✅ `@ai-commander/broadcast` — WebSocket broadcasting
- ✅ `@ai-commander/config` — Configuration management
- ✅ `chess.js` — Board state management
- ✅ Node.js `child_process` — Stockfish engine (optional)
- ✅ Node.js `http` — Ollama API calls

**No new NPM packages required.**

---

## Success Metrics

After implementation, a developer should be able to:

1. **Clone repo** (5 min)
2. **Run `pnpm install`** (3 min)
3. **Run `pnpm chess`** (2 min verification + launch)
4. **Watch live games** in browser (0 min setup, just visit http://localhost:9000)
5. **See games play indefinitely** with auto-restarting

**Total time to live stream: <15 minutes** ✅

---

## Next Phase: C5 - CTO Review

Once this command is implemented, it will answer the CTO review questions:

- ✅ **Can a developer clone and start in under 5 minutes?** → YES (single `pnpm chess` command)
- ✅ **How many packages required?** → 28 (A + B categories)
- ✅ **How many are optional?** → 16 (C + D categories)
- ✅ **How much code executes during one live game?** → ~15,000 LOC (chess, brain, tournament, broadcast)
- ✅ **How much code never executes?** → ~20,000 LOC (research, analytics, other game adapters)
- ✅ **Five highest-priority cleanup tasks?** → (See cleanup checklist below)

---

## Cleanup Checklist (Before v2.0)

1. **Remove 0 A.D. Adapters** (spring-rts-adapter, checkers-adapter)
   - Priority: HIGH (reduces confusion)
   - Effort: 1 hour
   - Impact: -1,500 LOC, -0 imports

2. **Update CLI to use Chess Commands**
   - Priority: HIGH (current commands are outdated)
   - Effort: 2 hours
   - Impact: Clean, production-ready CLI

3. **Delete Optional Research Packages** (analyze, experiment, dashboard)
   - Priority: MEDIUM (not needed for v1.0 ship)
   - Effort: 2 hours
   - Impact: -2,000 LOC, cleaner dependencies

4. **Consolidate Tournament Documentation** (write chess-specific guides)
   - Priority: MEDIUM (help users understand system)
   - Effort: 3 hours
   - Impact: Better onboarding

5. **Add SETUP-CHESS.md** (quick start for chess arena)
   - Priority: MEDIUM (clear entry point for new users)
   - Effort: 1 hour
   - Impact: <5 minute onboarding

---

**Status**: 🎯 **PHASE C4 DESIGN COMPLETE**

Ready for implementation once C5 (CTO Review) provides final approval.
