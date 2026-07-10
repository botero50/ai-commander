# Story R2.6.1: Verify RL Interface Runtime

**Goal**: Prove the RL Interface server starts, responds, and game initializes correctly

**Measured Evidence Required**: Not assumptions, not code analysis. Real runtime observation.

---

## Procedure

### Step 1: Start 0 A.D. with RL Interface

Open a terminal and run:

```bash
pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
```

**Collect**:
- Start time (note HH:MM:SS)
- Console output during startup
- Screenshot of game window when it appears

**Evidence markers**:
- [ ] Window appears (screenshot)
- [ ] Main menu visible (screenshot)
- [ ] No error dialogs
- [ ] Game process running (taskbar)

---

### Step 2: Verify HTTP Server is Responding

In a **new terminal**, test connectivity:

```bash
curl -v http://127.0.0.1:6000/templates 2>&1 | tee rl-interface-test.log
```

**Expected response** (HTTP 200 OK):
```
< HTTP/1.1 200 OK
< Content-Type: application/json
...
```

**Collect**:
- Full curl output (save to file)
- HTTP status code
- Response time

**Evidence markers**:
- [ ] HTTP 200 status received
- [ ] Response not empty
- [ ] No connection refused errors
- [ ] Response time < 1 second

---

### Step 3: Initialize a Match

Still in the same terminal, run:

```bash
node test-r2-5-complete-ai-loop.js 2>&1 | head -50 | tee game-init-test.log
```

**Collect**:
- First 50 lines of output
- Look for initialization messages
- Tick 0 confirmation

**Evidence markers**:
- [ ] "RL Interface reachable" message
- [ ] "Game initialized at tick 0" message
- [ ] No HTTP errors
- [ ] No timeout errors

---

### Step 4: Game State Snapshot

In the 0 A.D. window, take a screenshot showing:
- Game window open
- Map visible
- Units/structures visible (any initial state)
- No error dialogs

**Collect**:
- Screenshot showing game window with content

**Evidence markers**:
- [ ] Game visibly running
- [ ] Map loaded
- [ ] Units present

---

## Collected Evidence Checklist

Document all of the following:

- [ ] **Startup time**: ____________ seconds
- [ ] **RL Interface response time**: ____________ ms
- [ ] **HTTP status**: 200 OK / 500 Error / Connection Refused
- [ ] **Game window appears**: YES / NO
- [ ] **Match initializes**: YES / NO
- [ ] **Initial tick number**: ____________
- [ ] **Console errors**: NONE / [describe]

---

## Files to Collect

Save these files to `R2-6-1-evidence/` directory:

1. `startup-log.txt` — console output from pyrogenesis startup
2. `http-test.log` — curl output showing server response
3. `game-init.log` — AI Commander initialization test
4. `startup-screenshot.png` — game window when it appears
5. `game-state-screenshot.png` — running game with units visible

---

## Success Criteria

**ALL of the following must be YES**:

1. ✓ 0 A.D. window launches without errors
2. ✓ RL Interface server responds to HTTP requests (status 200)
3. ✓ Game initializes (first tick received)
4. ✓ Startup completes in < 30 seconds
5. ✓ No error messages in logs
6. ✓ Game visibly running with units present

---

## If Anything Fails

**Problem**: "Connection refused"
- Check: Is 0 A.D. window open?
- Check: Is it the right executable (pyrogenesis.exe)?
- Check: Did you wait 10+ seconds after launch?
- Fix: Restart 0 A.D., wait 20 seconds, retry curl

**Problem**: "HTTP 500" or "Service Unavailable"
- Check: Did the game window load?
- Check: Are there error dialogs in the window?
- Fix: Close 0 A.D., restart with exact command shown above

**Problem**: "No matching template" or similar
- This is OK for /templates endpoint
- Move to Step 3 (game initialization) to verify full pipeline

---

## Write-Up

After collecting all evidence, document:

```markdown
# R2.6.1 Runtime Evidence

## RL Interface Startup

**Executed**: 
pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public

**Startup Time**: X seconds

**Game Window**: ✓ Appeared at [HH:MM:SS]

## HTTP Server Verification

**Endpoint**: GET http://127.0.0.1:6000/templates

**Result**: HTTP 200 OK
**Response Time**: X ms

## Game Initialization

**Command**: node test-r2-5-complete-ai-loop.js

**Initialization Message**: ✓ "RL Interface reachable"
**Game Started**: ✓ "Game initialized at tick 0"

## Observations

- [List any issues or anomalies observed]
- [List any surprises]
- [Note any latency spikes]

## Conclusion

The RL Interface server is:
- ✓ Starting correctly
- ✓ Responding to HTTP requests
- ✓ Initializing games without errors
- ✓ Ready for observation and command testing

**VERDICT**: R2.6.1 PASSED ✓

Ready for R2.6.2 (observation pipeline verification)
```

---

## Next Steps

Once R2.6.1 passes with all evidence collected:

→ Proceed to **Story R2.6.2: Verify Observation Pipeline**
