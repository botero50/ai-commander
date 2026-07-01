# Runtime Architecture

## Overview

The AI Commander runtime is a deterministic, tick-based execution pipeline that orchestrates autonomous agent decision-making and action execution.

The pipeline is completely **layered**: each component has a single responsibility and well-defined contracts. Future implementations of Planner, Decision, Strategy, or other components can be swapped in without modifying any other layer.

## Execution Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS EXECUTION CYCLE                        │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │ GOAL GENERATION (Strategy Layer - future)                         │
  │                                                                    │
  │ Input:  WorldState                                                │
  │ Output: Goal (intent + parameters)                                │
  │                                                                    │
  │ Example: WorldState → "I need to gather gold" → Goal              │
  └──────────────────────────────────────────────────────────────────┘
                                ↓

  ┌──────────────────────────────────────────────────────────────────┐
  │ PLANNING (ReferencePlanner or custom Planner)                     │
  │                                                                    │
  │ Input:  Goal, WorldState, PlanningPolicy                          │
  │ Contract: Plan = ordered steps with commands                      │
  │ Output: Plan                                                      │
  │                                                                    │
  │ ReferencePlanner: Creates single-step plan from goal              │
  │ Future: GOAP, HTN, etc. can produce multi-step plans              │
  └──────────────────────────────────────────────────────────────────┘
                                ↓

  ┌──────────────────────────────────────────────────────────────────┐
  │ DECISION (ReferenceDecisionEngine or custom DecisionEngine)       │
  │                                                                    │
  │ Input:  Plan, WorldState, DecisionPolicy, ExecutionContext        │
  │ Contract: DecisionResult with selected Command                    │
  │ Output: Command (selected from first executable step)             │
  │                                                                    │
  │ ReferenceDecisionEngine: Selects first incomplete step            │
  │ Future: GOAP, Utility AI, LLM-based can make intelligent choices  │
  └──────────────────────────────────────────────────────────────────┘
                                ↓

  ┌──────────────────────────────────────────────────────────────────┐
  │ EXECUTION (Engine)                                                │
  │                                                                    │
  │ Input:  Command, ExecutionContext                                 │
  │ Output: ActionResult (success/failure)                            │
  │                                                                    │
  │ Tick-based execution pipeline with event publishing              │
  │ Can execute multiple commands per tick (if framework allows)     │
  └──────────────────────────────────────────────────────────────────┘
                                ↓

  ┌──────────────────────────────────────────────────────────────────┐
  │ WORLD STATE UPDATE                                                │
  │                                                                    │
  │ Input:  Previous WorldState, ActionResults                        │
  │ Output: Updated WorldState                                        │
  │                                                                    │
  │ Game-specific logic updates world based on action outcomes       │
  │ Tick counter increments                                           │
  └──────────────────────────────────────────────────────────────────┘
                                ↓

  ┌──────────────────────────────────────────────────────────────────┐
  │ TICK COMPLETE                                                     │
  │                                                                    │
  │ Clock advances one tick                                           │
  │ Events are processed (listeners receive updates)                  │
  │ Repeat for next tick                                              │
  └──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Strategy Layer (Future)
- **Responsibility**: Generate Goals based on agent state and world state
- **Input**: WorldState, agent context
- **Output**: Goal(s) to pursue
- **Example**: "We need more gold" → Goal with intent='gather' and parameters={resource:'gold', amount:100}
- **Note**: Not yet implemented; uses placeholder goals in examples

### Planner
- **Responsibility**: Transform a Goal into an ordered Plan
- **Input**: PlanningRequest (goal, world state, policy)
- **Output**: PlanningResult (plan, errors, metadata)
- **Contract**: Plan = immutable sequence of steps with commands
- **Reference**: ReferencePlanner creates single-step plans (simplest correct implementation)
- **Future**: GOAP, HTN, or other advanced planners can replace this layer
- **Key Invariant**: Planner NEVER executes; it only plans

### Decision Engine
- **Responsibility**: Select which step to execute from a Plan
- **Input**: DecisionRequest (plan, world state, execution context, policy)
- **Output**: DecisionResult (selected command, metadata, errors)
- **Contract**: Returns one Command or undefined (no command available)
- **Reference**: ReferenceDecisionEngine selects first executable step
- **Future**: Utility AI, LLM-based, or other decision engines can replace this layer
- **Key Invariant**: Decision NEVER mutates the Plan

### Engine
- **Responsibility**: Execute Commands and manage tick progression
- **Input**: Command, ExecutionContext
- **Output**: ActionResult (success/failure with data)
- **Contract**: Tick-based pipeline with event publishing
- **Scope**: Does NOT include Planning or Decision; those are earlier stages
- **Key Invariant**: Engine executes; it does NOT decide what to do

### World State
- **Responsibility**: Represent the complete game snapshot
- **Immutability**: WorldState is read-only (all updates create new state)
- **Scope**: Includes all agents, players, resources, map, temporal information
- **Usage**: Passed to every layer as context (but not modified by any layer)

## Component Isolation

Each layer is **completely independent** of implementation details of other layers:

```
Strategy   ← Future implementation
   ↓
Planner    ← Can be replaced: ReferencePlanner, GOAP, HTN, etc.
   ↓
Decision   ← Can be replaced: ReferenceDecisionEngine, Utility AI, LLM, etc.
   ↓
Engine     ← Can be extended: add pipeline steps, but not replaced
   ↓
World      ← Immutable snapshot
```

### Swapping Implementations

To use a different Planner:
```typescript
// Current
const planner = new ReferencePlanner();
const plan = await planner.plan(planningRequest);

// Future - GOAP planner
const planner = new GOAPPlanner();
const plan = await planner.plan(planningRequest);  // Same signature!
```

The rest of the code needs NO changes. Decision layer, Engine, everything else works unchanged.

To use a different Decision Engine:
```typescript
// Current
const engine = new ReferenceDecisionEngine();
const decision = await engine.decide(decisionRequest);

// Future - Utility AI
const engine = new UtilityDecisionEngine();
const decision = await engine.decide(decisionRequest);  // Same signature!
```

Again, no other changes needed. Strategy, Planner, Engine all work unchanged.

## Determinism

The reference implementations are **completely deterministic**:

- **ReferencePlanner**: Given same goal + world state → same plan structure
  - Note: Plan IDs use timestamps/random for uniqueness; this is acceptable
  - Plan structure (steps, commands) is deterministic

- **ReferenceDecisionEngine**: Given same plan → always selects same step
  - Always first executable (non-terminal) step
  - Deterministic ordering

- **Engine**: Given same command + execution context → same result

This enables:
- Reproducible AI behavior
- Debugging and testing
- Replays for analysis
- Consistent agent behavior across runs

## Immutability

All layers **preserve immutability**:

- **Goals** are frozen (cannot modify after creation)
- **Plans** are frozen (decision engine never mutates)
- **WorldState** is immutable (updates create new state, never modify old)
- **DecisionResults** are frozen (runtime never mutates)
- **Commands** are immutable (once issued, never modified)

This ensures:
- No hidden state mutations
- Clearer data flow
- Easier debugging and reasoning
- Safe parallel operations (future)

## Tick Progression

The runtime is **tick-based** (turn-based, not real-time):

```
Tick 0:  Goal 1 → Plan 1 → Command 1 → Execute → WorldState 1
         ↓ (clock advances)
Tick 1:  Goal 2 → Plan 2 → Command 2 → Execute → WorldState 2
         ↓ (clock advances)
Tick 2:  Goal 3 → Plan 3 → Command 3 → Execute → WorldState 3
```

Each tick:
1. One (or more) goals are generated
2. Goals are planned
3. Plans are decided upon
4. Commands are executed
5. WorldState is updated
6. Clock advances
7. Events are published

## Event System

The runtime publishes events for monitoring and coordination:

- **GoalCreated**: New goal in the system
- **PlanGenerated**: Planner produced a plan
- **CommandDecided**: Decision engine selected a command
- **CommandIssued**: Engine is executing command
- **ActionCompleted**: Command finished executing
- **TickCompleted**: One tick finished

These events enable:
- Logging and observability
- Debugging
- Replays
- Multi-agent coordination (future)

## Error Handling

Each layer handles errors gracefully:

- **Planner errors**: Returns error list, still produces plan
- **Decision errors**: Returns empty decision with error messages
- **Execution errors**: ActionResult indicates failure
- **No exceptions**: All errors collected and reported

This ensures:
- Robust operation even with bad data
- Clear error diagnosis
- Continue operation despite partial failures

## Scalability

The architecture scales in multiple dimensions:

1. **Multiple agents**: Each agent has its own Goal → Plan → Decision → Command
2. **Multiple goals per agent**: Prioritization handled by Strategy layer (future)
3. **Complex planning**: GOAP/HTN support multi-step plans
4. **Complex decisions**: Utility AI evaluates multiple options
5. **Custom actions**: Domain can extend Command type
6. **Custom world state**: Domain can extend all types

The core pipeline remains unchanged regardless of complexity.

## Summary

The AI Commander runtime is:

- **Layered**: Clear separation of concerns (Strategy → Plan → Decide → Execute)
- **Replaceable**: Each layer can be swapped for different implementations
- **Deterministic**: Given same inputs, always same behavior
- **Immutable**: No hidden state mutations
- **Event-driven**: Observable at every stage
- **Robust**: Graceful error handling
- **Scalable**: Handles simple to complex scenarios
- **Testable**: Each layer has clear contracts and can be tested independently

It is the foundation upon which all AI Commander implementations build.
