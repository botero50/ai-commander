# EPIC 14 Phase 2: Intent & Philosophy

**Date:** July 22, 2026  
**Focus:** Reframing implementation to prioritize research capability over storage details

---

## The Insight

The value of AI Commander is not in the database layer.

The value is in **research capabilities**.

EPIC 14 Phase 2 is not primarily about implementing a Repository or API layer.

**EPIC 14 Phase 2 is about building the Research Data Access Layer—the architectural foundation that enables all future research capabilities without requiring the Arena to know anything about storage.**

---

## The Problem with Traditional Approaches

### Traditional API Layer
```typescript
// Every runtime component knows about persistence
arena.recordGame(game)
statistics.recordStats(stats)
benchmarker.recordBenchmark(results)
dashboard.recordMetrics(metrics)

// Problems:
// - Arena is tightly coupled to database
// - Multiple systems independently writing
// - Impossible to add new research systems without modifying Arena
// - No clear separation of concerns
// - Data consistency becomes complex
```

### Research Data Access Layer (New Approach)
```typescript
// Arena only publishes events
eventBus.publish(new GameFinished(gameData))

// Everything else subscribes and handles independently
ResearchDataAccessLayer.subscribe() // → persists to database
Statistics.subscribe() // → computes metrics
Analytics.subscribe() // → generates insights
FutureSystem.subscribe() // → does something new

// Benefits:
// - Arena knows nothing about storage
// - New systems plug in without modifying Arena
// - Clean separation of concerns
// - Immutable research artifacts
// - Clear data flow
```

---

## Why Event-Driven Architecture Matters

### For AI Commander
Event-driven architecture is not complexity. It's **decoupling**.

```
Without Events (Tightly Coupled)
┌──────────────────────────────┐
│         Arena                 │
│  ├─ knows about database      │
│  ├─ knows about statistics    │
│  ├─ knows about analytics     │
│  └─ calls them directly       │
└──────────────────────────────┘
  ↓                    ↓
Database        Statistics
  ↓                    ↓
Analytics        Future Plugin

Problem: Modifying any system requires touching Arena


With Events (Loosely Coupled)
┌──────────────────┐
│      Arena       │ (publishes events)
└────────┬─────────┘
         ↓
┌──────────────────────────────┐
│    ResearchEventBus          │
│  (in-process event publisher)│
└┬──────────────────────────┬──┬──┬───────┐
 ↓        ↓         ↓       ↓ ↓ ↓ ↓
Data   Stats   Analytics  Future
Base              Plugins

Benefit: Add new systems without touching Arena
```

### For EPICS 15+

Once Phase 2 is complete, adding any new research capability becomes trivial:

```typescript
// EPIC 15: Research Metrics
class MetricsCollector {
  constructor(eventBus: ResearchEventBus) {
    eventBus.subscribe('GameFinished', (event) => {
      // Compute metrics
    })
  }
}

// EPIC 17: Analytics Engine
class AnalyticsEngine {
  constructor(eventBus: ResearchEventBus) {
    eventBus.subscribe('GameFinished', (event) => {
      // Generate insights
    })
  }
}

// EPIC 30: Future Research System
class CustomResearchPlugin {
  constructor(eventBus: ResearchEventBus) {
    eventBus.subscribe('MovePlayed', (event) => {
      // Do something new
    })
  }
}

// All plug in without modifying Arena or Data Access Layer
```

---

## The Research Data Access Layer

### Responsibility
Hides storage implementation completely.

The rest of AI Commander should think in terms of research concepts, not SQL or databases.

### Operations
Expressed as research actions, not technical operations:

```typescript
// Research concepts (not "insert into table")
await dataAccess.createExperiment(hypothesis)
await dataAccess.startRun(config, environment)
await dataAccess.recordGame(gameData)
await dataAccess.recordMove(moveData)
await dataAccess.recordPosition(fen)
await dataAccess.rebuildDerivedAnalytics()
await dataAccess.verifyIntegrity()

// Not: INSERT, SELECT, UPDATE, DELETE
// Not: db.prepare(), db.run(), db.all()
```

### Implementation Detail
Internally uses SQLite, but that's hidden.

Could be replaced with PostgreSQL, DuckDB, or anything else without affecting callers.

```typescript
// Internal: uses SQLite
class ResearchDataAccessLayer {
  private db: ResearchDatabase // ← SQLite
  
  async recordGame(gameData) {
    // Translate research concept into SQL
    // Hide the implementation
  }
}

// Caller doesn't care what's inside
await dataAccess.recordGame(gameData)
```

---

## The Research Event Bus

### Responsibility
Decouple runtime from persistence.

When Arena finishes a game, it publishes an event.
The Data Access Layer listens and persists.

### Transparency
Callers never think about events.

```typescript
// Publisher doesn't care who's listening
eventBus.publish(new GameFinished(gameData))

// Subscriber receives and persists
dataAccess.onGameFinished(event) {
  // Write to database
}
```

### Extensibility
New systems subscribe without modifying existing ones.

```typescript
// EPIC 15: Metrics
metrics.onGameFinished(event) { /* compute metrics */ }

// EPIC 17: Analytics
analytics.onGameFinished(event) { /* generate insights */ }

// EPIC 30: Future System
future.onGameFinished(event) { /* do something new */ }

// All can exist simultaneously
// Arena publishes once
// All subscribers notified
```

---

## Batch Writing (Internal Optimization)

### From Caller Perspective
Publish events. That's it.

```typescript
// Caller publishes individual events
for (const move of game.moves) {
  eventBus.publish(new MovePlayed(move))
}

// Doesn't think about batching
// Doesn't manage transactions
// Doesn't optimize writes
```

### From Data Access Layer Perspective
Batch internally, transparently.

```typescript
class ResearchDataAccessLayer {
  private moveBuffer = []
  
  onMovePlayed(event) {
    this.moveBuffer.push(event)
    
    // Flush when full or timeout
    if (this.moveBuffer.length >= BATCH_SIZE) {
      this.flush()
    }
  }
  
  private flush() {
    // Single transaction for entire batch
    // Caller never knows
  }
}
```

**Key insight:** Batching is an optimization detail. Callers should never think about it.

---

## Immutable Research Artifacts

### Philosophy
Every research record is immutable.

Operations create or reference records. Never mutate.

```typescript
// Record creation (immutable)
await dataAccess.recordGame(gameData)        // ← creates Game
await dataAccess.recordMove(moveData)        // ← creates Move
await dataAccess.recordDecision(decisionData) // ← creates LLMDecision

// Never update
// Never delete (except for reproduction during development)
// Records are permanent once created
```

### Why
Research reproducibility depends on immutability.

If records can be modified, historical research becomes unreliable.

If records are permanent, future researchers can always trace back to original data.

---

## Research Hierarchy in API

### Before Phase 2
No clear hierarchy. Just methods.

```typescript
db.insertGame(game)
db.insertMove(move)
db.insertStatistics(stats)
// No organization
```

### After Phase 2
Clear research hierarchy reflected in API.

```typescript
// Research project → Experiment → Run → Game → Move → Decision → Position

await dataAccess.createProject(name)
await dataAccess.createExperiment(projectId, hypothesis)
await dataAccess.startRun(experimentId, config)
await dataAccess.recordGame(runId, gameData)
await dataAccess.recordMove(gameId, moveData)
await dataAccess.recordDecision(moveId, decisionData)
await dataAccess.recordPosition(fen)

// Hierarchy is clear in the API
// New researchers immediately understand the structure
```

---

## How This Enables EPICS 15+

Once Phase 2 is complete, every future EPIC becomes a **subscriber to the event bus**.

```
EPIC 15: Research Metrics
↓
research.subscribe('GameFinished', computeMetrics)

EPIC 16: Experiment Management
↓
research.subscribe('ExperimentStarted', trackExperiment)

EPIC 17: Analytics Engine
↓
research.subscribe('GameFinished', analyzeGame)

EPIC 18-23: Intelligence Systems
↓
research.subscribe('MovePlayed', analyzeMove)
research.subscribe('PositionRecorded', analyzePosition)

EPIC 24: Reporting
↓
research.subscribe('ExperimentFinished', generateReport)

EPIC 27: Automation
↓
research.subscribe('ExperimentFinished', triggerNextExperiment)

EPIC 29: Multi-Provider AI
↓
research.subscribe('DecisionGenerated', compareProviders)
```

**Every EPIC plugs in without modifying Arena or Phase 2.**

That's the power of this architecture.

---

## Success Looks Like

### Before Phase 2
```typescript
// Arena has to know about storage
game = await playGame()
await db.insertGame(game)
await statistics.update(game)
// Multiple integration points
// Tightly coupled
// Hard to add new systems
```

### After Phase 2
```typescript
// Arena only publishes events
game = await playGame()
eventBus.publish(new GameFinished(game))

// Everything else subscribes
// No coupling
// Easy to add new systems
// Clean architecture
```

---

## The Big Picture

EPIC 14 Phase 2 is not just a technical implementation.

It's the **architectural foundation** that allows AI Commander to evolve from a chess arena into a comprehensive research platform.

Once this foundation is solid:
- EPICS 15+ become implementations, not architectural decisions
- New research capabilities plug in without breaking existing code
- Future systems are decoupled and maintainable
- The platform can grow for years without redesign

This is what "designed for years of research without architectural redesign" means.

---

## Next Step

Implement EPIC 14 Phase 2 following these principles:

1. **ResearchEventBus** — In-process pub/sub (simple, proven pattern)
2. **ResearchDataAccessLayer** — Research-centric abstraction
3. **Research Events** — Types representing research actions
4. **Arena Integration** — Arena publishes events via event bus
5. **Validation** — 100+ games with complete provenance

**Timeline:** 2-3 weeks

**Outcome:** Foundation for all research capabilities in EPICS 15-30.

