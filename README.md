# AI Commander v2.0

🎮 The best open-source platform for comparing, benchmarking, replaying and understanding autonomous LLMs playing games under identical conditions.

## Features

- **5 Brain Providers**: OpenAI, Claude, Gemini, Ollama (local), Builtin RTS AI
- **4 Tournament Formats**: Round Robin, Swiss, Best of N, Elimination
- **Comprehensive Analysis**: ELO ratings, strategy classification, decision divergence
- **Multiple Game Adapters**: OpenRA RTS, Checkers (and extensible for more)
- **Real Cost Tracking**: USD per token with per-provider pricing
- **Rich Reports**: HTML, Markdown, JSON, CSV exports
- **Hyperparameter Tuning**: Compare temperatures, models, reasoning styles
- **Research Dashboard**: Web UI for tournament analysis and visualization

## Quick Start

```bash
git clone <repo>
cd ai-commander
pnpm install
pnpm build
```

Set API keys:
```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
```

Run a tournament:
```typescript
import { BrainManager } from '@ai-commander/brain';
import { TournamentEngine } from '@ai-commander/tournament-engine';
import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';

const gpt4 = await BrainManager.create({
  provider: 'openai',
  openai: { apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
});

const claude = await BrainManager.create({
  provider: 'claude',
  claude: { apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-3-sonnet-20240229' },
});

const result = await TournamentEngine.roundRobin({
  brains: [gpt4, claude],
  mapSeeds: [12345],
  maxTicksPerMatch: 200,
  gameAdapterId: 'openra',
});

const report = BenchmarkReporter.generateReport(result);
console.log(BenchmarkReporter.toMarkdown(report));
```

## Architecture

### Brain SDK

Universal interface for decision makers. All providers implement:

```typescript
interface Brain {
  decide(observation, goals, commands, memory): Promise<BrainDecision>;
  getMetrics?(): { totalTokensUsed, totalCost };
}
```

### Observation Protocol

Canonical JSON format + identical prompt template ensure fair comparison:

```typescript
interface WorldObservation {
  tick, timestamp, missionId,
  agent: { position, health, resources },
  units, resources, structures, visibility
}
```

### Packages

- `@ai-commander/brain` — Core interfaces, BrainManager factory
- `@ai-commander/brain-openai` — OpenAI provider (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
- `@ai-commander/brain-claude` — Claude provider (opus, sonnet, haiku)
- `@ai-commander/brain-gemini` — Gemini provider (gemini-pro, gemini-pro-vision)
- `@ai-commander/brain-ollama` — Ollama local models (llama2, qwen, deepseek, gemma)
- `@ai-commander/match-runner` — Execute single match between two brains
- `@ai-commander/tournament-engine` — Orchestrate tournaments (4 formats)
- `@ai-commander/rating-system` — ELO ratings, confidence intervals, history
- `@ai-commander/benchmark-reporter` — Export reports (HTML/MD/JSON/CSV)
- `@ai-commander/replay-player` — Replay viewer, divergence analysis
- `@ai-commander/strategy-analyzer` — Strategy classification (Rush, Turtle, etc.)
- `@ai-commander/experiment-runner` — Hyperparameter experiments
- `@ai-commander/research-dashboard` — Web dashboard for analysis
- `@ai-commander/checkers-adapter` — Example: Checkers game (multi-game validation)

## Providers

| Provider | Models | Cost Tracking | Local | Notes |
|----------|--------|---|---|---|
| OpenAI | gpt-4, gpt-4-turbo, gpt-3.5-turbo | ✅ | ❌ | Highest quality |
| Claude | opus, sonnet, haiku | ✅ | ❌ | Best long-context |
| Gemini | gemini-pro, gemini-pro-vision | ✅ | ❌ | Multi-modal |
| Ollama | llama2, qwen, deepseek, mistral, gemma | ✅ | ✅ | Run locally |
| Builtin | N/A | N/A | ✅ | RTS AI baseline |

## Tournament Formats

- **Round Robin**: All brains play all other brains on all maps. Best for comprehensive comparison.
- **Swiss**: Seeded by rating, opponents matched by score each round. Efficient for many players.
- **Best of N**: Play N games per pairing, aggregate wins. Reduces variance.
- **Elimination**: Single elimination bracket. Fast, determines clear winner.

## Example: Compare GPT-4 vs Claude vs Local Ollama

```typescript
import { ExperimentRunner } from '@ai-commander/experiment-runner';

const variants = ExperimentRunner.createVariants({
  provider: 'openai',
  openai: { apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
});

const comparison = await ExperimentRunner.runExperiment({
  name: 'Temperature Sweep',
  variants,
  tournamentsPerVariant: 3,
  mapsPerTournament: 5,
});

console.log(ExperimentRunner.generateReport(comparison));
```

## Example: Analyze Strategy from Replay

```typescript
import { StrategyAnalyzer } from '@ai-commander/strategy-analyzer';
import { ReplayPlayer } from '@ai-commander/replay-player';

const strategy = StrategyAnalyzer.generateStrategyReport(replay);
console.log(`Red strategy: ${strategy.redStrategy.strategy} (confidence: ${strategy.redStrategy.confidence.toFixed(2)})`);
console.log(`Blue strategy: ${strategy.blueStrategy.strategy}`);
console.log(`Matchup analysis: ${strategy.analysis.advantage}`);

const comparison = ReplayPlayer.analyze(replay);
console.log(`Divergences: ${comparison.divergences.length}`);
const html = ReplayPlayer.generateHTML(comparison);
fs.writeFileSync('replay.html', html);
```

## Example: View Dashboard

```typescript
import { ResearchDashboard } from '@ai-commander/research-dashboard';

const html = ResearchDashboard.generateHTML({
  tournaments: [roundRobinResult, swissResult],
  ratingHistory: ratingSystem.getHistory(),
  selectedModels: ['GPT-4', 'Claude Sonnet', 'Ollama Mistral'],
});

fs.writeFileSync('dashboard.html', html);
// Open in browser
```

## Documentation

- [Quick Start](./docs/QUICK_START.md) — 5-minute getting started guide
- [API Reference](./docs/API_REFERENCE.md) — Complete API documentation
- [Architecture](./docs/ARCHITECTURE.md) — System design and patterns

## Multi-Game Validation

Add new games without changing framework:

```typescript
// CheckersGame demonstrates universal Brain SDK
const game = new CheckersGame();
const observation = game.getObservation(playerId);
const moves = game.getAvailableMoves();

// Any brain works: GPT-4, Claude, Ollama, builtin
const decision = await brain.decide(observation, goals, moves, memory);
```

## Cost Tracking

All providers track real USD costs:

```typescript
const metrics = brain.getMetrics();
console.log(`Tokens used: ${metrics.totalTokensUsed}`);
console.log(`Cost: $${metrics.totalCost.toFixed(4)}`);
```

## Extensibility

- Add new providers: Implement Brain interface
- Add new games: Match WorldObservation/CommandOption/GoalOption pattern
- Add new reports: Use BenchmarkReport data structure
- Add new analyses: Consume MatchReplay for strategy/decision analysis

## License

MIT

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md)
