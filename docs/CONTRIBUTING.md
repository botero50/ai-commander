# Contributing Guide

Thank you for your interest in contributing to AI Commander! This guide explains how to extend and improve the framework.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/ai-commander
cd ai-commander

# Install dependencies
pnpm install

# Run tests to verify setup
pnpm test

# Run linting and type checking
pnpm run lint
pnpm run typecheck
```

## Repository Structure

```
ai-commander/
├── packages/              # Framework packages
│   ├── domain/           # Core types (GameAdapter, Goal, Plan, etc.)
│   ├── adapter/          # Game integration interface
│   ├── planner/          # Planning algorithms
│   ├── decision/         # Decision-making engines
│   ├── runtime/          # Agent execution loop
│   ├── fake-game-adapter # Test game implementation
│   └── openra-adapter/   # OpenRA integration
├── apps/
│   └── reference/        # Reference implementation with all features
├── docs/                 # Documentation
└── tests/               # Integration tests
```

## Before You Start

1. Check existing issues to avoid duplicate work
2. For major features, open a discussion issue first
3. Ensure your code follows the style guide (see below)
4. Add tests for all new functionality
5. Update documentation as needed

## Making Changes

### Style Guide

- **TypeScript**: Strict mode, explicit types
- **Naming**: Descriptive names (no abbreviations except common ones like `x`, `y`)
- **Comments**: Only when the "why" is non-obvious
- **Testing**: Deterministic tests for core logic
- **Imports**: Relative imports within packages, absolute imports across packages

### Code Patterns

#### Observable Behavior
Always prefer observable behavior over hidden logic:

```typescript
// Good: behavior is clear from return value
function analyzeMap(world: WorldState): MapAnalysis {
  return { chokepoints, expansions, routes };
}

// Avoid: behavior hidden in state mutations
function analyzeMap(world: WorldState): void {
  this.internalChokepoints = ...;
}
```

#### Deterministic Logic
Core logic must be deterministic:

```typescript
// Good: same input → same output
function evaluate(goal: Goal): number {
  return goal.priority * goal.feasibility;
}

// Avoid: randomness without seeding
function evaluate(goal: Goal): number {
  return Math.random() > 0.5 ? 1 : 0;
}
```

#### Trace Recording
Record important decisions in execution traces:

```typescript
// In your decision-making component
tracer.recordGoalSelected(goal, reasoning);
tracer.recordDecision(decision, confidence);
```

### Testing Requirements

For any new feature:

1. Write deterministic unit tests
2. Test observable output, not internal state
3. Include edge cases (empty input, single item, etc.)
4. Verify properties (scores are [0,1], arrays are non-empty when expected)
5. Target 100% passing test suite

Example:

```typescript
describe('MyFeature', () => {
  it('should compute result deterministically', () => {
    const result1 = compute(input);
    const result2 = compute(input);
    expect(result1).toEqual(result2);
  });

  it('should handle edge cases', () => {
    expect(compute(emptyInput)).toBeDefined();
    expect(compute(singleItemInput).length).toBeGreaterThan(0);
  });

  it('should maintain invariants', () => {
    const result = compute(input);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
```

## Adding a New Component

### Example: Custom Analyzer

1. **Create the component**:
```typescript
// apps/reference/src/my-analyzer.ts
export interface MyAnalysisResult {
  readonly metric: number;
  readonly details: string;
}

export class MyAnalyzer {
  analyze(world: WorldState): MyAnalysisResult {
    return {
      metric: this.computeMetric(world),
      details: 'analysis details',
    };
  }

  private computeMetric(world: WorldState): number {
    // Analysis logic
    return 0.5;
  }
}
```

2. **Write tests**:
```typescript
// apps/reference/tests/my-analyzer.test.ts
describe('MyAnalyzer', () => {
  it('should analyze deterministically', () => {
    const analyzer = new MyAnalyzer();
    const world = createTestWorld();

    const result1 = analyzer.analyze(world);
    const result2 = analyzer.analyze(world);

    expect(result1).toEqual(result2);
  });

  it('should compute valid metrics', () => {
    const analyzer = new MyAnalyzer();
    const result = analyzer.analyze(createTestWorld());

    expect(result.metric).toBeGreaterThanOrEqual(0);
    expect(result.metric).toBeLessThanOrEqual(1);
  });
});
```

3. **Run tests**:
```bash
pnpm test
```

4. **Update docs** if adding public APIs

## Submitting Changes

1. **Create a branch** from `main`:
```bash
git checkout -b feature/my-feature
```

2. **Make your changes**, committing logically:
```bash
git commit -m "Add MyAnalyzer component"
git commit -m "Add deterministic tests for MyAnalyzer"
```

3. **Run full validation**:
```bash
pnpm run doctor  # typecheck, lint, format, test
```

4. **Push your branch**:
```bash
git push origin feature/my-feature
```

5. **Open a pull request** on GitHub with:
   - Clear description of what changed and why
   - Link to any related issues
   - Test results showing all tests pass

## Code Review

PRs will be reviewed for:
- ✅ Deterministic behavior
- ✅ Complete test coverage
- ✅ Observable logic (not hidden state)
- ✅ Consistent naming and style
- ✅ Documentation updates
- ✅ No breaking changes to public APIs

## Areas for Contribution

### High Impact
- New game adapters (StarCraft, AoE4, etc.)
- Advanced planning algorithms
- New decision-making strategies
- Performance optimizations

### Documentation
- Tutorials for specific features
- Examples for common use cases
- API clarifications
- Architecture walkthroughs

### Testing
- Property-based tests
- Performance benchmarks
- Integration test scenarios

### Infrastructure
- CI/CD improvements
- Build optimization
- Tooling enhancements

## Common Tasks

### Adding a new TraceEventType

1. Add to `TraceEventType` in `execution-trace.ts`
2. Call `tracer.record*()` from your component
3. Update dashboard event types if displaying to user
4. Test via integration tests

### Creating a new story/feature

1. Follow the story number sequence (add to Epic 10+)
2. Implement deterministic behavior
3. Record decisions in execution trace
4. Add 10-20 tests per story
5. Commit with message "Story NNN: Feature Name"

### Extending an existing component

1. Maintain backward compatibility
2. Add new tests for new behavior
3. Update documentation
4. Verify all existing tests still pass

## Questions?

- Check [FAQ](./FAQ.md) for common questions
- Review existing PRs for patterns
- Open a discussion issue before starting large work

## Code of Conduct

Be respectful, inclusive, and collaborative. Help others learn. Share knowledge generously.

---

Thank you for contributing to AI Commander!
