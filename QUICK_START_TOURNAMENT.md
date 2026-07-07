# Quick Start: Run Your First Tournament

Get a tournament running in 5 minutes.

---

## Prerequisites

✅ **Done Already:**
- Docker image stored and ready: `./docker-images/openra-rl-latest.tar.gz`
- Node.js 22+ installed
- API keys for LLMs (Claude, GPT-4, etc.)

---

## Step 1: Start the OpenRA Game Server (2 min)

### Setup (First Time Only)

This downloads the game content (~500 MB, ~2 minutes).

#### **Windows (PowerShell or Git Bash)**

```bash
cd ./docker-images
bash load-and-run.sh
```

Or manually:
```bash
# Load image
docker load < openra-rl-latest.tar.gz

# Create volume
docker volume create openra-content

# Download game content
docker run --rm -v openra-content:/root/.config/openra/Content ^
  openra-rl:latest bash -c "mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc} && cd /tmp && curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip && unzip -q ra.zip && cp *.mix /root/.config/openra/Content/ra/v2/ && cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true && cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true"
```

#### **Mac (Terminal/zsh)**

```bash
cd ./docker-images
bash load-and-run.sh
```

Or manually:
```bash
docker load < openra-rl-latest.tar.gz
docker volume create openra-content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c "mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc} && cd /tmp && curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip && unzip -q ra.zip && cp *.mix /root/.config/openra/Content/ra/v2/ && cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true && cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true"
```

#### **Linux (bash/zsh)**

```bash
cd ./docker-images
bash load-and-run.sh
```

Or manually:
```bash
docker load < openra-rl-latest.tar.gz
docker volume create openra-content
docker run --rm -v openra-content:/root/.config/openra/Content \
  openra-rl:latest bash -c "mkdir -p /root/.config/openra/Content/ra/v2/{expand,cnc} && cd /tmp && curl -sL -o ra.zip https://openra.baxxster.no/openra/ra-quickinstall.zip && unzip -q ra.zip && cp *.mix /root/.config/openra/Content/ra/v2/ && cp expand/* /root/.config/openra/Content/ra/v2/expand/ 2>/dev/null || true && cp cnc/* /root/.config/openra/Content/ra/v2/cnc/ 2>/dev/null || true"
```

### Start Server (Every Time)

Terminal 1 - Start the game server:

#### **Windows (PowerShell or Git Bash)**
```bash
cd ./docker-images
bash run.sh
```

Or manually:
```bash
docker run -p 9999:9999 -v openra-content:/root/.config/openra/Content openra-rl:latest
```

#### **Mac (Terminal/zsh)**
```bash
cd ./docker-images
bash run.sh
```

Or manually:
```bash
docker run -p 9999:9999 -v openra-content:/root/.config/openra/Content openra-rl:latest
```

#### **Linux (bash/zsh)**
```bash
cd ./docker-images
bash run.sh
```

Or manually:
```bash
docker run -p 9999:9999 -v openra-content:/root/.config/openra/Content openra-rl:latest
```

Expected output:
```
Starting Xvfb on display :99...
Xvfb started (PID: 7)
Starting OpenRA-RL environment server...
```

The server is now running on `localhost:9999`.

---

## Step 2: Build AI Commander (1 min)

Terminal 2 - Compile the TypeScript code:

```bash
npm run build
```

This compiles all packages and creates runnable JS files.

---

## Step 3: Run Your First Tournament (2 min)

Terminal 2 - Run a simple tournament:

```bash
# 3-game tournament: Claude vs GPT-4
npx ts-node ./packages/cli/src/cli.ts tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3 \
  --format multi
```

Or compiled version:
```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

**What happens:**
1. Creates Claude and GPT-4 agents
2. Plays 3 games (Claude player 1 → 2, GPT-4 player 2 → 1)
3. Displays results in terminal
4. Generates cost analysis

---

## Expected Output

```
🎮 AI Commander OpenRA Tournament
===================================

Running 3 matches: claude vs gpt4

Match 1: claude (Player 1) vs gpt4 (Player 2)
  Game started on island map...
  ✓ Match completed in 2m 34s
  Winner: claude (won by conquest at tick 487)

Match 2: gpt4 (Player 1) vs claude (Player 2)
  Game started on sparse map...
  ✓ Match completed in 1m 58s
  Winner: claude (won by conquest at tick 412)

Match 3: claude (Player 1) vs gpt4 (Player 2)
  Game started on rain map...
  ✓ Match completed in 3m 12s
  Winner: gpt4 (won by conquest at tick 654)

═══════════════════════════════════════════════════

📊 Final Results:

  claude: 2 wins, 1 loss → 66.7% win rate
  gpt4:   1 win,  2 losses → 33.3% win rate

💰 Cost Analysis:
  claude: ~$0.42 per game (1,400 tokens avg)
  gpt4:   ~$0.89 per game (1,200 tokens avg)
  
  Total tournament cost: ~$3.93

✅ Tournament complete!
```

---

## What's Happening Under the Hood

```
AI Agent (Claude/GPT-4)
         ↓
    Planner + Decision Engine
         ↓
    Game Commands (move, attack, build)
         ↓
gRPC Request → OpenRA Docker Container
         ↓
OpenRA Game Engine (runs the actual game)
         ↓
Game State (units, resources, map)
         ↓
gRPC Response → AI Agent
         ↓
Next decision...
```

---

## Next: Try Different Configurations

### 1. Different Models

```bash
# Claude vs Ollama (free, local)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b ollama \
  --games 5

# Budget match: GPT-4 Turbo vs local Ollama
node ./packages/cli/dist/cli.js tournament \
  --brain-a gpt4-turbo \
  --brain-b ollama \
  --games 3
```

### 2. Longer Games (More Decisions)

```bash
# More ticks = more decision points = higher costs
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3 \
  --max-ticks 1000
```

### 3. Save Results

```bash
# Export tournament results
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --export-path ./my-tournament-results
```

### 4. Verbose Logging (See API Calls)

```bash
# See exactly what the AI is doing
DEBUG=openra-adapter:* node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 1 \
  --verbose
```

---

## Troubleshooting

### Error: "Cannot find module"

```bash
# Rebuild the project
npm run build

# Then try again
node ./packages/cli/dist/cli.js tournament ...
```

### Error: "Connection refused on localhost:9999"

```bash
# Make sure the OpenRA server is running
docker ps | grep openra

# If not running:
cd ./docker-images
./run.sh
```

### Error: "API key not found"

```bash
# Set your API keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Or create .env file in project root
echo 'OPENAI_API_KEY=sk-...' > .env
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env

# Then run tournament
node ./packages/cli/dist/cli.js tournament ...
```

### Game times out / Takes too long

```bash
# Reduce max ticks (faster, cheaper)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 1 \
  --max-ticks 300
```

---

## Reference Commands

### Tournament Formats

```bash
# Single match (quick test)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --format single

# Multi-match series (balanced)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --format multi

# Best-of series (competition style)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 7 \
  --format best-of
```

### Available Brains

- `claude` — Claude 3 Opus (recommended)
- `gpt4` — GPT-4 Turbo
- `gpt4-classic` — GPT-4 (most capable, expensive)
- `ollama` — Local Ollama (free)
- `gemini` — Google Gemini
- `builtin` — Deterministic mock (for testing)

### Common Options

```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a <model>              # First brain
  --brain-b <model>              # Second brain
  --games <number>               # Number of games (default: 5)
  --max-ticks <number>           # Max ticks per game (default: 500)
  --format <format>              # single|multi|best-of|tournament
  --export-path <dir>            # Save results to directory
  --map <map>                    # Specific map name
  --verbose                      # Show detailed logs
```

---

## Full Workflow Example

```bash
# Terminal 1: Start game server
cd ./docker-images
./run.sh

# Terminal 2: Build and run tournament
cd ~/ai-commander
npm run build

node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --export-path ./my-first-tournament

# Results saved to ./my-first-tournament/
```

---

## Performance Tips

1. **First run is slower** (warming up models, downloading content)
2. **Games take 2-5 minutes each** (depends on max-ticks, model response time)
3. **API costs vary** (~$0.40-0.90 per game)
4. **Run shorter games first** to test setup before long tournaments

---

## What to Explore Next

- **TOURNAMENT_GUIDE.md** — Advanced configurations and formats
- **ExperimentRunner** — Compare hyperparameter combinations
- **ReplayPlayer** — Watch saved games
- **StrategyAnalyzer** — Understand AI decision-making

---

✅ **You're ready! Start with step 1 and run your tournament!**
