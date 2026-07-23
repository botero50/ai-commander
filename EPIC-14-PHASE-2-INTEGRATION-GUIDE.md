# EPIC 14 Phase 2: Arena Integration Guide

**Date:** July 22, 2026  
**Purpose:** Wire up Arena to the Research Data Store

---

## Quick Start

### 1. Import the Integration

```typescript
// In arena.js or main entry point
import { createArenaIntegration } from '@ai-commander/research-store';

// Create the integration
const integration = await createArenaIntegration(
  './research.db',           // Database file path
  './schema.sql'             // Schema path
);
```

### 2. Start an Experiment

```typescript
const experimentId = await integration.startExperiment({
  name: 'tinyllama-vs-mistral-benchmark',
  hypothesis: 'Compare model performance across 1000 games',
  git_commit: process.env.GIT_COMMIT,
  application_version: '1.0.0',
  target_games: 1000,
  description: 'Benchmark run on 2026-07-22',
  success_criteria: 'Complete 1000 games with 0% illegal moves',
});
```

### 3. Start a Run

```typescript
const runId = await integration.startRun(
  {
    run_number: 1,
    config_snapshot: JSON.stringify(arenaConfig),
    git_commit: process.env.GIT_COMMIT,
    application_version: '1.0.0',
    random_seed: Math.random().toString(),
  },
  {
    os: process.platform,
    osVersion: os.release(),
    nodeVersion: process.version,
    cpuCores: os.cpus().length,
    ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    ollamaVersion: ollamaVersion,
    // ... other environment data
  }
);
```

### 4. After Each Game

```typescript
// Publish game result
await integration.publishGameResult(
  gameId,
  gameNumber,
  'tinyllama',
  'mistral',
  whiteConfigId,
  blackConfigId,
  result,              // '1', '0.5', or '0'
  pgn,
  finalFen,
  moveCount,
  durationMs,
  termination,
  openingEco,
  openingName,
  0,                   // white illegal moves
  0,                   // black illegal moves
  avgLatencyMs,
  maxLatencyMs,
  0                    // parsing errors
);
```

### 5. For Each Move

```typescript
// Publish move result
await integration.publishMoveResult(
  moveId,
  gameId,
  moveNumber,
  color,               // 'white' or 'black'
  san,                 // e.g., "e4"
  fenBefore,
  fenAfter,
  latencyMs,
  confidence,          // 0-100
  isLegal,
  modelName,
  modelConfigId,
  illegalRetryCount
);

// Publish LLM decision (immediately after move)
await integration.publishLLMDecision(
  decisionId,
  moveId,
  gameId,
  'ollama:tinyllama:7b',
  modelConfigId,
  prompt,
  response,
  parsingStatus,       // 'success', 'failed', or 'malformed'
  parsedMove,
  promptVersion,
  promptHash,
  undefined,           // promptTemplateName
  tokensIn,
  tokensOut,
  parsingNotes,
  retryCount
);
```

### 6. Finish the Run

```typescript
await integration.finishRun('completed', gamesCompleted);
```

### 7. Finish the Experiment

```typescript
await integration.finishExperiment('completed', totalGames);
```

### 8. Shutdown

```typescript
await integration.stop();
```

---

## Complete Example: Arena Loop

```typescript
import { createArenaIntegration } from '@ai-commander/research-store';

async function runArena() {
  // Initialize research integration
  const research = await createArenaIntegration(
    './research.db',
    './schema.sql'
  );

  try {
    // Start experiment
    const experimentId = await research.startExperiment({
      name: 'tinyllama-vs-mistral',
      hypothesis: 'Benchmark different models',
      git_commit: process.env.GIT_COMMIT,
      application_version: '1.0.0',
      target_games: 100,
    });

    // Start run
    const runId = await research.startRun(
      {
        run_number: 1,
        config_snapshot: JSON.stringify(config),
        git_commit: process.env.GIT_COMMIT,
        application_version: '1.0.0',
      },
      captureEnvironment()
    );

    // Main game loop
    let gameNumber = 1;
    while (gameNumber <= 100) {
      try {
        // Play game
        const game = await playGame({
          white: { model: 'tinyllama', config: whiteConfig },
          black: { model: 'mistral', config: blackConfig },
        });

        // Publish game result
        await research.publishGameResult(
          game.id,
          gameNumber,
          'tinyllama',
          'mistral',
          whiteConfigId,
          blackConfigId,
          game.result,
          game.pgn,
          game.finalFen,
          game.moves.length,
          game.durationMs
        );

        // For each move (already captured in game.moves)
        for (const move of game.moves) {
          await research.publishMoveResult(
            move.id,
            game.id,
            move.moveNumber,
            move.color,
            move.san,
            move.fenBefore,
            move.fenAfter,
            move.latencyMs,
            move.confidence,
            move.isLegal,
            move.modelName,
            move.configId,
            move.illegalRetries
          );

          // Publish LLM decision
          await research.publishLLMDecision(
            move.decision.id,
            move.id,
            game.id,
            `ollama:${move.modelName}`,
            move.configId,
            move.decision.prompt,
            move.decision.response,
            move.decision.parsingStatus,
            move.decision.parsedMove
          );
        }

        gameNumber++;
      } catch (error) {
        console.error('Game error:', error);
        await research.publishArenaRecovery(
          error.name,
          'retrying',
          true
        );
        // Retry or continue
      }
    }

    // Finish run
    await research.finishRun('completed', gameNumber - 1);

    // Finish experiment
    await research.finishExperiment('completed', gameNumber - 1);

    // Cleanup
    await research.stop();
  } catch (error) {
    console.error('Arena error:', error);
    await research.stop();
    throw error;
  }
}

// Run the arena
runArena().catch(console.error);
```

---

## Key Integration Points

### 1. Game Execution (real-chess-game.js)
- After each move is made: `publishMoveResult()`
- After LLM response: `publishLLMDecision()`
- When new position reached: `publishPosition()` (automatic in publishMoveResult)

### 2. Game Completion (arena.js)
- After game finishes: `publishGameResult()`

### 3. Arena Lifecycle
- Before games start: `startRun()` with environment
- If arena recovers: `publishArenaRecovery()`
- When arena stops: `finishRun()` and `finishExperiment()`

### 4. Cleanup
- Before shutdown: `stop()` to flush remaining buffered records

---

## What Happens Automatically

✅ **Batching:** Moves and decisions batched internally  
✅ **Persistence:** Events automatically written to SQLite  
✅ **Transactions:** Each batch is atomic (all-or-nothing)  
✅ **History:** Event log kept for debugging  

Callers don't think about any of this. Just publish events.

---

## Testing the Integration

### Quick Test (5 games)

```typescript
const research = await createArenaIntegration('./test.db', './schema.sql');

await research.startExperiment({
  name: 'test-experiment',
  hypothesis: 'Quick integration test',
  git_commit: 'test',
  application_version: '1.0.0',
});

await research.startRun(
  {
    run_number: 1,
    config_snapshot: '{}',
    git_commit: 'test',
    application_version: '1.0.0',
  },
  {
    os: 'test',
    osVersion: '1.0',
    nodeVersion: 'v18',
  }
);

// Simulate 5 games
for (let i = 0; i < 5; i++) {
  await research.publishGameResult(
    `game-${i}`,
    i + 1,
    'white-model',
    'black-model',
    'cfg-white',
    'cfg-black',
    i % 3 === 0 ? '1' : i % 3 === 1 ? '0.5' : '0',
    'fake pgn',
    'fake fen',
    25,
    15000
  );
}

await research.finishRun('completed', 5);
await research.finishExperiment('completed', 5);
await research.stop();

// Verify data was written
const db = new ResearchDatabase({
  dbPath: './test.db',
  schemaPath: './schema.sql',
});
await db.initialize();
const games = db.query('SELECT COUNT(*) as count FROM games');
console.log('Games recorded:', games[0].count); // Should be 5
db.close();
```

---

## Verification Checklist

After integration, verify:

- [ ] Experiments created in database
- [ ] Runs created with correct experiment FK
- [ ] Games inserted with correct run FK
- [ ] Moves inserted with correct game FK
- [ ] LLM decisions inserted with correct move FK
- [ ] Positions deduplicated
- [ ] Batch writing working (check insert frequency)
- [ ] No performance regression (games/hour unchanged)
- [ ] Database integrity verified (no orphaned records)
- [ ] All game results match Arena records

---

## Common Issues & Solutions

### Issue: "No run currently active"
**Solution:** Call `startRun()` before calling `publishGameResult()`

### Issue: Event data not in database
**Solution:** Call `integration.stop()` to flush buffers before checking

### Issue: Duplicate games
**Solution:** Ensure unique `gameId` values (use UUID)

### Issue: Performance regression
**Solution:** Check batch buffer sizes (GAME_BATCH_SIZE, MOVE_BATCH_SIZE, etc.)

---

## Next Steps

1. **Integrate into arena.js** — Add calls as shown above
2. **Test with 100+ games** — Verify all data persists
3. **Check database** — Verify tables populated correctly
4. **Verify performance** — No regression in games/hour
5. **Rebuild analytics** — Run `rebuildDerivedAnalytics()`
6. **Validate results** — Compare games in database with Arena output

Once validated, the foundation is ready for EPICS 15+ to plug in via event subscription.

---

## After Integration

Once Arena is wired up, Phase 2 is complete and the foundation is solid for:

- **EPIC 15** — Metrics system subscribes to events
- **EPIC 16** — Experiment management subscribes to events
- **EPIC 17** — Analytics engine subscribes to events
- **EPICS 18-23** — Intelligence systems subscribe to events
- **EPICS 24+** — All future systems plug in independently

All without ever modifying Arena or Phase 2 again.

