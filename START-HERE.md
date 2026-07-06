# 🚀 AI Commander Multi-LLM Arena — START HERE

Welcome! You're looking at a production-ready multi-LLM benchmarking framework. This file guides you to the right place for your needs.

---

## ⚡ Quick Navigation

### I want to...

**Run a tournament NOW**
→ Read [QUICK-START-ARENA.md](./QUICK-START-ARENA.md) (5 minutes)

**Understand what's available**
→ Read [ARENA-INDEX.md](./ARENA-INDEX.md) (navigation guide)

**Learn the full feature set**
→ Read [packages/fake-game-adapter/README-ARENA.md](./packages/fake-game-adapter/README-ARENA.md)

**Write code against the API**
→ Read [packages/fake-game-adapter/API-REFERENCE.md](./packages/fake-game-adapter/API-REFERENCE.md)

**Understand the codebase**
→ Read [CODEBASE-WALKTHROUGH.md](./CODEBASE-WALKTHROUGH.md)

**Know the technical details**
→ Read [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)

---

## 📋 What You've Got

A complete **multi-LLM benchmarking framework**:

- ✅ **5 Providers**: Builtin, OpenAI, Claude, Google Gemini, local Ollama
- ✅ **4 Tournament Formats**: Round-robin, Swiss, best-of-N, elimination
- ✅ **Real Cost Tracking**: USD per decision (model-specific pricing)
- ✅ **Strategy Analysis**: Auto-classification (rush, expand, turtle, tech, boom, harassment)
- ✅ **ELO Ratings**: With 95% confidence intervals
- ✅ **Multi-Format Reports**: HTML, JSON, CSV, Markdown
- ✅ **Hyperparameter Tuning**: Grid search with parameter importance
- ✅ **CLI Tools**: Full command-line interface
- ✅ **2707 Tests**: 100% pass rate

---

## 🎯 Example: Your First Tournament

### 1. Install (1 minute)
```bash
git clone https://github.com/anthropics/ai-commander.git
cd ai-commander
pnpm install
pnpm build
```

### 2. Set Up API Keys (optional)
```bash
# For cloud models (Claude, GPT-4, Gemini)
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."

# For local models, just install Ollama
# https://ollama.ai
```

### 3. Run Tournament (2 minutes)
```bash
# Free: built-in AI vs local Ollama model
ai-commander \
  --format round-robin \
  --models builtin,mistral \
  --ticks 10 \
  --output ./results \
  --formats html,json
```

### 4. View Results (1 minute)
```bash
open results/report.html
# or view JSON
cat results/tournament-results.json
```

---

## 📚 Documentation Map

```
Root Directory
├── START-HERE.md                    ← You are here
├── QUICK-START-ARENA.md             ← Read next (fastest path to running)
├── ARENA-INDEX.md                   ← Navigation guide for all features
├── CODEBASE-WALKTHROUGH.md          ← Layer-by-layer code tour
├── IMPLEMENTATION-SUMMARY.md        ← Technical deep dive
│
└── packages/fake-game-adapter/
    ├── README-ARENA.md              ← Complete feature reference
    ├── API-REFERENCE.md             ← All APIs and interfaces
    └── src/world/
        ├── brain-sdk.ts             ← Universal provider interface
        ├── observation-protocol.ts  ← Canonical world format
        ├── openai-brain.ts          ← GPT provider
        ├── claude-brain.ts          ← Claude provider
        ├── gemini-brain.ts          ← Gemini provider
        ├── ollama-brain.ts          ← Local Ollama provider
        ├── brain-manager.ts         ← Runtime provider switching
        ├── match-runner.ts          ← Single match execution
        ├── tournament-engine.ts     ← Tournament formats
        ├── rating-system.ts         ← ELO ratings
        ├── benchmark-reports.ts     ← Report generation
        ├── replay-comparator.ts     ← Match analysis
        ├── strategy-analytics.ts    ← Strategy classification
        ├── game-validator.ts        ← Multi-game support
        ├── experiment-runner.ts     ← Hyperparameter tuning
        ├── research-dashboard.ts    ← Results aggregation
        └── cli-interface.ts         ← Command-line tools
```

---

## 🏃 Suggested Reading Path

### Path 1: User (Want to run tournaments)
1. QUICK-START-ARENA.md (5 min)
2. Run a tournament (2 min)
3. View HTML report (1 min)
4. Explore different models/formats

### Path 2: Developer (Want to understand code)
1. QUICK-START-ARENA.md (5 min)
2. CODEBASE-WALKTHROUGH.md (15 min)
3. Read brain-sdk.ts (5 min)
4. Read one provider (10 min)
5. Read tournament-engine.ts (10 min)

### Path 3: Architect (Want full picture)
1. IMPLEMENTATION-SUMMARY.md (15 min)
2. CODEBASE-WALKTHROUGH.md (20 min)
3. API-REFERENCE.md (20 min)
4. Skim key files (brain-sdk.ts, tournament-engine.ts, rating-system.ts)

### Path 4: Contributor (Want to extend)
1. Complete Path 2
2. ARENA-INDEX.md (10 min)
3. CODEBASE-WALKTHROUGH.md Part 8: "Adding a New Provider"
4. Write a test
5. Implement the feature

---

## ✨ Key Features Explained (2-min Summary)

### Brain SDK
All providers implement a **universal `Brain` interface**. Switch providers at runtime without code changes.

### Observable Protocol
Every provider receives **identical JSON + prose** from the game world. No hidden APIs, fair comparison.

### Real Cost Tracking
Every decision includes **actual USD cost** based on model pricing:
- GPT-4: $0.00003-$0.00006 per token
- Claude Sonnet: $0.000003-$0.000015 per token
- Gemini: $0.0005-$0.0015 per 1k tokens
- Ollama: $0.00 (local)

### Tournament Formats
- **Round-robin**: Full ranking (every vs every)
- **Swiss**: Efficient ranking (minimize rematches)
- **Best-of-N**: Head-to-head validation (repeat N times)
- **Elimination**: Fast (N-1 matches for N players)

### Strategy Analysis
Automatic classification into 6 strategies:
- Rush (early military aggression)
- Expand (economic expansion)
- Turtle (defensive)
- Tech (technology focus)
- Boom (economic buildup)
- Harassment (repeated attacks)

### ELO Rating
Skill rating with confidence intervals that shrink as more matches are played.

### Multi-Format Reports
HTML (interactive), JSON (machine-readable), CSV (spreadsheet), Markdown (docs).

---

## 🎮 What Providers Can Do

Every provider can:
- ✅ Play any game (RTS, turn-based, puzzle, card, simulation)
- ✅ See world state in JSON + prose
- ✅ Choose from available goals
- ✅ Execute available actions
- ✅ Build multi-step plans
- ✅ Explain reasoning
- ✅ Track memory across ticks

No provider has advantages. All see identical context. Pure skill-based comparison.

---

## 💡 Real-World Use Cases

**For ML Engineers**
- Compare GPT-4 vs Claude vs Gemini under identical conditions
- Find optimal temperature settings (hyperparameter tuning)
- Analyze cost vs performance trade-offs
- Track how strategies differ across models

**For Researchers**
- Benchmark multi-step reasoning under time pressure
- Study strategy emergence across different architectures
- Measure decision confidence vs accuracy
- Validate model rankings across game types

**For Product Teams**
- Choose which LLM to use for real applications
- Optimize cost (local Ollama vs cloud APIs)
- Understand capability trade-offs
- Plan model deprecation/upgrades

**For DevOps**
- Monitor cost per decision
- Track decision latency by provider
- Set up cost alerts
- Validate model deployments

---

## ❓ FAQ

**Q: Can I add a new provider?**
A: Yes! Implement the `Brain` interface (~250 lines). See CODEBASE-WALKTHROUGH.md Part 8.

**Q: Can I test a different game?**
A: Yes! Framework proven to work across 5+ game types. See game-validator.ts.

**Q: How do I know which model is best?**
A: Run a tournament. Reports include win rate, cost, latency, and strategy analysis.

**Q: Can I run this locally?**
A: Yes! Use Ollama (free, no API keys) or mix with cloud APIs.

**Q: How much does a tournament cost?**
A: Depends on models. 2 models, 10 ticks: ~$0.05. See QUICK-START-ARENA.md for cost estimates.

**Q: Is the architecture frozen?**
A: Yes. v1.0 game simulation is unchanged. All 14 new milestones are additive layers.

---

## 🚀 Next Steps

1. **Read QUICK-START-ARENA.md** (5 min)
2. **Install and run a tournament** (5 min)
3. **View the HTML report** (1 min)
4. **Explore other features** (configure formats, try different models, etc.)
5. **Check ARENA-INDEX.md** for what else is available

---

## 📞 Getting Help

- **How do I run tournaments?** → QUICK-START-ARENA.md
- **What features exist?** → ARENA-INDEX.md
- **How do I write code?** → API-REFERENCE.md
- **How does it work?** → CODEBASE-WALKTHROUGH.md
- **Technical details?** → IMPLEMENTATION-SUMMARY.md

---

## ✅ Status

- **Tests**: 2707 passing, 0 failures
- **Providers**: 5 (Builtin, OpenAI, Claude, Gemini, Ollama)
- **Tournament Formats**: 4 (round-robin, swiss, best-of, elimination)
- **Reports**: 4 formats (HTML, JSON, CSV, Markdown)
- **Documentation**: Complete
- **Production Ready**: Yes

---

**Go build something awesome!** 🎮🧠

Start with [QUICK-START-ARENA.md](./QUICK-START-ARENA.md) →
