# EPIC 14 Phase 2: Integration Tasks & Timeline

**Status:** ✅ Tasks 1-2 Complete | ⏳ Tasks 3-7 Ready to Begin

**Date:** July 22, 2026

---

## Completed Tasks

### Task 1: Identify Arena Integration Points ✅
**Status:** COMPLETE (Commit: a4ee233)

**Deliverable:** EPIC-14-ARENA-INTEGRATION-FINDINGS.md
- Arena architecture documented
- Integration points identified
- Game object structure defined
- Timeline established

### Task 2: Create ArenaResearchWrapper ✅
**Status:** COMPLETE (Commit: 32dda91)

**Deliverable:** packages/zeroad-adapter/src/research-store-wrapper.ts (280 lines)
- Complete wrapper implementation
- All methods defined
- Error handling included
- Logging integrated

---

## Upcoming Tasks

### Task 3: Update ChessStartup
**File:** `packages/cli/src/chess-startup.ts`  
**Effort:** 30 minutes  
**Priority:** HIGH

#### Changes Required

1. **Import wrapper** (line ~1)
```typescript
import { ArenaResearchWrapper } from '../zeroad-adapter/src/research-store-wrapper.js';
```

2. **Create logger field** (line ~40, in ChessStartup class)
```typescript
private research: ArenaResearchWrapper | null = null;
```

3. **Update launchArena method** (line ~246)
```typescript
private async launchArena(): Promise<void> {
  // Initialize research wrapper
  this.research = new ArenaResearchWrapper(this.logger);
  
  await this.research.initialize(
    path.join(process.cwd(), 'research.db'),
    path.join(process.cwd(), 'schema.sql')
  );
  
  // Start experiment
  await this.research.startExperiment(
    `Arena Run - ${new Date().toISOString()}`,
    'Continuous autonomous chess research'
  );
  
  // Start run
  await this.research.startRun({
    version: this.config.nodeMinVersion,
    ollamaEndpoint: this.config.ollamaEndpoint,
    defaultModel: this.config.defaultModel,
  });
  
  // Launch arena loop
  // TODO: Implement actual game loop here
  // For now, play 5 test games
  
  await this.launchTestArena();
}

private async launchTestArena(): Promise<void> {
  // Placeholder for arena loop implementation
  // Will be replaced with actual game loop
  
  console.log('═'.repeat(50));
  console.log('  Research-Integrated Arena Launching');
  console.log('═'.repeat(50));
  
  // TODO: Implement game playing loop
  // This is where playGame() will be called
  
  // For now, simulate one game
  // await this.research?.recordGameResult({...});
  
  // Clean shutdown
  if (this.research) {
    await this.research.finishRun('completed', 0);
    await this.research.finishExperiment('completed', 0);
    await this.research.stop();
  }
}
```

4. **Add shutdown handler** (in run method or constructor)
```typescript
process.on('SIGINT', async () => {
  if (this.research) {
    await this.research.finishRun('completed', 0);
    await this.research.finishExperiment('completed', 0);
    await this.research.stop();
  }
  process.exit(0);
});
```

**Deliverable:** ChessStartup updated with research integration

---

### Task 4: Create Basic Arena Loop
**File:** `packages/cli/src/arena-loop.ts` (NEW)  
**Effort:** 2 hours  
**Priority:** HIGH

#### Implementation Required

```typescript
/**
 * Arena Loop — Play games and record results
 *
 * Simplified for initial testing:
 * - Play 5 games between two AI models
 * - Record each game and move to research store
 * - Calculate basic statistics
 * - Report results
 */

import { ArenaResearchWrapper } from '../zeroad-adapter/src/research-store-wrapper.js';
import { Logger } from '../zeroad-adapter/src/config/logger.js';

export interface ArenaLoopConfig {
  maxGames?: number; // 0 = infinite, default = 5 for testing
  whiteName: string;
  whiteModel: string;
  blackName: string;
  blackModel: string;
}

export class ArenaLoop {
  private config: ArenaLoopConfig;
  private logger: Logger;
  private research: ArenaResearchWrapper;
  private gamesPlayed = 0;

  constructor(config: ArenaLoopConfig, research: ArenaResearchWrapper, logger?: Logger) {
    this.config = config;
    this.research = research;
    this.logger = logger || new Logger('info', 'ArenaLoop');
  }

  async run(): Promise<void> {
    const maxGames = this.config.maxGames ?? 5;
    const loopForever = maxGames === 0;

    this.logger.info('Arena loop starting', {
      maxGames,
      white: this.config.whiteName,
      black: this.config.blackName,
    });

    try {
      while (loopForever || this.gamesPlayed < maxGames) {
        const gameNumber = this.gamesPlayed + 1;

        this.logger.info('Playing game', { gameNumber });

        // TODO: Replace with actual playGame() call
        const game = this.generateMockGame(gameNumber);

        // Record game to research store
        await this.research.recordGameResult(game);

        // Record moves
        if (game.moves) {
          for (const move of game.moves) {
            await this.research.recordMove(move);
            await this.research.recordLLMDecision(move);
          }
        }

        this.gamesPlayed++;

        if (!loopForever && this.gamesPlayed >= maxGames) {
          this.logger.info('Max games reached', { gamesPlayed: this.gamesPlayed });
          break;
        }
      }
    } catch (error) {
      this.logger.error('Arena loop error', error);
      throw error;
    }
  }

  /**
   * Mock game for testing (until real playGame() is implemented)
   */
  private generateMockGame(gameNumber: number): any {
    const isWhiteWin = Math.random() > 0.5;
    const moveCount = Math.floor(Math.random() * 30) + 20;
    const result = isWhiteWin ? 'white' : Math.random() > 0.5 ? 'black' : 'draw';

    const moves: any[] = [];
    for (let i = 0; i < moveCount; i++) {
      moves.push({
        id: `move-${gameNumber}-${i + 1}`,
        gameId: `game-${gameNumber}`,
        number: i + 1,
        color: i % 2 === 0 ? 'white' : 'black',
        san: this.generateRandomSAN(),
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
        latencyMs: Math.floor(Math.random() * 500) + 100,
        confidence: Math.random() * 0.5 + 0.5,
        isLegal: true,
        modelName: i % 2 === 0 ? this.config.whiteName : this.config.blackName,
        configId: 'default',
        decision: {
          id: `decision-${gameNumber}-${i + 1}`,
          prompt: 'Next move?',
          response: 'I suggest Nf3',
          parsingStatus: 'success',
          parsedMove: this.generateRandomSAN(),
          tokensIn: 150,
          tokensOut: 50,
        },
      });
    }

    return {
      id: `game-${gameNumber}`,
      gameNumber,
      white: { model: this.config.whiteModel, configId: 'default' },
      black: { model: this.config.blackModel, configId: 'default' },
      result,
      pgn: `[Event "Arena"] [White "${this.config.whiteName}"] [Black "${this.config.blackName}"] [Result "${result}"]`,
      finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
      moves,
      durationMs: moveCount * 1000,
      termination: 'normal',
      openingEco: 'A00',
      openingName: 'Irregular Opening',
    };
  }

  private generateRandomSAN(): string {
    const pieces = ['', 'N', 'B', 'R', 'Q', 'K'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    const piece = pieces[Math.floor(Math.random() * pieces.length)];
    const file = files[Math.floor(Math.random() * files.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];

    return piece + file + rank;
  }

  getStats(): {
    gamesPlayed: number;
    status: string;
  } {
    return {
      gamesPlayed: this.gamesPlayed,
      status: 'running',
    };
  }
}
```

**Deliverable:** Basic arena loop with mock game generation

---

### Task 5: Integrate Loop with ChessStartup
**File:** `packages/cli/src/chess-startup.ts`  
**Effort:** 15 minutes  
**Priority:** HIGH

#### Changes Required

```typescript
// Import ArenaLoop
import { ArenaLoop } from './arena-loop.js';

// In launchTestArena method, replace TODO with:
private async launchTestArena(): Promise<void> {
  const loop = new ArenaLoop(
    {
      maxGames: 5, // Test with 5 games first
      whiteName: 'Mistral',
      whiteModel: 'mistral',
      blackName: 'TinyLlama',
      blackModel: 'tinyllama',
    },
    this.research!,
    this.logger
  );

  await loop.run();

  // After loop completes
  const stats = loop.getStats();
  console.log(`\n✅ Arena completed: ${stats.gamesPlayed} games played`);

  // Clean shutdown
  if (this.research) {
    await this.research.finishRun('completed', stats.gamesPlayed);
    await this.research.finishExperiment('completed', stats.gamesPlayed);
    await this.research.stop();
  }

  console.log('Research data persisted to research.db');
}
```

**Deliverable:** ChessStartup now uses ArenaLoop with research integration

---

### Task 6: Run Quick Validation Test
**Effort:** 30 minutes  
**Priority:** HIGH

#### Test Procedure

```bash
# 1. Start in project root
cd /path/to/ai-commander

# 2. Build if needed
pnpm build

# 3. Run chess startup (which now uses research integration)
pnpm chess

# 4. Monitor database growth
# In another terminal:
watch -n 2 'sqlite3 research.db "SELECT COUNT(*) FROM games; SELECT COUNT(*) FROM moves; SELECT COUNT(*) FROM llm_decisions;"'

# 5. After completion, verify data
sqlite3 research.db << EOF
-- Check experiment created
SELECT COUNT(*) as experiments FROM experiments;

-- Check run created
SELECT COUNT(*) as runs FROM runs;

-- Check games recorded
SELECT COUNT(*) as games FROM games;

-- Check moves recorded
SELECT COUNT(*) as moves FROM moves;

-- Check decisions recorded  
SELECT COUNT(*) as decisions FROM llm_decisions;

-- Check no orphaned records
SELECT COUNT(*) as orphaned_moves FROM moves WHERE game_id NOT IN (SELECT id FROM games);
SELECT COUNT(*) as orphaned_decisions FROM llm_decisions WHERE move_id NOT IN (SELECT id FROM moves);

-- Check FK integrity
PRAGMA integrity_check;
EOF
```

#### Success Criteria
- [ ] 5 games recorded
- [ ] All games have correct FK references
- [ ] ~125 moves recorded (25 per game average)
- [ ] All moves have correct game FK
- [ ] 125+ decisions recorded (1 per move)
- [ ] All decisions have correct move FK
- [ ] Zero orphaned records
- [ ] integrity_check returns "ok"

**Deliverable:** Quick validation test results and database verification

---

### Task 7: Document Integration Results
**File:** `EPIC-14-PHASE-2-INTEGRATION-COMPLETE.md` (NEW)  
**Effort:** 30 minutes  
**Priority:** MEDIUM

#### Document Contents

```markdown
# EPIC 14 Phase 2: Integration Complete

**Date:** July 22, 2026  
**Status:** ✅ COMPLETE

## What Was Completed

### Files Created
- ArenaResearchWrapper (280 lines)
- ArenaLoop (200 lines)
- Integration findings doc

### Files Modified
- ChessStartup (20 lines added)

### Architecture Achieved
Arena → Research Wrapper → Event Bus → Data Access → SQLite

### Data Verified
- 5 games recorded ✅
- All moves persisted ✅
- All decisions persisted ✅
- No orphaned records ✅
- Foreign key integrity verified ✅

## Integration Pattern Proven

When actual Arena loop is implemented:
1. Initialize research wrapper
2. Call recordGameResult() for each game
3. Call recordMove() for each move
4. Call recordLLMDecision() for each decision
5. Call finishRun/finishExperiment/stop() on shutdown

All batching handled transparently.

## Timeline Summary

**Week 1 Summary:**
- Task 1: ✅ Identified integration points
- Task 2: ✅ Created wrapper
- Task 3: ✅ Updated ChessStartup
- Task 4: ✅ Created arena loop
- Task 5: ✅ Integrated
- Task 6: ✅ Validated with 5 games
- Task 7: ✅ Documented results

## Ready for Week 2

Phase 2 integration is complete and validated.
Next: Run 100+ game validation (Week 2)
```

**Deliverable:** Integration completion document

---

## Week 1 Timeline

### Day 1 (Today)
- [ ] ✅ Task 1: Identify integration points
- [ ] ✅ Task 2: Create wrapper
- [ ] ⏳ Task 3: Update ChessStartup (30 min)

### Day 2
- [ ] Task 3 (continued): Complete ChessStartup update
- [ ] Task 4: Create ArenaLoop (2 hours)

### Day 3
- [ ] Task 5: Integrate loop with ChessStartup (15 min)
- [ ] Task 6: Run quick validation test (30 min)

### Day 4
- [ ] Task 6 (continued): Verify results
- [ ] Task 7: Document integration (30 min)

### Day 5
- [ ] Review all integration work
- [ ] Prepare for Week 2 full validation

---

## Week 2 Timeline

### Full Validation (100+ games)
1. Modify ArenaLoop to play 100 games
2. Run: `pnpm chess` (let it run for ~30 minutes)
3. Monitor: Watch database growth
4. Verify: Run all validation queries
5. Run: Complete test suite (14 tests)
6. Document: Performance characteristics

### Success Metrics
- [ ] 100+ games recorded
- [ ] Zero failed tests
- [ ] Performance > 10 games/hour
- [ ] All integrity checks passing
- [ ] Ready for EPICS 15+

---

## Architecture After Integration

```
ChessStartup (packages/cli/src/chess-startup.ts)
  ├── Initialize ArenaResearchWrapper
  ├── startExperiment()
  └── Launch ArenaLoop
       ├── playGame() [test version with mock data]
       ├── For each game:
       │   ├── research.recordGameResult()
       │   ├── For each move:
       │   │   ├── research.recordMove()
       │   │   └── research.recordLLMDecision()
       │   └── Loop continues...
       └── On completion:
           ├── research.finishRun()
           ├── research.finishExperiment()
           └── research.stop() [flushes buffers]

Result: SQLite database populated with all game/move/decision data
```

---

## Next Steps After Week 2 Validation

### Immediate (Week 2 Completion)
1. ✅ Full validation complete (100+ games)
2. ✅ All tests passing (14/14)
3. ✅ Performance documented
4. ✅ Ready for EPICS 15+

### Short Term (Weeks 3-4)
1. Begin EPIC 15: Research Metrics
   - Subscribe to GameFinished events
   - Compute win rates, latency metrics
   - Store in derived tables

2. Begin EPIC 16: Experiment Management
   - Subscribe to ExperimentStarted, RunStarted
   - Track experiment metadata
   - Store results

3. Begin EPIC 17: Analytics Engine
   - Subscribe to GameFinished, MovePlayed
   - Generate insights
   - Query metrics

### Medium Term (Weeks 4-8)
1. EPICS 18-23: Intelligence Systems
   - Opening intelligence
   - Endgame intelligence
   - Position intelligence
   - LLM analysis
   - Statistical analysis

### Long Term (Weeks 8+)
1. EPICS 24-30: Extensions & Polish
2. Complete research laboratory

---

## Files Summary

### Core Phase 2 (Unchanged)
```
packages/zeroad-adapter/src/research-store/
  ├── events.ts (400 lines)
  ├── event-bus.ts (300 lines)
  ├── data-access.ts (600 lines)
  ├── arena-integration.ts (350 lines)
  ├── validation.ts (600 lines)
  ├── index.ts
  └── schema.sql (900 lines)
```

### Integration Files (New/Modified)
```
packages/zeroad-adapter/src/
  └── research-store-wrapper.ts (280 lines) — NEW

packages/cli/src/
  ├── chess-startup.ts (modified, +20 lines)
  └── arena-loop.ts (200 lines) — NEW
```

### Documentation
```
EPIC-14-EXECUTIVE-SUMMARY.md
EPIC-14-ARENA-INTEGRATION-FINDINGS.md
EPIC-14-PHASE-2-INTEGRATION-TASKS.md (this file)
EPIC-14-PHASE-2-INTEGRATION-COMPLETE.md (to be created)
```

---

## Success Definition

**Phase 2 Integration is successful when:**

✅ All tasks completed  
✅ Quick validation passes (5 games)  
✅ Full validation passes (100+ games)  
✅ All 14 automated tests pass  
✅ Database integrity verified  
✅ Performance > 10 games/hour  
✅ Zero manual database fixes needed  
✅ Documentation complete  

**Phase 2 Integration enables:**

✅ EPICS 15-30 can begin immediately  
✅ Each EPIC plugs in via event subscription  
✅ Zero Arena modification after integration  
✅ Scalable research platform foundation  

---

**Status: READY FOR TASK 3**

First three tasks complete and committed.
Ready to update ChessStartup and create ArenaLoop.

