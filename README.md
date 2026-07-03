# AI Commander

**v1.0.0 — Production-Ready Framework for Strategy Game AI**

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js: >=22.0.0](https://img.shields.io/badge/node.js-%3E%3D22.0.0-brightgreen)
![TypeScript: 5.5+](https://img.shields.io/badge/typescript-5.5%2B-blue)
![Tests: 919+](https://img.shields.io/badge/tests-919%2B-brightgreen)
![Status: Stable](https://img.shields.io/badge/status-stable-brightgreen)

---

## Experience AI Commander in 5 Minutes

Start here. Clone, install, and see autonomous AI in action:

```bash
git clone https://github.com/anthropics/ai-commander
cd ai-commander
pnpm install
pnpm demo
```

This launches a browser dashboard showing a real-time AI agent controlling a simulated world. Watch the agent:
- **Perceive** the world state
- **Plan** a sequence of actions
- **Decide** the next command to execute
- **Execute** commands in the game

The dashboard displays:
- **Live execution** with tick-by-tick progress
- **Timeline** of all events and decisions
- **Inspection** — click any event to see what the AI knew at that moment
- **Comparison** — compare any two ticks to understand state changes

---

## What is AI Commander?

AI Commander is a **framework for building autonomous AI agents that play strategy games**. It provides production-ready infrastructure for:

- **Observation:** Reading game state and converting to unified world model
- **Planning:** Transforming goals into ordered action sequences
- **Decision-Making:** Selecting next action to execute
- **Command Execution:** Translating AI decisions into game commands
- **Determinism:** Ensuring identical behavior across runs for testing and replay

The framework is **game-agnostic** and **AI-agnostic**: you integrate any game (via GameAdapter) and any planning/decision algorithm (via Planner and DecisionEngine contracts).

### Key Characteristics

✅ **Production-Proven:** Validated across 120+ mission executions with 0 failures  
✅ **Deterministic:** Identical inputs produce identical outputs for reproducible testing  
✅ **Composable:** Build agents by assembling simple components  
✅ **Well-Tested:** 919+ tests, 100% passing rate  
✅ **TypeScript:** Type-safe with strict mode enabled  
✅ **Observable:** Complete execution traces and metrics  
✅ **Debuggable:** Browser-based dashboard for step-through debugging  
✅ **Zero Heavy Dependencies:** Minimal external libraries

---

## Features

### Browser Runtime Dashboard

A real-time debugger showing:
- Mission execution progress (tick counter, elapsed time)
- Runtime state (status, current tick, execution mode)
- Mission info (goal, plan status, decisions, commands)
- World state (agents, resources, observations)
- **Live timeline** of all execution events
- **Tick inspection** — click events to examine AI reasoning
- **Tick comparison** — see what changed between any two moments
- **Step controls** — pause, resume, step through execution

### Complete Observability

Every mission produces:
- **Execution Trace** — 19 event types recording every decision and action
- **Runtime Metrics** — 26 measurements of performance and behavior
- **Replay Report** — validation of execution consistency
- **JSON Export** — for analysis and integration

### Deterministic Execution

- Same agent + same world = same execution every time
- Perfect for testing, benchmarking, and reproducible AI development
- No randomness, no hidden state, no surprises

---

## Installation

### Prerequisites

- **Node.js 22+** — Download from [nodejs.org](https://nodejs.org/)
- **pnpm** — Package manager (install with `npm install -g pnpm`)

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/anthropics/ai-commander
cd ai-commander

# Install dependencies
pnpm install

# Run the demo
pnpm demo
```

The demo will:
1. Verify your Node.js version
2. Start a browser dashboard on http://localhost:3000
3. Open your browser automatically
4. Run an autonomous AI mission
5. Let you inspect and analyze the execution

---

## Use Cases

### 1. Learning AI Programming

Understand how autonomous agents work:
```bash
pnpm demo  # See a complete agent in action
```

Then explore:
- `apps/reference/src/mission-agent.ts` — Agent orchestration
- `apps/reference/src/movement-planner.ts` — Planning implementation
- `packages/behavior-tree/` — Decision structure

### 2. Building Custom Agents

Create your own planner or decision engine:
```typescript
import { Planner, PlanningResult, PlanningRequest } from '@ai-commander/planner';

class MyPlanner implements Planner {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    // Your planning algorithm here
  }
}

// Use it in any agent
const runtime = createAgentRuntime({
  planner: new MyPlanner(),
  // ... other config
});
```

### 3. Game Integration

Connect to your game via GameAdapter:
```typescript
import { GameAdapter, GameSession } from '@ai-commander/adapter';

class MyGameAdapter implements GameAdapter {
  async initialize() { /* ... */ }
  async createSession() { /* returns GameSession */ }
  async shutdown() { /* ... */ }
  
  getCapabilities() {
    return {
      deterministic: true,
      supportsReplay: true,
      pauseResume: true,
    };
  }
}

// Use with framework
const adapter = new MyGameAdapter();
const session = await adapter.createSession();
const agent = createAgentRuntime({
  gameSession: session,
  // ... other config
});
```

### 4. AI Experimentation

Compare different algorithms:
```bash
# Run benchmarks
cd apps/reference
pnpm benchmark

# Compare planner implementations
# Compare decision engine implementations
# Measure performance improvements
```

---

## Project Structure

```
ai-commander/
├── apps/
│   └── reference/          # Reference application (demo, CLI, tests)
│       ├── src/
│       │   ├── dashboard-cli.ts         # Demo entry point
│       │   ├── mission-agent.ts         # Agent orchestration
│       │   ├── movement-planner.ts      # Example planner
│       │   └── dashboard-server.ts      # Browser dashboard
│       └── tests/
├── packages/               # Framework packages
│   ├── core/              # Infrastructure (event bus, scheduler, etc.)
│   ├── domain/            # Game domain models
│   ├── engine/            # Tick-based execution engine
│   ├── adapter/           # Game integration contracts
│   ├── fake-game-adapter/ # Test implementation
│   ├── planner/           # Planning layer contracts
│   ├── decision/          # Decision layer contracts
│   ├── agent-runtime/     # Agent execution loop
│   ├── behavior-tree/     # Decision structure framework
│   └── openra-adapter/    # Real game integration (OpenRA)
└── .foundation/
    ├── docs/ARCHITECTURE.md  # Frozen architecture specification
    ├── adr/                  # Architecture Decision Records
    └── state/                # Project state documents
```

---

## Documentation

- **[ARCHITECTURE.md](.foundation/docs/ARCHITECTURE.md)** — Frozen architecture specification
- **[Developer Guide](/docs/DEVELOPER_GUIDE.md)** — Building with AI Commander
- **[Quick Start](/docs/QUICK_START.md)** — 10-minute onboarding
- **[API Reference](packages/*/README.md)** — Package documentation

---

## Commands

### Demo and Development

```bash
# Run the demo (recommended starting point)
pnpm demo

# Run all tests
pnpm test

# Watch mode (re-run tests on changes)
pnpm test:watch

# Build everything
pnpm build

# Type check
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format

# Run all checks (CI equivalent)
pnpm doctor
```

### Reference App

```bash
cd apps/reference

# Run a mission
pnpm mission run

# See mission trace
pnpm mission trace

# View metrics
pnpm mission metrics

# Validate mission consistency
pnpm mission replay

# Get everything in one report
pnpm mission report

# Run CLI
pnpm reference run --help
```

---

## Architecture Overview

### Layered Design

```
Browser Dashboard (Visualization)
         ↓
   Agent Runtime (Orchestration)
    ↙    ↓    ↘
Planner  Adapter  Decision Engine
    ↘    ↓    ↙
      Engine (Ticks)
         ↓
      Domain (Types)
```

### No Coupling Between Layers

Each layer depends only on contracts from lower layers:

- **Adapter:** How to interact with the game
- **Planner:** Transform goals into action sequences
- **Decision Engine:** Pick next action from a plan
- **Runtime:** Orchestrate the loop (observe → plan → decide → execute)
- **Dashboard:** Visualize execution in real-time

Swap any component (planner, decision engine, game adapter) without changing others.

---

## Getting Help

### Common Issues

**"Node.js 22+ required"**  
→ Install from [nodejs.org](https://nodejs.org/). Check version: `node --version`

**"Cannot find module..."**  
→ Run `pnpm install` to install dependencies

**"Browser didn't open"**  
→ Visit http://localhost:3000 manually

**"Mission failed"**  
→ Check console for error message. Review logs with `pnpm mission trace`

### Learn More

- Study the [reference application](apps/reference/src/)
- Read [ARCHITECTURE.md](.foundation/docs/ARCHITECTURE.md)
- Review [test examples](apps/reference/tests/)
- Join our community (GitHub issues/discussions)

---

## Contributing

AI Commander follows strict engineering standards:

1. **Architecture is Frozen** — Changes require Architecture Decision Record (ADR)
2. **Framework is Complete** — Focus on applications and integrations
3. **Tests Required** — All code must be tested (919+ tests)
4. **TypeScript Strict Mode** — Type safety is mandatory
5. **No Technical Debt** — All code must be production-ready

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License — See [LICENSE](LICENSE) for details

---

## Citation

If you use AI Commander in research or publications:

```bibtex
@software{aicommander2026,
  title={AI Commander: Framework for Autonomous Game AI},
  author={Anthropic},
  year={2026},
  url={https://github.com/anthropics/ai-commander}
}
```

---

## What's Next?

- ✅ Clone the repository
- ✅ Run `pnpm install`
- ✅ Run `pnpm demo`
- 🎯 Experience AI Commander in action
- 📚 Read the [Developer Guide](/docs/DEVELOPER_GUIDE.md)
- 🔧 Build your own agents and adapters

**Start now:**

```bash
git clone https://github.com/anthropics/ai-commander
cd ai-commander
pnpm install
pnpm demo
```
