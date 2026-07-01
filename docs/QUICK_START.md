# Quick Start Guide: AI Commander Reference Application

Get up and running with AI Commander in less than 10 minutes.

---

## 1. Install & Build (2 minutes)

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-commander

# Install dependencies
npm install

# Build all packages and the reference application
npm run build
```

You'll see TypeScript compilation for all packages completing successfully.

---

## 2. Run Your First Mission (1 minute)

The reference application is ready to use. Execute your first mission:

```bash
cd apps/reference
npm start
```

You'll see:

```
Initializing mission agent (target: 3, 2)...
  Initializing game adapter...
  ✓ Game adapter initialized
  Creating game session...
  ✓ Game session created
  Creating execution context...
  ✓ Execution context created
  Creating goal...
  ✓ Goal created
  Creating agent runtime...
  ✓ Agent runtime created
  Initializing agent runtime...
  ✓ Agent runtime initialized

Starting mission execution...

[Tick 1] Executing agent tick...
[Tick 2] Executing agent tick...
[Tick 3] Executing agent tick...
[Tick 4] Executing agent tick...
[Tick 5] Executing agent tick...

✓ Mission execution complete
✓ Mission completed successfully
```

**What happened:** The agent moved from origin (0, 0) to target (3, 2) using 5 movement commands (Manhattan distance: |3| + |2| = 5).

---

## 3. Understanding the Output (2 minutes)

The reference application outputs show three levels of information:

### Level 1: Execution Progress
```
[Tick 1] Executing agent tick...
[Tick 2] Executing agent tick...
```
Each tick is one agent decision cycle.

### Level 2: Final Metrics
```bash
npm start -- metrics
```

See performance data:
- How many ticks executed
- How many decisions made
- How many commands executed

### Level 3: Detailed Trace
```bash
npm start -- trace
```

See the complete event log of everything that happened during the mission.

---

## 4. Using the CLI (2 minutes)

The CLI provides different ways to inspect and understand mission execution.

### Run a mission
```bash
cd apps/reference
npm start -- run
```

### See the execution trace
```bash
npm start -- trace
```

### Check performance metrics
```bash
npm start -- metrics
```

### Validate execution consistency
```bash
npm start -- replay
```

### Inspect the final state
```bash
npm start -- inspect
```

### Get a complete report
```bash
npm start -- report
```

### Change the target
```bash
npm start -- run --target-x 5 --target-y 4
```

### Get help
```bash
npm start -- help
npm start -- help trace
```

---

## 5. Run the Tests (1 minute)

Verify everything is working:

```bash
npm test
```

You should see:
```
Test Files  34 passed (34)
Tests       541 passed (541)
```

All tests passing means the framework and reference application are working correctly.

---

## Next Steps

You're now running AI Commander. Here's where to go from here:

### Understand How It Works
Read **[Developer Guide](DEVELOPER_GUIDE.md)** to understand:
- Mission lifecycle
- How the planner works
- How the decision engine works
- What execution traces show you
- How to read metrics

### Modify and Extend
Follow **[How-To Guides](GUIDES.md)** to:
- Create a new mission type
- Replace the planner with your own
- Replace the decision engine
- Customize target coordinates
- Extend the reference application

### Architecture & Design
Deep dive into **[Architecture](ARCHITECTURE.md)** for:
- Runtime execution flow
- Observability pipeline design
- Component responsibilities
- Design decisions and rationale

---

## Common Scenarios

### Scenario 1: I want to move the agent to a different location
```bash
npm start -- run --target-x 10 --target-y 5
```

### Scenario 2: I want to see what decisions the agent made
```bash
npm start -- trace
```

### Scenario 3: I want to check if execution was correct
```bash
npm start -- replay
```

### Scenario 4: I want to understand performance
```bash
npm start -- metrics --json
```

### Scenario 5: I want to see everything
```bash
npm start -- report
```

---

## Troubleshooting

### Build fails
Make sure you have Node.js 18+ and npm 9+:
```bash
node --version
npm --version
```

### Tests fail
Rebuild everything:
```bash
npm run build
npm test
```

### CLI commands don't work
Make sure you're in the reference app directory:
```bash
cd apps/reference
npm start -- help
```

### Port already in use
The reference app doesn't use ports - this shouldn't happen. Make sure no other process is interfering.

---

## What's Next?

Now that you have the basics working:

1. **Read the Developer Guide** to understand the architecture
2. **Try the How-To Guides** to customize and extend
3. **Explore the code** in `apps/reference/src/`
4. **Run the tests** and look at test examples

The reference application is fully open - you can read the source code to see exactly how everything works.

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/reference/src/mission-agent.ts` | The autonomous agent |
| `apps/reference/src/movement-planner.ts` | Creates movement plans |
| `apps/reference/src/execution-trace.ts` | Records what happened |
| `apps/reference/src/runtime-metrics.ts` | Measures performance |
| `apps/reference/src/replay-engine.ts` | Validates execution |
| `apps/reference/src/runtime-inspector.ts` | Captures state snapshots |

---

## Time Check

How long did this take?

- Install & Build: ~2 minutes
- First Mission: ~1 minute
- Understanding Output: ~2 minutes
- Using the CLI: ~2 minutes
- Run Tests: ~1 minute

**Total: ~8 minutes**

You now understand AI Commander basics and can execute missions. Next, read the **Developer Guide** to go deeper.
