# 🚀 AI Commander — Getting Started

Welcome to AI Commander. This guide will get you running your first match in 5 minutes.

---

## 📋 Prerequisites

### Required
- **Node.js 22.0.0+** (not 18) — [Download here](https://nodejs.org/)
- **pnpm 9.0.0+** — `npm install -g pnpm`
- **Git** — For cloning the repo

### Optional (based on what you want to do)
- **Ollama** — For local LLM models (https://ollama.ai/)
- **0 A.D.** — For game window visualization (https://play0ad.com/)
- **Claude API key** — For using Claude brain (https://console.anthropic.com)
- **OpenAI API key** — For using GPT brain (https://platform.openai.com/api-keys)

---

## ⚡ 5-Minute Setup

### Step 1: Clone and Build

```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build
```

**Time:** ~3 minutes on typical machine  
**Disk:** ~500MB  
**Network:** ~100MB download

### Step 2: Run Your First Match

```bash
npx ts-node demo.ts
```

This runs a **Builtin vs Builtin** match (rule-based AI, no external dependencies).

**Expected Output:**
```
Starting match...
  Brain 1: Builtin
  Brain 2: Builtin
  Max ticks: 1000

Executing match...
[Tick 100] Player 1 expanded to North Territory
[Tick 200] Player 2 built Barracks
[Tick 350] Combat: Player 1 lost 3 units, killed 8
...
Match completed!
  Ticks run: 1000
  Duration: 12s
  Winner: Player 1
  Player 1 Commands: 156
  Player 2 Commands: 149
```

**That's it!** You have AI Commander running.

---

## 🎮 Next: Run With Ollama (Local AI)

### Step 1: Install Ollama

**Windows:**
- Download installer from https://ollama.ai/
- Run installer
- Restart terminal

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Step 2: Start Ollama Service

```bash
# In a NEW terminal window:
ollama serve

# Should output:
# Listening on 127.0.0.1:11434 (http)
```

Leave this running. This is the Ollama service.

### Step 3: Pull a Model (in another terminal)

```bash
ollama pull mistral
# Downloads ~5GB, takes 5-10 minutes depending on connection
```

Or pull multiple models:
```bash
ollama pull mistral    # Fast (7B params)
ollama pull llama2     # Medium (13B params)
```

### Step 4: Verify Ollama is Ready

```bash
curl http://localhost:11434/api/tags
# Should return JSON with list of models
```

### Step 5: Run an Ollama Match

```bash
npx ts-node demo.ts --player1 ollama --player2 ollama --model1 mistral --model2 llama2
```

Or use the SDK directly:

```typescript
import { BrainManager } from '@ai-commander/brain';
import { OllamaMatchExecutor } from '@ai-commander/match-runner';

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

// ... rest of match setup
```

---

## 🤖 Using Cloud AI (Claude, GPT, Gemini)

### Claude

1. Get your API key from https://console.anthropic.com
2. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Create brain:
   ```typescript
   const claude = await BrainManager.create({
     provider: 'claude',
     model: 'claude-3-sonnet-20240229',
   });
   ```

### OpenAI (GPT)

1. Get your API key from https://platform.openai.com/api-keys
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY=sk-...
   ```
3. Create brain:
   ```typescript
   const gpt = await BrainManager.create({
     provider: 'openai',
     model: 'gpt-4',
   });
   ```

### Google Gemini

1. Get your API key from https://aistudio.google.com/app/apikey
2. Set environment variable:
   ```bash
   export GOOGLE_API_KEY=...
   ```
3. Create brain:
   ```typescript
   const gemini = await BrainManager.create({
     provider: 'gemini',
     model: 'gemini-pro',
   });
   ```

---

## 🎯 Common First-Time Tasks

### Run Multiple Matches

```bash
#!/bin/bash
for i in {1..5}; do
  echo "Match $i..."
  npx ts-node demo.ts --no-replay
done
```

### Run a Tournament

```typescript
import { TournamentBracket } from '@ai-commander/match-runner';
import { BrainManager } from '@ai-commander/brain';

const participants = [
  { id: 'p1', name: 'Mistral', provider: 'ollama', model: 'mistral' },
  { id: 'p2', name: 'Llama2', provider: 'ollama', model: 'llama2' },
  { id: 'p3', name: 'Builtin', provider: 'builtin' },
];

const bracket = new TournamentBracket('round-robin', participants);

for (let match = bracket.getNextMatch(); match; match = bracket.getNextMatch()) {
  const result = await executor.execute(match);
  bracket.recordResult(match.matchId, result.winner);
}

const standings = bracket.getStandings();
console.table(standings);
```

### Save and Analyze Replays

All matches automatically save to `./replays/match-*.json` with full decision history.

Load and analyze:
```typescript
import fs from 'fs';

const replay = JSON.parse(fs.readFileSync('./replays/match-001.json', 'utf-8'));

console.log(`Winner: ${replay.winner}`);
console.log(`Ticks: ${replay.ticksRan}`);
console.log(`Player 1 Commands: ${replay.player1Commands}`);
console.log(`Player 2 Commands: ${replay.player2Commands}`);
console.log(`Decisions: ${replay.decisions.length}`);
```

---

## 🔧 Troubleshooting

### "Ollama connection failed"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If fails, start Ollama in another terminal
ollama serve

# If still fails, verify installation
ollama --version
```

### "Model not found"

```bash
# Check available models
ollama list

# Pull a model
ollama pull mistral
```

### "Node version error"

```bash
# Check your Node version
node --version

# Need 22.0.0 or higher
# Update Node from https://nodejs.org/
```

### "Build failed"

```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### "0 A.D. not found"

0 A.D. is optional. You can run matches without it.

If you want the game window:
1. Download from https://play0ad.com/
2. Install to default location
3. Framework will auto-detect

Or skip it and run with `--no-window`.

---

## 📊 What's in a Match?

Every match produces:

### Replay File (`./replays/match-*.json`)
- Complete match state at every tick
- All AI decisions with latency
- All events (expansions, combat, etc.)
- Full telemetry (CPU, memory, latency)

### Match Summary
```
Winner: Player 1
Duration: 67 seconds
Ticks: 1000
Commands Executed: 523
Commands Failed: 18
Decision Accuracy: 94%
```

### Event Log
```
[Tick 100] Player 1 Expansion to North Territory
[Tick 150] Player 2 Built 2 Barracks
[Tick 200] Combat: Player 1 killed 8, lost 3
[Tick 250] Player 2 Researched Iron Working
```

---

## 🎬 Full Workflow Example

Here's a realistic end-to-end workflow:

```bash
# 1. Setup (one-time)
cd ai-commander
pnpm install
pnpm build

# 2. In terminal 1: Start Ollama
ollama serve

# 3. In terminal 2: Create test directory
mkdir -p matches
cd matches

# 4. Run 5 matches
for i in {1..5}; do
  echo "Running match $i..."
  npx ts-node ../demo.ts --player1 ollama --player2 ollama
  sleep 2  # Brief pause between matches
done

# 5. Check results
ls -lh *.json

# 6. Analyze
npx ts-node << 'EOF'
import fs from 'fs';
import { glob } from 'glob';

const files = await glob('match-*.json');
for (const file of files) {
  const replay = JSON.parse(fs.readFileSync(file, 'utf-8'));
  console.log(`${file}: Winner=${replay.winner}, Ticks=${replay.ticksRan}`);
}
EOF
```

---

## ✅ Success Indicators

You'll know AI Commander is working when:

1. ✅ `pnpm build` completes without errors
2. ✅ `npx ts-node demo.ts` runs a match and produces output
3. ✅ A replay file appears in `./replays/`
4. ✅ You see decision log output with player actions
5. ✅ Match completes with a winner

---

## 🎯 Next Steps

1. **Read DEMO.md** — Complete walkthrough with code examples
2. **Run a tournament** — Multiple matches with standings
3. **Try different brains** — Builtin, Ollama, Claude, GPT
4. **Analyze replays** — Load match data for analysis
5. **Extend it** — Add new brain providers or game adapters

---

## 📚 More Information

- **[README.md](./README.md)** — Project overview
- **[RELEASE_NOTES.md](./RELEASE_NOTES.md)** — What's in v1.0
- **[DEMO.md](./DEMO.md)** — Complete code examples
- **[INSTALLATION_VALIDATION_REPORT.md](./INSTALLATION_VALIDATION_REPORT.md)** — Detailed installation validation

---

## 🎮 You're Ready!

AI Commander is installed and ready to use. Pick any brain provider (Builtin, Ollama, Claude, GPT) and watch two AI models compete.

**Happy tournaments!** 🚀
