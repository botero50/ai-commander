# AI Commander API Reference

## Brain Management

### BrainManager.create()

Factory for creating brain instances.

```typescript
const brain = await BrainManager.create({
  provider: 'openai',
  openai: {
    apiKey: string,
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo',
    temperature?: number,
    maxTokens?: number,
  },
});
```

### Brain Interface

```typescript
interface Brain {
  name: string;
  version: string;
  decide(
    observation: WorldObservation,
    availableGoals: GoalOption[],
    availableCommands: CommandOption[],
    memory: ExecutionMemory,
  ): Promise<BrainDecision>;
  getMetrics?(): { totalTokensUsed: number; totalCost: number };
}
```

## Tournament Execution

### TournamentEngine.roundRobin()

All brains play all other brains on all maps.

```typescript
const result = await TournamentEngine.roundRobin({
  brains: Brain[],
  mapSeeds: number[],
  maxTicksPerMatch: number,
  gameAdapterId: string,
});
```

### TournamentEngine.swiss()

Seeded by rating, opponents matched by score each round.

```typescript
const result = await TournamentEngine.swiss({
  brains: Brain[],
  mapSeeds: number[],
  maxTicksPerMatch: number,
  gameAdapterId: string,
  rounds?: number,
});
```

### TournamentEngine.bestOfN()

Play N games per pairing.

```typescript
const result = await TournamentEngine.bestOfN({
  brains: Brain[],
  mapSeeds: number[],
  maxTicksPerMatch: number,
  gameAdapterId: string,
  gamesPerPairing: number,
});
```

### TournamentEngine.elimination()

Single elimination bracket.

```typescript
const result = await TournamentEngine.elimination({
  brains: Brain[],
  mapSeeds: number[],
  maxTicksPerMatch: number,
  gameAdapterId: string,
});
```

## Match Execution

### MatchRunner.run()

Execute one match between two brains.

```typescript
const replay = await MatchRunner.run({
  redBrain: Brain,
  blueBrain: Brain,
  mapSeed: number,
  maxTicks: number,
  gameAdapterId: string,
});
```

Returns full replay with trace (all ticks), metrics, and config.

## Reporting

### BenchmarkReporter.generateReport()

Generate benchmark metrics from tournament results.

```typescript
const report = BenchmarkReporter.generateReport(result);
```

### BenchmarkReporter.toHTML()

Export as interactive HTML.

```typescript
const html = BenchmarkReporter.toHTML(report);
fs.writeFileSync('report.html', html);
```

### BenchmarkReporter.toMarkdown()

Export as markdown table.

```typescript
const md = BenchmarkReporter.toMarkdown(report);
```

### BenchmarkReporter.toJSON()

Export as JSON.

```typescript
const json = BenchmarkReporter.toJSON(report);
```

### BenchmarkReporter.toCSV()

Export as CSV.

```typescript
const csv = BenchmarkReporter.toCSV(report);
```

## Analysis

### StrategyAnalyzer.analyze()

Classify strategy from match replay.

```typescript
const profile = StrategyAnalyzer.analyze(replay, 'red');
// profile.strategy: 'Rush' | 'Fast Expand' | 'Turtle' | 'Tech Rush' | 'Mixed'
```

### ReplayPlayer.analyze()

Detect divergences and key moments.

```typescript
const comparison = ReplayPlayer.analyze(replay);
comparison.divergences; // decision points where players differ
comparison.keyMoments; // tick numbers of significant events
```

### ExperimentRunner.runExperiment()

Compare hyperparameter variants.

```typescript
const comparison = await ExperimentRunner.runExperiment({
  name: string,
  variants: ExperimentVariant[],
  tournamentsPerVariant: number,
  mapsPerTournament: number,
});
```

## Rating System

### RatingSystem.recordMatch()

Update ratings after a match.

```typescript
ratingSystem.initialize(['model-a', 'model-b']);
ratingSystem.recordMatch('model-a', 'model-b', 'red');
ratingSystem.takeSnapshot(round);
```

### RatingSystem.getRankings()

Get sorted standings.

```typescript
const standings = ratingSystem.getRankings();
// sorted by ELO descending
```

### RatingSystem.getProgressionFor()

Get ELO history for one model.

```typescript
const progression = ratingSystem.getProgressionFor('model-a');
// [{round, elo, timestamp}, ...]
```

## Dashboard

### ResearchDashboard.generateHTML()

Generate web dashboard.

```typescript
const html = ResearchDashboard.generateHTML({
  tournaments: TournamentResult[],
  ratingHistory: HistoricalSnapshot[],
  selectedModels: string[],
});
fs.writeFileSync('dashboard.html', html);
```

## Game Adapters

### CheckersGame

Example: Checkers on 8x8 board.

```typescript
const game = new CheckersGame();
const observation = game.getObservation(playerId);
const moves = game.getAvailableMoves();
await brain.decide(observation, goals, moves, memory);
await game.executeMove(brain, playerId);
```

All adapters implement same Brain interface.
