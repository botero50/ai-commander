# Testing Guide

AI Commander comes with 1757 tests covering all core functionality. This guide explains the testing infrastructure and how to write tests for your custom components.

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Test a specific file
npm test -- map-analysis.test.ts

# With coverage (if configured)
npm test -- --coverage
```

## Test Structure

Tests are organized alongside source files:

```
apps/reference/
├── src/
│   ├── map-analysis.ts
│   ├── risk-assessment.ts
│   └── ...
└── tests/
    ├── map-analysis.test.ts
    ├── risk-assessment.test.ts
    └── ...
```

## Test Patterns

### Deterministic Test (Core Pattern)

All core logic is deterministic—identical inputs always produce identical outputs.

```typescript
describe('Story 138: Map Analysis', () => {
  it('should analyze map deterministically', () => {
    const world = createTestWorld();
    const analyzer = new MapAnalyzer();

    const analysis1 = analyzer.analyzeMap(0, world);
    const analysis2 = analyzer.analyzeMap(0, world);

    expect(analysis1.chokepoints).toEqual(analysis2.chokepoints);
  });
});
```

### Observable Behavior Test

Verify the output of a public API.

```typescript
it('should detect chokepoints with limited connectivity', () => {
  const world = createTestWorld();
  const analyzer = new MapAnalyzer();

  const analysis = analyzer.analyzeMap(0, world);

  if (analysis.chokepoints.length > 0) {
    expect(analysis.chokepoints[0].accessibleRegions).toBeGreaterThanOrEqual(2);
    expect(analysis.chokepoints[0].accessibleRegions).toBeLessThanOrEqual(4);
  }
});
```

### Test Fixtures

Create reusable world state for tests:

```typescript
function createTestWorld(unitCount = 20): WorldState {
  const agents = Array(unitCount)
    .fill(null)
    .map((_, i) => ({
      id: `agent-${i}`,
      customData: { position: `${10 + i},${10}` },
    }));

  return {
    agents,
    resources: 'test-resources',
    map: 'test-map',
  };
}
```

## Test Categories

### Unit Tests
Test individual functions and classes in isolation.

```typescript
describe('GoalEvaluator', () => {
  it('should score goals based on priority', () => {
    const evaluator = new GoalEvaluator();
    const goal = createGoal({ priority: GoalPriorityLevel.HIGH });
    
    const score = evaluator.evaluate(goal);
    
    expect(score).toBeGreaterThan(0.5);
  });
});
```

### Integration Tests
Test component interactions and end-to-end flows.

```typescript
describe('Mission Execution', () => {
  it('should complete a simple mission', async () => {
    const agent = new MissionAgent(2, 2);
    await agent.initialize();
    await agent.run();
    
    expect(agent.tracer.getTrace().endTime).toBeDefined();
  });
});
```

### Property Tests
Verify invariants and properties that must always hold.

```typescript
it('should maintain valid confidence scores', () => {
  const state = new BeliefState();
  const belief = state.inferBelief(0, 'Hypothesis', 0.5);
  
  state.updateBeliefConfidence(1, belief.id, 100, 'test');
  const updated = state.getBelief(belief.id);
  
  // Confidence must always be [0, 1]
  expect(updated!.confidence).toBeGreaterThanOrEqual(0);
  expect(updated!.confidence).toBeLessThanOrEqual(1);
});
```

## Assertion Patterns

### Determinism
```typescript
expect(result1).toEqual(result2); // Deep equality
```

### Observable Output
```typescript
expect(analysis.chokepoints).toHaveLength(5);
expect(analysis.expansion[0].viability).toBeGreaterThan(0.6);
```

### Invariants
```typescript
expect(score).toBeGreaterThanOrEqual(0);
expect(score).toBeLessThanOrEqual(1);
```

### Trace Recording
```typescript
const events = agent.tracer.getTrace().events;
expect(events).toContainEqual(
  expect.objectContaining({ eventType: 'goal_selected' })
);
```

## Testing Custom Components

### Testing a Custom Planner

```typescript
class MyPlanner implements Planner {
  plan(goal: Goal, context: PlanningContext): Promise<Plan> {
    // Your planning logic
  }
}

describe('MyPlanner', () => {
  it('should generate valid plans', async () => {
    const planner = new MyPlanner();
    const goal = createGoal();
    const context = { world: createTestWorld(), tick: 0 };

    const plan = await planner.plan(goal, context);

    expect(plan.steps).toHaveLength(expect.any(Number));
    expect(plan.steps.every(s => s.action)).toBe(true);
  });
});
```

### Testing a Custom Adapter

```typescript
class MyGameAdapter implements GameAdapter {
  async initialize(config: AdapterConfig) { }
  async createSession(config: SessionConfig) { }
  async shutdown() { }
}

describe('MyGameAdapter', () => {
  it('should initialize successfully', async () => {
    const adapter = new MyGameAdapter();
    
    await expect(adapter.initialize({})).resolves.not.toThrow();
  });
});
```

## Framework

All tests use **Vitest**, a modern, type-safe test runner.

Key assertions:
- `expect(...).toEqual(...)` — Deep equality
- `expect(...).toBe(...)` — Reference equality
- `expect(...).toContainEqual(...)` — Array contains
- `expect(...).rejects.toThrow()` — Promise rejection
- `expect(...).resolves.not.toThrow()` — Promise resolution

## Debugging Tests

```bash
# Run a single test file
npm test -- risk-assessment.test.ts

# Run tests matching a pattern
npm test -- --grep "should assess"

# Debug mode (don't exit immediately)
npm test -- --inspect-brk
```

## Coverage

The test suite covers:
- ✅ All 19 execution trace event types
- ✅ All goal evaluation and adaptation logic
- ✅ All decision-making components
- ✅ All risk assessment dimensions
- ✅ All strategic reasoning (map analysis, territory control, formations)
- ✅ All learning and observation systems

Current test counts: **1757 tests, 108 test files, 100% passing**

---

See also: [Developer Guide](./DEVELOPER_GUIDE.md), [Contributing Guide](./CONTRIBUTING.md)
