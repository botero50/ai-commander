# OpenRA Integration Validation Plan

## Current Environment Status

### ✅ Available
- Docker CLI installed (v29.2.1)
- Python environment with openra-rl and openra-rl-util packages
- Full AI Commander framework (26 stories complete)
- OpenRA-RL integration code (4 phases complete, TypeScript compiled)
- Integration test harness (`real-openra-test.ts`)

### ❌ Blocked
- Docker daemon not running (required to start OpenRA-RL container)
- Real OpenRA instance not available
- Cannot validate against live game without service running

## Validation Strategy

Since Docker daemon is not currently running, we cannot execute the full validation against a real game instance in this session. However, we can:

1. **Code-level validation** - Verify integration code is correct
2. **Type validation** - Ensure all interfaces are properly defined
3. **Mock validation** - Test with mocked OpenRA-RL responses
4. **Documentation** - Create runbook for manual validation

## Validation Checklist

### Code Quality ✅

- [x] All TypeScript compiles successfully
- [x] Zero type errors
- [x] All interfaces aligned with framework
- [x] Proper error handling
- [x] Retry logic implemented

### Integration Components

- [x] Phase 1: Real StateReader - Complete
- [x] Phase 2: Real CommandExecutor - Complete
- [x] Phase 3: Connection Bridge - Complete
- [x] Phase 4: Integration Test - Complete

### Pre-Execution Requirements

To validate, you need to:

1. **Start Docker daemon**
   - Windows: Docker Desktop must be running
   - Check: `docker ps` should work

2. **Pull/Start OpenRA-RL**
   ```bash
   docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
   ```
   - Or use pre-built image if available

3. **Start real OpenRA instance**
   - OpenRA game must be running
   - Initialized as server/spectator mode
   - Connected to OpenRA-RL

## Validation Steps (Manual Execution Required)

### Step 1: Start Services
```bash
# Terminal 1: Start Docker and OpenRA-RL
docker run -p 8000:8000 -p 9999:9999 openra-rl:latest

# Terminal 2: Verify service is up
curl http://localhost:8000/status
# Expected: {"status": "ready", "timestamp": <number>}
```

**Pass Criteria**: HTTP 200, status field exists
**Evidence Needed**: curl output showing JSON response

---

### Step 2: Test Health Endpoint
```bash
# Verify OpenRA-RL is responding
curl -v http://localhost:8000/status
```

**Pass Criteria**: 
- HTTP 200 OK
- Content-Type: application/json
- `status` field is "ready" or "connecting"

**Evidence Needed**: Full curl response headers and body

---

### Step 3: Test Observation Endpoint
```bash
# Get live game state
curl http://localhost:8000/observation | jq .
```

**Pass Criteria**:
- HTTP 200
- Response contains `state.world.tick`
- Contains `actors` array
- Contains `players` array
- Contains `map` object

**Evidence Needed**: JSON response showing game state structure

---

### Step 4: Run Integration Test

```bash
# Run from project root
pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
```

**Pass Criteria**:
- ✓ Connected to OpenRA-RL Service
- ✓ Observation successful
- ✓ Unit found for testing
- ✓ Command executed
- ✓ State changed
- ✓ Integration Test Complete

**Evidence Needed**: Full console output from test

---

### Step 5: Test State Reader

```typescript
// In a Node REPL or test file
import { createOpenRAStateReaderRL } from './packages/openra-adapter/src/index.js';

const reader = await createOpenRAStateReaderRL('http://localhost:8000', true);
const state = await reader.getGameState();

console.log({
  tick: state.tick,
  unitCount: state.units.length,
  buildingCount: state.buildings.length,
  playerCount: state.players.length
});
```

**Pass Criteria**:
- Reader initializes successfully
- getGameState() returns valid OpenRAGameState
- tick > 0
- unitCount > 0
- buildingCount > 0
- playerCount > 0

**Evidence Needed**: Console output with state metrics

---

### Step 6: Test Command Executor

```typescript
import { createOpenRACommandExecutorRL } from './packages/openra-adapter/src/index.js';

const executor = createOpenRACommandExecutorRL('http://localhost:8000', true);
const gameState = await reader.getGameState();
const unit = gameState.units[0];

const result = await executor.executeCommand(
  { id: "test", action: "move", target: { x: 100, y: 100 }, expectedDuration: 5, expectedCost: 0, description: "Test move" },
  unit.id,
  gameState,
  unit.owner
);

console.log(result);
```

**Pass Criteria**:
- Command executes without error
- result.valid === true OR result.valid === false with clear reason
- executedCommand is defined (if valid)
- expectedEffect is defined

**Evidence Needed**: Console output showing CommandValidationResult

---

### Step 7: Test Bridge Connection

```typescript
import { createOpenRARLBridge } from './packages/openra-adapter/src/index.js';

const bridge = await createOpenRARLBridge({ 
  baseUrl: 'http://localhost:8000',
  verbose: true 
});

const state = bridge.getState();
console.log({
  isConnected: state.isConnected,
  isHealthy: state.isHealthy,
  connectionErrors: state.connectionErrors
});

await bridge.disconnect();
```

**Pass Criteria**:
- Bridge connects successfully
- isConnected === true
- isHealthy === true
- connectionErrors === 0

**Evidence Needed**: Console output showing bridge state

---

### Step 8: Test with Builtin Brain

```bash
# Create a test script that runs a match with Builtin brain
pnpm --filter openra-adapter exec ts-node \
  -e "
  import { DemoOrchestrator } from './src/demo-orchestrator.js';
  
  await DemoOrchestrator.run({
    brainA: 'builtin',
    brainB: 'builtin',
    games: 1,
    format: 'single'
  });
  "
```

**Pass Criteria**:
- Tournament executes without errors
- Match completes
- Results are generated
- Report shows winner and stats

**Evidence Needed**: Tournament output with winner, stats, and validation results

---

### Step 9: Test with Claude Brain

```bash
# Set API key and run
export ANTHROPIC_API_KEY="sk-ant-..."

pnpm --filter openra-adapter exec ts-node \
  -e "
  import { SingleMatchRunner } from './src/single-match-runner.js';
  
  const result = await SingleMatchRunner.runMatch({
    provider1: { provider: 'claude', claude: { apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-3-opus-20240229' } },
    provider2: { provider: 'builtin' },
    maxTicks: 100
  });
  
  console.log(result);
  "
```

**Pass Criteria**:
- Match executes successfully
- Claude brain makes decisions
- Commands are executed
- Match completes with winner
- Stats are recorded

**Evidence Needed**: Match result with provider names, winner, and stats

---

### Step 10: Test with GPT Brain

```bash
# Set API key and run
export OPENAI_API_KEY="sk-..."

pnpm --filter openra-adapter exec ts-node \
  -e "
  import { SingleMatchRunner } from './src/single-match-runner.js';
  
  const result = await SingleMatchRunner.runMatch({
    provider1: { provider: 'openai', openai: { apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4' } },
    provider2: { provider: 'builtin' },
    maxTicks: 100
  });
  
  console.log(result);
  "
```

**Pass Criteria**:
- Match executes successfully
- GPT brain makes decisions
- Commands are executed
- Match completes with winner
- Stats are recorded
- Cost tracking works

**Evidence Needed**: Match result with provider name, winner, stats, and cost

---

### Step 11: Test Tournament Execution

```bash
# Run multi-match tournament
pnpm --filter openra-adapter exec ts-node \
  -e "
  import { MultiMatchRunner } from './src/multi-match-runner.js';
  
  const result = await MultiMatchRunner.runMatches({
    provider1: { provider: 'builtin' },
    provider2: { provider: 'builtin' },
    matches: 3,
    swapAfterMatch: true
  });
  
  console.log(JSON.stringify(result.stats, null, 2));
  "
```

**Pass Criteria**:
- Tournament completes all matches
- Statistics are aggregated
- Win rates are calculated
- Variance is computed
- All matches validated

**Evidence Needed**: Tournament stats output

---

### Step 12: Test Report Generation

```bash
# Generate tournament reports
pnpm --filter openra-adapter exec ts-node \
  -e "
  import { BenchmarkReporter } from './src/benchmark-reporter.js';
  
  // Create mock result from tournament
  const report = BenchmarkReporter.reportMultiMatch(mockResult, 'Provider1', 'Provider2');
  
  const json = BenchmarkReporter.exportJSON(report);
  const csv = BenchmarkReporter.exportCSV(report);
  
  console.log('JSON:', JSON.stringify(JSON.parse(json), null, 2));
  console.log('CSV:', csv);
  "
```

**Pass Criteria**:
- Report generates without errors
- JSON is valid and complete
- CSV is properly formatted
- All fields populated
- Export works for all formats

**Evidence Needed**: Report output in JSON and CSV format

---

### Step 13: Test Replay Recording

```bash
# Verify replay system works
pnpm --filter openra-adapter exec ts-node \
  -e "
  import { ReplayEngine } from './src/replay-engine.js';
  
  // Create mock match and replay
  const replay = ReplayEngine.recordReplay('test-match', 'claude', 'gpt4', mockStates, mockEvents);
  
  console.log({
    matchId: replay.matchId,
    provider1: replay.provider1,
    provider2: replay.provider2,
    totalTicks: replay.totalTicks,
    eventCount: replay.events.length
  });
  
  // Test export
  const json = ReplayEngine.exportJSON(replay);
  console.log('Replay exported:', JSON.parse(json).matchId);
  "
```

**Pass Criteria**:
- Replay records successfully
- All state snapshots stored
- All events logged
- Export works
- JSON is valid

**Evidence Needed**: Replay data structure output

---

### Step 14: Test Dashboard Generation

```bash
# Generate dashboard HTML
pnpm --filter openra-adapter exec ts-node \
  -e "
  import { DashboardConfig } from './src/dashboard-config.js';
  
  // Create mock tournament result
  const html = DashboardConfig.generateHTML(mockDashboard);
  
  console.log('Dashboard HTML length:', html.length);
  console.log('Contains standings table:', html.includes('<table>'));
  console.log('Contains ratings:', html.includes('ELO'));
  console.log('Contains cost info:', html.includes('Cost'));
  
  // Save to file for visual inspection
  require('fs').writeFileSync('/tmp/dashboard.html', html);
  console.log('Dashboard saved to /tmp/dashboard.html');
  "
```

**Pass Criteria**:
- Dashboard generates valid HTML
- Contains standings table
- Contains ratings leaderboard
- Contains cost analysis
- Can be opened in browser

**Evidence Needed**: Dashboard HTML file and screenshots of browser view

---

## Summary of Required Evidence

For each validation step, collect:
1. **Pass/Fail** verdict
2. **Console output** (full text)
3. **Screenshots** (for UI components like dashboard)
4. **Error messages** (if applicable)
5. **Metrics** (tick count, unit count, etc.)

## Timeline Estimate

Total validation time (with all services running):
- ~2 hours for full validation sequence
- ~30 min for core integration (steps 1-7)
- ~90 min for tournament execution and reporting (steps 8-14)

## Blocker Resolution

**Current blocker**: Docker daemon not running

To resolve:
1. Start Docker Desktop (Windows)
2. Verify with `docker ps`
3. Pull/start OpenRA-RL container
4. Begin validation sequence

Once services are running, validation is straightforward and autonomous.

---

## Next Action

**Required**: Start Docker daemon and run validation sequence

**Owner**: Human (requires local environment access)

**Estimated duration**: 2-3 hours for full validation with manual evidence collection
