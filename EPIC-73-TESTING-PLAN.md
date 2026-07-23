# EPIC 73: Continuous Arena Mode - Testing Plan

**Status:** Features implemented, ready for validation testing

**Scope:** Verify 24/7 continuous operation with auto-restart, health monitoring, and graceful recovery

---

## 📋 Pre-Test Checklist

### Environment Setup
- [ ] Ollama running and stable
- [ ] 2+ models available (ollama list)
- [ ] Node.js v22+ installed
- [ ] ~5GB free disk space
- [ ] 4GB+ free RAM
- [ ] Ports 5173, 9000, 11434 available
- [ ] Network stable (WiFi or wired)
- [ ] System time synced (NTP)

### Pre-Test Verification
```bash
# Verify integration
node verify-epic72-integration.js
# Should show: 7/7 checks passed ✅

# Build TypeScript
npm run build
# Should complete without errors

# Check configuration
cat .env | grep -E "BRAIN|MATCH_RESTART|HEALTH"
# Should show proper values
```

---

## 🎯 Test Objectives

**EPIC 73 Tests validate:**
1. **Auto Restart** - Games automatically start after configured delay
2. **Health Monitoring** - Ollama health checked regularly and displayed
3. **Graceful Recovery** - System recovers from disconnects/errors
4. **Statistics** - Game history tracked accurately
5. **24/7 Operation** - Continuous play without manual intervention
6. **Memory Stability** - No memory leaks over extended periods
7. **Spectator Experience** - Browser connection stays stable

---

## 🧪 Test Suite 1: Basic Continuous Operation (1 hour)

### Setup
```bash
# Terminal 0: Ollama
ollama serve

# Terminal 1: Arena
pnpm chess

# Terminal 2: Web Dev
cd apps/web && npm run dev

# Terminal 3: Monitoring
watch -n 5 'cat arena-statistics.json | jq'

# Terminal 4: System Monitor
# macOS: top -o MEM
# Linux: htop
# Windows: Task Manager
```

### Test Cases

**TC 73.1.1: Game Completion & Auto-Restart**
- [ ] Run `pnpm chess`
- [ ] Wait for first game to complete
- [ ] Verify "⏳ Next match in 5s" appears in Terminal 1
- [ ] Verify countdown appears in browser
- [ ] Verify new game starts after countdown
- [ ] Check move count resets to 0
- [ ] Check player names may change (randomized)

**TC 73.1.2: Continuous Game Sequence**
- [ ] Start arena
- [ ] Open browser: http://localhost:5173
- [ ] Watch 5 consecutive games
- [ ] After each game:
  - [ ] Countdown appears (5s)
  - [ ] New game starts
  - [ ] Move count increments
- [ ] Verify all games appear in statistics

**TC 73.1.3: Statistics Accumulation (1 hour)**
- [ ] Run for exactly 1 hour
- [ ] Monitor Terminal 3: statistics should grow
- [ ] After 1 hour:
  - [ ] Check `arena-statistics.json`:
    ```bash
    cat arena-statistics.json | jq '{
      totalGames,
      whiteWins,
      blackWins,
      draws,
      uptime
    }'
    ```
  - [ ] Should show 6-12 games (depends on move speed)
  - [ ] W/B/D counts should be reasonable
  - [ ] Uptime should be ~3600000 (1 hour in ms)

**TC 73.1.4: Health Status Display**
- [ ] Check browser right panel for health indicator
- [ ] Should show 🟢 (healthy) or 🔴 (unhealthy)
- [ ] Verify every 30 seconds health status updates
- [ ] After 1 hour, health should always show 🟢

**TC 73.1.5: Connection Stability**
- [ ] Keep browser open during entire test
- [ ] Connection indicator should stay green
- [ ] No errors in DevTools Console (F12)
- [ ] WebSocket should not disconnect
- [ ] Should not need to refresh browser

### Expected Results
- 6-12 games completed (depends on model speed)
- All games tracked in statistics
- Zero errors in Terminal 1 or 2
- Browser never disconnects
- CPU usage stable
- Memory usage <500MB (Node only, excluding Ollama)

---

## 🧪 Test Suite 2: Recovery & Resilience (1-2 hours)

### TC 73.2.1: Ollama Disconnect Recovery
```bash
# While arena is running:

# 1. Kill Ollama
# In Terminal 0, press Ctrl+C

# Expected in Terminal 1:
# ⚠️ Ollama unavailable (attempt 1/5)
# ⚠️ Ollama unavailable (attempt 2/5)
# (waits 5 seconds between retries)

# 2. Restart Ollama
# In Terminal 0: ollama serve

# Expected in Terminal 1:
# ✅ Ollama available
# [arena resumes playing]

# 3. Verify browser still connected
# Should show connection status
# May see brief "Connecting..." then "Connected"
```

- [ ] Arena detects Ollama unavailable (logs to console)
- [ ] Arena retries 5 times with exponential backoff
- [ ] Arena recovers when Ollama restarts
- [ ] Browser auto-reconnects to WebSocket
- [ ] Game resumes without manual intervention

### TC 73.2.2: WebSocket Disconnect Recovery
```bash
# While arena is running:

# In browser (http://localhost:5173):
# 1. Open DevTools (F12)
# 2. Go to Network tab
# 3. Right-click on WS connection
# 4. Select "Close connection"

# Expected in browser:
# Connection status shows "Connecting..."
# Within 5 seconds: Shows "Connected" again

# Expected in Terminal 1:
# No errors (arena unaffected)
```

- [ ] Browser shows "Connecting..." message
- [ ] Auto-reconnects within 5 seconds
- [ ] Game state syncs on reconnect
- [ ] No data loss

### TC 73.2.3: Network Interruption (10 minutes)
- [ ] Run arena for 5 minutes normally
- [ ] Note current game number and move count
- [ ] Disconnect network (unplug WiFi, disable interface, etc.)
- [ ] Wait 2 minutes (arena continues locally)
- [ ] Reconnect network
- [ ] Verify browser reconnects
- [ ] Verify game state is correct
- [ ] Continue monitoring for 5 more minutes

---

## 🧪 Test Suite 3: Extended Duration Testing (6-24 hours)

### Setup (Same as Test Suite 1)
```bash
# Terminal 0: ollama serve
# Terminal 1: pnpm chess
# Terminal 2: cd apps/web && npm run dev
# Terminal 3: watch -n 60 'cat arena-statistics.json | jq'
# Terminal 4: System monitor
```

### Monitoring Script (Run in Terminal 5)
```bash
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  echo "Games:"
  cat arena-statistics.json | jq '.totalGames'
  echo "Memory (Node):"
  ps aux | grep node | grep -v grep | awk '{print $6 " KB"}'
  echo "Uptime (hours):"
  cat arena-statistics.json | jq '.uptime / 3600000'
  sleep 300  # Check every 5 minutes
done
```

### Test Cases

**TC 73.3.1: 6-Hour Continuous Play**
- [ ] Start arena and browser
- [ ] Run for exactly 6 hours
- [ ] Monitor every hour:
  - [ ] Check game count
  - [ ] Check memory usage
  - [ ] Check CPU usage
  - [ ] Verify health status
  - [ ] Verify browser still connected
- [ ] After 6 hours:
  - [ ] Check final statistics
  - [ ] Memory should be stable (not growing)
  - [ ] CPU should be consistent
  - [ ] No crashes or errors

**Expected Results (6 hours):**
- 30-70 games (depending on model speed)
- Memory stable (±10% from first measurement)
- CPU consistent (±5% variation)
- Zero errors in logs
- Browser never disconnected
- All games tracked accurately

**TC 73.3.2: 24-Hour Extended Run** (Optional, if time permits)
- [ ] Set up monitoring
- [ ] Run for 24 hours
- [ ] Collect metrics every hour
- [ ] Generate report at end

**Expected Results (24 hours):**
- 150-300 games
- Memory stable throughout
- CPU consistent
- Zero crashes
- Statistics file grows to ~10-50MB
- All data saved correctly

### Metrics to Track

Create a monitoring spreadsheet with columns:
```
Time | Games | Memory | CPU | Errors | Browser Connected | Notes
-----|-------|--------|-----|--------|-------------------|-------
0:00 | 0     | 45MB   | 5%  | 0      | Yes               |
1:00 | 8     | 47MB   | 6%  | 0      | Yes               |
2:00 | 15    | 48MB   | 5%  | 0      | Yes               |
...
```

---

## 🧪 Test Suite 4: Configuration Variants

### TC 73.4.1: Different Model Pairs

**Test with Streaming Config:**
```bash
# Edit .env:
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=3000
```

- [ ] Run for 1 hour
- [ ] Verify games complete faster
- [ ] Check if AI quality is better
- [ ] Verify restart at 3 seconds works
- [ ] No errors or issues

**Test with Tournament Config:**
```bash
# Edit .env:
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=30000
```

- [ ] Run for 1 hour
- [ ] Verify both players are same model
- [ ] Verify 30 second restart delay
- [ ] Check statistics (should be more balanced)

### TC 73.4.2: Health Check Intervals

**Test with Fast Health Checks:**
```bash
HEALTH_CHECK_INTERVAL_MS=10000  # Every 10 seconds
```

- [ ] Run for 30 minutes
- [ ] Verify health status updates frequently
- [ ] Monitor CPU (should be slightly higher)
- [ ] Check for any performance impact

**Test with Slow Health Checks:**
```bash
HEALTH_CHECK_INTERVAL_MS=60000  # Every 60 seconds
```

- [ ] Run for 30 minutes
- [ ] Verify health status updates every 60s
- [ ] Monitor CPU (should be lower)
- [ ] Verify still detects Ollama issues

---

## 📊 Test Results Template

Create a file: `EPIC-73-TEST-RESULTS.md`

```markdown
# EPIC 73 Testing Results

## Test Environment
- Date: [DATE]
- OS: [Windows/Mac/Linux]
- Node.js: [VERSION]
- Ollama: [VERSION]
- Models: [MODEL1] vs [MODEL2]

## Test Suite 1: Basic Continuous Operation (1 hour)
- [x/x] Test cases passed
- **Status:** PASS / FAIL
- **Issues:** None / [List]
- **Notes:** [Any observations]

## Test Suite 2: Recovery & Resilience
- [x/x] Test cases passed
- **Status:** PASS / FAIL
- **Issues:** None / [List]
- **Notes:** [Any observations]

## Test Suite 3: Extended Duration (6+ hours)
- Games completed: [NUMBER]
- Memory: [START MB] → [END MB]
- CPU: [MIN%] - [MAX%]
- Errors: [0 / NUMBER]
- **Status:** PASS / FAIL
- **Issues:** None / [List]

## Overall Assessment
- **EPIC 73 Ready:** YES / NO
- **Blockers:** None / [List]
- **Recommendations:** [Any suggestions for improvement]
```

---

## ✅ Pass Criteria

EPIC 73 passes when:

- [ ] **Auto-Restart:** All 5 test cases pass
- [ ] **Health Monitoring:** Status accurate, updates regularly
- [ ] **Recovery:** System recovers from all disconnect scenarios
- [ ] **Statistics:** All games tracked, file saves correctly
- [ ] **6-Hour Test:** Runs without error, memory stable
- [ ] **Memory:** No growth over extended periods (<10% variance)
- [ ] **CPU:** Stable usage (<5% variance)
- [ ] **Browser:** Never forcefully disconnects
- [ ] **Errors:** Zero unhandled errors in logs

---

## 🚨 Failure Criteria (Blocker Issues)

Any of these fail the test:

1. **Crash:** Arena or app crashes during testing
2. **Memory Leak:** Memory grows >20% over time
3. **Hang:** No moves for >2 minutes without reason
4. **Loss of Data:** Statistics file corrupted or lost
5. **Browser Disconnect:** WebSocket closes unexpectedly
6. **Failed Recovery:** Arena doesn't recover from disconnect
7. **Incorrect Stats:** Game count or results wrong

---

## 🔧 Troubleshooting During Tests

### No games starting
- Check Ollama running: `curl http://localhost:11434/api/version`
- Check models available: `ollama list`
- Restart arena: Terminal 1 Ctrl+C, then `pnpm chess`

### Games very slow
- Using large model? Try `tinyllama` for testing
- Check Ollama CPU usage
- Verify no other heavy processes

### Memory growing
- This is a bug! Note when it started
- Check browser memory usage (F12 → Performance)
- Could be unbounded arrays or caches

### Browser not connecting
- Check WebSocket server in Terminal 1
- Should show: "🔗 WebSocket Server running on ws://localhost:9000"
- Check browser console for connection errors

### Statistics not updating
- Check `arena-statistics.json` file exists
- Check file permissions: `ls -la arena-statistics.json`
- Check Terminal 1 for write errors

---

## 📝 How to Run Tests

### Quick Test (1 hour, validates basic functionality)
```bash
# Set up as per Test Suite 1
# Run for 60 minutes
# Document results in EPIC-73-TEST-RESULTS.md
# Expected: 6-12 games, stable performance, 0 errors
```

### Standard Test (6 hours, validates extended operation)
```bash
# Set up monitoring scripts
# Run for 6 hours continuously
# Collect metrics every hour
# Document final results
# Expected: 40-60 games, memory stable, 0 errors
```

### Extended Test (24 hours, validates production readiness)
```bash
# Full setup with comprehensive monitoring
# Run for 24 hours
# Document everything
# Generate detailed performance report
# Expected: 150-300 games, all metrics stable, 0 errors
```

---

## 🎯 Next Steps After Testing

1. **Run Quick Test (1 hour)** - Validate basic functionality
2. **Document Results** - Fill in EPIC-73-TEST-RESULTS.md
3. **If Pass:** Run Standard Test (6 hours)
4. **If Pass:** Run Extended Test (24 hours)
5. **If All Pass:** EPIC 73 is complete ✅
6. **Proceed to EPIC 74:** Streaming Experience

---

## 📞 Support

Questions during testing?

- Check EPIC-72-README.md for system overview
- Check EPIC-72-PRODUCTION-DEPLOYMENT.md for detailed guides
- Check terminal output for specific error messages
- Review NEXT-PHASES-ROADMAP.md for context

Good luck! 🚀
