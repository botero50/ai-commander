# AI Commander: AI vs AI Arena

**Automated AI tournaments for 0 A.D. with Ollama decision-making and Piper TTS voice synthesis.**

Run infinite matches with real AI models competing in real gameplay. Includes automatic recovery, live metrics, and synthesized trash talk.

---

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 18+
- Python 3.8+
- 0 A.D.
- Ollama
- 15+ GB free disk space

### Complete Setup
1. **[Follow INSTALLATION.md](INSTALLATION.md)** — Detailed step-by-step guide
2. **Run matches:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10
   ```

---

## What You Get

✅ **Real Gameplay** — 0 A.D. game engine running actual matches  
✅ **AI Decisions** — Ollama models making strategic choices every tick  
✅ **Automatic Recovery** — Crash detection and game restart  
✅ **Trash Talk** — AI-generated messages synthesized to voice via Piper TTS  
✅ **Match Rotation** — Random maps and civilizations  
✅ **ELO Ratings** — Persistent tournament rankings  
✅ **Production Ready** — Tested, documented, deployable  

---

## Features

### Core
- Real 0 A.D. matches (not simulated)
- Ollama AI decision-making
- RL Interface protocol compliance
- Per-tick command execution

### Tournament
- Continuous match loop with auto-restart
- ELO rating system
- Map/civilization rotation
- Match result tracking

### Experience
- AI-generated trash talk
- Text-to-speech voice synthesis (Piper TTS)
- Real-time game state HUD
- Match history and statistics

### Reliability
- Automatic game process recovery
- Per-component health monitoring
- Heartbeat-based crash detection
- Graceful error fallbacks

---

## Configuration

### Run Options

```bash
# Run N matches
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 10

# Run forever
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts

# Faster decisions (every 5 ticks instead of 1)
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --freq 5

# Use different model
OLLAMA_MODEL=neural-chat:latest npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
```

### Models

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| tinyllama | 637 MB | 🚀 Very Fast | Basic |
| mistral | 4.1 GB | ⚡ Fast | Good |
| neural-chat | 4.1 GB | 🐢 Slow | Excellent |

### Voice Models

Currently configured: `en_US-lessac-medium` (natural US English voice)

Other available voices: 100+ languages at https://github.com/rhasspy/piper/blob/master/voices.json

---

## Architecture

```
AI Commander
├── Game Engine (0 A.D.)
│   ├── RL Interface (port 6000)
│   └── Game state updates per tick
│
├── AI Brains (Ollama)
│   ├── Player 1 decisions
│   └── Player 2 decisions
│
├── Trash Talk Generator
│   ├── Generate text messages
│   └── Piper TTS synthesis to voice
│
└── Tournament Controller
    ├── ELO ratings
    ├── Match rotation
    ├── Auto-recovery
    └── Statistics tracking
```

---

## File Structure

```
ai-commander/
├── packages/zeroad-adapter/
│   ├── src/arena/              # Tournament loop
│   ├── src/rl-interface/       # Game communication
│   ├── src/tournament/         # ELO ratings
│   ├── src/match/              # TTS & trash talk
│   └── src/resilience/         # Recovery logic
│
├── apps/web/                   # (Future) Web UI
│
├── INSTALLATION.md             # Setup guide
├── README.md                   # This file
├── SECURITY.md                 # Security policies
└── package.json
```

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10+ / macOS 10.13+ / Linux | Any modern OS |
| RAM | 8 GB | 16+ GB |
| Disk | 15 GB | 25+ GB |
| CPU | Intel i5 / M1 | i7 / M2+ |
| GPU | Optional | NVIDIA / AMD (for faster models) |

---

## Troubleshooting

### Setup Issues
See [INSTALLATION.md](INSTALLATION.md) for detailed troubleshooting

### Common Problems

**"Game process exited"**
- Check 0 A.D. is installed at: `C:\Program Files (x86)\0 A.D. Empires Ascendant\binaries\system\pyrogenesis.exe`

**"Ollama API error"**
- Verify Ollama is running: `ollama serve` in a separate terminal
- Check models downloaded: `ollama list`

**"piper: command not found"**
- Install Piper: `pip install piper-tts`
- Download voice model (see INSTALLATION.md Step 7)

---

## Development

### Build
```bash
npm run build
```

### Project Structure
- **zeroad-adapter** — 0 A.D. integration layer
- **rl-interface** — Game communication protocol
- **tournament** — ELO and match management
- **match** — TTS and trash talk
- **resilience** — Recovery and monitoring

---

## Documentation

| Guide | Purpose |
|-------|---------|
| **[INSTALLATION.md](INSTALLATION.md)** | Complete setup with Python, Ollama, Piper TTS |
| **[SECURITY.md](SECURITY.md)** | Security policies and considerations |
| **[README.md](README.md)** | This file |

---

## What's Working

✅ Continuous AI tournament with auto-restart  
✅ Ollama decision-making per tick  
✅ ELO rating system with persistent storage  
✅ Trash talk generation and voice synthesis  
✅ Automatic crash detection and recovery  
✅ Map and civilization rotation  
✅ Real-time game state monitoring  

---

## Known Limitations

- Voice synthesis requires internet for model download
- Matches run sequentially (not parallel)
- Single-threaded AI decision-making
- No web UI yet (terminal only)

---

## Performance

Example match timings (2K screen, Ollama on CPU):
- tinyllama @ freq=10: 30-40 seconds per match
- mistral @ freq=2: 60-90 seconds per match
- neural-chat @ freq=1: 180-240 seconds per match

---

## Contributing

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [SECURITY.md](SECURITY.md) for security guidelines.

---

## License

MIT License — See LICENSE file for details

---

## Support

**Questions or issues?**
1. Check [INSTALLATION.md](INSTALLATION.md) troubleshooting section
2. Review [SECURITY.md](SECURITY.md) for security guidance
3. Check console logs for error details

---

## Getting Started

1. **Install everything**: Follow [INSTALLATION.md](INSTALLATION.md)
2. **Run first tournament**: `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3`
3. **Watch the matches**: Real 0 A.D. gameplay with AI decisions
4. **Check results**: ELO ratings and match stats in console

**Let's go!** 🎮
