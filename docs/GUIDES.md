# How-To Guides

Step-by-step guides for common tasks.

---

## Guide 1: Run a Mission to a Custom Target

**Goal:** Move the agent to a different location.

### Steps

```bash
cd apps/reference

# Move to (5, 4)
npm start -- run --target-x 5 --target-y 4
```

The agent will:
1. Plan 9 movement steps (|5| + |4| = 9 Manhattan distance)
2. Execute one step per tick
3. Complete in 9 ticks
4. Print status messages

### What You'll See

```
[Tick 1] Executing agent tick...
[Tick 2] Executing agent tick...
...
[Tick 9] Executing agent tick...

✓ Mission execution complete
```

### Try Different Coordinates

```bash
# Target (1, 0) - 1 step
npm start -- run --target-x 1 --target-y 0

# Target (0, 10) - 10 steps
npm start -- run --target-x 0 --target-y 10

# Target (-3, -2) - 5 steps to negative coordinates
npm start -- run --target-x -3 --target-y -2

# Target (0, 0) - stay at origin
npm start -- run --target-x 0 --target-y 0
```

### Understanding the Execution

Each tick moves the agent one step closer to the target. The planner uses Manhattan distance (also called taxicab distance):

```
Distance = |targetX - currentX| + |targetY - currentY|
```

---

## Guide 2: Analyze a Mission with Metrics

**Goal:** Understand mission performance.

### Steps

```bash
cd apps/reference

# Run mission and see metrics
npm start -- metrics --target-x 3 --target-y 2
```

### What You'll See

```
RUNTIME METRICS
Mission: mission-3-2
Status: COMPLETED

TIMING
  Mission Duration: 45 ms
  Initialization:   12 ms
  Execution:        28 ms
  Shutdown:         5 ms

EXECUTION
  Total Ticks: 5
  Avg Tick Time: 5.60 ms

COMMANDS
  Executed:  5
  Successful: 5
  Success Rate: 100.0%
```

### Interpret the Results

- **Mission Duration** — How long the entire process took
- **Total Ticks** — How many decision cycles
- **Avg Tick Time** — Average time per tick (good for performance optimization)
- **Success Rate** — Percentage of commands that succeeded (should be 100%)

### Get JSON Output

```bash
npm start -- metrics --json
```

This gives you structured data you can parse and analyze:

```json
{
  "missionId": "mission-3-2",
  "status": "completed",
  "missionDurationMs": 45,
  "totalTicks": 5,
  "commandsExecuted": 5,
  ...
}
```

### Compare Different Targets

```bash
# Short mission
npm start -- metrics --target-x 1 --target-y 1 | grep "Total Ticks"

# Long mission
npm start -- metrics --target-x 10 --target-y 10 | grep "Total Ticks"
```

You should see that ticks approximately equal the Manhattan distance.

---

## Guide 3: Debug a Mission with Execution Traces

**Goal:** See every decision and action the agent made.

### Steps

```bash
cd apps/reference

# Run mission and print detailed trace
npm start -- trace --target-x 2 --target-y 1
```

### What You'll See

```
EXECUTION TRACE: mission-2-1
Target: (2, 1)
Status: completed
Events: 24

[000] T+    0 Tick  0
    Event: mission_started

[001] T+    1 Tick  0
    Event: mission_initialized

[002] T+    2 Tick  0
    Event: goal_created
    Goal: move-to-target

[003] T+    3 Tick  1
    Event: decision_engine_invoked

[004] T+    4 Tick  1
    Event: decision_selected
    Selected: move({"dx":1,"dy":0})

[005] T+    5 Tick  1
    Event: command_executed
    Command: move({"dx":1,"dy":0})
    Result: SUCCESS

[006] T+    6 Tick  1
    Event: world_state_updated
    Position: (1, 0)

... (more events) ...
```

### Understand the Timeline

Each event has:
- **Index** — Event sequence number
- **T+** — Time offset from start (milliseconds)
- **Tick** — Which agent tick
- **Event** — What happened
- **Details** — Extra information

### Find Specific Events

```bash
# See just the decisions made
npm start -- trace | grep "decision_selected"

# See commands and results
npm start -- trace | grep -A 1 "command_executed"

# Count total events
npm start -- trace | grep "Event:" | wc -l
```

### Get JSON Trace

```bash
npm start -- trace --json > mission_trace.json
```

Now you can analyze with tools like `jq`:

```bash
# How many events?
cat mission_trace.json | jq '.events | length'

# All decisions
cat mission_trace.json | jq '.events[] | select(.eventType == "decision_selected")'

# Extract commands
cat mission_trace.json | jq '.events[] | select(.eventType == "command_executed") | .command'
```

---

## Guide 4: Validate Execution with Replay

**Goal:** Verify that execution was recorded correctly.

### Steps

```bash
cd apps/reference

# Run mission and validate
npm start -- replay --target-x 3 --target-y 2
```

### What You'll See

```
REPLAY REPORT
Trace: mission-3-2
Target: (3, 2)
Status: COMPLETED
Valid: YES ✓

VALIDATIONS
  [✓] Trace Structure
      Trace structure is valid
  [✓] Required Lifecycle Events
      All required lifecycle events present
  [✓] Chronological Order
      Events are chronologically ordered
  [✓] Mission Completion
      Mission completed
  [✓] Event Data Consistency
      All event data is valid
  [✓] Tick Ordering
      5 ticks properly ordered
```

### What Gets Validated

- **Trace Structure** — All required fields present
- **Lifecycle Events** — Started, initialized, completed
- **Chronological Order** — No time anomalies
- **Mission Status** — Goal actually completed
- **Data Consistency** — All events have valid data
- **Tick Ordering** — Tick numbers increasing correctly

### When to Use Replay

- After running a mission in production
- To ensure logs are trustworthy
- Before analyzing with external tools
- To detect corrupted trace data

---

## Guide 5: Inspect Mission State

**Goal:** Get a quick overview of mission execution.

### Steps

```bash
cd apps/reference

# Capture and print state
npm start -- inspect --target-x 4 --target-y 3
```

### What You'll See

```
RUNTIME INSPECTOR
Mission: mission-4-3
Status: COMPLETED
Elapsed: 52 ms

AGENT POSITION
  Current: (4, 3)
  Target:  (4, 3)

EXECUTION
  Current Tick: 7
  Total Ticks: 7
  Remaining: 0

OBSERVABILITY
  Trace Events: 42
  Metrics: Available
```

### Read the Output

- **Mission Status** — Is the mission still running or complete?
- **Agent Position** — Where is the agent now? (estimated)
- **Target Position** — Where are we trying to go?
- **Current Tick** — What tick are we on?
- **Remaining Ticks** — How many more ticks until goal?
- **Trace Events** — How much data was recorded?
- **Metrics Available** — Can we get performance data?

### Get JSON State

```bash
npm start -- inspect --json
```

```json
{
  "missionId": "mission-4-3",
  "missionStatus": "completed",
  "elapsedTimeMs": 52,
  "agentPosition": {
    "x": 4,
    "y": 3
  },
  "targetPosition": {
    "x": 4,
    "y": 3
  },
  "execution": {
    "currentTick": 7,
    "totalTicks": 7,
    "ticksRemaining": 0
  },
  ...
}
```

### Check Progress During Execution

```bash
# Run and capture state
npm start -- inspect
```

You can see:
- How many ticks have executed
- How many ticks remain
- Current agent position estimate

---

## Guide 6: Generate a Comprehensive Report

**Goal:** Get all information about a mission in one place.

### Steps

```bash
cd apps/reference

# Generate full report
npm start -- report --target-x 2 --target-y 2
```

### What You'll See

A report with four sections:

1. **Runtime Snapshot** — Current execution state
2. **Runtime Metrics** — Performance data
3. **Execution Trace** — Complete event log
4. **Replay Report** — Validation results

### Save to File

```bash
# Save report
npm start -- report > mission_report.txt

# View it
cat mission_report.txt

# Search it
grep "TIMING" mission_report.txt
```

### Get JSON Report

```bash
# Generate JSON
npm start -- report --json > mission_report.json

# Parse with jq
cat mission_report.json | jq '.metrics.missionDurationMs'
cat mission_report.json | jq '.snapshot.agentPosition'
cat mission_report.json | jq '.trace.events | length'
```

### Share a Report

The text report is human-readable and can be shared as-is:

```bash
npm start -- report > mission_20260701_target_3_2.txt
```

Share the file with colleagues for discussion.

---

## Guide 7: Run Tests

**Goal:** Verify everything is working correctly.

### Run All Tests

```bash
npm test
```

You should see:
```
Test Files  34 passed (34)
Tests       541 passed (541)
```

All tests must pass for a healthy project.

### Run Reference App Tests Only

```bash
cd apps/reference
npm test
```

You should see:
```
Test Files  7 passed (7)
Tests       120+ passed
```

### Run Specific Test File

```bash
npm test -- reference-cli.test.ts
```

### Watch Mode

```bash
npm test -- --watch
```

Tests will re-run as you make changes.

### Test Coverage

```bash
npm test -- --coverage
```

See which lines are tested.

---

## Guide 8: Add Custom Target Coordinates to Code

**Goal:** Run a mission with custom target in your code.

### Current Code

```typescript
import { MissionAgent } from './mission-agent.js';

const agent = new MissionAgent(3, 2);  // Default target
await agent.initialize();
await agent.run();
await agent.shutdown();
```

### Modify for Custom Target

```typescript
import { MissionAgent } from './mission-agent.js';

const targetX = 5;
const targetY = 4;

const agent = new MissionAgent(targetX, targetY);
await agent.initialize();
await agent.run();
await agent.shutdown();

// View results
console.log(agent.formatMetrics());
```

### Make It Configurable

```typescript
import { MissionAgent } from './mission-agent.js';

function getTargetFromArgs(): [number, number] {
  const args = process.argv.slice(2);
  const x = parseInt(args[0] || '3', 10);
  const y = parseInt(args[1] || '2', 10);
  return [x, y];
}

async function main() {
  const [targetX, targetY] = getTargetFromArgs();
  const agent = new MissionAgent(targetX, targetY);
  
  await agent.initialize();
  await agent.run();
  await agent.shutdown();
  
  console.log(`Mission to (${targetX}, ${targetY})`);
  console.log(agent.formatMetrics());
}

main().catch(console.error);
```

---

## Guide 9: View All Available Commands

**Goal:** See the complete CLI reference.

### List All Commands

```bash
cd apps/reference
npm start -- help
```

### Get Help for Specific Command

```bash
npm start -- help run
npm start -- help trace
npm start -- help metrics
npm start -- help replay
npm start -- help inspect
npm start -- help report
```

### See All Available Options

From the help output:

```
OPTIONS:
  --target-x <N>    Target X coordinate (default: 3)
  --target-y <N>    Target Y coordinate (default: 2)
  --json            Output in JSON format
  --help            Print this help message
```

---

## Guide 10: Compare Two Missions

**Goal:** Run two missions and compare results.

### Run First Mission

```bash
npm start -- metrics --target-x 3 --target-y 2 > mission1.txt
```

### Run Second Mission

```bash
npm start -- metrics --target-x 10 --target-y 10 > mission2.txt
```

### Compare Output

```bash
diff mission1.txt mission2.txt
```

Or view side-by-side:

```bash
paste mission1.txt mission2.txt
```

### Compare with JSON

```bash
npm start -- metrics --target-x 3 --target-y 2 --json > m1.json
npm start -- metrics --target-x 10 --target-y 10 --json > m2.json

# Extract duration for comparison
jq '.missionDurationMs' m1.json m2.json

# Extract tick count
jq '.totalTicks' m1.json m2.json
```

---

## Next Steps

Now that you've explored these guides:

1. **Try Modifying the Code** — Change target coordinates in the source
2. **Create Your Own Guide** — Document a task you repeated
3. **Extend the Agent** — Add new functionality
4. **Read the Developer Guide** — Deep dive into architecture

---

## Troubleshooting

### Commands Don't Work
Make sure you're in the right directory:
```bash
cd apps/reference
npm start -- help
```

### JSON Output Errors
Make sure you're using valid JSON tools:
```bash
npm start -- metrics --json | jq .  # Pretty-print
```

### Trace Output is Too Long
Save to file and use tools:
```bash
npm start -- trace > trace.txt
grep "decision_selected" trace.txt
```

### Tests Fail
Rebuild and re-test:
```bash
npm run build
npm test
```
