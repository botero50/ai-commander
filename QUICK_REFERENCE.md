# Quick Reference Card

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install (see INSTALLATION.md for full setup)
npm install

# 2. Build
npm run build

# 3. Run matches
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
```

---

## 📁 Essential Documentation

| What | Where |
|------|-------|
| **First Time?** | Read [INSTALLATION.md](INSTALLATION.md) |
| **Project Overview** | Read [README.md](README.md) |
| **Quick Commands** | This file (QUICK_REFERENCE.md) |
| **Security** | Read [SECURITY.md](SECURITY.md) |
| **OBS Streaming** | Read [SETUP-OBS-STREAMING.md](SETUP-OBS-STREAMING.md) |

---

## 🎯 Available Commands

### Arena (Matches)
```bash
# Run 1 match
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Run 10 matches
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Run infinite (until Ctrl+C)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts

# Run with custom settings
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 5 --freq 2
```

### Development
```bash
# Build TypeScript
npm run build

# Run all tests
npm run test

# Run specific test
npm run test -- path/to/test.ts
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Change AI model
OLLAMA_MODEL=mistral:latest npx tsx ...
OLLAMA_MODEL=neural-chat:latest npx tsx ...
OLLAMA_MODEL=tinyllama:latest npx tsx ...

# Change game startup wait time (ms)
STARTUP_WAIT=8000 npx tsx ...
```

### Match Options

```bash
# --matches N    = Run N matches (default: infinite)
# --freq N       = AI decision every N ticks (default: 1)

# Example: Fast matches (decisions every 5 ticks)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 5 --freq 5
```

---

## 📊 Features

✅ Real 0 A.D. gameplay  
✅ Ollama AI decision-making  
✅ AI-generated trash talk  
✅ Piper TTS voice synthesis  
✅ Automatic game recovery  
✅ ELO rating system  
✅ Map and civilization rotation  
✅ Real-time metrics  

---

## 🔧 Troubleshooting

### Setup Issues
- See [INSTALLATION.md](INSTALLATION.md) Section "Troubleshooting"

### Python Not Found
```bash
# Install Python: https://www.python.org/downloads/
# Verify: python --version
```

### Ollama Issues
```bash
# Check Ollama is running
ollama list

# Download model
ollama pull tinyllama
```

### Piper TTS Issues
```bash
# Install Piper
pip install piper-tts

# Download voice (see INSTALLATION.md Step 7)
```

### Build Errors
```bash
# Clean and rebuild
npm run build
```

---

## 📈 Performance Guide

| Config | Speed | Per Match |
|--------|-------|-----------|
| tinyllama, freq=10 | 🚀 Fastest | 30-40s |
| tinyllama, freq=5 | 🚀 Very fast | 40-60s |
| mistral, freq=2 | ⚡ Fast | 60-90s |
| mistral, freq=1 | 🟡 Normal | 120-150s |
| neural-chat, freq=1 | 🐢 Slow | 180-240s |

---

## 🎬 What Happens During Arena Loop

1. **Kill** any running 0 A.D.
2. **Start** fresh game with RL Interface
3. **Wait** for game to load (~5 sec)
4. **Run** match until winner (2-4 min)
5. **Capture** trash talk & synthesize voice
6. **Save** ELO ratings and results
7. **Repeat** for next match
8. **Auto-recover** on any crash

---

## 📁 Project Structure

```
ai-commander/
├── packages/zeroad-adapter/
│   ├── src/arena/              # Tournament controller
│   ├── src/rl-interface/       # Game communication
│   ├── src/tournament/         # ELO ratings
│   ├── src/match/              # TTS & trash talk
│   └── src/resilience/         # Recovery logic
├── INSTALLATION.md             # Setup guide
├── README.md                   # Project overview
├── SECURITY.md                 # Security policies
├── QUICK_REFERENCE.md          # This file
├── SETUP-OBS-STREAMING.md      # OBS integration guide
└── package.json
```

---

## 🆘 Getting Help

1. **Setup problems?** → [INSTALLATION.md](INSTALLATION.md)
2. **Project questions?** → [README.md](README.md)
3. **Security concerns?** → [SECURITY.md](SECURITY.md)
4. **Want to stream?** → [SETUP-OBS-STREAMING.md](SETUP-OBS-STREAMING.md)

---

## ✅ System Checklist

Before running matches, verify:

- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] 0 A.D. installed at default location
- [ ] Ollama running (`ollama serve`)
- [ ] AI model downloaded (`ollama list`)
- [ ] Piper TTS installed (`piper --help`)
- [ ] Voice model downloaded (see INSTALLATION.md Step 7)
- [ ] Project built (`npm run build`)

---

**Ready?** Run: `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3`

**Let's go!** 🎮
