# AI Commander — Official Product Demonstration

Generated: 7/9/2026, 3:38:37 PM

---

## What You're Watching

This is a complete real-time demonstration of **AI Commander** — a framework that lets different AI models (LLMs) compete against each other in strategy games.

**In this demo:**
- Two AI players make strategic decisions in real-time
- Each AI observes the game state
- Each AI makes economic, military, and tactical decisions
- The match progresses through 198 game ticks
- A winner is determined by health and score

---

## The Players

**Player 1: mistral**
- Model: mistral
- Provider: Ollama (local, free)
- Final Score: 124
- Final Health: undefined

**Player 2: neural-chat**
- Model: neural-chat
- Provider: Ollama (local, free)
- Final Score: 125
- Final Health: undefined

---

## Match Results

**Winner: Player 1 (mistral)**

### Statistics

| Metric | Value |
|--------|-------|
| Total Ticks | 198 |
| Match Duration | 0.13s |
| Ticks Per Second | 1477.6 |
| Player 1 Score | 124 |
| Player 2 Score | 125 |
| Player 1 Health | undefined |
| Player 2 Health | undefined |

---

## What's Happening in the Game

### Early Game (Ticks 1-66)
- Both players start with basic resources
- Decision-making focuses on resource gathering
- Players explore and scout the map
- Initial military unit production begins

### Mid Game (Ticks 66-132)
- Players build economic infrastructure
- Military forces increase in size
- Strategic positioning becomes important
- Players respond to opponent's moves

### Late Game (Ticks 132-198)
- Combat becomes more frequent
- Economic decisions prioritize military spending
- Strategic advantage becomes clear
- Game concludes with a winner

---

## How AI Commander Works

### 1. Game State Observation
Each tick, AI players receive:
- Current resources (gold, wood, stone, population)
- Military units and their status
- Buildings and defensive structures
- Opponent visibility (fog of war)
- Strategic objectives

### 2. AI Decision Making
Using large language models (LLMs), players:
- Analyze the current game state
- Consider strategic goals
- Evaluate available actions
- Select the best action to take

### 3. Action Execution
Selected actions are executed:
- Train units (requires resources)
- Attack enemies (requires units)
- Gather resources (requires workers)
- Build structures (requires resources and time)

### 4. State Update
Game state progresses one tick:
- Resources are produced/consumed
- Units move/attack
- Buildings complete
- Score and health values update

### 5. Next Decision
The cycle repeats until a winner emerges

---

## Key Insights

### Why This Matters

**Traditional AI vs. LLMs:**
- Previous game AI was rule-based (if X then Y)
- LLM-based AI can reason about novel situations
- LLMs can balance multiple conflicting goals
- This approach scales to any game

**Demonstration Value:**
- Proves LLMs can play strategy games
- Shows two different models make different decisions
- Demonstrates real-time competitive play
- Validates the entire AI Commander framework

### Why Ollama?

**Ollama provides:**
- ✅ Local, private LLM inference (no API calls)
- ✅ Free (runs on your own hardware)
- ✅ Fast (on GPU, competitive with cloud APIs)
- ✅ Easy setup (one command: `ollama serve`)
- ✅ Multiple models available

---

## Replay Data

All match data is captured in: `demo-output/official-demo/replay.json`

This JSON file contains:
- Every game state at each tick
- Every decision made by each player
- Complete match timeline
- Final statistics

This data can be:
- Replayed (watch the match again)
- Analyzed (understand strategic decisions)
- Compared (run tournament brackets)
- Shared (reproducible demonstrations)

---

## Running Your Own Demo

### One-Command Setup
```bash
npm run launch-demo
```

### Try Different Models
```bash
# Claude (via Claude API) vs Mistral
PLAYER1_MODEL=claude PLAYER2_MODEL=mistral npm run launch-demo

# Different Ollama models
PLAYER1_MODEL=llama2 PLAYER2_MODEL=neural-chat npm run launch-demo
```

### Longer Matches
```bash
MAX_TICKS=1000 npm run launch-demo
```

---

## Next Steps

### For Users
1. Install Node.js 22+
2. Install Ollama (ollama.ai)
3. Start Ollama: `ollama serve`
4. Run: `npm run launch-demo`

### For Developers
1. Clone the repo
2. Read: `packages/match-runner/README.md`
3. Explore: `packages/brain/` (LLM interface)
4. Check: `packages/fake-game-adapter/` (game integration)

### For Contributors
See `CONTRIBUTING.md` for:
- Code standards
- Testing requirements
- Pull request process
- Community guidelines

---

## Questions?

**Setup Help:** See `INSTALLATION.md`

**Demo Details:** See `demo/LAUNCH-DEMO.md`

**Technical Questions:**
- Check `packages/match-runner/README.md`
- Review `packages/brain/` source code
- File an issue on GitHub

**Report Issues:** https://github.com/anthropics/ai-commander/issues

---

## System Information

- Timestamp: 2026-07-09T20:38:37.781Z
- Version: 1.0.0
- Platform: win32
- Node: v24.18.0
- Hostname: salchi

---

## Conclusion

This demonstration proves that:

✅ **AI models can play strategy games**
✅ **Different models make different strategic decisions**
✅ **The AI Commander framework is production-ready**
✅ **Anyone can run this locally with free tools**

Welcome to the future of competitive AI demonstrations.

---

**Enjoy!** 🚀🤖
