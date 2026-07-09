# ⚡ Play Now — 5 Minute Setup

**Get an AI vs AI RTS match running in 5 minutes. No configuration needed.**

---

## Installation (3 minutes)

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build
```

---

## Play (2 minutes)

### Option 1: Builtin AI (Instant, No Dependencies)

```bash
npx ts-node test-builtin-match.ts
```

**What you get:**
- Live match display
- Two AI players competing
- Real-time decision making
- Winner determination
- Saved replay

**Takes:** ~1 minute to run

### Option 2: Ollama AI (Free, Local LLM)

**First time setup (5 minutes):**

```bash
# 1. Install Ollama
# Download from https://ollama.ai/

# 2. In a new terminal, start Ollama
ollama serve

# 3. In another terminal, pull a model
ollama pull mistral

# 4. Go back to AI Commander directory and run
npx ts-node play-ollama-match.ts
```

**What you get:**
- Real AI inference (Mistral 7B model)
- Live decision making with latencies shown
- Full match replay
- Professional telemetry

**Takes:** ~50 seconds for the match (plus model download first time)

---

## What You'll See

```
══════════════════════════════════════════════════════════════════════
  OLLAMA vs OLLAMA — REAL-TIME MATCH VIEWER
══════════════════════════════════════════════════════════════════════

Tick: 7/100 | Time: 3.5s

┌─ PLAYER 1: Ollama-Mistral-1 ─────────────────────────────────┐
│ Resources: 250 | Units: 12 | Structures: 3
│ Commands: 33 | Errors: 1
│ Last Decision: Gather resources | Latency: 591ms | Confidence: 72%
└────────────────────────────────────────────────────────────────────┘

┌─ PLAYER 2: Ollama-Mistral-2 ─────────────────────────────────┐
│ Resources: 400 | Units: 10 | Structures: 3
│ Commands: 18 | Errors: 0
│ Last Decision: Expand territory | Latency: 834ms | Confidence: 99%
└────────────────────────────────────────────────────────────────────┘

┌─ RECENT EVENTS ───────────────────────────────────────────────┐
│ [Tick 6] Player 1: Scout map (512ms, 73% confidence)              │
│ [Tick 6] Player 2: Train units (900ms, 77% confidence)            │
│ [Tick 7] Player 1: Gather resources (591ms, 72% confidence)       │
│ [Tick 7] Player 2: Expand territory (834ms, 99% confidence)       │
└────────────────────────────────────────────────────────────────────┘
```

Live updates show:
- Current game tick and time
- Each player's resources, units, structures
- Last decision with latency and confidence
- Recent game events

---

## Files Saved

After the match, you'll have:

```
./real-match-replay/
├── match-real-*.json          # Full replay data
├── match-logs-*.json          # Event logs
└── match-telemetry-*.json     # Performance metrics
```

---

## Done! 🎉

You just ran an AI-powered RTS match.

**Next steps:**

1. **Run a tournament** with multiple models
   ```bash
   npx ts-node tournament-runner.ts --brains "mistral,llama2"
   ```

2. **Use a cloud AI** (Claude, GPT, etc.)
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   npx ts-node play-claude-match.ts
   ```

3. **See the visual game** (if 0 A.D. installed)
   ```bash
   npx ts-node play-with-visual.ts
   ```

4. **Read more**
   - [GETTING_STARTED.md](GETTING_STARTED.md) — Full setup guide
   - [DEMO.md](DEMO.md) — Code examples
   - [TOURNAMENT_GUIDE.md](TOURNAMENT_GUIDE.md) — Run tournaments

---

**That's it. You have everything you need to watch AI models compete.**

🚀 Enjoy!
