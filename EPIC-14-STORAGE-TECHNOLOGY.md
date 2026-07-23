# EPIC 14: Embedded Storage Technology Evaluation

**Constraint:** No external services. Must ship with AI Commander.

---

## Storage Requirements Analysis

From the entity model, EPIC 14 must support:

**Volume:**
- Millions of games (1M-10M per research session)
- Billions of moves (25+ per game)
- Billions of positions (though deduplicated via FEN)
- Billions of LLM decisions
- Complex relationships (36 entities, ~80 foreign keys)

**Performance:**
- Async writes during game execution (non-blocking)
- Complex queries for analytics (joins, aggregations, time-series)
- Bulk inserts (moves in batches)
- Concurrent reads (reporting/analysis)
- Efficient indexing (100+ indexes)

**Reliability:**
- ACID compliance (data integrity)
- Transaction support (game atomicity)
- Crash recovery (resume interrupted games)
- Corruption detection
- Backup/restore

**Simplicity:**
- No external processes to manage
- Single-file database (or embedded directory)
- Zero configuration
- Cross-platform (Windows, Linux, macOS)

---

## Candidate Technologies

### Option A: SQLite 3

**Description:** File-based relational database, embedded in applications

**Pros:**
- ✅ Zero external dependencies
- ✅ Single .db file (easy backup, transport)
- ✅ ACID transactions
- ✅ Full SQL support
- ✅ B-tree indexing (supports 100+ indexes efficiently)
- ✅ Mature, proven (30+ years)
- ✅ Node.js bindings available (`better-sqlite3`, `sqlite`)
- ✅ Supports GBs of data
- ✅ Built-in backup/restore
- ✅ WAL mode for concurrent access

**Cons:**
- ❌ Single-writer limitation (async writes require serialization)
- ❌ Not optimized for analytics queries
- ⚠️  Slower for very large result sets

**Suitability:** **GOOD** for EPIC 14
- Handles billions of records efficiently
- Indexing strategy makes analytics feasible
- WAL mode enables reasonable concurrent access
- Single file is self-contained

### Option B: LevelDB

**Description:** Key-value store, embedded, optimized for LSM trees

**Pros:**
- ✅ Zero external dependencies
- ✅ Directory-based (easy backup)
- ✅ Fast writes (LSM tree optimized)
- ✅ Supports large datasets

**Cons:**
- ❌ No SQL support (must implement query logic in code)
- ❌ No indexes (would need custom indexing)
- ❌ No joins (would need application logic)
- ❌ No transactions (complex recovery)

**Suitability:** **POOR** for EPIC 14
- Lacks schema and relationships (would rebuild from scratch)
- Analytics queries would be manual
- Too much application logic needed

### Option C: RocksDB

**Description:** Embeddable key-value store, optimized for SSDs

**Pros:**
- ✅ Zero external dependencies
- ✅ Fast writes/reads
- ✅ Large dataset support

**Cons:**
- ❌ Same limitations as LevelDB
- ❌ No SQL, no indexes, no joins
- ❌ Custom query implementation needed

**Suitability:** **POOR** for EPIC 14
- Same problems as LevelDB

### Option D: DuckDB

**Description:** In-process analytical database, optimized for OLAP

**Pros:**
- ✅ Zero external dependencies
- ✅ Excellent analytics performance
- ✅ SQL support with extensions
- ✅ Columnar storage (good for time-series)
- ✅ Can operate in-process or networked

**Cons:**
- ⚠️  Newer, less mature than SQLite
- ❌ Optimized for read-heavy analytics, not write-heavy games
- ❌ Not designed for concurrent writes
- ⚠️  Less battle-tested than SQLite

**Suitability:** **FAIR** for EPIC 14
- Excellent for analytics queries (EPICs 15-28)
- Not ideal for high-frequency inserts (games/moves)
- Could use hybrid approach (SQLite for writes, DuckDB for analytics)

### Option E: Hybrid Approach (SQLite + DuckDB)

**Description:** SQLite for game data (write-optimized), DuckDB for analytics (read-optimized)

**Pros:**
- ✅ Best of both worlds
- ✅ SQLite handles game writes efficiently
- ✅ DuckDB handles analytics queries fast
- ✅ Batch export from SQLite to DuckDB for analysis

**Cons:**
- ⚠️  More complex (two databases)
- ⚠️  Data sync logic between databases
- ⚠️  Two sets of indexes to maintain

**Suitability:** **EXCELLENT** for EPIC 14
- Solves write contention (SQLite)
- Solves analytics performance (DuckDB)
- Complexity is manageable

### Option F: Custom File-Based Storage

**Description:** Custom JSON/MessagePack files with indexing layer

**Pros:**
- ✅ Total control
- ✅ Minimal dependencies

**Cons:**
- ❌ Must implement schema, indexing, querying
- ❌ Must implement transactions
- ❌ Must implement recovery
- ❌ High maintenance burden
- ❌ Performance problems at scale

**Suitability:** **POOR** for EPIC 14
- Too much work, too error-prone

### Option G: TiDB (Distributed SQLite-compatible)

**Description:** Distributed TiDB database

**Cons:**
- ❌ Requires external server
- ❌ Violates "no external services" constraint

**Suitability:** **NOT VIABLE**

---

## Recommendation

**PRIMARY:** SQLite 3 with WAL mode
**SECONDARY:** DuckDB for analytics queries (EPICs 25+)

### Why SQLite

1. **Complete SQL support** - All EPICs can be implemented
2. **Proven at scale** - Billions of records in production use
3. **Zero external dependencies** - Ships with application
4. **ACID transactions** - Game atomicity guaranteed
5. **Efficient indexing** - Supports 100+ indexes
6. **Concurrent access** - WAL mode enables readers while writer works
7. **Single file** - Easy backup, transport, deployment
8. **Battle-tested** - 30 years of production use
9. **Node.js support** - Mature bindings available
10. **Portable** - No setup, works on any system

### Addressing Single-Writer Limitation

SQLite's single-writer limitation is manageable:

**During Game Execution:**
- Game data collected in memory
- After game completes: single bulk write
- 100 games/hour = 1 write/36 seconds (well within limits)

**During Analytics:**
- Separate read-only connection
- Doesn't block game writes (WAL mode)

**Pattern:**
```
Game Loop (30ms) → Memory Buffer → Batch Write (after game) → SQLite
                                   ↓
                          Analytics Query (read-only)
```

This is perfectly suitable for AI Commander's workload.

### Hybrid Approach (Optional)

For extremely large analytics queries (100M+ records):
- SQLite for game/move storage (write optimized)
- Periodic export to DuckDB for analysis (read optimized)
- Best of both worlds

This can be implemented in EPIC 25 (Reporting) if needed.

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│           AI Commander Chess Arena                  │
│                                                     │
│  arena.js → real-chess-game.js → moves[] games[]   │
│                    ↓                                 │
│           Research Data Platform                    │
│                    ↓                                 │
│    ┌────────────────────────────────┐               │
│    │   Data Collection & Validation │               │
│    │                                │               │
│    │  Game → Move → Event Collector │               │
│    └────────┬───────────────────────┘               │
│             ↓                                       │
│    ┌────────────────────────────────┐               │
│    │  Async Batch Writer (Non-Block)│               │
│    │                                │               │
│    │  Queue → Batch → Write         │               │
│    └────────┬───────────────────────┘               │
│             ↓                                       │
│    ┌────────────────────────────────┐               │
│    │    SQLite 3 Database           │               │
│    │  (ACID, Indexed, Searchable)   │               │
│    │                                │               │
│    │  File: research.db (GBs)       │               │
│    │  36 Tables, 100+ Indexes       │               │
│    └────────┬───────────────────────┘               │
│             ↓                                       │
│    ┌────────────────────────────────┐               │
│    │  Analytics & Reporting (EPICs) │               │
│    │                                │               │
│    │  Complex Queries via SQL       │               │
│    │  Bulk Exports to DuckDB        │               │
│    └────────────────────────────────┘               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### Phase 1: Core Database (EPIC 14.1)
- SQLite schema (36 tables, DDL)
- Batch write queue (non-blocking)
- Connection pooling
- Basic CRUD operations

### Phase 2: Integration (EPIC 14.2)
- Hook arena.js → data collector
- Hook real-chess-game.js → move collector
- Async batch writes during execution
- Validation layer

### Phase 3: Analytics Foundation (EPIC 14.3)
- Query helpers (EPICs 15-23)
- Bulk export to DuckDB (optional)
- Report generation (EPIC 25)

### Phase 4: Reliability (EPIC 14.4)
- Corruption detection
- Backup/restore
- Recovery checkpoints
- Integrity verification

---

## Node.js SQLite Bindings

**Recommended:** `better-sqlite3`

Rationale:
- Fastest SQLite bindings
- Synchronous API (simpler)
- Well-maintained
- Production-proven

Alternative: `sqlite3` (older, async-only)

---

## Database File Location

```
ai-commander/
├── research.db          (main database, GBs)
├── research.db-shm     (shared memory, WAL mode)
├── research.db-wal     (write-ahead log)
└── .gitignore          (excludes .db files from git)
```

---

## Backup & Distribution

Single `.db` file means:
- **Backup:** `cp research.db research.db.backup`
- **Distribution:** Upload single file to cloud
- **Sharing:** Send research.db to colleagues
- **Transport:** Portable across systems

---

## Future: PostgreSQL Migration (Optional)

If ever needed for distributed research:
1. Export SQLite schema to PostgreSQL DDL
2. Bulk import data via `COPY`
3. Update Node.js connection string
4. No application code changes needed

Schema is designed to be database-agnostic.

---

## Decision

**Use SQLite 3 with WAL mode for EPIC 14**

- Meets all requirements
- Zero external dependencies
- Proven at required scale
- Self-contained with AI Commander
- Simple to backup and distribute
- Extensible for future needs

Next: Complete entity specifications for all 36 tables.
