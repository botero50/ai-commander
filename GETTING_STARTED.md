# 🎮 AI Commander — Getting Started

Welcome! This guide will get you running AI-powered matches in 5-30 minutes, depending on your setup.

---

## 📋 What You Need

**Required:**
- Node.js 22+
- pnpm
- Git

**Optional (Choose One):**
- **Ollama** — Run local AI models (free, fully local)
- **Claude API Key** — Use Claude 3 (requires Anthropic account)
- **OpenAI API Key** — Use GPT-4 (requires OpenAI account)
- **0 A.D.** — Visual game (download from play0ad.com)

You can start **right now** with no optionals — the framework includes a built-in AI player.

---

## 🚀 Installation (5 minutes)

### Step 1: Clone and Install

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build
```

**Takes:** ~3 minutes depending on internet  
**Result:** Framework ready to run

### Step 2: Verify Installation

```bash
node --version   # Should be 22.0.0 or higher
pnpm --version   # Should be 9.0.0 or higher
```

**Done!** You can now run matches.

---

## ⚡ Play Your First Match (Right Now!)

### Simplest: Builtin vs Builtin

No external dependencies needed:

```bash
npx ts-node play-ollama-match.ts
```

**What you'll see:**
- Live match display
- Both AI players making decisions
- Resources, units, game state updating
- Winner determination
- Saved replay file

**Takes:** ~1 minute

---

## 🤖 Play With Ollama (Local AI)

### Step 1: Install Ollama

**Download from:** https://ollama.ai/

**Verify installation:**
```bash
ollama --version
```

### Step 2: Start Ollama Service

**In a separate terminal:**
```bash
ollama serve
```

You should see:
```
Listening on 127.0.0.1:11434 (http)
```

**Keep this running** while playing matches.

### Step 3: Pull a Model

**In another terminal:**
```bash
ollama pull mistral
```

Downloads ~4GB (first time only). Takes 5-10 minutes.

### Step 4: Play Ollama vs Ollama

```bash
npx ts-node play-ollama-match.ts
```

**What happens:**
- Mistral model loads
- Real AI inference happens (400-800ms per decision)
- Match runs for 100 ticks (~50 seconds)
- Live display shows each decision
- Replay saved to disk

---

## 🎯 Available AI Models

### Local (via Ollama)

```bash
ollama pull mistral        # 7B, fast, good quality
ollama pull llama2         # 13B, slower, better reasoning
ollama pull neural-chat    # 7B, conversation-optimized
ollama pull dolphin-mixtral # 8x7B, very capable
```

**Cost:** Free (runs on your machine)  
**Speed:** 400-2000ms per decision  
**Quality:** Good for testing, competitive play

### Cloud (via API Keys)

**Claude (Anthropic):**
```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx ts-node play-claude-match.ts
```

**GPT-4 (OpenAI):**
```bash
export OPENAI_API_KEY=sk-...
npx ts-node play-gpt-match.ts
```

**Gemini (Google):**
```bash
export GOOGLE_API_KEY=...
npx ts-node play-gemini-match.ts
```

---

## 🎮 Watch With Visual Game (Optional)

To see the match happen visually in 0 A.D.:

### Step 1: Install 0 A.D.

**Download from:** https://play0ad.com/

**Install** normally (Windows/Mac/Linux installers available)

### Step 2: Run Match With Visual

```bash
npx ts-node play-with-visual.ts
```

**What happens:**
- 0 A.D. launches automatically
- Match runs in the game
- AI commands execute in real-time
- You see units moving, buildings appearing, combat happening
- Match completes, winner determined

---

## 📊 Run a Tournament

Watch multiple AI models compete:

```bash
npx ts-node tournament-runner.ts \
  --brains "mistral,llama2" \
  --format round-robin \
  --matches 5
```

**Results include:**
- Match results
- ELO ratings
- Win rates
- Tournament standings
- Replay files for each match

---

## 📁 Your Match Files

All matches save to:

```
./replays/
├── match-real-1234567890.json      # Full replay data
├── match-logs-1234567890.json      # Event logs
└── match-telemetry-1234567890.json # Performance metrics
```

**Use replays to:**
- Replay the match
- Analyze AI decisions
- Compare strategies
- Study gameplay

---

## 🐛 Troubleshooting

### "Ollama is not running"

```bash
# Start Ollama in another terminal
ollama serve

# Verify it's working
curl http://localhost:11434/api/tags
```

### "Model not found"

```bash
# Check what's installed
ollama list

# Pull the model you need
ollama pull mistral
```

### "Node version error"

```bash
# Check your version
node --version

# Need 22.0.0 or higher
# Update from nodejs.org
```

### "0 A.D. not found"

Game is optional. Matches work without it.

If you want the visual:
1. Download from https://play0ad.com/
2. Install normally
3. Framework will auto-detect it

---

## 🎬 Demo Scripts

### See All Options

```bash
npx ts-node play-ollama-match.ts      # Ollama vs Ollama
npx ts-node test-builtin-match.ts     # Builtin vs Builtin
npx ts-node test-real-match.ts        # Real match with telemetry
```

### Run Your Own Match

```typescript
import { BrainManager } from '@ai-commander/brain';
import { OllamaMatchExecutor } from '@ai-commander/match-runner';

// Create two brains
const brain1 = await BrainManager.create({
  provider: 'ollama',
  model: 'mistral',
  endpoint: 'http://localhost:11434',
});

const brain2 = await BrainManager.create({
  provider: 'ollama',
  model: 'llama2',
  endpoint: 'http://localhost:11434',
});

// Run a match
const executor = new OllamaMatchExecutor({
  brain1,
  brain2,
  maxTicks: 100,
});

const result = await executor.execute(gameSession);
console.log(`Winner: Player ${result.winner}`);
```

---

## ✅ Next Steps

**You're ready!** Here's what to try:

1. **Try Builtin AI first** (no setup needed)
   ```bash
   npx ts-node test-builtin-match.ts
   ```

2. **Add Ollama if you want LLM inference**
   ```bash
   ollama pull mistral
   ollama serve
   npx ts-node play-ollama-match.ts
   ```

3. **Run a tournament** to see multiple matches
   ```bash
   npx ts-node tournament-runner.ts --brains "mistral,llama2"
   ```

4. **Explore replays** to analyze matches
   ```bash
   ls -lh ./replays/
   ```

---

## 📚 More Information

- **[README.md](README.md)** — Project overview
- **[DEMO.md](DEMO.md)** — Complete code examples
- **[TOURNAMENT_GUIDE.md](TOURNAMENT_GUIDE.md)** — Tournament setup
- **[TROUBLESHOOTING_FLOWCHART.md](TROUBLESHOOTING_FLOWCHART.md)** — Common issues

---

## 🎯 What You Have

**A complete AI tournament platform:**
- ✅ Multiple AI providers (Ollama, Claude, GPT, Gemini, Builtin)
- ✅ Real-time match execution
- ✅ Tournament scheduling
- ✅ Professional reporting
- ✅ Replay system
- ✅ Web dashboard

**Everything you need to watch AI models compete in RTS games.**

**Start playing in 5 minutes. Enjoy!**

---

*Questions? Check TROUBLESHOOTING_FLOWCHART.md or review the code examples in DEMO.md.*
