# How to Run AI Commander — Complete Instructions

This document provides step-by-step instructions to run the three commands you asked about.

---

## 📍 Table of Contents

1. [Initial Setup](#initial-setup) — One-time configuration
2. [Command 1: Start Matches](#command-1-start-matches) — Run individual games
3. [Command 2: Run Tournaments](#command-2-run-tournaments) — Multi-match competitions
4. [Command 3: Analyze Replays](#command-3-analyze-replays) — Export and view results
5. [Troubleshooting](#troubleshooting) — Fix common issues

---

## Initial Setup

### Step 1: Install Prerequisites (if needed)

**Node.js**:
```bash
# Check if installed
node --version

# If not installed, download from: https://nodejs.org/ (v18 or higher)
# Then verify:
node --version  # Should show v18.x.x or higher
```

**pnpm Package Manager**:
```bash
# Check if installed
pnpm --version

# If not installed:
npm install -g pnpm

# Verify:
pnpm --version  # Should show 8.0.0 or higher
```

**Ollama (AI Brain)**:
```bash
# Download from: https://ollama.ai/

# Check if installed:
ollama --version

# Pull a model (only need to do once):
ollama pull llama2
```

### Step 2: Build the Project

```bash
# Navigate to project directory
cd C:\Users\boter\ai-commander

# Install dependencies (first time only)
pnpm install

# Build the project
pnpm build
```

This compiles TypeScript and prepares the CLI.

### Step 3: Create Directories

```bash
# Create directories for replays
mkdir replays
mkdir tournament-replays

# Verify they were created
dir replays
dir tournament-replays
```

### Step 4: Start Ollama Service

**Open a new terminal/PowerShell window** and run:
```bash
ollama serve
```

Keep this running in the background. You should see:
```
Listening on 127.0.0.1:11434
```

**Important**: Leave this terminal open while running matches!

---

## Command 1: Start Matches

### What It Does
Runs a complete match between two AI brains and automatically saves a replay file.

### In Your Project Directory, Run:

```bash
# Basic (uses Ollama vs Ollama, 5000 ticks)
./ai-commander.bat match start

# With custom options
./ai-commander.bat match start ^
  --brain1 "Ollama" ^
  --brain2 "Ollama" ^
  --max-ticks 5000 ^
  --replay-dir "./replays"
```

**Windows Note**: Use `^` at end of line to continue command on next line. Or write it as one line:
```bash
./ai-commander.bat match start --brain1 "Ollama" --brain2 "Ollama" --max-ticks 5000 --replay-dir "./replays"
```

### Available Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--brain1 <name>` | First AI brain | "Ollama" | `--brain1 "Ollama"` |
| `--brain2 <name>` | Second AI brain | "Ollama" | `--brain2 "Ollama"` |
| `--max-ticks <num>` | Game length (ticks) | 5000 | `--max-ticks 3000` |
| `--replay-dir <path>` | Where to save replay | "./replays" | `--replay-dir "./replays"` |
| `--no-window` | Don't launch 0 A.D. | false | `--no-window` |
| `--no-replay` | Don't save replay | false | `--no-replay` |
| `--verbose` | Detailed logging | false | `--verbose` |

### What You'll See

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
Replay saved to: ./replays/match-TIMESTAMP.json
```

### Result Files

After running, check `./replays/`:
```
./replays/
├── match-001.json
├── match-002.json
└── match-003.json
```

Each `.json` file contains the complete match data.

---

## Command 2: Run Tournaments

### What It Does
Runs multiple matches between brains with rankings and ELO ratings.

### Using a Preset (Recommended)

**Option A: Ollama vs Ollama**
```bash
./ai-commander.bat tournament run --preset ollama-vs-ollama
```
- Runs 1 match between two Ollama instances
- Duration: ~45 seconds

**Option B: Multi-LLM**
```bash
./ai-commander.bat tournament run --preset multi-llm
```
- Runs 3 matches: Ollama, Claude, GPT
- Requires API keys (see below)
- Duration: ~2 minutes

**Option C: Quick Match**
```bash
./ai-commander.bat tournament run --preset quick-match
```
- Fast 1000-tick match
- Duration: ~15 seconds

**Option D: Long Match**
```bash
./ai-commander.bat tournament run --preset long-match
```
- Extended 10000-tick match
- Duration: ~90 seconds

### Manual Configuration

If you don't want to use presets:

```bash
# Two Ollama instances, 3 matches
./ai-commander.bat tournament run ^
  --brains "Ollama,Ollama" ^
  --format round_robin ^
  --max-ticks 5000 ^
  --replay-dir "./tournament-replays"

# Three different brains
./ai-commander.bat tournament run ^
  --brains "Brain1,Brain2,Brain3" ^
  --format round_robin ^
  --max-ticks 5000
```

### Available Options

| Option | Description | Example |
|--------|-------------|---------|
| `--preset <name>` | Use preset | `--preset ollama-vs-ollama` |
| `--brains <list>` | Comma-separated names | `--brains "Brain1,Brain2"` |
| `--format <format>` | Tournament format | `--format round_robin` |
| `--max-ticks <num>` | Ticks per match | `--max-ticks 5000` |
| `--name <name>` | Tournament name | `--name "my-tournament"` |
| `--replay-dir <path>` | Replay storage | `--replay-dir "./replays"` |
| `--parallel <num>` | Parallel matches | `--parallel 2` |

### What You'll See

```
Starting tournament...
  Name: ollama-vs-ollama
  Brains: Ollama, Ollama
  Format: round_robin
  Max ticks: 5000

Executing tournament...
Scheduling 1 match...

Match 1: Ollama vs Ollama

Tournament completed!
  Total matches: 1
  Duration: 45.0s

Final Rankings:

1. Ollama                | Wins: 1 | Losses: 0 | Draw: 0
```

### Result Files

After running, check `./tournament-replays/`:
```
./tournament-replays/
├── match-001.json
├── match-002.json
└── match-003.json
```

---

## Command 3: Analyze Replays

### What It Does
Converts replay data into readable formats (JSON, CSV, HTML).

### Export a Replay

```bash
# Export one match in HTML format
./ai-commander.bat replay export match-001 --format html

# Export in multiple formats
./ai-commander.bat replay export match-001 --format json,csv,html

# Export all with a pattern
./ai-commander.bat replay export match-* --format html
```

### Available Formats

**JSON** (Raw Data):
```bash
./ai-commander.bat replay export match-001 --format json
```
Output: `match-001.json` (complete replay data)

**CSV** (Spreadsheet):
```bash
./ai-commander.bat replay export match-001 --format csv
```
Output: `match-001.csv` (can open in Excel/Google Sheets)

**HTML** (Browser Report):
```bash
./ai-commander.bat replay export match-001 --format html
```
Output: `match-001.html` (open in web browser)

### Viewing Results

**HTML Report** (Easiest):
```bash
# Export to HTML
./ai-commander.bat replay export match-001 --format html

# Open in browser
start match-001.html
```

The HTML file shows:
- Player statistics
- Match summary
- Decision timeline
- Win rates and error analysis
- Formatted nicely for sharing

**CSV Report** (Spreadsheet):
```bash
# Export to CSV
./ai-commander.bat replay export match-001 --format csv

# Open in Excel
start match-001.csv
```

**JSON Report** (Programmatic):
```bash
# Export to JSON
./ai-commander.bat replay export match-001 --format json

# View raw data
type match-001.json
```

### Example: Complete Analysis Workflow

```bash
# 1. Run a tournament
./ai-commander.bat tournament run --preset ollama-vs-ollama

# 2. Find match IDs
dir tournament-replays

# 3. Export first match to HTML
./ai-commander.bat replay export match-001 --format html

# 4. View in browser
start match-001.html

# 5. Export to CSV for spreadsheet analysis
./ai-commander.bat replay export match-001 --format csv

# 6. Open in Excel
start match-001.csv
```

---

## Troubleshooting

### Issue: "Command not recognized"

**Cause**: CLI not built or not in right directory

**Fix**:
```bash
# Navigate to correct directory
cd C:\Users\boter\ai-commander

# Rebuild
pnpm build

# Try again
./ai-commander.bat match start
```

### Issue: "Ollama connection failed"

**Cause**: Ollama service not running

**Fix**:
```bash
# In a NEW terminal/PowerShell window, run:
ollama serve

# Keep this running while using CLI
# Leave this window open
```

### Issue: "0 A.D. not found"

**Cause**: Game not installed or wrong path

**Fix** (Option 1 - Don't launch window):
```bash
./ai-commander.bat match start --no-window
```

**Fix** (Option 2 - Configure path):
```bash
# Create config file
cat > %USERPROFILE%\.ai-commander\config.json << EOF
{
  "gameDataPath": "C:\\Program Files\\0 A.D\\binaries\\data"
}
EOF
```

### Issue: "Replay directory not writable"

**Cause**: Directory doesn't exist or no permissions

**Fix**:
```bash
# Create directory
mkdir replays
mkdir tournament-replays

# Verify
dir replays
```

### Issue: "Node.js not found"

**Cause**: Node.js not installed

**Fix**:
1. Download Node.js from https://nodejs.org/ (v18+)
2. Install it
3. Restart PowerShell/terminal
4. Verify: `node --version`

### Issue: "pnpm not found"

**Cause**: pnpm not installed globally

**Fix**:
```bash
npm install -g pnpm
```

---

## 🎯 Complete Example Walkthrough

Here's how to run all three commands in sequence:

### Terminal 1: Start Ollama (Keep running)
```bash
ollama serve

# Leave this running! You should see:
# Listening on 127.0.0.1:11434
```

### Terminal 2: Run AI Commander

```bash
# Navigate to project
cd C:\Users\boter\ai-commander

# Build (first time only)
pnpm build

# Run a match
./ai-commander.bat match start

# Result: Replay saved to ./replays/match-TIMESTAMP.json
```

### Terminal 2: Run a Tournament

```bash
# Still in project directory

# Run tournament
./ai-commander.bat tournament run --preset ollama-vs-ollama

# Result: Matches complete, replays saved to ./tournament-replays/
```

### Terminal 2: Analyze Results

```bash
# Still in project directory

# Export to HTML
./ai-commander.bat replay export match-001 --format html

# Open in browser
start match-001.html

# Result: Beautiful report opens in your browser!
```

---

## 📊 Expected Performance

| Operation | Time | Output |
|-----------|------|--------|
| `match start` | 45-60s | 1 replay file (2-5 MB) |
| `tournament run` (3 matches) | 2-3 min | 3 replay files |
| `replay export` | <1s | `.html`, `.csv`, or `.json` |

---

## ✅ Success Indicators

You'll know it's working when you see:

✅ **Match starts**: Game window launches (if not `--no-window`)
✅ **Match progresses**: Console shows ticks and progress
✅ **Match completes**: Shows winner and statistics
✅ **Replay saves**: File appears in `./replays/` or `./tournament-replays/`
✅ **Export works**: `.html` or `.csv` file is created
✅ **HTML opens**: Beautiful report in your browser

---

## 🚀 Next Steps

1. **Try a quick match**: 
   ```bash
   ./ai-commander.bat match start --max-ticks 1000
   ```

2. **View the results**:
   ```bash
   ./ai-commander.bat replay export match-001 --format html
   start match-001.html
   ```

3. **Run a tournament**:
   ```bash
   ./ai-commander.bat tournament run --preset quick-match
   ```

4. **Export tournament results**:
   ```bash
   ./ai-commander.bat replay export match-001 --format html
   ```

---

## 📞 Getting Help

- **Quick Start**: See `QUICK-START.md` (5 minutes)
- **Detailed Setup**: See `GETTING-STARTED.md` (full guide)
- **Architecture**: See `MVP-DELIVERY-SUMMARY.md` (technical overview)
- **CLI Specs**: See `EPIC-16-*.md` (implementation details)

---

## 🎓 Summary

| Command | What It Does | Time | Result |
|---------|-------------|------|--------|
| `ai-commander match start` | Run one AI match | 45s | 1 replay file |
| `ai-commander tournament run` | Run multiple matches | 2m | Multiple replays + rankings |
| `ai-commander replay export` | Convert replay formats | <1s | HTML/CSV/JSON report |

**You now have everything you need to run AI Commander!** 🎮

