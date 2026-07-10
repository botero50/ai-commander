# R2.7.1 Setup Procedure: One Brain, One Player

## Objective
Prove that ONE Ollama model can control Player 1 in a real visible 0 A.D. match against the built-in AI.

## Prerequisites

### 1. Ollama Running
Verify Ollama is running with neural-chat model:
```bash
curl http://localhost:11434/api/tags
```

Expected: Should show `"neural-chat:latest"` in models list.

If not running:
```bash
ollama serve  # In separate terminal
ollama pull neural-chat:latest
```

### 2. 0 A.D. Game Instance

Start a new 0 A.D. game with exact parameters:

```bash
pyrogenesis.exe ^
  --rl-interface=127.0.0.1:6000 ^
  --mod=public ^
  -autostart="skirmishes/acropolis_bay_2p" ^
  -autostart-ai=2:petra ^
  -autostart-civ=1:athen ^
  -autostart-civ=2:gaul
```

**Breakdown**:
- `--rl-interface=127.0.0.1:6000` — Enable RL Interface on localhost:6000
- `--mod=public` — Use public mod
- `-autostart="skirmishes/acropolis_bay_2p"` — Load Acropolis Bay 2-player map
- `-autostart-ai=2:petra` — Player 2 controlled by Petra AI
- `-autostart-civ=1:athen` — Player 1 civilization: Athenians
- `-autostart-civ=2:gaul` — Player 2 civilization: Gauls

**Wait for**: Game window shows match starting, time counter at 0:00

## Run Test

Once game is running:

```bash
cd C:\Users\boter\ai-commander
npm run build
node packages/zeroad-adapter/dist/test-r2-7-one-brain.js 300
```

Parameters:
- `300` = run for 300 ticks (15 seconds of game time)
- Omit for default: 6000 ticks (5 minutes)

## What to Observe

### In Game Window
- Athenians (Player 1) should begin gathering resources
- Gauls (Player 2) will also expand
- Some units will move toward resources
- Settlement buildings might be constructed

### In Terminal Output
```
Total decisions:          300
Valid decisions:          280  (should be > 150, or 50%+)
Decision rate:            93%
Avg Ollama latency:       2500ms
Avg commands per decision: 1.2
```

### Success Criteria (All must be YES)
1. ✓ All ticks completed (300/300)
2. ✓ Decision rate >= 50%
3. ✓ Ollama latency < 10 seconds
4. ✓ Game remains playable (no crashes)

## If Test Fails

### Connection error: "Cannot reach RL Interface"
- Verify game window is running
- Verify `netstat -ano | grep 6000` shows LISTENING
- Wait 10 seconds after game window appears

### Ollama error: "Connection refused"
- Verify `curl http://localhost:11434/api/tags` works
- Start Ollama: `ollama serve`

### "Invalid observation" errors
- This is expected early in development
- Test will continue (observation validation is non-fatal)

### Game crashes or freezes
- Check 0 A.D. console output for errors
- Restart game with fresh `-autostart` parameters

## Output Files

After test completes:
- `test-r2-7-metrics.json` — Full metrics (6000+ data points)
- Terminal output — Summary statistics

## Next Steps After R2.7.1 Pass

1. **R2.7.2**: Log every decision in detail
2. **R2.7.3**: Improve prompt based on observed gameplay (evidence-driven)
3. **R2.7.4**: CTO readiness gate answers
4. **EPIC R3**: Two Ollama models compete in tournament

## Timeline

- **Setup**: 2 min (start game + Ollama)
- **Test**: 1-2 min (300 ticks at 20 FPS)
- **Analysis**: 1 min
- **Total**: ~5 minutes for first validation
