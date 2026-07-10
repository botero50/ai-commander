# 🎬 AI Commander: Public Stream

**Continuous AI vs AI strategy game streaming with professional broadcast presentation.**

AI Commander is a complete, production-ready system for running infinite real AI vs AI matches in 0 A.D. with real-time metrics display and esports-quality streaming.

---

## 🚀 Quick Start (3 Steps)

### Step 1: Launch
```bash
npm run stream:launch
```

### Step 2: Open Broadcast
```
http://localhost:3000
```

### Step 3: Watch Live
The broadcast displays real-time AI vs AI gameplay with metrics.

---

## What You Get

✅ **Real Gameplay** — Zero simulations, real 0 A.D., real AI decisions  
✅ **Infinite Rotation** — Automatic maps, civilizations, match rotation  
✅ **Auto-Recovery** — Automatic crash recovery, zero manual intervention  
✅ **Professional Display** — Esports overlay with real-time metrics  
✅ **REST API** — 7 endpoints for broadcast integration  
✅ **Production Ready** — Tested, documented, deployable  

---

## Configure

```bash
# Custom port
STREAM_PORT=5000 npm run stream:launch

# Tournament mode (16 matches)
STREAM_MATCHES=16 npm run stream:launch

# Production config
STREAM_PORT=3000 STREAM_MATCHES=0 STREAM_LOG_INTERVAL=300 npm run stream:launch
```

**Done!** You've just watched two AI models play a complete game.

---

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| **[INSTALLATION.md](INSTALLATION.md)** | Complete setup guide with Ollama commands |
| **[demo/README.md](demo/README.md)** | Demo details & configuration options |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | How to contribute to the project |
| **[SECURITY.md](SECURITY.md)** | Security policies |

---

## 🎯 What You Can Do

### Run a Match
```bash
npm run demo
```
Executes a complete game between two AI models with Ollama.

### Configure the Match
```bash
# Use different models
PLAYER1_MODEL=mistral PLAYER2_MODEL=neural-chat npm run demo

# Adjust match length
MAX_TICKS=100 npm run demo

# Quick test without Ollama
DEMO_MODE=true npm run demo
```

### View Results
```bash
npm run replay
```
Display match timeline and statistics.

---

## 🤖 AI Providers

### Local & Free (Recommended for Getting Started)
**Ollama** — Run models on your own machine
```bash
ollama pull mistral      # 4.1 GB, high quality
ollama pull neural-chat  # 4.1 GB, fast
ollama pull tinyllama    # 637 MB, very fast (for testing)
```

---

## ⚙️ System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8+ GB |
| Disk | 10 GB | 20 GB |
| OS | Windows 10+ / macOS 10.13+ / Linux | Any |
| GPU | Optional | NVIDIA / AMD for faster models |

---

## 📊 Architecture

```
AI Commander
├── Ollama Models (LLM brains)
│   ├── mistral (4.1 GB)
│   ├── neural-chat (4.1 GB)
│   └── other models
│
├── Match Execution
│   ├── Player 1 observes & decides
│   ├── Player 2 observes & decides
│   └── Game state updates each tick
│
└── Output & Analysis
    ├── replay.json (complete match state)
    ├── logs.txt (match summary)
    └── Statistics (scores, health, etc)
```

---

## 🆘 Troubleshooting

### "Cannot connect to Ollama"
```bash
# Start Ollama in a terminal
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### "Model not found"
```bash
# Download the model
ollama pull mistral

# List downloaded models
ollama list
```

### Out of Memory
```bash
# Use a smaller model
MAX_TICKS=100 PLAYER1_MODEL=tinyllama PLAYER2_MODEL=tinyllama npm run demo
```

For more help, see [INSTALLATION.md](INSTALLATION.md).

---

## 🏗️ Project Structure

```
ai-commander/
├── demo/                           # Demo executable
│   ├── simple-demo.js              # Main demo script
│   └── README.md                   # Demo documentation
├── packages/
│   ├── zeroad-adapter/             # Game integration
│   ├── match-runner/               # Match execution engine
│   ├── brain/                      # AI decision-making
│   ├── brain-ollama/               # Ollama integration
│   └── ...
├── INSTALLATION.md                 # Installation guide
├── README.md                        # This file
├── package.json                    # Project configuration
└── tsconfig.json                   # TypeScript settings
```

---

## 🎓 Getting Help

1. **First-time setup?** → [INSTALLATION.md](INSTALLATION.md)
2. **Demo questions?** → [demo/README.md](demo/README.md)
3. **Contributing?** → [CONTRIBUTING.md](CONTRIBUTING.md)
4. **Security concern?** → [SECURITY.md](SECURITY.md)
5. **Issues or bugs?** → [GitHub Issues](https://github.com/anthropics/ai-commander/issues)

---

## 📄 License

MIT License — See LICENSE file for details.

---

## 🙏 Attribution

AI Commander is built on:
- **Ollama** — Free local LLM inference
- **0 A.D.** — Open-source RTS game
- **TypeScript** — Type-safe JavaScript
- **Node.js** — JavaScript runtime

---

## 🚀 What's Next?

After running the demo:

1. **Experiment with different models:**
   ```bash
   PLAYER1_MODEL=llama2 PLAYER2_MODEL=mistral npm run demo
   ```

2. **Check the replay:**
   ```bash
   npm run replay
   cat demo-output/logs.txt
   ```

3. **Read the contribution guide:**
   ```bash
   cat CONTRIBUTING.md
   ```

4. **Build your own tournament:**
   See `packages/match-runner/README.md` for API details.

---

**Ready to get started?** → [INSTALLATION.md](INSTALLATION.md)
