# AI Commander — Quick Start (5 minutes)

## ⚡ TL;DR

```bash
# 1. Setup (one time)
cd C:\Users\boter\ai-commander
pnpm install && pnpm build

# 2. In another terminal, start Ollama
ollama serve

# 3. Run a match
./ai-commander.bat match start

# 4. Run a tournament
./ai-commander.bat tournament run --preset ollama-vs-ollama

# 5. Export results
./ai-commander.bat replay export match-001 --format html
```

---

## 📋 Prerequisites (2 min)

1. **Node.js 18+** — [Download](https://nodejs.org/)
2. **pnpm** — `npm install -g pnpm`
3. **Ollama** — [Download](https://ollama.ai/)
   - Start it: `ollama serve`

---

## 🚀 3 Commands You Need

### Command 1: Start a Match
```bash
./ai-commander.bat match start --brain1 Ollama --brain2 Ollama
```
- Runs a complete match
- Saves replay automatically
- Takes ~45 seconds

### Command 2: Run a Tournament
```bash
./ai-commander.bat tournament run --preset ollama-vs-ollama
```
- Multiple matches with rankings
- ELO rating system
- Takes ~2 minutes for 3 matches

### Command 3: Export Results
```bash
./ai-commander.bat replay export match-001 --format html
```
- Creates `.html` report
- Open in browser to view
- Also supports `json`, `csv`

---

## 🎯 Complete 5-Min Workflow

```bash
# Terminal 1: Setup and run match
cd C:\Users\boter\ai-commander
pnpm build

# Terminal 2: Start Ollama (keep running)
ollama serve

# Terminal 1: Run match
./ai-commander.bat match start

# Terminal 1: Export results
./ai-commander.bat replay export match-001 --format html

# Open the HTML file in browser
start match-001.html
```

---

## 📝 Preset Options

Use any of these presets:

```bash
# Two Ollama instances
./ai-commander.bat tournament run --preset ollama-vs-ollama

# Three different brains (requires API keys for Claude/GPT)
./ai-commander.bat tournament run --preset multi-llm

# Builtin AI vs Ollama
./ai-commander.bat tournament run --preset builtin-vs-ollama

# Quick 1000-tick match
./ai-commander.bat tournament run --preset quick-match

# Extended 10000-tick match
./ai-commander.bat tournament run --preset long-match
```

---

## 🔧 Manual Configuration

Instead of presets, specify directly:

```bash
# Two custom brains
./ai-commander.bat tournament run \
  --brains "Ollama,Ollama" \
  --format round_robin \
  --max-ticks 5000

# Three brains
./ai-commander.bat tournament run \
  --brains "Brain1,Brain2,Brain3" \
  --format round_robin
```

---

## 📊 What You Get

After running a match:

```
./replays/
├── match-001.json       # Raw replay data
├── match-001.csv        # Spreadsheet format
└── match-001.html       # Browser-viewable report
```

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Ollama not found" | Run `ollama serve` in another terminal |
| "Node not found" | Install Node.js from nodejs.org |
| "pnpm not found" | Run `npm install -g pnpm` |
| "Build failed" | Run `pnpm install` first |
| "Replay not saved" | Create `mkdir ./replays` |

---

## 🎮 What Happens

1. **Match Start** → AI Commander launches 0 A.D.
2. **Game Loop** → Ollama makes decisions each turn
3. **Match Ends** → Winner determined, replay saved
4. **Export** → Convert replay to HTML/CSV/JSON
5. **Analyze** → Open HTML in browser to view results

---

## 📚 Need More Help?

- **Detailed Setup**: See `GETTING-STARTED.md`
- **Architecture**: See `MVP-DELIVERY-SUMMARY.md`
- **Code**: See `EPIC-16-*.md`

---

## ✅ You're Ready!

Run these 3 commands and you're done:

```bash
pnpm build
./ai-commander.bat match start
./ai-commander.bat replay export match-001 --format html
```

Then open the HTML file in your browser to see results! 🎉

