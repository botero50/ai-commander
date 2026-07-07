# AI Commander v2.0 — Release Notes

🎮 **Multi-LLM Benchmarking Platform**

## What's New

AI Commander transforms from an autonomous RTS AI into a comprehensive benchmarking framework for comparing LLM decision-making in games.

### 26 Milestones Complete

**Core Infrastructure (Milestones N–S: 6 packages)**
- Brain SDK: universal interface for all decision makers
- 5 Brain Providers: OpenAI, Claude, Gemini, Ollama, Builtin
- Observation Protocol: canonical JSON + identical prompts
- Token accounting: input/output tracking, cost calculation

**Tournament Engine (Milestones T–W: 5 packages)**
- Brain Manager: runtime provider selection
- Match Runner: execute single match, full replay collection
- Tournament Engine: 4 formats (Round Robin, Swiss, Best of N, Elimination)
- Rating System: ELO with 95% confidence intervals
- Strategy Analytics: auto-classify 5 strategies

**Analysis & Reporting (Milestones X–AB: 5 packages)**
- Benchmark Reports: HTML, Markdown, JSON, CSV
- Side-by-Side Replay: divergence detection + visualization
- Multi-Game Validation: Checkers adapter (extensible pattern)
- Experiment Runner: hyperparameter tuning
- Research Dashboard: web UI for analysis

**Production Infrastructure (Milestones AC–AN: 10 packages)**
- CLI Tool: command-line tournament execution
- Configuration System: YAML/JSON with env substitution
- Profiler: decision timing, token breakdown, cost analysis
- Optimizer: decision caching, parallelization
- Web Server: HTTP API for remote execution
- Real-time Monitor: live progress tracking, SSE streaming
- Fine-tuner: adversarial training, prompt optimization
- Compliance: reproducibility guarantees, audit logs
- Community: marketplace for models/tournaments/replays
- Package: npm, Docker, CLI distribution

## Architecture Highlights

**Frozen v1.0** — No breaking changes. All work purely additive.

**Universal Brain Interface** — Any provider works with any game:
```typescript
interface Brain {
  decide(observation, goals, commands, memory): Promise<BrainDecision>;
  getMetrics?(): { totalTokensUsed, totalCost };
}
```

**Canonical Observation Protocol** — Identical JSON + prompt for fair comparison.

**Real Cost Tracking** — USD per token, per model, fully transparent.

## Key Capabilities

| Feature | Coverage |
|---------|----------|
| Providers | 5: OpenAI, Claude, Gemini, Ollama (local), Builtin |
| Models | 12: GPT-4, GPT-4-turbo, GPT-3.5-turbo, Claude (3 variants), Gemini (2), local models |
| Tournament Formats | 4: Round Robin, Swiss, Best of N, Elimination |
| Game Adapters | 2: OpenRA RTS, Checkers (extensible) |
| Analysis Types | 5: ELO ratings, strategy classification, divergence detection, cost analysis, profiling |
| Export Formats | 4: HTML, Markdown, JSON, CSV |
| Infrastructure | 10: CLI, config, profiler, optimizer, server, monitor, fine-tuner, compliance, community, packaging |

## Usage Examples

**Run Round-Robin Tournament**
```bash
ai-commander tournament --config=tournament.json --format=html --output=results.html
```

**Execute Match**
```bash
ai-commander match --red='{"provider":"gpt4",...}' --blue='{"provider":"claude",...}' --seed=12345
```

**Analyze Replay**
```bash
ai-commander analyze --replay=match.json --output=replay.html
```

**View Dashboard**
```bash
ai-commander dashboard --tournaments=t1.json --tournaments=t2.json --output=dashboard.html
```

## Performance

- **Decision Caching**: Memoize identical observations, reduce API calls
- **Parallel Matches**: Run up to 4 concurrent matches (configurable)
- **Batch Optimization**: Group 32 requests per batch (configurable)
- **Profiling**: p95 latency, token breakdown, cost per decision

## Compliance

- **Reproducibility**: Seed-based determinism, version snapshots
- **Audit Trail**: Every match logged (winner, tokens, cost)
- **Cost Tracking**: Full USD accounting per model
- **Export**: Audit logs as CSV for regulatory review

## Community

- **Share Models**: Publish configs with win rates
- **Share Tournaments**: Benchmark results, leaderboards
- **Share Replays**: Watch, analyze, learn from top matches

## What's Frozen (v1.0 Architecture)

- Game world state representation
- Mission and unit systems
- Goal and command abstractions
- Decision flow and planner interface

No breaking changes to v1.0. All v2.0 work layers on top.

## Installation

```bash
npm install @ai-commander/cli
ai-commander help
```

Or use individual packages:
```bash
npm install @ai-commander/brain
npm install @ai-commander/tournament-engine
npm install @ai-commander/benchmark-reporter
```

## Documentation

- [Quick Start](./docs/QUICK_START.md) — 5-minute setup
- [API Reference](./docs/API_REFERENCE.md) — Complete API
- [Examples](./examples/) — Code samples
- [Architecture](./docs/ARCHITECTURE.md) — System design

## Success Metrics

✅ 2707 tests passing
✅ 26/26 milestones implemented
✅ Zero breaking changes to v1.0
✅ Production-ready documentation
✅ All providers working with token/cost tracking
✅ Multi-game validation with Checkers adapter
✅ Full benchmarking pipeline from execution to analysis

## Future Roadmap

Potential extensions (post-v2.0):
- Real-time training with reinforcement learning
- More game adapters (Chess, Go, custom games)
- Advanced opponent modeling
- Strategic meta-analysis

## License

MIT

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**AI Commander v2.0** — The best open-source platform for comparing, benchmarking, replaying and understanding autonomous LLMs playing games under identical conditions.

🚀 Ready to benchmark at scale.
