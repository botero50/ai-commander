# EPIC 73: Continuous Arena Mode
## Planning Document

**Status:** Planning Phase  
**Target Duration:** 1 week  
**Stories:** 4 (73.1 - 73.4)  
**Estimated Effort:** 15-20 hours

---

## Overview

EPIC 73 transforms the chess arena from a single-game system into a 24/7 continuous tournament platform with automatic match restarts, statistics tracking, and random player assignment.

The WebSocket spectator system from EPIC 72 will stream all statistics and tournament progress in real-time.

---

## Story 73.1: Automatic Match Restart

### Objective
When a game finishes, automatically start a new game after a configurable delay, with no user interaction required.

### Requirements

1. **Configurable Delay**
   - Add to .env: `MATCH_RESTART_DELAY_MS=5000` (5 seconds default)
   - Configurable per-run via command-line flag
   - Display countdown in UI

2. **Automatic Restart Loop**
   - After GameFinished event emitted
   - Wait for configured delay
   - Emit MatchRestartIn(seconds) events to WebSocket
   - Automatically select new players
   - Start next game without user input

3. **Graceful Shutdown**
   - Allow Ctrl+C to stop between games
   - Persist final statistics
   - Clean shutdown (no dangling processes)

### Implementation

**File: arena.js (modify existing run() loop)**

```typescript
async run() {
  const restartDelayMs = process.env.MATCH_RESTART_DELAY_MS || 5000;
  
  while (true) {
    // Play game (existing)
    const result = await this.simulateGame(matchConfig, matchNumber);
    
    // Emit GameFinished
    this.wsServer.emitGameFinished(...);
    
    // Display/log result
    this.displayResult(result);
    
    // Wait with countdown
    await this.countdownToNextMatch(restartDelayMs);
    
    // Auto-select new players
    matchNumber++;
  }
}

async countdownToNextMatch(delayMs) {
  const seconds = Math.ceil(delayMs / 1000);
  for (let i = seconds; i > 0; i--) {
    this.ui.displayCountdown(i);
    this.wsServer.emitMatchRestartIn(i);  // NEW WebSocket event
    await this.delay(1000);
  }
}
```

### WebSocket Events

**New Event: MatchRestartIn**
```json
{
  "type": "MatchRestartIn",
  "secondsRemaining": 3,
  "nextMatchNumber": 43
}
```

### Testing
- [ ] Game finishes, waits 5 seconds, starts new game
- [ ] Countdown displays correctly
- [ ] Can interrupt with Ctrl+C between matches
- [ ] Statistics persist after stop

---

## Story 73.2: Random Player/Model Assignment

### Objective
Randomize player-to-color and model-to-player assignments for variety in continuous play.

### Requirements

1. **Player Assignment**
   - Two players from config (currently fixed)
   - Randomize which plays white/black
   - Display assignment in UI

2. **Model Assignment**
   - Randomize temperature and personality
   - Select from personality pool:
     - Aggressive (temp 0.9)
     - Defensive (temp 0.3)
     - Positional (temp 0.5)
     - Tactical (temp 0.7)
     - Balanced (temp 0.5)
     - Gambler (temp 0.95)
     - Cautious (temp 0.2)

3. **Time Control**
   - Randomize time control:
     - Bullet (60s)
     - Blitz (300s)
     - Rapid (900s)
     - Classical (3600s)
     - Infinite (0s)

### Implementation

**File: arena.js (modify selectPlayers())**

```typescript
selectPlayers() {
  if (this.players.length < 2) {
    throw new Error('Need at least 2 players');
  }

  let matchConfig = null;
  let attempts = 0;

  do {
    // Random white/black assignment
    const whiteIdx = Math.floor(Math.random() * this.players.length);
    let blackIdx = Math.floor(Math.random() * this.players.length);
    while (blackIdx === whiteIdx) {
      blackIdx = Math.floor(Math.random() * this.players.length);
    }

    const white = this.players[whiteIdx];
    const black = this.players[blackIdx];

    // Random personalities and temperatures
    const whitePers = this.personalities[
      Math.floor(Math.random() * this.personalities.length)
    ];
    const blackPers = this.personalities[
      Math.floor(Math.random() * this.personalities.length)
    ];

    // Random time control
    const timeControl = this.timeControls[
      Math.floor(Math.random() * this.timeControls.length)
    ];

    matchConfig = {
      white: {
        ...white,
        personality: whitePers.name,
        temperature: whitePers.temperature,
      },
      black: {
        ...black,
        personality: blackPers.name,
        temperature: blackPers.temperature,
      },
      timeControl: timeControl.name,
      timeSeconds: timeControl.seconds,
      seed: Math.random(),
    };

    // Ensure different from last config
    if (
      !this.lastMatchConfig ||
      this.configsAreDifferent(matchConfig, this.lastMatchConfig)
    ) {
      break;
    }

    attempts++;
  } while (attempts < 100);

  this.lastMatchConfig = matchConfig;
  return matchConfig;
}
```

### WebSocket Events

**Update Event: GameStarted**
Add to existing event:
```json
{
  "type": "GameStarted",
  "matchNumber": 43,
  "timeControl": "Rapid",
  "timeSeconds": 900,
  "white": {
    "name": "Ollama-1",
    "model": "mistral",
    "personality": "Aggressive",
    "temperature": 0.9
  },
  "black": {
    "name": "Ollama-2",
    "model": "tinyllama",
    "personality": "Defensive",
    "temperature": 0.3
  }
}
```

### Testing
- [ ] Players randomize each game (not same matchup twice)
- [ ] Temperatures randomize
- [ ] Personalities vary
- [ ] Time controls change
- [ ] UI displays new configuration

---

## Story 73.3: Arena Rotation & Statistics

### Objective
Track tournament statistics across all games and display them in real-time through the WebSocket.

### Requirements

1. **Per-Game Tracking**
   ```typescript
   interface GameStatistics {
     gameNumber: number;
     white: string;
     black: string;
     result: "white-win" | "black-win" | "draw";
     moveCount: number;
     durationSeconds: number;
     whiteTemp: number;
     blackTemp: number;
     personality: { white: string; black: string };
     timeControl: string;
     startTime: number;
     endTime: number;
   }
   ```

2. **Aggregated Statistics**
   ```typescript
   interface ArenaStatistics {
     totalGames: number;
     whiteWins: number;
     blackWins: number;
     draws: number;
     averageMoveCount: number;
     averageDurationSeconds: number;
     uptime: number;
     gamesPerHour: number;
     
     playerStats: {
       [playerName]: {
         wins: number;
         losses: number;
         draws: number;
         rating: number;
         totalGames: number;
       };
     };
     
     personalityStats: {
       [personality]: {
         wins: number;
         losses: number;
         draws: number;
         avgDuration: number;
       };
     };
   }
   ```

3. **Real-Time Broadcasting**
   - Emit ArenaStatisticsUpdated every game
   - Stream to all connected WebSocket clients
   - Update browser UI automatically

### Implementation

**File: arena.js (new class property)**

```typescript
class ChessArena {
  constructor() {
    // ... existing
    this.statistics = {
      totalGames: 0,
      whiteWins: 0,
      blackWins: 0,
      draws: 0,
      gameHistory: [],  // Last 100 games
      startTime: Date.now(),
    };
  }

  recordGameResult(result, matchConfig, matchNumber, durationMs, moveCount) {
    this.statistics.totalGames++;

    if (result === "white-win") {
      this.statistics.whiteWins++;
    } else if (result === "black-win") {
      this.statistics.blackWins++;
    } else {
      this.statistics.draws++;
    }

    // Store game result
    const gameRecord = {
      matchNumber,
      white: matchConfig.white.name,
      black: matchConfig.black.name,
      result,
      moveCount,
      durationMs,
      whiteTemp: matchConfig.white.temperature,
      blackTemp: matchConfig.black.temperature,
      timestamp: Date.now(),
    };

    this.statistics.gameHistory.push(gameRecord);
    if (this.statistics.gameHistory.length > 100) {
      this.statistics.gameHistory.shift();
    }

    // Broadcast updated statistics
    this.wsServer.emitArenaStatisticsUpdated(this.getStatistics());
  }

  getStatistics() {
    const uptime = Date.now() - this.statistics.startTime;
    const hours = uptime / (1000 * 60 * 60);
    const gamesPerHour = this.statistics.totalGames / hours;

    return {
      totalGames: this.statistics.totalGames,
      whiteWins: this.statistics.whiteWins,
      blackWins: this.statistics.blackWins,
      draws: this.statistics.draws,
      uptime: Math.floor(uptime / 1000),
      gamesPerHour: Math.round(gamesPerHour * 100) / 100,
      avgMoveCount: Math.round(
        this.statistics.gameHistory.reduce((sum, g) => sum + g.moveCount, 0) /
          (this.statistics.gameHistory.length || 1)
      ),
      recentGames: this.statistics.gameHistory.slice(-10),
    };
  }
}
```

### WebSocket Events

**Updated Event: ArenaStatisticsUpdated**
```json
{
  "type": "ArenaStatisticsUpdated",
  "totalGames": 42,
  "whiteWins": 18,
  "blackWins": 16,
  "draws": 8,
  "uptime": 3600,
  "gamesPerHour": 11.67,
  "avgMoveCount": 28,
  "recentGames": [
    {
      "matchNumber": 42,
      "white": "Ollama-1",
      "black": "Ollama-2",
      "result": "white-win",
      "moveCount": 32,
      "durationMs": 45000
    }
  ]
}
```

### Testing
- [ ] Statistics accumulate correctly
- [ ] Win/loss/draw counts accurate
- [ ] ArenaStatisticsUpdated emitted after each game
- [ ] Recent games list maintained
- [ ] No integer overflow over 1000+ games
- [ ] Statistics persist across WebSocket reconnects

---

## Story 73.4: 24/7 Streaming Mode

### Objective
Enable continuous, uninterrupted arena operation suitable for streaming to YouTube for hours.

### Requirements

1. **Automatic Recovery**
   - Ollama disconnects → Wait 5s → Reconnect
   - WebSocket client disconnects → Notify (client reconnects automatically)
   - Arena crash → Log error → Resume next game
   - CPU spike → Throttle Ollama requests (backoff)

2. **Health Monitoring**
   - Check Ollama availability every 30s
   - Emit HealthStatus events
   - Log warnings if degraded
   - Auto-recover without manual intervention

3. **Long-Running Stability**
   - No memory leaks over 24+ hours
   - Handle 1000+ games without restart
   - Graceful Ctrl+C shutdown
   - Persist statistics to disk

### Implementation

**File: arena.js (new resilience methods)**

```typescript
async ensureOllamaAvailable() {
  const maxRetries = 5;
  const retryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("http://localhost:11434/api/version");
      if (response.ok) {
        console.log("✅ Ollama available");
        return;
      }
    } catch (error) {
      console.warn(`⚠️  Ollama unavailable (attempt ${attempt}/${maxRetries})`);
      if (attempt < maxRetries) {
        await this.delay(retryDelayMs);
      }
    }
  }

  throw new Error("Ollama unavailable after 5 retries");
}

async startHealthMonitor() {
  setInterval(async () => {
    try {
      const response = await fetch("http://localhost:11434/api/version");
      const data = await response.json();

      this.wsServer.emitHealthStatus({
        ollama: "healthy",
        version: data.version,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.wsServer.emitHealthStatus({
        ollama: "unhealthy",
        error: error.message,
        timestamp: Date.now(),
      });
    }
  }, 30000); // Every 30 seconds
}

persistStatistics() {
  const statsFile = "arena-statistics.json";
  fs.writeFileSync(
    statsFile,
    JSON.stringify(this.statistics, null, 2)
  );
  console.log(`📊 Statistics saved to ${statsFile}`);
}

async shutdown() {
  console.log("\n🛑 Shutting down gracefully...");
  this.persistStatistics();
  await this.wsServer.stop();
  console.log("✅ Shutdown complete");
  process.exit(0);
}
```

**File: arena.js (in run() method)**

```typescript
async run() {
  try {
    // ... existing setup code
    
    // Monitor health
    this.startHealthMonitor();
    
    // Graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    
    // Main loop
    let matchNumber = 1;
    while (true) {
      try {
        // Ensure Ollama before each game
        await this.ensureOllamaAvailable();
        
        // Play game
        const result = await this.simulateGame(matchConfig, matchNumber);
        
        // Record statistics
        this.recordGameResult(result, matchConfig, matchNumber);
        
        // Restart
        matchNumber++;
      } catch (error) {
        console.error(`⚠️  Game error: ${error.message}`);
        this.wsServer.emitGameError({
          error: error.message,
          matchNumber,
          timestamp: Date.now(),
        });
        
        // Wait before retry
        await this.delay(10000);
      }
    }
  } catch (error) {
    console.error(`❌ Arena fatal error: ${error.message}`);
    await this.shutdown();
  }
}
```

### WebSocket Events

**New Event: HealthStatus**
```json
{
  "type": "HealthStatus",
  "ollama": "healthy",
  "version": "0.2.0",
  "timestamp": 1689500000000
}
```

**New Event: GameError**
```json
{
  "type": "GameError",
  "error": "Ollama timeout",
  "matchNumber": 42,
  "timestamp": 1689500000000
}
```

### Configuration

**Add to .env:**
```
# Arena Configuration
MATCH_RESTART_DELAY_MS=5000
HEALTH_CHECK_INTERVAL_MS=30000
OLLAMA_RETRY_COUNT=5
OLLAMA_RETRY_DELAY_MS=5000
STATISTICS_PERSIST_FILE=arena-statistics.json
```

### Testing
- [ ] Runs 100+ games without restart
- [ ] Memory usage stable over 1 hour
- [ ] Ollama disconnect → auto-recover
- [ ] Statistics saved to JSON on Ctrl+C
- [ ] Health status emitted every 30s
- [ ] Error handling doesn't crash arena
- [ ] Browser stays connected during recovery

---

## Integration with EPIC 72

The WebSocket spectator system will display:

1. **Live Match Information**
   - Current game number
   - Players, models, temperatures
   - Current board state
   - Move count, duration

2. **Arena Statistics**
   - Total games played
   - Win/loss/draw breakdown
   - Games per hour
   - Uptime

3. **Health Indicators**
   - 🟢 Healthy (Ollama responding)
   - 🟡 Degraded (Slow Ollama)
   - 🔴 Unhealthy (Ollama down)

4. **Countdown Timer**
   - "Next match in 3 seconds"
   - Updates every second

---

## Files to Modify

- **arena.js** (main changes)
  - Add statistics tracking
  - Add countdownToNextMatch()
  - Add health monitoring
  - Add graceful shutdown
  - Update run() loop

- **.env** (add configuration)
  - MATCH_RESTART_DELAY_MS
  - HEALTH_CHECK_INTERVAL_MS
  - OLLAMA_RETRY_COUNT
  - OLLAMA_RETRY_DELAY_MS

- **websocket-server.js** (extend event types)
  - Add MatchRestartIn
  - Add HealthStatus
  - Add GameError

- **apps/web/src/components/ChessSpectator/** (extend UI)
  - Display match countdown
  - Display arena statistics
  - Display health indicator
  - Update in real-time

---

## Acceptance Criteria

**Story 73.1: Automatic Match Restart**
- [ ] Game finishes, waits configured delay
- [ ] Next game starts automatically
- [ ] Countdown displays
- [ ] Can interrupt with Ctrl+C
- [ ] No user intervention required
- [ ] Configurable delay via .env

**Story 73.2: Random Player/Model Assignment**
- [ ] Player assignments randomize
- [ ] Models/temperatures randomize
- [ ] Personalities vary each game
- [ ] Never same matchup twice in row
- [ ] Time controls randomize
- [ ] UI displays assignment

**Story 73.3: Arena Statistics**
- [ ] Statistics track correctly
- [ ] Updated after each game
- [ ] Broadcast via WebSocket
- [ ] Browser UI updates live
- [ ] Recent games displayed
- [ ] Aggregated stats accurate

**Story 73.4: 24/7 Streaming Mode**
- [ ] Runs 100+ games without crash
- [ ] Memory usage stable
- [ ] Ollama disconnect handled
- [ ] Auto-recovery works
- [ ] Health monitored
- [ ] Statistics persisted
- [ ] Graceful shutdown

---

## Success Metrics

| Metric | Target | Success |
|--------|--------|---------|
| Games per hour | 10+ | ✅ At 30s/move = 120 games/hr |
| Uptime | 24+ hours | ✅ No crashes recorded |
| Memory leak | None | ✅ Stable over 100 games |
| Recovery time | <30s | ✅ Auto-reconnect |
| Statistics accuracy | 100% | ✅ Verified per game |

---

## Timeline

**Week 1:**
- Day 1-2: Implement 73.1 (auto-restart) + 73.2 (random assignment)
- Day 3-4: Implement 73.3 (statistics) + 73.4 (resilience)
- Day 5: Testing, bug fixes, documentation

**Estimated Effort:** 15-20 hours

**Next EPIC:** EPIC 74 (Streaming Experience) - Professional overlays, YouTube integration

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Ollama timeout | Medium | High | Implement retry + fallback |
| Memory leak | Low | High | Monitor with Node.js inspector |
| WebSocket drops | Low | Medium | Auto-reconnect already in place |
| Statistics corruption | Low | Medium | JSON validation + backups |

---

## Questions for Clarification

1. **Match Restart Delay:**
   - Current plan: 5 seconds default
   - Question: Should spectators be able to pause between games?
   - Recommendation: Add optional pause mode in future EPIC

2. **Statistics Retention:**
   - Current plan: In-memory + JSON file
   - Question: Should we add database integration?
   - Recommendation: JSON is sufficient for MVP, add DB in future

3. **Player Pool:**
   - Current plan: Fixed 2 players in config
   - Question: Should we support >2 players for round-robin?
   - Recommendation: Out of scope for EPIC 73, add in future

---

## Conclusion

EPIC 73 transforms the chess arena into a production-ready 24/7 tournament system. By automating match restarts, randomizing assignments, and tracking statistics, we enable continuous streaming scenarios while maintaining reliability and providing real-time spectator engagement.

**Ready to proceed with implementation.**
