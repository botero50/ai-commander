# Getting Started with AI Commander v1.0.0

Welcome! This guide will help you get AI Commander installed and running in minutes.

## Installation

### 1. Prerequisites

Ensure you have Node.js 22.0.0 or higher:

```bash
node --version
# Should output: v22.x.x or higher
```

If you need to install Node.js, visit [nodejs.org](https://nodejs.org).

### 2. Clone the Repository

```bash
git clone https://github.com/anthropics/ai-commander
cd ai-commander
```

### 3. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

### 4. Verify Installation

```bash
pnpm test
```

You should see:
```
✓ All 1870 tests passing
```

## Your First Mission

### Run the Default Mission

```bash
pnpm run mission
```

This runs a mission where the AI agent tries to reach position (3, 2). You'll see:

```
═══ Mission Execution ═══

Initializing mission agent (target: 3, 2)...
  ✓ Game adapter initialized
  ✓ Game session created
  ✓ Execution context created
  ...

[Tick 1] Executing agent tick...
  🎯 Goal Evaluation:
    → move-to-target: 0.790 (highest priority)
    → defend-position: 0.853
    → gather-resources: 0.790
  📈 Progress: 10% (stable)

[Tick 2] Executing agent tick...
...

✓ Mission completed successfully
```

## Interactive Dashboard

### View Real-Time Execution

```bash
pnpm run dashboard
```

This launches a web dashboard showing:
- Real-time agent execution
- Current goals and priorities
- Decision timeline
- World state visualization
- Execution metrics

The dashboard opens automatically at `http://localhost:8080`.

## Understanding the Output

### Execution Metrics

After each mission, you see performance metrics:

```
═══ Metrics Summary ═══

Execution Time              1234 ms
Memory Used                 45.2 MB
Tick Count                  50
Average Tick Duration       24.7 ms
Planning Invocations        12
Decisions Made              50
Commands Executed           48
Command Success Rate        96%
```

### Execution Trace

A detailed trace shows every event:

```
═══ Execution Trace ═══

[Tick 1] mission_tick
[Tick 1] goal_evaluation_started
[Tick 1] goal_evaluated: move-to-target (score: 0.790)
[Tick 1] goal_selected: move-to-target
[Tick 1] plan_generated: 5 steps
[Tick 1] decision_selected: move_east
[Tick 1] command_executed: MOVE
```

## Custom Missions

### Change Target Location

Modify the target in `apps/reference/src/mission-cli.ts`:

```typescript
// Default mission: move to (3, 2)
const targetX = 10;  // Change this
const targetY = 10;  // Change this
```

Then run:
```bash
pnpm run mission
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests for Specific Feature

```bash
# Run benchmark tests
pnpm test -- benchmark.test.ts

# Run product polish tests
pnpm test -- product-polish.test.ts

# Watch mode for development
pnpm test:watch
```

## Benchmarking

### Run Performance Benchmarks

```bash
pnpm run benchmark
```

This measures:
- Tick execution latency
- Memory usage patterns
- Trace size
- Planning performance
- Decision throughput

### Benchmark with Custom Targets

```bash
pnpm run benchmark --targets 5:5,15:15,25:25 --runs 5 --json
```

## Building from Source

### Build All Packages

```bash
pnpm run build
```

### Type Checking

```bash
pnpm run typecheck
```

### Linting and Formatting

```bash
# Check formatting
pnpm run format:check

# Fix formatting
pnpm run format

# Run linter
pnpm run lint
```

### Full Quality Check

```bash
pnpm run doctor
```

This runs: typecheck, lint, format check, and tests.

## Project Structure

```
ai-commander/
├── packages/
│   ├── domain/              # Core types
│   ├── adapter/             # Game communication
│   ├── planner/             # Action sequencing
│   ├── decision/            # Action selection
│   ├── runtime/             # Execution engine
│   ├── fake-game-adapter/   # Test game
│   └── openra-adapter/      # Real-time strategy
│
├── apps/
│   └── reference/           # Reference implementation
│       ├── src/
│       │   ├── mission-agent.ts
│       │   ├── mission-cli.ts
│       │   ├── dashboard-server.ts
│       │   └── ...
│       └── tests/
│           └── *.test.ts
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── BENCHMARKING.md
│   └── ...
│
└── README.md
```

## Next Steps

### Learn the API

Read [API.md](./docs/API.md) to understand:
- GameAdapter interface
- MissionAgent class
- Execution traces
- Metrics collection

### Understand Architecture

Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) to learn:
- System design
- Component responsibilities
- Data flow
- Extension points

### Integrate Your Game

Follow [CONTRIBUTING.md](./docs/CONTRIBUTING.md) to:
- Create custom GameAdapter
- Implement game communication
- Define world state format
- Handle command execution

### Advanced Topics

- [Strategic Intelligence](./docs/API.md#strategic-intelligence) - Map analysis, formations, tactics
- [Learning Systems](./docs/API.md#learning-systems) - Hypotheses, beliefs, predictions
- [Decision Making](./docs/API.md#decision-making) - Goal evaluation, risk assessment
- [Performance Tuning](./docs/BENCHMARKING.md) - Optimization strategies

## Common Questions

### How do I integrate my game?

Create a `GameAdapter` implementation:

```typescript
import type { GameAdapter, GameSession } from '@ai-commander/adapter';

export class MyGameAdapter implements GameAdapter {
  async initialize(config: AdapterConfig): Promise<void> {
    // Connect to your game
  }

  async createSession(config: SessionConfig): Promise<GameSession> {
    // Create a game session
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }
}
```

See [API.md](./docs/API.md) for full interface.

### How do I debug agent behavior?

Use the dashboard:

```bash
pnpm run dashboard
```

Click events in the timeline to:
- Inspect world state at that moment
- See decision reasoning
- Review execution metrics

Or enable debug logging:

```typescript
import { Logger, LogLevel } from './cli-enhanced.js';

const logger = new Logger('MyAgent', LogLevel.DEBUG);
logger.debug('Detailed diagnostic info');
```

### How do I measure performance?

Run benchmarks:

```bash
pnpm run benchmark --runs 10
```

This measures:
- Tick latency (ms/tick)
- Memory growth (MB)
- Trace size (KB)
- Decision throughput (decisions/sec)

### Can I run multiple missions in parallel?

Yes! Missions are isolated:

```typescript
const agents = [
  new MissionAgent(5, 5),
  new MissionAgent(10, 10),
  new MissionAgent(15, 15),
];

await Promise.all(agents.map(a => a.run()));
```

Each mission runs independently without interference.

### What games are supported?

Out of the box:
- **FakeGameAdapter** - Simple test game
- **OpenRA** - Real-time strategy game

You can add support for other games by implementing the GameAdapter interface.

## Troubleshooting

### Tests Fail on First Run

**Solution**: Ensure Node.js 22+ is installed:
```bash
node --version
# Should be v22.0.0 or higher
```

### Dashboard Port Already in Use

**Solution**: Use a different port:
```bash
PORT=3000 pnpm run dashboard
```

### Memory Usage Too High

**Solution**: Check mission complexity. Large maps use more memory:
```bash
# Use smaller targets during development
pnpm run mission -- --target 5:5
```

### Tests Slow on Windows

**Solution**: This is normal for Windows. Run with more resources:
```bash
pnpm test -- --run
```

## Getting Help

- **Documentation**: Read [docs/](./docs/) folder
- **API Reference**: See [docs/API.md](./docs/API.md)
- **Examples**: Check [apps/reference/](./apps/reference/)
- **Issues**: File a bug report on GitHub
- **FAQ**: See [docs/FAQ.md](./docs/FAQ.md)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Code style guidelines
- Testing requirements
- Submission process
- Roadmap

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm run mission` | Run default mission |
| `pnpm run dashboard` | Start web dashboard |
| `pnpm run benchmark` | Run performance benchmarks |
| `pnpm test` | Run all tests |
| `pnpm run build` | Build all packages |
| `pnpm run lint` | Run linter |
| `pnpm run doctor` | Full quality check |

## What's Next?

1. ✅ Install AI Commander
2. ✅ Run your first mission
3. Read [API.md](./docs/API.md) to understand the framework
4. Create your first custom game adapter
5. Integrate with your game
6. Explore advanced features

Happy coding! 🚀
