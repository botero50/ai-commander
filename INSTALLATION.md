# AI Commander — Installation Guide

Complete setup for **AI vs AI tournaments** with real 0 A.D. gameplay, Ollama AI decisions, and Piper TTS voice synthesis.

**Estimated time: 30-50 minutes** (mostly downloads)

---

## Prerequisites

- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org)
- **Git** — [Download from git-scm.com](https://git-scm.com)
- **Python 3.8+** — [Download from python.org](https://www.python.org/downloads/)
- **0 A.D.** — [Download from play0ad.com](https://play0ad.com) or Steam
- **Ollama** — [Download from ollama.ai](https://ollama.ai)
- **8+ GB free disk space** for AI models and voice models
- **8+ GB RAM** (recommended)

---

## Step 1: Install Python

### Windows

1. Download Python from [python.org](https://www.python.org/downloads/) (3.8 or newer)
2. Run installer
3. **Important**: Check ✅ "Add Python to PATH"
4. Click "Install Now"

### macOS

```bash
brew install python3
```

### Linux

```bash
sudo apt-get install python3 python3-pip
```

### Verify Installation

```bash
python --version      # Expected: Python 3.8 or higher
pip --version         # Expected: pip 20.0 or higher
```

---

## Step 2: Install Node.js

### Verify Installation
```bash
node --version    # Expected: v18.0.0 or higher
npm --version     # Expected: 9.0.0 or higher
```

If not installed, download from [nodejs.org](https://nodejs.org) (LTS version recommended)

---

## Step 3: Install 0 A.D.

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

## Step 4: Install Ollama

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

## Step 5: Download & Start Ollama Models

### Start Ollama Server (keep this running)
```bash
ollama serve
```

### In Another Terminal: Download Models

**Option A: Fast Setup (Recommended for Speed)**
```bash
# Download fastest model (637 MB)
ollama pull tinyllama

# Optional: Also download a balanced model
ollama pull mistral
```

**Option B: Higher Quality**
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
```

**Keep the `ollama serve` command running in the background!**

---

## Step 6: Install Piper TTS (Voice Synthesis)

Piper TTS converts trash talk text to voice during matches.

### Install Piper via pip

```bash
pip install piper-tts
```

### Verify Installation

```bash
piper --help
```

---

## Step 7: Download Piper Voice Model (Into Project)

Voice models are stored in the project for easy deployment. Download `en_US-lessac-medium` into the project:

### Python Script (Recommended)

Run this from the project root:

```bash
python -c "
import urllib.request
import os

voices_dir = 'packages/zeroad-adapter/voices'
os.makedirs(voices_dir, exist_ok=True)
print(f'Voices directory: {voices_dir}')

# Download voice model (63 MB)
print('[*] Downloading en_US-lessac-medium.onnx...')
url = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx'
filepath = os.path.join(voices_dir, 'en_US-lessac-medium.onnx')
urllib.request.urlretrieve(url, filepath)
print(f'[OK] Model downloaded')

# Download config (5 KB)
print('[*] Downloading voice config...')
config_url = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
config_filepath = os.path.join(voices_dir, 'en_US-lessac-medium.onnx.json')
urllib.request.urlretrieve(config_url, config_filepath)
print(f'[OK] Config downloaded')

print(f'[OK] Voice installed successfully!')
print(f'Location: {os.path.abspath(voices_dir)}')
"
```

### Verify Voice Installation

The voice model should be in:
```
packages/zeroad-adapter/voices/
├── en_US-lessac-medium.onnx (63 MB)
└── en_US-lessac-medium.onnx.json (5 KB)
```

Test it works:
```bash
echo "Hello world" | piper --model en_US-lessac-medium --data-dir packages/zeroad-adapter/voices --output-file test.wav
```

If successful, `test.wav` will be created (30-60 KB).

---

## Step 8: Clone & Setup AI Commander

### Clone Repository
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

## Step 9: Run Matches

### Basic Usage (Fastest)
```bash
# Run 10 matches with tinyllama
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

### Using Batch File (Windows)
```bash
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

---

## What Happens During Arena Loop

For each match:
1. **Kill** any running 0 A.D. process
2. **Start** fresh 0 A.D. with RL Interface (port 6000)
3. **Wait** for game to load (~5 seconds)
4. **Run** match: Ollama AI vs Petra AI
5. **Capture** trash talk and synthesize to voice (Piper TTS)
6. **Monitor** until one AI wins or timeout
7. **Close** the game
8. **Repeat** next match

**Fully automated - no manual intervention needed!**

---

## Troubleshooting

### Python Issues

**"python: command not found"**
- Python not installed or not in PATH
- Solution: Download from [python.org](https://www.python.org/downloads/) and check "Add Python to PATH"

**"pip: command not found"**
- Python installed but pip not available
- Solution: `python -m pip install --upgrade pip`

### Piper TTS Issues

**"piper: command not found"**
- Piper not installed
- Solution: `pip install piper-tts`

**"Unable to find voice: en_US-lessac-medium"**
- Voice model not downloaded
- Solution: Run the Python script in Step 7 to download the voice

**Voice synthesis is slow on first run**
- Voice model being downloaded/initialized
- Solution: Subsequent runs will be faster (~50ms per message)

### Ollama Issues

**"Ollama API error: 404" (Model not found)**
```bash
# Check what models you have
ollama list

# Download a model
ollama pull tinyllama
ollama pull mistral
```

### Game Issues

**"Game process exited with code 1"**
- 0 A.D. not installed at expected location
- Solution: Verify path: `C:\Program Files (x86)\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe`

**"Failed to connect to RL Interface"**
- Game didn't start properly
- Solution: Try increasing startup wait: `STARTUP_WAIT=8000 npx tsx ...`

### Build Issues

**"Error: Cannot find module"**
```bash
npm run build
```

---

## Performance Tips

### For Maximum Speed
```bash
OLLAMA_MODEL=tinyllama:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10 --freq 10
```

### For Better Quality
```bash
OLLAMA_MODEL=mistral:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 5 --freq 1
```

---

## System Requirements Summary

| Component | Minimum | Recommended |
|---|---|---|
| OS | Windows 10, macOS 10.13, Linux | Any |
| CPU | Intel i5 / M1 | i7 / M2+ |
| RAM | 8 GB | 16+ GB |
| Disk | 15 GB | 25+ GB |
| GPU | Optional | NVIDIA / AMD |
| Network | Internet (initial setup) | N/A |

**Disk space breakdown:**
- Node.js dependencies: 500 MB
- 0 A.D.: 3-5 GB
- Ollama models (tinyllama): 2-3 GB
- Piper voice models: ~100 MB
- Game assets & outputs: 1-2 GB

---

## What's Next

After installation:

1. **Run your first matches:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3
   ```

2. **Check the output:**
   - Trash talk will be captured and synthesized to voice
   - Audio files saved to `.data/audio/trash_talk/`
   - Match results logged to console

3. **Experiment with different speeds:**
   ```bash
   # Fast
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2 --freq 5
   
   # Balanced  
   OLLAMA_MODEL=mistral:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 2
   ```

4. **Read the documentation:**
   - [README.md](README.md) — Project overview
   - [PIPER-TTS-SETUP.md](PIPER-TTS-SETUP.md) — Voice synthesis configuration
   - [SECURITY.md](SECURITY.md) — Security guidelines

---

## Summary

You now have:

✅ Python installed  
✅ Node.js installed  
✅ 0 A.D. installed  
✅ Ollama running with models  
✅ Piper TTS installed with voice model  
✅ AI Commander cloned and built  

**Run your first tournament:**
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```

**Enjoy!** 🎮
