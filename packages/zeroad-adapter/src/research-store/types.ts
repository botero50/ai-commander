/**
 * EPIC 14: Research Data Store - Type Definitions
 *
 * Complete type definitions for all immutable research artifacts.
 * These types enforce the data model and ensure type safety across the application.
 */

// ============================================================================
// IMMUTABLE CORE: Research Artifacts
// ============================================================================

/**
 * Experiment: Research hypothesis and success criteria.
 * Entry point for all research activities.
 */
export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  description?: string;

  // Success criteria
  target_games?: number;
  success_criteria?: string;

  // Provenance
  git_commit: string;
  application_version: string;

  // Lifecycle
  status: 'in-progress' | 'completed' | 'failed';
  created_at: number;
  completed_at?: number;
  notes?: string;

  updated_at: number;
}

// ============================================================================

/**
 * Run: Execution instance of an experiment.
 * Captures exact conditions of each execution.
 */
export interface Run {
  id: string;
  experiment_id: string;
  run_number: number;

  // Execution configuration (immutable snapshot)
  config_snapshot: string; // JSON
  environment_snapshot_id: string;

  // Provenance: Exact execution context
  git_commit: string;
  application_version: string;
  random_seed?: string;

  // Execution timeline
  execution_start: number;
  execution_end?: number;
  status: 'in-progress' | 'completed' | 'failed';
  created_at: number;

  // Run metrics
  target_game_count?: number;
  completed_game_count: number;
  notes?: string;

  updated_at: number;
}

// ============================================================================

/**
 * EnvironmentSnapshot: Complete system context at execution time.
 * Enables reproducibility of exact conditions.
 */
export interface EnvironmentSnapshot {
  id: string;
  experiment_id: string;
  run_id?: string;

  // System information
  os: string;
  os_version: string;
  os_release?: string;

  // Node.js runtime
  node_version: string;
  npm_version?: string;
  pnpm_version?: string;

  // Hardware
  cpu_model?: string;
  cpu_cores?: number;
  ram_gb?: number;
  storage_available_gb?: number;

  // Ollama/Model serving
  ollama_version?: string;
  ollama_location?: string;
  ollama_cache_dir?: string;

  // Chess/AI Commander
  chess_js_version?: string;
  chess_adapter_version?: string;

  // Network
  network_latency_to_ollama_ms?: number;

  // Extensible metadata
  other_metadata?: string; // JSON

  // Snapshot metadata
  created_at: number;
  captured_at: number;

  updated_at: number;
}

// ============================================================================

/**
 * ModelConfig: Immutable parameter set.
 * Configuration is never updated; new record created on parameter change.
 */
export interface ModelConfig {
  id: string;

  // Model identification
  model_identifier: string; // e.g., "ollama:tinyllama:7b"
  model_name: string;
  model_version: string;
  model_digest?: string;
  model_size?: string;

  // Sampling parameters
  temperature: number;
  top_p: number;
  top_k?: number;
  max_tokens: number;

  // Ollama-specific
  num_ctx?: number;
  num_threads?: number;
  num_gpu?: number;

  // Multi-provider support
  provider: 'ollama' | 'anthropic' | 'openai' | 'other';
  provider_version?: string;
  provider_config?: string; // JSON

  // Provenance
  experiment_id?: string;
  created_at: number;
  first_used_at?: number;
  last_used_at?: number;

  // Denormalized usage count
  usage_count: number;

  updated_at: number;
}

// ============================================================================

/**
 * Game: Complete chess game record.
 * Immutable record of what happened during a game execution.
 */
export interface Game {
  id: string;

  // Hierarchy
  experiment_id: string;
  run_id: string;
  game_number: number;

  // Players and configurations
  white_model: string;
  black_model: string;
  white_config_id: string;
  black_config_id: string;

  // Game result
  result: '1' | '0.5' | '0'; // white win, draw, black win
  termination?: string;

  // Chess notation
  pgn: string;
  final_fen: string;
  opening_eco?: string;
  opening_name?: string;

  // Game metrics
  move_count: number;
  duration_ms: number;

  // Environment context
  environment_snapshot_id: string;

  // Provenance: Exact reproduction info
  git_commit: string;
  application_version: string;
  random_seed?: string;
  engine_version?: string;

  // Execution timeline
  execution_start: number;
  execution_end: number;
  created_at: number;

  // Denormalized game statistics (computed once, then immutable)
  white_illegal_moves: number;
  black_illegal_moves: number;
  avg_latency_ms?: number;
  max_latency_ms?: number;
  parsing_errors: number;

  updated_at: number;
}

// ============================================================================

/**
 * Move: Individual move decision within a game.
 * Immutable record of decision latency, confidence, and legality.
 */
export interface Move {
  id: string;

  // Hierarchy
  game_id: string;
  experiment_id: string;
  run_id: string;
  move_number: number;

  // Move data
  color: 'white' | 'black';
  san: string;
  fen_before: string;
  fen_after: string;

  // Decision quality
  latency_ms: number;
  confidence: number; // 0-100
  is_legal: boolean;
  illegal_retry_count: number;

  // Model context
  model_name: string;
  model_config_id: string;

  // Provenance
  git_commit: string;
  application_version: string;
  execution_start: number;
  execution_end: number;
  created_at: number;

  updated_at: number;
}

// ============================================================================

/**
 * LLMDecision: Prompt/response pair for a move.
 * Immutable record of LLM input and output for analysis.
 */
export interface LLMDecision {
  id: string;

  // Hierarchy
  move_id: string;
  game_id: string;
  experiment_id: string;
  run_id: string;

  // Prompt information
  prompt: string;
  prompt_version?: string;
  prompt_hash?: string;
  prompt_template_name?: string;

  // LLM and parameters
  model_identifier: string;
  model_config_id: string;

  // Response information
  response: string;
  tokens_in?: number;
  tokens_out?: number;

  // Parsing and quality
  parsing_status: 'success' | 'failed' | 'malformed';
  parsed_move?: string;
  parsing_notes?: string;
  retry_count: number;

  // Provenance
  git_commit: string;
  application_version: string;
  execution_start: number;
  execution_end: number;
  created_at: number;

  updated_at: number;
}

// ============================================================================

/**
 * Position: Deduplicated board state (FEN).
 * Tracks occurrence frequency and properties.
 */
export interface Position {
  fen: string; // Primary key

  // Frequency tracking
  occurrence_count: number;

  // Position properties
  white_pieces?: number;
  black_pieces?: number;
  is_endgame?: boolean;
  is_check?: boolean;

  // Analysis hooks (for future extensibility)
  tactical_motif_tags?: string; // JSON array
  endgame_classification?: string;

  // Timeline
  first_seen?: number;
  last_seen?: number;

  updated_at: number;
}

// ============================================================================
// DERIVED ANALYTICS: Always regenerable
// ============================================================================

/**
 * OpeningStats: Opening performance (regenerable from games).
 * Pre-computed for quick analysis queries.
 */
export interface OpeningStats {
  id: string;
  eco_code: string;
  opening_name?: string;
  occurrence_count: number;
  white_wins: number;
  black_wins: number;
  draws: number;
  avg_moves?: number;
  last_updated: number;
}

// ============================================================================

/**
 * ModelPerformance: Model rankings (regenerable from games).
 * Leaderboard and performance summary.
 */
export interface ModelPerformance {
  id: string;
  model_identifier: string;
  games_as_white: number;
  games_as_black: number;
  wins_as_white: number;
  wins_as_black: number;
  total_wins: number;
  draws: number;
  losses: number;
  win_rate_percent?: number;
  avg_decision_latency_ms?: number;
  legal_move_rate_percent?: number;
  last_updated: number;
}

// ============================================================================

/**
 * EloProgression: Model strength evolution (regenerable from games).
 * Tracks Elo rating over time.
 */
export interface EloProgression {
  id: string;
  model_identifier: string;
  checkpoint_number: number;
  elo_rating?: number;
  games_in_checkpoint: number;
  timestamp?: number;
  last_updated: number;
}

// ============================================================================
// QUERIES AND VIEWS
// ============================================================================

/**
 * Complete game context with experiment and run details.
 */
export interface GameWithContext {
  id: string;
  experiment_id: string;
  experiment_name: string;
  run_id: string;
  game_number: number;
  white_model: string;
  black_model: string;
  result: '1' | '0.5' | '0';
  move_count: number;
  duration_ms: number;
  opening_eco?: string;
  opening_name?: string;
  pgn: string;
  created_at: number;
}

/**
 * Move with complete context.
 */
export interface MoveWithContext {
  id: string;
  game_id: string;
  move_number: number;
  color: 'white' | 'black';
  san: string;
  latency_ms: number;
  confidence: number;
  is_legal: boolean;
  model_name: string;
  created_at: number;
}

/**
 * LLM decision with parsing summary.
 */
export interface LLMDecisionSummary {
  id: string;
  move_id: string;
  model_identifier: string;
  parsing_status: 'success' | 'failed' | 'malformed';
  status_description: string;
  retry_count: number;
  prompt_length: number;
  response_length: number;
  tokens_in?: number;
  tokens_out?: number;
  created_at: number;
}

// ============================================================================
// INPUT TYPES FOR RECORDING DATA
// ============================================================================

export interface ExperimentInput {
  name: string;
  hypothesis: string;
  description?: string;
  target_games?: number;
  success_criteria?: string;
  git_commit: string;
  application_version: string;
}

export interface RunInput {
  experiment_id: string;
  run_number: number;
  config_snapshot: string;
  environment_snapshot_id: string;
  git_commit: string;
  application_version: string;
  random_seed?: string;
  target_game_count?: number;
}

export interface GameInput {
  experiment_id: string;
  run_id: string;
  game_number: number;
  white_model: string;
  black_model: string;
  white_config_id: string;
  black_config_id: string;
  result: '1' | '0.5' | '0';
  termination?: string;
  pgn: string;
  final_fen: string;
  opening_eco?: string;
  opening_name?: string;
  move_count: number;
  duration_ms: number;
  environment_snapshot_id: string;
  git_commit: string;
  application_version: string;
  random_seed?: string;
  engine_version?: string;
  execution_start: number;
  execution_end: number;
}

export interface MoveInput {
  game_id: string;
  experiment_id: string;
  run_id: string;
  move_number: number;
  color: 'white' | 'black';
  san: string;
  fen_before: string;
  fen_after: string;
  latency_ms: number;
  confidence: number;
  is_legal: boolean;
  illegal_retry_count?: number;
  model_name: string;
  model_config_id: string;
  git_commit: string;
  application_version: string;
  execution_start: number;
  execution_end: number;
}

export interface LLMDecisionInput {
  move_id: string;
  game_id: string;
  experiment_id: string;
  run_id: string;
  prompt: string;
  prompt_version?: string;
  prompt_hash?: string;
  prompt_template_name?: string;
  model_identifier: string;
  model_config_id: string;
  response: string;
  tokens_in?: number;
  tokens_out?: number;
  parsing_status: 'success' | 'failed' | 'malformed';
  parsed_move?: string;
  parsing_notes?: string;
  retry_count?: number;
  git_commit: string;
  application_version: string;
  execution_start: number;
  execution_end: number;
}
