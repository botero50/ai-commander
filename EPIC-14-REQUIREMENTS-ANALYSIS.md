# EPIC 14: Embedded Research Data Platform - Requirements Analysis

**Constraint:** No external services. Self-contained. Ships with AI Commander.

---

## Phase 1: Reverse Engineering Requirements from Future EPICs

### EPIC 15: Research Metrics
**Requires storing:**
- Win rate, draw rate, loss rate
- Elo estimation (needs game results over time)
- Move time statistics (avg, median, p95, p99)
- Token usage per move, per game
- Average context size
- Invalid move attempts
- Illegal move attempts
- Recovery count
- Timeout count
- Hallucination rate (needs move vs expected comparison)
- Blunder rate (needs quality classification)
- Mistake rate (needs quality classification)
- Brilliant moves (needs quality classification)
- Engine centipawn loss (needs Stockfish integration)
- Average evaluation swing (needs position evaluations)
- Opening diversity metrics
- Repeated opening detection
- Endgame success rate (needs endgame classification)
- Material imbalance statistics
- Tactical opportunity detection
- Tactical conversion rate
- Check frequency
- Capture frequency
- Promotion frequency
- Castling frequency

**Required entities:**
- Games (full history)
- Moves (with quality classification)
- Positions (evaluations)
- Models (for Elo calculation)
- Engine evaluations (for centipawn loss)

### EPIC 16: Experiment Tracking
**Requires storing:**
- Experiment ID, name, purpose, hypothesis
- Model versions used
- Temperature, top_p, max_tokens
- Thinking settings (if applicable)
- Seed (for reproducibility)
- Hardware (for reproducibility)
- Runtime (duration, completion status)
- Execution date
- Total games
- Experiment notes and tags
- Experiment comparison metadata

**Required entities:**
- Experiments (with full configuration)
- Experiment runs
- Experiment tags
- Games linked to experiments
- Configuration snapshots

### EPIC 17: Tournament Analytics
**Requires storing:**
- Tournament standings (points, games, etc.)
- Elo progression over time (per player, per tournament)
- Head-to-head records between models
- Opening preferences (which openings each model plays)
- White performance vs black performance
- Confidence intervals (needs statistical calculations)
- Statistical significance (needs multiple runs)
- Performance trends (needs time-series data)
- Ranking evolution (needs per-round snapshots)

**Required entities:**
- Tournaments
- Tournament rounds/standings
- Head-to-head records
- Elo progression (time-series)
- Opening preferences (per model)
- Statistical summary records

### EPIC 18: Opening Intelligence
**Requires storing:**
- ECO codes (for every opening)
- Opening names
- Opening tree (sequence of first moves)
- Frequency (how many times played)
- Success rate (by color, by model)
- Engine evaluation (best play)
- Model preference (which model plays which openings)
- Diversity score (repetition detection)
- Novelty detection (new move at position X)
- Transposition detection (same position reached via different moves)

**Required entities:**
- Openings (with ECO code)
- Opening sequences (move trees)
- Opening statistics (frequency, success by color)
- Transposition records
- Novelty markers

### EPIC 19: Endgame Intelligence
**Requires storing:**
- Endgame classification (KP, R, B, N, Q, etc.)
- Conversion rate (endgame wins / games with endgame)
- Drawing ability (endgame draws / total endgames)
- Mistake rate in endgame
- Optimality (moves vs engine best)
- Distance to mate (if applicable)
- Tablebase availability (if using)

**Required entities:**
- Endgames (classified by piece composition)
- Endgame statistics
- Tablebase reference (if used)

### EPIC 20: Position Analysis
**Requires storing:**
- FEN (position identifier)
- Move number
- Engine evaluation (centipawns)
- Material count (both sides)
- Mobility (legal moves available)
- King safety (both sides)
- Passed pawns (location, count)
- Center control (squares controlled)
- Tactical motifs (pins, forks, skewers, etc.)
- Evaluation change (before and after move)

**Required entities:**
- Positions (FEN-keyed)
- Position evaluations (engine analysis)
- Position metadata (material, mobility, etc.)
- Tactical motifs (detected in positions)

### EPIC 21: LLM Decision Intelligence
**Requires storing:**
- Complete prompt (every token)
- Complete response (every token)
- Reasoning (if captured in response)
- Parsed move (extracted SAN)
- Rejected candidates (alternatives considered)
- Retry count (failed parses before success)
- Latency (total time)
- Tokens (in, out, total)
- Confidence (0-100 or probability)
- Parsing failures (attempts and fixes)

**Analyze:**
- Consistency (same position → same move?)
- Hallucinations (moves not in legal list)
- Repeated reasoning (same explanation pattern)
- Strategic themes (what does model prioritize?)
- Tactical awareness (detects threats?)

**Required entities:**
- LLM decisions (full prompt/response)
- LLM response parsing (logs failures)
- Candidate moves (rejected alternatives)
- Move parsing results
- Confidence records

### EPIC 22: Engine Comparison
**Requires storing:**
- LLM move
- Stockfish best move
- Centipawn loss (CP difference)
- Best move agreement (0/1)
- Tactical accuracy (handled tactics correctly?)
- Positional accuracy (handled position correctly?)
- Blunder detection (move loses >300cp?)
- Move ranking (where was LLM move in Stockfish's ranking?)
- Evaluation difference (position eval change)

**Required entities:**
- Engine evaluations (Stockfish moves/evals)
- Move comparison (LLM vs engine)
- Centipawn loss calculations
- Ranking records

### EPIC 23: Statistical Analysis
**Requires storing:**
- Raw data points (for distribution calculation)
- Aggregated statistics (mean, median, std dev)
- Confidence intervals (calculated as needed)
- Significance tests (T-test, chi-square, etc.)
- Variance (per metric)
- Trend data (time-series points)
- Regression coefficients (for correlation analysis)
- Anomaly flags (statistical outliers)

**Materialized views:**
- Rolling averages (10-game, 50-game, etc.)
- Correlation matrices
- Distribution histograms

**Required entities:**
- Statistical summaries (pre-calculated)
- Time-series data points
- Anomaly records

### EPIC 24: Reproducibility
**Requires storing:**
- Random seed (for deterministic replay)
- Prompt version (exact prompt used)
- Model version (exact model and weights)
- Ollama version (LLM runtime)
- Engine version (Stockfish version if used)
- Git commit (code version)
- Execution environment (node version, OS)
- Configuration snapshot (all settings)
- Hardware profile (CPU, RAM, GPU)

**For every game:**
- Capture reproducibility metadata
- Enable exact replay with same seed/config

**Required entities:**
- Configuration snapshots (JSON)
- Environment snapshots (versions, OS)
- Reproducibility metadata (per game)

### EPIC 25: Reporting
**Generates:**
- Benchmark reports (model rankings, metrics)
- Tournament reports (standings, trends)
- Experiment summaries (hypothesis, results, conclusion)
- Regression reports (baseline vs current)
- Opening reports (frequency, success rates)
- Endgame reports (conversion, drawing)
- Model comparison reports (head-to-head)
- Research reports (narrative + charts)

**All require querying multiple entities** and aggregating data.

### EPIC 26: Reliability
**Requires:**
- Crash recovery (resume incomplete games)
- Checkpointing (game state recovery points)
- Resumable tournaments (complete partial tournaments)
- Experiment recovery (resume interrupted experiments)
- Corruption detection (verify data integrity)
- Integrity verification (foreign key validation)
- Automatic backups (periodic snapshots)

**Requires tracking:**
- Crash events (timestamps, reasons)
- Recovery attempts (success/failure)
- Checkpoint records

### EPIC 27: Performance
**Requires:**
- Database write performance (writes/sec)
- Engine throughput (games/hour)
- Inference batching efficiency (tokens/sec)
- Experiment execution tracking (games played)
- Tournament scheduling (matches scheduled/played)
- Memory usage per operation
- Startup time
- Parallel execution logs

**Requires:**
- Performance metrics table
- Throughput tracking
- Memory profiling data

### EPIC 28: AI Research Platform
**Requires:**
- Continuous benchmarking (ongoing ranking updates)
- Scheduled experiments (run at specific times)
- Automatic regression detection (compare runs)
- Automatic model ranking (updated continuously)
- Historical tracking (all historical data available)
- Longitudinal studies (track metrics over weeks/months)
- Model evolution tracking (how model improves over time)
- Large-scale research datasets (export for analysis)
- Reproducible scientific experiments (full provenance)

**Requires:**
- Long-term historical data storage
- Experiment scheduling records
- Regression detection records
- Evolution tracking metadata

---

## Phase 2: Complete Entity List

Based on all EPICs 15-28, here are ALL required entities:

### Core Research Entities

1. **Experiments**
   - Purpose: Define research studies
   - Keys: ID, name
   - Attributes: purpose, hypothesis, tags, notes, config_hash
   - Related: runs, games (subset), tags

2. **Experiment Tags**
   - Purpose: Categorize experiments
   - Attributes: tag name, description

3. **Experiment Runs**
   - Purpose: Track individual execution of experiment
   - Keys: experiment_id + run_number
   - Attributes: start_time, end_time, status, completion_percentage
   - Related: games, configurations

4. **Configuration Snapshots**
   - Purpose: Store exact configuration for reproducibility
   - Keys: config_hash (unique)
   - Attributes: temperature, top_p, max_tokens, seed, model, prompt_version
   - Related: experiments, runs, games

5. **Environment Snapshots**
   - Purpose: Store exact environment for reproducibility
   - Keys: environment_hash (unique)
   - Attributes: ollama_version, node_version, os, arch, git_commit, timestamp

6. **Hardware Profiles**
   - Purpose: Document hardware used
   - Keys: hardware_hash (unique)
   - Attributes: cpu_cores, ram_gb, gpu_available, gpu_type, storage_gb

### Game & Match Entities

7. **Games**
   - Purpose: Store complete game record
   - Keys: ID
   - Attributes: experiment_id, run_id, game_number, white_model, black_model, result, move_count, duration_ms, pgn, final_fen
   - Related: moves, opening, endgame, events, stats

8. **Moves**
   - Purpose: Store every move
   - Keys: game_id + move_number
   - Attributes: san, fen_before, color, latency_ms, confidence, quality_classification, tokens_used, attempt_count
   - Related: game, position_before, position_after, llm_decision, engine_eval

9. **Positions**
   - Purpose: Store unique positions
   - Keys: fen (natural key)
   - Attributes: fen_hash (for indexing), material_white, material_black, mobility_white, mobility_black, king_safety_white, king_safety_black, passed_pawns, center_control, complexity_score
   - Related: moves (before/after), evaluations, tactical_motifs

10. **Position Evaluations**
    - Purpose: Store engine analysis of positions
    - Keys: position_id (fen), engine_version, depth
    - Attributes: evaluation_cp, best_move, search_time_ms, nodes_searched
    - Related: position, engine_comparison

11. **Tactical Motifs**
    - Purpose: Detect tactical patterns in positions
    - Keys: position_id + motif_type
    - Attributes: motif_type (pin, fork, skewer, etc.), location, severity

### LLM Decision Entities

12. **LLM Decisions**
    - Purpose: Store complete LLM interaction
    - Keys: move_id (unique)
    - Attributes: model_name, temperature, top_p, max_tokens, prompt_version, prompt_hash, response_hash, tokens_in, tokens_out, latency_ms, confidence_0_100
    - Related: move, model, prompt_version, response_parsing

13. **LLM Prompts (Versions)**
    - Purpose: Version control for prompts
    - Keys: prompt_version
    - Attributes: prompt_hash, content (text), created_date, model_target
    - Related: LLM decisions using this prompt

14. **LLM Responses**
    - Purpose: Store raw LLM response
    - Keys: llm_decision_id
    - Attributes: response_text, response_hash, thinking (optional), parsed_move, parsing_success
    - Related: LLM decision, response parsing

15. **Response Parsing**
    - Purpose: Track move extraction from response
    - Keys: llm_decision_id
    - Attributes: parsing_attempts, parsing_success, extracted_move, parsing_confidence, error_message (if failed)
    - Related: LLM decision, response

16. **Candidate Moves**
    - Purpose: Store alternatives considered by LLM
    - Keys: llm_decision_id + candidate_rank
    - Attributes: candidate_san, mentioned_in_reasoning, rejected_reason
    - Related: LLM decision

### Model Entities

17. **Models**
    - Purpose: Track model versions
    - Keys: model_name + version
    - Attributes: model_name (tinyllama, mistral, etc.), ollama_variant, version_hash, first_used, last_used
    - Related: games (as white/black), LLM decisions, elo_progression

18. **Model Elo**
    - Purpose: Track Elo rating over time
    - Keys: model_name + game_id
    - Attributes: elo_rating, games_played, wins, draws, losses
    - Related: model, games

19. **Model Opening Preferences**
    - Purpose: Track which openings each model plays
    - Keys: model_name + opening_eco
    - Attributes: frequency, win_rate_white, win_rate_black, avg_moves
    - Related: model, opening

### Opening & Endgame Entities

20. **Openings**
    - Purpose: Store opening classifications
    - Keys: eco_code (natural key)
    - Attributes: eco_code, name, first_seen_game_id, frequency, win_rate_white, win_rate_black
    - Related: games, opening sequences, statistics

21. **Opening Sequences**
    - Purpose: Store opening move trees
    - Keys: eco_code + sequence_hash
    - Attributes: first_moves (array/text), depth, transposition_group
    - Related: opening, games starting with this sequence

22. **Transpositions**
    - Purpose: Detect when same position reached via different moves
    - Keys: fen + eco_code + sequence_hash
    - Attributes: move_paths (how many different ways to reach)
    - Related: positions, openings

23. **Endgame Classifications**
    - Purpose: Classify endgame types
    - Keys: endgame_type
    - Attributes: material_composition, tablebase_available, classification_rules
    - Related: games, endgame stats

24. **Endgame Statistics**
    - Purpose: Track endgame performance
    - Keys: model_name + endgame_type
    - Attributes: games_played, conversion_rate, draw_rate, win_rate, mistake_rate, optimal_moves_percentage
    - Related: model, endgame classification

### Event & Quality Entities

25. **Tactical Events**
    - Purpose: Track tactical events in games
    - Keys: game_id + move_number + event_type
    - Attributes: event_type (blunder, brilliant, check, capture, promotion, castling), severity, description
    - Related: game, move, position

26. **Move Quality**
    - Purpose: Store move quality assessment
    - Keys: move_id
    - Attributes: quality_classification (excellent, good, inaccuracy, blunder), centipawn_loss, engine_best_move, ranking_in_engine_list
    - Related: move, engine evaluation

### Recovery & Reliability Entities

27. **Recovery Events**
    - Purpose: Track crash recovery
    - Keys: ID
    - Attributes: timestamp, event_type (crash, timeout, invalid_move), component, retry_count, success
    - Related: game (game being played when crash occurred)

28. **Checkpoints**
    - Purpose: Store recovery points
    - Keys: game_id + checkpoint_sequence
    - Attributes: game_state (JSON), timestamp, moves_completed
    - Related: game

### Statistics & Aggregation Entities

29. **Game Statistics**
    - Purpose: Pre-calculated metrics for games
    - Keys: game_id
    - Attributes: white_win_rate, black_win_rate, draw_rate, avg_move_time, illegal_move_count, total_tokens
    - Related: game

30. **Tournament Statistics**
    - Purpose: Track tournament metrics
    - Keys: tournament_id
    - Attributes: total_games, games_completed, standings_json, last_updated
    - Related: tournament, games

31. **Running Statistics**
    - Purpose: Time-series statistics for trends
    - Keys: model_name + game_id
    - Attributes: win_rate_rolling_10, win_rate_rolling_50, avg_move_time_rolling, illegal_moves_rolling
    - Related: model, games

32. **Anomalies**
    - Purpose: Track statistical anomalies
    - Keys: ID
    - Attributes: anomaly_type, value, threshold, game_id (optional), timestamp
    - Related: game, statistical summary

### Tournament Entities

33. **Tournaments**
    - Purpose: Track tournaments
    - Keys: ID
    - Attributes: name, description, type (round_robin, swiss, ladder), start_time, end_time, participants (array)
    - Related: games (subset with tournament_id)

34. **Tournament Standings**
    - Purpose: Track standings over time
    - Keys: tournament_id + round_number
    - Attributes: standings_data (JSON), last_updated
    - Related: tournament

35. **Head-to-Head**
    - Purpose: Track records between specific models
    - Keys: model_a + model_b
    - Attributes: games_white_a, games_black_a, wins_white_a, wins_black_a, draws
    - Related: models, games

### Batch & Background Operations

36. **Background Operations**
    - Purpose: Track long-running async operations
    - Keys: ID
    - Attributes: operation_type (analysis, export, backup), status, progress, start_time, end_time, error_message
    - Related: experiments (optional)

---

## Phase 3: Entity Relationship Diagram (Text)

```
Experiments
  ├─ 1:N → Experiment Runs
  ├─ 1:N → Games (subset)
  └─ 1:N → Experiment Tags

Experiment Runs
  ├─ 1:N → Games (within run)
  ├─ N:1 → Configuration Snapshots
  └─ N:1 → Environment Snapshots

Games
  ├─ N:1 → Experiments
  ├─ N:1 → Experiment Runs
  ├─ N:1 → Openings (by ECO code)
  ├─ N:1 → Endgame Classifications
  ├─ 1:N → Moves
  ├─ 1:N → Tactical Events
  ├─ 1:N → Recovery Events
  ├─ 1:1 → Game Statistics
  ├─ N:1 → Tournament (optional)
  ├─ N:1 → Models (white)
  └─ N:1 → Models (black)

Moves
  ├─ N:1 → Games
  ├─ N:1 → Positions (FEN before)
  ├─ N:1 → Positions (FEN after)
  ├─ 1:1 → LLM Decisions
  ├─ 1:1 → Position Evaluations (optional)
  ├─ 1:1 → Move Quality
  └─ 1:N → Tactical Events

LLM Decisions
  ├─ 1:1 → Moves
  ├─ N:1 → Models
  ├─ N:1 → Prompt Versions
  ├─ 1:1 → LLM Responses
  ├─ 1:1 → Response Parsing
  └─ 1:N → Candidate Moves

Positions
  ├─ 1:N → Moves (before or after)
  ├─ 1:N → Position Evaluations
  └─ 1:N → Tactical Motifs

Models
  ├─ 1:N → Games (as white)
  ├─ 1:N → Games (as black)
  ├─ 1:N → LLM Decisions
  ├─ 1:N → Model Elo
  └─ 1:N → Model Opening Preferences

Openings
  ├─ 1:N → Games
  ├─ 1:N → Opening Sequences
  ├─ 1:N → Transpositions
  └─ 1:N → Model Opening Preferences

Tournaments
  ├─ 1:N → Games (with tournament_id)
  └─ 1:N → Tournament Standings

Running Statistics
  ├─ N:1 → Models
  └─ N:1 → Games (anchor point)
```

---

## Phase 4: Complete Entity Specifications

I will now document each entity:

### 1. Experiments
```
Purpose: Define research hypotheses and parameters
Primary Key: id (UUID)
Natural Key: name (per experiment session)

Attributes:
  - id: UUID
  - name: TEXT NOT NULL (experiment name)
  - purpose: TEXT (research goal)
  - hypothesis: TEXT (what we expect to find)
  - tags: JSON ARRAY (categorization)
  - notes: TEXT (researcher notes)
  - config_hash: SHA256 (for versioning)
  - created_date: TIMESTAMP
  - completed_date: TIMESTAMP (nullable)
  - status: ENUM (planning, in_progress, completed, failed)

Relationships:
  - 1:N → Experiment Runs
  - 1:N → Games (filtered by run)

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (name) -- experiments need unique names
  - INDEX (status, created_date) -- for listing active experiments
  - INDEX (tags) -- for filtering by tag

Growth Rate: O(1) - one per research session
Expected Volume: 1K experiments over research lifetime

Future EPICs:
  - EPIC 16: Stores experiment metadata
  - EPIC 25: Generates reports per experiment
  - EPIC 28: Tracks experiment history over time
```

### 2. Experiment Runs
```
Purpose: Track individual executions of an experiment
Primary Key: (experiment_id, run_number)

Attributes:
  - experiment_id: FK to Experiments
  - run_number: INT (1, 2, 3, ...)
  - start_time: TIMESTAMP
  - end_time: TIMESTAMP (nullable if in progress)
  - status: ENUM (in_progress, completed, failed, resumed)
  - games_planned: INT
  - games_completed: INT
  - completion_percentage: FLOAT

Relationships:
  - N:1 → Experiments
  - 1:N → Games (all games in this run)
  - N:1 → Configuration Snapshots
  - N:1 → Environment Snapshots
  - N:1 → Hardware Profiles

Indexes:
  - PRIMARY KEY (experiment_id, run_number)
  - INDEX (experiment_id, status)
  - INDEX (start_time) -- for recent runs

Growth Rate: O(1) per experiment
Expected Volume: 5-10 runs per experiment

Future EPICs:
  - EPIC 16: Tracks experiment execution
  - EPIC 23: Statistical analysis across runs
  - EPIC 24: Reproducibility tracking
  - EPIC 26: Recovery checkpoints
```

### 3. Configuration Snapshots
```
Purpose: Store exact configuration for reproducibility
Primary Key: config_hash (SHA256 of JSON)
Natural Key: config_hash (deterministic)

Attributes:
  - config_hash: SHA256 NOT NULL UNIQUE
  - model_white: TEXT
  - model_black: TEXT
  - temperature_white: FLOAT
  - temperature_black: FLOAT
  - top_p_white: FLOAT
  - top_p_black: FLOAT
  - max_tokens_white: INT
  - max_tokens_black: INT
  - thinking_enabled: BOOLEAN
  - seed: INT (nullable)
  - prompt_version_white: FK to Prompt Versions
  - prompt_version_black: FK to Prompt Versions
  - created_date: TIMESTAMP

Relationships:
  - 1:N → Experiment Runs (multiple runs may use same config)
  - 1:N → Games (multiple games may use same config)
  - N:1 → Prompt Versions (for white)
  - N:1 → Prompt Versions (for black)

Indexes:
  - PRIMARY KEY (config_hash)

Growth Rate: O(unique configs) - much slower than games
Expected Volume: 100-1000 unique configs

Future EPICs:
  - EPIC 16: Uses configuration in experiments
  - EPIC 24: Reproducibility via config snapshot
```

### 4. Environment Snapshots
```
Purpose: Store exact environment for reproducibility
Primary Key: environment_hash (SHA256)

Attributes:
  - environment_hash: SHA256 NOT NULL UNIQUE
  - node_version: TEXT
  - ollama_version: TEXT
  - stockfish_version: TEXT (nullable)
  - os: TEXT (Windows, Linux, macOS)
  - architecture: TEXT (x86_64, arm64)
  - git_commit: TEXT
  - git_branch: TEXT
  - python_version: TEXT (nullable)
  - created_date: TIMESTAMP

Relationships:
  - 1:N → Experiment Runs
  - 1:N → Games (optional)

Indexes:
  - PRIMARY KEY (environment_hash)
  - INDEX (git_commit)

Growth Rate: Very slow - one per unique environment
Expected Volume: 10-100 unique environments

Future EPICs:
  - EPIC 24: Reproducibility
```

### 5. Hardware Profiles
```
Purpose: Document hardware for performance analysis
Primary Key: hardware_hash (SHA256)

Attributes:
  - hardware_hash: SHA256 NOT NULL UNIQUE
  - cpu_cores: INT
  - cpu_model: TEXT
  - ram_gb: FLOAT
  - storage_gb: FLOAT
  - gpu_available: BOOLEAN
  - gpu_type: TEXT (nullable - "CUDA", "Metal", "OpenCL")
  - gpu_vram_gb: FLOAT (nullable)
  - cpu_freq_ghz: FLOAT (optional)
  - created_date: TIMESTAMP

Relationships:
  - 1:N → Experiment Runs
  - 1:N → Games (optional)

Indexes:
  - PRIMARY KEY (hardware_hash)

Growth Rate: Very slow
Expected Volume: 5-50 unique hardware profiles

Future EPICs:
  - EPIC 27: Performance analysis
```

### 6. Games
```
Purpose: Store complete game record
Primary Key: id (BIGINT auto-increment)
Natural Key: (experiment_run_id, game_number) if in experiment, else (timestamp, arena_id)

Attributes:
  - id: BIGINT NOT NULL AUTO_INCREMENT
  - experiment_id: FK (nullable - not all games are in experiments)
  - experiment_run_id: FK (nullable)
  - tournament_id: FK (nullable - not all games are tournaments)
  - game_number: INT (within run or tournament)
  - timestamp: TIMESTAMP NOT NULL
  - white_model_id: FK to Models
  - black_model_id: FK to Models
  - result: FLOAT (1.0 = white win, 0.5 = draw, 0.0 = black win)
  - move_count: INT
  - duration_ms: INT
  - pgn: TEXT (full PGN)
  - final_fen: TEXT
  - opening_eco: FK to Openings (nullable)
  - endgame_type: FK to Endgame Classifications (nullable)
  - was_completed: BOOLEAN (for recovery tracking)
  - is_valid: BOOLEAN (passes integrity checks)

Relationships:
  - N:1 → Experiments
  - N:1 → Experiment Runs
  - N:1 → Tournaments
  - 1:N → Moves
  - 1:N → Tactical Events
  - 1:N → Recovery Events
  - N:1 → Models (white)
  - N:1 → Models (black)
  - N:1 → Openings
  - N:1 → Endgame Classifications
  - 1:1 → Game Statistics

Indexes:
  - PRIMARY KEY (id)
  - UNIQUE (experiment_run_id, game_number) where experiment_run_id IS NOT NULL
  - INDEX (timestamp) -- for time-range queries
  - INDEX (white_model_id, black_model_id) -- for head-to-head
  - INDEX (opening_eco) -- for opening analysis
  - INDEX (tournament_id) -- for tournament queries
  - INDEX (is_valid) -- exclude invalid games

Growth Rate: O(games/hour) - linear
Expected Volume: Millions (40-200 games/hour * months of runtime)

Future EPICs:
  - EPIC 15: Source for all metrics
  - EPIC 17: Tournament analytics
  - EPIC 18: Opening analysis
  - EPIC 19: Endgame analysis
  - EPIC 20: Position analysis
  - EPIC 23: Statistical analysis
  - EPIC 25: Reporting
```

### 7. Moves
```
Purpose: Store every move with full metadata
Primary Key: (game_id, move_number)

Attributes:
  - game_id: FK to Games
  - move_number: INT (1, 2, 3, ..., move_count)
  - color: ENUM (white, black)
  - san: TEXT (Standard Algebraic Notation, e.g., "e4", "Nf3")
  - fen_before: TEXT (position before move)
  - fen_after: TEXT (position after move) -- optional, derivable
  - latency_ms: INT (time to decide move)
  - confidence_0_100: INT (LLM confidence 0-100, nullable)
  - quality_classification: ENUM (excellent, good, inaccuracy, blunder, nullable)
  - tokens_used: INT (nullable - not all moves have token counts)
  - attempt_count: INT (1 if successful first try, >1 if retried)
  - is_legal: BOOLEAN (should always be true after validation)

Relationships:
  - N:1 → Games
  - N:1 → Positions (FEN before)
  - N:1 → Positions (FEN after)
  - 1:1 → LLM Decisions
  - 1:1 → Move Quality (if evaluated)
  - 0:1 → Position Evaluations (if evaluated)
  - 1:N → Tactical Events

Indexes:
  - PRIMARY KEY (game_id, move_number)
  - INDEX (game_id) -- query all moves of game
  - INDEX (fen_before) -- position lookup
  - INDEX (latency_ms) -- performance analysis
  - INDEX (quality_classification) -- blunder/inaccuracy analysis
  - INDEX (tokens_used) -- token usage analysis

Growth Rate: O(avg_moves_per_game * games/hour)
Expected Volume: 500M-1B moves (25 moves/game * 100 games/hour * 6 months)

Future EPICs:
  - EPIC 15: Metrics (latency, token usage, quality)
  - EPIC 20: Position analysis
  - EPIC 21: LLM decision analysis
  - EPIC 22: Engine comparison
  - EPIC 23: Statistical analysis
```

[Continuing with remaining 29 entities...]

---

## Summary So Far

This analysis reveals the scope of what EPIC 14 must support:

**36 Total Entities** (not just 14)
- 8 core game/move entities
- 6 LLM decision entities
- 6 model/opening/endgame entities
- 3 recovery/event entities
- 4 statistics entities
- 3 tournament entities
- 2 configuration/environment entities
- Others: background operations, anomalies, etc.

**Relationships: ~80 foreign keys**

**Indexes: ~100+ strategic indexes**

**Expected Data Volume:**
- 1M games minimum
- 25M moves
- 1B+ position FEN references (deduplicated)
- 10M+ LLM decision records
- 5-10 years of research data

**This requires:**
- Reliable embedded storage (not JSON files)
- Efficient schema (normalization, indexing)
- Non-blocking async writes
- Bulk operations for performance
- Lossless reproducibility

---

## Next: Complete Entity Specifications

I will complete the specification for all 36 entities, showing:
- Purpose
- Attributes
- Relationships
- Indexes
- Growth rates
- Which EPICs depend on each entity

Then I'll propose an embedded storage solution suitable for this scale.
