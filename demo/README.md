# AI Commander Demo

## Quick Start

See two AI models playing a real RTS game in one command.

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18+
   ```

2. **Ollama running locally**
   ```bash
   # Install from https://ollama.ai
   # Then start:
   ollama serve
   
   # In another terminal, pull a model:
   ollama pull mistral  # or another model
   ```

3. **AI Commander installed**
   ```bash
   npm install
   npm run build
   ```

### Run the Demo

```bash
npm run demo
```

This will:
1. ✅ Check Ollama connection
2. ✅ Initialize two AI brains
3. ✅ Launch a complete match
4. ✅ Display winner and statistics
5. ✅ Save replay, logs, and telemetry

**Duration:** ~2-5 minutes depending on model and max ticks

### View the Replay

```bash
npm run replay
```

Shows match timeline and statistics from the saved replay.

---

## Configuration

Use environment variables to customize:

```bash
# Models to use
export PLAYER1_MODEL=mistral
export PLAYER2_MODEL=neural-chat

# Ollama endpoint
export OLLAMA_ENDPOINT=http://localhost:11434

# Match duration (ticks)
export MAX_TICKS=500

# Verbose logging
export VERBOSE=true

npm run demo
```

### Recommended Model Pairs

| Model 1 | Model 2 | Speed | Quality |
|---------|---------|-------|---------|
| `neural-chat` | `mistral` | 🟢 Fast | 🟡 Good |
| `mistral` | `mistral` | 🟡 Medium | 🟢 Good |
| `llama2` | `llama2` | 🔴 Slow | 🟢 Excellent |
| `tinyllama` | `tinyllama` | 🟢 Very Fast | 🟡 Fair |

**First time?** Start with `neural-chat` vs `mistral` for balance.

---

## Output Files

All outputs saved to `./demo-output/`:

### `replay.json`
Complete match replay with frame-by-frame state:
- Tick number and timestamp
- Player states (units, buildings, resources)
- Decisions made each tick
- Match outcome and scores

**Use Case:** Playback, analysis, debugging

### `logs.txt`
Match execution logs:
- Initialization events
- Each tick's activities
- Decisions and commands
- Errors or warnings

**Use Case:** Understanding what happened tick by tick

### `telemetry.json`
Performance and usage metrics:
- Command execution times
- Latency per player
- Resource utilization
- Token usage (if using API-based models)

**Use Case:** Performance analysis, profiling

### `replay-summary.json`
Quick reference of match outcome:
- Players and models
- Winner
- Duration and tick count
- Final scores

---

## What Happens Inside

### Tick Loop
```
For each tick (0 to MAX_TICKS):
  1. Player 1's brain observes game state
  2. Player 1 makes decision (via Ollama)
  3. Execute Player 1's commands
  
  4. Player 2's brain observes game state
  5. Player 2 makes decision (via Ollama)
  6. Execute Player 2's commands
  
  7. Game state advances
  8. Check for winner
```

### Decision Process
Each player's brain:
1. **Observes** — Current game state (units, buildings, resources, fog of war)
2. **Plans** — What strategy to pursue
3. **Decides** — Which specific commands to execute
4. **Executes** — Commands are validated and applied to game state

### Winner Determination
Victory by:
- **Elimination** — Destroy all enemy units and buildings
- **Dominance** — Control majority of the map
- **Score** — Reach target score (varies by map)
- **Timeout** — Draw if max ticks reached

---

## Troubleshooting

### "Cannot connect to Ollama"
```bash
# Check if Ollama is running:
curl http://localhost:11434/api/tags

# If it fails, start Ollama:
ollama serve

# If you get "connection refused" errors, Ollama may not be installed
# Download from: https://ollama.ai
```

### "Model not found"
```bash
# Pull the model:
ollama pull mistral

# List available models:
ollama list
```

### "Match is running very slowly"
- Check available RAM (models need 4-8GB)
- Try a smaller model: `tinyllama` or `neural-chat`
- Reduce `MAX_TICKS` to 100-200 for testing

### "Match runs forever"
- One player may be stuck. This is a decision AI problem, not a framework issue.
- Try different model pair: `ollama pull neural-chat`
- Reduce `MAX_TICKS` to 200

---

## Next Steps

After the demo works:

1. **Try different models:**
   ```bash
   PLAYER1_MODEL=llama2 PLAYER2_MODEL=mistral npm run demo
   ```

2. **Analyze the replay:**
   - Load `demo-output/replay.json` in a text editor
   - Look at decision patterns
   - See how resources flowed over time

3. **Run tournament:**
   ```bash
   npm run tournament  # Runs multiple matches
   ```

4. **Integrate with UI:**
   - Replay viewer shows match timeline
   - Real-time stats dashboard
   - Broadcast overlay

---

## Architecture

```
AI Commander Demo
├── Ollama Models (Player AI)
│   ├── Player 1: mistral (or configured)
│   └── Player 2: neural-chat (or configured)
│
├── Match Runner
│   ├── Observe game state
│   ├── Get brain decisions
│   ├── Execute commands
│   └── Track metrics
│
├── Game Adapter
│   ├── Fake 0 A.D. (for testing)
│   └── Real 0 A.D. (for full demo)
│
└── Output
    ├── Replay (frame-by-frame)
    ├── Logs (tick-by-tick)
    └── Telemetry (metrics)
```

---

## Reporting Issues

If the demo fails:

1. **Collect logs:**
   ```bash
   VERBOSE=true npm run demo 2>&1 | tee demo.log
   ```

2. **Include in report:**
   - `demo.log`
   - `demo-output/logs.txt`
   - Environment variables used
   - Model names and versions

3. **Report at:** https://github.com/anthropics/ai-commander/issues

---

## Performance Baseline

On a typical machine (M1 MacBook Pro, 16GB RAM):

| Model Pair | Speed | Duration | Tokens |
|-----------|-------|----------|--------|
| neural-chat v mistral | 10 ticks/sec | 50s | 5K |
| mistral v mistral | 5 ticks/sec | 100s | 10K |
| llama2 v llama2 | 2 ticks/sec | 250s | 20K |

These are estimates. Your times will vary based on:
- Hardware (GPU vs CPU)
- Available RAM
- Model quantization (Q4 vs Q8)
- Network latency (if using remote Ollama)

---

## What This Proves

✅ AI models can play a complex strategy game
✅ Framework handles real-time decision loops
✅ Multiple AI agents can compete fairly
✅ Complete game lifecycle (init → play → conclude)
✅ Replays capture enough detail for analysis
✅ Performance is acceptable for research/demo

---

## Further Reading

- [Match Runner](/packages/match-runner/README.md)
- [Ollama Brain](/packages/brain-ollama/README.md)
- [Adapter Documentation](/packages/zeroad-adapter/README.md)
