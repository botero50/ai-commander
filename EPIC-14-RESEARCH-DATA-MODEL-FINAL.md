# EPIC 14: Research Data Store - Final Design

**Philosophy:** Scientific research platform for reproducible chess AI experiments. Every record traceable to its experiment. Complete provenance on every immutable entity. Derived analytics always regenerable.

**Primary Object:** The Experiment.

Everything else exists to support experiments: recording results, analyzing outcomes, reproducing exact conditions.

---

## Core Principle: Scientific Traceability

Every immutable record must answer:

- **Which experiment?** (experiment_id)
- **Which run within that experiment?** (run_id)
- **Which software version?** (git_commit, software_version)
- **Which model?** (model_name, model_version)
- **Which configuration?** (config_id or embedded snapshot)
- **Which environment?** (environment_snapshot_id)
- **When exactly?** (created_at timestamp)
- **Can this be reproduced?** (all inputs captured)

---

## Hierarchy: Research Project → Experiment → Run → Game → Move → Decision → Position

```
Research Project (implicit, tracked by directory/workspace)
    │
    └─ Experiment (research hypothesis, configuration)
        │
        └─ Run (execution instance of experiment)
            │
            └─ Game (chess game result)
                │
                └─ Move (individual move decision)
                    │
                    └─ LLM Decision (prompt/response pair)
                        │
                        └─ Position (board state)
```

Every child record has:
- Foreign key to parent(s)
- Experiment ID (denormalized for speed)
- Complete provenance metadata
- Immutable timestamp

---

## IMMUTABLE CORE: 8 Tables + Complete Provenance

### 1. **Experiments** — Research Sessions

**Why:** Entry point for all research. Captures hypothesis, configuration, and success criteria.

**Purpose:**
- Track research questions and hypotheses
- Group games into logical research units
- Enable reproducibility
- Store experiment-level success metrics

**Queries:**
- "List all experiments"
- "Get experiment metadata"
- "Find experiments using model X"

**Provenance:**
- created_at: When experiment started
- git_commit: Code version when experiment began
- node_version, os: Environment at creation time
- hypothesis: Research question

**Schema:**
```sql
experiments (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- "tinyllama vs mistral benchmark"
  hypothesis TEXT NOT NULL,         -- Research question
  description TEXT,                 -- Detailed context
  
  -- Provenance: How was this experiment created?
  git_commit TEXT NOT NULL,         -- Code version
  software_version TEXT NOT NULL,   -- AI Commander version
  created_at INTEGER NOT NULL,      -- Timestamp
  
  -- Experiment success criteria
  target_games INTEGER,             -- Goal (if applicable)
  success_criteria TEXT,            -- Definition of success
  
  -- Status tracking
  status TEXT NOT NULL,             -- 'in-progress' | 'completed' | 'failed'
  completed_at INTEGER,
  notes TEXT                        -- Free-form annotations
)

INDEX: (created_at)
INDEX: (status)
```

**Expected Size:** 100-1000 per year (slow growth)

---

### 2. **Runs** — Execution Instances

**Why:** One experiment may run multiple times. Each run is a separate execution with its own environment snapshot.

**Purpose:**
- Capture exact conditions of each execution
- Enable statistical analysis across runs (variance, stability)
- Isolate configuration changes between runs
- Store complete environment and configuration snapshots

**Queries:**
- "All runs of experiment X"
- "Compare run A vs run B"
- "Which run used configuration Y?"

**Provenance:**
- experiment_id: Which research question?
- run_number: Sequence within experiment
- config_snapshot: Exact parameters for this run
- environment_snapshot_id: OS, hardware, software versions
- git_commit: Code at execution time
- started_at, completed_at: When did this run execute?

**Schema:**
```sql
runs (
  id TEXT PRIMARY KEY,              -- UUID
  experiment_id TEXT NOT NULL,      -- FK experiments.id
  run_number INTEGER NOT NULL,      -- Sequence: 1, 2, 3, ...
  
  -- Provenance: Exact conditions of this run
  config_snapshot TEXT NOT NULL,    -- JSON of all settings
  environment_snapshot_id TEXT,     -- FK environment_snapshots.id
  git_commit TEXT NOT NULL,         -- Code version at run time
  software_version TEXT NOT NULL,
  
  -- Execution timeline
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,             -- 'in-progress' | 'completed' | 'failed'
  
  -- Denormalized statistics (computed once, then frozen)
  target_game_count INTEGER,
  completed_game_count INTEGER,
  notes TEXT
)

UNIQUE INDEX: (experiment_id, run_number)
INDEX: (experiment_id, started_at)
```

**Expected Size:** 1K-10K runs (most experiments have 1-5 runs)

---

### 3. **Environment Snapshots** — Reproducibility Records

**Why:** Every run executes in a specific environment. Capture it completely.

**Purpose:**
- Enable exact reproduction of conditions years later
- Analyze impact of environment changes
- Debug environment-specific issues
- Support reproducible research papers

**Provenance:**
- created_at: When was this snapshot taken?
- Which run/experiment uses this snapshot

**Schema:**
```sql
environment_snapshots (
  id TEXT PRIMARY KEY,              -- UUID
  
  -- Identification
  experiment_id TEXT NOT NULL,      -- FK experiments.id
  run_id TEXT,                      -- FK runs.id (can be null for experiment-wide)
  
  -- System information
  os TEXT NOT NULL,                 -- "Linux", "Windows", "macOS"
  os_version TEXT NOT NULL,         -- Full version string
  os_release TEXT,                  -- "Ubuntu 22.04" etc.
  
  -- Node.js
  node_version TEXT NOT NULL,       -- "v18.16.0"
  npm_version TEXT,
  pnpm_version TEXT,
  
  -- Hardware
  cpu_model TEXT,
  cpu_cores INTEGER,
  ram_gb INTEGER,
  storage_available_gb INTEGER,
  
  -- Ollama/Model serving
  ollama_version TEXT,
  ollama_location TEXT,             -- IP/port
  ollama_model_cache TEXT,          -- Where Ollama stores models
  
  -- Chess/AI Commander
  chess_js_version TEXT,
  chess_adapter_version TEXT,
  
  -- Networking
  network_latency_to_ollama_ms REAL,
  
  -- Snapshot metadata
  created_at INTEGER NOT NULL,
  captured_at INTEGER NOT NULL      -- When environment was measured
)

INDEX: (experiment_id, run_id)
INDEX: (created_at)
```

**Expected Size:** 100-10K snapshots (one per run, maybe one per experiment)

---

### 4. **Model Configurations** — Parameter Sets

**Why:** Same model can be used with different parameters. Capture exact settings.

**Purpose:**
- Track which model version + settings produced which games
- Enable reproducibility (exact temperature, top_p, etc.)
- Compare performance across configurations
- Identify when settings changed between experiments

**Provenance:**
- created_at: When was this configuration first used?
- experiment_id: Which research first needed this config?
- model_version: Which model version?

**Schema:**
```sql
model_configs (
  id TEXT PRIMARY KEY,              -- UUID
  
  -- Model identification
  model_name TEXT NOT NULL,         -- "tinyllama", "mistral", "llama2"
  model_version TEXT NOT NULL,      -- Ollama version tag
  model_size TEXT,                  -- "7b", "13b", etc.
  
  -- Sampling parameters
  temperature REAL NOT NULL,
  top_p REAL NOT NULL,
  top_k INTEGER,
  max_tokens INTEGER NOT NULL,
  
  -- Ollama-specific settings
  num_ctx INTEGER,                  -- Context window
  num_threads INTEGER,
  num_gpu INTEGER,
  
  -- Additional parameters (future extensibility)
  other_params TEXT,                -- JSON for additional settings
  
  -- Provenance
  experiment_id TEXT,               -- Which research first used this?
  created_at INTEGER NOT NULL,
  first_used_at INTEGER,            -- When did a game first use this?
  
  -- Denormalized
  usage_count INTEGER DEFAULT 0,    -- How many games used this config?
  last_used_at INTEGER
)

UNIQUE INDEX: (model_name, model_version, temperature, top_p, top_k, max_tokens)
INDEX: (model_name, created_at)
INDEX: (experiment_id)
```

**Expected Size:** 10-100 configs (models × parameter variations)

---

### 5. **Games** — Game Records

**Why:** Immutable record of chess game result with complete context.

**Purpose:**
- Store every game result, moves list, and metadata
- Link to players, experiment, run, opening
- Enable filtering by result, duration, players, timeframe
- Trace game back to exact configuration and environment

**Provenance:**
- experiment_id, run_id: Which research project?
- white_config_id, black_config_id: Which models/settings?
- environment_snapshot_id: Execution environment
- git_commit: Code version
- created_at, completed_at: When exactly?

**Queries:**
- "All games where tinyllama was white"
- "Games in run 5"
- "Games in opening Y"
- "Games completed between time X and Y"
- "Games with specific models and configurations"

**Schema:**
```sql
games (
  id TEXT PRIMARY KEY,              -- UUID
  
  -- Hierarchy
  experiment_id TEXT NOT NULL,      -- FK experiments.id
  run_id TEXT NOT NULL,             -- FK runs.id
  game_number INTEGER NOT NULL,     -- Sequence in run
  
  -- Players and configuration
  white_model TEXT NOT NULL,        -- Model name
  black_model TEXT NOT NULL,
  white_config_id TEXT NOT NULL,    -- FK model_configs.id
  black_config_id TEXT NOT NULL,    -- FK model_configs.id
  
  -- Result
  result TEXT NOT NULL,             -- '1' | '0.5' | '0'
  termination TEXT,                 -- "checkmate", "stalemate", "time", etc.
  
  -- Game metrics
  move_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  
  -- Chess notation
  pgn TEXT NOT NULL,                -- Full PGN
  final_fen TEXT NOT NULL,          -- Position after last move
  opening_eco TEXT,                 -- ECO code if recognized
  opening_name TEXT,
  
  -- Environment context
  environment_snapshot_id TEXT,     -- FK environment_snapshots.id
  
  -- Provenance: Exact reproduction info
  git_commit TEXT NOT NULL,         -- Code version
  software_version TEXT NOT NULL,
  
  -- Timeline
  created_at INTEGER NOT NULL,      -- When recorded
  started_at INTEGER NOT NULL,      -- When game execution started
  completed_at INTEGER NOT NULL,    -- When game finished
  
  -- Denormalized statistics (computed once, immutable)
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
INDEX: (created_at)  -- Time-range queries
```

**Expected Size:** 1M-100M games

**Critical Principle:** Every field needed to reproduce this exact game is in this table.

---

### 6. **Moves** — Move Decisions

**Why:** Immutable record of every move decision with complete context.

**Purpose:**
- Store every move with decision latency, confidence, legality
- Enable move-level performance analysis
- Track decision quality over time
- Link to LLM decision data

**Provenance:**
- game_id, experiment_id, run_id: Hierarchy
- model_config_id: Exact parameters used
- created_at: When was this move made?

**Queries:**
- "All illegal moves"
- "Decision latency percentiles"
- "Moves with latency > 2000ms"
- "High-confidence moves that were blunders"

**Schema:**
```sql
moves (
  id TEXT PRIMARY KEY,              -- UUID
  
  -- Hierarchy
  game_id TEXT NOT NULL,            -- FK games.id
  experiment_id TEXT NOT NULL,      -- Denorm for speed
  run_id TEXT NOT NULL,             -- Denorm for speed
  move_number INTEGER NOT NULL,     -- 1, 2, 3, ...
  
  -- Move data
  color TEXT NOT NULL,              -- 'white' | 'black'
  san TEXT NOT NULL,                -- "e4"
  fen_before TEXT NOT NULL,         -- Position before move
  fen_after TEXT NOT NULL,          -- Position after move
  
  -- Decision quality
  latency_ms INTEGER NOT NULL,      -- Time to decide
  confidence INTEGER NOT NULL,      -- 0-100 from LLM
  is_legal BOOLEAN NOT NULL,        -- Valid chess move?
  illegal_retry_count INTEGER,      -- How many illegal attempts?
  
  -- Model context
  model_name TEXT NOT NULL,         -- Which model made this?
  model_config_id TEXT NOT NULL,    -- FK model_configs.id
  
  -- Provenance
  git_commit TEXT NOT NULL,
  created_at INTEGER NOT NULL
)

INDEX: (game_id, move_number)
INDEX: (experiment_id, created_at)
INDEX: (is_legal)  -- Find illegal moves
INDEX: (latency_ms)
```

**Expected Size:** 25M-2.5B moves (25+ per game)

---

### 7. **LLM Decisions** — Prompt/Response Pairs

**Why:** Immutable record of LLM input and output. Enables decision analysis and debugging.

**Purpose:**
- Store exact prompt, response, model parameters for every move
- Enable analysis of LLM reasoning
- Support reproducibility (inputs → outputs)
- Debug malformed responses
- Analyze parsing failures

**Provenance:**
- move_id, game_id, experiment_id: Hierarchy
- model_config_id: Exact parameters
- created_at: When was decision made?

**Queries:**
- "All decisions by model X at temperature Y"
- "Decisions with parsing failures"
- "Decisions where response was malformed"

**Schema:**
```sql
llm_decisions (
  id TEXT PRIMARY KEY,              -- UUID
  
  -- Hierarchy
  move_id TEXT NOT NULL,            -- FK moves.id
  game_id TEXT NOT NULL,            -- Denorm for speed
  experiment_id TEXT NOT NULL,      -- Denorm for speed
  run_id TEXT NOT NULL,             -- Denorm for speed
  
  -- Decision content
  prompt TEXT NOT NULL,             -- Full prompt sent
  response TEXT NOT NULL,           -- Full response received
  
  -- Model and parameters
  model_name TEXT NOT NULL,
  model_config_id TEXT NOT NULL,    -- FK model_configs.id (redundant with move, but useful)
  tokens_in INTEGER,                -- Input tokens
  tokens_out INTEGER,               -- Output tokens
  
  -- Parsing
  parsing_status TEXT NOT NULL,     -- 'success' | 'failed' | 'malformed'
  parsed_move TEXT,                 -- Extracted move (SAN)
  parsing_notes TEXT,               -- Why did it fail?
  retry_count INTEGER DEFAULT 0,    -- How many retries?
  
  -- Provenance
  git_commit TEXT NOT NULL,
  created_at INTEGER NOT NULL
)

INDEX: (move_id)
INDEX: (experiment_id, created_at)
INDEX: (model_name, parsing_status)
```

**Expected Size:** 25M-2.5B (one per move)

---

### 8. **Positions** — Board States

**Why:** Deduplicate FEN strings and enable position-based analysis.

**Purpose:**
- Track which positions appear most frequently
- Analyze position properties (material, phase of game)
- Enable "which models struggle in position X?" queries
- Avoid redundant FEN parsing across billions of moves

**Provenance:**
- first_seen: When did this position first appear?
- last_seen: Most recent occurrence
- occurrence_count: How many games?

**Queries:**
- "How many times has position X occurred?"
- "Most common endgame positions"
- "Positions where tinyllama won > 80%"

**Schema:**
```sql
positions (
  fen TEXT PRIMARY KEY,             -- Standard FEN (unique key)
  
  -- Frequency
  occurrence_count INTEGER,         -- How many times appeared?
  
  -- Position classification
  white_pieces INTEGER,
  black_pieces INTEGER,
  is_endgame BOOLEAN,               -- Material-based
  is_check BOOLEAN,                 -- Derived from FEN
  
  -- Timing
  first_seen INTEGER,               -- Timestamp of first occurrence
  last_seen INTEGER                 -- Timestamp of most recent
)

INDEX: (occurrence_count DESC)
INDEX: (is_endgame)
INDEX: (is_check)
```

**Expected Size:** 1M-100M unique FENs

---

## DERIVED ANALYTICS: Always Regenerable

These tables pre-compute common queries for performance. **Every derived table can be completely rebuilt from immutable records.**

If all derived tables were deleted, AI Commander should be able to rebuild them without any loss of information.

---

### 9. **Game Statistics** (Derived, stored in games table)

**Denormalized into games table:**
```sql
-- Add to games table:
white_illegal_moves INTEGER DEFAULT 0,
black_illegal_moves INTEGER DEFAULT 0,
avg_latency_ms INTEGER,
max_latency_ms INTEGER,
parsing_errors INTEGER DEFAULT 0
```

**Regeneration:** After game completes, compute from moves table.

---

### 10. **Run Statistics** (Derived, stored in runs table)

**Denormalized into runs table:**
```sql
-- Add to runs table:
completed_game_count INTEGER,
white_wins INTEGER,
black_wins INTEGER,
draws INTEGER,
avg_game_duration_ms INTEGER,
avg_decision_latency_ms INTEGER,
illegal_move_count INTEGER
```

**Regeneration:** After run completes, aggregate from games table.

---

### 11. **Opening Statistics** (Derived Table)

**Why:** Pre-compute opening performance to avoid scanning all games.

**Purpose:**
- "Which openings does tinyllama prefer?"
- "Win rate by opening"
- "Opening frequency"

**Regeneration:** SELECT DISTINCT opening_eco FROM games, aggregate results.

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
```

**Expected Size:** 500-5K unique openings

---

### 12. **Model Performance** (Derived Table)

**Why:** Quick leaderboard without scanning all games.

**Purpose:**
- "Model rankings by win rate"
- "Average latency per model"

**Regeneration:** SELECT white_model, black_model FROM games, aggregate.

**Schema:**
```sql
model_performance (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
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

UNIQUE INDEX: (model_name)
INDEX: (win_rate_percent DESC)
```

**Expected Size:** 5-20 models

---

### 13. **Elo Progression** (Derived Table)

**Why:** Track model strength evolution without manual updates.

**Purpose:**
- "How has tinyllama's strength changed?"
- "Detect improvements/regressions"

**Regeneration:** Iterate through games chronologically, calculate rolling Elo.

**Schema:**
```sql
elo_progression (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  checkpoint_number INTEGER,        -- Every 50 games
  elo_rating INTEGER,
  games_in_checkpoint INTEGER,
  timestamp INTEGER,
  last_updated INTEGER
)

INDEX: (model_name, checkpoint_number)
```

**Expected Size:** 1K-100K checkpoints

---

## IMMUTABLE vs DERIVED Summary

### Immutable (8 tables)
- Experiments
- Runs
- Environment Snapshots
- Model Configurations
- Games (with denormalized statistics)
- Moves
- LLM Decisions
- Positions

**Total:** ~8 core tables

**Characteristics:**
- Never modified after insertion
- Complete provenance on every record
- Traceable to experiment, run, git commit, timestamp
- Compressed, archived, shipped as research data

### Derived (5 tables + on-demand analysis)
- Game Statistics (in games table)
- Run Statistics (in runs table)
- Opening Statistics
- Model Performance
- Elo Progression

**Total:** ~3 separate derived tables

**Characteristics:**
- Pre-computed for performance
- Always regenerable from immutable data
- Can be deleted and rebuilt anytime
- Updated after runs/experiments complete

---

## Complete Provenance Template

Every immutable record should have:

```
experiment_id       -- Which research project?
run_id              -- Which execution instance?
git_commit          -- Code version
software_version    -- AI Commander version
model_version       -- Model version (for moves/decisions)
config_snapshot     -- Complete configuration
environment_id      -- Hardware/OS/software context
created_at          -- When was this recorded?
completed_at        -- When did action finish?
```

**Example: Game Record**
- Experiment: "tinyllama-vs-mistral-benchmark"
- Run: 1 (first execution)
- Git Commit: "abc123def456"
- Software Version: "1.0.0"
- White Model: "tinyllama" with config_id "cfg-001"
- Black Model: "mistral" with config_id "cfg-002"
- Environment: "env-snapshot-001" (Linux, 16 cores, Ollama 0.1.34)
- Created: 2026-07-22T14:30:00Z
- Completed: 2026-07-22T14:31:45Z

→ **Exact reproduction:** Use these exact inputs, get these exact outputs.

---

## Regeneration Guarantee

**Core Principle:** Derived analytics are always regenerable.

If we deleted all derived tables and queried only immutable data:

```javascript
// Rebuild opening stats from immutable games
SELECT opening_eco, COUNT(*) as occurrence_count, 
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as white_wins,
       SUM(CASE WHEN result='0.5' THEN 1 ELSE 0 END) as draws,
       SUM(CASE WHEN result='0' THEN 1 ELSE 0 END) as black_wins
FROM games
GROUP BY opening_eco

// Rebuild model performance
SELECT white_model as model,
       COUNT(*) as games,
       SUM(CASE WHEN result='1' THEN 1 ELSE 0 END) as wins
FROM games
WHERE white_model = ?
GROUP BY white_model

// Rebuild Elo progression
-- Iterate through games chronologically by timestamp
-- Calculate rolling Elo using Glicko-2 or Elo formula
```

**Everything is regenerable from immutable core.**

---

## Storage Architecture

```
┌─────────────────────────────────────────┐
│       AI Commander Research Store       │
│                                         │
│  ┌─ Immutable Core ─────────────────┐  │
│  │ (Never changes, complete record)  │  │
│  │                                   │  │
│  │  Experiments                      │  │
│  │  Runs                             │  │
│  │  Environment Snapshots            │  │
│  │  Model Configs                    │  │
│  │  Games (with stats)               │  │
│  │  Moves                            │  │
│  │  LLM Decisions                    │  │
│  │  Positions                        │  │
│  │                                   │  │
│  │  → Complete provenance on every   │  │
│  │    record                         │  │
│  │  → Traceable to experiment        │  │
│  │  → Reproducible from captured     │  │
│  │    inputs                         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ Derived Analytics ──────────────┐  │
│  │ (Always regenerable)              │  │
│  │                                   │  │
│  │  Opening Statistics               │  │
│  │  Model Performance                │  │
│  │  Elo Progression                  │  │
│  │  (+ on-demand: Tactical Events,   │  │
│  │   Engine Analysis, etc.)          │  │
│  │                                   │  │
│  │  → Pre-computed for speed         │  │
│  │  → Can be deleted anytime         │  │
│  │  → Rebuild from immutable data    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  API Layer (Hidden Implementation)      │
│  → recordExperiment()                   │
│  → recordGame()                         │
│  → recordMove()                         │
│  → recordDecision()                     │
│  → query()                              │
│  → modelPerformance()                   │
│  → eloProgression()                     │
│  → rebuildDerivedAnalytics()            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Design Validation Checklist

✅ **Scientific Traceability**
- Every immutable record traces back to its experiment
- Complete provenance on every entity
- Can answer "how was this produced?"

✅ **Reproducibility**
- All inputs captured (models, configs, environment)
- All outputs recorded (results, decisions, positions)
- Same inputs → same outputs guarantee

✅ **Immutable Core**
- 8 core tables that never change
- Complete historical record
- Can be archived, compressed, distributed

✅ **Regenerable Analytics**
- 5 derived tables always regenerable from core
- Can delete and rebuild without loss
- Pre-computed for performance, not for correctness

✅ **Research Hierarchy**
- Experiment → Run → Game → Move → Decision → Position
- Natural nesting for research organization
- Easy to filter "show me all games from experiment X"

✅ **No Derived-as-Truth**
- Never query derived tables for scientific conclusions
- Always regenerate to ensure consistency
- Source of truth is immutable core

---

## Next: Implementation Planning

Once approved:

1. **Phase 1: Core Schema**
   - Create all 8 immutable tables with complete DDL
   - Define all indexes (strategic, not excessive)
   - Validate foreign key relationships

2. **Phase 2: API Layer**
   - Hide storage implementation
   - recordExperiment(), recordGame(), recordMove(), recordDecision()
   - Clean query interface

3. **Phase 3: Integration**
   - Hook into arena.js (record games)
   - Hook into real-chess-game.js (record moves)
   - Async batch writes (non-blocking)

4. **Phase 4: Derived Analytics**
   - Opening statistics aggregation
   - Model performance leaderboard
   - Elo progression calculation
   - Regeneration routines

---

## Principles Satisfied

✅ **Experiment-centric** — Everything traces to experiment

✅ **Complete Provenance** — Every record has git_commit, timestamp, configuration, environment

✅ **Reproducibility** — All inputs captured for exact reproduction

✅ **Immutable Core** — Historical facts never change

✅ **Derived is Regenerable** — Analytics rebuild from raw data

✅ **No External Dependencies** — Embedded SQLite, fully self-contained

✅ **Scientific Integrity** — Immutable records as source of truth

---

**Status:** Ready for implementation.

