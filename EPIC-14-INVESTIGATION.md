# EPIC 14: Research Data Platform - Investigation & Design

**Phase 1: Runtime Data Source Analysis**

---

## 1. Current Data Sources (Existing Systems)

### 1.1 Arena (arena.js)
**Produces:**
- Match metadata
  - `matchNumber` - unique match identifier
  - `timestamp` - when match executed
  - `duration` (ms) - total execution time
  - `startTime`, `endTime` (calculated)
  
- Match result
  - `result` - 'white-win' | 'black-win' | 'draw'
  - `moveCount` - total moves played
  - `moves[]` - array of move strings (SAN)
  - `pgn` - full PGN
  - `fen` - final position

- Player configuration
  - `white` - player 1 model/name
  - `black` - player 2 model/name
  - `matchConfig` - full configuration object

- Arena metrics
  - `totalGames` - cumulative
  - `whiteWins`, `blackWins`, `draws` - cumulative
  - `totalMoves` - cumulative
  - `totalDurationMs` - cumulative
  - `illegalMoveRetries` - cumulative count
  - `ollamaTimeouts` - cumulative count
  - `ollamaCrashes` - cumulative count
  - `recoveryAttempts` - cumulative count
  - `successfulRecoveries` - cumulative count
  - `avgDecisionLatency` - average ms per move
  - `totalDecisionLatency` - cumulative latency
  - `gamesPerHour` - calculated throughput
  - `uptime` - seconds
  - `uptimeHours` - hours

### 1.2 Chess Game Execution (real-chess-game.js)
**Produces per move:**
- `moveNotation` (SAN)
- `moveStartTime` (timestamp)
- `moveLatency` (ms from request to response)
- `confidence` (0-100 from LLM)
- `playerName` - who made the move
- `color` - 'white' | 'black'
- `moveCount` - which move number
- `illegalMoveRetries` - how many invalid attempts

**Produces per game:**
- `moves[]` - complete move list
- `result` - game outcome
- `durationMs` - total time
- `moveCount` - total moves
- `pgn` - full game notation
- `fen` - final position
- `illegalMoveRetries` - total for game

### 1.3 Opening Tracker (opening-tracker.js)
**Produces:**
- `opening.name` - "Sicilian Defense", etc.
- `opening.ecoCode` - "B20-B99"
- `opening.moves` - number of opening moves detected
- `gameSequence` object:
  - `opening` - opening key
  - `moves` - move count
  - `result` - game result
  - `timestamp` - when played
- `repetitionRate` - % of recent games with same opening
- `openingDatabase` - frequency map

### 1.4 Decision Quality Analysis (move-quality-analyzer.js)
**Produces per move:**
- `quality` - 'legal' | 'illegal'
- `classification` - 'excellent' | 'good' | 'inaccuracy' | 'blunder'
- `reason` - text explanation
- `severity` - 'critical' | 'normal'

**Produces aggregate:**
- `totalMoves` - count
- `legalMoves` - count
- `illegalMoves` - count
- `blunders` - count
- `inaccuracies` - count
- `goodMoves` - count
- `moveStats` object with above

### 1.5 Commentary & Events (event-detector.js, commentary-generator.js)
**Produces:**
- Event type - "blunder", "brilliant", "check", "capture"
- Event severity - "critical", "major", "minor"
- Event timestamp
- Event description
- Related move number
- Commentary text
- Event metadata

### 1.6 Experiment Runner (experiment-runner.js)
**Produces:**
- `experimentId` - unique identifier
- `timestamp` - start time
- `targetGames` - requested
- `actualGames` - completed
- `durationSeconds` - total
- Results object:
  - `whiteWins`, `blackWins`, `draws`
  - `avgMoves`
  - `avgDurationSec`
- Metrics object:
  - `decisionLatency`
  - `illegalMoves`
  - `recoveries`

### 1.7 Model Benchmarker (model-benchmarker.js)
**Produces:**
- Model name
- As White: wins, losses, draws, games, totalMoves
- As Black: wins, losses, draws, games, totalMoves
- Overall: wins, losses, draws, games
- `winRate` - percentage
- `drawRate` - percentage
- `avgMoves`
- `whiteRecord` - "W-L-D"
- `blackRecord` - "W-L-D"

### 1.8 Regression Detector (regression-detector.js)
**Produces:**
- Baseline metrics (from file)
- Current metrics (from file)
- Differences:
  - `winRateDiff`
  - `stabilityDiff`
  - `latencyDiff`
  - `illegalMoveDiff`
- Regressions[] - list of detected regressions
- Improvements[] - list of detected improvements

### 1.9 Decision Quality Reporter (decision-quality-reporter.js)
**Produces:**
- `illegalMoveRate` - percentage
- `qualityScore` - 0-100
- `decisionLatency` - average ms
- `averageMoves` - per game
- `timeoutCount` - number
- `recoveryRate` - percentage
- Recommendations[] - text list

---

## 2. Missing Data Sources (Not Yet Captured)

These systems exist but don't store detailed data:

### 2.1 LLM Decision Process
- Complete prompt sent to Ollama
- Complete response from Ollama
- Reasoning/thinking (if available)
- Token count (not currently tracked)
- Model metadata (temperature, top_p, etc.)
- Parsing logic applied to response
- Rejected candidates (if multiple considered)

### 2.2 Engine Integration
- Would need Stockfish/engine integration
- Engine evaluation of each position
- Best move from engine
- Centipawn loss (LLM move vs engine best)
- Engine search depth
- Engine confidence

### 2.3 Position Analysis
- FEN after every move (currently stored in PGN/final only)
- Material count at each position
- Mobility scores
- King safety evaluation
- Pawn structure analysis
- Tactical motifs present

### 2.4 Tournament/Experiment Tracking
- Experiment metadata (name, purpose, hypothesis)
- Run metadata (configuration, hardware, environment)
- Tournament standings progression
- Head-to-head records
- Elo progression over time

---

## 3. Data Flow Architecture (Current)

```
Arena Loop
  ↓
  └─→ playGame(matchConfig)
       ↓
       └─→ RealChessGame.play()
            ├─ Move loop
            │  ├─ Ollama decision (latency, confidence)
            │  ├─ Move execution (SAN, FEN)
            │  └─ Event detection
            └─ Return: moves[], result, duration, pgn, fen
  ↓
  recordGameResult()
       ├─ Update state counters
       ├─ Add to gameHistory[]
       └─ persistStatistics() → JSON file
  ↓
  Tools read JSON:
       ├─ model-benchmarker.js
       ├─ experiment-runner.js
       ├─ regression-detector.js
       └─ decision-quality-reporter.js
```

**Problem:** Data only exists in memory during execution or in JSON file after. No persistent store. No relationships. No detailed move-level data.

---

## 4. Research Data Platform Requirements

### 4.1 Core Entities Needed

1. **Experiments**
   - ID, name, purpose, hypothesis
   - Configuration (model names, temps, etc.)
   - Metadata (hardware, env, git commit)
   - Status, start time, end time
   - Results summary

2. **Runs**
   - Experiment FK
   - Run number within experiment
   - Start time, end time, duration
   - Total games, completed games
   - Status (in-progress, completed, failed)

3. **Games**
   - Run FK
   - Experiment FK
   - Game number
   - White player, black player
   - Result (1 = white win, 0.5 = draw, 0 = black win)
   - Move count, duration
   - Opening name, ECO code
   - PGN, final FEN

4. **Moves**
   - Game FK
   - Move number
   - Color (white/black)
   - SAN notation
   - FEN before move
   - Latency (ms)
   - LLM confidence (0-100)
   - Move quality (legal, blunder, good, etc.)
   - Tokens used (if available)

5. **Positions**
   - FEN (unique)
   - Material count (W pawn, W knight, ..., B pawn, etc.)
   - Mobility (white moves available, black moves available)
   - King safety scores
   - Pawn structure hash
   - Tactical motif tags

6. **LLM Decisions**
   - Move FK
   - Full prompt (text)
   - Full response (text)
   - Model name
   - Temperature, top_p, max_tokens
   - Token count (in, out, total)
   - Parsing status (success, failure)
   - Retry count
   - Execution environment (Ollama version, etc.)

7. **Engine Evaluations** (future)
   - Position FK
   - Engine (Stockfish version)
   - Evaluation (cp)
   - Best move (SAN)
   - Depth, time
   - Comparison to LLM move

8. **Models**
   - Name (tinyllama, mistral, etc.)
   - Version
   - Ollama variant
   - Configuration hash
   - First seen date
   - Last used date

9. **Tournaments**
   - Name, description
   - Start time, end time
   - Type (round-robin, etc.)
   - Players
   - Standings (linked to games)

10. **Statistics**
    - Experiment or Run FK
    - Games played, wins, draws, losses
    - Win rates, draw rates
    - Avg moves, avg duration
    - Avg latency, latency p95, p99
    - Illegal move rate
    - Timeout count, crash count
    - Recovery success rate
    - Quality score

11. **Openings**
    - ECO code (unique)
    - Name
    - Frequency
    - Win rate (by color)
    - Average move count
    - First occurrence

12. **Tactical Events**
    - Game FK
    - Move number
    - Event type (check, capture, promotion, etc.)
    - Event subtype (blunder, brilliant, etc.)
    - Severity (critical, major, minor)
    - Description

13. **Runtime Metadata**
    - Timestamp
    - Arena version (git commit)
    - Node version
    - Python version (if used)
    - OS, CPU info
    - Memory available
    - Network state

14. **Hardware Metadata**
    - Timestamp
    - CPU cores
    - RAM (GB)
    - Storage (GB free)
    - Ollama GPU availability
    - Network latency to Ollama

---

## 5. Schema Design (Normalized)

### Primary Keys
- Every table has `id` (UUID or BIGINT auto)
- Natural keys where stable (ECO code for openings)

### Relationships
```
Experiment (1) ──→ (N) Run
    ↓
Run (1) ──→ (N) Game
    ↓
Game (1) ──→ (N) Move
Game (N) ──→ (1) Opening
Game (N) ──→ (1) Tournament
    ↓
Move (N) ──→ (1) Position (FEN)
Move (N) ──→ (1) LLM Decision
Move (N) ──→ (1) Engine Evaluation (optional)
Move (1) ──→ (N) Tactical Event
    ↓
LLM Decision (N) ──→ (1) Model
    ↓
Position (1) ──→ (N) Tactical Event
```

### Indexing Strategy
```
Games:
  - PRIMARY KEY (id)
  - INDEX (experiment_id, run_id)
  - INDEX (opening_id)
  - UNIQUE INDEX (run_id, game_number)

Moves:
  - PRIMARY KEY (id)
  - INDEX (game_id, move_number)
  - INDEX (fen_hash) -- for position lookups
  - INDEX (latency) -- for perf analysis

Positions:
  - PRIMARY KEY (fen) -- FEN as key
  - INDEX (material_hash) -- for endgame queries

LLM Decisions:
  - PRIMARY KEY (id)
  - INDEX (move_id)
  - INDEX (model_id)
  - INDEX (created_at) -- for time-based analysis
```

---

## 6. Storage Technology Decision

### Option A: SQLite (Simple)
- Pros: No external dependency, single file, built-in Node.js support
- Cons: Single writer, slower for large datasets
- Use case: Development, single-machine research

### Option B: PostgreSQL (Scalable)
- Pros: Multiple writers, JSONB support, powerful analytics
- Cons: Requires server, more complex setup
- Use case: Large-scale research, production deployment

### Option C: DuckDB (Analytical)
- Pros: Optimized for analytics, in-process or networked
- Cons: Less mature, fewer features
- Use case: Analysis-focused use cases

**Recommendation:** Start with SQLite for development and initial research. Design schema to be portable to PostgreSQL later.

---

## 7. Integration Points (No Changes to Existing Code)

### 7.1 Arena Integration
```javascript
// After playGame() completes, before persistStatistics()
if (researchDataPlatform.isEnabled()) {
  await researchDataPlatform.recordGame(
    matchConfig,
    result,
    gameMetadata
  );
}
```

### 7.2 Move-Level Integration
```javascript
// In real-chess-game.js executeMove()
if (researchDataPlatform.isEnabled()) {
  await researchDataPlatform.recordMove(
    moveData,
    playerData,
    latencyData
  );
}
```

### 7.3 Experiment Integration
```javascript
// In experiment-runner.js at start/end
await researchDataPlatform.startExperiment(config);
// ... run games ...
await researchDataPlatform.endExperiment(results);
```

### 7.4 Tool Integration
```javascript
// In benchmarker/detector tools
const historicalData = await researchDataPlatform.query(
  'SELECT * FROM games WHERE model = ? AND date > ?'
);
```

---

## 8. Reproducibility Requirements

Every record must support exact replay:

**For Games:**
- Store: git commit, Ollama version, arena config, random seed (if applicable)

**For Moves:**
- Store: exact prompt, exact response, model version, temperature, top_p

**For Positions:**
- Store: FEN, material, piece placement (all derivable from FEN)

**For Experiments:**
- Store: hypothesis, configuration hash, environment snapshot

---

## 9. Efficiency During Execution

### Write Performance
- **Batch writes** - don't write every move immediately
- **Async writes** - don't block game loop
- **Connection pooling** - reuse DB connections
- **Bulk inserts** - insert moves in batches

### Query Performance
- **Lazy load** - only fetch data when needed
- **Caching** - cache frequently accessed data (models, openings)
- **Aggregation at storage time** - pre-compute statistics

### Memory Usage
- **Streaming results** - don't load all games into memory
- **Pagination** - retrieve data in chunks
- **Archive old data** - move completed experiments to archive

---

## 10. Data Validation & Integrity

### Constraints
- Foreign keys enforced
- Unique constraints on natural keys
- Check constraints on numeric ranges
- NOT NULL where appropriate

### Validation Rules
- Game result must be valid (1, 0.5, or 0)
- Move must be valid SAN notation
- FEN must be parseable
- Latency must be > 0 and reasonable (< 300000ms)
- Confidence must be 0-100

### Integrity Checks
- Game move count must match moves table count
- Game duration must match move timing sum
- Tournament standings must match game results

---

## 11. Future Extensibility

**Without schema changes, support:**
- Engine evaluations (add table, don't modify games/moves)
- Tactical event analysis (add events table)
- Position analysis (add positions table with caching)
- Elo tracking (add elo_progression table)
- Opening intelligence (extend openings table)
- Endgame classification (add endgame_classification table)
- Statistical analysis (materialized views)

**All done with ADD, never with ALTER existing tables**

---

## Summary: Research Data Platform Architecture

**Technology:** SQLite (v3) initially, portable to PostgreSQL

**Core Tables:** 14 (Experiment, Run, Game, Move, Position, LLM Decision, Engine Evaluation, Model, Tournament, Statistics, Opening, Tactical Event, Runtime Metadata, Hardware Metadata)

**Relationships:** Normalized with foreign keys

**Indexing:** Strategic indexes on query paths, FEN hash for position lookups

**Integration:** Non-invasive hooks in arena.js and real-chess-game.js

**Write Pattern:** Async batching during game execution

**Reproducibility:** Full capture of configuration, prompts, responses

**Scalability:** Supports millions of games, designed for PostgreSQL migration

**Future-proof:** New tables for engine, analysis, without schema restructuring

---

## Next Steps

1. ✅ **Investigation complete** - This document
2. **Schema review** - Refine entity list and relationships
3. **Technology selection** - Confirm SQLite vs PostgreSQL
4. **Schema implementation** - Create DDL
5. **Integration testing** - Hook into arena.js
6. **Runtime validation** - Execute 100 games, verify data storage
7. **Analysis queries** - Implement research tools that use the data

**Approval needed on:**
- Entity list completeness
- Technology choice
- Integration approach
- Data retention policies
