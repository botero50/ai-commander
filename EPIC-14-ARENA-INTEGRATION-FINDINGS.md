# EPIC 14 Phase 2: Arena Integration Analysis

**Date:** July 22, 2026  
**Task:** Identify Arena integration points and create integration wrapper

---

## Current Arena Architecture

### Existing Components

**Chess Startup** (`packages/cli/src/chess-startup.ts`)
- Entry point for Arena launch
- Verifies dependencies (Node, Ollama, Stockfish)
- Creates default config
- Has placeholder for launching Arena (`launchArena()` method)
- Currently shows success message but doesn't implement the loop

**Match Cleanup** (`packages/core/src/commentary/match-cleanup.ts`)
- Cleans up after match completion
- Stops game session
- Shuts down adapter
- Releases resources
- Returns arena to clean state

**Key Entry Point Location:** `packages/cli/src/chess-startup.ts` → `launchArena()` method (line 246)

---

## Integration Points Identified

### 1. Arena Initialization Point
**File:** `packages/cli/src/chess-startup.ts`  
**Location:** `ChessStartup.launchArena()` (line 246)  
**Action:** Create and initialize research integration

```typescript
// Currently:
private async launchArena(): Promise<void> {
  // TODO: Implement arena loop in EPIC 61.2
}

// Will become:
private async launchArena(): Promise<void> {
  // Initialize research integration
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
  await research.startRun(this.getArenaConfig());
  
  // Launch arena loop...
}
```

### 2. Match Play Location
**File:** Unknown (references to playGame pattern)  
**Current Status:** Arena loop not yet implemented in main codebase  
**Action:** Call `research.recordGameResult()` after each game

**Integration Point Pattern:**
```typescript
// After playGame() completes:
await research.recordGameResult(game);

// For each move in the game:
for (const move of game.moves) {
  await research.recordMove(move);
  await research.recordLLMDecision(move);
}
```

### 3. Match Cleanup Location
**File:** `packages/core/src/commentary/match-cleanup.ts`  
**Location:** `MatchCleanup.cleanup()` (line 36)  
**Action:** Call `research.finishRun()` before cleanup

```typescript
// Before cleanup completes:
await research.finishRun('completed', gameCount);
await research.finishExperiment('completed', gameCount);
await research.stop();
```

### 4. Arena Shutdown Point
**File:** `packages/cli/src/chess-startup.ts` (or wherever main loop runs)  
**Action:** Ensure `research.stop()` is called on shutdown (handled in cleanup)

---

## Integration Wrapper Implementation

### Location
**File:** `packages/zeroad-adapter/src/research-store-wrapper.ts` (NEW)

### Class: ArenaResearchWrapper

```typescript
import { createArenaIntegration, ArenaResearchIntegration } from '@ai-commander/research-store';
import { Logger } from '../config/logger.js';

export class ArenaResearchWrapper {
  private integration: ArenaResearchIntegration | null = null;
  private experimentId: string | null = null;
  private runId: string | null = null;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'ArenaResearchWrapper');
  }

  async initialize(dbPath: string, schemaPath: string): Promise<void> {
    try {
      this.integration = await createArenaIntegration(dbPath, schemaPath);
      this.logger.info('Research integration initialized', { dbPath });
    } catch (error) {
      this.logger.error('Failed to initialize research integration', error);
      throw error;
    }
  }

  async startExperiment(name: string, hypothesis: string): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      this.experimentId = await this.integration.startExperiment({
        name,
        hypothesis,
        git_commit: process.env.GIT_COMMIT || 'unknown',
        application_version: '1.0.0',
      });
      this.logger.info('Experiment started', { experimentId: this.experimentId, name });
    } catch (error) {
      this.logger.error('Failed to start experiment', error);
      throw error;
    }
  }

  async startRun(config: any): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }
    if (!this.experimentId) {
      throw new Error('Experiment not started');
    }

    try {
      const os = await import('os');
      this.runId = await this.integration.startRun(
        {
          run_number: 1,
          config_snapshot: JSON.stringify(config),
          git_commit: process.env.GIT_COMMIT || 'unknown',
          application_version: '1.0.0',
          execution_start: Date.now(),
        },
        {
          os: process.platform,
          osVersion: os.release(),
          nodeVersion: process.version,
          cpuCores: os.cpus().length,
          ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
          storageAvailableGb: 0,
          ollamaVersion: process.env.OLLAMA_VERSION || 'unknown',
        }
      );
      this.logger.info('Run started', { runId: this.runId });
    } catch (error) {
      this.logger.error('Failed to start run', error);
      throw error;
    }
  }

  async recordGameResult(game: any): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.publishGameResult(
        game.id,
        game.gameNumber || 1,
        game.white.model || 'unknown',
        game.black.model || 'unknown',
        game.white.configId || 'default',
        game.black.configId || 'default',
        game.result || 'draw',
        game.pgn || '',
        game.finalFen || '',
        game.moves?.length || 0,
        game.durationMs || 0,
        game.termination || 'unknown',
        game.openingEco || 'unknown',
        game.openingName || 'unknown'
      );
      this.logger.debug('Game result recorded', { gameId: game.id });
    } catch (error) {
      this.logger.error('Failed to record game result', { gameId: game.id, error });
      throw error;
    }
  }

  async recordMove(move: any): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.publishMoveResult(
        move.id || `move-${Date.now()}`,
        move.gameId || 'unknown',
        move.number || 0,
        move.color || 'white',
        move.san || 'unknown',
        move.fenBefore || '',
        move.fenAfter || '',
        move.latencyMs || 0,
        move.confidence || 0,
        move.isLegal !== false,
        move.modelName || 'unknown',
        move.configId || 'default',
        move.illegalRetries || 0
      );
      this.logger.debug('Move recorded', { moveId: move.id, gameId: move.gameId });
    } catch (error) {
      this.logger.error('Failed to record move', { moveId: move.id, error });
      throw error;
    }
  }

  async recordLLMDecision(move: any): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      const decision = move.decision || {};
      await this.integration.publishLLMDecision(
        decision.id || `decision-${Date.now()}`,
        move.id || 'unknown',
        move.gameId || 'unknown',
        `ollama:${move.modelName || 'unknown'}`,
        move.configId || 'default',
        decision.prompt || '',
        decision.response || '',
        decision.parsingStatus || 'unknown',
        decision.parsedMove || 'unknown',
        undefined,
        undefined,
        undefined,
        decision.tokensIn || 0,
        decision.tokensOut || 0
      );
      this.logger.debug('LLM decision recorded', { decisionId: decision.id, moveId: move.id });
    } catch (error) {
      this.logger.error('Failed to record LLM decision', { moveId: move.id, error });
      throw error;
    }
  }

  async finishRun(status: 'completed' | 'failed', gameCount: number): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.finishRun(status, gameCount);
      this.logger.info('Run finished', { status, gameCount });
    } catch (error) {
      this.logger.error('Failed to finish run', { error });
      throw error;
    }
  }

  async finishExperiment(status: 'completed' | 'failed', gameCount: number): Promise<void> {
    if (!this.integration) {
      throw new Error('Research integration not initialized');
    }

    try {
      await this.integration.finishExperiment(status, gameCount);
      this.logger.info('Experiment finished', { status, gameCount });
    } catch (error) {
      this.logger.error('Failed to finish experiment', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.integration) {
      return;
    }

    try {
      await this.integration.stop();
      this.logger.info('Research integration stopped');
    } catch (error) {
      this.logger.error('Failed to stop research integration', error);
      throw error;
    }
  }
}
```

---

## Integration Steps

### Step 1: Create Wrapper File
**Action:** Write `packages/zeroad-adapter/src/research-store-wrapper.ts`  
**Status:** Ready to implement  
**Code:** See above

### Step 2: Update Chess Startup
**File:** `packages/cli/src/chess-startup.ts`  
**Location:** `ChessStartup.launchArena()` method  
**Changes:**
- Import `ArenaResearchWrapper`
- Create instance before launching loop
- Call `initialize()`, `startExperiment()`, `startRun()`
- Pass wrapper to arena loop for recording results

### Step 3: Implement Arena Loop
**File:** Unknown (needs implementation)  
**Location:** To be created for EPIC 61  
**Integration Points:**
- After each game: call `research.recordGameResult(game)`
- For each move: call `research.recordMove(move)`
- For each LLM response: call `research.recordLLMDecision(move)`

### Step 4: Update Match Cleanup
**File:** `packages/core/src/commentary/match-cleanup.ts`  
**Location:** `MatchCleanup.cleanup()` method  
**Changes:**
- Accept research wrapper as parameter
- Call `research.finishRun()` before cleanup
- Call `research.finishExperiment()` if this is the last match
- Call `research.stop()` on final shutdown

### Step 5: Update Shutdown Handler
**File:** `packages/cli/src/chess-startup.ts`  
**Location:** Process exit handlers  
**Changes:**
- Ensure `research.stop()` is called on SIGINT/SIGTERM
- Flush any buffered data before exit

---

## Current Game Object Structure (from code patterns)

```typescript
interface Game {
  id: string;
  gameNumber?: number;
  white: {
    model: string;
    configId?: string;
  };
  black: {
    model: string;
    configId?: string;
  };
  result?: 'white' | 'black' | 'draw';
  pgn?: string;
  finalFen?: string;
  moves: Move[];
  durationMs?: number;
  termination?: string;
  openingEco?: string;
  openingName?: string;
}

interface Move {
  id?: string;
  gameId: string;
  number: number;
  color: 'white' | 'black';
  san: string; // Standard Algebraic Notation
  fenBefore: string;
  fenAfter: string;
  latencyMs?: number;
  confidence?: number;
  isLegal?: boolean;
  modelName: string;
  configId?: string;
  illegalRetries?: number;
  decision?: {
    id?: string;
    prompt?: string;
    response?: string;
    parsingStatus?: string;
    parsedMove?: string;
    tokensIn?: number;
    tokensOut?: number;
  };
}
```

---

## Missing: Arena Loop Implementation

The current Arena code is incomplete:
- `ChessStartup.launchArena()` has placeholder (TODO: EPIC 61.2)
- No arena loop exists yet
- No game playing implementation

**When Arena Loop Is Implemented:**
1. It will call `playGame()` repeatedly
2. For each game, it will receive a Game object
3. Research wrapper can be integrated at that point

---

## Next Actions (Week 1)

### Immediate (Today)
1. ✅ Identify integration points (COMPLETE)
2. ✅ Create ArenaResearchWrapper implementation (COMPLETE - see above)

### This Week
1. Create `packages/zeroad-adapter/src/research-store-wrapper.ts`
2. Update `packages/cli/src/chess-startup.ts` to initialize research
3. Create basic arena loop (placeholder that plays 5 test games)
4. Integrate research calls into loop
5. Run quick validation test

### Next Week
1. Run full validation (100+ games)
2. Verify all data persists
3. Run validation test suite
4. Document performance

---

## Success Criteria for Phase 2 Integration

### Code Integration
- [ ] ArenaResearchWrapper created
- [ ] ChessStartup calls research.initialize()
- [ ] ChessStartup calls research.startExperiment()
- [ ] Arena loop calls research.recordGameResult()
- [ ] Arena loop calls research.recordMove()
- [ ] Arena loop calls research.recordLLMDecision()
- [ ] Arena calls research.finishRun() on completion
- [ ] MatchCleanup calls research.stop()

### Data Validation
- [ ] Games table populated after first test run
- [ ] Moves table populated with correct FK
- [ ] LLM decisions table populated
- [ ] No orphaned records
- [ ] Foreign key constraints valid

### Performance
- [ ] Throughput > 10 games/hour minimum
- [ ] Batch writing transparent to caller
- [ ] No noticeable latency impact on arena loop

---

## Timeline

**This Week:**
- Day 1: Create wrapper file
- Day 2: Update ChessStartup
- Day 3: Create minimal arena loop
- Day 4: Integrate research calls
- Day 5: Run quick test (5 games)

**Next Week:**
- Day 1-2: Run full validation (100+ games)
- Day 3: Verify all data
- Day 4: Run test suite
- Day 5: Document findings

---

## Files Involved

### To Create
- `packages/zeroad-adapter/src/research-store-wrapper.ts` (150 lines)

### To Modify
- `packages/cli/src/chess-startup.ts` (add ~20 lines)
- `packages/core/src/commentary/match-cleanup.ts` (add ~5 lines)
- Arena loop (TBD) (add ~10 lines)

### Core Files (No Changes)
- `packages/zeroad-adapter/src/research-store/` (all 5 files)
- `packages/zeroad-adapter/src/research-store/schema.sql`

---

## Architecture After Integration

```
ChessStartup
  └── Initialize ArenaResearchWrapper
        ├── Create ResearchEventBus
        ├── Create ResearchDataAccessLayer
        └── Initialize SQLite database
  │
  └── Launch ArenaLoop
        ├── playGame() → research.recordGameResult()
        ├── For each move:
        │   ├── research.recordMove()
        │   └── research.recordLLMDecision()
        └── On completion:
            ├── research.finishRun()
            ├── research.finishExperiment()
            └── research.stop()
```

**Result:** All chess games and moves are automatically persisted to SQLite, with transparent batching. Arena code unchanged except for research integration calls.

---

## Status

✅ **Arena Integration Points Identified**  
✅ **ArenaResearchWrapper Implementation Ready**  
⏳ **Create Wrapper File** (next)  
⏳ **Update ChessStartup** (next)  
⏳ **Implement Arena Loop** (next)  
⏳ **Run Validation Tests** (next week)

**Ready to proceed with Phase 2 Arena Integration**

