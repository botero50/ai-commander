# AI Commander — Installation Guide

Complete setup guide for running **AI vs AI tournaments** with real 0 A.D. gameplay.

**Estimated time: 20-40 minutes** (mostly waiting for downloads)

---

## Prerequisites

- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org)
- **Git** — [Download from git-scm.com](https://git-scm.com)
- **0 A.D.** — [Download from play0ad.com](https://play0ad.com) or Steam
- **Ollama** — [Download from ollama.ai](https://ollama.ai)
- **4+ GB free disk space** for AI models
- **8+ GB RAM** (recommended for smooth gameplay)

---

## Step 1: Install Node.js

### Verify Installation
```bash
node --version    # Expected: v18.0.0 or higher
npm --version     # Expected: 9.0.0 or higher
```

If not installed, download from [nodejs.org](https://nodejs.org) (LTS version recommended)

---

## Step 2: Install 0 A.D.

### Windows / macOS / Linux
1. Download from [play0ad.com](https://play0ad.com) or [Steam](https://store.steampowered.com/app/1680220/0_AD_Empires_Ascendant)
2. Install in default location:
   - **Windows:** `C:\Program Files (x86)\0 A.D. Empires Ascendant\`
   - **macOS:** `/Applications/0 A.D.app`
   - **Linux:** `/usr/games/0ad`

### Verify Installation
```bash
# Windows: Find pyrogenesis.exe
dir "C:\Program Files (x86)\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe"

# macOS/Linux: Find pyrogenesis binary
which pyrogenesis
```

---

## Step 3: Install Ollama

### Download & Install

**Windows:**
1. Download installer from [ollama.ai/download/windows](https://ollama.ai/download)
2. Run installer
3. Ollama will start automatically

**macOS:**
```bash
# Download from https://ollama.ai/download/mac
# Or use Homebrew:
brew install ollama
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

### Verify Installation
```bash
ollama --version
# Expected: ollama version 0.31.1 or higher
```

---

## Step 4: Download & Start Ollama Models

### Option A: Fast Setup (Recommended for Speed)
```bash
# Start Ollama server first (keep this running)
ollama serve

# In another terminal, download fastest model (637 MB):
ollama pull tinyllama

# Optional: Also download a balanced model
ollama pull mistral
```

### Option B: Higher Quality
```bash
# Download neural-chat (4.1 GB, high quality)
ollama pull neural-chat

# And mistral (4.1 GB, balanced)
ollama pull mistral
```

### Verify Models Downloaded
```bash
ollama list
```

You should see:
```
NAME                  ID              SIZE      MODIFIED
tinyllama:latest      2644915ede35    637 MB    10 minutes ago
mistral:latest        6577803aa9a0    4.4 GB    2 hours ago
neural-chat:latest    89fa737d3b85    4.1 GB    1 day ago
```

**Keep the `ollama serve` command running in the background!**

---

## Step 5: Clone & Setup AI Commander

### Terminal (new window): Clone Repository
```bash
cd /your/projects/directory
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
```

### Install Dependencies
```bash
npm install
# Expected: added 1200+ packages in ~1 minute
```

### Build Project
```bash
npm run build
# Expected: Build completes in 10-30 seconds
```

---

## Step 6: Run the Automated Arena Loop

This is the main feature - **continuous AI vs AI matches with auto-restart**.

### Basic Usage (Fastest)
```bash
# Run 10 matches with tinyllama (fastest)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Run forever until you stop (Ctrl+C)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
```

### With Speed Optimizations
```bash
# Very fast: tinyllama + decisions every 5 ticks
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 5 --freq 5

# Balanced: mistral + decisions every 2 ticks
OLLAMA_MODEL=mistral:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3 --freq 2

# High quality (slower): neural-chat + every tick
OLLAMA_MODEL=neural-chat:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
```

### Using the Batch File (Windows)
```bash
# Copy this for easy running:
arena-loop.bat 10        # Run 10 matches
arena-loop.bat           # Run forever
```

---

## Arena Loop Options Explained

### `--matches N`
Run N consecutive matches, then stop.
```bash
--matches 1   # Run 1 match
--matches 10  # Run 10 matches
# No flag = run forever until Ctrl+C
```

### `--freq N`
Make AI decisions every N game ticks (speeds up gameplay).
```bash
--freq 1  # Decision every tick (default, most responsive)
--freq 5  # Decision every 5 ticks (5x faster)
--freq 10 # Decision every 10 ticks (10x faster)
```

### `OLLAMA_MODEL` Environment Variable
Choose which AI model to use.
```bash
OLLAMA_MODEL=tinyllama:latest      # Fastest (637 MB)
OLLAMA_MODEL=mistral:latest        # Balanced (4.1 GB)
OLLAMA_MODEL=neural-chat:latest    # High quality (4.1 GB)
```

### `STARTUP_WAIT` Environment Variable
Customize game startup wait time (milliseconds).
```bash
STARTUP_WAIT=3000   # 3 seconds (very fast machines)
STARTUP_WAIT=5000   # 5 seconds (default, balanced)
STARTUP_WAIT=10000  # 10 seconds (slower machines)
```

---

## Speed Comparison

| Configuration | Speed | Per Match |
|---|---|---|
| tinyllama, freq=10 | 🚀 Fastest | ~30-40s |
| tinyllama, freq=5 | 🚀 Very fast | ~40-60s |
| mistral, freq=2 | ⚡ Fast | ~60-90s |
| mistral, freq=1 | 🟡 Normal | ~120-150s |
| neural-chat, freq=1 | 🐢 Slow | ~180-240s |

---

## What Happens During Arena Loop

For each match:
1. **Kill** any running 0 A.D. process
2. **Start** fresh 0 A.D. with RL Interface (port 6000)
3. **Wait** for game to load (~5 seconds)
4. **Run** match: Ollama AI vs Petra AI
5. **Monitor** until one AI wins or timeout
6. **Close** the game
7. **Repeat** next match

**Automated - no manual intervention needed!**

---

## Troubleshooting

### "Error: Cannot find module"
```bash
# Rebuild project
npm run build
```

### "Ollama API error: 404" (Model not found)
```bash
# Check what models you have
ollama list

# Download a model
ollama pull tinyllama
ollama pull mistral
```

### "Game process exited with code 1"
```bash
# Make sure 0 A.D. is installed at the expected location:
# Windows: C:\Program Files (x86)\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe

# Or set custom path:
ZEROAD_PATH="C:\your\path\pyrogenesis.exe" npx tsx ...
```

### "Failed to connect to RL Interface"
```bash
# Game didn't start properly
# Check: Is 0 A.D. closing unexpectedly?
# Try: STARTUP_WAIT=8000 to give it more time
```

### "All player units lost" or Match Timeout
This is normal! The AI vs Petra match runs until:
- One side loses all units (winner determined)
- Match timeout reached (configurable)

The script will automatically start the next match.

---

## Performance Tips

### For Maximum Speed
```bash
# Use fastest model + minimal decisions
OLLAMA_MODEL=tinyllama:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10 --freq 10
```

### For Better Quality
```bash
# Use higher quality model + more decisions
OLLAMA_MODEL=mistral:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 5 --freq 1
```

### Monitor Performance
```bash
# Watch Ollama resource usage (open new terminal)
ollama list                  # See loaded models
ps aux | grep ollama        # Check process
```

---

## System Requirements Summary

| Component | Minimum | Recommended |
|---|---|---|
| OS | Windows 10, macOS 10.13, Linux | Any |
| CPU | Intel i5 / M1 | i7 / M2+ |
| RAM | 4 GB | 8+ GB |
| Disk | 12 GB | 20+ GB |
| GPU | Optional | NVIDIA / AMD |
| Network | Internet (initial setup) | N/A |

**Memory by model:**
- tinyllama: 2-3 GB
- mistral: 5-8 GB  
- neural-chat: 5-8 GB

---

## Getting Help

1. **Check the output logs** — they show exactly what's happening
2. **Verify Ollama is running:** `ollama list` should show models
3. **Verify 0 A.D. installation** — check the path
4. **Try simplest config first:** `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`

---

## What's Next

After installation:

1. **Run your first matches:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3
   ```

2. **Experiment with different speeds:**
   ```bash
   # Fast
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 --freq 5
   
   # Balanced  
   OLLAMA_MODEL=mistral:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
   ```

3. **Read the documentation:**
   - [README.md](README.md) — Project overview
   - [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
   - [SECURITY.md](SECURITY.md) — Security guidelines

---

## Summary

You now have:

✅ Node.js installed  
✅ 0 A.D. installed  
✅ Ollama running with models  
✅ AI Commander cloned and built  
✅ Arena loop ready to run  

**Run your first tournament:**
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```

**Enjoy!** 🎮🚀
