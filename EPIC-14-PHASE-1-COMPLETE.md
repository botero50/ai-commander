# EPIC 14: Phase 1 - Core Database Schema - COMPLETE ✅

**Date:** July 22, 2026  
**Status:** Phase 1 Implementation Complete

---

## Summary

Phase 1 of EPIC 14 is complete. The core database schema for the Research Data Store has been designed, implemented, and validated. All immutable entities and derived analytics are defined in SQLite with strategic indexing.

---

## Deliverables

### 1. Complete SQLite Schema (`schema.sql`)

**File:** `packages/zeroad-adapter/src/research-store/schema.sql`

**Content:**
- 8 immutable core tables (complete DDL)
- 3 derived analytics tables
- 30+ strategic indexes
- 15+ foreign key relationships
- 3 view definitions (common query patterns)
- Comments and extensibility hooks

**Tables Defined:**

**Immutable Core:**
1. `experiments` — Research hypothesis and success criteria
2. `runs` — Execution instances
3. `environment_snapshots` — System context
4. `model_configs` — Immutable parameter sets
5. `games` — Game records with denormalized stats
6. `moves` — Individual move decisions
7. `llm_decisions` — Prompt/response pairs
8. `positions` — Deduplicated FEN strings

**Derived Analytics:**
9. `opening_stats` — Opening performance (regenerable)
10. `model_performance` — Model rankings (regenerable)
11. `elo_progression` — Strength evolution (regenerable)

**Views:**
- `v_games_with_context` — Games with experiment/run details
- `v_moves_with_context` — Moves with proper ordering
- `v_llm_decisions_summary` — LLM decisions with parsing status

---

### 2. Database Management Layer (`database.ts`)

**File:** `packages/zeroad-adapter/src/research-store/database.ts`

**Class:** `ResearchDatabase`

**Methods:**
- `initialize()` — Initialize database and load schema
- `close()` — Close connection
- `query()` — Execute SELECT and return all results
- `queryOne()` — Execute SELECT and return single result
- `execute()` — Execute INSERT/UPDATE/DELETE
- `transaction()` — Execute atomic operations
- `verify()` — Verify database integrity
- `stats()` — Get database statistics (counts, file size)
- `vacuum()` — Compress and optimize database
- `backup()` — Create backup file
- `restore()` — Restore from backup
- `clearDerivedAnalytics()` — Delete all derived tables
- `resetPositionCounts()` — Reset for recalculation

**Features:**
- WAL mode enabled (concurrent reads during writes)
- Foreign key constraints enabled
- ACID transactions for game atomicity
- Automatic schema initialization
- Health check via pragma integrity_check
- Database statistics tracking

---

### 3. Complete Type Definitions (`types.ts`)

**File:** `packages/zeroad-adapter/src/research-store/types.ts`

**Interfaces Defined:**

**Immutable Record Types:**
- `Experiment` — Research hypothesis
- `Run` — Execution instance
- `EnvironmentSnapshot` — System context
- `ModelConfig` — Parameter set
- `Game` — Game record
- `Move` — Move decision
- `LLMDecision` — Prompt/response
- `Position` — Board state

**Derived Analytics Types:**
- `OpeningStats` — Opening performance
- `ModelPerformance` — Model rankings
- `EloProgression` — Strength evolution

**View Types:**
- `GameWithContext` — Complete game details
- `MoveWithContext` — Complete move details
- `LLMDecisionSummary` — LLM decision summary

**Input Types:**
- `ExperimentInput` — Create experiment
- `RunInput` — Create run
- `GameInput` — Create game
- `MoveInput` — Create move
- `LLMDecisionInput` — Create LLM decision

---

## Schema Highlights

### Complete Provenance on Every Record

Every immutable record captures:
```
- experiment_id (which research?)
- git_commit, application_version (code version)
- model_identifier, model_digest (exact model)
- prompt_version, prompt_hash (exact prompt)
- environment_snapshot_id (OS, hardware, Ollama)
- random_seed, engine_version (parameters)
- execution_start, execution_end, created_at (timing)
```

### Immutable Configuration Philosophy

```typescript
// Configuration is NEVER updated
// If a parameter changes, create NEW record
model_configs {
  id: string (UUID)
  model_identifier: string
  temperature: number
  top_p: number
  // ... other parameters
  
  // Uniqueness prevents duplicates
  UNIQUE(model_identifier, temperature, top_p, ...)
}

// Games reference configs via FK
games {
  white_config_id FK -> model_configs(id)
  black_config_id FK -> model_configs(id)
}
```

### Strategic Indexing

30+ indexes on:
- Hierarchy lookups: (experiment_id, run_id, game_number)
- Performance analysis: (latency_ms, is_legal, confidence)
- Filtering: (white_model, result), (black_model, result)
- Time series: (created_at, execution_start)
- Deduplication: (model_identifier, prompt_hash, eco_code)

**Principle:** Index analytical query paths, not all columns.

### Scientific Reproducibility

Any game can be analyzed years later:

```sql
-- Fetch game with complete provenance
SELECT g.*, e.hypothesis, e.git_commit as code_version
FROM games g
JOIN experiments e ON g.experiment_id = e.id
WHERE g.id = ?

-- Fetch model configurations
SELECT * FROM model_configs WHERE id IN (g.white_config_id, g.black_config_id)

-- Fetch environment
SELECT * FROM environment_snapshots WHERE id = g.environment_snapshot_id

-- Fetch exact prompts and responses
SELECT prompt, response FROM llm_decisions
WHERE game_id = ?
ORDER BY move_number
```

All inputs preserved for understanding exactly how result was produced.

---

## Database Characteristics

### File-Based, Self-Contained
- Single `.db` file (portable)
- No external server required
- WAL mode with `-shm` and `-wal` files
- Embeds with AI Commander

### Concurrent Access
- WAL mode enables readers while writer works
- Single-writer (games batched)
- Timeout: 10 seconds for write contention

### Performance Characteristics
- Expected: 10,000-100,000 writes/second per table
- Batch writes: 1000+ games/insert for non-blocking
- Read-only queries: Concurrent with no blocking
- Transaction support: Game atomicity guaranteed

### Integrity Checks
```sql
-- Verify schema integrity
PRAGMA integrity_check

-- Check move count
SELECT g.id, g.move_count, COUNT(m.id) as actual_moves
FROM games g
LEFT JOIN moves m ON g.id = m.game_id
GROUP BY g.id
HAVING g.move_count != actual_moves

-- Check orphaned moves
SELECT m.id
FROM moves m
LEFT JOIN llm_decisions l ON m.id = l.move_id
WHERE l.id IS NULL
```

---

## Regeneration Guarantee

Every derived table is completely regenerable:

```typescript
// Rebuild opening_stats from immutable games table
SELECT opening_eco, COUNT(*) as occurrence_count,
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as white_wins,
       SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
       SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as black_wins
FROM games
GROUP BY opening_eco

// Rebuild model_performance
SELECT white_model as model_identifier,
       COUNT(*) as games_as_white,
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as wins_as_white
FROM games
WHERE white_model = ?
GROUP BY white_model
UNION
SELECT black_model, COUNT(*), SUM(CASE WHEN result='0' THEN 1 ELSE 0 END)
FROM games
WHERE black_model = ?
GROUP BY black_model

// Rebuild elo_progression
-- Iterate games chronologically, calculate rolling Elo
```

---

## Phase 1 Acceptance Criteria

✅ **All tables created**
- 8 immutable core tables fully specified
- 3 derived analytics tables fully specified
- All foreign key relationships defined
- All CHECK constraints specified

✅ **All indexes created**
- Hierarchy indexes (experiment_id, run_id, etc.)
- Analytical query indexes (model, result, latency)
- Time-series indexes (created_at, execution_start)
- Deduplication indexes (model_configs uniqueness)

✅ **Type safety**
- Complete TypeScript interfaces for all types
- Input types for recording operations
- View types for query results
- Full type coverage

✅ **Database management**
- Initialization with schema loading
- WAL mode with concurrent access
- Transaction support
- Backup/restore capability
- Database statistics
- Integrity verification

✅ **Regeneration capability**
- Derived tables deletable and rebuildable
- No information loss during regeneration
- clearDerivedAnalytics() method
- resetPositionCounts() method

---

## Next Steps: Phase 2

Phase 2 will implement the API layer that hides the storage implementation:

1. **Core API Methods:**
   - `recordExperiment()`
   - `recordRun()`
   - `recordGame()`
   - `recordMove()`
   - `recordDecision()`
   - `query()`

2. **Query Builders:**
   - Games by experiment
   - Moves by game
   - LLM decisions by move
   - Model performance
   - Opening statistics

3. **Batch Operations:**
   - Batch insert games
   - Batch insert moves
   - Transaction management

4. **Maintenance Operations:**
   - Regenerate derived analytics
   - Database statistics
   - Backup/restore

---

## Files Created in Phase 1

1. **schema.sql** (900 lines)
   - Complete SQLite DDL
   - 11 tables, 30+ indexes, 3 views
   - Integrity check queries
   - Extensibility hooks

2. **database.ts** (350 lines)
   - ResearchDatabase class
   - Low-level database operations
   - Transaction support
   - Maintenance operations

3. **types.ts** (500+ lines)
   - Complete TypeScript interfaces
   - Immutable record types
   - Derived analytics types
   - Input/output types

---

## Validation Checklist

- ✅ Schema syntax valid SQLite 3
- ✅ All foreign keys properly defined
- ✅ CHECK constraints on enums
- ✅ UNIQUE constraints on immutable configs
- ✅ Indexes on all query paths
- ✅ Views for common patterns
- ✅ Type definitions complete and accurate
- ✅ Database class fully functional
- ✅ WAL mode enabled
- ✅ Transaction support enabled
- ✅ Backup/restore capability
- ✅ Integrity verification methods
- ✅ Statistics collection

---

## Design Principles Implemented

✅ **Experiment-Centric Hierarchy**
- Research Project → Experiment → Run → Game → Move → LLM Decision → Position
- Every entity traces back to experiment

✅ **Complete Provenance**
- git_commit, application_version on every record
- model_identifier, model_digest captured
- prompt_version, prompt_hash captured
- environment_snapshot_id preserved
- execution_start, execution_end recorded
- All inputs for understanding how result was produced

✅ **Immutable Core**
- Never update, only insert
- Source of truth
- Can be archived and distributed

✅ **Regenerable Derived**
- All analytics rebuild from immutable core
- Zero information loss on regeneration
- Maintenance operation supported

✅ **Self-Contained**
- Embedded SQLite
- No external servers
- Single .db file
- WAL mode for concurrent access

✅ **Scientific Reproducibility**
- All inputs captured for understanding
- Can reproduce under equivalent conditions
- Accounts for LLM non-determinism
- Full context preserved

---

## Status Summary

**Phase 1: COMPLETE ✅**

Core database schema fully specified and implemented in SQLite 3.

All immutable entities defined with complete provenance.
All derived analytics defined with regeneration guarantees.
Type safety enforced via TypeScript interfaces.
Database management layer provides transaction support and maintenance operations.

**Ready for Phase 2:** API layer implementation.

---

**Next:** `EPIC-14-PHASE-2-PLAN.md` (coming with Phase 2 implementation)

