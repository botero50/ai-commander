# API Reference: Multi-LLM Arena

Complete reference for all components and their interfaces.

## Brain Interface

Universal interface all providers implement.

```typescript
interface Brain {
  readonly name: string;
  readonly version: string;
  
  decide(input: BrainInput): Promise<BrainOutput>;
  updateMemory(): void;
  reset(): void;
  getStats?(): unknown;
}

interface BrainInput {
  readonly world: FakeWorldSnapshot;
  readonly availableGoals: Goal[];
  readonly availableActions: Action[];
  readonly memory: BrainMemory;
  readonly executionHistory: unknown[];
}

interface BrainOutput {
  readonly reasoning: {
    readonly thought: string;
    readonly analysis: string;
    readonly riskAssessment: string;
    readonly confidence: number;
  };
  readonly selectedGoal: string;
  readonly plan: {
    readonly immediateGoal: string;
    readonly steps: string[];
    readonly estimatedDuration: number;
  };
  readonly commands: any[];
  readonly metadata: {
    readonly thinkingTimeMs: number;
    readonly modelUsed: string;
    readonly confidence: number;
    readonly tokensUsed?: number;
  };
}

interface Goal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priority: number;
  readonly reward: number;
}

interface Action {
  readonly action: string;
  readonly description: string;
}

interface BrainMemory {
  readonly previousDecisions: readonly unknown[];
  readonly knownStrategies: readonly unknown[];
  readonly opponentModels: Map<string, unknown>;
}
```

## Brain Implementations

### BuiltinBrain

Reference implementation using deterministic planner.

```typescript
import { BuiltinBrain } from '@ai-commander/fake-game-adapter';

const brain = new BuiltinBrain();
const output = await brain.decide(input);
```

### OpenAIBrain

GPT-4, GPT-4 Turbo, GPT-3.5

```typescript
import { OpenAIBrain } from '@ai-commander/fake-game-adapter';

const brain = new OpenAIBrain({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',            // or 'gpt-4-turbo' or 'gpt-3.5-turbo'
  temperature: 0.7,          // 0-2
  maxTokens: 2000,
  timeoutMs: 30000,
  maxRetries: 3,
});

const stats = brain.getStats();
// {
//   apiCalls: number,
//   totalTokens: number,
//   totalCost: number,     // USD
//   averageLatencyMs: number,
//   errorCount: number,
//   retryCount: number,
// }
```

### ClaudeBrain

Claude 3 models (Opus, Sonnet, Haiku)

```typescript
import { ClaudeBrain } from '@ai-commander/fake-game-adapter';

const brain = new ClaudeBrain({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-sonnet',  // or 'claude-3-opus' or 'claude-3-haiku'
  temperature: 0.7,          // 0-1
  maxTokens: 2000,
});

const stats = brain.getStats();
```

### GeminiBrain

Google Gemini models

```typescript
import { GeminiBrain } from '@ai-commander/fake-game-adapter';

const brain = new GeminiBrain({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-pro',       // or 'gemini-1.5-pro' or 'gemini-1.5-flash'
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 2000,
});

const stats = brain.getStats();
```

### OllamaBrain

Local models (Llama2, Mistral, Qwen, Gemma, etc.)

```typescript
import { OllamaBrain } from '@ai-commander/fake-game-adapter';

const brain = new OllamaBrain({
  baseUrl: 'http://localhost:11434',
  model: 'mistral',
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 2000,
  timeoutMs: 60000,          // Local models can be slower
});

// Check server health
const healthy = await brain.isHealthy();

// List available models
const models = await brain.listModels();

const stats = brain.getStats();
```

## Brain Manager

Runtime provider selection.

```typescript
import { BrainManager } from '@ai-commander/fake-game-adapter';

const manager = new BrainManager();

// Create a brain from config
const brain = manager.createBrain({
  provider: 'claude',
  model: 'claude-3-sonnet',
  apiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.7,
});

// Register for later use
manager.registerBrain('my-claude', brain);

// Retrieve registered brain
const retrieved = manager.getBrain('my-claude');

// List all registered
const brains = manager.listBrains();

// Reset all
manager.resetAll();

// Global manager
import { getGlobalBrainManager, setupBrain } from '@ai-commander/fake-game-adapter';

const global = getGlobalBrainManager();
const brain2 = setupBrain('gpt4', {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Match Runner

Execute individual matches.

```typescript
import { MatchRunner } from '@ai-commander/fake-game-adapter';

const runner = new MatchRunner({
  maxTicks: 20,
  player1Brain: brain1,
  player2Brain: brain2,
});

const replay = await runner.runMatch();

interface MatchReplay {
  config: MatchConfig;
  startTime: number;
  endTime: number;
  durationMs: number;
  decisions: DecisionRecord[];
  metrics: MatchMetrics;
  finalState: FakeWorldSnapshot;
  worldHistory?: FakeWorldSnapshot[];
}

interface MatchMetrics {
  totalTicks: number;
  totalDecisions: number;
  totalCostUsd: number;
  costPerPlayer: { player1: number; player2: number };
  totalTokens: number;
  tokensPerPlayer: { player1: number; player2: number };
  averageLatencyMs: number;
  latencyPerPlayer: { player1: number; player2: number };
}
```

## Tournament Engine

Execute tournament formats.

```typescript
import { TournamentEngine } from '@ai-commander/fake-game-adapter';

const engine = new TournamentEngine({
  format: 'round-robin',     // or 'swiss' or 'best-of' or 'elimination'
  competitors: [
    { id: 'p1', name: 'GPT-4', brain: gptBrain },
    { id: 'p2', name: 'Claude', brain: claudeBrain },
    { id: 'p3', name: 'Gemini', brain: geminiBrain },
  ],
  matchMaxTicks: 20,
  bestOfN: 3,               // For best-of format
  roundCount: 2,            // For swiss format
});

const result = await engine.runTournament();

interface TournamentResult {
  config: TournamentConfig;
  matches: MatchResult[];
  standings: TournamentStanding[];
  winner?: Competitor;
  totalDurationMs: number;
}

interface TournamentStanding {
  competitor: Competitor;
  wins: number;
  losses: number;
  draws: number;
  costUsd: number;
  averageLatencyMs: number;
}
```

## Rating System

Track ELO and win rates.

```typescript
import { RatingSystem, RatingTracker } from '@ai-commander/fake-game-adapter';

// Single player
const rating = new RatingSystem({ initialRating: 1600 });
rating.recordMatch(1600, 'win');
rating.recordMatch(1550, 'loss');

const snapshot = rating.getSnapshot();
// {
//   rating: 1620,
//   wins: 1,
//   losses: 1,
//   draws: 0,
//   winRate: 0.5,
//   drawRate: 0,
//   totalMatches: 2,
//   confidenceInterval: { lower: 1500, upper: 1740, margin: 120 }
// }

// Multi-player
const tracker = new RatingTracker();
tracker.recordMatch('player1', 'player2', 'player1');
tracker.recordMatch('player2', 'player3', 'player2');

const rankings = tracker.getRankings();
// [
//   { playerId: 'player2', snapshot: {...} },
//   { playerId: 'player1', snapshot: {...} },
//   { playerId: 'player3', snapshot: {...} }
// ]
```

## Benchmark Reports

Multi-format reporting.

```typescript
import { BenchmarkReportGenerator } from '@ai-commander/fake-game-adapter';

const generator = new BenchmarkReportGenerator(tournamentResult, ratings);

const html = generator.generate('html');
const json = generator.generate('json');
const csv = generator.generate('csv');
const markdown = generator.generate('markdown');
```

## Replay Comparator

Compare two replays.

```typescript
import { ReplayComparator } from '@ai-commander/fake-game-adapter';

const comparator = new ReplayComparator(replay1, replay2);
const comparison = comparator.compare();

interface ReplayComparison {
  replay1Name: string;
  replay2Name: string;
  totalDecisions: number;
  divergences: DivergencePoint[];
  player1Divergences: number;
  player2Divergences: number;
  divergenceRate: number;
  confidenceDiffAvg: number;
  latencyDiffAvg: number;
}

// Get strategy shifts
const shifts = comparator.findStrategyShifts(replay, 'player1');
// [
//   { tick: 5, from: 'gather', to: 'attack' },
//   { tick: 12, from: 'attack', to: 'expand' }
// ]

// Compare latency profiles
const profile = comparator.latencyProfile(replay, 'player1');
// { min: 50, max: 2000, avg: 500, p95: 1200 }
```

## Strategy Analytics

Analyze and classify strategies.

```typescript
import { StrategyAnalyzer } from '@ai-commander/fake-game-adapter';

const analyzer = new StrategyAnalyzer(replay);
const { player1, player2 } = analyzer.analyzeStrategies();

interface StrategyProfile {
  player: 'player1' | 'player2';
  strategy: 'rush' | 'expand' | 'turtle' | 'tech' | 'boom' | 'harassment';
  confidence: number;
  metrics: StrategyMetrics;
  aggressionScore: number;
  defenseScore: number;
  economyScore: number;
  playStyle: string;
}

// Analyze matchup
const matchup = analyzer.analyzeMatchup(player1, player2);
// { advantaged: 'rush', disadvantaged: 'expand', reason: '...' }
```

## Game Validator

Test multi-game support.

```typescript
import { GameValidator } from '@ai-commander/fake-game-adapter';

const validator = new GameValidator();
const results = await validator.validateBrain(brain);

// Validates across:
// - RTS
// - Turn-based strategy
// - Puzzle
// - Card game
// - Simulation

interface GameValidationResult {
  gameType: 'rts' | 'turn-based-strategy' | 'puzzle' | 'card-game' | 'simulation';
  compatible: boolean;
  brainName: string;
  decisionsProcessed: number;
  outputsValid: number;
  errors: string[];
  executionTimeMs: number;
}

const summary = validator.getSummary(results);
// { totalGames: 5, compatibleGames: 5, compatibilityRate: 1.0, totalErrors: 0 }
```

## Experiment Runner

Hyperparameter tuning.

```typescript
import { ExperimentRunner } from '@ai-commander/fake-game-adapter';

const runner = new ExperimentRunner({
  name: 'Temperature Sweep',
  parameters: [
    { name: 'temperature', values: [0.1, 0.3, 0.5, 0.7, 0.9] },
    { name: 'model', values: ['claude-3-sonnet', 'claude-3-haiku'] },
  ],
  baseConfig: { provider: 'claude', apiKey: process.env.ANTHROPIC_API_KEY },
  matchMaxTicks: 20,
  repeatMatches: 2,
  opponents: [...],
});

const summary = await runner.runExperiment();

interface ExperimentSummary {
  name: string;
  totalConfigurations: number;
  results: ExperimentResult[];
  bestConfiguration: ExperimentResult;
  worstConfiguration: ExperimentResult;
  parameterImportance: { [param: string]: number };
}
```

## Research Dashboard

Aggregate and visualize results.

```typescript
import { ResearchDashboard } from '@ai-commander/fake-game-adapter';

const dashboard = new ResearchDashboard();
dashboard.addTournament(tournament1);
dashboard.addTournament(tournament2);
dashboard.addStrategy('GPT-4', strategyProfile);

const data = dashboard.generateDashboard();

interface DashboardData {
  generatedAt: number;
  tournaments: TournamentResult[];
  modelComparisons: ModelComparison[];
  costChart: Array<{ model: string; cost: number }>;
  latencyChart: Array<{ model: string; latency: number }>;
  winRateChart: Array<{ model: string; winRate: number }>;
  experiments?: ExperimentSummary[];
}

// Get rankings
const byWinRate = dashboard.getRankings('winRate');
const byCost = dashboard.getRankings('cost');
const byLatency = dashboard.getRankings('latency');

// Cost-performance analysis
const efficiency = dashboard.getCostPerformanceAnalysis();

// Summary stats
const summary = dashboard.getSummary();
```

## CLI Interface

Command-line and configuration.

```typescript
import { CLIInterface } from '@ai-commander/fake-game-adapter';

// Parse arguments
const config = CLIInterface.parseArgs([
  '--format', 'round-robin',
  '--models', 'gpt4,claude',
  '--ticks', '20'
]);

// Validate
const validation = CLIInterface.validateConfig(config);

// Get help
const usage = CLIInterface.getUsage();

// Get example config
const example = CLIInterface.getExampleConfig();

// Get setup guide
const guide = CLIInterface.getModelSetupGuide();

// Format output
const message = CLIInterface.formatOutput({
  success: true,
  message: 'Tournament complete',
  outputFiles: ['results.json', 'results.html']
});

// Create progress reporter
const reporter = CLIInterface.createProgressReporter(100, 'Running matches');
reporter.start();
reporter.update(50);
reporter.finish();

// Format table
const table = CLIInterface.formatTable([
  { Model: 'GPT-4', WinRate: '0.75', Cost: '$0.15' },
  { Model: 'Claude', WinRate: '0.70', Cost: '$0.05' }
], ['Model', 'WinRate', 'Cost']);
```

## Observable Protocol

Canonical world representation.

```typescript
interface ObservationJSON {
  readonly tick: number;
  readonly gameState: string;
  readonly resources: { [key: string]: number };
  readonly workers: any[];
  readonly military: any[];
  readonly knownEnemies: any[];
  readonly deposits: any[];
  readonly base: any;
}

function worldToJSON(world: FakeWorldSnapshot): ObservationJSON {
  // Converts game world to standardized JSON
}

function renderPrompt(observation: ObservationJSON): string {
  // Converts JSON to human-readable prose
}

function createObservation(
  world: FakeWorldSnapshot,
  matchType: string,
  player: string
): CanonicalObservation {
  // Returns { json, prompt, context }
}
```

---

**Generated**: From frozen v1.0 architecture  
**Status**: Production-ready (2707 tests passing)  
**Last Updated**: Latest commit
