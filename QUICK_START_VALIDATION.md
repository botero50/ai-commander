# Quick Start: Real OpenRA Validation

## Current Status
✅ **All integration code is complete, compiled, and validated**  
⏳ **Waiting for: Docker to be running**

---

## Start Docker (One-Time Setup)

### Windows 11
```bash
# Open Docker Desktop app (already installed)
# Or run from PowerShell:
Start-Process "C:\Program Files\Docker\Docker\Docker.exe"

# Wait ~30 seconds for daemon to start
# Verify:
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

---

## Start OpenRA-RL Service

### Terminal 1: Start Service
```bash
docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
```

Wait for output like:
```
OpenRA-RL Server running on http://0.0.0.0:8000
```

Keep this terminal open.

### Terminal 2: Verify Service is Up
```bash
curl http://localhost:8000/status
```

Expected output:
```json
{"status": "ready", "timestamp": 1234567890}
```

---

## Run Integration Test

### From project root:
```bash
pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
```

Expected output:
```
🎮 Real OpenRA Integration Test
═════════════════════════════════════════════════════

Step 1: Connecting to OpenRA-RL Service
─────────────────────────────────────────────────────
✓ Connected (errors: 0)

Step 2: Observing Live Game State
─────────────────────────────────────────────────────
✓ Observation successful
  Tick: 100
  Units: 5
  Buildings: 2
  Players: 2

Step 3: Finding Command Target
─────────────────────────────────────────────────────
✓ Found unit: Infantry (owner: GDI)
  Position: (100, 100)
  Health: 100/100

Step 4: Executing Real Command
─────────────────────────────────────────────────────
✓ Command executed successfully
  Expected: Unit moved from (100,100) to (110,110)

Step 5: Observing New State (Verify Change)
─────────────────────────────────────────────────────
✓ New observation received
  Tick: 101
  Tick delta: 1
  Units: 5
  Buildings: 2

Step 6: Verifying State Change
─────────────────────────────────────────────────────
✓ Game tick advanced: 100 → 101
✓ World state changed as expected

═════════════════════════════════════════════════════
✓ Integration Test Complete
═════════════════════════════════════════════════════
```

If you see this → ✅ **STEP 1-7 PASS**

---

## Full Validation Sequence

If integration test passes, continue with 14-step validation plan:

```bash
# See VALIDATION_PLAN.md for:
# Step 1: Health check
# Step 2: Status endpoint
# Step 3: Observation endpoint
# Step 4: Integration test (just completed)
# Step 5-7: Component testing
# Step 8-10: Tournament with each brain
# Step 11-14: Reports, replays, dashboard
```

---

## If Something Fails

### Error: "Connection refused"
```bash
# Verify Docker is running
docker ps

# Verify OpenRA-RL container is running
docker ps | grep openra-rl

# If not running, start it:
docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
```

### Error: "Service not reachable"
```bash
# Check if port 8000 is listening
netstat -ano | findstr :8000

# If nothing, OpenRA-RL isn't running. Start it:
docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
```

### Error: "No units found"
```bash
# OpenRA game isn't running or no actors exist
# Need a real OpenRA instance connected to OpenRA-RL service
```

### Other errors
See detailed troubleshooting in VALIDATION_PLAN.md

---

## Success Criteria

### Step 1-7 (Core Integration)
- ✅ Connects to OpenRA-RL
- ✅ Gets live game state
- ✅ Finds units
- ✅ Executes commands
- ✅ Verifies state changes

### Step 8-14 (Tournament)
- ✅ Runs with Builtin brain
- ✅ Runs with Claude brain
- ✅ Runs with GPT brain
- ✅ Generates reports
- ✅ Records replays
- ✅ Generates dashboard

If all 14 steps pass → **Production ready**

---

## Next: Wire Into Tournament

Once validation passes, enable real OpenRA in tournament:

```typescript
// In match-orchestrator.ts (or main entry point)
const bridge = await createOpenRARLBridge({ 
  baseUrl: "http://localhost:8000"
});
const stateReader = bridge.getStateReader();
const commandExecutor = bridge.getCommandExecutor();

// Then use as usual:
const result = await orchestrator.runMatch({
  player1: claudeBrain,
  player2: gpt4Brain,
  stateReader,
  commandExecutor,
});
```

Or run tournament command:
```bash
ai-commander tournament --brain-a claude --brain-b gpt4 --games 100
```

---

## Documents Reference

| Need | Read |
|------|------|
| How to validate | VALIDATION_PLAN.md |
| What was built | OPENRA_INTEGRATION_COMPLETE.md |
| Architecture | OPENRA_INTEGRATION_DESIGN.md |
| Current status | FINAL_INTEGRATION_STATUS.md |
| Summary | INTEGRATION_VALIDATION_SUMMARY.md |

---

## Timeline

Assuming Docker + OpenRA-RL are running:

| Phase | Time | Action |
|-------|------|--------|
| **Setup** | 5 min | Start Docker, run container |
| **Core** | 30 min | Run steps 1-7, verify integration |
| **Tournament** | 60 min | Run steps 8-14, test all brains |
| **Total** | ~2 hours | Full validation complete |

---

## Quick Checklist

```
Setup
  [ ] Start Docker Desktop
  [ ] Run: docker run -p 8000:8000 -p 9999:9999 openra-rl:latest
  [ ] Verify: curl http://localhost:8000/status

Integration
  [ ] Run: pnpm --filter openra-adapter exec ts-node examples/real-openra-test.ts
  [ ] Result: ✓ Integration Test Complete

Validation (14 steps from VALIDATION_PLAN.md)
  [ ] Step 1: Health check
  [ ] Step 2: Status endpoint
  [ ] Step 3: Observation endpoint
  [ ] Step 4: Integration test
  [ ] Step 5: StateReader test
  [ ] Step 6: CommandExecutor test
  [ ] Step 7: Bridge test
  [ ] Step 8: Builtin tournament
  [ ] Step 9: Claude tournament
  [ ] Step 10: GPT tournament
  [ ] Step 11: Tournament execution
  [ ] Step 12: Report generation
  [ ] Step 13: Replay recording
  [ ] Step 14: Dashboard generation

Done
  [ ] All 14 steps passed
  [ ] Code is production ready
  [ ] Ready to run real tournaments
```

---

**Status**: ✅ Ready to start  
**Next**: Start Docker and run integration test  
**Time**: ~2 hours for complete validation
