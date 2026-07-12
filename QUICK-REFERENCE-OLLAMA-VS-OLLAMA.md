# Quick Reference: EPIC 62.5 with Ollama vs Ollama

## TL;DR

You're now running **Ollama Player 1 vs Petra Player 2** (or Ollama vs Ollama if both models load).

---

## Prerequisites

```bash
# Terminal 1: Start Ollama (handles both tinyllama and mistral models)
ollama serve

# Terminal 2: Ensure models are available
ollama pull tinyllama:latest
ollama pull mistral:latest

# Verify they're ready
ollama list | grep -E "(tinyllama|mistral)"
```

---

## Run Validation

### Windows
```bash
run-epic-62-5-validation.bat
```

### Mac/Linux
```bash
bash run-epic-62-5-validation.sh
```

Or manually:
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

---

## What Changed

| Before | After |
|--------|-------|
| Both players = Petra AI | Player 1 = Ollama AI, Player 2 = Petra (or Ollama) |
| Single brain (Player 1 only) | Dual brains: P1 (tinyllama), P2 (mistral) |
| Game commands from Petra | Game commands from RL Interface (Ollama) |

---

## Expected Output

### Tick 500 Broadcast State
```
📺 BROADCAST STATE SAMPLE
{
  "player1": {
    "name": "Ollama AI",
    "model": "tinyllama:latest",
    "units": 22,
    "resources": { "wood": 580, "stone": 420, "food": 650, "metal": 120 }
  },
  "player2": {
    "name": "Petra AI",
    "model": "petra",
    "units": 15,
    "resources": { "wood": 420, "stone": 310, "food": 480, "metal": 80 }
  }
}
```

### Trash Talk Message
```
🗣️  player1: Your economy is crumbling!
📢 Trash talk captured for broadcast
  speaker: Ollama
  message: "Your economy is crumbling!"
```

### Match End
```
✅ MATCH 1 COMPLETE - Winner: player (Ollama) (1250 ticks / ~125s)
⏳ Preparing match 2 in 5 seconds...
✅ MATCH 2 COMPLETE - Winner: enemy (Petra) (980 ticks / ~98s)
```

---

## Validation Checklist

After both matches complete:

- [ ] **Broadcast state captured 4-6 times** (every 500 ticks)
- [ ] **Resources are non-zero** (not all zeros at Tick 500)
- [ ] **Unit counts increase** during match (Ollama making decisions)
- [ ] **Trash talk messages appear** (1-2 per match)
- [ ] **Match 2 has different map** from Match 1
- [ ] **No data leakage** between matches (Match 2 resources reset)
- [ ] **Winner determined** for both matches
- [ ] **At least 1 REAL AI-generated message** (not fallback) 📌 **CRITICAL**

---

## Troubleshooting

### "Failed to connect to RL Interface"
```bash
taskkill /F /IM pyrogenesis.exe
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

### "Ollama connection failed"
This is OK — trash talk will use fallback taunts (still valid, but not AI-generated).

**To ensure real AI-generated messages:**
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check models are available: `ollama list`
3. If not, run: `ollama pull tinyllama:latest mistral:latest`

### "Match 1 completed but Match 2 didn't start"
Check for errors in the log. Usually:
1. 0 A.D. process didn't terminate properly
2. RL Interface port 6000 wasn't released
3. Game startup timeout (increase `STARTUP_WAIT=10000`)

### "Resources all show zero at Tick 500"
This indicates RL Interface is not returning resource data from the game. Check:
1. Is 0 A.D. actually running?
2. Is RL Interface responding?
3. Are there errors in the game console?

---

## Customization

### Use different models:
```bash
# mistral for both (slower but more capable)
OLLAMA_MODEL_P1=mistral:latest OLLAMA_MODEL_P2=mistral:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2

# neural-chat for both (most capable)
OLLAMA_MODEL_P1=neural-chat:latest OLLAMA_MODEL_P2=neural-chat:latest \
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

### Faster decisions (every tick instead of default):
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 --freq 1
```

### Longer timeout for slow models:
```bash
OLLAMA_TIMEOUT=120000 npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

---

## After Validation

Once both matches complete successfully:

1. **Capture the log:**
   ```bash
   # Already captured to: validation-output/epic-62-5-TIMESTAMP.log
   type validation-output/epic-62-5-*.log | findstr "BROADCAST STATE SAMPLE\|Trash talk\|MATCH.*COMPLETE"
   ```

2. **Extract evidence:**
   - Broadcast state samples (at least 3)
   - Trash talk messages (all captured)
   - Match winners and durations

3. **Create final report:**
   - Create `EPIC-62-5-FINAL-VALIDATION.md`
   - Document all evidence
   - Note: Pass criteria = **at least 1 AI-generated message** (not fallback)

4. **Mark complete:**
   - If validation passes: Mark Story 62.5 COMPLETE
   - Mark EPIC 62 COMPLETE
   - Proceed to EPIC 63

---

## Key Difference This Session

**Before:** Game ran Petra vs Petra (hardcoded `-autostart-ai=1:petra -autostart-ai=2:petra`)

**Now:** Game runs Ollama vs Petra (RL Interface sends commands for Player 1, Petra AI for Player 2)

This allows **real Ollama decisions** to control gameplay instead of the game's built-in AI.

---

## Support

If issues arise:
1. Check the full log: `type validation-output/epic-62-5-*.log`
2. Search for error messages
3. Verify prerequisites (Ollama, 0 A.D., build)
4. If stuck, increase verbosity: `DEBUG=* npx tsx ...`
