# Frequently Asked Questions

## General Questions

### What is AI Commander used for?

AI Commander is a framework for building autonomous agents that play strategy games intelligently. It handles perception, planning, decision-making, and execution while recording every step for inspection and analysis.

### What games does AI Commander support?

The framework is game-agnostic. Out of the box it includes:
- **FakeGameAdapter** — Simple simulated game for testing
- **OpenRA adapter** — Real-time strategy game integration

You can add support for any game by implementing the `GameAdapter` interface.

### Is AI Commander deterministic?

Yes. Identical inputs (world state, goals, tick sequence) always produce identical outputs. This makes it perfect for testing, benchmarking, and reproducible AI development.

### Can I use AI Commander for real-time games?

AI Commander is designed for turn-based strategy games. For real-time games, you'd need to batch perception and decision-making within your time budget.

### What are the hardware requirements?

- **CPU**: Any modern processor (the included agents run single-threaded)
- **RAM**: ~500MB for typical 100-tick mission
- **Disk**: ~2KB per trace
- **Node.js**: 22+

## Technical Questions

### How do I create a custom goal type?

Goals in AI Commander use a plugin system. Implement custom goal types by extending the goal interface:

```typescript
import { createGoal } from '@ai-commander/goals';

const customGoal = createGoal({
  id: createGoalId('my-goal'),
  intent: 'my-custom-intent',
  priority: GoalPriorityLevel.HIGH,
});
```

### How do I implement a custom Planner?

```typescript
import type { Planner } from '@ai-commander/planner';

class MyPlanner implements Planner {
  async plan(goal: Goal, context: PlanningContext): Promise<Plan> {
    // Your planning logic here
    return { steps: [...], generated: context.tick };
  }
}
```

Then pass it when creating an agent:

```typescript
const app = new ReferenceApp(myPlanner, decisionEngine);
```

### How do I implement a custom DecisionEngine?

```typescript
import type { DecisionEngine } from '@ai-commander/decision';

class MyDecisionEngine implements DecisionEngine {
  async decide(request: DecisionRequest): Promise<DecisionResult> {
    // Your decision logic here
    return {
      command: createCommand({...}),
      reasoning: 'why this command'
    };
  }
}
```

### How do I connect to a new game?

Implement the `GameAdapter` interface:

```typescript
import type { GameAdapter } from '@ai-commander/adapter';

class MyGameAdapter implements GameAdapter {
  async initialize(config: AdapterConfig): Promise<void> { }
  async shutdown(): Promise<void> { }
  async createSession(config: SessionConfig): Promise<GameSession> {
    return {
      async tick(): Promise<WorldState> { },
      async execute(command: Command): Promise<CommandExecutionResult> { },
      async close(): Promise<void> { },
    };
  }
}
```

### How do I access execution traces?

```typescript
const agent = new MissionAgent(targetX, targetY);
await agent.initialize();
await agent.run();

// Get the trace object
const trace = agent.tracer.getTrace();

// Format as human-readable text
console.log(agent.formatTrace());

// Export as JSON
const json = agent.formatTraceAsJson();
```

### Why is my agent making the same decision every time?

That's not a bug—it's a feature! AI Commander is deterministic. If you want different behavior, change the goal, world state, or algorithm.

### How do I debug a specific decision?

1. Run the mission with the dashboard: `npm run demo`
2. Click the timeline event where the decision happened
3. The inspection panel shows the exact world state and reasoning at that moment
4. Step forward to see the consequences

### How do I test my custom component?

Write tests using Vitest:

```typescript
describe('MyComponent', () => {
  it('should behave correctly', () => {
    const component = new MyComponent();
    const result = component.analyze(input);
    
    expect(result).toEqual(expectedOutput);
  });
});
```

Run with `npm test`.

## Performance Questions

### How fast does AI Commander run?

The reference implementation executes ~1000 ticks/second in simulation. OpenRA integration depends on game server response time.

### How much memory does a trace use?

Approximately 1KB per 100-tick mission. Large missions (1000+ ticks) produce ~10KB traces.

### Can I run multiple agents in parallel?

Yes. Each agent is independent and stateless. You can spawn multiple agents:

```typescript
const agents = [
  new MissionAgent(10, 10),
  new MissionAgent(20, 20),
  new MissionAgent(30, 30),
];

await Promise.all(agents.map(a => a.run()));
```

### Is there production monitoring?

The framework includes tracing and metrics collection. For production monitoring, export traces to your observability platform.

## Architecture Questions

### What's the difference between a Goal, a Plan, and a Command?

- **Goal**: What the agent wants to achieve (e.g., "reach position 50, 50")
- **Plan**: Sequence of steps to achieve that goal (e.g., "move north 10, move east 10")
- **Command**: Individual action sent to the game (e.g., "move north")

### Why is the code split into so many packages?

Each package represents a pluggable layer:
- `domain` — Game-agnostic types
- `adapter` — Game communication
- `planner` — Action sequencing
- `decision` — Next action selection
- `runtime` — Execution loop

This makes it easy to swap components.

### How does the dashboard work?

The dashboard is a browser client that connects to `DashboardServer` (running in the agent process) via Server-Sent Events (SSE). It receives state updates as the agent executes and displays them in real-time.

## Getting Help

### Where can I report bugs?

Open an issue on GitHub or contact the maintainers.

### Where's the source code?

The complete source is on GitHub at `anthropics/ai-commander`.

### Can I use AI Commander commercially?

Yes. AI Commander is licensed under the MIT license and can be used for any purpose, commercial or otherwise.

### How do I contribute?

See [Contributing Guide](./CONTRIBUTING.md) for guidelines on submitting pull requests, adding tests, and maintaining code quality.

---

Still have questions? Check the [Developer Guide](./DEVELOPER_GUIDE.md) or [Architecture Guide](./ARCHITECTURE.md) for deeper context.
