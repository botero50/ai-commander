# OpenRA Adapter — Real LLM-vs-LLM Tournament Framework

Real-time LLM benchmarking against OpenRA, the open-source C&C clone. Enables competitive tournaments between Claude, GPT-4, Ollama, Gemini, and built-in brains.

## Quick Start

```bash
ai-commander tournament --brain-a claude --brain-b gpt4 --games 5
```

## Architecture

7-layer adapter from OpenRA to Brain SDK:
1. Process Manager — Launch OpenRA
2. State Reader — Poll game state
3. World Mapper — Translate to observations
4. Command Executor — Execute commands
5. Event Synchronizer — Record events
6. Gameplay Validators — Worker/Economy/Military
7. Match Orchestrator — Full match coordination

## Features

- **5 Providers**: Claude, GPT-4, Gemini, Ollama, Built-in
- **Fair Play**: Identical observations, goals, commands
- **Analysis**: Standings, ELO ratings, cost tracking, strategy
- **Replays**: Deterministic replay + comparison
- **Reports**: JSON, CSV, HTML export

## API Examples

### Single Match
```typescript
const result = await SingleMatchRunner.runMatch({
  provider1: { provider: 'claude', ... },
  provider2: { provider: 'openai', ... },
});
```

### Tournament
```typescript
const result = await TournamentEngine.run({
  format: 'double-round-robin',
  providers: new Map([...]),
  matchesPerPairing: 2,
});
```

### Cost Analysis
```typescript
const cost = CostAnalyzer.calculateCost('gpt4', inputTokens, outputTokens);
const analysis = CostAnalyzer.analyzeTournament(matchCosts);
```

## Documentation

See [START-HERE.md](./START-HERE.md) for complete guide.
