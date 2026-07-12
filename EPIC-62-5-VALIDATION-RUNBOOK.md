# EPIC 62.5 — Multi-Match Trash Talk Validation Runbook

**Date:** 2026-07-11

**Objective:** Run 2+ consecutive real 0 A.D. matches and capture evidence that the complete broadcast data pipeline works with real gameplay.

---

## PRE-VALIDATION CHECKLIST

Before starting, verify:

- [ ] Ollama installed: `ollama serve` running in separate terminal
- [ ] 0 A.D. installed: `~\AppData\Local\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe`
- [ ] RL Interface accessible: port 6000
- [ ] Build successful: `npm run build` (clean)
- [ ] No processes on port 6000: `netstat -ano | findstr :6000`

---

## VALIDATION EXECUTION

### Step 1: Start Ollama (if using LLM trash talk)

```bash
# Terminal 1: Start Ollama server
ollama serve

# In another terminal, pull the model if not present
ollama pull tinyllama:latest
```

If Ollama is unavailable, trash talk will fall back to hardcoded taunts (still valid for validation).

### Step 2: Run 2 Matches with Logging

```bash
# Terminal 2: Run Arena loop with 2 matches
cd /c/Users/boter/ai-commander
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

**Expected output pattern:**

```
════════════════════════════════════════════════════════════════
Match 1 - Connecting to game...
Map: skirmishes/acropolis_bay_2p
════════════════════════════════════════════════════════════════

✓ Ollama brain initialized (tinyllama:latest)
✓ Automatic camera manager started

🎮 Match started - Initial game tick: 0
⏳ Waiting for game initialization before zooming...
🔭 Auto-zooming camera out...
✓ Camera zoom sequence started

  [Tick 100] Ollama: 12 units | Petra: 10 units
  [Tick 200] Ollama: 15 units | Petra: 12 units
  [Tick 300] Ollama: 18 units | Petra: 13 units
  [Tick 400] Ollama: 20 units | Petra: 14 units
  [Tick 500] Ollama: 22 units | Petra: 15 units
📺 BROADCAST STATE SAMPLE
{
  "tick": 500,
  "player1": {
    "name": "Ollama AI",
    "units": 22,
    "resources": { "wood": 580, "stone": 420, "food": 650, "metal": 120 }
  },
  "player2": {
    "name": "Petra AI",
    "units": 15,
    "resources": { "wood": 420, "stone": 310, "food": 480, "metal": 80 }
  }
}

🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

### Step 3: Capture Critical Points

**At Tick 500 (First Trash Talk):**
- [ ] Record broadcast state sample (copy from `📺 BROADCAST STATE SAMPLE`)
- [ ] Record trash talk message (note speaker and content)
- [ ] Note: resources should be NON-ZERO (validation of fix)

**At Tick 1000:**
- [ ] Record second broadcast state sample
- [ ] Verify unit/building counts increased
- [ ] Verify resources changed

**At Tick 1500:**
- [ ] Record third broadcast state sample
- [ ] Note any second trash talk message

**At Match End:**
- [ ] Record winner (Ollama vs Petra)
- [ ] Record final tick count
- [ ] Record duration in seconds

**Between Match 1 and 2:**
- [ ] Verify Arena output shows "Match 1 COMPLETE"
- [ ] Verify 5-second wait message before Match 2
- [ ] Verify Match 2 starts with new map name

**At Tick 500 of Match 2:**
- [ ] Record broadcast state sample
- [ ] CRITICAL: Verify map has changed (different from Match 1)
- [ ] Verify civilizations have changed (if available)
- [ ] Verify no stale trash talk from Match 1 appears
- [ ] Verify resources are reset (starting values, not end-of-match-1 values)

### Step 4: Capture Logs

Save the full Arena output:

```bash
# Run again with output redirection
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 2>&1 | tee epic-62-5-validation.log
```

---

## VALIDATION SUCCESS CRITERIA

### Match Identity ✓
- [ ] Match ID present (`match-1`, `match-2`)
- [ ] Map name correct and different between matches
- [ ] Map display name formatted properly

### Live Game Data ✓
- [ ] Resources update at each sample (not stuck at start values)
- [ ] Unit counts increase throughout match (Ollama makes decisions)
- [ ] Building counts increase (Ollama expands)
- [ ] Population increases
- [ ] All values > 0 (no defaults showing)

### Match Lifecycle ✓
- [ ] Match 1 progresses 500+ ticks
- [ ] Match 1 completes with winner
- [ ] Match 2 starts with clean state
- [ ] Match 2 progresses independently

### Trash Talk ✓
- [ ] At least 1 message generated per match
- [ ] Correct player attribution (Ollama or Petra)
- [ ] Message is either LLM output or hardcoded fallback
- [ ] Message is based on real context (mentions units, resources, economy, etc.)
- [ ] NO messages from Match 1 appear in Match 2

### Data Integrity ✓
- [ ] No stale data between matches
- [ ] Resources reset to starting amounts in Match 2
- [ ] No cross-match contamination
- [ ] Timestamp accuracy

---

## EXPECTED SAMPLE OUTPUTS

### Match 1 - Tick 500 Sample

```
📺 BROADCAST STATE SAMPLE
{
  "tick": 500,
  "player1": {
    "name": "Ollama AI",
    "units": 22,
    "resources": {
      "wood": 580,
      "stone": 420,
      "food": 650,
      "metal": 120
    }
  },
  "player2": {
    "name": "Petra AI",
    "units": 15,
    "resources": {
      "wood": 420,
      "stone": 310,
      "food": 480,
      "metal": 80
    }
  }
}
```

**Critical validations:**
- ✅ Resources non-zero (proves fix worked)
- ✅ Units > initial 0 (Ollama made decisions)
- ✅ Player1 resources > Player2 (Ollama winning)

### Trash Talk - Tick 500-1000 Range

**Expected if Ollama available:**
```
🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

**Or fallback if Ollama unavailable:**
```
🗣️  player1: My units are unstoppable!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "My units are unstoppable!"
```

**Validation:**
- ✅ Speaker identified (Ollama or Petra)
- ✅ Message is real LLM or safe fallback
- ✅ Message captured for broadcast feed
- ✅ Logged with timestamp

### Match 2 - Tick 500 Sample (Critical Cross-Match Check)

```
📺 BROADCAST STATE SAMPLE
{
  "tick": 500,
  "player1": {
    "name": "Ollama AI",
    "units": 18,  // DIFFERENT from Match 1 (different map)
    "resources": {
      "wood": 450,  // RESET from Match 1 end values
      "stone": 300,
      "food": 500,
      "metal": 75
    }
  },
  "player2": {
    "name": "Petra AI",
    "units": 14,
    "resources": {
      "wood": 350,
      "stone": 250,
      "food": 400,
      "metal": 60
    }
  }
}
```

**Critical validations:**
- ✅ Map name is DIFFERENT (e.g., skirmishes/alpine_valleys_2p vs acropolis_bay_2p)
- ✅ Unit counts RESET (not continuing from Match 1 end)
- ✅ Resources RESET (starting values, not end-of-match-1 values)
- ✅ No stale trash talk from Match 1

---

## TROUBLESHOOTING

### Issue: "Failed to connect to RL Interface"

**Cause:** 0 A.D. didn't start or RL Interface not responding  
**Fix:**
```bash
# Kill any hung process
taskkill /F /IM pyrogenesis.exe

# Ensure port 6000 is free
netstat -ano | findstr :6000

# Run with longer startup wait
STARTUP_WAIT=10000 npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

### Issue: Ollama times out or unavailable

**Expected behavior:** Falls back to hardcoded taunts  
**Validation:** Still valid, just uses fallback pool

### Issue: Resources all show zero at Tick 500

**Cause:** Resource extraction still broken  
**Action:** Check if run-arena-loop.ts lines 700-715 have the fix

### Issue: Match doesn't progress past Tick 100

**Cause:** Petra AI hangs or RL Interface not responding  
**Fix:** Check 0 A.D. process, ensure RL Interface is working

### Issue: No trash talk messages appear

**Expected if:** Ollama unavailable and talkFrequency not triggered  
**Fix:** Force generation by modifying talkFrequency to 100 (every 100 ticks instead of 500)

---

## COMPLETION CHECKLIST

After running 2 matches, verify:

- [ ] Match 1 completed successfully (winner recorded)
- [ ] Match 2 started automatically after 5-second wait
- [ ] Match 2 has different map from Match 1
- [ ] Broadcast state sampled at 500+ ticks in each match
- [ ] All broadcast fields have real, non-zero values
- [ ] Resources show as extracted from WorldState (not all zeros)
- [ ] At least 1 trash talk message per match
- [ ] Trash talk correctly attributed to player (Ollama or Petra)
- [ ] No stale trash talk from Match 1 in Match 2
- [ ] No resource values carry over from Match 1 to Match 2
- [ ] Arena loop continues to Match 2 without manual intervention

---

## DOCUMENTATION FOR FINAL REPORT

Capture and paste the following into EPIC-62-5-FINAL-VALIDATION.md:

1. **Full log output** (save from epic-62-5-validation.log)
2. **Broadcast state samples** (at least 3: 500, 1000, 1500 ticks of Match 1)
3. **Trash talk messages** (all messages generated in both matches)
4. **Match completion data** (winner, duration, final tick)
5. **Cross-match validation** (proof of data reset between matches)

---

## NEXT STEPS AFTER VALIDATION

**If validation PASSES:**
- Create EPIC-62-5-FINAL-VALIDATION.md with evidence
- Mark Story 62.5 COMPLETE
- Mark EPIC 62 COMPLETE
- Begin EPIC 63 — Competitive Scoreboard

**If validation FAILS:**
- Document the failure
- Identify root cause
- Fix in run-arena-loop.ts
- Re-run validation

---

## ESTIMATED TIME

- Setup: 5 minutes (start Ollama, verify build)
- Match 1: 3-5 minutes (gameplay time)
- Wait: 5 seconds
- Match 2: 3-5 minutes (gameplay time)
- **Total: ~15 minutes**

---

## SUCCESS LOOKS LIKE

Two complete, independent matches where:

1. **Real broadcast state flows** every tick with real WorldState data
2. **Trash talk is generated** from real game context (units, resources)
3. **Attribution is correct** (Ollama vs Petra)
4. **Data isolation is clean** (no Match 1 data in Match 2)
5. **Maps and civilizations change** (rotation working)
6. **No blocking occurs** (gameplay continues smoothly)

Once this evidence is captured, **EPIC 62 is complete and validated for production use.**
