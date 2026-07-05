# Execution Trace Guide

The execution trace is AI Commander's complete record of how an agent executed a mission. Every decision, observation, and action is recorded with timing and context.

## Overview

Each mission produces an `ExecutionTrace` containing:
- **missionId**: Unique identifier for this mission
- **targetX, targetY**: Mission goal location
- **startTime, endTime**: Wall-clock timestamps
- **events**: Array of all execution events (19 event types)

## Event Types

### Lifecycle Events
- `mission_started` — Agent begins execution
- `mission_initialized` — Setup complete, ready to execute
- `mission_completed` — Goal achieved successfully
- `mission_failed` — Execution terminated without success
- `mission_tick` — One tick of execution completed

### Goal Events
- `goal_created` — New goal instantiated
- `goal_selected` — Goal chosen for execution
- `goal_candidates_evaluated` — Goal evaluation completed with scores
- `goal_lifecycle_transitioned` — Goal state changed (Queued→Candidate→Executing→Completed)
- `goal_adapted` — Goal changed due to world state change
- `goal_progress_updated` — Progress metric recalculated
- `goal_completed` — Goal achieved

### Planning Events
- `plan_generated` — Planner produced action sequence
- `plan_reused` — Previous plan reapplied
- `plan_invalidated` — Plan no longer valid
- `plan_empty` — Planner produced empty plan
- `plan_error` — Planner failed

### Decision Events
- `decision_selected` — DecisionEngine chose action
- `decision_error` — DecisionEngine failed

### Execution Events
- `command_executed` — Action sent to game
- `command_failed` — Action failed in game
- `world_state_updated` — New observation received

## Accessing Traces

### From Agent

```typescript
const agent = new MissionAgent(50, 50);
await agent.initialize();
await agent.run();

// Get trace
const trace = agent.tracer.getTrace();

// Format as text
console.log(agent.formatTrace());

// Export as JSON
const json = agent.formatTraceAsJson();
```

### Inspecting Events

```typescript
const trace = agent.tracer.getTrace();

for (const event of trace.events) {
  console.log(`Tick ${event.tick}: ${event.eventType}`);
  console.log(`Data:`, event.data);
}
```

## Trace Format

Each event has:
```typescript
interface TraceEvent {
  timestamp: number;  // Unix milliseconds
  tick: number;       // Simulation tick counter
  eventType: TraceEventType;
  data: Record<string, unknown>;
}
```

## Use Cases

### Debugging
Step through execution tick-by-tick to find where decisions went wrong.

### Analysis
Count event frequencies, measure timing, identify bottlenecks.

### Replay
Execute the same mission twice and compare traces for determinism validation.

### Integration
Export trace as JSON for external analysis tools.

## Dashboard Integration

The browser dashboard displays traces as an interactive timeline. Click any event to inspect the agent's world knowledge at that moment.

## Performance

Traces are compact:
- ~1KB per typical 100-tick mission
- Minimal overhead on agent execution
- Can be streamed to external systems in real-time

---

See also: [Dashboard Guide](./DASHBOARD.md), [Debugger Guide](./DEBUGGER.md)
