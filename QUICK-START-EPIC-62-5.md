# Quick Start: EPIC 62.5 Validation

**Time Estimate:** 15-20 minutes

## Prerequisites (2 minutes)

### 1. Make sure 0 A.D. is NOT running
```
taskkill /F /IM pyrogenesis.exe 2>nul
```

### 2. (Optional) Start Ollama for better trash talk
```
ollama serve
```
In another terminal:
```
ollama pull tinyllama:latest
```

If you don't have Ollama installed, trash talk will use safe fallback taunts (still valid for validation).

### 3. Verify build is clean
```
npm run build
```

Should complete with no errors.

## Run Validation (15 minutes)

### Windows:
```
run-epic-62-5-validation.bat
```

### Mac/Linux:
```
bash run-epic-62-5-validation.sh
```

The script will:
1. Kill any running 0 A.D. instances
2. Run 2 consecutive real matches
3. Capture all output to `validation-output/epic-62-5-TIMESTAMP.log`
4. Show summary of captured data

## What to Look For

The log will contain entries like:

### Broadcast State Sample (every 500 ticks):
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

**What to verify:**
- ✅ Resources are NOT all zeros (should have various amounts)
- ✅ Units count > 0
- ✅ Resources change between samples (proves real-time updates)

### Trash Talk Message:
```
🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

**What to verify:**
- ✅ Speaker is either "Ollama" or "Petra"
- ✅ Message is coherent (either LLM output or safe fallback)
- ✅ Message relates to game context

### Match Transitions:
```
✅ MATCH 1 COMPLETE - Winner: player (Ollama) (1250 ticks / ~125s)
⏳ Preparing match 2 in 5 seconds...
✅ MATCH 2 COMPLETE - Winner: enemy (Petra) (980 ticks / ~98s)
```

**What to verify:**
- ✅ Both matches completed
- ✅ Winners determined
- ✅ Automatic transition between matches

## Expected Output Summary

After the script finishes, you'll see:
```
📊 VALIDATION RESULTS
════════════════════════════════════════════════════════════

📺 Broadcast state samples captured: 6
🗣️  Trash talk messages captured: 2

Match Completion:
  Match 1: ✅ YES
  Match 2: ✅ YES

Resource extraction (non-zero detected): 12 instances
```

## Success Criteria

✅ **Broadcast state samples:** Should be at least 4-6 (one every 500 ticks)  
✅ **Trash talk messages:** Should be at least 1-2 per match (every 500 ticks)  
✅ **Resources:** Should show non-zero values (proves fix worked)  
✅ **Unit counts:** Should increase during match (Ollama makes decisions)  
✅ **Match completion:** Both matches should complete successfully  
✅ **Data isolation:** Match 2 resources should reset (not carry from Match 1)  

## Troubleshooting

### "Failed to connect to RL Interface"
```
taskkill /F /IM pyrogenesis.exe
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

### "Ollama connection failed"
This is OK - trash talk will use hardcoded fallbacks. Still valid for validation.

### "Match 1 completed but Match 2 didn't start"
Check the log for errors. Usually means 0 A.D. didn't restart properly.

## Review the Full Log

```
# Windows
type validation-output\epic-62-5-TIMESTAMP.log

# Mac/Linux
cat validation-output/epic-62-5-TIMESTAMP.log
```

Search for:
- `BROADCAST STATE SAMPLE` — should appear 6+ times
- `Trash talk captured` — should appear 2+ times
- `MATCH 1 COMPLETE` — winner and duration
- `MATCH 2 COMPLETE` — should have different map
- `resources.*[1-9]` — non-zero values

## Create Final Report

Once validation succeeds, create `EPIC-62-5-FINAL-VALIDATION.md` with:

1. **Evidence Summary**
   - Broadcast state samples (at least 3)
   - Trash talk messages (at least 2)
   - Match completion times

2. **Data Validation**
   - Resources non-zero? YES
   - Unit counts increased? YES
   - Buildings increased? YES
   - Match 2 had different map? YES
   - No data leakage between matches? YES

3. **Cross-Match Validation**
   - Match 1 resources at end: W=XXX S=XXX F=XXX M=XXX
   - Match 2 resources at start: W=YYY S=YYY F=YYY M=YYY
   - Confirm they are DIFFERENT (proves reset)

## That's It!

If all checks pass, EPIC 62.5 is **COMPLETE** and EPIC 62 can be marked as **DONE**.

---

**Next Step:** EPIC 63 — Competitive Scoreboard (head-to-head match statistics)
