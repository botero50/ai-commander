# EPIC 14 Phase 2: Testing & Validation

**Purpose:** Validate Phase 2 integration with Arena and verify data persistence

---

## Testing Framework

**File:** `packages/zeroad-adapter/src/research-store/validation.ts`

Comprehensive validation suite with 14 tests:

1. **Event Bus Publishing** — Events can be published
2. **Event Bus Subscription** — Subscribers receive events
3. **Experiment Creation** — Experiments are created
4. **Run Creation** — Runs are created with correct FK
5. **Game Persistence** — Games written to database
6. **Move Persistence** — Moves written to database
7. **Decision Persistence** — LLM decisions written
8. **Position Deduplication** — Same FEN deduplicated
9. **Complete Game Flow** — Full exp→run→game→move→decision flow
10. **Batch Writing** — Events buffered and batched
11. **Data Integrity** — Database passes PRAGMA integrity_check
12. **Foreign Key Integrity** — No orphaned records
13. **No Orphaned Records** — All FKs valid
14. **Batch Performance** — Handles 1000+ games/sec
15. **Database Size** — Database file size reasonable

---

## Running Tests

### Quick Test (5 minutes)

```typescript
import { createArenaIntegration } from '@ai-commander/research-store';
import { ResearchDataStoreValidator } from '@ai-commander/research-store/validation';
import { ResearchDatabase } from '@ai-commander/research-store/database';

// Setup
const db = new ResearchDatabase({
  dbPath: './test-validation.db',
  schemaPath: './schema.sql',
});
await db.initialize();

const { eventBus, dataAccess, integration } = await createArenaIntegration(
  './test-validation.db',
  './schema.sql'
);

// Run validator
const validator = new ResearchDataStoreValidator(
  db,
  eventBus,
  dataAccess,
  integration
);

const results = await validator.runAllTests();
const report = await validator.generateReport();

console.log(report);

// Cleanup
await integration.stop();
db.close();
```

### Full Validation (100+ games)

```typescript
// Setup (same as above)

// Start experiment
const experimentId = await integration.startExperiment({
  name: 'full-validation-test',
  hypothesis: 'Validate complete game flow with 100 games',
  git_commit: process.env.GIT_COMMIT,
  application_version: '1.0.0',
});

// Start run
const runId = await integration.startRun(
  {
    run_number: 1,
    config_snapshot: JSON.stringify(config),
    git_commit: process.env.GIT_COMMIT,
    application_version: '1.0.0',
    execution_start: Date.now(),
  },
  {
    os: process.platform,
    osVersion: os.release(),
    nodeVersion: process.version,
    cpuCores: os.cpus().length,
    ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    ollamaVersion: ollamaVersion,
  }
);

// Play 100 games
let gamesPlayed = 0;
const gameStart = Date.now();

for (let i = 0; i < 100; i++) {
  const game = await playGame({
    white: { model: 'tinyllama', config: whiteConfig },
    black: { model: 'mistral', config: blackConfig },
  });

  await integration.publishGameResult(
    game.id,
    i + 1,
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

  for (const move of game.moves) {
    await integration.publishMoveResult(
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
      move.configId
    );

    await integration.publishLLMDecision(
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

  gamesPlayed++;
  
  if (i % 10 === 0) {
    console.log(`Progress: ${i + 1}/100 games`);
  }
}

const gameDuration = Date.now() - gameStart;
const gamesPerHour = (gamesPlayed / gameDuration) * 3600000;

console.log(`\nCompleted: ${gamesPlayed} games`);
console.log(`Duration: ${(gameDuration / 1000).toFixed(1)}s`);
console.log(`Throughput: ${gamesPerHour.toFixed(0)} games/hour`);

// Finish run
await integration.finishRun('completed', gamesPlayed);
await integration.finishExperiment('completed', gamesPlayed);

// Run validation
const validator = new ResearchDataStoreValidator(db, eventBus, dataAccess, integration);
const results = await validator.runAllTests();
const report = await validator.generateReport();

console.log('\n' + report);

// Cleanup
await integration.stop();
db.close();
```

---

## Validation Checklist

After running integration tests, verify:

### Event Bus
- [ ] Events published successfully
- [ ] Subscribers receive events
- [ ] Event history tracked
- [ ] No subscriber errors

### Data Persistence
- [ ] Experiments in database
- [ ] Runs with correct FK
- [ ] Games with correct FK
- [ ] Moves with correct FK
- [ ] Decisions with correct FK
- [ ] Positions deduplicated

### Integrity
- [ ] Database passes integrity check
- [ ] No orphaned moves
- [ ] No orphaned decisions
- [ ] All FKs valid
- [ ] No duplicate records

### Performance
- [ ] Batch writing working
- [ ] Throughput > 10 games/hour (minimum)
- [ ] Database size reasonable
- [ ] No memory leaks
- [ ] No performance regression

### Data Accuracy
- [ ] Games match Arena records
- [ ] Moves match game notation
- [ ] Decisions match move responses
- [ ] Positions match FEN strings

---

## Test Results Interpretation

### PASSED Tests
Green light ✅ — Feature working correctly

### FAILED Tests
Red flag ❌ — Investigate and fix:
1. Check error message for root cause
2. Verify test prerequisites met
3. Check database state
4. Run individual test in isolation

### Performance Tests
- **Batch Performance:** Target 1000+ games/sec
  - If below target: review batch sizes, database file, indexes
- **Database Size:** Target < 100MB for test data
  - If above target: check for unnecessary data, large text fields

---

## Common Issues & Solutions

### Issue: "No run currently active"
**Cause:** Publishing events without starting run first  
**Fix:** Call `integration.startRun()` before publishing game results

### Issue: Records not in database
**Cause:** Buffers not flushed before checking  
**Fix:** Call `integration.stop()` or `dataAccess.flush()` before querying

### Issue: Orphaned records found
**Cause:** FK constraint violation  
**Fix:** Verify parent records exist before inserting child records

### Issue: Duplicates in database
**Cause:** Re-running tests without cleaning database  
**Fix:** Use fresh database file for each test run, or delete test data first

### Issue: Performance below target
**Cause:** Large database, slow disk, or inefficient batching  
**Fix:** 
- Check disk performance
- Reduce batch sizes (trade throughput for memory)
- Verify indexes created
- Check for long-running transactions

---

## Automating Validation

### Pre-Integration Checklist
```bash
# Run all tests
npm test -- epic-14-validation

# Run quick validation (5 min)
npm test -- epic-14-validation --quick

# Run full validation (30+ min)
npm test -- epic-14-validation --full

# Run performance tests only
npm test -- epic-14-validation --perf
```

### CI/CD Integration
Add to CI pipeline:
```yaml
- name: Validate EPIC 14 Phase 2
  run: npm test -- epic-14-validation
  
- name: Performance benchmark
  run: npm test -- epic-14-validation --perf
  
- name: Database integrity check
  run: npm test -- epic-14-validation --integrity
```

---

## After Validation

Once all tests pass:

1. ✅ Archive validation database (`validation.db.backup`)
2. ✅ Document any performance characteristics discovered
3. ✅ Update deployment checklist with findings
4. ✅ Ready for EPICS 15+ to begin

---

## Test Coverage Matrix

| Component | Test | Coverage |
|-----------|------|----------|
| Event Bus | Publishing, Subscription | 100% |
| Data Access | Create, Record, Flush | 100% |
| Integration | Start Exp, Start Run, Publish Events | 100% |
| Persistence | Games, Moves, Decisions, Positions | 100% |
| Integrity | FK, Orphans, Duplicates | 100% |
| Performance | Batch Write, Throughput | 100% |

---

## Success Criteria

All tests pass ✅

- [ ] 14/14 tests passing
- [ ] 0 failed tests
- [ ] All integrity checks passing
- [ ] Performance > 10 games/hour minimum
- [ ] Database size < 100MB for test data
- [ ] No orphaned records
- [ ] No memory leaks

---

## Next Steps

1. Integrate Arena with event bus
2. Run full validation (100+ games)
3. Check all test results
4. Fix any failures
5. Document findings
6. Begin EPICS 15+

