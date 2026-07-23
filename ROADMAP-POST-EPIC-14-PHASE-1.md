# AI Commander Roadmap - Post EPIC 14 Phase 1

**Date:** July 22, 2026  
**Foundation:** EPIC 14 Phase 1 Complete

---

## Core Principles

### 1. Production-Quality Foundation
The existing runtime (EPICS 1-73) is production-quality.
- Never rewrite completed systems
- Always extend the current architecture
- Maintain backward compatibility
- Preserve proven patterns

### 2. Research Data Store First
The Research Data Store (EPIC 14) is the foundation for all future EPICs.
- EPICS 15+ depend on EPIC 14 being complete
- All research data flows through the store
- All analytics read from immutable records
- Derived tables are always regenerable

### 3. Real Runtime Only
Every feature must be validated using the real runtime.
- No mock data
- No placeholder implementations
- No simulations
- Only actual gameplay data and measurements

### 4. Self-Contained Forever
Embedded SQLite storage.
- No PostgreSQL
- No MySQL
- No MongoDB
- No cloud services
- No Docker dependencies
- Single `.db` file, portable and distributable

### 5. Architectural Stability
Design for years of research without major redesign.
- Extensible schema (add tables, not restructure)
- Pluggable providers (Ollama, Anthropic, OpenAI, future)
- Modular components
- Clean API boundaries

---

## Implementation Sequence

### CRITICAL PATH: Phases 2-4 (Required for all future work)

#### **EPIC 14 Phase 2: Repository/API Layer** (1-2 weeks)
**Unblocks:** EPIC 14 Phase 3, EPICS 15+

**Deliverables:**
- ResearchRepository class (hides storage implementation)
- Record operations: recordExperiment, recordGame, recordMove, recordDecision
- Query builders: gamesByExperiment, movesByGame, decisionsByMove
- Batch writing: async batch inserts (non-blocking)
- Transaction management: atomic game recording
- Error recovery: transaction rollback, data integrity

**Success Criteria:**
- API layer completely hides SQLite implementation
- Application code never touches SQL
- Games recordable without blocking arena execution
- 1000+ games/hour throughput with non-blocking writes
- Type-safe operations (TypeScript enforced)

**Dependencies:** EPIC 14 Phase 1 ✅

---

#### **EPIC 14 Phase 3: Arena Integration** (2-3 weeks)
**Unblocks:** EPICS 15-23 (all analytics)

**Deliverables:**
- Hook into arena.js: recordExperiment, recordRun at startup
- Hook into real-chess-game.js: recordGame after each game
- Hook into move execution: recordMove for each move
- Hook into LLM decision: recordDecision for each prompt/response
- Capture environment snapshot at run start
- Store model configurations as immutable records
- Async persistence (batch write every N games)
- Validate: games recorded match actual results

**Success Criteria:**
- 100+ games recorded with complete provenance
- No performance regression in arena throughput
- All data matches reality (PGN, results, moves)
- Environment captures OS, hardware, Ollama version
- Configuration deduplication working (same config reused)
- Database integrity verified after large runs

**Dependencies:** EPIC 14 Phase 2

---

#### **EPIC 14 Phase 4: Derived Analytics** (1-2 weeks)
**Unblocks:** EPICS 15-30

**Deliverables:**
- Opening statistics aggregation (from games table)
- Model performance ranking (from games table)
- Elo progression calculation (from games table)
- Analytics regeneration routines (rebuild from immutable)
- Verification: regenerated analytics match original
- Queries: analyticsService.openingStats(), modelPerformance(), eloProgression()

**Success Criteria:**
- All derived tables regenerable from immutable core
- Zero information loss during regeneration
- Opening stats match manual verification
- Model rankings consistent with results
- Elo progression shows realistic progression
- Regeneration completes in < 5 minutes for 1M games

**Dependencies:** EPIC 14 Phase 3

---

### RESEARCH CAPABILITY STACK: EPICS 15-23 (Depends on EPIC 14 complete)

These EPICs build research capabilities on the foundation of EPIC 14 Phase 4.

#### **EPIC 15: Research Metrics** (1-2 weeks)
**Purpose:** Track comprehensive metrics for analysis

**Metrics to compute:**
- Performance: win rate, draw rate, Elo, confidence intervals
- Inference: latency, p95, p99, timeout rate
- LLM: token usage, parsing failures, illegal moves
- Chess: move quality, tactical opportunities, opening diversity
- Runtime: crash rate, recovery rate, throughput, memory

**Depends on:** EPIC 14 Phase 4

---

#### **EPIC 16: Experiment Management** (1 week)
**Purpose:** Create complete experiment lifecycle system

**Features:**
- Projects, experiments, runs as organizational hierarchy
- Tags, notes, hypotheses, success criteria
- Reproducibility verification
- Experiment comparison over time
- Historical tracking

**Depends on:** EPIC 14 Phase 4, EPIC 15

---

#### **EPIC 17-23: Intelligence Systems** (Intelligence stacks)
**Purpose:** Provide analytical insights across different research dimensions

- **17: Analytics Engine** — Complex queries, trend analysis
- **18: Opening Intelligence** — ECO, transpositions, popularity
- **19: Endgame Intelligence** — Classification, conversion rate
- **20: Position Intelligence** — Material, mobility, tactics
- **21: LLM Intelligence** — Reasoning quality, consistency
- **22: Engine Intelligence** — LLM vs Stockfish comparison (future)
- **23: Statistical Analysis** — Significance tests, distributions

**Depends on:** EPIC 14 Phase 4

---

### RELIABILITY & OPTIMIZATION: EPICS 24-26 (Polish layer)

These improve robustness and performance but don't block research capability.

#### **EPIC 24: Reporting** (1-2 weeks)
Auto-generate experiment, benchmark, and research reports.

#### **EPIC 25: Reliability** (1-2 weeks)
Auto-recovery, corruption detection, checksums, resumable experiments.

#### **EPIC 26: Performance** (1-2 weeks)
Optimize storage writes, batch persistence, query performance.

---

### EXTENSIBILITY: EPICS 27-29 (Future capabilities)

#### **EPIC 27: Automation** (Scheduled research)
Auto-run experiments, benchmarks, reports, regression detection.

#### **EPIC 28: Dataset Export** (Shareability)
JSON, CSV, PGN, Parquet exports; import archived datasets.

#### **EPIC 29: Multi-Provider AI** (Beyond Ollama)
Support OpenAI, Anthropic, Google, local engines, future providers.

---

### FINAL OBJECTIVE: EPIC 30

#### **EPIC 30: AI Commander Research Laboratory**

The culmination: Transform AI Commander into the most comprehensive open-source platform for autonomous AI-vs-AI chess research.

**Capabilities at completion:**
- Continuous autonomous play (proven)
- Experiment management (EPIC 16)
- Longitudinal research (EPICS 15+)
- Model benchmarking (EPICS 15, 16, 17)
- Statistical analysis (EPIC 23)
- Opening intelligence (EPIC 18)
- Endgame intelligence (EPIC 19)
- Position intelligence (EPIC 20)
- LLM behavior analysis (EPIC 21)
- Reproducible experiments (EPIC 14 + 16)
- Research datasets (EPIC 28)
- Automatic reporting (EPIC 24)
- Automatic regression detection (EPICS 15 + 27)
- Historical analysis (EPICS 15 + 17)
- Scientific reproducibility (EPIC 14)

**Outcome:** Platform capable of years of autonomous chess research without architectural redesign.

---

## Prioritization Framework

### Immediate (EPIC 14 Phases 2-4)
**Why:** Foundation for everything else. No research capability without this.
- Phase 2: Repository/API layer
- Phase 3: Arena integration
- Phase 4: Derived analytics

### High Priority (EPICS 15-17)
**Why:** Enables core research functionality. Needed for any meaningful analysis.
- EPIC 15: Research Metrics
- EPIC 16: Experiment Management
- EPIC 17: Analytics Engine

### Medium Priority (EPICS 18-23)
**Why:** Specialized research capabilities. Each adds dimension to analysis.
- EPIC 18: Opening Intelligence
- EPIC 19: Endgame Intelligence
- EPIC 20: Position Intelligence
- EPIC 21: LLM Intelligence
- EPIC 22: Engine Intelligence (when Stockfish integrated)
- EPIC 23: Statistical Analysis

### Lower Priority (EPICS 24-27)
**Why:** Improve usability and automation but not core capability.
- EPIC 24: Reporting
- EPIC 25: Reliability
- EPIC 26: Performance
- EPIC 27: Automation

### Future (EPICS 28-30)
**Why:** Extensibility and the final vision. Build after core is mature.
- EPIC 28: Dataset Export
- EPIC 29: Multi-Provider AI
- EPIC 30: Research Laboratory

---

## Architecture: Post EPIC 14 Phase 1

```
┌─────────────────────────────────────────────────────┐
│        AI Commander Research Platform               │
│                                                     │
│  ┌─ Arena Layer (EPICS 1-73, Production) ────────┐ │
│  │ • Continuous chess play                        │ │
│  │ • Real-time game execution                     │ │
│  │ • Multi-model support (Ollama)                 │ │
│  │ • Error recovery and reliability               │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     ↓                                  │
│  ┌─ EPIC 14 Research Data Store ────────────────────┐ │
│  │ • Repository/API Layer (Phase 2)                │ │
│  │ • Arena Integration (Phase 3)                   │ │
│  │ • Derived Analytics (Phase 4)                   │ │
│  │ • SQLite embedded storage                       │ │
│  │ • Complete provenance                           │ │
│  │ • Immutable core + regenerable analytics        │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     ↓                                  │
│  ┌─ Research Capability Stack (EPICS 15-23) ──────┐ │
│  │ • Metrics (15)                                  │ │
│  │ • Experiment Management (16)                    │ │
│  │ • Analytics Engine (17)                         │ │
│  │ • Opening Intelligence (18)                     │ │
│  │ • Endgame Intelligence (19)                     │ │
│  │ • Position Intelligence (20)                    │ │
│  │ • LLM Intelligence (21)                         │ │
│  │ • Engine Intelligence (22, future)              │ │
│  │ • Statistical Analysis (23)                     │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     ↓                                  │
│  ┌─ Reliability & Optimization (EPICS 24-26) ───────┐ │
│  │ • Reporting (24)                                │ │
│  │ • Reliability (25)                              │ │
│  │ • Performance (26)                              │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     ↓                                  │
│  ┌─ Extensibility (EPICS 27-29) ────────────────────┐ │
│  │ • Automation (27)                               │ │
│  │ • Dataset Export (28)                           │ │
│  │ • Multi-Provider AI (29)                        │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     ↓                                  │
│  ┌─ EPIC 30: Research Laboratory ──────────────────┐ │
│  │ Comprehensive open-source platform for        │ │
│  │ autonomous AI-vs-AI chess research             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Timeline Estimate

**Phase 2 (API Layer):** 1-2 weeks → ready for Phase 3  
**Phase 3 (Arena Integration):** 2-3 weeks → enable analytics  
**Phase 4 (Derived Analytics):** 1-2 weeks → foundation complete  

**EPIC 14 Complete:** ~4-7 weeks from now

**EPICS 15-17 (Core Research):** 3-4 weeks (parallel possible)  
**EPICS 18-23 (Intelligence):** 6-10 weeks (can be parallel)  
**EPICS 24-26 (Polish):** 3-4 weeks  
**EPICS 27-29 (Extensions):** 2-3 weeks  

**Full Research Platform:** ~4-6 months from EPIC 14 Phase 1 completion

---

## Key Success Metrics

### EPIC 14 Completion (Phases 2-4)
- [ ] 1000+ games recorded with complete provenance
- [ ] All game results match database records
- [ ] Environment snapshots capture OS, hardware, Ollama version
- [ ] Model configurations deduplicated and reused
- [ ] Derived analytics regenerate from immutable core
- [ ] Database integrity verified
- [ ] Zero data loss in 24-hour runs

### Research Capability (EPICS 15-23)
- [ ] All metrics computed correctly
- [ ] Opening statistics match manual verification
- [ ] Model rankings consistent with results
- [ ] Elo progression shows realistic progression
- [ ] Queries execute in < 1 second for 1M games
- [ ] Analytics queries support complex filters
- [ ] Research questions answerable from data

### Platform Maturity (EPICS 24-30)
- [ ] Automatic reports generated daily
- [ ] Regression detection working (automatic alerts)
- [ ] Experiments resumable after interruption
- [ ] Multi-provider support enabled
- [ ] Dataset exports in all formats
- [ ] Platform used for published research

---

## Maintenance & Stability

### Never Rewrite
- Keep production systems stable
- Extend via new modules
- Add capabilities without touching proven code
- Maintain backward compatibility

### Data Integrity First
- All writes verified
- Regular integrity checks
- Backups before major operations
- Migration support for schema changes

### Measurement-Driven
- All claims validated with real data
- No assumptions about performance
- No mock data in production
- Continuous monitoring

---

## The Long-Term Vision

AI Commander will become the most comprehensive open-source platform for autonomous AI-vs-AI chess research.

**In one year:**
- Months of continuous research data
- Comprehensive metrics across all dimensions
- Statistical analysis and trend detection
- Automatic experiment management
- Published research using the platform

**In three years:**
- Years of longitudinal research
- Model evolution tracking
- Opening preparation insights
- Benchmark suite for model evaluation
- Multi-provider AI evaluation framework
- Industry-standard chess AI research platform

**In five years:**
- Decade-scale research datasets
- Reproducible research archives
- Scientific publications powered by data
- Open research community
- Foundation for chess AI advancement

---

## Current Status

✅ **EPIC 14 Phase 1:** Core schema complete  
🔄 **EPIC 14 Phase 2:** Ready to implement  
⏳ **EPICS 15-30:** Queued for implementation

**Foundation is solid. Architecture is stable. Ready to build the research platform.**

