# Running Tournaments with AI Commander

Complete guide to running OpenRA tournaments between AI agents.

---

## Quick Start (5 minutes)

### Step 1: Start the OpenRA Game Server

```bash
cd ./docker-images
./load-and-run.sh    # First time only (setup)
./run.sh             # Start the server
```

Expected output:
```
Starting Xvfb on display :99...
Xvfb started (PID: 7)
Starting OpenRA-RL environment server...
```

The gRPC server is now listening on `localhost:9999`.

### Step 2: Run a Tournament

In another terminal:

```bash
# Single match
npm run tournament -- --brain-a claude --brain-b gpt4 --format single

# 5 matches series
npm run tournament -- --brain-a claude --brain-b gpt4 --games 5 --format multi

# 10 matches tournament
npm run tournament -- --brain-a claude --brain-b gpt4 --games 10 --format tournament
```

### Step 3: Watch Results

The tournament runner will display:
```
🎮 AI Commander OpenRA Tournament
===================================

Running 5 matches: claude vs gpt4

Match 1: claude (player 1) vs gpt4 (player 2)
  ✓ Completed in 2m 34s
  Winner: claude (won by conquest)

Match 2: gpt4 (player 1) vs claude (player 2)
  ✓ Completed in 1m 58s
  Winner: claude (won by conquest)

[... more matches ...]

📊 Final Results:
  claude: 4 wins, 1 loss (80% win rate)
  gpt4:   1 win,  4 losses (20% win rate)

💰 Cost Analysis:
  claude: $0.42 per game
  gpt4:   $0.89 per game
```

---

## Tournament Formats

### Single Match
Run one game between two brains.

```bash
npm run tournament -- --brain-a claude --brain-b gpt4 --format single
```

**Output**: One game, detailed analysis  
**Duration**: 2-5 minutes  
**Cost**: ~$0.40-0.90

### Multi-Match (Default)
Run multiple games, swapping player positions.

```bash
npm run tournament -- --brain-a claude --brain-b gpt4 --games 5 --format multi
```

**Features**:
- Each brain plays both player 1 and player 2
- Eliminates first-player advantage
- Best-of series statistics
- Win rate calculation

**Duration**: `games * 3-5 minutes`  
**Cost**: `games * $0.80`

### Round-Robin Tournament
Every brain plays every other brain once.

```bash
npm run tournament -- --brain-a claude --brain-b gpt4 --brain-c ollama --format tournament
```

**Features**:
- Complete matchups
- Elo rating calculation
- Ranking by wins/losses
- Head-to-head records

**Duration**: `(n choose 2) * 3-5 minutes`  
**Cost**: `(n choose 2) * $0.80`

---

## Available Brains

Run tournaments between any of these LLM providers:

| Brain | Command | Notes |
|-------|---------|-------|
| Claude (Opus) | `--brain-a claude` | Default, recommended |
| GPT-4 Turbo | `--brain-a gpt4` | Fast, lower cost |
| GPT-4 | `--brain-a gpt4-classic` | Most capable (expensive) |
| Ollama (Local) | `--brain-a ollama` | Free, requires Ollama running |
| Gemini | `--brain-a gemini` | Google's model |
| Builtin Mock | `--brain-a builtin` | Deterministic, no API key needed |

### Example Matchups

```bash
# Claude vs GPT-4
npm run tournament -- --brain-a claude --brain-b gpt4 --games 10

# Claude vs Local Ollama (free)
npm run tournament -- --brain-a claude --brain-b ollama --games 5

# Budget: GPT-4 Turbo vs Ollama
npm run tournament -- --brain-a gpt4 --brain-b ollama --games 10

# Three-way tournament
npm run tournament -- --brain-a claude --brain-b gpt4 --brain-c ollama
```

---

## Advanced Configuration

### Custom Configuration File

Create `tournament.config.json`:

```json
{
  "brainA": "claude",
  "brainB": "gpt4",
  "games": 10,
  "format": "multi",
  "maxTicksPerGame": 500,
  "exportPath": "./tournament-results",
  "verbose": true,
  "mapRotation": ["rain", "island", "sparse"],
  "parameters": {
    "claude": {
      "temperature": 0.7,
      "maxTokens": 2000
    },
    "gpt4": {
      "temperature": 0.9,
      "maxTokens": 2000
    }
  }
}
```

Then run:
```bash
npm run tournament -- --config tournament.config.json
```

### Environment Variables

```bash
# Set API keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."

# Optional: Ollama endpoint
export OLLAMA_HOST="http://localhost:11434"

# Run tournament
npm run tournament -- --brain-a claude --brain-b gpt4 --games 5
```

### Game Settings

```bash
# Longer games (more ticks = more decision points)
npm run tournament -- --brain-a claude --brain-b gpt4 --max-ticks 1000

# Shorter games (faster, cheaper)
npm run tournament -- --brain-a claude --brain-b gpt4 --max-ticks 300

# Specific map
npm run tournament -- --brain-a claude --brain-b gpt4 --map "island"

# Random maps each game
npm run tournament -- --brain-a claude --brain-b gpt4 --map-rotation
```

---

## Experiment Runner: Test Hyperparameters

Compare different LLM configurations systematically.

```bash
npm run experiments -- \
  --baseline claude \
  --variants temperature-0.3,temperature-0.7,temperature-1.0 \
  --tournaments-per-variant 3 \
  --maps 5
```

This will:
1. Create 3 variants (different temperatures)
2. Run 3 tournaments per variant
3. Play 5 different maps each
4. Rank by win rate + consistency

**Output**: Comparison report with recommendations

```
Variant Rankings:
1. temperature-0.7 (76% win rate, ±3% consistency)
2. temperature-0.3 (72% win rate, ±5% consistency)
3. temperature-1.0 (68% win rate, ±8% consistency)

Recommendation: Use temperature=0.7 for best balance of performance and stability
```

---

## Real-Time Monitoring

### Watch a Game Live

```bash
# Start server with VNC output
docker run -p 9999:9999 -p 5900:5900 \
  -v openra-content:/root/.config/openra/Content \
  openra-rl:latest

# Connect VNC viewer to localhost:5900
# Or open noVNC: http://localhost:6080
```

### Monitor API Calls

```bash
# Enable verbose logging
export DEBUG=openra-adapter:*
npm run tournament -- --brain-a claude --brain-b gpt4 --verbose
```

### Collect Game Replays

```bash
npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --export-replays ./replays/
```

Replays will be saved as `.rep` files (OpenRA replay format).

---

## Results & Analysis

### Tournament Output Files

When you run with `--export-path`:

```
tournament-results/
├── report.json          # Raw results
├── summary.txt          # Human-readable summary
├── standings.csv        # CSV for spreadsheets
├── replay-1.rep         # Game replay files
├── replay-2.rep
└── analysis.md          # Detailed analysis
```

### Parsing Results Programmatically

```typescript
import { readFileSync } from 'fs';

const report = JSON.parse(
  readFileSync('./tournament-results/report.json', 'utf-8')
);

console.log(`Winner: ${report.winner.name}`);
console.log(`Win Rate: ${report.standings[0].winRate}%`);
console.log(`Cost: $${report.costUSD}`);
```

### Cost Analysis

After each tournament, you'll see:

```
📊 Cost Analysis:
  Model Cost per 1K Tokens | Games Played | Avg Tokens/Game | Total Cost
  claude      $0.003/$0.015 | 5            | 1,400           | $0.42
  gpt4        $0.015/$0.050 | 5            | 1,200           | $0.89
```

---

## Troubleshooting

### Error: "Connection refused on localhost:9999"

```bash
# Check if server is running
docker ps | grep openra-rl

# If not running, start it
cd ./docker-images
./run.sh
```

### Error: "API key not found"

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Or create .env file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
EOF

npm run tournament -- --brain-a claude --brain-b gpt4
```

### Game times out (incomplete)

```bash
# Increase max ticks
npm run tournament -- --brain-a claude --brain-b gpt4 --max-ticks 1000
```

### Out of memory

```bash
# Reduce concurrent games
npm run tournament -- --brain-a claude --brain-b gpt4 --games 1
```

---

## Scripts Reference

```bash
# Start OpenRA server
npm run server:openra

# Run quick tournament (2 games)
npm run tournament:quick

# Run long tournament (20 games, detailed analysis)
npm run tournament:long

# Run experiment suite
npm run experiments

# Generate rankings from past results
npm run rankings -- --results-dir ./tournament-results

# Replay a game
npm run replay -- --file ./tournament-results/replay-1.rep
```

---

## Examples

### Example 1: Quick Benchmark

```bash
#!/bin/bash
# Quick 5-game benchmark between models

cd ./docker-images
./run.sh &
SERVER_PID=$!

sleep 5

npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --games 5 \
  --export-path ./quick-benchmark

kill $SERVER_PID
echo "Results saved to ./quick-benchmark"
```

### Example 2: Temperature Sweep

```bash
# Test 3 temperature values, 3 tournaments each

npm run experiments -- \
  --baseline claude \
  --variants "temperature-0.3,temperature-0.7,temperature-1.0" \
  --tournaments-per-variant 3 \
  --maps 3 \
  --export-path ./temperature-sweep
```

### Example 3: Multi-Player Tournament

```bash
# 4-player round-robin tournament

npm run tournament -- \
  --brain-a claude \
  --brain-b gpt4 \
  --brain-c ollama \
  --brain-d builtin \
  --format tournament \
  --export-path ./4player-tournament
```

### Example 4: Continuous Testing

```bash
# Run tournament every day, track improvements

while true; do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  npm run tournament -- \
    --brain-a claude \
    --brain-b gpt4 \
    --games 10 \
    --export-path ./results/$TIMESTAMP
  
  sleep 86400  # 24 hours
done
```

---

## Best Practices

### 1. **Control Variables**
- Fix map selection when comparing models
- Use consistent `--max-ticks` across runs
- Keep game count high enough (5+ games) to reduce variance

### 2. **Cost Management**
- Start with cheap models (gpt4-turbo, builtin)
- Use `--max-ticks` to reduce token usage
- Test on small game counts first (2-3 games)

### 3. **Statistical Validity**
- Run at least 5 games per configuration
- Track multiple metrics (win rate, cost, latency)
- Use experiment runner for proper statistical comparison

### 4. **Reproducibility**
- Save configuration to JSON file
- Export results with timestamps
- Document environmental setup (API keys, versions)

---

## Next Steps

1. **Start Server**: `./docker-images/run.sh`
2. **Run First Tournament**: `npm run tournament -- --brain-a claude --brain-b gpt4 --games 3`
3. **Review Results**: Check cost, win rates, strategy analysis
4. **Experiment**: Try different models and parameters
5. **Automate**: Set up recurring tournaments or batch experiments

---

## References

- [ExperimentRunner](./packages/experiment-runner/) — Compare hyperparameters
- [TournamentEngine](./packages/fake-game-adapter/src/world/tournament-engine.ts) — Match scheduling
- [OpenRA Adapter](./packages/openra-adapter/) — Game integration
- [Brain SDK](./packages/brain/) — LLM interface
