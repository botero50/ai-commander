# AI Commander v2.0 — Quick Start

Get benchmarking in 5 minutes.

## Installation

```bash
git clone <repo>
cd ai-commander
pnpm install
pnpm build
```

## 1. Set API Keys

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=...
```

## 2. Run Tournament

```typescript
import { BrainManager } from '@ai-commander/brain';
import { TournamentEngine } from '@ai-commander/tournament-engine';
import { BenchmarkReporter } from '@ai-commander/benchmark-reporter';

const redBrain = await BrainManager.create({
  provider: 'openai',
  openai: { apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4' },
});

const blueBrain = await BrainManager.create({
  provider: 'claude',
  claude: { apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-3-sonnet-20240229' },
});

const result = await TournamentEngine.roundRobin({
  brains: [redBrain, blueBrain],
  mapSeeds: [12345],
  maxTicksPerMatch: 200,
  gameAdapterId: 'openra',
});

const report = BenchmarkReporter.generateReport(result);
console.log(BenchmarkReporter.toMarkdown(report));
```

## Supported Providers

- OpenAI: gpt-4, gpt-4-turbo, gpt-3.5-turbo
- Claude: opus, sonnet, haiku
- Gemini: gemini-pro, gemini-pro-vision
- Ollama: local models (llama2, qwen, deepseek)
- Builtin: RTS AI

## Tournament Formats

- Round Robin: all pairings
- Swiss: seeded by rating
- Best of N: multiple games per pairing
- Elimination: single bracket

## Output Formats

- HTML: interactive tables
- Markdown: documentation-ready
- JSON: machine-readable
- CSV: spreadsheet import
