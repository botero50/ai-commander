# EPIC 32: TOURNAMENT ENGINE - IMPLEMENTATION PLAN

## Overview

Build a tournament scheduling and execution system that runs multiple chess games between different AI brains, tracks results, calculates ratings, and generates standings.

**Dependencies:** PHASE 2 validation (game execution proven)  
**Estimated Duration:** 2-3 sprints (2-3 weeks)  
**Team Size:** 1-2 developers  
**Risk Level:** LOW (execution patterns proven in PHASE 2)

---

## Strategic Context

### Why This EPIC?

PHASE 2 proved we can execute **one game**. EPIC 32 scales to **multiple games** with:
- Tournament scheduling (round-robin, Swiss, double-elimination)
- Competitive rating systems (ELO, Glicko)
- Fair pairing algorithms
- Match history and statistics

### What It Enables

Once EPIC 32 is complete:
- ✅ Run AI tournaments autonomously
- ✅ Compare brain performance objectively
- ✅ Generate competitive rankings
- ✅ Feed data to research platform (EPIC 34)
- ✅ Enable streaming/broadcasting (EPIC 33)

---

## Success Criteria

### Definition of Done

- [ ] Tournament scheduler accepts format specifications
- [ ] Scheduler generates valid pairings (no unfair conflicts)
- [ ] Tournament executor runs multiple games sequentially
- [ ] Results aggregator calculates standings correctly
- [ ] Rating calculator implements ELO algorithm
- [ ] All calculations verified against reference implementations
- [ ] 50+ tests passing with >80% code coverage
- [ ] Tournament can be run with single CLI command
- [ ] Results exported in JSON and CSV formats
- [ ] Performance: 100-game tournament in <15 minutes

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Tournament setup | <1 sec | Load config, validate |
| Scheduling | <100ms per game | 100 games → <10 sec |
| Game execution | 7-10 sec each | (from PHASE 2 baseline) |
| Results calculation | <1 sec | (for any tournament size) |
| Total 100-game tournament | <15 minutes | Real execution, no optimizations |

---

## Architecture Design

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   Tournament Engine                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tournament Scheduler                            │   │
│  │  - Format: Round-robin, Swiss, Double-elim      │   │
│  │  - Pairing algorithm (avoid repeats)            │   │
│  │  - Schedule generation                          │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tournament Executor                             │   │
│  │  - Match list iteration                         │   │
│  │  - Game execution (using PHASE 2 code)          │   │
│  │  - Result recording                             │   │
│  │  - Error handling & recovery                    │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Results Aggregator                              │   │
│  │  - Score calculation                            │   │
│  │  - Win/loss/draw tracking                       │   │
│  │  - Head-to-head records                         │   │
│  │  - Standings generation                         │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Rating Calculator (ELO)                         │   │
│  │  - K-factor selection                           │   │
│  │  - Rating delta calculation                     │   │
│  │  - Rating history tracking                      │   │
│  └─────────────────────────────────────────────────┘   │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tournament Reporter                             │   │
│  │  - JSON export                                  │   │
│  │  - CSV export                                   │   │
│  │  - Console reporting                            │   │
│  │  - HTML (optional)                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Models

```typescript
// Tournament configuration
interface TournamentConfig {
  id: string;
  name: string;
  format: 'round-robin' | 'swiss' | 'double-elimination';
  players: string[]; // Brain names
  roundCount?: number; // For Swiss
  timeControl: 'infinite' | '5m' | '15m';
  k_factor: number; // For ELO (default 32)
  seed?: number; // For reproducibility
}

// Match to be played
interface ScheduledMatch {
  matchId: string;
  round: number;
  white: string;
  black: string;
  scheduledTime?: number;
}

// Completed match
interface CompletedMatch extends ScheduledMatch {
  result: 'white-win' | 'black-win' | 'draw';
  moveCount: number;
  duration: number;
  completedTime: number;
  pgn?: string;
}

// Player standings
interface PlayerStandings {
  rank: number;
  player: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  score: number; // Win=1, Draw=0.5, Loss=0
  rating: number; // ELO
  ratingChange: number; // vs start of tournament
  performance: number; // Calculated from results
}

// Tournament results
interface TournamentResults {
  tournamentId: string;
  config: TournamentConfig;
  matches: CompletedMatch[];
  standings: PlayerStandings[];
  startTime: number;
  endTime: number;
  duration: number;
  stats: {
    totalMatches: number;
    totalMoves: number;
    avgMoveTime: number;
    winRates: Record<string, number>;
    drawRate: number;
  };
}
```

### File Structure

```
packages/tournament/
├── src/
│   ├── index.ts (exports)
│   ├── tournament-scheduler.ts (300 lines)
│   ├── tournament-executor.ts (400 lines)
│   ├── results-aggregator.ts (250 lines)
│   ├── rating-calculator.ts (200 lines)
│   ├── tournament-reporter.ts (200 lines)
│   ├── tournament-types.ts (150 lines)
│   ├── pairing-algorithms/
│   │   ├── round-robin.ts
│   │   ├── swiss.ts
│   │   └── double-elimination.ts
│   └── __tests__/
│       ├── tournament-scheduler.test.ts (50+ tests)
│       ├── tournament-executor.test.ts (40+ tests)
│       ├── results-aggregator.test.ts (30+ tests)
│       ├── rating-calculator.test.ts (30+ tests)
│       └── integration.test.ts (20+ tests)
├── package.json
└── tsconfig.json
```

---

## Stories & Acceptance Criteria

### STORY 32.1: Tournament Scheduler
**Objective:** Generate valid tournament pairings without conflicts.

**Acceptance Criteria:**
- [ ] Round-robin pairing algorithm implemented
- [ ] Swiss pairing algorithm implemented
- [ ] Double-elimination bracket generation
- [ ] No duplicate pairings (same opponent twice in same round)
- [ ] All players participate equally
- [ ] Reproducible with seed
- [ ] 50+ test cases covering edge cases
- [ ] Performance: <100ms for 100-player tournament

**Implementation Notes:**
- Use chess-tournament-scheduler.ts as reference (exists from EPIC C1)
- Implement three pairing algorithms
- Add reproducibility via seeding
- Comprehensive test coverage for edge cases

**Estimated Points:** 8

### STORY 32.2: Tournament Executor
**Objective:** Execute scheduled matches and record results.

**Acceptance Criteria:**
- [ ] Executor accepts match list and brain instances
- [ ] Executes matches sequentially (or in parallel with isolation)
- [ ] Records winner, move count, duration
- [ ] Handles errors gracefully (skip match, log, continue)
- [ ] Generates PGN for each match
- [ ] Progress reporting
- [ ] Can pause/resume (optional)
- [ ] 40+ tests covering success and error paths

**Implementation Notes:**
- Reuse game execution from PHASE 2
- Add match recording and error handling
- Implement progress callbacks
- Optional: parallel execution with worktree isolation

**Estimated Points:** 8

### STORY 32.3: Results Aggregator
**Objective:** Calculate standings and statistics from match results.

**Acceptance Criteria:**
- [ ] Score calculation (W=1, D=0.5, L=0)
- [ ] Win/loss/draw tracking per player
- [ ] Head-to-head records (A vs B)
- [ ] Standings generation (sorted by score)
- [ ] Tiebreaker rules (Sonneborn-Berger, head-to-head)
- [ ] Performance rating calculation
- [ ] Consistency: same results = same standings (always)
- [ ] 30+ tests verifying calculations

**Implementation Notes:**
- Implement standard tiebreaker rules
- Verify against reference chess tournament rules
- Test with known tournament results

**Estimated Points:** 5

### STORY 32.4: Rating Calculator (ELO)
**Objective:** Implement ELO rating system for skill tracking.

**Acceptance Criteria:**
- [ ] ELO algorithm correctly implemented
- [ ] K-factor configurable (default 32)
- [ ] Rating change calculation correct
- [ ] New player rating initialization (1200)
- [ ] Rating history tracked
- [ ] Verify against reference ELO implementation
- [ ] 30+ tests with known scenarios
- [ ] Performance rating calculation

**Implementation Notes:**
- Standard ELO formula: ΔRating = K × (Result - Expected)
- Expected = 1 / (1 + 10^((Opponent - Self) / 400))
- Test against reference implementations (FIDE, Chess.com)
- Optional: Glicko-2 for future

**Estimated Points:** 5

### STORY 32.5: Tournament Reporter
**Objective:** Generate reports in multiple formats.

**Acceptance Criteria:**
- [ ] JSON export with full details
- [ ] CSV export (standings, match history)
- [ ] Console reporting (human-readable)
- [ ] PGN collection (all games as PGN)
- [ ] Summary statistics
- [ ] Optional: HTML report (future)
- [ ] 20+ tests verifying output format

**Implementation Notes:**
- JSON: Full machine-readable format
- CSV: Standard spreadsheet format
- Console: Pretty-printed standings
- PGN: Concatenated game records

**Estimated Points:** 5

### STORY 32.6: Integration & Performance
**Objective:** Wire components together and validate performance.

**Acceptance Criteria:**
- [ ] Tournament can be executed with single command
- [ ] CLI interface implemented
- [ ] Config file loading (JSON/YAML)
- [ ] End-to-end tournament execution (<15 min for 100 games)
- [ ] Error handling and logging
- [ ] 20+ integration tests
- [ ] Documentation complete

**Implementation Notes:**
- Create CLI entry point
- Support config files
- Logging at each stage
- Performance profiling

**Estimated Points:** 5

---

## Test Strategy

### Unit Tests (150+ tests)
- **Scheduler:** Pairing validation, edge cases
- **Executor:** Match execution, error handling
- **Aggregator:** Score calculation, standings
- **Rating:** ELO calculations, rating changes
- **Reporter:** Output format validation

### Integration Tests (30+ tests)
- Small tournament (4 players, round-robin)
- Medium tournament (8 players, Swiss)
- Large tournament (16 players, double-elimination)
- Error scenarios (brain failures, timeouts)
- Rating progression

### Performance Tests
- 100-game tournament execution time
- Memory usage tracking
- Concurrency (if parallel execution added)

### Validation Tests
- Results consistency (replay produces same standings)
- Rating consistency (known scenarios match reference)
- Format validation (JSON schema, CSV correctness)

---

## Development Phases

### Phase 1: Scheduling & Execution (1 week)
- Story 32.1: Scheduler
- Story 32.2: Executor
- 50+ tests
- Performance baseline

### Phase 2: Results & Ratings (1 week)
- Story 32.3: Aggregator
- Story 32.4: Rating Calculator
- 60+ tests
- Integration testing

### Phase 3: Reporting & CLI (3-4 days)
- Story 32.5: Reporter
- Story 32.6: Integration
- CLI tool
- End-to-end validation

### Phase 4: Polish & Documentation (2-3 days)
- Error handling
- Logging
- Documentation
- Performance optimization

---

## Dependencies & Assumptions

### Dependencies
- ✅ PHASE 2 validation (game execution proven)
- ✅ ChessAdapter from chess-adapter package
- ✅ Brain interface from @ai-commander/brain
- ✅ chess.js for game logic

### Assumptions
- Games execute deterministically (proven in PHASE 2)
- Brain instances available for tournament
- No external AI API calls (using mock brains for testing)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Pairing algorithm complexity | Medium | Medium | Reference existing implementations |
| ELO calculation errors | Low | High | Verify against reference, extensive tests |
| Performance degradation | Low | Medium | Profile early, optimize if needed |
| Brain availability | Low | High | Error handling, skip-and-continue logic |

---

## Success Metrics

### Code Quality
- ✅ >80% test coverage
- ✅ Zero known bugs in release
- ✅ Clear, maintainable code
- ✅ Comprehensive documentation

### Performance
- ✅ 100-game tournament in <15 minutes
- ✅ Memory usage <500MB
- ✅ CPU efficient (single-threaded is fine)

### Functionality
- ✅ All three tournament formats working
- ✅ Accurate standings and ratings
- ✅ Reproducible results
- ✅ Multi-format reporting

### User Experience
- ✅ Single-command execution
- ✅ Clear progress feedback
- ✅ Helpful error messages
- ✅ Simple configuration

---

## Rollout Plan

### Development
1. Create tournament package
2. Implement stories in order (32.1 → 32.2 → 32.3 → 32.4 → 32.5 → 32.6)
3. Add integration tests
4. Performance testing

### Testing
1. Unit test each component
2. Integration test all together
3. Validation against reference implementations
4. Performance profiling

### Documentation
1. Architecture document (this file + details)
2. API documentation
3. Usage guide
4. Configuration examples
5. Troubleshooting guide

### Release
1. Tag as v2.0.0
2. Create release notes
3. Update main README
4. Announce in project

---

## Success Criteria for EPIC Completion

- [ ] All 6 stories completed and tested
- [ ] 150+ unit tests passing
- [ ] 30+ integration tests passing
- [ ] 100-game tournament executes in <15 minutes
- [ ] Results verified against reference tournament
- [ ] CLI tool works with example tournament
- [ ] Documentation complete and clear
- [ ] Code review approved
- [ ] Ready for EPIC 33 (Streaming)

---

## Next Steps After EPIC 32

### EPIC 33: Streaming & Broadcast (Parallel or Sequential)
- Real-time game broadcasting
- WebSocket integration
- OBS integration
- Broadcasting overlay

### EPIC 34: Research Platform (After EPIC 33)
- Tournament analysis
- Brain performance comparison
- Meta-game analysis
- Experiment framework

---

**Estimated Start Date:** 2026-07-17  
**Estimated Completion:** 2026-07-31  
**Team:** 1-2 developers  
**Status:** ✅ READY TO BEGIN
