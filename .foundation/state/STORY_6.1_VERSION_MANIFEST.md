# AI Commander 1.0.0-rc.1 — Version Manifest

**Release Candidate 1 — Package Versions & Dependencies**

**Date:** July 1, 2026  
**Framework Version:** 1.0.0-rc.1  
**Status:** Release Candidate for Testing  

---

## Framework Packages (12)

All framework packages are at **1.0.0-rc.1**.

### Core & Infrastructure

#### @ai-commander/core

**Version:** 1.0.0-rc.1  
**Description:** Runtime infrastructure: event bus, scheduler, service registry, game clock  
**Exports:** EventBus, Scheduler, ServiceRegistry, GameClock  
**Dependencies:** None (no external dependencies)  
**Dependents:** All other packages  
**Status:** ✅ Stable  

#### @ai-commander/domain

**Version:** 1.0.0-rc.1  
**Description:** Game-agnostic domain model: Agent, Goal, Plan, Command, WorldState  
**Exports:** Agent, Goal, Plan, Step, Command, WorldState, etc.  
**Dependencies:** @ai-commander/core  
**Dependents:** Goals, Planner, Decision, Engine, Adapter  
**Status:** ✅ Stable  

### Execution & State Management

#### @ai-commander/ecs

**Version:** 1.0.0-rc.1  
**Description:** Entity component system for flexible game state management  
**Exports:** World, Entity, Component, System  
**Dependencies:** @ai-commander/core, @ai-commander/domain  
**Dependents:** Engine, Applications  
**Status:** ✅ Stable  

#### @ai-commander/engine

**Version:** 1.0.0-rc.1  
**Description:** Execution pipeline orchestrator for deterministic agent loops  
**Exports:** Pipeline, PipelineStep, ExecutionContext  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/ecs  
**Dependents:** Agent Runtime, Applications  
**Status:** ✅ Stable  

### Goals & Planning

#### @ai-commander/goals

**Version:** 1.0.0-rc.1  
**Description:** Goal model: intent, parameters, status, priority  
**Exports:** Goal, GoalStatus, GoalPriority, GoalResult  
**Dependencies:** @ai-commander/core, @ai-commander/domain  
**Dependents:** Planner, Decision, Applications  
**Status:** ✅ Stable  

#### @ai-commander/planner

**Version:** 1.0.0-rc.1  
**Description:** Goal → Plan transformation (ReferencePlanner)  
**Exports:** Planner, Plan, Step, StepStatus  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/goals  
**Dependents:** Agent Runtime, Applications  
**Status:** ✅ Stable  

### Decision Making

#### @ai-commander/decision

**Version:** 1.0.0-rc.1  
**Description:** Decision-making layer: Plan → Command selection  
**Exports:** DecisionEngine, Decision, ReferenceDecisionEngine  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/engine, @ai-commander/goals, @ai-commander/planner  
**Dependents:** Agent Runtime, Applications  
**Status:** ✅ Stable  

#### @ai-commander/behavior-tree

**Version:** 1.0.0-rc.1  
**Description:** Deterministic behavior tree framework for agent strategies  
**Exports:** BehaviorTree, Node, Selector, Sequence, Task  
**Dependencies:** @ai-commander/core, @ai-commander/domain  
**Dependents:** Applications, Custom Decision Engines  
**Status:** ✅ Stable  

### Game Integration

#### @ai-commander/adapter

**Version:** 1.0.0-rc.1  
**Description:** Game adapter contracts: GameAdapter, GameSession, ObservationProvider, CommandExecutor  
**Exports:** GameAdapter, GameSession, ObservationProvider, CommandExecutor, GameCapabilities  
**Dependencies:** @ai-commander/core, @ai-commander/domain  
**Dependents:** Fake Adapter, OpenRA Adapter, Custom Adapters  
**Status:** ✅ Stable  

#### @ai-commander/fake-game-adapter

**Version:** 1.0.0-rc.1  
**Description:** In-memory reference game adapter for testing and validation  
**Exports:** FakeGameAdapter, FakeWorld  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/adapter, @ai-commander/ecs  
**Dependents:** Framework tests, Learning tests  
**Status:** ✅ Stable  

#### @ai-commander/openra-adapter

**Version:** 1.0.0-rc.1  
**Description:** Production OpenRA game integration  
**Exports:** OpenRAGameAdapter, OpenRAObservationProvider, OpenRACommandExecutor  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/adapter  
**Dependents:** Reference Application, OpenRA missions  
**Status:** ✅ Production-Ready  

### Agent Runtime

#### @ai-commander/agent-runtime

**Version:** 1.0.0-rc.1  
**Description:** Autonomous agent runtime orchestrating observe-plan-decide-execute cycle  
**Exports:** AgentRuntime, AgentStatus, AgentMetrics, AgentConfiguration  
**Dependencies:** @ai-commander/core, @ai-commander/domain, @ai-commander/adapter, @ai-commander/planner, @ai-commander/decision, @ai-commander/engine  
**Dependents:** Applications, Reference App  
**Status:** ✅ Stable  

---

## Application Packages (1)

### @ai-commander/reference-app

**Version:** 1.0.0-rc.1  
**Description:** Canonical reference application demonstrating framework usage  
**Exports:** OpenRAMissionAgent, CLI  
**Dependencies:**  
- @ai-commander/core
- @ai-commander/domain
- @ai-commander/adapter
- @ai-commander/openra-adapter
- @ai-commander/planner
- @ai-commander/decision
- @ai-commander/agent-runtime
- @ai-commander/behavior-tree

**Features:**
- OpenRA mission execution
- Deterministic autonomous missions
- CLI: run, trace, metrics, replay, inspect
- Production validation tests
- Integration tests

**Status:** ✅ Production-Ready  

---

## Dependency Graph

```
┌─────────────────────────────────┐
│   Applications & Reference App  │
└────────────────┬────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
┌───────▼──┐ ┌──▼──────┐ │
│ Planner  │ │Decision │ │
│ (Goals)  │ │(Behavior)│
└────┬─────┘ └────┬────┘ │
     │            │       │
┌────▼────────────▼───┐   │
│  Agent Runtime      │   │
└────────┬────────────┘   │
         │                │
┌────────▼─────────────────┘
│  Adapter (Game Integration)
│  - ObservationProvider
│  - CommandExecutor
│  - GameSession
└────┬────────────────┐
     │                │
┌────▼────────┐  ┌───▼───────────┐
│FakeAdapter  │  │OpenRAAdapter  │
│(Testing)    │  │(Production)   │
└─────────────┘  └───────────────┘
     │                │
┌────▼──────────┬─────▼──────┐
│Engine         │ECS          │
│(Execution)    │(State)      │
└────┬──────────┴─────┬───────┘
     │                │
└────┴────────────────┤
          │
┌─────────▼────────────┐
│ Domain Model         │
│ (Game-agnostic)      │
└──────────┬───────────┘
           │
┌──────────▼────────────┐
│ Core Infrastructure   │
│ (Event Bus, etc.)     │
└──────────────────────┘
```

---

## Version Consistency

### Verification Status

All packages verified to be at **1.0.0-rc.1**:

| Package | Version | Status | Verified |
|---------|---------|--------|----------|
| @ai-commander/core | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/domain | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/ecs | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/engine | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/goals | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/planner | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/decision | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/behavior-tree | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/adapter | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/fake-game-adapter | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/openra-adapter | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/agent-runtime | 1.0.0-rc.1 | ✅ | 2026-07-01 |
| @ai-commander/reference-app | 1.0.0-rc.1 | ✅ | 2026-07-01 |

**Total: 13/13 packages at 1.0.0-rc.1** ✅

---

## Internal References

All internal package references use npm workspace syntax (`workspace:*`):

**Pattern:**
```json
{
  "@ai-commander/core": "workspace:*",
  "@ai-commander/domain": "workspace:*"
}
```

**Verification:** All package.json files checked and confirmed ✅

---

## External Dependencies

### Development Dependencies (All Packages)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| TypeScript | ^5.5.4–^5.6.0 | Language |
| vitest | ^2.0.0–^2.1.9 | Testing |
| ESLint | ^10.0.0 | Linting |
| Prettier | ^3.0.0 | Formatting |
| @types/node | ^22.0.0 | Node.js types |

**Status:** All current and well-maintained ✅

### Production Dependencies

**Count: 0** (Zero production dependencies)

AI Commander is framework-only with no runtime dependencies ✅

---

## Installation

### From npm (when RC published)

```bash
npm install @ai-commander/core@1.0.0-rc.1 --save
npm install @ai-commander/adapter@1.0.0-rc.1 --save
npm install @ai-commander/agent-runtime@1.0.0-rc.1 --save
# ... etc for needed packages
```

### From Source

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
git checkout v1.0.0-rc.1
npm install
npm run build
```

---

## Requirements

### System Requirements

- **Node.js:** >=22.0.0 (verified in package.json engines field)
- **npm:** 10.x or later
- **TypeScript:** 5.5+ (included)

### Compatibility

- **Operating Systems:** Linux, macOS, Windows
- **Architecture:** x64, ARM64
- **Browsers:** N/A (Node.js framework)

---

## Publication Status

### For RC1

- ✅ Version numbers updated to 1.0.0-rc.1
- ✅ All packages ready for npm publishing
- ✅ No pre-release issues identified
- ✅ Ready for `npm publish --workspaces --access public`

### Target npm Scope

**@ai-commander** — All packages published under this scope

### Access Level

**public** — All packages published as public for community use

---

## Next Version

### v1.0.0 GA

**Expected:** After RC1 testing period (1-2 weeks)

**Changes for GA:**
- Version bump from 1.0.0-rc.1 to 1.0.0
- RC1 issue fixes
- Final documentation updates
- Production support commitment

**Compatibility:** v1.0.0 will be fully compatible with 1.0.0-rc.1

---

## Sign-Off

**Version Manifest Status: ✅ VERIFIED**

- ✅ All 13 packages at 1.0.0-rc.1
- ✅ Dependencies verified
- ✅ Workspace references correct
- ✅ No version mismatches
- ✅ Ready for publication

---

**AI Commander 1.0.0-rc.1 — Version Manifest**

*Generated July 1, 2026*
