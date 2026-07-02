# Session Handoff — AI Commander

**Purpose**: Enable any engineer to resume work immediately without reading chat history.

**Last Updated**: July 2, 2026

**Current Status**: Framework stable, product-layer actively developing

---

# Quick Start for Next Engineer

1. **Read this file** (you are here)
2. **Read `.foundation/state/PROJECT_STATE.md`** (comprehensive state)
3. **Read `.foundation/state/CTO_CONTEXT.md`** (strategic principles)
4. **Check out latest story**: `STORY_096_DELIVERABLE.md`
5. **Run the demo**: `pnpm demo` (see everything in action)

---

# Repository Status

**Branch**: main  
**Latest Commit**: `5fcd9cd` — Story 096: Goal Progress Evaluation - Complete  
**Test Status**: 980/980 passing ✅  
**Build Status**: Clean ✅  
**Framework Status**: Frozen and proven ✅  

```bash
# Verify everything works
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

# Current Milestone

**Milestone 5: Mission Intelligence** (In Progress)

### Completed Stories (091-096)

Stories deliver observable agent intelligence:

| Story | Title | Outcome |
|-------|-------|---------|
| 091 ✅ | Goal State Verification | Agent verifies goals are achieved in world |
| 092 ✅ | Dynamic Replanning | Agent replans based on actual state |
| 093 ✅ | Plan Invalidation | Agent detects invalid plans and regenerates |
| 094 ✅ | Failure Diagnosis & Recovery | Agent recovers from command failures |
| 095 ✅ | Goal Evaluation & Prioritization | Agent switches to higher-priority goals |
| 096 ✅ | Goal Progress Evaluation | Agent measures progress toward goals |

### In Progress (097-100)

Pending stories to complete the milestone:

| Story | Title | Dependency |
|-------|-------|------------|
| 097 | Dashboard Progress Visualization | Requires 096 ✅ |
| 098 | Multi-Goal Orchestration | Requires 096, 097 |
| 099 | Goal Completion Callbacks | Requires 098 |
| 100 | Adaptive Goal Adjustment | Requires 099 |

---

# Last Completed Story

**Story 096: Goal Progress Evaluation**

### What It Does

Agents now measure progress toward goals using observable world state:

- **Progress Calculation**: Manhattan distance from current position to target
- **Trend Detection**: improving / stable / regressing
- **Evidence Recording**: Full measurement details in execution trace
- **History Tracking**: Last 20 progress records per goal

### Files Changed

- Created: `goal-progress-evaluator.ts` (344 lines)
- Created: `goal-progress-evaluator.test.ts` (300 lines, 25 tests)
- Modified: `execution-trace.ts` (+3 event types, +recording methods)
- Modified: `runtime-metrics.ts` (+3 progress event types)

### Test Results

- All 25 new tests passing
- 980 total tests passing (↑ from 962)
- 52 test suites, 100% pass rate

### Deliverable

See: `STORY_096_DELIVERABLE.md` for comprehensive documentation

---

# Current Product Status

## Agent Capabilities

✅ **Observable Goal Achievement**
- Agent verifies goals are satisfied in world state
- Not just counting commands executed

✅ **Adaptive Planning**
- Plans updated based on actual agent position
- Not cached or assumed

✅ **Plan Validation**
- Invalid plans detected and regenerated
- Failures trigger replanning

✅ **Failure Recovery**
- Command failures detected
- Recovery strategies selected
- Execution resumes

✅ **Goal Prioritization**
- Multiple goals evaluated
- Agent switches to higher-priority goals
- Scoring is observable

✅ **Progress Measurement**
- Goal progress calculated from world state
- 0-100% with evidence
- Trends tracked (improving/stable/regressing)

## What This Looks Like

When you run `pnpm demo`:

1. Browser dashboard opens (http://localhost:3000)
2. Agent executes a mission
3. You can see:
   - Real-time progress toward goal
   - Agent position on the map
   - Every decision made
   - Every command executed
   - Reasons for each action
   - Progress trends

This **feels intelligent** because the agent demonstrates observable goal-awareness.

---

# Important Design Decisions

## Framework is Frozen

The framework (`packages/*`) has not changed in 6 months. It is proven correct.

**What This Means**:
- No new features in framework packages
- No architectural changes without ADR
- Product development happens in `apps/reference/` only
- Intelligence is built in application layer

**Why It Matters**:
- Stability for years of development
- Other teams can use frozen framework
- Focus on product differentiation, not infrastructure

## Product-First Philosophy

All recent work (Stories 091-096) occurred in `apps/reference/` with ZERO framework changes.

**Pattern**:
```
Domain/Framework (frozen) ← Application Layer (evolving)
```

The framework provides contracts. Applications implement intelligence.

## Observable, Not Assumed

Agent behavior is **measured from world state**, not estimated from command history.

**Example (Story 096)**:
```typescript
// WRONG (old approach):
progress = (commandsExecuted / expectedCommands) * 100

// RIGHT (new approach):
const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
progress = (initialDistance - distance) / initialDistance * 100
```

This makes progress **deterministic** and **verifiable**.

## YAGNI is Enforced

"You Aren't Gonna Need It" is a release gate.

**What This Means**:
- No abstract base classes without implementations
- No interfaces for hypothetical future use
- No layers or services until needed
- Every line solves a current problem

**Example**: Stories 091-096 added intelligence without new abstractions. Pure application code.

---

# Current Repository Structure

```
ai-commander/
├── .foundation/
│   ├── adr/                    # 5 approved ADRs
│   ├── docs/
│   │   └── ARCHITECTURE.md     # 5500+ lines, FROZEN
│   ├── design-review/          # Analysis and decisions
│   ├── research/               # Game evaluation, OpenRA research
│   └── state/
│       ├── PROJECT_STATE.md    # ← COMPREHENSIVE STATE (read this)
│       ├── SESSION_HANDOFF.md  # ← YOU ARE HERE
│       └── CTO_CONTEXT.md      # ← STRATEGIC PRINCIPLES (read next)
├── packages/
│   ├── domain/                 # Game-agnostic types (FROZEN)
│   ├── core/                   # Infrastructure (FROZEN)
│   ├── engine/                 # Execution loop (FROZEN)
│   ├── adapter/                # Game adapter contracts (FROZEN)
│   ├── fake-game-adapter/      # Reference implementation (FROZEN)
│   ├── openra-adapter/         # OpenRA integration (production-validated)
│   ├── planner/                # Planner interface (FROZEN)
│   ├── goals/                  # Goal system (FROZEN, Story 091)
│   ├── decision/               # Decision interface (FROZEN)
│   ├── agent-runtime/          # Agent orchestration (FROZEN)
│   └── behavior-tree/          # Behavior trees (FROZEN)
├── apps/
│   └── reference/              # ← PRODUCT DEVELOPMENT HAPPENS HERE
│       ├── src/
│       │   ├── mission-agent.ts           # Orchestrates missions
│       │   ├── movement-planner.ts        # Domain-specific planner
│       │   ├── goal-progress-evaluator.ts # Story 096 implementation
│       │   ├── execution-trace.ts         # Observability
│       │   ├── runtime-metrics.ts         # Metrics
│       │   ├── dashboard-server.ts        # Browser dashboard
│       │   └── [CLI tools and utilities]
│       └── tests/
├── docs/
│   ├── README.md               # Documentation index
│   ├── QUICK_START.md          # 10-minute onboarding
│   ├── DEVELOPER_GUIDE.md      # Architecture and patterns
│   └── GUIDES.md               # Step-by-step how-tos
└── README.md                   # Main project documentation
```

**Key Insight**: Framework is frozen (left side). Product development is active (right side).

---

# Constraints

These are NOT suggestions. They are enforced.

## Architecture Frozen

- Cannot modify package boundaries
- Cannot add new framework packages
- Cannot change public API contracts
- Cannot introduce circular dependencies

**Exception**: Approved Architecture Decision Record (ADR)

## Framework Runtime Frozen

- Cannot change AgentRuntime interface
- Cannot change Planner interface
- Cannot change DecisionEngine interface
- Cannot change GameAdapter interface

**Exception**: Approved ADR (hasn't happened)

## Product-First Mandate

- All development happens in `apps/reference/` or application-specific code
- Framework changes are rare and require ADR
- Test-first development required
- YAGNI enforced (no speculative code)

## Code Quality Mandatory

- TypeScript strict mode (no exceptions)
- All tests passing (0 failures)
- Lint clean (ESLint)
- Properly formatted (Prettier)
- No technical debt

---

# How to Start Work

## 1. Understand the Current State

Read these files in order:

1. `PROJECT_STATE.md` (comprehensive snapshot)
2. `CTO_CONTEXT.md` (strategic principles)
3. Latest story deliverable (e.g., `STORY_096_DELIVERABLE.md`)

## 2. Run the Demo

```bash
cd ai-commander
pnpm install
pnpm demo
```

This:
- Builds everything
- Runs tests
- Launches browser dashboard
- Executes autonomous mission
- Shows complete observability stack

## 3. Understand the Architecture

Read these in order:

1. `.foundation/docs/ARCHITECTURE.md` (complete frozen spec, 5500+ lines)
2. `.foundation/adr/*.md` (5 architecture decisions)
3. `packages/*/README.md` (package-specific docs)

## 4. Get Next Story Spec from CTO

The next story (097, 098, etc.) will be provided with:
- Detailed requirements
- Acceptance criteria
- Specification
- Any architectural guidance

## 5. Implement Following Pattern

```
1. Create feature in apps/reference/src/
2. Write tests for all scenarios
3. Verify all checks pass: pnpm doctor
4. Create STORY_###_DELIVERABLE.md
5. Update PROJECT_STATE.md if needed
6. Commit and ready for merge
```

---

# Recommended Next Story

Based on current state, the next logical story is:

**Story 097: Dashboard Progress Visualization**

### Objective

Integrate goal progress data (from Story 096) into the browser dashboard.

### What Users Will See

- Current goal progress as a percentage bar
- Trend indicator (↑ improving / → stable / ↓ regressing)
- Evidence cards showing measurements
- Progress over time (last 5 measurements)

### Dependencies

- ✅ Story 096 (GoalProgressEvaluator, trace events)
- ✅ Dashboard infrastructure already exists
- ✅ Browser rendering infrastructure ready

### Why This Story

Makes progress **visible** in the dashboard. Users can watch the agent make progress toward its goal in real-time.

### Estimated Effort

3-5 days (UI integration + tests)

---

# Tools and Commands

## Daily Development

```bash
# Start demo (launches browser)
pnpm demo

# Run all checks (CI equivalent)
pnpm doctor

# Run tests with watch
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Build everything
pnpm build
```

## Reference Application

```bash
cd apps/reference

# Run mission
pnpm mission run --target-x 5 --target-y 3

# See execution trace
pnpm mission trace

# View runtime metrics
pnpm mission metrics

# Validate execution consistency
pnpm mission replay

# View complete report
pnpm mission report

# Inspect runtime state
pnpm mission inspect

# Get help
pnpm mission --help
```

## Story Deliverables

Each completed story has a deliverable document:

```
STORY_096_DELIVERABLE.md    # Latest (Story 096)
STORY_095_DELIVERABLE.md    # Previous
STORY_094_DELIVERABLE.md    # Previous
```

Read the latest deliverable to understand what was just built.

---

# Troubleshooting

## Tests Failing

1. Clear node_modules: `rm -rf node_modules && pnpm install`
2. Check Node version: `node --version` (need 22+)
3. Run individual test: `cd packages/goals && pnpm test`

## Build Errors

1. Check TypeScript: `pnpm typecheck`
2. Check lint: `pnpm lint`
3. Check format: `pnpm format`

## Demo Not Starting

1. Port 3000 in use? Change: `const PORT = 3001` in dashboard-server.ts
2. Browser not opening? Manual: http://localhost:3000
3. Game not available? Check `pnpm mission run` output for errors

---

# Key Metrics

## Code Quality

- **Tests**: 980 passing across 52 suites (100% pass rate)
- **Lint**: 0 errors
- **Format**: 100% compliance
- **Types**: Strict mode, 0 errors
- **Build**: Clean

## Framework

- **Packages**: 13 (all frozen, production-ready)
- **Lines**: 5000+ (foundation + contracts)
- **Architecture**: Fully documented (5500+ lines in ARCHITECTURE.md)
- **Dependencies**: Unidirectional, no cycles

## Product

- **Stories Completed**: 96 (001-096)
- **Latest Milestone**: Mission Intelligence (6 of 9 stories done)
- **Agent Capabilities**: Goal-aware, adaptive, recovers from failures
- **Observability**: Traces (22+ events), Metrics (26 types), Replay validation, Inspector

---

# When You Hand Off to the Next Engineer

1. Update this file with current status
2. Update PROJECT_STATE.md if major work completed
3. Commit: `git commit -am "Session handoff: Update state documents"`
4. Leave a note if there are gotchas

---

# Questions?

If something is unclear, check:

1. `.foundation/docs/ARCHITECTURE.md` — comprehensive specification
2. `packages/*/README.md` — package-specific documentation
3. `STORY_###_DELIVERABLE.md` — latest work completed
4. `.foundation/adr/*.md` — architectural decisions

Everything is documented. If it's not, that's a bug.

---

**Good luck! The codebase is in excellent shape. Focus on the next story and keep the repository clean.**

**Previous Sessions:**

- Story 091 (World-State Driven Planning) — Agent reads position/goal from world state, not hardcoded assumptions
- Story 092 (Execution Preconditions) — Validates commands before execution, records skip reasons
- Story 093 (Plan Invalidation & Adaptive Replanning) — Detects stale plans, reuses valid ones, generates fresh when needed

**This Session - Story 094 (Failure Diagnosis & Adaptive Recovery):**

- ✅ Created `failure-diagnosis.ts` (363 lines)
  - `FailureDiagnoser` class: analyzes failures and diagnoses root causes
  - 8 diagnosis categories: goal_already_achieved, target_unavailable, acting_unit_unavailable, preconditions_failed, command_execution_failed, world_changed, planner_assumptions_invalid, unknown_failure
  - `RecoveryStrategy` class: maps diagnoses to recovery actions deterministically
  - 6 recovery actions: continue_plan, skip_action, retry_action, invalidate_plan, generate_replacement_plan, abort_mission
  - Severity levels: low, medium, high (for prioritization)

- ✅ Enhanced `execution-trace.ts`
  - Added 4 new event types: failure_detected, diagnosis_generated, recovery_selected, recovery_completed
  - Added recording methods: recordFailureDetected(), recordDiagnosisGenerated(), recordRecoverySelected(), recordRecoveryCompleted()
  - Updated formatTrace() with visual indicators for failures (⚠), diagnosis (📋), recovery (🔧)

- ✅ Enhanced `mission-agent.ts`
  - Integrated failure diagnosis into mission loop
  - Wrapped runtime.tick() in try-catch for failure detection
  - Instantiated FailureDiagnoser and RecoveryStrategy
  - Implemented recovery action execution logic
  - Each recovery action has specific behavior (continue, skip, invalidate plan, abort)

- ✅ Enhanced `runtime-metrics.ts`
  - Added diagnosis_generated to reasoning events
  - Added failure_detected, recovery_selected, recovery_completed to execution events
  - Metrics now track failure diagnosis and recovery activities

- ✅ Created `failure-recovery-demo.ts`
  - Demonstrates complete failure diagnosis and recovery sequence
  - Shows two scenarios: short mission (2,1) and longer mission (3,3)
  - Displays observable flow: Failure → Diagnosis → Recovery → Outcome
  - Demonstrates deterministic behavior of recovery system

- ✅ Created `failure-diagnosis.test.ts` (28 tests)
  - Tests for all 8 diagnosis categories
  - Tests for all 6 recovery actions
  - Determinism validation (same input → same output)
  - Severity level classification tests
  - Edge cases (goal achieved, unit unavailable, etc.)

- ✅ All validation passing: build, test, lint, format
- ✅ 948 total tests passing (↑ from 931, +17 diagnosis tests)

**Key Architectural Principles Demonstrated:**

1. **Determinism** — All diagnosis and recovery decisions are deterministic (no randomness)
2. **Explicit Categories** — 8 specific diagnosis categories, not generic "failure"
3. **Clear Mapping** — Each diagnosis maps to exactly one recovery action
4. **Severity Levels** — Failures classified by severity for prioritization
5. **Observability** — All diagnosis and recovery events recorded in trace
6. **No Framework Changes** — Implementation entirely in product layer
7. **Integration Ready** — Events ready for dashboard display and timeline recording

**Series Completion (Stories 091-094):**

Story 091: World-State Driven Planning ✅
Story 092: Execution Preconditions ✅
Story 093: Plan Invalidation & Adaptive Replanning ✅
Story 094: Failure Diagnosis & Adaptive Recovery ✅

Total new code:
- 363 lines: failure-diagnosis.ts
- 189 lines: enhanced execution-trace.ts
- 145 lines: enhanced mission-agent.ts
- 50 lines: enhanced runtime-metrics.ts
- 180 lines: failure-recovery-demo.ts
- 280 lines: failure-diagnosis.test.ts

Total tests: 948 (↑ from 931)

---

# Repository Status

Current repository maturity:

```text
Foundation Phase - COMPLETE ✅
Architecture Documentation - COMPLETE ✅
Domain Model - COMPLETE ✅
Core Framework - COMPLETE ✅
Adapter Layer - COMPLETE ✅
Reference Implementation - COMPLETE ✅
Ready for Game Implementations
```

Implementation status:

- ✅ Repository infrastructure (npm Workspaces, TypeScript, tooling)
- ✅ Architectural documentation (ARCHITECTURE.md, 5 ADRs)
- ✅ Complete packages (domain, ecs, engine, core, adapter, planner, decision, fake-game-adapter)
- ✅ Game-agnostic domain model complete (33 tests)
- ✅ Core framework infrastructure complete (50 tests)
- ✅ Adapter layer with contracts (20 tests)
- ✅ Reference fake game adapter implementation (60 tests)
- ✅ E2E runtime tests demonstrating complete framework (10 tests)
- ✅ 343 total tests passing
- ✅ All validation checks passing (typecheck, lint, format, test)

---

# Session Work: Domain Model Implementation

## Completed Modules

### 1. Identity Types (`identity.ts`)

- EntityId, ComponentId, PlayerId, TeamId, GameId
- Branded string types for compile-time type safety
- Validation and creation helpers for each

### 2. Spatial Types (`spatial.ts`)

- **Position**: Flexible format supporting:
  - Grid coordinates: `row:5,col:10`
  - Continuous: `100.5,200.3`
  - Hex grids: `hex-15-20`
  - Graph nodes: `node-42`
  - Custom formats (game-defined)
- **GameMap**: World layout with dimensions and position lists
- **Region**: Area grouping for regions, visibility, management

### 3. Temporal Types (`temporal.ts`)

- **Tick**: Discrete game time step (turn, frame, simulation step)
- **Phase**: Multi-phase turn support (perception, decision, action, resolution)
- **GameTime**: Abstract time with human-readable display
- Supports: turn-based, real-time, simulation games

### 4. Resource System (`resource.ts`)

- **ResourceType**: Configurable with min/max, stackability, renewable flag
- **Resource**: Amount of a specific type
- **ResourcePool**: Collection with query methods:
  - `getAmount(typeId)` → amount
  - `hasEnough(typeId, amount)` → boolean
  - `getResource(typeId)` → Resource | undefined
- Supports: economy (gold/wood), combat (health/mana), action points, cards, tokens

### 5. Player and Team (`player.ts`)

- **Player**: Human or AI with team affiliation, custom data
- **Team**: Group of players for cooperative play
- Both fully immutable with validation

### 6. Agent System (`agent.ts`)

- **Agent**: Branded string type for entity ID
- **AgentSnapshot**: Current state snapshot:
  - Agent ID, controller (player or null for NPC)
  - AgentState enum: Idle, Perceiving, Deciding, Acting, Waiting, Defeated, Unknown
  - Resources and custom data
- Helper functions: `isAgentActive()`, `isPlayerControlled()`

### 7. World State (`world.ts`)

- **WorldState**: Immutable game snapshot containing:
  - Game time
  - Map
  - All players and teams
  - All agent snapshots
  - Custom game-specific data
- Query functions:
  - `getAgent(state, agentId)` → AgentSnapshot | undefined
  - `getPlayerAgents(state, playerId)` → AgentSnapshot[]
  - `agentExists(state, agentId)` → boolean
  - `getPlayer(state, playerId)` → Player | undefined
  - `getTeam(state, teamId)` → Team | undefined

### 8. Action System (`action.ts`)

- **ActionId**: Branded type for action identity
- **Command**: Agent intent to act:
  - ID, agent, action type, parameters
  - Issued tick and priority
- **ActionResult**: Discriminated union:
  - Success: includes effects
  - Failure: includes reason
- Type guards: `isActionSuccess()`, `isActionFailure()`

### 9. Event System (`event.ts`)

- **EventType**: Event category with visibility control
- **Event**: What happened
  - ID, type, triggering agent, tick, data
  - Public (visible to all) or private (specific observers)
- Helpers:
  - `createPublicEvent()` → visible to all
  - `createPrivateEvent(visibleTo)` → specific observers
  - `canObserveEvent(event, observerId)` → boolean
  - `isPublicEvent()` → boolean

### 10. Perception System (`perception.ts`)

- **VisibilityState** enum: Visible, FogOfWar, Unexplored
- **PositionVisibility**: Track visibility of specific position
  - State, occupier agent, last seen tick
- **FogOfWar**: Complete vision system:
  - Agent ID, all position visibility
  - Vision range (null for custom rules)
  - Lighting effects, modifiers
  - Helpers: `getPositionVisibility()`, `countVisiblePositions()`
- **Observation**: Limited view of world
  - Visible agents, fog of war, visible events
  - Custom senses (game-specific)
  - Helper: `canObserveAgent()`

### 11. Capability System (`capability.ts`)

- **Capability**: What agents can do
  - ID, name, category
  - Enabled flag
  - Resource cost (any type)
  - Cooldown tracking
  - Game-specific properties
  - Helpers: `isCapabilityReady()`, `canUseCapability()`
- **Goal**: High-level objective
  - ID, description, type, priority
  - Active flag, constraints, success criteria
- **Objective**: Tactical task
  - ID, description, type, parent goal
  - Completion status, deadline
  - Parameters
  - Helper: `isObjectiveOverdue()`

## Design Principles Implemented

### 1. Immutability

All created objects are frozen with Object.freeze(). State changes create new instances.

### 2. Pure Value Objects

No logic, no side effects. Just data with validation in constructors.

### 3. Discriminated Unions

ActionResult and Event use exhaustive pattern matching for type safety.

### 4. Game-Agnostic

No game-specific terminology. Uses `customData` fields for game-specific properties:

- RTS: `unitType: 'soldier'`
- Fantasy: `spellsKnown: ['fireball']`
- Card: `cardsInHand: ['attack']`

### 5. Type Safety

All branded types prevent accidental mixing:

- EntityId ≠ PlayerId ≠ TeamId ≠ GameId

## Test Coverage

**33 new tests** across all domain concepts:

- Identity type creation and validation
- Spatial concepts (positions, maps, regions)
- Temporal concepts (ticks, phases, time)
- Resources and pools
- Players and teams
- Agents and snapshots
- World state integration
- Commands and action results
- Events (public, private, visibility)
- Perception and fog of war
- Capabilities and readiness
- Goals and objectives
- Immutability guarantees

**All passing**: Domain tests (33) + Engine tests (4) + ECS tests (4) = **41 tests**

## Documentation

**Complete `packages/domain/README.md`** includes:

- Overview and purpose
- Core concepts with code examples
- Design principles explained
- No logic in domain (what's NOT included)
- Dependency rules
- Versioning strategy
- Related documentation links

## Validation Status

All checks passing:

```
npm run typecheck   ✅  No TypeScript errors
npm run lint        ✅  No linting violations
npm run format      ✅  All properly formatted
npm run test        ✅  41/41 tests passing
npm run doctor      ✅  All validation passing
```

---

# What Domain Model Supports

### Game Genres

- ✅ RTS (resource management, units, buildings)
- ✅ Turn-based (discrete actions, phases)
- ✅ 4X (large-scale, long-term goals)
- ✅ Card games (resources as cards, decks)
- ✅ Tactical (grid positions, line-of-sight)
- ✅ Simulation (continuous actions, custom time)
- ✅ Future genres (extensible design)

### Game Features

- ✅ Multiple players and teams
- ✅ AI and human-controlled agents
- ✅ Custom resource systems
- ✅ Visibility and fog of war
- ✅ Event-based state changes
- ✅ Asynchronous decision-making
- ✅ Goal-driven behavior
- ✅ Capability-based action systems

---

# Current State: 91 Tests Passing

```
✓ |@ai-commander/ecs| tests/world.test.ts (4 tests) 2ms
✓ |@ai-commander/engine| tests/engine.test.ts (4 tests) 2ms
✓ |@ai-commander/domain| tests/domain.test.ts (33 tests) 8ms
✓ |@ai-commander/core| tests/core.test.ts (50 tests) 11ms

Test Files  4 passed (4)
Tests  91 passed (91)
```

---

# Files Created/Modified

**Core Module Files Created:**

```
packages/core/src/types/
├── lifecycle.ts          # StartupResult, ShutdownResult, Lifecycle
├── error.ts              # FrameworkError, ErrorCode enum
├── disposable.ts         # Disposable, AsyncDisposable
├── factory.ts            # Factory<T>, AsyncFactory<T>
├── context.ts            # Context, RequestContext
├── event.ts              # EventBus, EventListener<T>
├── clock.ts              # Clock, RealtimeClock, GameClock
├── scheduler.ts          # Scheduler, ScheduledTask
├── service.ts            # ServiceRegistry, Service
├── module.ts             # ModuleRegistry, Module
├── plugin.ts             # PluginRegistry, Plugin
├── config.ts             # ConfigManager, ConfigSchema
└── index.ts              # All public exports

packages/core/tests/
└── core.test.ts          # 50 comprehensive tests

packages/core/
└── README.md             # Complete documentation with patterns

Root Files Updated:
- tsconfig.json          # Added core package reference
```

---

# Next Steps for Implementation

The Core framework and Domain model are **complete and stable**. Next phase is **Planning and Decision Engines**:

1. **Decision Layer** - Individual agent decisions based on observations
2. **Planner Layer** - Sequence generation and search algorithms
3. **Strategy Layer** - High-level behavior and multi-agent coordination

The Core package provides:

- Lifecycle management for all components
- Event bus for decoupled communication
- Service registry for dependency injection
- Module/plugin system for extensibility
- Configuration management
- Scheduler for task execution
- Clock abstraction for time (realtime or game time)

The Domain model provides:

- Complete type system for all game concepts
- Game-agnostic data structures
- Immutable value objects
- Support for multiple game genres

---

# Key Points for Next Engineer/AI

### What the Domain IS

- Pure data structures defining game concepts
- Type-safe with immutable value objects
- Game-agnostic (supports any strategy game genre)
- Complete vocabulary for describing game state
- Foundation for higher layers

### What the Domain IS NOT

- Game rules or validation
- AI algorithms or planning
- Action execution (that's Engine layer)
- Network code or serialization
- UI/graphics/audio
- Game-specific implementations

### Using the Domain

```typescript
import {
  createWorld State, createAgent,
  createCommand, createEvent,
  createObservation,
} from '@ai-commander/domain';

// Everything is immutable
// Everything is typed
// Everything validates on creation
// No logic, just data
```

### Architecture Compliance

✅ Domain depends only on Shared
✅ All other layers depend on Domain
✅ Pure value objects (no side effects)

---

# Session 061: Fake Game Adapter Implementation

## What Was Built

**FakeGameAdapter** — Reference implementation of the Game Adapter contracts.

A minimal, deterministic in-memory game environment that exercises the complete framework without requiring an external application.

### Components

1. **FakeGameAdapter** — Entry point for creating sessions
2. **FakeGameSession** — Single running game instance with lifecycle management
3. **FakeObservationProvider** — Immutable world state snapshots
4. **FakeCommandExecutor** — Command execution and world updates
5. **FakeWorldSnapshot** — Minimal world model (position, tick, state)

### World Model

- One agent at position (x, y)
- Tick counter (starts at 0)
- Simple state ("idle", "moving", "waiting")
- Command execution counter
- Fully immutable snapshots

### Supported Commands

- **Move**: Change agent position by (dx, dy)
- **Wait**: No-op (progresses tick)
- Deterministic execution: same sequence → same result

### Test Coverage

60 comprehensive tests validating:

- ✅ World state immutability (Object.freeze())
- ✅ Adapter lifecycle (init → create session → shutdown)
- ✅ Session lifecycle (start → pause/resume → stop)
- ✅ Observation retrieval (current + replay)
- ✅ Command execution (validation + execution)
- ✅ World state updates (deterministic)
- ✅ Complete integration (end-to-end cycles)

### Why This Matters

The fake game adapter:

1. **Validates the architecture** — Proves the contracts work end-to-end
2. **Provides a reference implementation** — Shows how to implement adapters
3. **Enables testing** — Framework can be tested without real games
4. **Unblocks game implementations** — Clear pattern to follow
5. **Demonstrates determinism** — Same commands → same state

### Files Created

```
packages/fake-game-adapter/
├── src/
│   ├── fake-game-adapter.ts
│   ├── fake-game-session.ts
│   ├── fake-observation-provider.ts
│   ├── fake-command-executor.ts
│   ├── index.ts
│   ├── types/
│   │   └── fake-command.ts
│   └── world/
│       └── fake-world-state.ts
├── tests/
│   ├── fake-world.test.ts
│   ├── adapter-lifecycle.test.ts
│   ├── session-lifecycle.test.ts
│   ├── observation-provider.test.ts
│   ├── command-executor.test.ts
│   ├── integration.test.ts
│   └── framework-integration.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Immediate Next Steps

1. **Implement real game adapters** (OpenRA, StarCraft, Chess, etc.)
2. **Add AI strategy modules** (planner enhancements, heuristics)
3. **Configure GitHub Actions CI/CD** (automated testing on commits)
4. **Add game-specific modules** (domain extensions for specific games)
5. **Document game adapter patterns** (step-by-step guide for new adapters)
   ✅ Frozen/immutable objects
   ✅ Exhaustive discriminated unions
   ✅ No game-specific terminology

---

# Next Session Focus

**Planning and Decision Engines**

Start with the Decision layer:

- Decision interfaces and algorithms
- Individual agent decision-making
- Evaluating options based on observations
- Action selection from capabilities

The complete domain model is ready for use.

---

# Files Changed This Session

```
.foundation/state/PROJECT_STATE.md       # Added domain completion
.foundation/state/SESSION_HANDOFF.md     # This file

packages/domain/src/types/identity.ts    # Identity types
packages/domain/src/types/spatial.ts     # Position, map, region
packages/domain/src/types/temporal.ts    # Tick, phase, time
packages/domain/src/types/resource.ts    # Resource system
packages/domain/src/types/player.ts      # Player and team
packages/domain/src/types/agent.ts       # Agent and snapshots
packages/domain/src/types/world.ts       # World state
packages/domain/src/types/action.ts      # Commands and results
packages/domain/src/types/event.ts       # Events
packages/domain/src/types/perception.ts  # Visibility and FOW
packages/domain/src/types/capability.ts  # Capabilities, goals
packages/domain/src/index.ts             # All exports

packages/domain/tests/domain.test.ts     # 33 tests
packages/domain/README.md                # Complete docs
```

---

# Commits This Session

1. **Implement game-agnostic domain model**
   - All 11 domain modules
   - 33 comprehensive tests
   - Complete documentation
   - All validation passing

---

# Summary

The **domain model is complete**, **production-ready**, and **fully tested**. It provides a comprehensive, game-agnostic foundation for all strategy game types:

- ✅ 11 core concept modules
- ✅ 41 tests passing (33 new)
- ✅ Complete documentation
- ✅ Zero technical debt
- ✅ Frozen architecture preserved

**Next step: Decision and Planning Engines** to enable intelligent agent behavior based on domain models.

---

# Session 070: Behavior Tree Framework

## What Was Built

**Behavior Tree Framework** (`@ai-commander/behavior-tree`) — Deterministic decision-making system for game AI.

A generic, game-agnostic framework for defining agent behavior using trees of conditions and actions. No game logic, no automation, no hardcoded strategies — just the decision structure that agents can use.

### Core Concepts

**BehaviorNode** — Base unit of behavior

- `execute(context)` → BehaviorStatus (Success, Failure, Running)
- `reset()` → Clear internal state
- Fully deterministic: same input → same output

**Composite Nodes** — Control flow

- **Sequence**: Execute children in order until one fails. All must succeed for sequence to succeed.
- **Selector**: Execute children in order until one succeeds. First success wins. Only fails if all fail.

**Decorators** — Transform child behavior

- **Inverter**: Flip success/failure (but leave running alone)
- **Succeeder**: Always return success (useful for non-critical branches)
- **FailureDecorator**: Always return failure

**Leaf Nodes** — Actual decisions

- **ActionNode**: Execute an action, returns Success/Failure/Running
- **ConditionNode**: Test a condition, returns Success/Failure (never Running)

**BehaviorContext** — Immutable execution context

- Game state and agent perception passed through tree
- Tick metadata (depth, time step)
- Fully frozen for safety

### Key Properties

1. **Deterministic**: Same tree + same context = same execution every time
2. **Generic**: No game-specific logic, no action names
3. **Composable**: Build complex behaviors from simple nodes
4. **Resumable**: Can pause at running nodes, continue next frame
5. **Debuggable**: Tree structure makes decision flow transparent

### Test Coverage

32 comprehensive tests validating:

- ✅ Individual node execution (action, condition)
- ✅ Sequence behavior (all succeed, early failure)
- ✅ Selector behavior (first success, all fail)
- ✅ Decorator transformations (inverter, succeeder, failure)
- ✅ Nested tree structures
- ✅ Context passing through tree
- ✅ Deterministic execution (same tree → same result)
- ✅ Tree reset and state management
- ✅ Complex decision logic (multi-strategy selection)

### Why This Matters

Behavior trees are the bridge between framework (generic) and game (specific):

```
Game Adapter
  ↓
World State (immutable, game-agnostic)
  ↓
Behavior Tree (decision structure, no logic)
  ↓
Action (command the framework executes in the game)
```

The framework never knows _how_ actions are implemented. The game adapter never knows _what_ decisions mean. The behavior tree never knows _which_ game it's in.

### Files Created

```
packages/behavior-tree/
├── src/
│   ├── behavior-tree.ts          # BehaviorTree interface & factory
│   ├── types.ts                  # BehaviorStatus, BehaviorContext
│   ├── nodes/
│   │   ├── behavior-node.ts      # Base interfaces
│   │   ├── sequence.ts           # Sequence composite
│   │   ├── selector.ts           # Selector composite
│   │   ├── decorators.ts         # Inverter, Succeeder, FailureDecorator
│   │   └── leaf-nodes.ts         # ActionNode, ConditionNode
│   └── index.ts                  # Exports
├── tests/
│   ├── nodes.test.ts             # 25 node tests
│   └── behavior-tree.test.ts     # 7 integration tests
└── Configuration (package.json, tsconfig.json, vitest.config.ts)
```

### Immediate Next Steps

1. **Behavior Tree Decision Engine** (Story 080+) - Integrate with framework
2. **Game Implementations** - Use framework + behavior trees + game adapters
3. **Strategy Modules** - Game-specific behavior libraries

---

# Session 080: Agent Runtime

## What Was Built

**Agent Runtime** (`@ai-commander/agent-runtime`) — Autonomous agent loop orchestrating perception, planning, and decision-making.

The missing piece that ties together all framework components. A generic agent that doesn't know or care about specific games, but coordinates the entire perception→planning→decision→execution lifecycle.

### Core Architecture

**Execution Loop (Deterministic):**

```
Observe (read GameSession → WorldState)
  ↓
Plan (Planner: Goal + WorldState → Plan)
  ↓
Decide (DecisionEngine: Plan + WorldState → Command)
  ↓
Execute (CommandExecutor: Command → Result)
  ↓
Measure (Metrics: Ticks, Decisions, Commands, Timing)
  ↓
(Repeat next frame)
```

One tick per frame. Deterministic: same goal + same world → same execution every time.

### Key Types

```typescript
// Configuration (immutable input)
interface AgentConfiguration {
  agentId: Agent;
  goal: Goal;
  gameSession: GameSession;
  planner: Planner;
  decisionEngine: DecisionEngine;
  executionContext: ExecutionContext;
}

// Runtime status (state machine)
enum AgentStatus {
  Initializing,
  Idle,
  Planning,
  Deciding,
  Executing,
  Paused,
  Stopped,
  Failed,
}

// Metrics (measurement only, no optimization)
interface AgentMetrics {
  ticksExecuted: number;
  decisionsExecuted: number;
  commandsExecuted: number;
  averagePlanningTimeMs: number;
  averageDecisionTimeMs: number;
  errorsEncountered: number;
  lastTickTimestamp: number;
}

// API
interface AgentRuntime {
  initialize(): Promise<void>; // Start session
  tick(): Promise<void>; // Execute one frame
  pause(): Promise<void>; // Pause execution
  resume(): Promise<void>; // Resume from pause
  shutdown(): Promise<void>; // Stop session
  getStatus(): AgentStatus;
  getMetrics(): AgentMetrics;
  getRuntimeState(): AgentRuntimeState;
}
```

### Error Handling Strategy

**Validation errors (throw):**

- Already initialized
- Not active
- State machine violations (pause while paused, etc.)

**Execution errors (recover gracefully):**

- Planning fails: log error, continue with old plan
- Decision fails: skip frame, try again next tick
- Command fails: log error, continue
- Observation unavailable: skip frame
- Execution unavailable: skip frame

### Testing (49 tests)

- **Lifecycle** (14 tests): init, tick, pause/resume, shutdown, state transitions
- **Execution Loop** (7 tests): observe/plan/decide/execute sequence, multiple ticks
- **Metrics** (12 tests): accurate counting and averaging, frozen results
- **Error Handling** (10 tests): graceful recovery, error accumulation
- **Determinism** (6 tests): reproducible execution, consistent state

All tests run against FakeGameAdapter for deterministic, repeatable results.

### Files Created

```
packages/agent-runtime/
├── src/
│   ├── types/
│   │   ├── agent-status.ts      # Enum: Initializing, Idle, Executing, Paused, Stopped, Failed
│   │   ├── agent-metrics.ts     # Interface: ticksExecuted, decisions, commands, timing
│   │   └── agent-runtime.ts     # AgentConfiguration, AgentRuntime interface
│   ├── agent-runtime.ts         # DefaultAgentRuntime + createAgentRuntime()
│   ├── agent-metrics.ts         # MetricsCollector (accumulates measurements)
│   └── index.ts                 # Exports
├── tests/
│   ├── agent-lifecycle.test.ts  # 14 tests
│   ├── agent-execution-loop.test.ts # 7 tests
│   ├── agent-metrics.test.ts    # 12 tests
│   ├── agent-error-handling.test.ts # 10 tests
│   └── agent-determinism.test.ts # 6 tests
└── Configuration (package.json, tsconfig.json, vitest.config.ts, README.md)
```

### Design Decisions

1. **No Algorithm Coupling:** Agent doesn't depend on specific Planner or DecisionEngine implementations
   - Planner could be GOAP, A*, HTN, Monte Carlo, LLM-based, etc.
   - DecisionEngine could be Behavior Trees, Utility AI, FSM, etc.
   - Agent works with any implementation of these contracts

2. **Graceful Degradation:** Execution errors never crash the agent
   - Planning fails → continue with old plan
   - Decision fails → wait one tick
   - Command fails → log and move on
   - Agent keeps ticking regardless

3. **Deterministic Execution:** Same input always produces same output
   - Enables reproducibility, testing, and consistency
   - No randomness, no hidden state
   - Metrics are deterministic functions of execution

4. **Minimal Metrics:** Measurement only, no optimization
   - Don't track what you won't use
   - Enables future optimization without changing agent
   - Timing data for diagnostics, not for tuning

5. **State Machine Pattern:** Clear lifecycle with validated transitions
   - Prevents invalid state changes (resume while not paused, etc.)
   - Makes execution predictable and testable
   - Immutable state exposed via getters

### Integration Pattern

How the Agent Runtime fits into a larger system:

```
Engine (tick loop)
  └─ Pipeline
      └─ AgentRuntimeStep (for each agent)
          ├─ Call runtime.tick()
          ├─ Handle Planning phase
          ├─ Handle Decision phase
          ├─ Handle Execution phase
          ├─ Update world state
          └─ Publish AgentBehaviorTick event

Game World ← Agent actions
```

### Extensibility

Swap any component without changing the Agent:

```typescript
// Custom planner
class MyGoalOrientedPlanner implements Planner {
  async plan(request): Promise<PlanningResult> { ... }
}

// Custom decision engine (e.g., behavior tree engine)
class MyBehaviorTreeEngine implements DecisionEngine {
  async decide(request): Promise<DecisionResult> { ... }
}

// Custom game adapter
class MyGameAdapter implements GameAdapter {
  async createSession(): Promise<GameSession> { ... }
}

// All work with the same Agent Runtime unchanged
const runtime = createAgentRuntime({
  planner: new MyGoalOrientedPlanner(),
  decisionEngine: new MyBehaviorTreeEngine(),
  gameSession: session, // from MyGameAdapter
  // ... other config
});
```

### What This Enables

- **Multi-agent Systems:** Create one AgentRuntime per agent, coordinate at pipeline level
- **Hybrid Strategies:** Mix different planners, decision engines, and game adapters
- **AI Experimentation:** Swap algorithms and measure impact via metrics
- **Production Deployment:** Type-safe, deterministic, fully tested
- **Future Learning:** Architecture supports RL training without changes

### Next Steps

1. **Behavior Tree Decision Engine** - Wire DecisionEngine to use behavior trees
2. **Real Game Adapters** - Implement for OpenRA, StarCraft, Chess, etc.
3. **Multi-Agent Coordination** - Coordinate multiple agents at higher level
4. **Performance Optimization** - Use metrics to identify bottlenecks
5. **Learning Integration** - Add RL training on top of deterministic agent
