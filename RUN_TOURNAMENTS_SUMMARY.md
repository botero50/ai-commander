# How to Run Tournaments with AI Commander

Complete summary showing exactly how to run tournaments with the OpenRA game environment.

---

## The Setup You Have

✅ **Docker Image**: Pre-built and stored at `./docker-images/openra-rl-latest.tar.gz`  
✅ **Game Server**: Ready to run with `./docker-images/run.sh`  
✅ **Tournament Framework**: Built-in CLI and TypeScript APIs  
✅ **Multiple LLM Support**: Claude, GPT-4, Ollama, Gemini, etc.  

---

## Running Your First Tournament (5 minutes)

### Step 1: Start the Game Server

```bash
cd ./docker-images
./load-and-run.sh    # First time: downloads game content (~2 min)
./run.sh             # Starts the server (every time after)
```

The gRPC server will be running on `localhost:9999`.

### Step 2: Build AI Commander

```bash
npm run build
```

Compiles TypeScript to JavaScript.

### Step 3: Run a Tournament

```bash
# Quick 3-game tournament
npx ts-node ./packages/cli/src/cli.ts tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

Or with compiled JS:

```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3
```

**Result**: Tournament plays 3 games, shows results, displays cost analysis.

---

## Tournament Formats

### 1. Single Match (Quick Test)
```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --format single
```
**Time**: 2-5 minutes | **Cost**: ~$0.50

### 2. Multi-Match Series (Default, Balanced)
```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --format multi
```
**Features**: 
- Each brain plays both player 1 and player 2
- Eliminates first-player advantage
- Win rate calculation
- Best-of-N style

**Time**: ~15-20 minutes for 5 games | **Cost**: ~$4

### 3. Best-Of Series (Competition)
```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 7 \
  --format best-of
```
**Features**: 
- Best-of-7 format (first to 4 wins)
- Tournament-style brackets
- Competitive ranking

### 4. Round-Robin (Multiple Competitors)
```bash
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --brain-c ollama \
  --brain-d gemini \
  --format tournament
```
**Features**: 
- Every competitor plays every other (6 total games for 4 players)
- Elo rating system
- Full rankings
- Head-to-head records

---

## Available LLM Models (Brains)

| Brain | Command | Notes | Cost |
|-------|---------|-------|------|
| **Claude 3 Opus** | `--brain-a claude` | Recommended (best balance) | $0.42/game |
| **GPT-4 Turbo** | `--brain-a gpt4` | Fast, good quality | $0.89/game |
| **GPT-4** | `--brain-a gpt4-classic` | Most capable (expensive) | $1.50/game |
| **Ollama (Local)** | `--brain-a ollama` | Free, runs on your machine | $0.00/game |
| **Gemini** | `--brain-a gemini` | Google's model | $0.60/game |
| **Builtin Mock** | `--brain-a builtin` | Deterministic, no API key | $0.00/game |

### Common Matchups

```bash
# Budget: Free models
npm run tournament -- --brain-a builtin --brain-b ollama --games 10

# Standard: Claude vs GPT-4
npm run tournament -- --brain-a claude --brain-b gpt4 --games 5

# Quality: Most capable models
npm run tournament -- --brain-a claude --brain-b gpt4-classic --games 3

# Local: Test with no API keys
npm run tournament -- --brain-a ollama --brain-b ollama --games 5
```

---

## Configuration Options

### Basic Options

```bash
--brain-a <model>          # First brain (see table above)
--brain-b <model>          # Second brain
--games <number>           # Number of games (default: 5)
--format <format>          # single|multi|best-of|tournament (default: multi)
```

### Game Settings

```bash
--max-ticks <number>       # Max ticks per game (default: 500)
                           # More ticks = longer games, more decisions
                           # Costs ~1 token per 2 ticks

--map <map>                # Specific map: rain, island, sparse
--seed <number>            # Reproducible map generation
--map-rotation             # Random map each game
```

### Output Options

```bash
--export-path <dir>        # Save results and replays to directory
--export-replays           # Save .rep replay files
--verbose                  # Show detailed logs and API calls
```

### Advanced

```bash
--temperature <0.0-1.0>    # Sampling randomness (0.3 = consistent, 1.0 = creative)
--max-tokens <number>      # Max tokens per decision
--config <file.json>       # Load from config file
```

---

## Example Commands

### Budget Tournament (Free)

```bash
# No API keys needed, runs locally
npm run tournament -- \
  --brain-a ollama \
  --brain-b builtin \
  --games 10 \
  --format multi
```

### Quick Quality Check

```bash
# Fast test with quality models
npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --games 3 \
  --max-ticks 300
```

### Detailed Analysis

```bash
# Longer games, save results
npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --games 10 \
  --max-ticks 1000 \
  --export-path ./detailed-analysis \
  --verbose
```

### Experiment: Temperature Sweep

```bash
# Compare different temperature settings
npm run experiments -- \
  --baseline claude \
  --variants "temperature-0.3,temperature-0.7,temperature-1.0" \
  --tournaments-per-variant 3 \
  --games 5
```

---

## Understanding the Output

### Tournament Results Display

```
🎮 AI Commander OpenRA Tournament
===================================

Running 5 matches: claude vs gpt4

Match 1: claude (Player 1) vs gpt4 (Player 2)
  ✓ Completed in 2m 34s
  Winner: claude (conquest)

Match 2: gpt4 (Player 1) vs claude (Player 2)
  ✓ Completed in 1m 58s
  Winner: claude (conquest)

[... matches 3-5 ...]

═══════════════════════════════════════════════════

📊 Final Results:

  claude: 4 wins, 1 loss (80.0% win rate)
  gpt4:   1 win,  4 losses (20.0% win rate)

💰 Cost Analysis:
  Model       | Games | Avg Cost/Game | Total
  ────────────┼───────┼───────────────┼──────
  claude      | 5     | $0.42         | $2.10
  gpt4        | 5     | $0.89         | $4.45
  
  Total tournament cost: $6.55

✅ Tournament complete!
```

### What the Metrics Mean

- **Win Rate**: Percentage of games won (higher is better)
- **Cost/Game**: Average API cost per game
- **Total Cost**: Sum of all API calls used
- **Duration**: Real wall-clock time taken
- **Winner**: Who won overall by wins

---

## Complete Workflow

### Scenario: Compare Two LLM Strategies

```bash
#!/bin/bash

# Start game server in background
cd ./docker-images
./run.sh &
SERVER_PID=$!

# Wait for server to be ready
sleep 5

# Build the project
npm run build

# Run tournament with results export
node ./packages/cli/dist/cli.js tournament \
  --brain-a claude \
  --brain-b gpt4 \
  --games 10 \
  --format multi \
  --export-path ./my-tournament \
  --verbose

# Generate HTML report
node ./packages/cli/dist/cli.js report \
  --input ./my-tournament/results.json \
  --format html \
  --output ./my-tournament/index.html

# Stop server
kill $SERVER_PID

echo "✅ Tournament complete! Results in ./my-tournament/"
```

### Results Files Generated

```
my-tournament/
├── results.json          # Raw tournament data
├── summary.txt           # Text summary
├── standings.csv         # CSV standings
├── replay-1.rep          # Game 1 replay
├── replay-2.rep          # Game 2 replay
├── replay-3.rep          # etc.
└── index.html            # HTML report (optional)
```

---

## Troubleshooting

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

# Try again
node ./packages/cli/dist/cli.js tournament ...
```

### "API key not found"

```bash
# Set environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Or create .env file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
EOF

# Then run tournament
npm run tournament -- ...
```

### Game times out or is slow

```bash
# Reduce complexity
npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --games 1 \
  --max-ticks 300  # Shorter games = faster, cheaper
```

---

## Cost Reference

### Per-Game Costs (Typical)

| Model | Tokens/Game | Cost/Game |
|-------|-------------|-----------|
| Claude | 1,400 | $0.42 |
| GPT-4 Turbo | 1,200 | $0.89 |
| GPT-4 | 1,200 | $1.50 |
| Ollama | ∞ | $0.00 |
| Gemini | 1,300 | $0.60 |

### Total Tournament Costs

| Format | Games | Models | Est. Cost |
|--------|-------|--------|-----------|
| Single | 1 | claude + gpt4 | $1.31 |
| Multi | 5 | claude + gpt4 | $6.55 |
| Best-Of | 7 | claude + gpt4 | $9.17 |
| 4-Player Tournament | 6 | 4 different | ~$20 |

---

## Next Steps

### For Immediate Use

1. **Read**: `QUICK_START_TOURNAMENT.md` (5-min quickstart)
2. **Run**: `./docker-images/run.sh` (start server)
3. **Execute**: `npm run build && node ./packages/cli/dist/cli.js tournament --brain-a claude --brain-b gpt4 --games 3`

### For Advanced Use

1. **Explore**: `TOURNAMENT_GUIDE.md` (complete reference)
2. **Experiment**: Use ExperimentRunner for hyperparameter sweeps
3. **Analyze**: Export replays and use ReplayPlayer

### For Research

- Compare multiple models systematically
- Test different game parameters
- Analyze AI decision-making with StrategyAnalyzer
- Generate statistical reports

---

## Key Takeaways

✅ **Simple**: One command to run tournaments  
✅ **Flexible**: Multiple formats and model combinations  
✅ **Observable**: Real-time results and detailed analysis  
✅ **Reproducible**: Save replays, configs, and results  
✅ **Cost-Controlled**: Choose models based on budget  

---

**Ready to run your tournament?** Start with `QUICK_START_TOURNAMENT.md`!
