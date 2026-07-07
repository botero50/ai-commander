# AI Commander: The Architecture Book

**A Technical Deep Dive into Framework Design, Philosophy, and Engineering Principles**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Principles](#2-core-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Runtime Architecture](#4-runtime-architecture)
5. [Decision Making](#5-decision-making)
6. [World Model](#6-world-model)
7. [Execution Trace](#7-execution-trace)
8. [Dashboard and Debugging](#8-dashboard-and-debugging)
9. [Plugin Architecture](#9-plugin-architecture)
10. [Testing Strategy](#10-testing-strategy)
11. [Performance](#11-performance)
12. [Lessons Learned](#12-lessons-learned)
13. [Future Directions](#13-future-directions)

---

## 1. Introduction

### 1.1 Vision

AI Commander is a framework for building autonomous agents that play strategy games. Unlike game bots that rely on heuristics or blackbox neural networks, AI Commander provides a transparent, observable, and extensible foundation for agents that reason through goals, generate plans, make decisions, and learn from outcomes.

The vision is simple: **a system where every decision is visible, reproducible, and understandable.**

### 1.2 Goals

AI Commander was designed with three primary goals:

1. **Transparency**: Every decision made by an agent must be traceable back to world state, goals, reasoning, and constraints. No hidden state. No mysterious behavior.

2. **Reproducibility**: Given identical inputs, an agent must produce identical decisions. This enables deterministic testing, benchmarking, and replay-based debugging.

3. **Extensibility**: Adding new behaviors, strategies, or game adapters must be simple. The framework should enable customization without rewriting the core system.

### 1.3 Philosophy

AI Commander is built on a deceptively simple principle: **observe, plan, decide, execute.**

```
[World State] → [Planning] → [Decision] → [Execution] → [Observation] → loop
     ↓              ↓            ↓            ↓             ↓
  Perception    Strategy    Selection    Action      Feedback
```

This loop repeats for every game tick. Each step is deterministic, observable, and interruptible. Nothing happens automatically. No background threads change state. No randomness surprises you.

This philosophy intentionally rejects:
- **Reactive systems** that blur perception and action
- **Hierarchical state machines** that hide decision logic
- **Neural networks** that are opaque to analysis
- **Concurrent decision making** that creates race conditions

Instead, AI Commander embraces:
- **Explicit goals** that state what the agent wants
- **Transparent planning** that shows step-by-step action sequences
- **Deterministic decisions** that always choose the same action given identical state
- **Complete observability** of every step through execution traces

### 1.4 Why AI Commander Exists

Three problems motivated AI Commander's creation:

1. **Existing game bots are opaque.** When they fail, you don't know why. When they succeed, you can't learn from it. You can't extend them without rewriting everything.

2. **Testing game AI is hard.** Bots behave differently each run. Race conditions hide between test runs. Debugging means watching replays in the game client, which is slow and error-prone.

3. **Game AI research is fragmented.** Every team rebuilds infrastructure for goal evaluation, planning, decision making, and learning. There's no shared foundation for comparison or composition.

AI Commander solves these by providing a foundation where:
- Decisions are transparent and traceable
- Behavior is deterministic and reproducible
- Extension is straightforward (implement an interface, plug it in)
- Testing is fast (pure functions, no game client required)
- Research is composable (combine strategies easily)

---

## 2. Core Principles

### 2.1 Determinism

Determinism is the cornerstone of AI Commander. **Same input + same state = same output, every time.**

This principle enables:

- **Testing**: Run a mission twice with identical setup, you get identical behavior
- **Debugging**: Reproduce issues reliably. No flaky tests. No race conditions.
- **Learning**: Compare different strategies on identical scenarios
- **Benchmarking**: Measure performance without variance from randomness
- **Replay**: Re-execute decisions in slow motion to understand what happened

**Implementation**: AI Commander has no sources of non-determinism:
- No `Math.random()` in core logic
- No threading or async in decision paths
- No time-based conditions (only tick-based)
- No external I/O in the execution loop
- No floating-point comparisons without tolerance

Trade-off: Determinism requires explicit seeding of any randomness (in planners, decision engines, or game adapters). The framework forbids hidden sources of variation.

### 2.2 Observability

Observability means **every meaningful event is recorded in an execution trace.**

The framework records:
- When goals are created, evaluated, selected, adapted
- When the planner is invoked and what plan it generates
- When decisions are made and why
- When commands fail or succeed
- When world state changes significantly
- When recovery or adaptation happens

This trace serves multiple purposes:
1. **Audit trail**: Prove exactly what the agent did at each moment
2. **Debugging**: Rewind to any tick and inspect what the agent knew
3. **Learning**: Analyze successful and failed strategies
4. **Analysis**: Measure goal achievement, planning efficiency, decision quality

**Implementation**: The ExecutionTracer class records 100+ event types across all subsystems. Every event includes timestamp, tick number, event type, and context-specific data.

Trade-off: Observability creates overhead (trace size, event recording cost). We minimize this through batching and lazy evaluation, but users can disable certain event types if needed.

### 2.3 Extensibility

AI Commander is designed for composition, not configuration. **Changing behavior means implementing an interface and plugging it in.**

Key extension points:

1. **GameAdapter** - Connect new games by implementing observation and command execution
2. **Planner** - Add planning algorithms by implementing the Planner interface
3. **DecisionEngine** - Add decision strategies by implementing the DecisionEngine interface
4. **Goal evaluation** - Customize goal scoring through composition
5. **Recovery strategies** - Add recovery behaviors for failures

Each extension point is minimal: a small interface that isolates your custom code from the framework.

Example: Adding a new game takes only implementing two methods:
```typescript
interface GameAdapter {
  async initialize(config: AdapterConfig): Promise<void>
  async createSession(config: SessionConfig): Promise<GameSession>
  async shutdown(): Promise<void>
}
```

**Trade-off**: Extensibility requires discipline. The framework doesn't prevent you from doing unsafe things in your custom code (reading mutable state, using randomness, blocking operations). Users must respect the contracts.

### 2.4 Simplicity

Simplicity means **prefer explicit over implicit, clear over clever.**

Examples in AI Commander:
- The execution loop is straightforward: observe, plan, decide, execute (see Chapter 4)
- Goals are data structures, not opaque objects
- Plans are lists of steps, not abstract concepts
- Decisions are commands with parameters, not ambiguous actions
- Failures are errors with diagnostics, not silent failures

**Trade-off**: Simplicity sometimes means verbosity. The framework requires you to be explicit about goals, constraints, and recovery. This is intentional—it makes the system understandable.

### 2.5 YAGNI (You Aren't Gonna Need It)

YAGNI means **don't implement features that aren't currently needed.**

AI Commander strictly avoids:
- Multi-agent coordination (agents are independent)
- Real-time constraints (planning can take as long as needed)
- Distributed execution (everything runs in one process)
- Machine learning integration (framework is deterministic; ML is stateful)
- Temporal reasoning (plans are linear sequences, not temporal constraints)
- Ontology reasoning (goals are simple structures, not logical formulas)

These are all reasonable extensions, but v1.0 doesn't include them because no shipped system needs them yet. If you need any of these, implement them in your custom strategy or adapter.

**Trade-off**: YAGNI limits functionality. But it keeps the codebase small enough to understand (80 source files, 19k lines) and maintain.

### 2.6 Separation of Concerns

Each component has a single, clear responsibility:

```
GameAdapter     → Bridge between agent and game
AgentRuntime    → Orchestrate execution loop
Planner         → Transform goals into action sequences
DecisionEngine  → Choose next action from plan
ExecutionTracer → Record all events
GoalEvaluator   → Score goals against world state
WorldState      → Immutable snapshot of game state
```

**Implementation**: The framework uses composition over inheritance. MissionAgent orchestrates components; each component is independent and testable in isolation.

**Trade-off**: Separation sometimes creates indirection. You can't always see the full flow by reading one file. But this is intentional—it makes each component understandable and replaceable.

---

## 3. High-Level Architecture

### 3.1 System Overview

AI Commander is a layered system:

```
┌─────────────────────────────────────────┐
│        User Applications                │ ← Your code using AI Commander
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│     Mission Orchestration Layer          │ ← MissionAgent, initialization
│     (apps/reference)                    │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│     Execution Runtime Layer              │ ← AgentRuntime, tick loop
│     (@ai-commander/agent-runtime)       │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│  Planning    │ │ Decision │ │  Goals   │ │ Observation &    │
│  (@ai-c/plan │ │ (@ai-c/  │ │ (@ai-c/  │ │ Execution        │
│   -ner)      │ │decision) │ │goals)    │ │ (@ai-c/adapter)  │
└──────────────┘ └──────────┘ └──────────┘ └──────────────────┘
        │           │           │           │
└───────────────────┴───────────┴───────────┘
        │
┌─────────────────────────────────────────┐
│     Core Services Layer                  │ ← @ai-commander/core
│     (EventBus, Clock, Registry)         │
└─────────────────────────────────────────┘
        │
┌─────────────────────────────────────────┐
│     Domain Layer                         │ ← @ai-commander/domain
│     (Types, immutable structures)        │
└─────────────────────────────────────────┘
        │
┌─────────────────────────────────────────┐
│     Game Interface                       │ ← GameAdapter (your code)
│     (OpenRA, Fake, Custom)              │
└─────────────────────────────────────────┘
```

### 3.2 Package Organization

AI Commander is organized as a monorepo with 12 packages:

**Core Infrastructure**
- `@ai-commander/core` - EventBus, Clock, ServiceRegistry
- `@ai-commander/domain` - Base types (Command, Goal, Plan, WorldState)
- `@ai-commander/engine` - ExecutionContext, execution environment

**Algorithmic Components**
- `@ai-commander/planner` - Planner interface and reference implementations
- `@ai-commander/decision` - DecisionEngine interface and implementations
- `@ai-commander/goals` - Goal types and evaluation

**System Integration**
- `@ai-commander/adapter` - GameAdapter contracts
- `@ai-commander/agent-runtime` - AgentRuntime (orchestration loop)
- `@ai-commander/behavior-tree` - Decision tree evaluation

**Implementations & Testing**
- `@ai-commander/fake-game-adapter` - In-memory test game
- `@ai-commander/openra-adapter` - Real-time strategy game integration
- `@ai-commander/reference-app` - Reference implementation (MissionAgent, dashboard, CLI)

### 3.3 Dependency Flow

```
apps/reference
    ├── depends on: all packages
    └── imports: agent-runtime, adapters, core, domain

agent-runtime
    ├── depends on: adapter, planner, decision, goals, engine
    └── core layer (orchestrates execution)

planner, decision, goals
    ├── depend on: core, domain
    └── strategy layers (pluggable algorithms)

adapter
    ├── depends on: core, domain, engine
    └── contracts for game integration

fake-game-adapter, openra-adapter
    ├── depend on: adapter, domain
    └── implementations of GameAdapter
```

**Key rule**: Lower layers never depend on higher layers. `domain` never imports `agent-runtime`. `core` never imports `planner`. This prevents circular dependencies and keeps layers independent.

### 3.4 Monorepo Rationale

Why 12 packages instead of one?

1. **Clarity**: Each package's purpose is explicit in its name and public API
2. **Dependency management**: Users only depend on what they need
3. **Testing**: Components test in isolation
4. **Extensibility**: Custom implementations clearly inherit from defined contracts

**Trade-off**: Managing 12 packages is more complex than a single package. But the overhead is minimal (unified versioning, shared build tooling) and the benefits justify it.

---

## 4. Runtime Architecture

### 4.1 Mission Lifecycle

A mission has four phases:

```
┌──────────────┐     ┌─────────────┐     ┌────────────┐     ┌──────────────┐
│ Initialize   │────→│ Execute     │────→│ Shutdown   │────→│ Complete     │
└──────────────┘     └─────────────┘     └────────────┘     └──────────────┘
  • Create game        • Tick loop         • Stop runtime      • Compute
    adapter           • Observe             • Save traces        metrics
  • Create session    • Plan               • Close session     • Validate
  • Load world state  • Decide             • Cleanup           • Archive
  • Initialize traces • Execute            • Finalize          • Report
```

### 4.2 The Execution Loop

The core loop runs once per game tick:

```typescript
async run() {
  while (!this.isComplete && this.currentTick < maxTicks) {
    this.currentTick++;
    
    try {
      // 1. OBSERVE: Get current game state
      const worldState = await this.getWorldState();
      this.tracer.recordWorldState(worldState);
      
      // 2. PLAN: If no current plan, generate one
      if (!this.currentPlan) {
        this.currentPlan = await this.planner.plan(
          this.currentGoal,
          { world: worldState, tick: this.currentTick }
        );
        this.tracer.recordPlanGenerated(this.currentPlan);
      }
      
      // 3. DECIDE: Select next action from plan
      const decision = await this.decisionEngine.decide({
        plan: this.currentPlan,
        world: worldState,
        tick: this.currentTick
      });
      this.tracer.recordDecisionMade(decision);
      
      // 4. EXECUTE: Perform the action
      const result = await this.adapter.execute(decision.command);
      this.tracer.recordCommandExecuted(result);
      
      // 5. CHECK: Did we reach the goal?
      if (this.goalReached(worldState)) {
        this.isComplete = true;
        this.tracer.recordMissionCompleted();
      }
      
    } catch (error) {
      // 6. RECOVER: Handle failures
      const diagnosis = this.diagnose(error);
      const recovery = this.getRecovery(diagnosis);
      // ... execute recovery action
    }
  }
}
```

### 4.3 AgentRuntime

AgentRuntime is the execution orchestrator. It doesn't make decisions—it orchestrates the components that do.

**Responsibilities**:
- Manage the execution loop
- Track current tick and mission state
- Call planner, decision engine, adapter in sequence
- Record events in execution trace
- Detect completion conditions
- Handle failures and recovery

**Key design**: AgentRuntime is agnostic about what goals, planners, or decision engines you use. It just calls the interfaces. This is why adding new behaviors is straightforward—implement the interface, pass it to the runtime.

### 4.4 Command Execution

Commands are the interface between decision logic and game actions:

```typescript
interface Command {
  readonly id: string              // Unique identifier
  readonly action: string          // Action name (e.g., "MOVE", "BUILD")
  readonly parameters: Record<...> // Action parameters
  readonly createdAtTick: number   // When this command was created
}
```

The GameAdapter translates Commands into actual game operations:

```typescript
interface GameAdapter {
  async execute(command: Command): Promise<CommandExecutionResult>
}

interface CommandExecutionResult {
  readonly success: boolean
  readonly tick: number
  readonly worldState: WorldState // Updated state after execution
}
```

**Design principle**: Commands are *immutable* declarations. The game adapter is responsible for executing them and returning results. The decision engine never modifies a command or assumes an execution succeeded without checking the result.

### 4.5 Observation Pipeline

Observation is how the agent perceives the game:

```
Game Server
    ↓
[GameAdapter.tick()]  ← Polls current world state
    ↓
WorldState            ← Immutable snapshot
{
  agents: [],
  resources: Map,
  map: GameMap,
  tick: number
}
    ↓
[Planner, DecisionEngine]  ← Read (never modify)
    ↓
[ExecutionTracer]  ← Record for replay
```

**Key design**: WorldState is immutable. Once created, it cannot change. Every tick produces a fresh WorldState from the game. This prevents accidental mutation and makes time-travel debugging possible.

---

## 5. Decision Making

### 5.1 Goals: The Foundation

A goal states **what** the agent wants, not **how** to achieve it.

```typescript
interface Goal {
  readonly id: string
  readonly intent: string           // e.g., "move-to-target"
  readonly priority: GoalPriority   // 0-1 importance
  readonly deadline?: number        // Optional: must succeed by tick N
  readonly status: GoalStatus       // Queued, Candidate, Selected, ...
}
```

Goals are intentionally simple:
- They don't contain strategy (no "first go north, then east")
- They don't contain implementation (no "use pathfinding algorithm X")
- They don't constrain how (no "only walk on grass")

Why? Because **strategy changes.** A goal that says "move to position 50,50" can be achieved by pathfinding, by flying, by teleporting, or by walking backwards—all valid strategies depending on context.

### 5.2 Goal Evaluation

The framework evaluates all goals every tick:

```typescript
evaluateGoal(goal: Goal, worldState: WorldState): number {
  // Return a score [0, 1] indicating how important this goal is right now
  
  const baseScore = goal.priority;
  const urgencyBoost = goal.deadline ? calculateUrgency(goal, tick) : 0;
  const feasibility = calculateFeasibility(goal, worldState);
  
  return (baseScore + urgencyBoost) * feasibility;
}
```

Scoring factors:
- **Priority**: How much does the agent care about this goal? (user-set)
- **Urgency**: How much time is left? (deadline-based)
- **Feasibility**: Can this goal be achieved given current state? (computed)

**Example**: 
- Goal: "gather wood" (priority 0.5, no deadline)
  - Feasibility 0.8 (wood exists, workers available)
  - Score: 0.5 * 0.8 = 0.4

- Goal: "defend base" (priority 0.9, deadline tick 50)
  - Current tick 45, so urgency +0.3
  - Feasibility 0.6 (defensive units deployed but weak)
  - Score: (0.9 + 0.3) * 0.6 = 0.72

The agent selects the highest-scoring goal and creates a plan to achieve it.

### 5.3 Planning

Planning transforms a goal into an ordered sequence of steps.

```typescript
interface Plan {
  readonly steps: readonly PlanStep[]
  readonly generated: number  // Tick when this plan was created
}

interface PlanStep {
  readonly index: number
  readonly action: string
  readonly estimatedCost: number
}
```

The Planner interface is minimal:

```typescript
interface Planner {
  plan(goal: Goal, context: PlanningContext): Promise<Plan>
}
```

**Implementation flexibility**: A planner can use:
- Pathfinding (movement goals)
- Behavior trees (combat goals)
- Scripted sequences (building goals)
- Dynamic programming (resource goals)
- Constraint satisfaction (logistics goals)

All that matters is the output: an ordered list of steps the decision engine can execute.

**Replanning**: Plans become invalid when:
- The world changes significantly (blocked path, enemy moved, resource depleted)
- Goal conditions change (deadline approaching, feasibility dropped)
- Execution fails (can't reach waypoint, blocked by enemy)

When a plan becomes invalid, the agent generates a new one. The framework doesn't decide when to replan—your planner does.

### 5.4 Decision Making

The decision engine's job is simple: **pick the next step from the current plan and create a command.**

```typescript
interface DecisionEngine {
  decide(request: DecisionRequest): Promise<DecisionResult>
}

interface DecisionRequest {
  readonly plan: Plan
  readonly worldState: WorldState
  readonly tick: number
}

interface DecisionResult {
  readonly command: Command
  readonly reasoning: string
}
```

**Example decision process**:
1. Current plan: [MOVE_NORTH, MOVE_EAST, MOVE_EAST, GATHER]
2. Current step index: 2 (we've done MOVE_NORTH, MOVE_EAST)
3. Next step: MOVE_EAST
4. Create command: { action: "MOVE", parameters: { direction: "EAST" } }

The decision engine doesn't rewrite the plan or skip steps. It faithfully executes the plan step-by-step. If a step fails, the planner decides what to do next.

### 5.5 Goal Adaptation

Goals don't remain static. The framework adapts the current goal when conditions change:

```
[Current Goal Score: 0.4]
    ↓
[New Opportunity]
    ↓
[Evaluate All Goals]
    ↓
[New Highest Scorer: 0.7]
    ↓
[Adapt to New Goal]
    ↓
[Generate New Plan]
```

Example:
- Agent pursuing "gather wood" (score 0.4)
- Enemy appears nearby
- "Defend base" score jumps to 0.8
- Agent abandons gathering, adapts to defense
- Plans defensive strategy

Adaptation prevents the agent from pursuing irrelevant goals when circumstances dramatically change. It's not flakiness—it's contextual reasoning.

### 5.6 Risk Assessment

Before committing to a goal, the agent assesses risks:

```typescript
interface RiskAssessment {
  readonly military: number      // Can enemies overwhelm us?
  readonly economic: number      // Can we afford this?
  readonly strategic: number     // Does this hurt our position?
  readonly overall: number       // Total risk
  readonly recommendation: string // "proceed", "caution", "abort"
}
```

Risk assessment prevents dumb decisions like:
- Attacking when outnumbered and low on resources
- Expanding into enemy territory during siege
- Committing all workers to one resource (starvation risk)

**Trade-off**: Risk assessment requires domain knowledge. A generic risk evaluator can't understand strategy-specific risks. Implementers must define risk metrics for their domain.

### 5.7 Strategic Reasoning

Strategic reasoning runs at a higher level than individual goals. It asks:

- **What's our long-term position?** (army size, economy strength, territory)
- **What's the opponent doing?** (gathering, attacking, building)
- **What should we do next strategically?** (expand, defend, attack, trade)
- **How confident are we in our understanding?** (perfect knowledge vs. fog of war)

AI Commander provides hooks for strategic reasoning but doesn't mandate how it works. Implementers can add:
- Macro-strategy layers
- Opponent modeling
- Long-term planning
- Technology research
- Diplomacy and trade

All of these are composition on top of the core loop, not modifications to it.

---

## 6. World Model

### 6.1 Observable State

Observable state is what the agent perceives from the game:

```typescript
interface WorldState {
  readonly tick: number
  readonly agents: readonly Agent[]
  readonly resources: Map<string, number>
  readonly map: GameMap
  readonly customData?: Record<string, unknown>
}

interface Agent {
  readonly id: string
  readonly team: string           // "player" or "enemy"
  readonly type: string           // "worker", "soldier", etc.
  readonly position: { x: number; y: number }
  readonly health: number
  readonly carry?: string         // What is this unit holding?
}
```

Observable state is **immutable and complete**. Every piece of information the agent needs to make decisions is in WorldState. Nothing is hidden.

### 6.2 Deterministic State

Deterministic state is information the agent *can compute* from observable state:

```typescript
// All derived from WorldState, no new observations
const friendlyUnits = worldState.agents.filter(a => a.team === "player");
const enemyPosition = worldState.agents.find(a => a.team === "enemy")?.position;
const isSurrounded = calculateSurroundedness(friendlyUnits, enemyPosition);
const distanceToGoal = manhattan(myPosition, targetPosition);
```

Deterministic state is cheap to compute (no game I/O) and useful for decision making. The framework doesn't cache it—compute it when needed.

### 6.3 Belief Model

Belief model is information the agent *infers* from noisy or incomplete observations:

```typescript
interface Belief {
  readonly subject: string        // "enemy_position", "opponent_strategy"
  readonly value: unknown
  readonly confidence: number      // 0-1, how certain are we?
  readonly lastUpdated: number    // When did we last see evidence?
}

interface BeliefState {
  beliefs: Map<string, Belief>
  
  addBelief(subject: string, value: unknown, confidence: number): void
  updateBeliefConfidence(subject: string, newConfidence: number): void
  getBelief(subject: string): Belief | null
}
```

Belief model handles:
- **Fog of war**: We see enemy once, infer position, confidence decays over time
- **Opponent modeling**: We observe enemy behavior, infer their strategy
- **Uncertainty**: We're not sure if information is accurate, track confidence
- **Hypotheses**: Multiple possible explanations, assign probabilities

**Example**: 
- Observation: Enemy army at position (50, 50)
- Belief: "enemy_main_army_location" = (50, 50), confidence 1.0
- Five ticks later: No observation, no updates from scouts
- Updated belief: "enemy_main_army_location" = (50, 50), confidence 0.6
- Interpretation: Enemy probably moved; we don't know where

Beliefs decay naturally without new evidence. This prevents the agent from acting on stale information.

### 6.4 Prediction and Hypotheses

Prediction is asking "what happens if we do X?"

```typescript
interface Prediction {
  readonly action: Command
  readonly estimatedOutcome: WorldState
  readonly confidence: number     // How sure are we?
  readonly risks: string[]
}
```

Predictions enable:
- **Lookahead**: Simulate command execution before committing
- **Risk evaluation**: What could go wrong?
- **Planning**: Find action sequences that lead to goals

**Hypothesis engine**: Instead of computing all possible futures (combinatorial explosion), the agent:
1. Generates a few promising hypotheses ("if we attack, enemy will retreat")
2. Evaluates each hypothesis (compute predicted outcome)
3. Tests hypotheses (observe results, update confidence)
4. Adapts (choose actions based on highest-confidence hypotheses)

This is much more efficient than exhaustive lookahead.

---

## 7. Execution Trace

### 7.1 Why It Exists

The execution trace is the complete record of everything an agent did, why it did it, and what happened.

**Without a trace**: Debugging is guesswork. You run a mission, it fails, and you don't know why. Did the planner make a bad plan? Did the decision engine choose wrong? Did the game execute the command differently than expected?

**With a trace**: Every decision is documented:
- What world state was observed
- What goals were evaluated
- What plan was generated
- What decision was made (and why)
- What command was executed
- What the result was

Traces enable:

1. **Replay**: Rewind to any moment and inspect what the agent knew
2. **Analysis**: Measure goal achievement, planning efficiency, decision quality
3. **Testing**: Ensure behavior is deterministic (same trace every time)
4. **Learning**: Find patterns in successful vs. failed strategies
5. **Auditing**: Prove exactly what the agent did

### 7.2 Event Model

Traces consist of immutable events:

```typescript
interface TraceEvent {
  readonly timestamp: number      // Real time (ms)
  readonly tick: number           // Game tick
  readonly eventType: string      // "goal_selected", "command_executed", etc.
  readonly data: Record<string, unknown>  // Event-specific data
}
```

Event types fall into categories:

**Lifecycle Events** (mission started, initialized, completed, shutdown)
**Goal Events** (created, evaluated, selected, adapted)
**Planning Events** (planner invoked, plan generated, plan invalidated)
**Decision Events** (decision made, command selected)
**Execution Events** (command executed, succeeded/failed)
**Failure Events** (failure detected, diagnosis generated, recovery selected)
**Learning Events** (hypothesis generated, belief updated, strategy adapted)

### 7.3 Historical Reconstruction

Traces enable **time-travel debugging**: jumping to any point in execution and asking "what was the agent thinking here?"

```
Tick 0:     [Initialize]
Tick 1:     [Observe] → [Plan] → [Decide] → [Execute]
Tick 2:     [Observe] → [Plan] → [Decide] → [Execute]
...
Tick 47:    [Observe] → [Plan] → [Decide] → [Execute FAIL]
Tick 48:    [Diagnose] → [Recover]
Tick 49:    [Observe] → [Plan (new)] → [Decide] → [Execute]
```

At any tick, we can reconstruct:
- What world state was observed
- What goals were being pursued
- What plan existed
- What decision was made
- Why that decision was made (decision reasoning is in the trace)

This is more powerful than traditional debugging because:
1. No breakpoints needed (events are already recorded)
2. No interaction (just read the trace)
3. No performance impact (trace is recorded during execution)
4. Deterministic (run again, get identical trace, replay any moment)

### 7.4 Trace Durability

Traces are immutable once created. Every event is appended, never modified:

```
Trace:
  Event 1: Mission started (tick 0)
  Event 2: World observed (tick 1) [immutable]
  Event 3: Goal evaluated (tick 1) [immutable]
  Event 4: Plan generated (tick 1) [immutable]
  ...
  Event N: Mission completed (tick 50) [immutable]
```

This prevents:
- Accidental data corruption
- Race conditions on trace writes
- Loss of historical context

The trace is finalized when the mission completes. At that point, it's safe to analyze, export, or archive.

---

## 8. Dashboard and Debugging

### 8.1 The Dashboard

The dashboard provides **real-time visualization of agent execution.**

Features:

1. **Live Execution**: Tick-by-tick progress with metrics
2. **Timeline**: All events in chronological order, filterable by type
3. **Tick Inspector**: Click an event to see world state at that moment
4. **Decision Breakdown**: Why did the agent choose this action?
5. **Goal Chart**: Current goals and their scores
6. **Performance Metrics**: Latency, memory, decision count

### 8.2 Timeline

The timeline is the primary debugging tool:

```
Tick 1:  [Goal Evaluation] → Mission goal: "reach (50, 50)" score 0.8
Tick 1:  [Plan Generated] → "reach (50, 50)": MOVE_NORTH, MOVE_EAST, ...
Tick 1:  [Decision Made] → Choose MOVE_NORTH (first step)
Tick 1:  [Command Executed] → MOVE result: success
Tick 2:  [Goal Evaluation] → "reach (50, 50)" score 0.8 (unchanged)
Tick 2:  [Plan Reused] → Previous plan still valid
Tick 2:  [Decision Made] → Choose MOVE_EAST (next step)
Tick 2:  [Command Executed] → MOVE result: success
...
Tick 48: [Goal Evaluation] → "reach (50, 50)" score 0.8
Tick 48: [Plan Invalidated] → Enemy blocked path
Tick 48: [Plan Generated] → "reach (50, 50)": MOVE_NORTH, MOVE_WEST, ...
Tick 49: [Decision Made] → Choose MOVE_NORTH
```

Each event is clickable, revealing full context (parameters, reasoning, results).

### 8.3 Replay Mode

Replay allows slow-motion execution:
- Pause at any tick
- Step forward/backward through events
- Inspect world state at each moment
- Compare two ticks side-by-side

This is invaluable for:
- Understanding why a strategy failed
- Verifying that a fix actually works
- Analyzing opponent behavior
- Training new developers on the codebase

### 8.4 Why Not a Debugger?

You might ask: "Why not just step through code in a debugger?"

Three reasons:

1. **Speed**: Traditional debugging is slow. Setting breakpoints, inspecting variables, resuming—this is time-consuming. Replay is instant.

2. **Determinism**: Every execution is identical. You don't need to reproduce a race condition—the trace contains all information.

3. **Observability**: A trace shows the *logical flow* (goals, plans, decisions) not the implementation details (function calls, variable assignments). This is more useful for understanding behavior.

---

## 9. Plugin Architecture

### 9.1 Adapter Pattern

GameAdapter is the plugin architecture's centerpiece. It defines **the interface to any game.**

```typescript
interface GameAdapter {
  async initialize(config: AdapterConfig): Promise<void>
  async shutdown(): Promise<void>
  async createSession(config: SessionConfig): Promise<GameSession>
}

interface GameSession {
  async tick(): Promise<WorldState>
  async execute(command: Command): Promise<CommandExecutionResult>
  async close(): Promise<void>
}
```

This interface is intentionally minimal:
- `initialize`: One-time setup (connect to game server, load maps, authenticate)
- `shutdown`: Cleanup (close connections, save state)
- `createSession`: Create a new game instance
- `tick`: Get current world state
- `execute`: Apply a command, return new state

Any game can be supported by implementing this interface.

**Example: OpenRA Adapter (v1.0 - Mock)**
```typescript
class OpenRAAdapter implements GameAdapter {
  async initialize(config: AdapterConfig) {
    this.client = new OpenRAClient(config.serverUrl);
    await this.client.connect();
  }
  
  async createSession(config: SessionConfig) {
    return new OpenRAGameSession(this.client, config.mapName);
  }
}
```

**Example: OpenRA Real Integration (v2.0)**

v2.0 adds HTTP bridge to live OpenRA via OpenRA-RL service:

```typescript
class OpenRARLBridge {
  async connect(): Promise<void>
  getStateReader(): StateReader // HTTP GET /observation
  getCommandExecutor(): CommandExecutor // HTTP POST /step
}

class OpenRAStateReaderRL implements StateReader {
  async getGameState(): Promise<OpenRAGameState>
  // Fetches from http://localhost:8000/observation
}

class OpenRACommandExecutorRL implements CommandExecutor {
  async executeCommand(command): Promise<ValidationResult>
  // Posts to http://localhost:8000/step
}
```

This allows AI Commander to play real OpenRA matches while maintaining full determinism and observability. All tournament formats (round-robin, Swiss, elimination) work with real games.

### 9.2 Strategy Composition

Strategies (planners, decision engines, risk assessors) are composed rather than inherited.

```typescript
// Generic agent with pluggable strategies
class Agent {
  constructor(
    private planner: Planner,
    private decisionEngine: DecisionEngine,
    private riskAssessor: RiskAssessor
  ) {}
  
  async decide(goal: Goal, worldState: WorldState) {
    const plan = await this.planner.plan(goal, worldState);
    const risk = await this.riskAssessor.assess(plan, worldState);
    
    if (risk.overall > 0.8) {
      return this.decisionEngine.decideSafely(plan, worldState);
    } else {
      return this.decisionEngine.decideAggressively(plan, worldState);
    }
  }
}
```

This enables mixing and matching strategies:
- Different planners for different goal types
- Different decision engines for different playstyles
- Different risk assessors for different personalities

### 9.3 Extension Boundaries

To extend AI Commander safely:

1. **Implement the required interface** (Planner, DecisionEngine, GameAdapter, etc.)
2. **Respect immutability** (don't mutate WorldState or Goals)
3. **Avoid side effects** (don't read/write external state during decisions)
4. **Use deterministic logic** (don't use random numbers without seeding)
5. **Record decisions** in the execution trace (for debugging)

---

## 10. Testing Strategy

### 10.1 Determinism Tests

Determinism is so important that it's tested extensively:

```typescript
test('identical inputs produce identical traces', async () => {
  // Run 1
  const agent1 = new MissionAgent(10, 10);
  await agent1.initialize();
  await agent1.run();
  const trace1 = agent1.getTrace();
  
  // Run 2 (identical setup)
  const agent2 = new MissionAgent(10, 10);
  await agent2.initialize();
  await agent2.run();
  const trace2 = agent2.getTrace();
  
  // Verify traces are identical
  expect(trace1.events.length).toBe(trace2.events.length);
  for (let i = 0; i < trace1.events.length; i++) {
    expect(trace1.events[i].eventType).toBe(trace2.events[i].eventType);
    expect(trace1.events[i].data).toEqual(trace2.events[i].data);
  }
});
```

This test proves that the core determinism promise holds: **same input → same output, every time.**

### 10.2 Integration Tests

Integration tests verify components work together:

```typescript
test('goal adaptation happens when feasibility changes', async () => {
  const agent = new MissionAgent(10, 10);
  await agent.initialize();
  
  // Run for a few ticks
  await agent.run({ maxTicks: 5 });
  
  const trace = agent.getTrace();
  
  // Verify goal was adapted when conditions changed
  const adaptEvents = trace.events.filter(e => e.eventType === 'goal_adapted');
  expect(adaptEvents.length).toBeGreaterThan(0);
});
```

Integration tests verify the full flow (observe → plan → decide → execute) works correctly.

### 10.3 Validation Philosophy

AI Commander has no runtime assertions. Instead, it validates:

1. **At initialization**: Configuration is correct, all components are available
2. **At the boundary**: GameAdapter returns valid WorldState
3. **After execution**: Trace is complete, all required events present

**Why no assertions?** Because assertions catch bugs too late. By the time an assertion fires, the trace is corrupted. Instead, we verify assumptions before we rely on them.

### 10.4 Test Coverage Strategy

Tests focus on:
- **Determinism** (core property)
- **Correctness** (right behavior given inputs)
- **Integration** (components work together)
- **Stress** (memory, concurrency, long runs)
- **Regression** (changes don't break existing behavior)

1870 tests cover all major systems. New code requires tests before merging.

---

## 11. Performance

### 11.1 Tick Latency

Tick latency is how long each game tick takes to execute:

```
Tick execution:
  Observe (read game state)    ~0.1ms
  Plan (generate action sequence) ~0.2ms
  Decide (choose next action)  ~0.05ms
  Execute (apply command)      ~0.05ms
  Record (write trace event)   ~0.01ms
  ─────────────────────────────────────
  Total per tick:              ~0.41ms
```

Target: **< 1ms per tick** (enabling 1000+ ticks/second).

Actual: **0.4ms average** for typical missions.

**Optimization principles**:
- Lazy evaluation (don't compute what you don't need)
- Caching (reuse computed values within a tick)
- Batching (group similar operations)
- Minimal allocations (reuse objects, avoid garbage creation)

### 11.2 Memory Usage

Memory profile for a 100-tick mission:

```
Execution trace:      ~50 KB (1000 events at ~50 bytes each)
World states (cached): ~100 KB (100 snapshots)
Active goals:         ~10 KB
Plans:                ~20 KB
────────────────────────────
Total:                ~180 KB
```

Target: **< 20MB for long missions**

Actual: **~1-5MB for typical 100-tick missions**

**Key optimizations**:
- Traces are linear (events append, don't reshape)
- World states are immutable (no copies of modified state)
- Caches evict old entries (keep only recent history)
- No unnecessary allocations during decision loop

### 11.3 Benchmarking

AI Commander includes a comprehensive benchmark suite:

```
Mission Size  | Avg Latency | Memory Growth | Trace Size
──────────────┼─────────────┼───────────────┼──────────
Tiny (3x3)    | 0.34ms      | 2.1MB         | 12KB
Small (5x5)   | 0.36ms      | 3.5MB         | 24KB
Medium (15x15)| 0.40ms      | 8.2MB         | 72KB
Large (25x25) | 0.45ms      | 12.8MB        | 180KB
```

Performance is deterministic: the same mission always takes the same time.

### 11.4 Scalability Limits

**What AI Commander scales well to:**
- 100+ ticks per mission ✓
- 100+ units on the map ✓
- 1000+ decisions per mission ✓
- Parallel missions (100+) ✓

**What it doesn't scale to:**
- Real-time (< 1ms decision deadline) ✗ (use precomputation)
- 10,000+ units ✗ (use unit grouping)
- Continuous learning ✗ (use async analysis)
- 1000+ concurrent agents ✗ (use distributed architecture)

These limitations aren't bugs—they're design constraints. AI Commander solves a different problem than real-time action games.

---

## 12. Lessons Learned

### 12.1 Architectural Decisions

**Decision: Immutable world state**

Chosen: Every observation creates a fresh, immutable WorldState.

Alternative: Mutable world state that gets updated each tick.

Why immutable won:
- Enables time-travel debugging (old states are still available)
- Prevents bugs (can't accidentally modify world state in a decision)
- Enables rollback (if plan fails, original state is still there)

Cost: Slightly more memory (multiple state snapshots). But deterministic value outweighs this.

**Decision: Linear execution loop (no concurrency in decisions)**

Chosen: Observe → Plan → Decide → Execute, one at a time per tick.

Alternative: Parallel planning and decision making.

Why linear won:
- Determinism (no race conditions)
- Debuggability (clear cause-and-effect)
- Simplicity (easier to reason about)

Cost: Slower planning (can't parallelize across goals). But v1.0 doesn't need speed; it needs clarity.

**Decision: Explicit goals instead of utility functions**

Chosen: Goals are objects with priority and feasibility.

Alternative: Utility functions that map world state to numeric preferences.

Why explicit goals won:
- Interpretability (you can name goals, understand them)
- Adaptation (can stop pursuing a goal, start a new one)
- Learning (can track which goals succeeded/failed)

Cost: Less flexible (goals must be known in advance). But this is acceptable for strategy games.

### 12.2 Trade-offs

**Simplicity vs. Generality**

Trade-off: AI Commander doesn't handle real-time games, continuous learning, or distributed execution.

Rationale: Adding these would complicate the core. Strategy games don't need them. If you need them, build on top of AI Commander.

**Determinism vs. Realism**

Trade-off: Deterministic systems can't model true randomness (fog of war, unit variance, game randomness).

Solution: Use belief state and hypotheses instead. Uncertainty is modeled as confidence, not randomness.

**Observability vs. Performance**

Trade-off: Recording 100+ event types per tick creates trace overhead.

Solution: Events are batched and optimized. Trace overhead is ~1% of execution time—acceptable for a debugging framework.

**Extensibility vs. Simplicity**

Trade-off: Plugin architecture (12 packages, multiple interfaces) is more complex than a monolithic system.

Solution: Complexity is at the boundary (defining adapters, planners). Core is simple.

### 12.3 What Was Intentionally Rejected

**Machine Learning Integration**
Why not: ML models are opaque and non-deterministic. AI Commander's strength is transparency. These are incompatible.

**Hierarchical Planning**
Why not: Makes tracing harder (which level made which decision?). Linear planning is clearer.

**Multi-Agent Coordination**
Why not: Agents should be independent. Coordination adds state sharing complexity. If you need it, implement above the framework.

**Real-Time Constraints**
Why not: Strategy games have planning time. Racing against the clock requires precomputation, not the framework.

**Genetic Algorithms / Optimization**
Why not: Requires evaluation of thousands of variations. Too specialized. Better as external tool.

### 12.4 Common Misconceptions

**Misconception: "Deterministic means predictable"**

Reality: Deterministic means reproducible, not that you can predict behavior without running it. A complex plan might have thousands of possible futures. Determinism just means those futures are the same on each execution.

**Misconception: "Execution traces are only for debugging"**

Reality: Traces are primary artifacts. They're the ground truth of what the agent did. Use them for analysis, learning, testing, and research.

**Misconception: "Goals should contain strategy"**

Reality: Goals state desired outcomes, not methods. A goal "reach position X" is better than "walk north then east". Strategy should be in the planner.

**Misconception: "The framework is complete"**

Reality: AI Commander solves 60-70% of strategy game AI problems. The other 30-40% (opponent modeling, long-term strategy, economic analysis) is where you add value.

---

## 13. Future Directions

### 13.1 Possible Evolution

**Macro-Strategy Layer** (v1.1)
Add explicit long-term planning above the goal layer:
- Multi-goal sequencing ("first build army, then attack")
- Technology research and progression
- Resource economy optimization
- Territorial expansion planning

This wouldn't change the core loop—it would feed long-term goals into the existing goal selection mechanism.

**Opponent Modeling** (v1.2)
Add statistical tracking of opponent behavior:
- Build order prediction
- Army composition analysis
- Timing estimation
- Personality detection

This would extend BeliefState with opponent hypotheses and predictive models.

**Async Analysis** (v1.2)
Separate analysis from execution:
- Run planning in parallel with game execution
- Precompute multiple plans and choose offline
- Analyze past decisions asynchronously

This would keep execution deterministic while enabling slower algorithms.

**Distributed Agents** (v2.0)
Support multiple coordinated agents:
- Shared world state (immutable, versioned)
- Asynchronous decision making
- Coordination through shared plans

This is major architecture change but feasible.

### 13.2 Research Opportunities

**Goal Hierarchies**
How to organize goals into hierarchies (high-level "win the game" down to "gather 10 wood"). How does this affect planning and adaptation?

**Plan Robustness**
How to generate plans that are resistant to failures? Should goals contain fallback strategies?

**Opponent Prediction**
How to model opponent strategies with limited information? Can belief state and hypothesis engine predict behavior accurately?

**Economic Optimization**
How to optimize resource allocation when goals compete for resources? Game theory approaches?

**Emergent Behavior**
What strategies emerge when agents compose high-level with low-level goals? Can you discover novel strategies through analysis?

### 13.3 Integration Points

**Real Games**
- ✅ **OpenRA** (v2.0) — Real-time RTS with HTTP bridge to OpenRA-RL service
  - Real game state observation via `/observation` endpoint
  - Real command execution via `/step` endpoint  
  - Connection management with automatic retries
  - Full deterministic replay of live matches
- StarCraft III (RTS with large action space)
- Age of Empires IV (economic + military complexity)
- Total War (campaign + tactical layers)

**Research Platforms**
- OpenAI Gym (integrate game adapters)
- TORCS (racing simulation)
- CARLA (autonomous driving)

**Education**
- Game AI courses (teaching planning and decision making)
- Competitive AI (tournament platforms)
- Benchmark suites (community challenges)

---

## Conclusion

AI Commander is a framework for transparent, reproducible game AI.

Its core insight: **clarity is more valuable than power.**

A simple system that you understand beats a powerful system that surprises you. Determinism beats realism. Observability beats optimization. Extensibility beats generality.

This philosophy enables:
- Debugging complex strategies
- Testing without the game client
- Sharing and composing algorithms
- Learning from agent behavior
- Research on game AI

AI Commander v1.0 is complete and stable. It solves the core problem: transparent autonomous agents for strategy games.

The remaining problems—long-term strategy, opponent modeling, distributed coordination—are open. They're where you add value.

The framework is here. Go build something interesting.

---

## Appendix A: Glossary

**Adapter**: Implementation of the GameAdapter interface for a specific game.

**Agent**: An autonomous entity that observes, plans, decides, and executes.

**Belief State**: Uncertain knowledge tracked with confidence levels.

**Command**: Immutable action declaration sent to the game adapter.

**Determinism**: Property that identical inputs always produce identical outputs.

**Decision Engine**: Component that chooses next action from a plan.

**Execution Trace**: Complete record of all events during a mission.

**Feasibility**: Whether a goal can be achieved given current world state.

**GameAdapter**: Interface between agent and game.

**Goal**: Statement of desired outcome without specifying methods.

**Observation**: Reading current game state.

**Plan**: Ordered sequence of steps toward a goal.

**Planner**: Component that transforms goals into plans.

**Risk Assessment**: Evaluation of potential negative outcomes.

**Strategy**: Approach to achieving goals (versus goals themselves).

**World State**: Immutable snapshot of observable game state.

---

## Appendix B: Key Files

**Core Architecture**
- `packages/domain/src/` - Base types
- `packages/core/src/` - Services and utilities
- `packages/adapter/src/` - GameAdapter interface

**Algorithm Layers**
- `packages/planner/src/` - Planning interface and implementations
- `packages/decision/src/` - Decision engine interface
- `packages/goals/src/` - Goal management

**Reference Implementation**
- `apps/reference/src/mission-agent.ts` - Main orchestrator (1600 lines)
- `apps/reference/src/execution-trace.ts` - Trace recording (1000 lines)
- `apps/reference/src/dashboard-server.ts` - Live visualization (1300 lines)

**Testing**
- `apps/reference/tests/determinism-validation.test.ts` - Core property tests
- `apps/reference/tests/stress-test.test.ts` - Scalability tests
- `apps/reference/tests/benchmark.test.ts` - Performance validation

---

**End of Architecture Book**

This document is the definitive technical reference for AI Commander v1.0. For implementation details, see the code comments. For usage examples, see the documentation in `docs/` and `GETTING_STARTED.md`.
