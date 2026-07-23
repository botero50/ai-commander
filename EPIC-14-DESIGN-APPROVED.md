# EPIC 14: Research Data Store - Design Approval

**Date:** July 22, 2026  
**Status:** ✅ APPROVED FOR IMPLEMENTATION

---

## Summary

The Research Data Store design has been finalized and approved. This is a scientific research platform for reproducible AI chess experiments with complete provenance on every record.

---

## Core Principles (Approved)

1. **Experiment-Centric Hierarchy**
   ```
   Research Project → Experiment → Run → Game → Move → LLM Decision → Position
   ```
   Every entity traces back to its experiment.

2. **Complete Provenance**
   Every immutable record captures:
   - Which experiment? (experiment_id)
   - Which code? (git_commit, application_version)
   - Which model? (model_identifier, model_digest)
   - Which prompt? (prompt_version, prompt_hash, prompt_template_name)
   - Which environment? (environment_snapshot_id)
   - When exactly? (execution_start, execution_end, created_at)
   - How to reproduce? (random_seed, engine_version)

3. **Immutable Core (8 Tables)**
   - Experiments
   - Runs
   - Environment Snapshots
   - Model Configurations
   - Games
   - Moves
   - LLM Decisions
   - Positions

4. **Regenerable Derived Analytics (3 Tables)**
   - Opening Statistics
   - Model Performance
   - Elo Progression
   
   **Guarantee:** Delete all derived tables, rebuild from immutable core with zero information loss.

5. **Configuration Philosophy**
   - Model Configurations are immutable entities (separate from games)
   - If a parameter changes, create a new configuration record
   - Games reference configs via foreign key
   - Multiple games reuse identical configs without duplication

6. **Scientific Reproducibility**
   Any game can be reproduced under equivalent conditions:
   - All inputs preserved: code version, models, prompts, environment, random seed, timestamps
   - Future researchers can understand exactly how experiment was produced
   - Can reproduce under equivalent conditions (outputs may vary due to LLM non-determinism)
   - No information loss for understanding experiment provenance

7. **No Derived-as-Truth**
   Never query derived tables for scientific conclusions. Always regenerate to ensure consistency.

8. **Self-Contained**
   - Embedded SQLite, no external servers
   - Single .db file
   - Portable across systems
   - Zero external dependencies

9. **Future-Proof**
   - Multi-provider LLM support (Ollama, Anthropic, OpenAI, future)
   - Engine evaluation support (Stockfish, Leela, future)
   - Extensible for tactical events, tournaments, etc.
   - Schema doesn't prevent future capabilities

---

## Schema Overview

### Immutable Layer (Source of Truth)

**experiments** — Research hypothesis and success criteria
- id, name, hypothesis, description
- git_commit, application_version, created_at
- target_games, success_criteria, status

**runs** — Execution instances of experiments
- id, experiment_id, run_number
- config_snapshot (JSON of all settings)
- environment_snapshot_id, git_commit, application_version
- random_seed, execution_start, execution_end, status

**environment_snapshots** — Complete system context
- id, experiment_id, run_id
- os, os_version, os_release
- node_version, npm_version, pnpm_version
- cpu_model, cpu_cores, ram_gb, storage_available_gb
- ollama_version, ollama_location, ollama_cache_dir
- chess_js_version, chess_adapter_version
- network_latency_to_ollama_ms
- created_at, captured_at

**model_configs** — Immutable parameter sets
- id, model_identifier, model_name, model_version, model_digest
- temperature, top_p, top_k, max_tokens
- num_ctx, num_threads, num_gpu
- provider (ollama, anthropic, openai, etc.), provider_version, provider_config
- experiment_id, created_at, first_used_at, last_used_at, usage_count

**games** — Chess game records
- id, experiment_id, run_id, game_number
- white_model, black_model, white_config_id, black_config_id
- result, termination
- pgn, final_fen, opening_eco, opening_name, move_count, duration_ms
- environment_snapshot_id
- git_commit, application_version, random_seed, engine_version
- execution_start, execution_end, created_at
- white_illegal_moves, black_illegal_moves, avg_latency_ms, max_latency_ms, parsing_errors (denormalized)

**moves** — Individual move decisions
- id, game_id, experiment_id, run_id, move_number
- color, san, fen_before, fen_after
- latency_ms, confidence, is_legal, illegal_retry_count
- model_name, model_config_id
- git_commit, application_version
- execution_start, execution_end, created_at

**llm_decisions** — Prompt/response pairs
- id, move_id, game_id, experiment_id, run_id
- prompt, prompt_version, prompt_hash, prompt_template_name
- model_identifier, model_config_id
- response, tokens_in, tokens_out
- parsing_status, parsed_move, parsing_notes, retry_count
- git_commit, application_version
- execution_start, execution_end, created_at

**positions** — Deduplicated board states
- fen (primary key), occurrence_count
- white_pieces, black_pieces, is_endgame, is_check
- tactical_motif_tags, endgame_classification
- first_seen, last_seen

### Derived Layer (Regenerable)

**opening_stats** — Opening performance (regenerable from games)
- eco_code (unique), opening_name, occurrence_count
- white_wins, black_wins, draws, avg_moves
- last_updated

**model_performance** — Model rankings (regenerable from games)
- model_identifier (unique)
- games_as_white, games_as_black, wins_as_white, wins_as_black
- total_wins, draws, losses, win_rate_percent
- avg_decision_latency_ms, legal_move_rate_percent
- last_updated

**elo_progression** — Strength evolution (regenerable from games)
- model_identifier, checkpoint_number, elo_rating
- games_in_checkpoint, timestamp, last_updated

---

## Scientific Reproducibility Example

**Research Goal:** "Understand and reproduce game abc123def456 from experiment tinyllama-vs-mistral-v1, run 3"

**Steps to Understand Original Experiment:**

1. Query games table:
   ```sql
   SELECT * FROM games WHERE id = 'abc123def456'
   ```
   Returns: white_config_id=cfg-001, black_config_id=cfg-002, 
            environment_snapshot_id=env-001, git_commit=7f3a9c1e, random_seed=42

2. Query configurations:
   ```sql
   SELECT * FROM model_configs WHERE id IN ('cfg-001', 'cfg-002')
   ```
   Returns: tinyllama (model_digest=abc123...) at temperature=0.7, top_p=0.9, max_tokens=100
            mistral (model_digest=def456...) at temperature=0.5, top_p=0.95, max_tokens=100

3. Query environment:
   ```sql
   SELECT * FROM environment_snapshots WHERE id = 'env-001'
   ```
   Returns: Linux Ubuntu 22.04, Node v18.16.0, Ollama 0.1.34, CPU cores=16, RAM=32GB

4. Get exact prompts and responses:
   ```sql
   SELECT prompt, prompt_version, response FROM llm_decisions 
   WHERE game_id = 'abc123def456' 
   ORDER BY move_number
   ```
   Captures exact prompt versions and LLM responses for analysis

5. Understand provenance:
   ```bash
   git show 7f3a9c1e
   ```
   See exact code that produced this game

**Steps to Reproduce Under Equivalent Conditions:**

```bash
# Checkout exact code version
git checkout 7f3a9c1e

# Attempt reproduction with same parameters
pnpm chess \
  --white-model tinyllama \
  --white-config temperature=0.7,top_p=0.9,max_tokens=100 \
  --black-model mistral \
  --black-config temperature=0.5,top_p=0.95,max_tokens=100 \
  --seed 42  # Same random seed
```

**Result:** 
- All inputs and context preserved for scientific understanding
- Can reproduce under equivalent conditions
- Outputs may vary due to LLM non-determinism (model updates, inference implementation differences, sampling randomness)
- But full provenance preserved for analyzing what changed and why

---

## Implementation Phases

### Phase 1: Core Database Schema
- [ ] Create DDL for all 8 immutable tables
- [ ] Define all strategic indexes
- [ ] Validate foreign key relationships
- [ ] Test with sample data
- **Acceptance Criteria:**
  - All tables created
  - Schema imports without errors
  - Sample game, move, decision records insertable
  - All indexes created

### Phase 2: API Layer
- [ ] Implement storage abstraction
- [ ] recordExperiment(metadata)
- [ ] recordRun(experiment_id, config_snapshot)
- [ ] recordGame(run_id, players, result, pgn, timing)
- [ ] recordMove(game_id, move_data, latency, confidence)
- [ ] recordDecision(move_id, prompt, response, parsing_status)
- [ ] query(table, filters, limit)
- **Acceptance Criteria:**
  - API layer hides SQLite implementation
  - All records insertable via API
  - Records retrievable via query interface

### Phase 3: Integration
- [ ] Hook arena.js → recordGame()
- [ ] Hook real-chess-game.js → recordMove()
- [ ] Hook real-chess-game.js → recordDecision()
- [ ] Async batch writes (non-blocking game loop)
- [ ] Transaction support (game atomicity)
- [ ] Environment snapshot capture at run start
- **Acceptance Criteria:**
  - Arena logs games without blocking execution
  - 100+ games collected without errors
  - Records match actual game outcomes
  - No performance regression

### Phase 4: Derived Analytics
- [ ] Opening statistics aggregation
- [ ] Model performance leaderboard
- [ ] Elo progression calculation
- [ ] Regeneration routine (rebuild all derived tables)
- **Acceptance Criteria:**
  - Opening stats match manual verification
  - Model rankings consistent with game results
  - Elo progression shows realistic progression
  - Regeneration completes without loss

### Phase 5: Extensions (Future)
- [ ] Chess engine evaluation support
- [ ] Tactical event detection
- [ ] Tournament tracking
- [ ] Multi-provider LLM support
- [ ] Additional artifact types as needed

---

## Success Criteria

### Design Validation
- ✅ Experiment-centric hierarchy implemented
- ✅ Complete provenance on every record
- ✅ Immutable core / regenerable derived split
- ✅ Configuration managed as separate immutable entities
- ✅ Self-contained (no external databases)
- ✅ Multi-provider ready (schema supports future LLM providers)
- ✅ Extensible (new artifact types add without redesign)

### Implementation Validation
- [ ] All 8 immutable tables created and tested
- [ ] All 3 derived tables created and regenerable
- [ ] API layer complete and hidden
- [ ] Integration with arena.js and real-chess-game.js complete
- [ ] 100+ games collected with complete provenance
- [ ] No game results differ between immutable records and live execution
- [ ] Derived analytics match immutable source data
- [ ] Regeneration routine works (delete derived, rebuild from core)

---

## Documentation

**Design Documents:**
- EPIC-14-RESEARCH-DATA-STORE-FINAL.md (complete specification)

**Implementation Documents (Created During Phase 1):**
- [Phase 1] DDL schema file
- [Phase 2] API documentation
- [Phase 3] Integration guide
- [Phase 4] Analytics query reference

---

## Timeline Estimate

- Phase 1 (Core Schema): 1-2 days
- Phase 2 (API Layer): 1-2 days
- Phase 3 (Integration): 2-3 days
- Phase 4 (Analytics): 1-2 days
- Total: 5-9 days for full implementation

---

## Sign-Off

**Architecture:** APPROVED ✅  
**Complete Provenance:** APPROVED ✅  
**Immutable + Derived Split:** APPROVED ✅  
**Self-Contained:** APPROVED ✅  
**Future-Proof:** APPROVED ✅  
**Ready for Implementation:** YES ✅

---

**Next Step:** Begin Phase 1 implementation (core database schema).

