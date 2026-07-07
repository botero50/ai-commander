# Getting Started: Run Tournaments with AI Commander

Complete index to everything you need.

---

## What You Have

✅ **Pre-built OpenRA Docker image** stored in `./docker-images/openra-rl-latest.tar.gz`  
✅ **Tournament framework** with CLI, APIs, and multiple LLM support  
✅ **Complete documentation** showing exactly how to run tournaments  

---

## The 3-Minute Version

```bash
# Terminal 1: Start game server
cd ./docker-images && ./run.sh

# Terminal 2: Run a tournament
npm run build
node ./packages/cli/dist/cli.js tournament --brain-a claude --brain-b gpt4 --games 3
```

Done! You'll see tournament results in the terminal.

---

## Detailed Guides (Read These)

### 1. **QUICK_START_TOURNAMENT.md** ← Start Here
- 5-minute setup guide
- Step-by-step instructions
- Expected output
- Troubleshooting

### 2. **RUN_TOURNAMENTS_SUMMARY.md** ← Main Reference
- How to run tournaments
- All tournament formats
- Available LLM models
- Configuration options
- Cost analysis
- Complete examples

### 3. **TOURNAMENT_GUIDE.md** ← Advanced Topics
- Experiment runner (compare hyperparameters)
- Real-time monitoring
- Custom configurations
- Integration with AI Commander

### 4. **DOCKER_DEPLOYMENT_READY.md** ← Infrastructure
- Quick reference for Docker image
- Deployment commands
- Troubleshooting
- Production setup

---

## Quick Command Reference

### Start the Game Server

```bash
cd ./docker-images
./load-and-run.sh    # First time: downloads game (~2 min)
./run.sh             # Every time after: starts server
```

### Run a Tournament

```bash
# Build first time
npm run build

# Quick test (3 games)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3

# Full series with results
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 10 \
  --export-path ./my-tournament
```

### Available Models

- `claude` — Claude 3 Opus (recommended, $0.42/game)
- `gpt4` — GPT-4 Turbo ($0.89/game)
- `gpt4-classic` — GPT-4 ($1.50/game)
- `ollama` — Free local model ($0.00/game)
- `gemini` — Google Gemini ($0.60/game)
- `builtin` — Mock for testing ($0.00/game)

---

## Document Map

```
GETTING_STARTED.md (you are here)
├── QUICK_START_TOURNAMENT.md
│   ├── 5-minute setup
│   ├── Expected output
│   └── Troubleshooting
│
├── RUN_TOURNAMENTS_SUMMARY.md
│   ├── How to run tournaments
│   ├── All formats and options
│   ├── Models and costs
│   ├── Complete examples
│   └── Best practices
│
├── TOURNAMENT_GUIDE.md
│   ├── Advanced configurations
│   ├── Experiment runner
│   ├── Real-time monitoring
│   └── Integrations
│
├── DOCKER_DEPLOYMENT_READY.md
│   ├── Docker image reference
│   ├── Quick start
│   ├── Troubleshooting
│   └── Production setup
│
└── docker-images/
    ├── openra-rl-latest.tar.gz (the image)
    ├── run.sh (quick start)
    ├── load-and-run.sh (setup)
    ├── README.md (directory info)
    └── LOAD_IMAGE.md (detailed guide)
```

---

## Step-by-Step: Your First Tournament

### Step 1: Understand What You're About to Do (2 min)

Read the **3-Minute Version** above or **QUICK_START_TOURNAMENT.md** for details.

### Step 2: Start the Game Server (5 min first time, 1 min after)

```bash
cd ./docker-images
./load-and-run.sh    # First time: downloads game content
```

This:
- Loads the Docker image from archive
- Creates a volume for game content
- Downloads game assets from openra.baxxster.no
- Verifies everything is ready

Then start the server:
```bash
./run.sh
```

Expected output:
```
Starting Xvfb on display :99...
Xvfb started (PID: 7)
Starting OpenRA-RL environment server...
```

### Step 3: Build AI Commander (2 min)

In another terminal:

```bash
npm run build
```

This compiles TypeScript to JavaScript.

### Step 4: Run a Tournament (3-20 min)

```bash
# Quick test: 3 games
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

This will:
1. Create Claude and GPT-4 agents
2. Play 3 games with player positions swapped
3. Show results in terminal
4. Display cost analysis

### Step 5: Review Results

Terminal output will show:
- Winner of each match
- Overall win rates
- Cost per game
- Total tournament cost
- Strategy analysis

---

## Common Scenarios

### Scenario 1: Quick Quality Check

```bash
# 2-3 games, low cost
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3 \
  --max-ticks 300
```

**Cost**: ~$2  
**Time**: ~10 minutes

### Scenario 2: Detailed Analysis

```bash
# 10 games with full results export
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 10 \
  --max-ticks 1000 \
  --export-path ./detailed-tournament \
  --verbose
```

**Cost**: ~$20  
**Time**: ~45 minutes  
**Output**: Replays, stats, HTML report

### Scenario 3: Budget Tournament

```bash
# Free models, unlimited games
node ./packages/cli/dist/cli.js tournament \
  --brain-a ollama \
  --brain-b builtin \
  --games 20
```

**Cost**: $0  
**Time**: ~2 hours  
**Output**: Full statistics, no API costs

### Scenario 4: Multi-Player Tournament

```bash
# 4 different models, round-robin
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --brain-c ollama \
  --brain-d gemini \
  --format tournament
```

**Cost**: ~$12 (6 games)  
**Time**: ~20 minutes  
**Output**: Rankings, Elo ratings

---

## Troubleshooting Quick Fixes

### "Connection refused on localhost:9999"
```bash
# Check if server is running
docker ps | grep openra-rl

# Start it
cd ./docker-images && ./run.sh
```

### "Cannot find module"
```bash
# Rebuild
npm run build
```

### "API key not found"
```bash
# Set environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Game times out
```bash
# Reduce ticks (faster, cheaper)
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 1 \
  --max-ticks 300
```

For more troubleshooting, see **RUN_TOURNAMENTS_SUMMARY.md**.

---

## What Happens Under the Hood

```
You run tournament command
         ↓
CLI parses arguments
         ↓
BrainManager creates LLM agents (Claude, GPT-4, etc.)
         ↓
TournamentEngine schedules matches
         ↓
For each match:
  AI Agent decides move → GameAdapter translates → gRPC request
         ↓
Docker Container runs OpenRA
         ↓
Game engine executes commands
         ↓
Game state returned to AI Agent
         ↓
BenchmarkReporter analyzes results
         ↓
Display results + cost
```

---

## Key Concepts

### Brain
An AI agent that plays the game. Can be Claude, GPT-4, Ollama, etc.

### Tournament
Multiple games scheduled in a specific format (single, multi, best-of, round-robin).

### Match
One game between two brains. Takes 2-5 minutes depending on game length.

### Format
- **Single**: 1 match between 2 brains
- **Multi**: N matches, swap players (eliminates first-player advantage)
- **Best-Of**: Competition format (N games, first to M wins)
- **Tournament**: Round-robin (every brain plays every other brain)

### Cost
Based on number of API calls × tokens used per call.
Varies by model and game length.

---

## Documentation File Sizes

| File | Size | Read Time |
|------|------|-----------|
| GETTING_STARTED.md | This file | 5 min |
| QUICK_START_TOURNAMENT.md | ~8 KB | 5 min |
| RUN_TOURNAMENTS_SUMMARY.md | ~15 KB | 10 min |
| TOURNAMENT_GUIDE.md | ~18 KB | 15 min |
| DOCKER_DEPLOYMENT_READY.md | ~6 KB | 3 min |

**Total documentation**: ~47 KB, ~38 minutes to read fully  
**Essentials to start**: QUICK_START_TOURNAMENT.md, ~5 minutes

---

## Next Steps

1. **Right now**: Read **QUICK_START_TOURNAMENT.md** (5 min)
2. **In 2 minutes**: Start the game server with `./docker-images/run.sh`
3. **In 5 minutes**: Build and run your first tournament
4. **After first tournament**: Read **RUN_TOURNAMENTS_SUMMARY.md** for options

---

## Success Checklist

- [ ] Read QUICK_START_TOURNAMENT.md
- [ ] Docker image loaded (`./load-and-run.sh`)
- [ ] Game server running (`./run.sh`)
- [ ] npm run build completed
- [ ] First tournament executed and completed
- [ ] Results displayed in terminal
- [ ] Cost analysis shown

✅ **All checked? You've successfully run a tournament!**

---

## Support & Resources

- **CLI Documentation**: See `packages/cli/src/cli.ts`
- **Tournament Engine**: See `packages/fake-game-adapter/src/world/tournament-engine.ts`
- **Brain Manager**: See `packages/brain/` for LLM integration
- **OpenRA Adapter**: See `packages/openra-adapter/` for game integration

---

## Quick Links

- Docker image: `./docker-images/openra-rl-latest.tar.gz`
- Game server: `./docker-images/run.sh`
- Tournament CLI: `packages/cli/src/cli.ts`
- Example configs: See **RUN_TOURNAMENTS_SUMMARY.md**

---

**Ready? Start with QUICK_START_TOURNAMENT.md and run your first tournament!**
