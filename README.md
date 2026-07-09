# 🎮 AI Commander v1.0

**Competitive platform for running AI agents against each other in real-time strategy games.**

Watch two independent AI models compete in 0 A.D., making real-time decisions in an identical environment.

---

## ✨ What It Does

AI Commander orchestrates competitive matches between AI agents with:

- ✅ **Multi-brain orchestration** — Run multiple AI models simultaneously with isolated execution contexts
- ✅ **Game-agnostic framework** — Pluggable adapters for any RTS game (0 A.D., Spring RTS, others)
- ✅ **Live spectator experience** — Watch AI agents make decisions in real-time
- ✅ **Tournament system** — Round-robin, single-elimination, double-elimination, Swiss formats with ELO ratings
- ✅ **Professional reporting** — Automatic match analysis with telemetry and statistics
- ✅ **Replay system** — Save and replay all matches with full decision history

---

## 🚀 Quick Start

### Minimum Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build

# 2. Run a match with built-in AI
npx ts-node demo.ts
```

**Works with no external dependencies.** Uses rule-based AI.

### With Ollama (15 minutes)

```bash
# 1. Install Ollama
# Download from https://ollama.ai/ or: curl -fsSL https://ollama.ai/install.sh | sh

# 2. Start Ollama service (in another terminal)
ollama serve

# 3. Pull a model
ollama pull mistral

# 4. Run an Ollama vs Ollama match
npx ts-node demo.ts --player1 ollama --player2 ollama
```

**Runs completely locally.** No API keys needed.

### With Claude or GPT

```bash
# Set your API keys
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...

# Run mixed tournament
npx ts-node demo.ts --player1 claude --player2 gpt-4
```

---

## 🎯 Available AI Providers

| Provider | Type | Cost | Setup Time |
|----------|------|------|-----------|
| **Builtin** | Rule-based AI | Free | Ready now |
| **Ollama** | Local LLMs | Free | 5 min (download models) |
| **Claude** | Anthropic API | $$ | 2 min (add API key) |
| **GPT** | OpenAI API | $$ | 2 min (add API key) |
| **Gemini** | Google API | $$ | 2 min (add API key) |

---

## 📦 What's Included

### Core Framework
- **Brain SDK** — Universal interface for all AI providers
- **Match Runner** — Execute single matches between two brains
- **Tournament Engine** — Schedule and run multi-match tournaments
- **Replay System** — Save/load full match history
- **Dashboard** — Real-time visualization (React)

### Game Adapters
- **0 A.D.** — Full integration with live match window
- **Spring RTS** — Framework complete, ready for gameplay

### 1,235+ Tests
- All systems thoroughly tested
- Type-safe TypeScript throughout
- Production-ready code

---

## 🎬 Running a Match

```typescript
import { BrainManager } from '@ai-commander/brain';
import { ZeroADAdapter } from '@ai-commander/zeroad-adapter';
import { OllamaMatchExecutor } from '@ai-commander/match-runner';

// Create two brains
const brain1 = await BrainManager.create({
  provider: 'ollama',
  model: 'mistral',
  endpoint: 'http://localhost:11434',
});

const brain2 = await BrainManager.create({
  provider: 'ollama',
  model: 'llama2',
  endpoint: 'http://localhost:11434',
});

// Create match
const adapter = new ZeroADAdapter();
const gameSession = await adapter.createSession({
  map: 'Schwarzwald',
  difficulty: 'hard',
});

// Run match
const executor = new OllamaMatchExecutor({
  brain1,
  brain2,
  maxTicks: 1000,
});

const result = await executor.execute(gameSession);

console.log(`Winner: Player ${result.winner}`);
console.log(`Duration: ${result.duration}s`);
console.log(`Replay saved: ${result.replayPath}`);
```

---

## 🏆 Tournament System

Run multiple matches with automatic ELO rating:

```typescript
import { TournamentBracket } from '@ai-commander/match-runner';

const bracket = new TournamentBracket('round-robin', [
  { id: 'p1', name: 'Mistral', provider: 'ollama', model: 'mistral' },
  { id: 'p2', name: 'Claude', provider: 'claude' },
  { id: 'p3', name: 'Builtin', provider: 'builtin' },
]);

// Run tournament
for (let match = bracket.getNextMatch(); match; match = bracket.getNextMatch()) {
  const result = await executor.execute(match);
  bracket.recordResult(match.matchId, result.winner);
}

// View standings
const standings = bracket.getStandings();
standings.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name}: ${s.wins}W-${s.losses}L (${s.rating} ELO)`);
});
```

---

## 📊 Architecture

```
Brains (AI)              Match Runner            Game Adapter
  Claude     ──┐
   GPT       ──┼─→ Match Executor ──→ WorldObservation
  Ollama     ──┤                      (Brain decides)
  Builtin    ──┘                      │
                                      ↓
                                   Game Engine
                                   (0 A.D. / Spring RTS)
```

### Key Design

- **Brain SDK** — Identical interface for all providers
- **WorldObservation** — Canonical JSON format, ensures fair comparison
- **Isolated Execution** — Each brain runs in separate context with its own memory
- **Game-Agnostic** — Framework doesn't know about game rules, only observation/action protocol
- **Type-Safe** — Full TypeScript, zero runtime surprises

---

## 📋 System Requirements

### Minimum
- **Node.js** 22.0.0+
- **pnpm** 9.0.0+
- **Git** (to clone repo)

### Optional (based on what you want to do)
- **Ollama** — For local LLMs (download from https://ollama.ai/)
- **0 A.D.** — For game window (download from https://play0ad.com/)
- **API Keys** — For Claude/GPT/Gemini

---

## 📚 Documentation

- **[RELEASE_NOTES.md](./RELEASE_NOTES.md)** — What's included in v1.0
- **[DEMO.md](./DEMO.md)** — Complete walkthrough with code examples
- **[INSTALLATION_VALIDATION_REPORT.md](./INSTALLATION_VALIDATION_REPORT.md)** — Installation validation details

---

## ✅ Quality Assurance

- ✅ 1,235+ tests passing
- ✅ Full type safety (TypeScript strict mode)
- ✅ Zero game-specific code in framework
- ✅ Production-ready architecture
- ✅ Clean, atomic git history

---

## 🎯 Next Steps

1. **Try the demo:** `npx ts-node demo.ts`
2. **Read DEMO.md** for complete walkthrough
3. **Run a tournament:** Create a TournamentBracket with your choice of brains
4. **Extend it:** Add new brain providers or game adapters using the SDK

---

## 🤝 Contributing

Contributions welcome! Areas for extension:
- New brain providers (e.g., local models, custom inference)
- New game adapters (any RTS with observation/action protocol)
- New tournament formats
- Performance improvements
- Documentation and examples

---

## 📄 License

MIT

---

## 🚀 Vision

**AI Commander proves that autonomous AI agents can compete fairly in complex environments.**

Two independent models. Same game. Same time. Different strategies. Let's see who wins.

---

**Status:** Production Ready MVP  
**Tests:** 1,235+ passing  
**Code:** 50,000+ lines of TypeScript  
**Ready:** Yes

🎮 **Let the games begin.**
