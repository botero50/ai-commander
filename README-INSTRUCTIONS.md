# AI Commander — Complete Instructions

This document explains how to use the three commands you asked about.

---

## ⚡ Quick Reference

```bash
# Command 1: Start matches
ai-commander match start --brain1 Ollama --brain2 Ollama

# Command 2: Run tournaments  
ai-commander tournament run --preset multi-llm

# Command 3: Analyze replays
ai-commander replay export <match-id> --format json,csv,html
```

---

## 📖 Full Documentation

For complete instructions, see:

1. **[HOW-TO-RUN.md](HOW-TO-RUN.md)** — Detailed step-by-step (READ THIS FIRST)
2. **[QUICK-START.md](QUICK-START.md)** — 5-minute overview
3. **[GETTING-STARTED.md](GETTING-STARTED.md)** — Complete setup guide
4. **[README.md](README.md)** — Project overview

---

## 🚀 Start Here

### Step 1: Setup (One Time)
```bash
cd C:\Users\boter\ai-commander
pnpm install
pnpm build
```

### Step 2: Start Ollama (Keep Running)
```bash
# In a NEW terminal window
ollama serve
```

### Step 3: Run Your First Command
```bash
# Back in project directory
./ai-commander.bat match start
```

---

## 📝 All Three Commands Explained

### Command 1: ai-commander match start

**What it does**: Runs a complete game between two AI brains

```bash
# Basic (uses all defaults)
./ai-commander.bat match start

# With options
./ai-commander.bat match start --brain1 Ollama --brain2 Ollama --max-ticks 5000

# Without 0 A.D. window
./ai-commander.bat match start --no-window

# Quick test (1000 ticks)
./ai-commander.bat match start --max-ticks 1000
```

**Result**: Creates `./replays/match-*.json` file with complete replay data

**Time**: 45-60 seconds

### Command 2: ai-commander tournament run

**What it does**: Runs multiple matches with rankings and ELO ratings

```bash
# Use a preset (easiest)
./ai-commander.bat tournament run --preset ollama-vs-ollama

# Or specify manually
./ai-commander.bat tournament run --brains "Brain1,Brain2" --format round_robin

# Multi-brain tournament
./ai-commander.bat tournament run --brains "Brain1,Brain2,Brain3" --format round_robin
```

**Available presets**:
- `ollama-vs-ollama` — Two Ollama instances
- `multi-llm` — Ollama, Claude, GPT
- `builtin-vs-ollama` — Builtin vs Ollama
- `quick-match` — Fast 1000-tick match
- `long-match` — Extended 10000-tick match

**Result**: Creates multiple `./tournament-replays/match-*.json` files

**Time**: 45 seconds per match × number of matches

### Command 3: ai-commander replay export

**What it does**: Converts replay data to different formats

```bash
# Export to HTML (best for viewing)
./ai-commander.bat replay export match-001 --format html
start match-001.html

# Export to CSV (for spreadsheets)
./ai-commander.bat replay export match-001 --format csv
start match-001.csv

# Export to JSON (raw data)
./ai-commander.bat replay export match-001 --format json

# All formats at once
./ai-commander.bat replay export match-001 --format json,csv,html
```

**Result**: Creates `match-001.html`, `match-001.csv`, or `match-001.json`

**Time**: <1 second

---

## 🎯 Complete Workflow Example

Here's exactly what to type:

### Terminal 1: Start Ollama
```bash
ollama serve
```
Leave this running!

### Terminal 2: Setup and Run
```bash
# Navigate to project
cd C:\Users\boter\ai-commander

# Build (first time only)
pnpm build

# Run a match
./ai-commander.bat match start

# Export results
./ai-commander.bat replay export match-001 --format html

# Open in browser
start match-001.html

# Run a tournament
./ai-commander.bat tournament run --preset quick-match

# Export tournament results  
./ai-commander.bat replay export match-001 --format html
```

---

## ❓ FAQ

**Q: How long does a match take?**
A: 45-60 seconds. Use `--max-ticks 1000` for 15-second quick test.

**Q: Do I need 0 A.D. installed?**
A: No, use `--no-window` flag to skip the game visualization.

**Q: What if Ollama won't connect?**
A: Make sure `ollama serve` is running in another terminal.

**Q: Where are replays saved?**
A: `./replays/` for matches, `./tournament-replays/` for tournaments.

**Q: Can I export multiple formats at once?**
A: Yes: `--format json,csv,html`

**Q: How do I view the HTML report?**
A: Run `start match-001.html` to open in your browser.

---

## 🔧 Options Summary

### match start options
- `--brain1 <name>` — First AI (default: Ollama)
- `--brain2 <name>` — Second AI (default: Ollama)
- `--max-ticks <num>` — Game length (default: 5000)
- `--replay-dir <path>` — Save location (default: ./replays)
- `--no-window` — Skip 0 A.D. window
- `--no-replay` — Don't save replay
- `--verbose` — Detailed logging

### tournament run options
- `--preset <name>` — Use preset configuration
- `--brains <list>` — Brain names (comma-separated)
- `--format <fmt>` — round_robin or single_elimination
- `--max-ticks <num>` — Ticks per match
- `--name <name>` — Tournament name
- `--replay-dir <path>` — Replay storage
- `--parallel <n>` — Parallel matches

### replay export options
- `--format <fmt>` — json, csv, or html (comma-separated)
- `--output-dir <path>` — Where to save

---

## ✅ Success Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Ollama installed (`ollama --version`)
- [ ] Project built (`pnpm build`)
- [ ] Ollama running (`ollama serve` in another terminal)
- [ ] First match ran successfully
- [ ] Replay exported to HTML
- [ ] HTML report opened in browser

---

## 🎊 You're Ready!

Run this command to verify everything works:

```bash
./ai-commander.bat match start --max-ticks 1000
```

Then:

```bash
./ai-commander.bat replay export match-001 --format html
start match-001.html
```

You should see a beautiful report in your browser! 🎉

---

## 📞 Need Help?

See **[HOW-TO-RUN.md](HOW-TO-RUN.md)** for:
- Troubleshooting common issues
- Detailed setup instructions
- Complete examples
- System requirements

All documentation is in this directory. Happy tournaments!
