# EPIC 14: Research Data Store - Optimized for Chess Analysis

**Philosophy:** Design the storage for analytical queries over millions of games, not OLTP. Separate immutable facts from derived analytics. Every table exists because research needs it, not because normalization suggests it.

**Target Use Cases:**
- "Show me all games where tinyllama played Sicilian Defense"
- "Compare win rates: tinyllama vs mistral in the endgame"
- "Find all illegal moves across all games"
- "Track Elo progression for each model over time"
- "Identify which opening categories tinyllama struggles in"
- "Show me decision latency percentiles over 10M moves"
- "Which positions appear most frequently?"
- "Which tactical motifs does mistral fail to recognize?"

---

## Core Principle: Immutable Facts + Derived Analytics

### Immutable (Never changes after insertion)
These records capture exactly what happened during research execution.

### Derived (Recomputable from immutable records)
These pre-compute common queries for performance. Always regeneratable.

---

## IMMUTABLE HISTORICAL DATA

### 1. **Experiments**

**Why:** Entry point for research tracking. Needed to organize related runs and group results.

**Purpose:**
- Track research hypotheses and configurations
- Group games into logical research sessions
- Enable reproducibility across runs
- Store experiment-level metadata (hypothesis, git commit, environment snapshot)

**Queries:**
- "List all experiments"
- "Get experiment details for experiment_id=42"
- "Which experiments used model X?"

**Could this live elsewhere?** No. It's the root entity for grouping research activities.

**Schema:**
```sql
experiments (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,               -- "tinyllama vs mistral benchmark"
  hypothesis TEXT,                  -- Research question
  git_commit TEXT,                  -- Reproducibility
  created_at INTEGER NOT NULL,      -- Timestamp
  completed_at INTEGER,             -- When finished
  status TEXT,                       -- 'in-progress' | 'completed' | 'failed'
  notes TEXT                         -- Free-form metadata
)

INDEX: (created_at)
```

**Expected growth:** 100-1000 per year (slow growth)

---

### 2. **Runs**

**Why:** Track individual experimental iterations. One experiment can have multiple runs (e.g., repeat same config 5 times).

**Purpose:**
- Isolate individual execution sessions
- Track which games belong to which run
- Enable statistical analysis across runs (variance, stability)

**Queries:**
- "Get all runs for experiment_id=42"
- "Compare run A vs run B statistics"

**Could this live elsewhere?** Could be merged into Games (run_id as optional column), but separating enables:
- Run-level statistics without aggregating all games
- Comparison of identical configs across multiple runs (stability analysis)
- Run-level metadata (start/end time, configuration snapshot)

**Schema:**
```sql
runs (
  id TEXT PRIMARY KEY,              -- UUID
  experiment_id TEXT NOT NULL,      -- FK experiments.id
  run_number INTEGER NOT NULL,      -- Which run within experiment
  config_snapshot TEXT NOT NULL,    -- JSON of all settings (for reproducibility)
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT,                       -- 'in-progress' | 'completed' | 'failed'
  game_count INTEGER                -- Denormalized for quick lookup
)

UNIQUE INDEX: (experiment_id, run_number)
INDEX: (experiment_id, created_at)
```

**Expected growth:** 1000-10K runs (one run might have 1000+ games)

---

### 3. **Games**

**Why:** Core immutable fact. Every game is a historical record of what happened.

**Purpose:**
- Store complete game record (moves, result, duration)
- Link to players (models), experiment, run
- Enable queries by result, opening, player, timeframe

**Queries:**
- "All games where tinyllama was white"
- "Games that ended in move 25"
- "Games in run 5"
- "All draws"
- "Games between 2:00 PM and 3:00 PM"

**Schema:**
```sql
games (
  id TEXT PRIMARY KEY,              -- UUID
  run_id TEXT NOT NULL,             -- FK runs.id
  experiment_id TEXT NOT NULL,      -- Denorm for speed
  game_number INTEGER NOT NULL,     -- Sequence in run
  white_model TEXT NOT NULL,        -- Model name (e.g., "tinyllama")
  black_model TEXT NOT NULL,
  result TEXT NOT NULL,             -- '1' (white win) | '0.5' (draw) | '0' (black win)
  move_count INTEGER NOT NULL,      -- Total moves
  duration_ms INTEGER NOT NULL,     -- Game execution time
  pgn TEXT NOT NULL,                -- Full PGN notation
  final_fen TEXT NOT NULL,          -- Position after last move
  opening_eco TEXT,                 -- ECO code if recognized (e.g., "B20")
  created_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
)

INDEX: (run_id, game_number)
INDEX: (experiment_id, created_at)
INDEX: (white_model, result)
INDEX: (black_model, result)
INDEX: (opening_eco)
INDEX: (created_at)  -- For time-range queries
```

**Expected growth:** 1M-100M games (billions of bytes, but highly compressible)

**Note:** PGN and FEN are textual but searchable. No separate position table needed at this level.

---

### 4. **Moves**

**Why:** Immutable record of every move decision and its quality. Enables move-level analysis.

**Purpose:**
- Store every move with latency, confidence, legality
- Link to game and position
- Enable analysis of decision quality over time

**Queries:**
- "All illegal moves"
- "Decision latency percentiles"
- "Moves by model X"
- "High-confidence moves that were blunders"
- "Moves with latency > 2000ms"

**Schema:**
```sql
moves (
  id TEXT PRIMARY KEY,              -- UUID
  game_id TEXT NOT NULL,            -- FK games.id
  move_number INTEGER NOT NULL,     -- 1, 2, 3, ...
  color TEXT NOT NULL,              -- 'white' | 'black'
  san TEXT NOT NULL,                -- "e4" standard algebraic
  fen_before TEXT NOT NULL,         -- Position before this move
  latency_ms INTEGER NOT NULL,      -- Time to decide
  confidence INTEGER NOT NULL,      -- 0-100
  is_legal BOOLEAN NOT NULL,        -- true if valid, false if retry
  illegal_retry_count INTEGER,      -- How many illegal attempts before this
  created_at INTEGER NOT NULL
)

INDEX: (game_id, move_number)
INDEX: (color, is_legal)  -- Find illegal moves
INDEX: (latency_ms)       -- Performance analysis
INDEX: (created_at)       -- Time-series analysis
```

**Expected growth:** 25M-2.5B moves (25+ per game across 1M-100M games)

**Why separate from games?**
- Games table would be massive (25 rows each)
- Move-level queries are common (latency, legality, quality)
- Enables efficient filtering by move properties

---

### 5. **LLM Decisions**

**Why:** Immutable record of what the LLM was asked and what it responded. Enables decision analysis and debugging.

**Purpose:**
- Store exact prompt, response, model parameters for every move
- Enable analysis of LLM behavior
- Support reproducibility (exact inputs → exact outputs)
- Enable decision quality analysis (did LLM choose best available move?)

**Queries:**
- "All decisions by mistral"
- "Decisions with parsing failures"
- "Decisions where response was malformed"
- "Decisions where the LLM chose move X"

**Schema:**
```sql
llm_decisions (
  id TEXT PRIMARY KEY,              -- UUID
  move_id TEXT NOT NULL,            -- FK moves.id
  game_id TEXT NOT NULL,            -- Denorm for speed
  model TEXT NOT NULL,              -- "tinyllama", "mistral", etc.
  prompt TEXT NOT NULL,             -- Full prompt sent to Ollama
  response TEXT NOT NULL,           -- Full response received
  tokens_in INTEGER,                -- Input tokens (if available)
  tokens_out INTEGER,               -- Output tokens
  temperature REAL,                 -- Model temperature
  top_p REAL,                       -- Sampling parameter
  max_tokens INTEGER,               -- Limit set
  parsing_status TEXT,              -- 'success' | 'failed' | 'malformed'
  parsed_move TEXT,                 -- Extracted move (SAN)
  retry_count INTEGER,              -- How many parsing retries
  created_at INTEGER NOT NULL
)

INDEX: (move_id)
INDEX: (model, created_at)
INDEX: (parsing_status)
```

**Expected growth:** 25M-2.5B (one per move)

**Why separate from moves?**
- Moves table is already large
- LLM data is verbose (prompts, responses are kilobytes each)
- LLM queries (by model, by parsing status) are common but separate from move analysis
- Enables storing LLM data separately if needed (e.g., archive old responses)

---

### 6. **Positions**

**Why:** Deduplicate FEN strings and enable position-based analysis.

**Purpose:**
- Track which positions appear most frequently
- Analyze position properties (material count, mobility, safety)
- Enable "which positions does model X struggle in?" queries
- Avoid storing redundant FEN data

**Queries:**
- "How many times has position X occurred?"
- "Positions where white is up a pawn"
- "Most common opening positions"
- "Positions where model X has won > 80%"

**Could this live in moves?** Technically yes, but:
- Positions are deduplicated (same FEN appears in thousands of games)
- Position-level analysis is common (endgame classification, material balance)
- Storing position metadata separately enables caching and analysis

**Schema:**
```sql
positions (
  fen TEXT PRIMARY KEY,             -- Standard FEN (unique key)
  occurrence_count INTEGER,         -- How many times has this FEN appeared?
  white_material JSONB,             -- {pawns: 8, knights: 2, ...}
  black_material JSONB,
  white_pieces INTEGER,             -- Total piece count
  black_pieces INTEGER,
  is_endgame BOOLEAN,               -- Material-based classification
  is_check BOOLEAN,                 -- Derived from FEN
  first_seen INTEGER,               -- Timestamp of first occurrence
  last_seen INTEGER                 -- Timestamp of most recent
)

INDEX: (occurrence_count DESC)  -- Find most common positions
INDEX: (is_endgame)
INDEX: (is_check)
```

**Expected growth:** 1M-100M unique FENs (deduplication from 2.5B move records)

**Why this helps:**
- Avoids redundant FEN parsing across 2.5B moves
- Enables "which models win in position X?" queries without scanning all moves
- Material counts pre-computed for endgame analysis

---

### 7. **Model Configurations**

**Why:** Immutable record of model parameters and Ollama settings.

**Purpose:**
- Track which model configuration was used in each game
- Enable reproducibility (exact temperature, top_p, etc.)
- Link models to their performance

**Queries:**
- "All games with tinyllama at temperature=0.5"
- "Configurations that were used only once"

**Could this live in games?** Could denormalize into games table, but:
- Multiple games can share exact same configuration
- Changes to config analysis don't require game table modifications
- Enables "compare config A vs config B" queries

**Schema:**
```sql
model_configs (
  id TEXT PRIMARY KEY,              -- UUID
  model_name TEXT NOT NULL,         -- "tinyllama", "mistral", etc.
  version TEXT,                     -- Model version if tracked
  temperature REAL NOT NULL,
  top_p REAL NOT NULL,
  max_tokens INTEGER NOT NULL,
  other_params JSONB,               -- Additional Ollama settings
  created_at INTEGER NOT NULL,
  first_used INTEGER,               -- When first appeared in a game
  usage_count INTEGER               -- Denormalized count
)

UNIQUE INDEX: (model_name, temperature, top_p, max_tokens)
INDEX: (created_at)
```

**Expected growth:** 10-100 configs (models × parameter combinations)

---

### 8. **Environment Snapshots**

**Why:** Reproducibility. Track hardware, OS, dependency versions at experiment time.

**Purpose:**
- Enable exact reproduction of conditions
- Analyze impact of environment changes
- Debug environment-specific issues

**Queries:**
- "All experiments run on Linux"
- "Experiments using Ollama version X"

**Could this live in experiments?** Could embed as JSON in experiments, but:
- Snapshots are large (many fields)
- Multiple runs in same experiment might have different snapshots
- Enables analyzing environment impact on performance

**Schema:**
```sql
environment_snapshots (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  run_id TEXT,                      -- Can be null (experiment-level)
  os TEXT,                          -- "Linux", "Windows", "macOS"
  os_version TEXT,
  node_version TEXT,
  cpu_cores INTEGER,
  ram_gb INTEGER,
  gpu_available BOOLEAN,
  ollama_version TEXT,
  chess_js_version TEXT,
  git_commit TEXT,
  created_at INTEGER NOT NULL
)

INDEX: (experiment_id)
INDEX: (run_id)
```

**Expected growth:** 100-10K snapshots (one per run, maybe one per experiment)

---

## DERIVED ANALYTICS

These are always recomputable from immutable data. Store for performance, regenerate when needed.

---

### 9. **Game Statistics** (Derived)

**Why:** Pre-computed per-game metrics to avoid recalculating on every analysis.

**Purpose:**
- Quick access to game-level summaries without scanning moves
- Enables fast filtering by legal move rate, avg latency, etc.

**Queries:**
- "Games with illegal move rate > 5%"
- "Games with decision latency > 3000ms avg"

**Could this live in games?** Yes, and it should (as denormalized columns).

**Actually: Store in games table**

Update games table to include:
```sql
-- Add to games table:
illegal_move_count INTEGER,        -- Denormalized from moves
legal_move_count INTEGER,
avg_latency_ms INTEGER,            -- Average decision latency
max_latency_ms INTEGER,            -- Slowest move
parsing_error_count INTEGER,       -- From LLM decisions
```

**Rationale:** These are computed once when game completes, then static. No need for separate table.

---

### 10. **Run Statistics** (Derived)

**Why:** Quick access to run-level summaries.

**Purpose:**
- Enable "run A vs run B" comparison without aggregating all games
- Detect run-level anomalies (e.g., unusually high crash rate)

**Could this live in runs table?** Yes.

**Actually: Store in runs table**

Update runs table to include:
```sql
-- Add to runs table:
total_moves INTEGER,
legal_moves INTEGER,
illegal_moves INTEGER,
avg_game_duration_ms INTEGER,
avg_decision_latency_ms INTEGER,
white_win_count INTEGER,
black_win_count INTEGER,
draw_count INTEGER,
```

**Rationale:** Computed once when run completes. Static after that.

---

### 11. **Opening Statistics** (Derived)

**Why:** Analyze opening performance across experiments.

**Purpose:**
- "Which openings does tinyllama prefer?"
- "Win rate by opening"
- "Opening frequency"

**Queries:**
- "All games in Sicilian Defense (B20-B99)"
- "Opening repertoire for model X"
- "Which openings appear most?"
- "Win rate by opening and color"

**Schema:**
```sql
opening_stats (
  id TEXT PRIMARY KEY,
  eco_code TEXT NOT NULL,           -- "B20", "E04", etc.
  opening_name TEXT,                -- "Sicilian Defense"
  occurrence_count INTEGER,         -- How many games
  white_wins INTEGER,
  black_wins INTEGER,
  draws INTEGER,
  avg_moves INTEGER,
  avg_game_duration_ms INTEGER,
  models_that_played JSONB,         -- ["tinyllama", "mistral"]
  first_occurrence INTEGER,
  last_occurrence INTEGER
)

UNIQUE INDEX: (eco_code)
INDEX: (occurrence_count DESC)
```

**Expected growth:** 500-5000 unique openings (chess has ~5000 named openings)

---

### 12. **Model Performance** (Derived)

**Why:** Quick leaderboard and performance summary.

**Purpose:**
- "Model rankings by win rate"
- "Average decision latency per model"
- "Move legality rate per model"

**Queries:**
- "Which model has highest win rate?"
- "Average latency: tinyllama vs mistral"
- "Illegal move rate per model"

**Schema:**
```sql
model_performance (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  games_played INTEGER,
  wins_as_white INTEGER,
  wins_as_black INTEGER,
  total_wins INTEGER,
  draws INTEGER,
  losses INTEGER,
  win_rate_percent REAL,
  avg_decision_latency_ms INTEGER,
  avg_moves_per_game INTEGER,
  legal_move_rate_percent REAL,
  last_updated INTEGER
)

UNIQUE INDEX: (model_name)
INDEX: (win_rate_percent DESC)
```

**Expected growth:** 5-20 models (slow growth)

**Regeneration:** Run after every N games or on-demand.

---

### 13. **Elo Progression** (Derived)

**Why:** Track model strength evolution over time.

**Purpose:**
- "How has tinyllama's Elo changed over time?"
- "Detect when model gets stronger/weaker"

**Queries:**
- "Elo progression for model X"
- "Elo change over last 100 games"

**Schema:**
```sql
elo_progression (
  id TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  checkpoint_number INTEGER,        -- Every 50 games, maybe
  elo_rating INTEGER,               -- Calculated from wins/losses
  games_in_checkpoint INTEGER,      -- 50 games per checkpoint
  timestamp INTEGER
)

INDEX: (model_name, checkpoint_number)
INDEX: (timestamp)
```

**Expected growth:** 1K-100K checkpoints (one per 50 games per model)

**Regeneration:** Recalculate from scratch when needed (iterative Elo calculation).

---

### 14. **Tactical Event Analysis** (Derived)

**Why:** Analyze decisions in critical positions.

**Purpose:**
- "Where did the game turn? (checkmate threats, material loss)"
- "Blunders and brilliant moves"
- "Did models recognize tactics?"

**Queries:**
- "All blunders in my dataset"
- "Games where opening led to win"
- "Check/capture sequences"

**Could this be separate from moves?** Could analyze on-the-fly from moves + positions, but:
- Event detection is computationally expensive
- Pre-storing events enables fast filtering
- But: events can be regenerated from positions + move quality

**Decision:** Generate on-demand, don't persist.

**Rationale:** Tactical event detection is algorithmic (depends on engine evaluation, position analysis). Store the input data (moves, positions), compute events when needed.

---

## DATA MODEL SUMMARY

### Immutable Core (Never changes)
1. **Experiments** — Research sessions
2. **Runs** — Execution instances within experiments
3. **Games** — Complete game records
4. **Moves** — Individual move decisions + metadata
5. **LLM Decisions** — Prompt/response pairs
6. **Positions** — Deduplicated FEN strings
7. **Model Configurations** — Parameter sets
8. **Environment Snapshots** — Reproducibility metadata

### Derived Analytics (Recomputable)
1. **Game Statistics** (stored in games table as denormalized columns)
2. **Run Statistics** (stored in runs table as denormalized columns)
3. **Opening Statistics** — Aggregated opening performance
4. **Model Performance** — Leaderboards and summaries
5. **Elo Progression** — Strength evolution over time

### Not Persisted (Generate on-demand)
- **Tactical Events** — Analyzed from positions + moves
- **Engine Comparisons** — Analyzed if Stockfish integrated
- **Tournament Standings** — Aggregated from games
- **Heat Maps** — Rendered from position data

---

## Indexing Strategy

**Core Queries to Support:**

| Query | Indexes Needed |
|-------|----------------|
| "All games by model X" | games(white_model), games(black_model) |
| "All games in opening Y" | games(opening_eco) |
| "All moves with latency > 2s" | moves(latency_ms) |
| "All illegal moves" | moves(is_legal) |
| "Games in time period Z" | games(created_at), moves(created_at) |
| "Position X frequency" | positions(occurrence_count) |
| "Run A vs Run B comparison" | runs(experiment_id) |
| "Model rankings" | model_performance(win_rate_percent) |

**Index Summary:**
- ~15 strategic indexes (not 100+)
- Focus on analytical query paths
- Avoid over-indexing (slows writes)

---

## Storage Requirements

**Estimated Size (per 10M games):**
- Games: ~5GB (simple records)
- Moves: ~150GB (25+ per game, relatively simple)
- LLM Decisions: ~1TB (prompts and responses are verbose)
- Positions: ~2GB (deduplicated)
- Other tables: ~50GB

**Total: ~1.2TB for 10M games**

**Compression:** SQLite with ZSTD compression or better could reduce by 50-80%.

---

## API Boundaries (Hidden Implementation)

The storage layer should expose a clean API:

```javascript
// Application code never knows about SQL or SQLite
const store = await researchStore.create();

// Recording data
await store.recordGame(gameData);
await store.recordMove(moveData);
await store.recordDecision(decisionData);

// Querying data
const games = await store.query('games', {
  where: {model: 'tinyllama', result: '1'},
  limit: 1000
});

const stats = await store.modelPerformance();
const elos = await store.eloProgression('tinyllama');

// Underlying storage can change without affecting this API
```

---

## Next Steps

1. **Validate the 8 immutable entities** — Is anything missing? Anything redundant?
2. **Validate the 5 derived tables** — Right balance of pre-computation vs on-demand?
3. **Challenge each index** — Do we really need each one?
4. **Finalize SQL schema** — Write complete CREATE TABLE statements
5. **Design the API layer** — How does application code interact with storage?
6. **Choose storage implementation** — SQLite 3 with WAL mode confirmed?

**Only after full approval should implementation begin.**

