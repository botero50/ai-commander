# 0 A.D. Adapter Design Summary

**Status**: ✅ DESIGN PHASE COMPLETE  
**Date**: 2026-07-07  
**Next Phase**: Implementation (22 stories, ~31 days)

---

## Overview

This document summarizes the complete architecture design for integrating 0 A.D. into AI Commander as the reference RTS implementation.

---

## Key Design Decisions

### 1. Communication Architecture

**Decision**: Process-based IPC with file-based observation  
**Method**: 
- Launch 0 A.D. via command-line with match configuration
- Observe results via replay file (.ogv) and save state (JSON)
- No real-time bidirectional communication
- Batch mode execution

**Rationale**:
- 0 A.D. lacks remote control API
- File-based approach is simple and reliable
- Deterministic replay enables offline analysis
- Scales to batch match execution

---

### 2. AI Integration Strategy

**Decision**: Custom JavaScript AI bot modding (not external control)  
**Method**:
- Create JavaScript mod implementing desired AI strategy
- Mod runs inside game simulation at fixed intervals
- Same APIs as Petra reference implementation
- Full access to game state

**Rationale**:
- 0 A.D. doesn't support command injection
- JavaScript AI is deterministic and reproducible
- Follows 0 A.D. design patterns
- Community has examples (Petra, Arch, Hannibal)

---

### 3. Observation Approach

**Decision**: Post-match analysis (batch) with optional periodic polling  
**Method**:
- Primary: Parse replay file for complete command history
- Secondary: Parse save file for final state
- Optional: Poll save files during match for intermediate state

**Rationale**:
- MVP doesn't need real-time observation
- Replay gives deterministic history
- File I/O simple and reliable
- Real-time can be added later via custom mod

---

### 4. Scope Constraint

**Decision**: MVP focuses on outcome and statistics, not real-time control  
**Method**:
- Execute match to completion
- Analyze outcome (winner, victory type)
- Calculate statistics (resources, units, timing)
- No mid-game intervention

**Rationale**:
- Matches 0 A.D.'s architecture
- Sufficient for tournament/benchmarking
- Aligns with AI Commander's batch processing model
- Reduces implementation complexity

---

## Architecture Layers

### Process Management Layer
- Process spawning and lifecycle
- Timeout handling and cleanup
- Output capture and logging

### Configuration Layer
- Match setup (players, civilizations, map, seed)
- CLI argument generation
- Validation and defaults

### Parsing Layer
- Replay file decompression and parsing
- Command sequence extraction
- Save game JSON parsing
- Outcome determination

### Analysis Layer
- Statistics extraction
- Strategy classification
- Timing analysis
- Comparison utilities

---

## Data Flows

### Match Execution Flow

```
AI Commander
    |
    v (create config)
Config Builder
    |
    v (validate + serialize)
CLI Arguments
    |
    v (spawn process)
0 A.D. Process
    |
    ├─ Load config
    ├─ Setup match
    ├─ Run simulation
    ├─ Record replay
    └─ Save final state
    |
    v (collect output)
Result Files
    |
    ├─ replay.ogv (binary)
    ├─ save.json (state)
    └─ stdout.log (logs)
    |
    v (parse)
Match Result
    |
    ├─ Outcome (winner, condition)
    ├─ Statistics (resources, units)
    └─ Replay analysis (commands, timing)
```

### Replay Analysis Flow

```
ParsedReplay
    |
    ├─ Metadata (players, map, seed)
    ├─ Commands (sequence of actions)
    └─ Game State (initial conditions)
    |
    v (analyze)
Strategy Insights
    |
    ├─ Decision timing
    ├─ Unit production sequence
    ├─ Resource flow
    ├─ Tactical patterns
    └─ Economic progression
```

---

## Package Structure

```
packages/adapter-0ad/
├── src/
│   ├── index.ts                 # Public API exports
│   ├── adapter.ts               # Main orchestrator
│   ├── launcher.ts              # Process management
│   ├── config.ts                # Configuration validation
│   ├── types.ts                 # TypeScript interfaces
│   ├── constants.ts             # Game constants
│   ├── util.ts                  # Utilities
│   ├── parser/
│   │   ├── replay-parser.ts     # .ogv parsing
│   │   ├── save-parser.ts       # JSON save parsing
│   │   ├── log-parser.ts        # stdout analysis
│   │   ├── stats-extractor.ts   # Statistics calculation
│   │   ├── outcome-parser.ts    # Victory condition logic
│   │   └── entities.ts          # Entity state handling
│   └── ai/
│       ├── petra-adapter.ts     # Petra AI integration
│       └── templates/
│           └── ai-bot-template.js  # Custom AI example
├── mods/
│   └── ai-commander-bridge/     # (Optional) observation mod
├── test/
│   ├── fixtures/                # Sample files
│   └── *.test.ts                # Test files
├── README.md
└── package.json
```

---

## Public API

### Core Entry Point

```typescript
class Match0ADAdapter {
  async executeMatch(
    config: Match0ADConfig,
    options?: ExecutionOptions
  ): Promise<Match0ADResult>;

  async parseReplay(filePath: string): Promise<ParsedReplay>;
  async parseGameState(filePath: string): Promise<GameState>;
}
```

### Configuration Builder

```typescript
class ConfigBuilder {
  setPlayers(...players: PlayerConfig[]): ConfigBuilder;
  setMap(name: string, seed?: number): ConfigBuilder;
  setDifficulty(level: number): ConfigBuilder;
  build(): Match0ADConfig;
}
```

### Result Types

```typescript
interface Match0ADResult {
  config: Match0ADConfig;
  outcome: MatchOutcome;           // winner, victory type
  replay: {
    metadata: ReplayMetadata;
    commandCount: number;
    commands: Command[];
  };
  gameState: GameState;            // final state
  statistics: MatchStatistics;     // resources, units, etc.
  executionTime: number;
}
```

---

## Integration Points

### With AI Commander Framework

**Brain Integration**:
- 0 A.D. adapter acts as game environment
- AI Commander Brain selects civilization/difficulty
- Match result feeds into rating system

**Tournament Integration**:
- Adapter executes matches as tournament games
- Results flow to tournament engine
- Supports 2+ player matches

**Analysis Integration**:
- Replay data feeds strategy analyzer
- Statistics flow to benchmark reporter
- Results available for research dashboard

---

## Limitations & Future Work

### Current Limitations
- ❌ No real-time observation (batch only)
- ❌ No mid-game intervention
- ❌ 0 A.D. must be installed locally
- ❌ GUI always renders (not true headless)
- ❌ No network multiplayer (only local)

### Future Enhancements
- Real-time state streaming (custom mod)
- Advanced AI development framework
- Performance profiling
- Custom map generation
- Multi-machine tournament support

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Replay format changes | Version pin to specific release |
| Performance bottleneck | Profile early, optimize file I/O |
| Cross-platform issues | Test on Win/Mac/Linux |
| Determinism breaks | Sealed test suite, regression testing |
| 0 A.D. not available | Skip tests gracefully |

---

## Testing Strategy

### Unit Tests (80%+ coverage)
- Configuration validation
- Parser components
- Statistics extraction
- Outcome determination

### Integration Tests
- Full match execution
- Replay parsing with real files
- Statistics accuracy
- Cross-platform compatibility

### Manual Testing
- Visual inspection of results
- Comparison with native 0 A.D.
- Edge case verification

---

## Documentation

Provided in this design package:
1. **0ad-INVESTIGATION.md** - Research findings (25 subsystems)
2. **0ad-INTEGRATION-ARCHITECTURE.md** - Technical architecture (12 design docs)
3. **0ad-IMPLEMENTATION-ROADMAP.md** - Complete backlog (22 stories)
4. **0ad-DESIGN-SUMMARY.md** - This document

---

## Implementation Phases

### Phase 1: MVP (Weeks 1-4)
- Process launcher
- Basic config/CLI
- Replay parsing
- Outcome determination

### Phase 2: Analysis (Weeks 5-6)
- Statistics extraction
- Strategy classification
- Timing analysis

### Phase 3: Polish (Weeks 7-8)
- Error handling
- Documentation
- Cross-platform testing

### Phase 4+: Future
- Real-time observation
- Advanced AI framework
- Performance optimization

---

## Success Criteria

### Functional
- [ ] Execute 0 A.D. matches programmatically
- [ ] Parse replay files and extract commands
- [ ] Determine match winner and victory condition
- [ ] Calculate game statistics
- [ ] Integrate with AI Commander framework

### Quality
- [ ] >80% test coverage
- [ ] 0 flaky tests
- [ ] Works on Windows, macOS, Linux
- [ ] All 0 A.D. civs/maps supported

### Documentation
- [ ] JSDoc for all public APIs
- [ ] Usage examples
- [ ] Architecture documentation
- [ ] Troubleshooting guide

---

## Comparison with OpenSpiel

0 A.D. vs. OpenSpiel as RTS reference:

| Factor | 0 A.D. | OpenSpiel |
|--------|--------|-----------|
| **Game Depth** | Deep, mature RTS | Simplified game states |
| **Realism** | Historical accuracy | Educational focus |
| **Community** | Active, open-source | Research-focused |
| **AI Integration** | JavaScript bots | Python agents |
| **Learning Curve** | Moderate | Gentle |
| **Determinism** | Excellent | Guaranteed |
| **Replay Support** | Native | Minimal |

**Rationale for 0 A.D.**: 
- More challenging and realistic than OpenSpiel
- Proven AI community (Petra, Arch, Hannibal)
- Production-quality game engine
- Better test ground for advanced AI strategies

---

## Conclusion

The 0 A.D. adapter design provides a solid, implementable architecture for integrating a mature RTS into AI Commander. The process-based IPC + file-based observation approach is simple, robust, and scalable. The modular implementation plan (22 stories over ~31 days) is realistic and can be parallelized effectively.

The framework is **frozen** per project guidelines - this design adds one specialized adapter without modifying core packages. The adapter is **game-agnostic from framework's perspective** - it implements the standard Adapter interface.

**Next Step**: Begin Epic 1 implementation with Story 1.1 (Package Scaffolding).

---

**Design Complete** ✅  
**Ready for Implementation** ✅  
**Framework Unmodified** ✅
