# AI Commander Demo — Complete Setup Guide

## Overview

This guide walks through setting up and running the first playable AI Commander demo that shows two LLMs playing a complete strategy game match.

**Estimated time:** 15-30 minutes (mostly waiting for downloads)

---

## Step 1: Verify Node.js

```bash
node --version
# Expected: v22.0.0 or higher
```

If you don't have Node 22+, install from https://nodejs.org

---

## Step 2: Install Ollama

Ollama provides the LLM inference engine that powers the AI players.

### macOS
```bash
# Install with Homebrew
brew install ollama

# Or download from: https://ollama.ai
```

### Linux
```bash
# Install
curl https://ollama.ai/install.sh | sh

# Or download from: https://ollama.ai/download/linux
```

### Windows
Download and run installer from: https://ollama.ai/download/windows

### Verify Installation
```bash
ollama --version
# Expected: ollama version X.X.X
```

---

## Step 3: Download AI Models

Start Ollama in a terminal:

```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

**In another terminal**, pull models:

```bash
# Fast + good quality (recommended)
ollama pull mistral
ollama pull neural-chat

# Alternative: just one model for testing
ollama pull tinyllama  # Fastest (1B params)

# Or high quality
ollama pull llama2
```

**Model Reference:**

| Model | Size | Speed | Quality | Recommended |
|-------|------|-------|---------|-------------|
| tinyllama | 637 MB | ⚡ 20 ticks/sec | Fair | Testing only |
| neural-chat | 4.1 GB | ⚡ 8 ticks/sec | Good | ✅ Yes |
| mistral | 4.1 GB | ⚡ 8 ticks/sec | Good | ✅ Yes |
| llama2 | 3.8 GB | 🐢 2 ticks/sec | Excellent | For quality |

**First time?** Use `mistral` and `neural-chat` — good balance of speed and quality.

---

## Step 4: Build AI Commander

In a new terminal (keep Ollama running):

```bash
cd /path/to/ai-commander

# Install dependencies
npm install

# Build everything
npm run build

# Verify build succeeded
npm run typecheck
```

Expected output:
```
> ai-commander@1.0.0 build
> tsc -b

✅ Build successful
```

---

## Step 5: Run the Demo

### Basic Demo
```bash
npm run demo
```

This will:
1. Check Ollama connection ✅
2. Initialize two AI players ✅
3. Run a complete match (500 ticks) ✅
4. Show results ✅
5. Save replay, logs, telemetry ✅

**Typical output:**
```
[15:22:45] 🔌 Checking Ollama connection...
[15:22:45] ✅ Connected to Ollama

[15:22:47] 🤖 Player 1 Model: mistral
[15:22:47] 🤖 Player 2 Model: neural-chat
[15:22:47] ⏱️ Max Ticks: 500

[15:22:50] ▶️ Starting match...

[15:23:15] 🏆 WINNER: Player 1 (mistral)

📊 MATCH STATISTICS:
  Total Ticks: 342
  Duration: 25.34s
  Ticks/Second: 13.5

Output directory: /path/to/ai-commander/demo-output
```

**Duration:** 30 seconds to 2 minutes depending on models

### Customized Demo

Use environment variables:

```bash
# Quick test with fast models
MAX_TICKS=100 npm run demo

# Extended match
MAX_TICKS=1000 npm run demo

# Different model pair
PLAYER1_MODEL=llama2 PLAYER2_MODEL=mistral npm run demo

# Verbose logging
VERBOSE=true npm run demo

# Custom Ollama endpoint
OLLAMA_ENDPOINT=http://192.168.1.100:11434 npm run demo
```

---

## Step 6: View the Replay

```bash
npm run replay
```

Shows match timeline and stats:
```
  🎬 AI COMMANDER REPLAY VIEWER

🎮 Match ID: demo-20240709-150845
🤖 Player 1: mistral
🤖 Player 2: neural-chat

🏆 WINNER: Player 1 (mistral)

📊 MATCH METRICS:
  Total Ticks: 342
  Duration: 0:25
  Speed: 13.5 ticks/sec
  Player 1 Score: 850
  Player 2 Score: 420

📊 MATCH TIMELINE: [████████████████░░░░░░░░░░░░░░░░░░░░░░░░] 100%
```

---

## Step 7: Examine Output Files

All outputs in `./demo-output/`:

### replay.json
Raw match data with every frame:
```json
{
  "config": {
    "player1Model": "mistral",
    "player2Model": "neural-chat",
    "maxTicks": 500
  },
  "metrics": {
    "winner": "player1",
    "totalTicks": 342,
    "duration": 25340,
    "player1Score": 850,
    "player2Score": 420
  },
  "frames": [
    {
      "tickNumber": 0,
      "player1State": { ... },
      "player1Decision": { ... },
      ...
    },
    ...
  ]
}
```

**Use:** Analysis tools, tournament replay, sharing

### logs.txt
Tick-by-tick execution log:
```
[00:00] Initializing match
[00:01] Player 1 state: units=0, buildings=1
[00:01] Player 1 decision: move to area_1
[00:01] Player 1 executed: 1 command
[00:02] Player 2 state: units=0, buildings=1
[00:02] Player 2 decision: gather_resources
[00:02] Player 2 executed: 1 command
...
[00:25] Match complete: Player 1 wins
```

**Use:** Debugging, understanding what happened

### telemetry.json
Performance and timing data:
```json
{
  "matchId": "...",
  "ticks": 342,
  "duration": 25340,
  "player1": {
    "latency": { "mean": 14.2, "min": 8, "max": 28 },
    "throughput": { "commandsPerTick": 0.8 }
  },
  "player2": {
    "latency": { "mean": 16.5, "min": 10, "max": 42 },
    "throughput": { "commandsPerTick": 0.6 }
  }
}
```

**Use:** Performance analysis, optimization

---

## Troubleshooting

### "Cannot connect to Ollama"

**Problem:** Error message about connection refused

**Solution:**
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. If not running, start it: `ollama serve`
3. If that doesn't work, restart Ollama completely
4. Check port 11434 is not blocked by firewall

### "Model not found: mistral"

**Problem:** `Error: Model 'mistral' not found on Ollama`

**Solution:**
```bash
# Pull the model
ollama pull mistral

# Verify it's available
ollama list
```

### "Out of memory"

**Problem:** Ollama or process crashes with OOM error

**Solution:**
- Use smaller model: `tinyllama` or `neural-chat`
- Reduce ticks: `MAX_TICKS=100`
- Close other applications
- Check available RAM: `free -h` (Linux) or System Activity Monitor (macOS)

**Models by memory:**
- 2-4 GB available: Use `neural-chat` or `tinyllama`
- 8+ GB available: Use `mistral` or `llama2`
- 16+ GB available: Use any model

### "Match runs forever (hangs)"

**Problem:** Demo doesn't finish after 10+ minutes

**Solution:**
- One player may be stuck making decisions
- Try different model: `PLAYER1_MODEL=neural-chat PLAYER2_MODEL=mistral npm run demo`
- Reduce iterations: `MAX_TICKS=100`
- Check Ollama logs: `ollama serve` shows inference details

---

## What to Do Next

### ✅ Verify It Works
1. Run quick demo: `MAX_TICKS=100 npm run demo`
2. Should complete in ~10 seconds
3. Check `demo-output/replay-summary.json` exists

### 📊 Analyze Results
1. Open `demo-output/replay.json` in text editor
2. Search for decision patterns
3. Look at tick progression
4. Compare player scores

### 🏆 Run Tournament
```bash
npm run tournament -- --rounds=5 --players="mistral,neural-chat"
```

Runs multiple matches and produces rankings.

### 🎬 Share the Demo
```bash
# Create shareable summary
zip -r demo-output.zip demo-output/

# Send to others:
# - demo-output.zip (contains replay, logs, telemetry)
# - They can view with: npm run replay
```

### 📱 Try Web UI
```bash
# Start web viewer (when available)
npm run web
```

View match replay in browser with visualization.

---

## Performance Expectations

### Baseline (M1 MacBook Pro, 16GB RAM)

| Setup | Speed | Duration (500 ticks) |
|-------|-------|-----|
| mistral + neural-chat | 10-15 ticks/sec | 30-50s |
| mistral + mistral | 8-12 ticks/sec | 40-60s |
| llama2 + llama2 | 2-4 ticks/sec | 150-250s |
| tinyllama + tinyllama | 20-30 ticks/sec | 15-25s |

### On Your Machine

First demo run will help you understand:
- Model inference latency
- Decision loop speed
- Total throughput
- Whether you need to optimize

---

## Next Milestones

### Story 45.2: Demo Scripts
Create shell scripts for Windows/Linux/macOS one-command launch

### Story 45.3: Demo Recording
Record a complete match video with overlays

### Story 45.4: Demo Validation
Verify the demo clearly demonstrates AI Commander's capabilities

---

## Summary

You now have:

✅ A working AI Commander installation
✅ Ollama with downloaded models
✅ Ability to run complete matches
✅ Replay and analysis tools
✅ Understanding of output formats

**Next:** Try different model pairs and analyze the replays!

---

## Getting Help

If you get stuck:

1. Check logs:
   ```bash
   VERBOSE=true npm run demo 2>&1 | tee demo.log
   ```

2. Check Ollama:
   ```bash
   curl http://localhost:11434/api/tags | jq .
   ```

3. Report issue with:
   - `demo.log` (from above)
   - `demo-output/logs.txt`
   - Output of `ollama list`
   - Your hardware specs

4. File issue at: https://github.com/anthropics/ai-commander/issues

---

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│        AI Commander Demo                    │
├─────────────────────────────────────────────┤
│                                             │
│  Player 1 Brain (Ollama)                    │
│  ├── Model: mistral                         │
│  ├── Endpoint: localhost:11434              │
│  └── Decision loop: observe → decide        │
│                                             │
│  ⇅ Match Executor                           │
│                                             │
│  Player 2 Brain (Ollama)                    │
│  ├── Model: neural-chat                     │
│  ├── Endpoint: localhost:11434              │
│  └── Decision loop: observe → decide        │
│                                             │
│  ⇅ Game State Management                    │
│                                             │
│  Output Artifacts                           │
│  ├── replay.json (frame-by-frame)           │
│  ├── logs.txt (tick-by-tick)                │
│  └── telemetry.json (metrics)               │
│                                             │
└─────────────────────────────────────────────┘
```

---

Enjoy the demo! 🎮🤖
