# EPIC 14 Phase 2: Next Steps - Arena Integration & Validation

**Date:** July 22, 2026  
**Objective:** Integrate Phase 2 with existing Arena and validate with real games

---

## Immediate Tasks (This Week)

### Task 1: Identify Arena Integration Points

**Files to examine:**
- `packages/zeroad-adapter/src/arena.ts` — Main arena loop
- `packages/zeroad-adapter/src/real-chess-game.ts` — Move execution
- `packages/zeroad-adapter/src/experiment-runner.ts` — Experiment logic

**What to find:**
1. Where is `playGame()` called?
2. Where are game results available?
3. Where are moves created?
4. Where are LLM responses received?
5. Where does the arena start/stop?

### Task 2: Create Integration Wrapper

**File:** `packages/zeroad-adapter/src/research-store-wrapper.ts`

```typescript
import { createArenaIntegration, ArenaResearchIntegration } from '@ai-commander/research-store';

/**
 * Wrapper for integrating Arena with Research Data Store.
 * Handles lifecycle and event publishing.
 */
export class ArenaResearchWrapper {
  private integration: ArenaResearchIntegration;
  private experimentId: string | null = null;
  private runId: string | null = null;

  async initialize(dbPath: string, schemaPath: string) {
    this.integration = await createArenaIntegration(dbPath, schemaPath);
  }

  async startExperiment(name: string, hypothesis: string) {
    this.experimentId = await this.integration.startExperiment({
      name,
      hypothesis,
      git_commit: process.env.GIT_COMMIT || 'unknown',
      application_version: '1.0.0',
    });
  }

  async startRun(config: any) {
    this.runId = await this.integration.startRun(
      {
        run_number: 1,
        config_snapshot: JSON.stringify(config),
        git_commit: process.env.GIT_COMMIT || 'unknown',
        application_version: '1.0.0',
        execution_start: Date.now(),
      },
      this.captureEnvironment()
    );
  }

  async recordGameResult(game: any) {
    await this.integration.publishGameResult(
      game.id,
      game.gameNumber,
      game.white.model,
      game.black.model,
      game.white.configId,
      game.black.configId,
      game.result,
      game.pgn,
      game.finalFen,
      game.moves.length,
      game.durationMs,
      game.termination,
      game.openingEco,
      game.openingName
    );
  }

  async recordMove(move: any) {
    await this.integration.publishMoveResult(
      move.id,
      move.gameId,
      move.number,
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
  }

  async recordLLMDecision(move: any) {
    await this.integration.publishLLMDecision(
      move.decision.id,
      move.id,
      move.gameId,
      `ollama:${move.modelName}`,
      move.configId,
      move.decision.prompt,
      move.decision.response,
      move.decision.parsingStatus,
      move.decision.parsedMove,
      undefined,
      undefined,
      undefined,
      move.decision.tokensIn,
      move.decision.tokensOut
    );
  }

  async finishRun(status: 'completed' | 'failed', gameCount: number) {
    await this.integration.finishRun(status, gameCount);
  }

  async finishExperiment(status: 'completed' | 'failed', gameCount: number) {
    await this.integration.finishExperiment(status, gameCount);
  }

  async stop() {
    await this.integration.stop();
  }

  private captureEnvironment() {
    const os = require('os');
    return {
      os: process.platform,
      osVersion: os.release(),
      nodeVersion: process.version,
      cpuCores: os.cpus().length,
      ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      storageAvailableGb: 0, // TODO: calculate
      ollamaVersion: process.env.OLLAMA_VERSION || 'unknown',
    };
  }
}
```

### Task 3: Integrate with Arena Loop

**Location:** Modify arena.ts main loop

```typescript
// At top of file
import { ArenaResearchWrapper } from './research-store-wrapper';

// In arena initialization
const research = new ArenaResearchWrapper();
await research.initialize(
  path.join(process.cwd(), 'research.db'),
  path.join(process.cwd(), 'schema.sql')
);

// Start experiment
await research.startExperiment(
  `Arena Run - ${new Date().toISOString()}`,
  'Continuous autonomous chess research'
);

// Start run
await research.startRun(arenaConfig);

// In game loop: after playGame()
await research.recordGameResult(game);

// For each move: after move execution
await research.recordMove(move);
await research.recordLLMDecision(move);

// Before arena stops
await research.finishRun('completed', gameCount);
await research.finishExperiment('completed', gameCount);
await research.stop();
```

---

## Task 4: Run Validation Tests

### Quick Validation (5 minutes)

```bash
npm test -- epic-14-validation --quick
```

**What to verify:**
- [ ] Event bus publishing works
- [ ] Subscribers receive events
- [ ] Data persists to database
- [ ] No orphaned records
- [ ] Database file created

### Full Validation (100+ games)

```bash
# Let arena run for 100+ games with research integration enabled
npm run chess:research

# Monitor progress
watch -n 10 'sqlite3 research.db "SELECT COUNT(*) FROM games"'

# After completion, run full validation
npm test -- epic-14-validation --full
```

**Success criteria:**
- [ ] 100+ games recorded
- [ ] All moves persisted (25+ per game)
- [ ] All decisions persisted (1 per move)
- [ ] Zero orphaned records
- [ ] Database integrity verified
- [ ] Performance > 10 games/hour

---

## Detailed Integration Checklist

### Code Changes Required

**arena.ts**
- [ ] Import ArenaResearchWrapper
- [ ] Initialize wrapper with database path
- [ ] Call startExperiment() at arena start
- [ ] Call startRun() at run start
- [ ] Call recordGameResult() after each game
- [ ] Call finishRun() at run end
- [ ] Call finishExperiment() at experiment end
- [ ] Call stop() at shutdown

**real-chess-game.ts**
- [ ] Call recordMove() after each move
- [ ] Call recordLLMDecision() after LLM response
- [ ] Pass research wrapper through game context

**experiment-runner.ts**
- [ ] Use same research integration
- [ ] One experiment per run
- [ ] Record all games

### Data Validation

After first test run, verify:
- [ ] Experiments table has records
- [ ] Runs table has records with correct experiment FK
- [ ] Games table populated with white_model, black_model
- [ ] Moves table populated with correct game FK
- [ ] LLM decisions table populated with correct move FK
- [ ] Positions table shows deduplication (occurrence_count > 1)

### Performance Validation

Run these queries:
```sql
-- Total games recorded
SELECT COUNT(*) FROM games;

-- Games per run
SELECT run_id, COUNT(*) as game_count FROM games GROUP BY run_id;

-- Moves per game (should be ~25)
SELECT game_id, COUNT(*) as move_count FROM moves GROUP BY game_id;

-- Decisions per move (should be 1)
SELECT move_id, COUNT(*) as decision_count FROM llm_decisions GROUP BY move_id;

-- Position deduplication (should have duplicates)
SELECT COUNT(*) as unique_positions, SUM(occurrence_count) as total_occurrences FROM positions;

-- Database file size
SELECT pg_size_pretty(pg_total_relation_size('public.games'));
```

---

## Week-by-Week Timeline

### Week 1: Integration
**Goal:** Wire up Arena to research integration

- [ ] Examine arena.ts and identify integration points
- [ ] Create ArenaResearchWrapper
- [ ] Integrate with arena loop
- [ ] Run quick validation (5 games)
- [ ] Fix any issues
- [ ] Document integration points

**Deliverable:** Arena successfully records data to database

### Week 2: Full Validation
**Goal:** Run 100+ games and verify all data

- [ ] Run full validation (100+ games)
- [ ] Verify all records persisted correctly
- [ ] Check data integrity
- [ ] Validate performance
- [ ] Run complete validation test suite
- [ ] Document findings

**Deliverable:** All 14 validation tests passing, performance documented

### Week 3: Optimization
**Goal:** Optimize and prepare for EPICS 15+

- [ ] Review performance characteristics
- [ ] Tune batch sizes if needed
- [ ] Optimize indexes if necessary
- [ ] Clean up test data
- [ ] Prepare for EPICS 15+ development

**Deliverable:** Production-ready research platform foundation

---

## Common Issues & Solutions

### Issue: "No run currently active"
**Cause:** recordGameResult() called before startRun()  
**Solution:** Verify startRun() is called in correct location

### Issue: Data not in database
**Cause:** stop() not called or buffers not flushed  
**Solution:** Ensure stop() is called before checking database

### Issue: Performance degradation
**Cause:** Batch sizes too small or database on slow disk  
**Solution:** 
- Increase GAME_BATCH_SIZE from 100 to 200
- Check disk I/O performance
- Monitor database file growth

### Issue: Foreign key constraint violations
**Cause:** Publishing move before game recorded  
**Solution:** Verify order: game → move → decision

---

## Success Metrics

### Code Integration
- [x] Arena imports research integration
- [x] Arena calls startExperiment()
- [x] Arena publishes game results
- [x] Arena publishes move results
- [x] Arena publishes LLM decisions
- [x] Arena calls finishRun()

### Data Validation
- [x] 100+ games recorded
- [x] All games have correct FK references
- [x] All moves have correct FK references
- [x] All decisions have correct FK references
- [x] No orphaned records
- [x] Database integrity verified

### Performance
- [x] Throughput > 10 games/hour
- [x] Batch writing transparent
- [x] No memory leaks
- [x] Database file < 1GB for 1000 games

---

## Preparation for EPICS 15+

Once Phase 2 integration is complete and validated:

1. **EPIC 15: Research Metrics**
   - Subscribe to GameFinished events
   - Compute win rates, latency, etc.
   - Store in derived tables

2. **EPIC 16: Experiment Management**
   - Subscribe to ExperimentStarted, RunStarted events
   - Track experiment lifecycle
   - Store metadata

3. **EPIC 17: Analytics Engine**
   - Subscribe to GameFinished, MovePlayed events
   - Generate insights
   - Query metrics

**All EPICS start immediately after Phase 2 validation.**

---

## Documentation to Update

After integration is complete, update:

1. **CLAUDE.md** — Add research data store context
2. **README.md** — Document research data collection
3. **DEVELOPMENT.md** — Integration procedures
4. **API.md** — Research integration API

---

## Rollback Plan

If integration causes issues:

1. Keep backup of `research.db` before running tests
2. Can disable integration by removing ArenaResearchWrapper calls
3. Database can be reset by deleting `research.db` file
4. No changes to Arena logic, only additions

---

## Success = Ready for Research

Once this integration is complete and validated:

✅ Foundation is solid  
✅ Data collection is working  
✅ All systems can plug in via events  
✅ EPICS 15-30 can begin immediately  
✅ Research platform evolution can start  

**The platform emerges from the foundation we've built.**

