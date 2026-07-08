# AI Commander — Getting Started Guide

Welcome to AI Commander! This guide will walk you through setting up and using the CLI to run AI tournaments.

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** — [Download here](https://nodejs.org/)
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **pnpm** — Package manager
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 8.0.0 or higher
   ```

3. **0 A.D.** (optional) — For live match visualization
   - Download from [play0ad.com](https://play0ad.com/)
   - Install to default location: `C:\Program Files\0 A.D\`

4. **Ollama** — For AI brain
   ```bash
   # Download from https://ollama.ai/
   # Verify installation:
   ollama --version
   
   # Pull a model (or use existing)
   ollama pull llama2
   ```

---

## 🚀 Setup

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd C:\Users\boter\ai-commander

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Step 2: Configure Paths (Optional)

The CLI looks for 0 A.D. in the default location. If installed elsewhere:

```bash
# Create local config file
cat > ~/.ai-commander/config.json << EOF
{
  "gameDataPath": "C:\\your\\path\\to\\0 A.D\\binaries\\data",
  "modPath": "C:\\your\\path\\to\\0 A.D\\binaries\\data\\mods\\public",
  "replayDir": "./replays"
}
EOF
```

### Step 3: Start Ollama Service

```bash
# In a separate terminal, start Ollama
ollama serve

# Verify it's running (in another terminal)
curl http://localhost:11434/api/tags
```

---

## 💡 Usage

### 1️⃣ Start a Single Match

**Description**: Run a complete match between two AI brains and save the replay.

```bash
ai-commander match start \
  --brain1 "Ollama" \
  --brain2 "Ollama" \
  --max-ticks 5000
```

**Options**:
- `--brain1 <name>` — First AI brain (default: "Ollama")
- `--brain2 <name>` — Second AI brain (default: "Ollama")
- `--max-ticks <number>` — Maximum game ticks (default: 5000)
- `--replay-dir <path>` — Where to save replays (default: ./replays)
- `--no-window` — Don't launch 0 A.D. window
- `--no-replay` — Don't save replay file
- `--verbose` — Show detailed logs

**Example Output**:
```
Starting match...
  Brain 1: Ollama
  Brain 2: Ollama
  Max ticks: 5000
  Replay dir: ./replays

Executing match...
Match completed!
  Ticks run: 3450
  Duration: 45.0s
  Player 1: Ollama (156 commands, 4 errors)
  Player 2: Ollama (149 commands, 5 errors)
  Winner: Ollama

Saving replay...
Replay saved to: ./replays/match-001.json
```

**Quick Start**:
```bash
# Simplest possible command (all defaults)
ai-commander match start

# Watch it with 0 A.D. window open
ai-commander match start --brain1 Ollama --brain2 Ollama

# Quick test (1000 ticks)
ai-commander match start --max-ticks 1000

# Save to custom location
ai-commander match start --replay-dir "C:\tournaments\replays"
```

---

### 2️⃣ Run a Tournament

**Description**: Execute multiple matches between brains with rankings and ELO ratings.

```bash
# Use a preset
ai-commander tournament run --preset multi-llm

# Or configure manually
ai-commander tournament run \
  --brains "Ollama,Ollama,Ollama" \
  --format round_robin \
  --max-ticks 5000
```

**Presets Available**:
1. **ollama-vs-ollama** — Two local Ollama instances
   ```bash
   ai-commander tournament run --preset ollama-vs-ollama
   ```

2. **multi-llm** — Ollama, Claude, and GPT (requires API keys)
   ```bash
   ai-commander tournament run --preset multi-llm
   ```

3. **builtin-vs-ollama** — Builtin AI vs Ollama
   ```bash
   ai-commander tournament run --preset builtin-vs-ollama
   ```

4. **quick-match** — Single fast match (1000 ticks)
   ```bash
   ai-commander tournament run --preset quick-match
   ```

5. **long-match** — Single extended match (10000 ticks)
   ```bash
   ai-commander tournament run --preset long-match
   ```

**Manual Options**:
- `--brains <names>` — Comma-separated brain names (required)
- `--format <format>` — `round_robin` or `single_elimination` (default: round_robin)
- `--max-ticks <number>` — Ticks per match (default: 5000)
- `--replay-dir <path>` — Replay storage (default: ./tournament-replays)
- `--parallel <n>` — Parallel matches (default: 1)
- `--name <name>` — Tournament name (auto-generated if not specified)

**Example: 3-Brain Round-Robin Tournament**
```bash
ai-commander tournament run \
  --brains "Ollama1,Ollama2,Ollama3" \
  --format round_robin \
  --name "triple-ollama" \
  --max-ticks 5000
```

**Example Output**:
```
Starting tournament...
  Name: triple-ollama
  Brains: Ollama1, Ollama2, Ollama3
  Format: round_robin
  Max ticks: 5000

Executing tournament...
Scheduling 3 matches...

Match 1: Ollama1 vs Ollama2
Match 2: Ollama1 vs Ollama3
Match 3: Ollama2 vs Ollama3

Tournament completed!
  Total matches: 3
  Duration: 2m 15s

Final Rankings:

1. Ollama1              | Wins: 2 | Losses: 0 | Draw: 0
2. Ollama2              | Wins: 1 | Losses: 1 | Draw: 0
3. Ollama3              | Wins: 0 | Losses: 2 | Draw: 0
```

---

### 3️⃣ Analyze & Export Replays

**Description**: Load and export match replays in multiple formats.

```bash
# List recent replays
ls -la ./replays/

# Export a replay in all formats
ai-commander replay export match-001 \
  --format json,csv,html \
  --output-dir ./analysis/
```

**Formats**:
- **JSON** — Complete raw replay data (for programmatic analysis)
- **CSV** — Summary statistics and decision timeline (for spreadsheets)
- **HTML** — Human-readable report with charts (for viewing in browser)

**Example Outputs**:

**JSON Export** (`match-001.json`):
```json
{
  "metadata": {
    "matchId": "match-001",
    "timestamp": 1688652000000,
    "brain1Name": "Ollama",
    "brain2Name": "Ollama",
    "winner": "Ollama",
    "duration": 45000,
    "ticksRan": 3450,
    "player1Commands": 156,
    "player1Errors": 4,
    "player2Commands": 149,
    "player2Errors": 5
  },
  "decisions": [...],
  "snapshots": [...]
}
```

**CSV Export** (`match-001.csv`):
```csv
Match Summary

Match ID,match-001
Timestamp,2023-07-06T15:00:00Z
Brain 1,Ollama
Brain 2,Ollama
Winner,Ollama
Duration (ms),45000
Ticks,3450
Player 1 Commands,156
Player 1 Errors,4
Player 2 Commands,149
Player 2 Errors,5

Decision Timeline

Tick,Player,Brain,Commands,Errors,Duration (ms),Reasoning
0,Player 1,Ollama,5,0,245,"Build initial workers"
1,Player 2,Ollama,4,0,289,"Expand territory"
...
```

**HTML Export** (`match-001.html`):
- Professional formatted report
- Player statistics
- Decision timeline rankings
- Error rate analysis
- View in any web browser

---

## 🔧 Common Tasks

### View Available Commands
```bash
ai-commander help
```

### Show CLI Version
```bash
ai-commander version
```

### List All Configuration Presets
```bash
ai-commander config preset list
```

### Create Custom Preset
```bash
ai-commander config preset create my-preset \
  --brains "Brain1,Brain2" \
  --max-ticks 7500
```

---

## 📂 File Structure

```
./replays/
├── match-001.json          # Full replay data
├── match-002.json
└── match-003.json

./tournament-replays/
├── match-001.json
├── match-002.json
└── match-003.json

./analysis/
├── match-001.json
├── match-001.csv
├── match-001.html
└── ...
```

---

## ⚙️ Troubleshooting

### "Ollama connection failed"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve
```

### "0 A.D. not found"

```bash
# Verify installation path
ls "C:\Program Files\0 A.D\binaries\data"

# Or disable window launch
ai-commander match start --no-window
```

### "Replay directory not writable"

```bash
# Create and verify directory
mkdir -p ./replays
ls -la ./replays
```

### "Command not found"

```bash
# Ensure project is built
pnpm build

# Verify zeroad-adapter is installed
pnpm list @ai-commander/zeroad-adapter
```

---

## 🎯 Complete Workflow Example

Here's a realistic workflow from start to finish:

```bash
# 1. Ensure dependencies are ready
cd C:\Users\boter\ai-commander
pnpm build

# 2. In another terminal, start Ollama
ollama serve

# 3. Create replay directory
mkdir -p ./replays

# 4. Run a quick test match
ai-commander match start --max-ticks 1000

# 5. Check the replay
ls -lh ./replays/

# 6. Export for analysis
ai-commander replay export match-001 --format csv,html

# 7. View the HTML report
start ./match-001.html  # Windows
# or
open ./match-001.html   # macOS
# or
xdg-open ./match-001.html  # Linux

# 8. Run a full tournament
ai-commander tournament run --preset ollama-vs-ollama

# 9. Export all tournament replays
for file in ./tournament-replays/*.json; do
  match_id=$(basename "$file" .json)
  ai-commander replay export "$match_id" --format html
done

# 10. View tournament results
ls -lh ./tournament-replays/
```

---

## 📊 Output Files

### Match Replay (`match-001.json`)
- **Size**: 2-5 MB typical
- **Contents**: Full match data, decisions, snapshots
- **Use**: Programmatic analysis, replay in players

### Tournament Replays
- **Location**: `./tournament-replays/`
- **Pattern**: `match-001.json`, `match-002.json`, etc.
- **Use**: Historical analysis, leaderboards

### Exported Reports
- **JSON**: Raw data for processing
- **CSV**: Spreadsheet import
- **HTML**: Browser viewing and sharing

---

## 🚀 Next Steps

1. **Try a quick match**: `ai-commander match start --max-ticks 1000`
2. **Run a tournament**: `ai-commander tournament run --preset quick-match`
3. **Analyze results**: `ai-commander replay export <match-id> --format html`
4. **Share reports**: Open `.html` files in browser to share results

---

## 📖 Documentation

For more details, see:
- `MVP-DELIVERY-SUMMARY.md` — Project overview
- `EPIC-16-*.md` — CLI story specifications
- Code comments in `packages/zeroad-adapter/src/cli/`

---

## 💬 Tips & Tricks

### Batch Process Multiple Matches
```bash
#!/bin/bash
for i in {1..10}; do
  echo "Running match $i..."
  ai-commander match start --no-replay
done
```

### Monitor Match Progress
```bash
# Run with verbose output
ai-commander match start --verbose

# Or watch logs in real-time
tail -f ./logs/ai-commander.log
```

### Compare Brain Performance
```bash
# Run tournament with same brains
ai-commander tournament run \
  --brains "Ollama,Ollama,Ollama" \
  --name "consistency-test"

# Export all results
ai-commander replay export * --format csv
```

---

## ✅ You're Ready!

Your AI Commander CLI is set up and ready to use. Start with a simple match and explore from there. Happy tournaments! 🎮

