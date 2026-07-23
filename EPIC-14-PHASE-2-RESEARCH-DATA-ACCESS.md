# EPIC 14 Phase 2: Research Data Access Layer

**Date:** July 22, 2026  
**Objective:** Build the long-term integration point for all research capabilities

---

## Core Insight

The value of AI Commander is in **research capabilities**, not storage implementation details.

Phase 2 is not about building a Repository/API layer.

Phase 2 is about building a **Research Data Access Layer** that:
- Expresses operations in terms of research concepts, not SQL
- Keeps the Arena independent of storage
- Makes research data collection as natural as making a chess move
- Becomes the foundation for all future research systems (EPICS 15+)

---

## Design Principles

### 1. Abstraction from Implementation
The rest of AI Commander should never know how data is physically stored.
- No SQL in runtime code
- No database knowledge in Arena
- Storage implementation can change without affecting runtime

### 2. Research Hierarchy First
API operations reflect the research hierarchy:
```
Research Project
    → Experiment
        → Run
            → Game
                → Move
                    → LLM Decision
                    → Position
```

Operations are expressed in terms of this hierarchy.

### 3. Event-Driven Architecture
The runtime publishes research events.
The Research Data Access Layer persists them.
Everything else subscribes.

```
Arena (generates events)
    ↓
ResearchEventBus (in-process event publisher)
    ↓
ResearchDataAccessLayer (persists to storage)
Research Metrics
Analytics
Future Plugins
```

Benefits:
- Arena stays independent of persistence
- Adding analytics doesn't require Arena changes
- Future plugins work without modifying core
- Clean separation of concerns

### 4. Transparent Batching
The API is simple: callers publish events.
Persistence batching happens internally, transparently.

```typescript
// Caller doesn't think about batching
eventBus.publish(new MovePlayed(moveData))
eventBus.publish(new MovePlayed(moveData))
eventBus.publish(new MovePlayed(moveData))

// Research Data Access Layer batches these internally
// Maybe flushes every 100 moves or every 5 seconds
// Caller doesn't care - it's transparent
```

### 5. Immutable Research Artifacts
Every public API operation creates or references immutable records.

Operations:
- `createProject()` — Start a research project
- `createExperiment()` — Define research hypothesis
- `startRun()` — Begin execution
- `recordGame()` — Immutable game record
- `recordMove()` — Immutable move decision
- `recordDecision()` — Immutable LLM prompt/response
- `recordPosition()` — Deduplicated position

No mutations. Only creation and reference.

---

## Architecture

### Layer 1: Research Event Bus (In-Process)

```typescript
/**
 * ResearchEventBus: In-process event publisher
 *
 * The Arena and runtime components publish events here.
 * The Research Data Access Layer subscribes and persists.
 * Future systems subscribe for real-time analytics.
 */
class ResearchEventBus {
  // Publish research events
  publish(event: ResearchEvent): void
  
  // Subscribe to events
  subscribe(eventType: string, handler: (event: ResearchEvent) => void): void
  subscribe(eventType: 'GameStarted', handler: (event: GameStarted) => void): void
  subscribe(eventType: 'GameFinished', handler: (event: GameFinished) => void): void
  subscribe(eventType: 'MovePlayed', handler: (event: MovePlayed) => void): void
  // ... etc
}
```

### Layer 2: Research Data Access Layer

```typescript
/**
 * ResearchDataAccessLayer: Abstraction over storage
 *
 * - Expresses operations in research concepts
 * - Hides storage implementation (currently SQLite)
 * - Can change storage without affecting runtime
 * - Manages batch writes internally
 * - Subscribed to ResearchEventBus
 */
class ResearchDataAccessLayer {
  // Project and experiment lifecycle
  createProject(name: string): Promise<Project>
  createExperiment(projectId: string, hypothesis: string): Promise<Experiment>
  
  // Run management
  startRun(experimentId: string, config: RunConfig): Promise<Run>
  finishRun(runId: string, status: 'completed' | 'failed'): Promise<void>
  
  // Research records (immutable)
  recordGame(runId: string, gameData: GameData): Promise<Game>
  recordMove(gameId: string, moveData: MoveData): Promise<Move>
  recordDecision(moveId: string, decisionData: DecisionData): Promise<LLMDecision>
  recordPosition(fen: string): Promise<Position>
  
  // Configuration snapshots
  storeConfigSnapshot(experimentId: string, config: any): Promise<ConfigSnapshot>
  storeEnvironmentSnapshot(runId: string, env: EnvironmentData): Promise<EnvironmentSnapshot>
  
  // Analytics management
  rebuildDerivedAnalytics(): Promise<void>
  
  // Data integrity
  verifyIntegrity(): Promise<IntegrityReport>
}
```

### Layer 3: Research Events

```typescript
/**
 * Research events published by runtime
 * Subscribed by Research Data Access Layer
 * Available for future analytics systems
 */

// Experiment lifecycle
class ExperimentStarted {
  experimentId: string
  name: string
  hypothesis: string
  timestamp: number
}

class ExperimentFinished {
  experimentId: string
  status: 'completed' | 'failed'
  timestamp: number
}

// Run lifecycle
class RunStarted {
  runId: string
  experimentId: string
  configSnapshot: string
  environmentSnapshot: EnvironmentData
  timestamp: number
}

class RunFinished {
  runId: string
  status: 'completed' | 'failed'
  timestamp: number
}

// Game events
class GameStarted {
  gameId: string
  runId: string
  whiteModel: string
  blackModel: string
  timestamp: number
}

class GameFinished {
  gameId: string
  result: '1' | '0.5' | '0'
  pgn: string
  finalFen: string
  moveCount: number
  duration: number
  timestamp: number
}

// Move events
class MovePlayed {
  moveId: string
  gameId: string
  moveNumber: number
  color: 'white' | 'black'
  san: string
  fenBefore: string
  fenAfter: string
  latency: number
  confidence: number
  isLegal: boolean
  timestamp: number
}

// LLM decision events
class DecisionGenerated {
  decisionId: string
  moveId: string
  modelIdentifier: string
  prompt: string
  response: string
  promptVersion?: string
  promptHash?: string
  parsingStatus: 'success' | 'failed' | 'malformed'
  parsedMove?: string
  tokensIn?: number
  tokensOut?: number
  timestamp: number
}

// Position events
class PositionRecorded {
  fen: string
  whitepieces: number
  blackPieces: number
  isEndgame: boolean
  isCheck: boolean
  timestamp: number
}

// Runtime events
class ArenaStarted {
  timestamp: number
}

class ArenaFinished {
  status: 'success' | 'error' | 'interrupted'
  timestamp: number
}

class ArenaRecovered {
  errorType: string
  recovery: string
  timestamp: number
}

// And more as needed...
```

---

## How It Works

### Example: Recording a Game

**Current (without Data Access Layer):**
```typescript
// Arena code would need to know about SQL, transactions, etc.
// Complex, tightly coupled

const game = await playGame(white, black)
await db.insertGame(game)
for (const move of game.moves) {
  await db.insertMove(move)
  await db.insertLLMDecision(move.decision)
}
await statistics.update(game)
```

**With Research Data Access Layer:**
```typescript
// Arena only cares about playing chess
const game = await playGame(white, black)

// Publish the game as a research event
eventBus.publish(new GameFinished({
  gameId: game.id,
  result: game.result,
  pgn: game.pgn,
  // ... other data
}))

// That's it. Arena is done.
// Everything else subscribes and handles it:
// - Research Data Access Layer: persists to database
// - Statistics: updates metrics
// - Future Analytics: computes insights
// - Future Export: sends to dashboard
```

The Arena doesn't know about persistence. It just publishes events.

### Example: Batch Writing (Transparent)

```typescript
// Runtime publishes individual move events
for (let i = 0; i < 1000000; i++) {
  eventBus.publish(new MovePlayed(moveData))
}

// Research Data Access Layer batches internally:
class ResearchDataAccessLayer {
  private moveBuffer: MovePlayed[] = []
  private flushInterval = 5000 // ms
  private batchSize = 1000
  
  constructor(eventBus: ResearchEventBus) {
    eventBus.subscribe('MovePlayed', (event) => {
      this.moveBuffer.push(event)
      
      // Flush if buffer full or timeout
      if (this.moveBuffer.length >= this.batchSize) {
        this.flush()
      }
    })
    
    // Periodic flush
    setInterval(() => this.flush(), this.flushInterval)
  }
  
  private async flush() {
    if (this.moveBuffer.length === 0) return
    
    const batch = this.moveBuffer.splice(0)
    
    // Single transaction for all moves
    await this.db.transaction(async (db) => {
      for (const event of batch) {
        await db.recordMove(event)
      }
    })
  }
}
```

Callers don't think about batching. It's transparent.

---

## API Specification

### Project Management
```typescript
// Create a research project
async createProject(
  name: string,
  description?: string
): Promise<Project>

// Get project details
async getProject(projectId: string): Promise<Project>

// List all projects
async listProjects(): Promise<Project[]>
```

### Experiment Management
```typescript
// Create an experiment (research hypothesis)
async createExperiment(
  projectId: string,
  name: string,
  hypothesis: string,
  description?: string,
  target_games?: number,
  success_criteria?: string
): Promise<Experiment>

// Start a run of an experiment
async startRun(
  experimentId: string,
  configSnapshot: string,
  environmentSnapshot: EnvironmentData,
  randomSeed?: string
): Promise<Run>

// Finish a run
async finishRun(
  runId: string,
  status: 'completed' | 'failed'
): Promise<void>

// Get run details
async getRun(runId: string): Promise<Run>

// List all runs in an experiment
async listRuns(experimentId: string): Promise<Run[]>
```

### Research Records (Immutable)
```typescript
// Record a game result
async recordGame(
  runId: string,
  game: GameInput
): Promise<Game>

// Record a move
async recordMove(
  gameId: string,
  move: MoveInput
): Promise<Move>

// Record an LLM decision
async recordDecision(
  moveId: string,
  decision: DecisionInput
): Promise<LLMDecision>

// Record a position
async recordPosition(fen: string): Promise<Position>
```

### Configuration & Environment
```typescript
// Store configuration snapshot
async storeConfigSnapshot(
  experimentId: string,
  config: any
): Promise<ConfigSnapshot>

// Store environment snapshot
async storeEnvironmentSnapshot(
  runId: string,
  environment: EnvironmentData
): Promise<EnvironmentSnapshot>
```

### Analytics Management
```typescript
// Rebuild all derived analytics from immutable core
async rebuildDerivedAnalytics(): Promise<void>

// Get opening statistics
async getOpeningStats(filters?: OpeningFilter): Promise<OpeningStats[]>

// Get model performance
async getModelPerformance(modelId?: string): Promise<ModelPerformance[]>

// Get Elo progression
async getEloProgression(modelId: string): Promise<EloProgression[]>
```

### Data Integrity
```typescript
// Verify database integrity
async verifyIntegrity(): Promise<IntegrityReport>

// Repair corrupted records
async repair(): Promise<RepairReport>

// Get database statistics
async getStats(): Promise<DatabaseStats>
```

---

## Integration with Arena

### Before Phase 2

```typescript
// Arena code (in arena.js)
const game = await playGame(white, black)
await persistGameToFile(game) // JSON file
await updateStatistics(game)
```

**Problem:** Multiple systems independently reading/writing data. No integration. No long-term research capability.

### After Phase 2

```typescript
// Arena code (in arena.js)
const game = await playGame(white, black)

// Single integration point: publish event
eventBus.publish(new GameFinished({
  gameId: game.id,
  result: game.result,
  pgn: game.pgn,
  finalFen: game.finalFen,
  moveCount: game.moves.length,
  duration: game.duration,
  // ... other data
}))

// That's it. Everything else subscribes.
```

**Benefits:**
- Arena is decoupled from persistence
- Research data automatically collected
- Future systems can subscribe without modifying Arena
- Clean separation of concerns

---

## Phase 2 Implementation Tasks

### Task 1: ResearchEventBus (3-4 days)
- Event bus class (in-process)
- Event type definitions
- Publish/subscribe interface
- Event routing and filtering

### Task 2: ResearchDataAccessLayer (4-5 days)
- Hides SQLite implementation
- Implements research-centric API
- Batch writing (internal, transparent)
- Transaction management
- Error handling and recovery

### Task 3: Research Event Types (2-3 days)
- Game events (Started, Finished)
- Move events (Played)
- Decision events (Generated)
- Position events (Recorded)
- Arena events (Started, Finished, Recovered)
- Configuration events
- Experiment lifecycle events

### Task 4: Arena Integration (2-3 days)
- Hook arena.js to publish events
- Hook real-chess-game.js to publish move events
- Hook LLM decision capture to publish decision events
- Verify events match recorded data

### Task 5: Validation (2-3 days)
- Run 100+ games with event-driven recording
- Verify all data matches immutable records
- Verify batch writing is transparent
- Verify database integrity
- Verify no performance regression

**Total Phase 2: ~2-3 weeks**

---

## Success Criteria

- ✅ ResearchEventBus fully functional (pub/sub working)
- ✅ ResearchDataAccessLayer hides all SQLite implementation
- ✅ API operations in research concepts (not SQL)
- ✅ Event-driven architecture fully integrated
- ✅ Batch writing transparent to callers
- ✅ 100+ games recorded with complete provenance
- ✅ All recorded data matches actual gameplay
- ✅ Database integrity verified
- ✅ No performance regression in Arena throughput
- ✅ Arena code decoupled from persistence

---

## Architecture After Phase 2

```
┌─────────────────────────────────────────────┐
│          Arena Layer (Production)           │
│    (Publishes Research Events only)         │
└────────────────────┬────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│      ResearchEventBus (in-process)          │
│   (Event publisher, routes to subscribers)  │
└────────────────┬────────────────┬───────────┘
                 ↓                ↓
    ┌─────────────────────┐   ┌──────────────────┐
    │ Research Data       │   │ Future Analytics │
    │ Access Layer        │   │ & Plugins        │
    │                     │   │                  │
    │ • Persistence      │   │ • Statistics      │
    │ • Batch Writing    │   │ • Dashboards      │
    │ • Transactions     │   │ • Exports         │
    └──────┬──────────────┘   └──────────────────┘
           ↓
    ┌─────────────────────┐
    │   SQLite Database   │
    │                     │
    │ Research Data Store │
    └─────────────────────┘
```

---

## Why This Matters

### For EPIC 14 (Research Data Store)
- Clean integration point for all systems
- Arena stays independent of storage
- Future systems plug in easily

### For EPIC 15+ (Research Capabilities)
- Subscribe to events for metrics
- Subscribe to events for analytics
- Subscribe to events for dashboards
- No need to modify Arena or Data Access Layer

### For Future Development
- Plugin architecture enabled
- Real-time analysis possible
- Live dashboards enabled
- Export systems enabled
- All without modifying core Arena

### For Long-Term Vision
This architecture is the foundation that will allow AI Commander to evolve into a complete research platform without breaking changes.

---

**Status:** Phase 2 specification complete. Ready for implementation.

