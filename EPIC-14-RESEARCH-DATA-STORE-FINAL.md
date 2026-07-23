# EPIC 14: Research Data Store - Final Specification

**Date:** July 22, 2026  
**Status:** Ready for Implementation

---

## Vision

AI Commander is a scientific research platform for reproducible AI chess experiments.

Every research artifact is immutable and completely traceable. Every result can be reproduced years later from captured inputs. Derived analytics are always regenerable.

The Research Data Store is the foundation for all future research capabilities (EPICS 15+).

---

## Canonical Research Hierarchy

```
Research Project (implicit: directory/workspace)
    │
    └─ Experiment (research hypothesis, configuration, success criteria)
        │
        └─ Run (execution instance of experiment)
            │
            └─ Game (chess game outcome)
                │
                ├─ Move (individual move decision)
                │   │
                │   ├─ LLM Decision (prompt/response pair)
                │   │
                │   └─ Position (board state)
                │
                └─ [Extensible for future artifacts]
```

Every entity at every level has complete provenance.

---

## Complete Provenance Template

Every immutable record captures:

```
Identification
  - Unique ID (UUID)
  - Parent IDs (experiment_id, run_id, game_id, etc.)
  - Logical sequence (run_number, game_number, move_number)

Configuration
  - Which model? (model_name, model_identifier, model_digest)
  - Which parameters? (config_id → separate immutable record)
  - Which prompt? (prompt_version, prompt_hash, prompt_template_name)
  - Which environment? (environment_snapshot_id)

Execution Context
  - Code version? (git_commit, application_version)
  - Random seed? (random_seed, if applicable)
  - Engine version? (engine_version, if applicable)
  - Timing? (execution_start, execution_end, created_at)

Reproducibility
  - All inputs captured (prompts, configurations, environment)
  - All outputs recorded (results, decisions, positions)
  - Complete snapshot for exact reproduction
```

---

## IMMUTABLE CORE: Research Artifacts

### 1. **Experiments** — Research Sessions

**Purpose:** Entry point for all research. Captures hypothesis and success criteria.

**Immutable:** Once created, experiment metadata never changes.

**Schema:**
```sql
experiments (
  id TEXT PRIMARY KEY,                    -- UUID
  name TEXT NOT NULL,                     -- "tinyllama-vs-mistral-benchmark"
  hypothesis TEXT NOT NULL,               -- Research question
  description TEXT,                       -- Detailed context
  
  -- Success criteria
  target_games INTEGER,                   -- Goal (if applicable)
  success_criteria TEXT,                  -- Definition of success
  
  -- Provenance: How was this experiment defined?
  git_commit TEXT NOT NULL,               -- Code version
  application_version TEXT NOT NULL,      -- AI Commander version
  created_at INTEGER NOT NULL,            -- Timestamp
  
  -- Experiment lifecycle
  status TEXT NOT NULL,                   -- 'in-progress' | 'completed' | 'failed'
  completed_at INTEGER,
  notes TEXT
)

INDEX: (created_at)
INDEX: (status)
```

---

### 2. **Runs** — Execution Instances

**Purpose:** One experiment can execute multiple times. Each run is immutable.

**Immutable:** Configuration, environment, and results never change after run completes.

**Schema:**
```sql
runs (
  id TEXT PRIMARY KEY,                    -- UUID
  experiment_id TEXT NOT NULL,            -- FK experiments.id
  run_number INTEGER NOT NULL,            -- Sequence: 1, 2, 3, ...
  
  -- Execution configuration (immutable)
  config_snapshot TEXT NOT NULL,          -- JSON of ALL settings
  environment_snapshot_id TEXT NOT NULL,  -- FK environment_snapshots.id
  
  -- Provenance: Exact execution context
  git_commit TEXT NOT NULL,               -- Code version at run time
  application_version TEXT NOT NULL,
  random_seed TEXT,                       -- For reproducibility
  execution_start INTEGER NOT NULL,       -- When run started
  execution_end INTEGER,                  -- When run ended
  
  -- Lifecycle
  status TEXT NOT NULL,                   -- 'in-progress' | 'completed' | 'failed'
  target_game_count INTEGER,
  completed_game_count INTEGER,
  notes TEXT
)

UNIQUE INDEX: (experiment_id, run_number)
INDEX: (experiment_id, execution_start)
```

**Note:** config_snapshot is JSON containing all settings. This enables:
- Complete configuration capture
- Easier comparisons between runs
- Future extensibility (new settings added to JSON)

---

### 3. **Environment Snapshots** — System Context

**Purpose:** Capture complete system state at execution time.

**Immutable:** Snapshot is taken at run start and never modified.

**Extensibility:** New fields can be added without schema changes (JSON support).

**Schema:**
```sql
environment_snapshots (
  id TEXT PRIMARY KEY,                    -- UUID
  experiment_id TEXT NOT NULL,            -- FK experiments.id
  run_id TEXT,                            -- FK runs.id (optional)
  
  -- System information
  os TEXT NOT NULL,                       -- "Linux", "Windows", "macOS"
  os_version TEXT NOT NULL,
  os_release TEXT,
  
  -- Node.js runtime
  node_version TEXT NOT NULL,
  npm_version TEXT,
  pnpm_version TEXT,
  
  -- Hardware
  cpu_model TEXT,
  cpu_cores INTEGER,
  ram_gb INTEGER,
  storage_available_gb INTEGER,
  
  -- Ollama/Model serving
  ollama_version TEXT,
  ollama_location TEXT,                   -- IP:port
  ollama_cache_dir TEXT,
  
  -- Chess.js and adapters
  chess_js_version TEXT,
  chess_adapter_version TEXT,
  
  -- Network
  network_latency_to_ollama_ms REAL,
  
  -- Extensible (JSON for future fields)
  other_metadata TEXT,                    -- JSON for additional context
  
  -- Snapshot metadata
  created_at INTEGER NOT NULL,
  captured_at INTEGER NOT NULL
)

INDEX: (experiment_id, run_id)
INDEX: (created_at)
```

---

### 4. **Model Configurations** — Immutable Parameter Sets

**Purpose:** Every unique model + parameter combination is an immutable record.

**Philosophy:** Configuration is never updated. If a parameter changes, create a new record.

**Immutable:** Once a configuration is created, it never changes.

**Extensibility:** Supports any Ollama parameter + future LLM providers.

**Schema:**
```sql
model_configs (
  id TEXT PRIMARY KEY,                    -- UUID
  
  -- Model identification
  model_identifier TEXT NOT NULL,         -- "ollama:tinyllama:7b"
  model_name TEXT NOT NULL,               -- "tinyllama"
  model_version TEXT NOT NULL,            -- Ollama version tag
  model_digest TEXT,                      -- Ollama model digest (if available)
  model_size TEXT,                        -- "7b", "13b", etc.
  
  -- Sampling parameters
  temperature REAL NOT NULL,
  top_p REAL NOT NULL,
  top_k INTEGER,
  max_tokens INTEGER NOT NULL,
  
  -- Ollama-specific
  num_ctx INTEGER,
  num_threads INTEGER,
  num_gpu INTEGER,
  
  -- Provider (for future multi-provider support)
  provider TEXT DEFAULT 'ollama',         -- "ollama", "anthropic", "openai", etc.
  provider_version TEXT,
  provider_config TEXT,                   -- JSON for provider-specific settings
  
  -- Provenance
  experiment_id TEXT,                     -- Which research first used this?
  created_at INTEGER NOT NULL,
  first_used_at INTEGER,
  last_used_at INTEGER,
  
  -- Denormalized
  usage_count INTEGER DEFAULT 0           -- How many games used this?
)

-- Ensures exact configurations are unique
UNIQUE INDEX: (
  model_identifier, 
  temperature, top_p, top_k, max_tokens,
  num_ctx, num_threads, num_gpu,
  provider, provider_version
)
INDEX: (model_name, created_at)
INDEX: (provider)
```

---

### 5. **Games** — Chess Game Records

**Purpose:** Immutable record of game result with complete context.

**Immutable:** Once recorded, game never changes.

**Provenance:** Complete capture of inputs (models, configs, environment, code) and outputs (result, moves, timing).

**Schema:**
```sql
games (
  id TEXT PRIMARY KEY,                    -- UUID
  
  -- Hierarchy
  experiment_id TEXT NOT NULL,            -- FK experiments.id
  run_id TEXT NOT NULL,                   -- FK runs.id
  game_number INTEGER NOT NULL,           -- Sequence in run
  
  -- Players and configurations
  white_model TEXT NOT NULL,              -- Model name
  black_model TEXT NOT NULL,
  white_config_id TEXT NOT NULL,          -- FK model_configs.id
  black_config_id TEXT NOT NULL,          -- FK model_configs.id
  
  -- Game result
  result TEXT NOT NULL,                   -- '1' (white win) | '0.5' (draw) | '0' (black win)
  termination TEXT,                       -- "checkmate", "stalemate", "time", etc.
  
  -- Chess notation
  pgn TEXT NOT NULL,                      -- Full PGN
  final_fen TEXT NOT NULL,                -- Position after last move
  opening_eco TEXT,                       -- ECO code if recognized
  opening_name TEXT,
  
  -- Game metrics
  move_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  
  -- Environment context
  environment_snapshot_id TEXT NOT NULL,  -- FK environment_snapshots.id
  
  -- Provenance: Exact reproduction info
  git_commit TEXT NOT NULL,               -- Code version
  application_version TEXT NOT NULL,
  random_seed TEXT,                       -- For move randomization (if any)
  engine_version TEXT,                    -- Chess.js version or engine used
  
  -- Timing (immutable record of when)
  execution_start INTEGER NOT NULL,       -- When game started
  execution_end INTEGER NOT NULL,         -- When game finished
  created_at INTEGER NOT NULL,            -- When recorded in database
  
  -- Denormalized game statistics (computed once, immutable)
  white_illegal_moves INTEGER DEFAULT 0,
  black_illegal_moves INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  max_latency_ms INTEGER,
  parsing_errors INTEGER DEFAULT 0
)

INDEX: (experiment_id, run_id, game_number)
INDEX: (experiment_id, created_at)
INDEX: (white_model, result)
INDEX: (black_model, result)
INDEX: (opening_eco)
INDEX: (created_at)
```

---

### 6. **Moves** — Move Decisions

**Purpose:** Immutable record of every move decision with complete context.

**Immutable:** Move decision never changes after recorded.

**Provenance:** Complete capture of decision latency, confidence, legality, and which model/config made it.

**Schema:**
```sql
moves (
  id TEXT PRIMARY KEY,                    -- UUID
  
  -- Hierarchy
  game_id TEXT NOT NULL,                  -- FK games.id
  experiment_id TEXT NOT NULL,            -- Denorm for speed
  run_id TEXT NOT NULL,                   -- Denorm for speed
  move_number INTEGER NOT NULL,           -- 1, 2, 3, ...
  
  -- Move data
  color TEXT NOT NULL,                    -- 'white' | 'black'
  san TEXT NOT NULL,                      -- "e4"
  fen_before TEXT NOT NULL,               -- Position before move
  fen_after TEXT NOT NULL,                -- Position after move
  
  -- Decision quality
  latency_ms INTEGER NOT NULL,            -- Time to decide
  confidence INTEGER NOT NULL,            -- 0-100 from LLM
  is_legal BOOLEAN NOT NULL,              -- Valid chess move?
  illegal_retry_count INTEGER DEFAULT 0,  -- Retries needed
  
  -- Model context
  model_name TEXT NOT NULL,               -- Which model
  model_config_id TEXT NOT NULL,          -- FK model_configs.id
  
  -- Provenance
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  execution_start INTEGER NOT NULL,       -- When move started
  execution_end INTEGER NOT NULL,         -- When move finished
  created_at INTEGER NOT NULL
)

INDEX: (game_id, move_number)
INDEX: (experiment_id, created_at)
INDEX: (is_legal)
INDEX: (latency_ms)
```

---

### 7. **LLM Decisions** — Prompt/Response Pairs

**Purpose:** Immutable record of LLM input and output for every move.

**Immutable:** Prompt and response never change after recorded.

**Provenance:** Complete capture of prompt version, model, parameters, and response for exact reproducibility.

**Extensibility:** Supports future LLM providers (Anthropic, OpenAI, local models, etc.).

**Schema:**
```sql
llm_decisions (
  id TEXT PRIMARY KEY,                    -- UUID
  
  -- Hierarchy
  move_id TEXT NOT NULL,                  -- FK moves.id
  game_id TEXT NOT NULL,                  -- Denorm for speed
  experiment_id TEXT NOT NULL,            -- Denorm for speed
  run_id TEXT NOT NULL,                   -- Denorm for speed
  
  -- Prompt information
  prompt TEXT NOT NULL,                   -- Full prompt sent
  prompt_version TEXT,                    -- Prompt version (if versioned)
  prompt_hash TEXT,                       -- Hash of prompt for deduplication
  prompt_template_name TEXT,              -- If using templates
  
  -- LLM and parameters
  model_identifier TEXT NOT NULL,         -- "ollama:tinyllama:7b"
  model_config_id TEXT NOT NULL,          -- FK model_configs.id
  
  -- Response information
  response TEXT NOT NULL,                 -- Full response received
  tokens_in INTEGER,                      -- Input tokens
  tokens_out INTEGER,                     -- Output tokens
  
  -- Parsing and quality
  parsing_status TEXT NOT NULL,           -- 'success' | 'failed' | 'malformed'
  parsed_move TEXT,                       -- Extracted move (SAN)
  parsing_notes TEXT,                     -- Why did it fail?
  retry_count INTEGER DEFAULT 0,          -- How many parsing retries?
  
  -- Provenance
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  execution_start INTEGER NOT NULL,
  execution_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)

INDEX: (move_id)
INDEX: (experiment_id, created_at)
INDEX: (model_identifier, parsing_status)
INDEX: (prompt_hash)                     -- For dedup analysis
```

---

### 8. **Positions** — Board States

**Purpose:** Deduplicate FEN strings and enable position-based analysis.

**Immutable:** Position metadata never changes (occurrence_count is cumulative).

**Extensibility:** Can add endgame classification, tactical motif tags, etc. without schema changes.

**Schema:**
```sql
positions (
  fen TEXT PRIMARY KEY,                   -- Standard FEN (unique key)
  
  -- Frequency tracking
  occurrence_count INTEGER DEFAULT 1,     -- How many times has this FEN appeared?
  
  -- Position properties
  white_pieces INTEGER,
  black_pieces INTEGER,
  is_endgame BOOLEAN,                     -- Material-based classification
  is_check BOOLEAN,                       -- Derived from FEN
  
  -- Analysis hooks (for future extensibility)
  tactical_motif_tags TEXT,               -- JSON array of detected tactics
  endgame_classification TEXT,            -- Type of endgame (if applicable)
  
  -- Timeline
  first_seen INTEGER,                     -- Timestamp of first occurrence
  last_seen INTEGER                       -- Timestamp of most recent
)

INDEX: (occurrence_count DESC)
INDEX: (is_endgame)
INDEX: (is_check)
```

---

## DERIVED ANALYTICS: Always Regenerable

These tables pre-compute common queries for performance only.

**Principle:** Every derived table can be completely rebuilt from immutable records with zero information loss.

---

### 9. **Opening Statistics** (Derived)

**Regeneration Query:**
```sql
SELECT opening_eco, opening_name,
       COUNT(*) as occurrence_count,
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as white_wins,
       SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
       SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as black_wins,
       AVG(move_count) as avg_moves
FROM games
GROUP BY opening_eco
```

**Schema:**
```sql
opening_stats (
  id TEXT PRIMARY KEY,
  eco_code TEXT NOT NULL,
  opening_name TEXT,
  occurrence_count INTEGER,
  white_wins INTEGER,
  black_wins INTEGER,
  draws INTEGER,
  avg_moves INTEGER,
  last_updated INTEGER
)

UNIQUE INDEX: (eco_code)
INDEX: (occurrence_count DESC)
```

---

### 10. **Model Performance** (Derived)

**Regeneration Query:**
```sql
SELECT white_model as model, 
       COUNT(*) as games,
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as wins
FROM games
WHERE white_model = ?
UNION
SELECT black_model as model,
       COUNT(*),
       SUM(CASE WHEN result='0' THEN 1 ELSE 0 END)
FROM games
WHERE black_model = ?
```

**Schema:**
```sql
model_performance (
  id TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL,
  games_as_white INTEGER,
  games_as_black INTEGER,
  wins_as_white INTEGER,
  wins_as_black INTEGER,
  total_wins INTEGER,
  draws INTEGER,
  losses INTEGER,
  win_rate_percent REAL,
  avg_decision_latency_ms INTEGER,
  legal_move_rate_percent REAL,
  last_updated INTEGER
)

UNIQUE INDEX: (model_identifier)
INDEX: (win_rate_percent DESC)
```

---

### 11. **Elo Progression** (Derived)

**Regeneration Process:** Iterate through games chronologically, calculate rolling Elo using Glicko-2 or standard Elo formula.

**Schema:**
```sql
elo_progression (
  id TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL,
  checkpoint_number INTEGER,              -- Every 50 games
  elo_rating INTEGER,
  games_in_checkpoint INTEGER,
  timestamp INTEGER,
  last_updated INTEGER
)

INDEX: (model_identifier, checkpoint_number)
INDEX: (timestamp)
```

---

## Extensibility: Future Artifacts

The schema is designed for easy addition of new artifact types without redesign:

**Future Examples:**

### Engine Evaluations (when chess engine integration added)
```sql
engine_evaluations (
  id TEXT PRIMARY KEY,
  position_fen TEXT NOT NULL,            -- FK positions.fen
  engine_version TEXT NOT NULL,          -- "stockfish 15.1"
  evaluation_cp INTEGER,                 -- Centipawns
  best_move_san TEXT,
  depth INTEGER,
  search_time_ms INTEGER,
  created_at INTEGER NOT NULL
)
```

### Tactical Events (when pattern detection added)
```sql
tactical_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,                 -- FK games.id
  move_number INTEGER NOT NULL,
  event_type TEXT,                       -- "blunder", "brilliant", "hanging_piece"
  severity TEXT,                         -- "critical", "major", "minor"
  description TEXT,
  created_at INTEGER NOT NULL
)
```

### Tournament Records (when tournament support added)
```sql
tournaments (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,           -- FK experiments.id
  name TEXT NOT NULL,
  tournament_type TEXT,                  -- "round-robin", "swiss", etc.
  created_at INTEGER NOT NULL
)
```

**All additions follow the same principle:**
- Immutable records with complete provenance
- Foreign keys to experiments/runs/games
- Regenerable derived analytics

---

## Scientific Reproducibility Guarantee

Any game in the database can be reproduced under equivalent conditions by capturing all inputs and context:

1. **Fetch the game record:**
```sql
SELECT * FROM games WHERE id = ?
```
Returns: git_commit, application_version, random_seed, environment_snapshot_id, execution timestamps

2. **Fetch the configurations:**
```sql
SELECT * FROM model_configs WHERE id IN (white_config_id, black_config_id)
```
Returns: model_identifier, model_digest, exact parameters (temperature, top_p, etc.)

3. **Fetch the environment:**
```sql
SELECT * FROM environment_snapshots WHERE id = environment_snapshot_id
```
Returns: OS, hardware, CPU cores, RAM, Ollama version, network latency

4. **Fetch the exact code:**
```bash
git checkout <git_commit>
```
Restores the exact implementation that produced these results

5. **Fetch the exact prompts:**
```sql
SELECT prompt, response FROM llm_decisions 
WHERE game_id = ? 
ORDER BY move_number
```
Preserves the exact prompt versions and responses

6. **Reproduce under equivalent conditions:**
- Same code version (git_commit)
- Same models and parameters
- Same prompt versions
- Same random seed
- Same environment (OS, hardware, Ollama version)

**Result:** Scientific reproducibility under equivalent conditions. Outputs may vary due to non-determinism in LLM inference (sampling randomness, implementation differences between model versions, Ollama updates, etc.), but all inputs and context are preserved for understanding how the original experiment was produced.

---

## Schema Summary

| Layer | Table | Purpose | Immutable | Regenerable |
|-------|-------|---------|-----------|-------------|
| Core | Experiments | Research hypothesis | ✅ | N/A |
| Core | Runs | Execution instance | ✅ | N/A |
| Core | Environment Snapshots | System context | ✅ | N/A |
| Core | Model Configs | Parameter sets | ✅ | N/A |
| Core | Games | Game results | ✅ | N/A |
| Core | Moves | Move decisions | ✅ | N/A |
| Core | LLM Decisions | Prompt/response | ✅ | N/A |
| Core | Positions | Board states | ✅ | N/A |
| Derived | Opening Stats | Opening performance | ❌ | ✅ |
| Derived | Model Performance | Rankings | ❌ | ✅ |
| Derived | Elo Progression | Strength evolution | ❌ | ✅ |

---

## Implementation Roadmap

### Phase 1: Core Database Schema
- Create all 8 immutable tables
- Define all indexes (strategic, not excessive)
- Validate foreign key relationships
- Test with sample data

### Phase 2: API Layer
- Hide storage implementation
- recordExperiment(), recordRun(), recordGame(), recordMove(), recordDecision()
- Clean query interface
- Batch write optimization

### Phase 3: Integration
- Hook into arena.js (record games)
- Hook into real-chess-game.js (record moves, LLM decisions)
- Async batch writes (non-blocking)
- Transaction support for game atomicity

### Phase 4: Derived Analytics
- Opening statistics aggregation
- Model performance leaderboard
- Elo progression calculation
- Regeneration routines
- Maintenance operations (rebuild derived tables)

### Phase 5: Extensions
- Engine evaluation support (when integrated)
- Tactical event detection (when added)
- Tournament tracking (when needed)
- Multi-provider LLM support (when needed)

---

## Principles Embodied in This Design

✅ **Experiment-Centric** — Everything traces back to research hypothesis

✅ **Complete Provenance** — Every record captures git_commit, timestamp, configuration, environment, model info

✅ **Reproducibility** — All inputs stored; same inputs → same outputs guaranteed

✅ **Immutable Core** — Historical facts never change; source of truth

✅ **Regenerable Analytics** — Derived tables rebuild from immutable data with zero loss

✅ **No Derived-as-Truth** — Never query derived tables for scientific conclusions

✅ **Self-Contained** — Embedded SQLite; no external database servers

✅ **Future-Proof** — New artifact types added without redesign

✅ **Multi-Provider Ready** — Schema supports Ollama, Anthropic, OpenAI, etc.

✅ **Scientific Integrity** — Built for reproducible research at scale

---

**Status:** Architecture approved. Ready for Phase 1 implementation.

