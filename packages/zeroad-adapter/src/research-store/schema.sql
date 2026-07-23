-- EPIC 14: Research Data Store - SQLite 3 Schema
-- Complete immutable research artifact database for AI Commander
--
-- Principles:
-- 1. Experiment-centric hierarchy
-- 2. Complete provenance on every record
-- 3. Immutable core (never update, only insert)
-- 4. Scientific reproducibility
-- 5. Self-contained embedded SQLite

-- ============================================================================
-- IMMUTABLE CORE: Research Artifacts (Never changes after insertion)
-- ============================================================================

-- 1. EXPERIMENTS: Research hypothesis and success criteria
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  description TEXT,

  -- Success criteria
  target_games INTEGER,
  success_criteria TEXT,

  -- Provenance: How was this experiment defined?
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'failed')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  notes TEXT,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_experiments_created_at ON experiments(created_at);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);

-- ============================================================================

-- 2. RUNS: Execution instances of experiments
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  run_number INTEGER NOT NULL,

  -- Execution configuration (immutable)
  config_snapshot TEXT NOT NULL,  -- JSON of all settings
  environment_snapshot_id TEXT NOT NULL,

  -- Provenance: Exact execution context
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  random_seed TEXT,

  -- Execution timeline
  execution_start INTEGER NOT NULL,
  execution_end INTEGER,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'failed')),
  created_at INTEGER NOT NULL,

  -- Run metrics (computed once, then static)
  target_game_count INTEGER,
  completed_game_count INTEGER DEFAULT 0,
  notes TEXT,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign keys
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),
  FOREIGN KEY (environment_snapshot_id) REFERENCES environment_snapshots(id),

  -- Uniqueness constraint
  UNIQUE(experiment_id, run_number)
);

CREATE INDEX IF NOT EXISTS idx_runs_experiment_id ON runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_runs_execution_start ON runs(execution_start);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);

-- ============================================================================

-- 3. ENVIRONMENT_SNAPSHOTS: Complete system context
CREATE TABLE IF NOT EXISTS environment_snapshots (
  id TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  run_id TEXT,

  -- System information
  os TEXT NOT NULL,
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
  ollama_location TEXT,
  ollama_cache_dir TEXT,

  -- Chess/AI Commander
  chess_js_version TEXT,
  chess_adapter_version TEXT,

  -- Network
  network_latency_to_ollama_ms REAL,

  -- Extensible metadata
  other_metadata TEXT,  -- JSON for additional context

  -- Snapshot metadata
  created_at INTEGER NOT NULL,
  captured_at INTEGER NOT NULL,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign keys
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX IF NOT EXISTS idx_env_snapshots_experiment_id ON environment_snapshots(experiment_id);
CREATE INDEX IF NOT EXISTS idx_env_snapshots_run_id ON environment_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_env_snapshots_created_at ON environment_snapshots(created_at);

-- ============================================================================

-- 4. MODEL_CONFIGS: Immutable parameter sets
CREATE TABLE IF NOT EXISTS model_configs (
  id TEXT PRIMARY KEY,

  -- Model identification
  model_identifier TEXT NOT NULL,  -- "ollama:tinyllama:7b"
  model_name TEXT NOT NULL,        -- "tinyllama"
  model_version TEXT NOT NULL,     -- Ollama version tag
  model_digest TEXT,               -- Ollama model digest
  model_size TEXT,                 -- "7b", "13b", etc.

  -- Sampling parameters
  temperature REAL NOT NULL,
  top_p REAL NOT NULL,
  top_k INTEGER,
  max_tokens INTEGER NOT NULL,

  -- Ollama-specific
  num_ctx INTEGER,
  num_threads INTEGER,
  num_gpu INTEGER,

  -- Multi-provider support
  provider TEXT DEFAULT 'ollama' CHECK (provider IN ('ollama', 'anthropic', 'openai', 'other')),
  provider_version TEXT,
  provider_config TEXT,  -- JSON for provider-specific settings

  -- Provenance
  experiment_id TEXT,  -- Which research first used this?
  created_at INTEGER NOT NULL,
  first_used_at INTEGER,
  last_used_at INTEGER,

  -- Denormalized usage
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),

  -- Ensures exact configurations are unique
  UNIQUE(
    model_identifier,
    temperature, top_p, top_k, max_tokens,
    num_ctx, num_threads, num_gpu,
    provider, provider_version
  )
);

CREATE INDEX IF NOT EXISTS idx_model_configs_model_name ON model_configs(model_name);
CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
CREATE INDEX IF NOT EXISTS idx_model_configs_created_at ON model_configs(created_at);

-- ============================================================================

-- 5. GAMES: Chess game records
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,

  -- Hierarchy
  experiment_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  game_number INTEGER NOT NULL,

  -- Players and configurations
  white_model TEXT NOT NULL,
  black_model TEXT NOT NULL,
  white_config_id TEXT NOT NULL,
  black_config_id TEXT NOT NULL,

  -- Game result
  result TEXT NOT NULL CHECK (result IN ('1', '0.5', '0')),
  termination TEXT,  -- "checkmate", "stalemate", "resignation", etc.

  -- Chess notation
  pgn TEXT NOT NULL,
  final_fen TEXT NOT NULL,
  opening_eco TEXT,
  opening_name TEXT,

  -- Game metrics
  move_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,

  -- Environment context
  environment_snapshot_id TEXT NOT NULL,

  -- Provenance: Exact reproduction info
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  random_seed TEXT,
  engine_version TEXT,

  -- Execution timeline
  execution_start INTEGER NOT NULL,
  execution_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL,

  -- Denormalized game statistics (computed once, then static)
  white_illegal_moves INTEGER DEFAULT 0,
  black_illegal_moves INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  max_latency_ms INTEGER,
  parsing_errors INTEGER DEFAULT 0,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign keys
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (white_config_id) REFERENCES model_configs(id),
  FOREIGN KEY (black_config_id) REFERENCES model_configs(id),
  FOREIGN KEY (environment_snapshot_id) REFERENCES environment_snapshots(id),

  -- Uniqueness constraint
  UNIQUE(run_id, game_number)
);

CREATE INDEX IF NOT EXISTS idx_games_experiment_id ON games(experiment_id);
CREATE INDEX IF NOT EXISTS idx_games_run_id ON games(run_id);
CREATE INDEX IF NOT EXISTS idx_games_white_model ON games(white_model, result);
CREATE INDEX IF NOT EXISTS idx_games_black_model ON games(black_model, result);
CREATE INDEX IF NOT EXISTS idx_games_opening_eco ON games(opening_eco);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- ============================================================================

-- 6. MOVES: Individual move decisions
CREATE TABLE IF NOT EXISTS moves (
  id TEXT PRIMARY KEY,

  -- Hierarchy
  game_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,  -- Denorm for speed
  run_id TEXT NOT NULL,         -- Denorm for speed
  move_number INTEGER NOT NULL,

  -- Move data
  color TEXT NOT NULL CHECK (color IN ('white', 'black')),
  san TEXT NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,

  -- Decision quality
  latency_ms INTEGER NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  is_legal BOOLEAN NOT NULL,
  illegal_retry_count INTEGER DEFAULT 0,

  -- Model context
  model_name TEXT NOT NULL,
  model_config_id TEXT NOT NULL,

  -- Provenance
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  execution_start INTEGER NOT NULL,
  execution_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign keys
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (model_config_id) REFERENCES model_configs(id),

  -- Uniqueness constraint
  UNIQUE(game_id, move_number)
);

CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_experiment_id ON moves(experiment_id);
CREATE INDEX IF NOT EXISTS idx_moves_is_legal ON moves(is_legal);
CREATE INDEX IF NOT EXISTS idx_moves_latency_ms ON moves(latency_ms);
CREATE INDEX IF NOT EXISTS idx_moves_created_at ON moves(created_at);

-- ============================================================================

-- 7. LLM_DECISIONS: Prompt/response pairs
CREATE TABLE IF NOT EXISTS llm_decisions (
  id TEXT PRIMARY KEY,

  -- Hierarchy
  move_id TEXT NOT NULL,
  game_id TEXT NOT NULL,         -- Denorm for speed
  experiment_id TEXT NOT NULL,   -- Denorm for speed
  run_id TEXT NOT NULL,          -- Denorm for speed

  -- Prompt information
  prompt TEXT NOT NULL,
  prompt_version TEXT,
  prompt_hash TEXT,
  prompt_template_name TEXT,

  -- LLM and parameters
  model_identifier TEXT NOT NULL,
  model_config_id TEXT NOT NULL,

  -- Response information
  response TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,

  -- Parsing and quality
  parsing_status TEXT NOT NULL CHECK (parsing_status IN ('success', 'failed', 'malformed')),
  parsed_move TEXT,
  parsing_notes TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Provenance
  git_commit TEXT NOT NULL,
  application_version TEXT NOT NULL,
  execution_start INTEGER NOT NULL,
  execution_end INTEGER NOT NULL,
  created_at INTEGER NOT NULL,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign keys
  FOREIGN KEY (move_id) REFERENCES moves(id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  FOREIGN KEY (experiment_id) REFERENCES experiments(id),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (model_config_id) REFERENCES model_configs(id)
);

CREATE INDEX IF NOT EXISTS idx_llm_decisions_move_id ON llm_decisions(move_id);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_game_id ON llm_decisions(game_id);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_experiment_id ON llm_decisions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_model_id ON llm_decisions(model_identifier);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_parsing_status ON llm_decisions(parsing_status);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_prompt_hash ON llm_decisions(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_llm_decisions_created_at ON llm_decisions(created_at);

-- ============================================================================

-- 8. POSITIONS: Deduplicated board states
CREATE TABLE IF NOT EXISTS positions (
  fen TEXT PRIMARY KEY,

  -- Frequency tracking
  occurrence_count INTEGER DEFAULT 1,

  -- Position properties
  white_pieces INTEGER,
  black_pieces INTEGER,
  is_endgame BOOLEAN,
  is_check BOOLEAN,

  -- Analysis hooks (for future extensibility)
  tactical_motif_tags TEXT,        -- JSON array of detected tactics
  endgame_classification TEXT,     -- Type of endgame (if applicable)

  -- Timeline
  first_seen INTEGER,
  last_seen INTEGER,

  -- Timestamps
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_positions_occurrence_count ON positions(occurrence_count DESC);
CREATE INDEX IF NOT EXISTS idx_positions_is_endgame ON positions(is_endgame);
CREATE INDEX IF NOT EXISTS idx_positions_is_check ON positions(is_check);

-- ============================================================================
-- DERIVED ANALYTICS: Always regenerable from immutable core
-- ============================================================================

-- 9. OPENING_STATS: Opening performance (regenerable from games)
CREATE TABLE IF NOT EXISTS opening_stats (
  id TEXT PRIMARY KEY,
  eco_code TEXT NOT NULL UNIQUE,
  opening_name TEXT,
  occurrence_count INTEGER DEFAULT 0,
  white_wins INTEGER DEFAULT 0,
  black_wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  avg_moves INTEGER,
  last_updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_opening_stats_eco_code ON opening_stats(eco_code);
CREATE INDEX IF NOT EXISTS idx_opening_stats_occurrence ON opening_stats(occurrence_count DESC);

-- ============================================================================

-- 10. MODEL_PERFORMANCE: Model rankings (regenerable from games)
CREATE TABLE IF NOT EXISTS model_performance (
  id TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL UNIQUE,
  games_as_white INTEGER DEFAULT 0,
  games_as_black INTEGER DEFAULT 0,
  wins_as_white INTEGER DEFAULT 0,
  wins_as_black INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_rate_percent REAL,
  avg_decision_latency_ms INTEGER,
  legal_move_rate_percent REAL,
  last_updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_perf_identifier ON model_performance(model_identifier);
CREATE INDEX IF NOT EXISTS idx_model_perf_win_rate ON model_performance(win_rate_percent DESC);

-- ============================================================================

-- 11. ELO_PROGRESSION: Strength evolution (regenerable from games)
CREATE TABLE IF NOT EXISTS elo_progression (
  id TEXT PRIMARY KEY,
  model_identifier TEXT NOT NULL,
  checkpoint_number INTEGER NOT NULL,
  elo_rating INTEGER,
  games_in_checkpoint INTEGER DEFAULT 0,
  timestamp INTEGER,
  last_updated INTEGER NOT NULL,

  -- Uniqueness constraint
  UNIQUE(model_identifier, checkpoint_number)
);

CREATE INDEX IF NOT EXISTS idx_elo_model_id ON elo_progression(model_identifier);
CREATE INDEX IF NOT EXISTS idx_elo_checkpoint ON elo_progression(checkpoint_number);
CREATE INDEX IF NOT EXISTS idx_elo_timestamp ON elo_progression(timestamp);

-- ============================================================================
-- EXTENSIONS: Prepared for future artifact types
-- ============================================================================

-- Future: ENGINE_EVALUATIONS (when chess engine integration added)
-- CREATE TABLE IF NOT EXISTS engine_evaluations (
--   id TEXT PRIMARY KEY,
--   position_fen TEXT NOT NULL,
--   engine_version TEXT NOT NULL,
--   evaluation_cp INTEGER,
--   best_move_san TEXT,
--   depth INTEGER,
--   search_time_ms INTEGER,
--   created_at INTEGER NOT NULL,
--   FOREIGN KEY (position_fen) REFERENCES positions(fen)
-- );

-- Future: TACTICAL_EVENTS (when pattern detection added)
-- CREATE TABLE IF NOT EXISTS tactical_events (
--   id TEXT PRIMARY KEY,
--   game_id TEXT NOT NULL,
--   move_number INTEGER NOT NULL,
--   event_type TEXT,
--   severity TEXT,
--   description TEXT,
--   created_at INTEGER NOT NULL,
--   FOREIGN KEY (game_id) REFERENCES games(id)
-- );

-- ============================================================================
-- VIEWS: Common query patterns
-- ============================================================================

-- View: Games with complete context
CREATE VIEW IF NOT EXISTS v_games_with_context AS
SELECT
  g.id,
  g.experiment_id,
  g.run_id,
  e.name as experiment_name,
  g.game_number,
  g.white_model,
  g.black_model,
  g.result,
  g.move_count,
  g.duration_ms,
  g.opening_eco,
  g.opening_name,
  g.pgn,
  g.created_at
FROM games g
JOIN experiments e ON g.experiment_id = e.id;

-- View: Moves with complete context
CREATE VIEW IF NOT EXISTS v_moves_with_context AS
SELECT
  m.id,
  m.game_id,
  m.move_number,
  m.color,
  m.san,
  m.latency_ms,
  m.confidence,
  m.is_legal,
  m.model_name,
  m.created_at
FROM moves m
ORDER BY m.game_id, m.move_number;

-- View: LLM decisions with parsing status
CREATE VIEW IF NOT EXISTS v_llm_decisions_summary AS
SELECT
  l.id,
  l.move_id,
  l.model_identifier,
  l.parsing_status,
  CASE
    WHEN l.parsing_status = 'success' THEN 'Success'
    WHEN l.parsing_status = 'failed' THEN 'Failed'
    ELSE 'Malformed'
  END as status_description,
  l.retry_count,
  LENGTH(l.prompt) as prompt_length,
  LENGTH(l.response) as response_length,
  l.tokens_in,
  l.tokens_out,
  l.created_at
FROM llm_decisions l;

-- ============================================================================
-- INTEGRITY CHECKS (Run after data insertion)
-- ============================================================================

-- Check: Game move count should match moves table
-- SELECT g.id, g.move_count, COUNT(m.id) as actual_moves
-- FROM games g
-- LEFT JOIN moves m ON g.id = m.game_id
-- GROUP BY g.id
-- HAVING g.move_count != actual_moves;

-- Check: All moves should have corresponding LLM decision
-- SELECT m.id
-- FROM moves m
-- LEFT JOIN llm_decisions l ON m.id = l.move_id
-- WHERE l.id IS NULL;

-- ============================================================================
-- METADATA: Schema information
-- ============================================================================

-- Immutable tables (8)
-- 1. experiments
-- 2. runs
-- 3. environment_snapshots
-- 4. model_configs
-- 5. games
-- 6. moves
-- 7. llm_decisions
-- 8. positions

-- Derived tables (3)
-- 9. opening_stats
-- 10. model_performance
-- 11. elo_progression

-- Total: 11 tables
-- Indexes: 30+
-- Foreign key relationships: 15+

-- ============================================================================
