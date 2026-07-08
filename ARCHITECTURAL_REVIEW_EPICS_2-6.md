# Architectural Review: 0 A.D. Adapter (EPICs 2–6)

**Date:** 2026-07-07  
**Scope:** All classes created in EPICs 2–6  
**Purpose:** Identify responsibilities that belong in framework vs. adapter; detect duplicated framework logic  

---

## Executive Summary

The 0 A.D. adapter has grown to **84 classes** across **EPICs 2–6**, accumulating ~3,800 lines of production code. The current architecture mixes **game-specific** responsibilities with **game-independent** concerns that duplicate or foreshadow framework responsibilities.

### Key Findings

1. **Framework Duplication (HIGH PRIORITY)**
   - `MatchLoop` implements core game loop orchestration (observe→plan→decide→execute)
   - `MatchTelemetry`, `MatchMonitor` duplicate framework telemetry patterns
   - `MatchValidator` reimplements validation framework concerns
   - `DecisionPipeline`, `BrainLifecycle` are framework concerns, not adapter-specific

2. **Appropriate Adapter Responsibilities (KEEP IN ADAPTER)**
   - `ZeroADAdapter`, `ZeroADGameSession` - Game lifecycle management
   - `GameProcessManager`, `IPCBridgeImpl` - Game communication
   - `StateExtractor`, `WorldMapper` - Game state extraction & mapping
   - `CommandConverter`, `CommandInjector` - Game command execution
   - `ObservationLoop`, `ObservationProvider` - Real-time state polling

3. **Framework Abstraction Needs**
   - Generic game loop orchestration (currently in `MatchLoop`)
   - Generic decision pipeline with timeout/retry/telemetry
   - Generic lifecycle management for external systems
   - Generic validation framework
   - Generic telemetry/monitoring abstraction

---

## Detailed Class Analysis

### EPIC 2: Game Lifecycle & Process Management

#### ✅ ADAPTER-APPROPRIATE

**`ZeroADAdapter` (adapter.ts)**
- **Responsibility:** Game lifecycle orchestration, GameAdapter interface implementation
- **Game-Specific:** Yes - launches/stops 0 A.D., manages GameProcessManager
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Directly manages game process, 0 A.D. configuration, platform-specific launch
- **Framework Relationship:** Implements framework's GameAdapter interface correctly
- **Recommendation:** Keep as-is

**`GameProcessManager` (process/game-process-manager.ts)**
- **Responsibility:** 0 A.D. process spawning, lifecycle, platform detection
- **Game-Specific:** Yes - 0 A.D. executable paths, process management
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Platform-specific binary execution, signal handling
- **Framework Relationship:** Encapsulates game process details from framework
- **Recommendation:** Keep as-is

---

### EPIC 3: Game Communication & State Extraction

#### ✅ ADAPTER-APPROPRIATE

**`IPCBridgeImpl` (ipc/ipc-bridge-impl.ts)**
- **Responsibility:** Named pipe communication with 0 A.D.
- **Game-Specific:** Yes - 0 A.D. IPC protocol, pipe naming conventions
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Game-specific communication protocol
- **Framework Relationship:** Implements framework's IPCBridge interface
- **Recommendation:** Keep as-is

**`StateExtractor` (state/state-extractor.ts)**
- **Responsibility:** Parse 0 A.D. game state from raw protocol data
- **Game-Specific:** Yes - 0 A.D. state structure, unit/building parsing
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Game-specific state schema and parsing rules
- **Framework Relationship:** Produces raw game state before mapping
- **Recommendation:** Keep as-is

**`WorldMapper` (mapper/world-mapper.ts)**
- **Responsibility:** Convert game state → framework WorldState
- **Game-Specific:** Yes - 0 A.D. → domain model mapping
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Game-specific data transformation
- **Framework Relationship:** Bridges game model to framework domain
- **Recommendation:** Keep as-is

**`ObservationLoop` (state/observation-loop.ts)**
- **Responsibility:** Poll game state at fixed interval
- **Game-Specific:** Partially - timing logic is generic
- **Verdict:** BORDERLINE - CURRENTLY IN ADAPTER, but timing logic is framework-like
- **Rationale:** Implements generic tick-based polling; only game-specific part is state source
- **Framework Relationship:** Could be generalized to framework
- **Recommendation:** Consider moving generic polling logic to framework, keep only game state source

**`ObservationProvider` (observation/observation-provider.ts & session/observation-provider.ts)**
- **Responsibility:** Wrap ObservationLoop in GameSession interface
- **Game-Specific:** No - pure adapter pattern
- **Verdict:** BELONGS IN ADAPTER (as GameSession implementation)
- **Rationale:** Glue between game loop and framework interface
- **Framework Relationship:** Implements framework's ObservationProvider interface
- **Recommendation:** Keep as-is

---

### EPIC 4: Command Pipeline

#### ✅ ADAPTER-APPROPRIATE

**`CommandConverter` (commands/command-converter.ts)**
- **Responsibility:** Framework Command → 0 A.D. raw command
- **Game-Specific:** Yes - 0 A.D. command schema, unit actions
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Game-specific command encoding
- **Framework Relationship:** Consumes framework Command objects
- **Recommendation:** Keep as-is

**`CommandInjector` (commands/command-injector.ts)**
- **Responsibility:** Send commands to 0 A.D. via IPC
- **Game-Specific:** Yes - 0 A.D. IPC protocol
- **Verdict:** BELONGS IN ADAPTER
- **Rationale:** Game communication specifics
- **Framework Relationship:** Executes framework Commands
- **Recommendation:** Keep as-is

#### ⚠️ FRAMEWORK-APPROPRIATE (CURRENTLY IN ADAPTER)

**`CommandVerifier` (commands/command-verifier.ts)**
- **Responsibility:** Verify command execution by comparing pre/post state
- **Game-Specific:** No - generic state comparison pattern
- **Verdict:** COULD BELONG IN FRAMEWORK
- **Rationale:** 
  - Implements generic state diff logic
  - Compares world state snapshots (framework concern)
  - Validation strategy is game-independent
- **Framework Relationship:** Implements validation pattern, not game-specific
- **Concern:** Other games need identical validation logic
- **Recommendation:** 
  - Extract `StateVerifier` or `CommandValidator` to framework
  - Keep game-specific entity type detection in adapter

---

### EPIC 5: Match Lifecycle

#### ✅ ADAPTER-APPROPRIATE

**`Match` (match/match.ts)**
- **Responsibility:** Game session wrapper, state access
- **Game-Specific:** No - generic match container
- **Verdict:** COULD MOVE TO FRAMEWORK, but safe in adapter
- **Rationale:** 
  - Thin wrapper around GameSession
  - Provides match metadata (matchId, status, timestamps)
  - Pure orchestration, no game-specific logic
- **Framework Relationship:** Bridge between game and match concepts
- **Recommendation:** 
  - Could be moved to framework as generic Match class
  - Currently harmless in adapter

**`MatchFactory` (match/match-factory.ts)**
- **Responsibility:** Create and manage Match instances
- **Game-Specific:** No - factory pattern only
- **Verdict:** COULD MOVE TO FRAMEWORK
- **Rationale:** Generic factory, no game-specific dependencies
- **Framework Relationship:** Generic match creation pattern
- **Recommendation:** 
  - Could be framework concern (MatchManager)
  - Safe in adapter for now

#### ⚠️ FRAMEWORK-APPROPRIATE (CURRENTLY IN ADAPTER)

**`MatchLoop` (match/match-loop.ts)**
- **Responsibility:** Orchestrate observe→plan→decide→execute cycle
- **Game-Specific:** No - game-independent orchestration
- **Verdict:** BELONGS IN FRAMEWORK
- **Rationale:**
  - Implements generic game loop state machine
  - Tick-based orchestration (framework domain)
  - LoopCallbacks pattern is framework concern
  - Metrics collection is framework telemetry
  - Per-tick latency tracking is framework concern
- **Framework Relationship:** IS a framework concern, duplicates expected framework pattern
- **Concern:** Every game adapter will need identical game loop
- **Recommendation:** 
  - **MOVE TO FRAMEWORK** as `GameLoop` or `MatchExecutor`
  - Keep only game-specific integrations in adapter

**`MatchTelemetry` (match/match-telemetry.ts)**
- **Responsibility:** Track unit/building counts, detect trends
- **Game-Specific:** Partially - snapshot recording is generic, trend detection could apply to any state
- **Verdict:** FRAMEWORK-APPROPRIATE
- **Rationale:**
  - Implements generic snapshot + metrics pattern
  - State summary (unit count, etc.) structure is game-agnostic
  - Trend detection (increasing/decreasing) is generic
  - Only game-specific part: what to count
- **Framework Relationship:** Duplicates framework telemetry concepts
- **Concern:** Framework needs generic telemetry; game-specific metrics should be customizable
- **Recommendation:**
  - Extract generic `Telemetry<T>` or `StateMetrics` to framework
  - Keep only game-specific metrics in adapter

**`MatchMonitor` (match/match-monitor.ts)**
- **Responsibility:** Record observations, commands, errors; detect anomalies
- **Game-Specific:** No - generic monitoring pattern
- **Verdict:** BELONGS IN FRAMEWORK
- **Rationale:**
  - Implements observation/command/error recording (framework pattern)
  - Anomaly detection (sudden unit loss) is game-specific, but infrastructure is generic
  - Health checks are generic
  - State history is generic concern
- **Framework Relationship:** Duplicates framework monitoring/instrumentation
- **Concern:** Framework needs this; every game will need it
- **Recommendation:**
  - Extract `MatchMonitor` or `ExecutionMonitor` to framework
  - Keep only game-specific anomaly rules in adapter

**`MatchValidator` (match/match-validator.ts)**
- **Responsibility:** Validate match state against rules
- **Game-Specific:** Partially - rules are game-specific, framework is not
- **Verdict:** FRAMEWORK-APPROPRIATE (for framework, game rules stay in adapter)
- **Rationale:**
  - Implements generic rule-based validation pattern
  - ValidationRule interface is framework concern
  - Specific rules (tick progression, no errors) are generic
  - Only truly game-specific rule: agent count > 0
- **Framework Relationship:** Duplicates validation framework concept
- **Recommendation:**
  - Extract `RuleValidator` or `ExecutionValidator` to framework with ValidationRule interface
  - Keep game-specific rules (agent requirements) in adapter

---

### EPIC 6: Brain Pipeline Integration

#### ⚠️ FRAMEWORK-APPROPRIATE (CURRENTLY IN ADAPTER)

**`BrainAdapter` (match/brain-adapter.ts)**
- **Responsibility:** Convert WorldState ↔ Brain SDK types
- **Game-Specific:** No - generic type conversion
- **Verdict:** BELONGS IN FRAMEWORK
- **Rationale:**
  - Implements generic state→observation conversion
  - Default goals/commands are framework pattern
  - ExecutionMemory factory is framework concern
  - Type mapping is declarative, not game-specific
- **Framework Relationship:** IS the adapter pattern the framework needs
- **Concern:** Framework needs this abstraction for all games
- **Recommendation:**
  - Move to framework as `BrainStateAdapter` or `ObservationAdapter`
  - Keep only game-specific goal/command definitions in adapter config

**`DecisionPipeline` (match/decision-pipeline.ts)**
- **Responsibility:** Execute brain decisions with timeout, retry, telemetry
- **Game-Specific:** No - pure execution framework
- **Verdict:** BELONGS IN FRAMEWORK
- **Rationale:**
  - Timeout handling is framework concern (every game needs it)
  - Retry logic is framework pattern
  - Cancellation tokens are framework concern
  - Telemetry (latency, attempts, success) is framework concern
  - No game-specific knowledge whatsoever
- **Framework Relationship:** CORE framework responsibility
- **Concern:** This MUST be in framework; duplicating it per-game is waste
- **Recommendation:**
  - **MOVE TO FRAMEWORK** as `DecisionExecutor` or `BrainPipeline`
  - Keep only configuration in adapter

**`BrainLifecycle` (match/brain-lifecycle.ts)**
- **Responsibility:** Manage Brain initialization, health, recovery
- **Game-Specific:** No - applies to any external system lifecycle
- **Verdict:** BELONGS IN FRAMEWORK
- **Rationale:**
  - State machine (init→healthy→degraded→failed→shutdown) is generic
  - Health checking is framework pattern
  - Error tracking is framework concern
  - Recovery attempt logic is framework pattern
  - No game-specific knowledge
- **Framework Relationship:** CORE framework responsibility for external systems
- **Concern:** Framework needs this for Brain, LLM providers, any external service
- **Recommendation:**
  - **MOVE TO FRAMEWORK** as `ExternalSystemLifecycle` or `ComponentLifecycle`
  - Apply to Brain, rating system, tournament engine, etc.

**`BrainIntegrationValidator` (match/brain-integration-validator.ts)**
- **Responsibility:** Validate observe→plan→decide→execute cycle
- **Game-Specific:** No - integration test pattern is generic
- **Verdict:** FRAMEWORK-APPROPRIATE
- **Rationale:**
  - Cycle validation is integration testing concern (framework domain)
  - Latency measurement is framework concern
  - Determinism verification is framework pattern
  - Error recovery testing is framework concern
- **Framework Relationship:** Framework integration testing utility
- **Recommendation:**
  - Could move to framework as `IntegrationValidator` or test utility
  - Currently safe in adapter; can stay if not duplicated by other games

---

## Summary Table

| Class | Component | Location | Verdict | Framework Match | Action |
|-------|-----------|----------|---------|-----------------|--------|
| ZeroADAdapter | Lifecycle | ADAPTER | ✅ KEEP | GameAdapter impl | Keep |
| GameProcessManager | Process | ADAPTER | ✅ KEEP | Game-specific | Keep |
| IPCBridgeImpl | Communication | ADAPTER | ✅ KEEP | Game-specific | Keep |
| StateExtractor | State | ADAPTER | ✅ KEEP | Game-specific | Keep |
| WorldMapper | Mapping | ADAPTER | ✅ KEEP | Game-specific | Keep |
| ObservationLoop | Polling | ADAPTER | ⚠️ REVIEW | Generic polling | Move timing to FW |
| ObservationProvider | Interface | ADAPTER | ✅ KEEP | GameSession impl | Keep |
| CommandConverter | Commands | ADAPTER | ✅ KEEP | Game-specific | Keep |
| CommandInjector | Commands | ADAPTER | ✅ KEEP | Game-specific | Keep |
| CommandVerifier | Validation | ADAPTER | ⚠️ REVIEW | Generic pattern | Extract verifier to FW |
| Match | Orchestration | ADAPTER | ⚠️ REVIEW | Generic container | Could move to FW |
| MatchFactory | Factory | ADAPTER | ⚠️ REVIEW | Generic factory | Could move to FW |
| **MatchLoop** | **Orchestration** | **ADAPTER** | **❌ MOVE** | **Core game loop** | **MOVE TO FRAMEWORK** |
| MatchTelemetry | Telemetry | ADAPTER | ❌ MOVE | Generic metrics | Extract to FW |
| **MatchMonitor** | **Monitoring** | **ADAPTER** | **❌ MOVE** | **Generic monitoring** | **MOVE TO FRAMEWORK** |
| **MatchValidator** | **Validation** | **ADAPTER** | **❌ MOVE** | **Generic validation** | **MOVE TO FRAMEWORK** |
| **BrainAdapter** | **Conversion** | **ADAPTER** | **❌ MOVE** | **Generic adapter** | **MOVE TO FRAMEWORK** |
| **DecisionPipeline** | **Execution** | **ADAPTER** | **❌ MOVE** | **Core framework** | **MOVE TO FRAMEWORK** |
| **BrainLifecycle** | **Lifecycle** | **ADAPTER** | **❌ MOVE** | **Generic lifecycle** | **MOVE TO FRAMEWORK** |
| BrainIntegrationValidator | Validation | ADAPTER | ⚠️ REVIEW | Test utility | Could move to FW |

---

## Refactoring Proposal

### Phase 1: HIGH PRIORITY (Critical Framework Duplication)

These are core framework responsibilities currently in the adapter:

**1. Move `MatchLoop` → Framework as `GameLoop`**
- Location: `@ai-commander/framework/src/execution/game-loop.ts` (new)
- Keep in adapter: `MatchLoop` → `ZeroADGameLoop` (thin wrapper if needed)
- Scope:
  - Generic observe→plan→decide→execute orchestration
  - LoopCallbacks pattern
  - Iteration counting & timing
  - Tick-based scheduling
- Game-specific parts (stay in adapter):
  - Integration with ZeroADGameSession
  - Game-specific context passing

**2. Move `DecisionPipeline` → Framework as `BrainExecutor` or `DecisionExecutor`**
- Location: `@ai-commander/framework/src/execution/brain-executor.ts` (new)
- Keep in adapter: Configuration only (timeout, retry values)
- Scope:
  - Timeout with cancellation
  - Automatic retry with backoff
  - Decision telemetry
  - Latency measurement
- Game-specific parts (stay in adapter):
  - None (this is 100% framework)

**3. Move `BrainLifecycle` → Framework as `ExternalSystemLifecycle`**
- Location: `@ai-commander/framework/src/lifecycle/external-system-lifecycle.ts` (new)
- Keep in adapter: Configuration only (timeout, error threshold)
- Scope:
  - State machine (init → healthy → degraded → failed → shutdown)
  - Health checking
  - Error tracking & recovery
  - Event emission
- Game-specific parts (stay in adapter):
  - None (reusable for any external system)

### Phase 2: MEDIUM PRIORITY (Duplicated Patterns)

**4. Move `MatchMonitor` → Framework as `ExecutionMonitor`**
- Location: `@ai-commander/framework/src/monitoring/execution-monitor.ts` (new)
- Keep in adapter: Anomaly detection rules
- Scope:
  - Observation/command/error recording
  - State history tracking
  - Health status computation
  - Metrics aggregation
- Game-specific parts (stay in adapter):
  - Anomaly detection thresholds
  - Unit/building loss detection rules

**5. Move `MatchValidator` → Framework as `RuleValidator`**
- Location: `@ai-commander/framework/src/validation/rule-validator.ts` (new)
- Keep in adapter: Game-specific validation rules
- Scope:
  - ValidationRule interface
  - Rule execution engine
  - Issue categorization (error/warning/info)
  - Result aggregation
- Game-specific parts (stay in adapter):
  - Rules (agent present, tick progression, no errors, etc.)

**6. Extract `MatchTelemetry` → Framework as `StateMetrics<T>`**
- Location: `@ai-commander/framework/src/telemetry/state-metrics.ts` (new)
- Keep in adapter: Game-specific metric definitions
- Scope:
  - Generic snapshot recording
  - Trend detection (increasing/decreasing)
  - Aggregation (min/max/avg)
  - Metric computation
- Game-specific parts (stay in adapter):
  - What to count (unit count, building count)
  - State structure

### Phase 3: LOW PRIORITY (Nice-to-have Moves)

**7. Extract `BrainAdapter` → Framework as `ObservationAdapter`**
- Location: `@ai-commander/framework/src/brain/observation-adapter.ts` (new)
- Keep in adapter: Game-specific state mappings
- Scope:
  - Generic WorldState → Brain SDK type conversion
  - Default goals/commands factory pattern
  - Execution memory composition
- Game-specific parts (stay in adapter):
  - Goal options (game-specific strategy goals)
  - Command options (game-specific actions)

**8. Consider moving `Match` → Framework as generic `GameMatch`**
- Location: `@ai-commander/framework/src/match/game-match.ts` (new)
- Keep in adapter: Create via factory
- Scope: Generic match container, metadata, state access
- No game-specific parts; pure abstraction

**9. Consider moving `MatchFactory` → Framework as `MatchManager`**
- Location: `@ai-commander/framework/src/match/match-manager.ts` (new)
- Keep in adapter: None
- Scope: Generic match creation, lifecycle
- No game-specific parts

---

## Non-Refactoring Items (Keep in Adapter)

These correctly belong in the adapter and should not be moved:

- **ZeroADAdapter** — Game process management
- **GameProcessManager** — Platform-specific binary execution
- **IPCBridgeImpl** — 0 A.D. IPC protocol
- **StateExtractor** — 0 A.D. state parsing
- **WorldMapper** — Game state → domain model
- **CommandConverter** — Framework Command → 0 A.D. action
- **CommandInjector** — 0 A.D. command execution
- **ObservationProvider** (game session) — GameSession interface implementation
- **ConfigurationLoader** — Game-specific config
- **Logger** — Logging utility (fine-grained per-adapter)

---

## Risk Analysis

### Moving `MatchLoop` to Framework
- **Risk:** Other games may have different loop patterns (pause, replay, etc.)
- **Mitigation:** Make loop extensible via callbacks; keep architecture flexible
- **Benefit:** Eliminates ~150 lines of duplicate code per game

### Moving `DecisionPipeline` to Framework
- **Risk:** Brain execution might vary by game
- **Mitigation:** Pipeline is agnostic to Brain implementation; configs parameterize behavior
- **Benefit:** Eliminates ~300 lines of duplicate code per game; critical infrastructure

### Moving `BrainLifecycle` to Framework
- **Risk:** External system lifecycle might vary
- **Mitigation:** Generic state machine handles all cases; customizable via recovery strategy
- **Benefit:** Applies to Brain, LLM providers, rating system, etc.

### Extracting Validation/Telemetry to Framework
- **Risk:** Game-specific rules/metrics need to stay customizable
- **Mitigation:** Use strategy pattern; framework provides infrastructure, adapter provides rules
- **Benefit:** Eliminates 400+ lines of duplicate framework logic

---

## Code Ownership Model

### Framework Owns
- Game loop orchestration
- Decision pipeline execution
- External system lifecycle
- Monitoring/telemetry infrastructure
- Validation rule engine
- Brain adapter pattern

### Adapter Owns
- Game process management
- Game communication (IPC, state parsing)
- Game state extraction & mapping
- Game-specific commands
- Game-specific goals & strategies
- Game-specific validation rules
- Game-specific anomaly detection

---

## Implementation Timeline

### If Framework Moves are Approved

1. **Week 1:** Move `DecisionPipeline`, `BrainLifecycle` (highest impact, minimal risk)
2. **Week 2:** Move `MatchLoop`, `MatchMonitor` (larger, well-defined)
3. **Week 3:** Extract `MatchValidator`, `MatchTelemetry` (with game-specific rule separation)
4. **Week 4:** Extract `BrainAdapter`, cleanup
5. **Week 5+:** Move `Match`/`MatchFactory` if downstream code is ready

---

## Recommendations

### Immediate (Before EPIC 7)

1. **Approve** moving `DecisionPipeline` and `BrainLifecycle` to framework
2. **Approve** moving `MatchLoop` to framework with callback extensibility
3. **Plan** extraction of `MatchMonitor`, `MatchValidator` with game-specific rule separation

### Medium-term

4. Extract `MatchTelemetry` and `BrainAdapter` to framework
5. Review `Match` and `MatchFactory` for framework promotion

### Long-term

6. Refactor all adapters to use framework versions
7. Ensure OpenRA, Starcraft, other adapters reuse framework code
8. Maintain adapter purity: game communication only

---

## Conclusion

The 0 A.D. adapter has evolved to contain **5-7 major framework responsibilities** that should be relocated to the framework and reused across all games:

- Core orchestration (`MatchLoop`)
- Critical infrastructure (`DecisionPipeline`, `BrainLifecycle`)
- Generic monitoring/validation (`MatchMonitor`, `MatchValidator`)
- Type adaptation (`BrainAdapter`)

**Estimated framework code to extract: 1,500–2,000 lines**  
**Estimated adapter code to remove: 1,200–1,600 lines**  
**Net benefit:** Clean, maintainable, game-agnostic framework; focused game-specific adapters

The framework is emerging from the adapter's implementation patterns. Formalizing these patterns at the framework level will unblock EPIC 7 (Live Arena) and provide a solid foundation for multi-game tournaments.

