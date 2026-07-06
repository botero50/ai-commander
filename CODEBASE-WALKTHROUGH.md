# Codebase Walkthrough: Multi-LLM Arena

Navigate the codebase layer by layer. Start here if you want to understand the implementation.

---

## Part 1: Foundation (What's Frozen)

### Location: `packages/fake-game-adapter/src/world/`

These files are **unchanged** from v1.0:

#### `fake-world-state.ts`
**What it does**: Manages game world simulation
- `FakeWorldSnapshot`: Game state at each tick
- `createInitialWorld()`: Start a new match
- `progressTick()`: Advance game by one timestep
- `moveWorker()`, `gatherWorker()`: Unit actions

**Key insight**: All new systems receive this snapshot as input. No modifications needed.

#### `goal-system.ts` & `action-system.ts`
**What it does**: Define what AIs can choose to do
- Goals: gather, expand, defend, attack, etc.
- Actions: move, build, train units

**Key insight**: Brain inputs receive these as `availableGoals` and `availableActions`.

---

## Part 2: New Brain Layer (Milestones N-T)

### Brain SDK (Milestone N)

**File**: `brain-sdk.ts`

This is the **contract all providers implement**. Everything else depends on this.

```typescript
interface Brain {
  readonly name: string;
  readonly version: string;
  decide(input: BrainInput): Promise<BrainOutput>;
  updateMemory(): void;
  reset(): void;
}
```

**Key classes**:
- `BuiltinBrain`: Reference implementation (uses existing planner)
- `BrainRegistry`: Manages available brains
- `BrainInput`: World snapshot + goals + memory
- `BrainOutput`: Reasoning + decision + plan

**Read this first** if you're adding a new provider.

### Observation Protocol (Milestone O)

**File**: `observation-protocol.ts`

Converts game world to canonical format so **all providers see identical input**.

```typescript
function worldToJSON(world: FakeWorldSnapshot): ObservationJSON
function renderPrompt(observation: ObservationJSON): string
```

**Key insight**: Same `FakeWorldSnapshot` → same JSON → same prompt.

**Guarantee**: Tests verify `worldToJSON` produces identical output every time.

### Provider Implementations

**Files**: `openai-brain.ts`, `claude-brain.ts`, `gemini-brain.ts`, `ollama-brain.ts`

Each implements `Brain` interface identically but:

#### OpenAI (`openai-brain.ts`)
```typescript
class OpenAIBrain implements Brain {
  constructor({
    apiKey: string,
    model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo',
    temperature?: number,
    maxTokens?: number,
  })
  
  async decide(input: BrainInput): Promise<BrainOutput>
  getStats(): { apiCalls, totalTokens, totalCost, ... }
}
```
- Token pricing: $0.00003-$0.00006 per token
- Retry: exponential backoff, max 3 retries
- Fallback: safe default decision on parse errors

#### Claude (`claude-brain.ts`)
```typescript
class ClaudeBrain implements Brain {
  constructor({
    apiKey: string,
    model: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku',
    temperature?: number,
    maxTokens?: number,
  })
}
```
- Token pricing: $0.00000025-$0.000075 per token
- Identical interface to OpenAI
- Drop-in replacement

#### Gemini (`gemini-brain.ts`)
```typescript
class GeminiBrain implements Brain {
  constructor({
    apiKey: string,
    model: 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash',
    temperature?: number,
  })
}
```
- Token pricing: $0.0005-$0.0015 per 1k tokens
- Tokenization: 1 token ≈ 3 characters

#### Ollama (`ollama-brain.ts`)
```typescript
class OllamaBrain implements Brain {
  constructor({
    baseUrl: string,  // http://localhost:11434
    model: 'mistral' | 'llama2' | 'qwen' | ...,
    temperature?: number,
  })
  
  async isHealthy(): Promise<boolean>
  async listModels(): Promise<string[]>
}
```
- No API costs (local execution)
- Longer timeouts (60s vs 30s)
- Health checks and model listing

### Brain Manager (Milestone T)

**File**: `brain-manager.ts`

Enables runtime provider switching.

```typescript
const manager = new BrainManager();

// Create from config
const brain = manager.createBrain({
  provider: 'claude',
  model: 'claude-3-sonnet',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Register for later
manager.registerBrain('my-claude', brain);

// Switch at runtime
const retrieved = manager.getBrain('my-claude');
```

**Key insight**: Zero code changes needed to switch providers. Just swap config.

---

## Part 3: Execution Layer (Milestones U-V)

### Match Runner (Milestone U)

**File**: `match-runner.ts`

Execute a single match between two brains.

```typescript
const runner = new MatchRunner({
  maxTicks: 20,
  player1Brain: brain1,
  player2Brain: brain2,
});

const replay = await runner.runMatch();
```

**What happens**:
1. For each tick (1-20):
   - Get decision from player 1 brain
   - Get decision from player 2 brain
   - Advance game world by 1 tick
2. Collect all decisions into array
3. Calculate metrics (cost, latency, tokens)
4. Return complete replay

**Key data structures**:
- `DecisionRecord`: One decision per tick (tick, player, goal, confidence, cost, latency)
- `MatchMetrics`: Aggregated stats (total cost, average latency, tokens)
- `MatchReplay`: Complete match data (decisions, metrics, final world state)

**Read this** if you want to understand how matches work.

### Tournament Engine (Milestone V)

**File**: `tournament-engine.ts`

Execute tournaments with 4 formats.

```typescript
const engine = new TournamentEngine({
  format: 'round-robin',  // or 'swiss' or 'best-of' or 'elimination'
  competitors: [
    { id: 'p1', name: 'GPT-4', brain: gptBrain },
    { id: 'p2', name: 'Claude', brain: claudeBrain },
  ],
  matchMaxTicks: 20,
});

const result = await engine.runTournament();
```

**Format implementations**:

#### Round-Robin (`roundRobin()`)
- Every player vs every other player once
- Matches: N(N-1)/2
- Guarantee: Complete ranking

#### Swiss (`swiss()`)
- Multiple rounds, minimize rematches
- Pair by strength each round
- Faster convergence than round-robin

#### Best-of-N (`bestOf()`)
- Two players, repeat N times
- Declare winner by majority
- For head-to-head validation

#### Elimination (`elimination()`)
- Single-elimination bracket
- Losers out
- Fast, complete in N-1 matches

**Read this** if you want to add a new tournament format.

---

## Part 4: Analysis Systems (Milestones W-Z)

### Rating System (Milestone W)

**File**: `rating-system.ts`

ELO-based rating with confidence intervals.

```typescript
const rating = new RatingSystem({ initialRating: 1600 });
rating.recordMatch(1550, 'win');  // Opponent was 1550
rating.recordMatch(1650, 'loss');

const snapshot = rating.getSnapshot();
// {
//   rating: 1610,
//   wins: 1,
//   losses: 1,
//   winRate: 0.5,
//   confidenceInterval: { lower: 1520, upper: 1700, margin: 90 }
// }
```

**Key algorithm**:
```
expectedScore = 1 / (1 + 10^((opponentRating - myRating) / 400))
newRating = myRating + kFactor * (actualScore - expectedScore)
```

**Key insight**: Confidence margin shrinks with more matches.

**For multi-player tracking**:
```typescript
const tracker = new RatingTracker();
tracker.recordMatch('player1', 'player2', 'player1');
const rankings = tracker.getRankings();
```

**Read this** if you want to understand how brains are ranked.

### Benchmark Reports (Milestone X)

**File**: `benchmark-reports.ts`

Generate tournament results in 4 formats.

```typescript
const generator = new BenchmarkReportGenerator(tournament, ratings);

const html = generator.generate('html');
const json = generator.generate('json');
const csv = generator.generate('csv');
const markdown = generator.generate('markdown');
```

**What gets generated**:
- **HTML**: Interactive dashboard (summary, standings table, match details)
- **JSON**: Machine-readable (summary, standings, match-by-match)
- **CSV**: Spreadsheet format (rank, competitor, wins, losses, cost, latency)
- **Markdown**: Documentation-ready

**Read this** if you want to customize reports or add new formats.

### Replay Comparator (Milestone Y)

**File**: `replay-comparator.ts`

Compare two match replays side-by-side.

```typescript
const comparator = new ReplayComparator(replay1, replay2);
const comparison = comparator.compare();

// Find divergence points
const divergences = comparison.divergences;
// [
//   { tick: 3, player: 'player1', 
//     replay1Goal: 'gather', replay2Goal: 'attack',
//     replay1Confidence: 0.8, replay2Confidence: 0.6 }
// ]
```

**Key analyses**:
- `findStrategyShifts()`: When goals change
- `costPerDecision()`: Efficiency comparison
- `latencyProfile()`: p50, p95 latencies

**Read this** if you want to understand strategy divergence.

### Strategy Analytics (Milestone Z)

**File**: `strategy-analytics.ts`

Automatically classify strategies.

```typescript
const analyzer = new StrategyAnalyzer(replay);
const { player1, player2 } = analyzer.analyzeStrategies();

// player1.strategy: 'rush' | 'expand' | 'turtle' | 'tech' | 'boom' | 'harassment'
// player1.confidence: 0.0-1.0
// player1.playStyle: "rush strategy: aggressive early game with military focus"
```

**Classification logic**:
```
aggressionScore > 0.5 && defenseScore > 0.3 → harassment
aggressionScore > 0.5 → rush
defenseScore > 0.4 → turtle
economyScore > 0.7 → expand or boom
else → tech
```

**Matchup analysis**:
```typescript
const matchup = analyzer.analyzeMatchup(player1, player2);
// { advantaged: 'rush', disadvantaged: 'expand', 
//   reason: 'Rush catches expand unprepared' }
```

**Read this** if you want to understand strategy patterns.

---

## Part 5: Advanced Features (Milestones AA-AD)

### Game Validator (Milestone AA)

**File**: `game-validator.ts`

Prove framework works across game types.

```typescript
const validator = new GameValidator();
const results = await validator.validateBrain(brain);

// Results include: rts, turn-based-strategy, puzzle, card-game, simulation
// All tested with same brain, same interface
```

**Key guarantee**: `Brain` interface works unchanged across:
- RTS (current)
- Turn-based strategy
- Puzzle games
- Card games
- Simulation games

**Read this** if you want to add a new game type.

### Experiment Runner (Milestone AB)

**File**: `experiment-runner.ts`

Hyperparameter tuning with parameter importance.

```typescript
const runner = new ExperimentRunner({
  name: 'Temperature Sweep',
  parameters: [
    { name: 'temperature', values: [0.1, 0.3, 0.5, 0.7, 0.9] },
    { name: 'model', values: ['claude-3-sonnet', 'claude-3-haiku'] },
  ],
  baseConfig: { provider: 'claude', apiKey: '...' },
  matchMaxTicks: 20,
  repeatMatches: 2,
  opponents: [...],
});

const summary = await runner.runExperiment();
// summary.bestConfiguration
// summary.parameterImportance: { temperature: 0.3, model: 0.1 }
```

**Read this** if you want to optimize LLM parameters.

### Research Dashboard (Milestone AC)

**File**: `research-dashboard.ts`

Aggregate results across tournaments.

```typescript
const dashboard = new ResearchDashboard();
dashboard.addTournament(tournament1);
dashboard.addTournament(tournament2);
dashboard.addStrategy('GPT-4', strategyProfile);

const data = dashboard.generateDashboard();

// Rankings by metric
const byWinRate = dashboard.getRankings('winRate');
const byCost = dashboard.getRankings('cost');
const byLatency = dashboard.getRankings('latency');

// Cost-performance analysis
const efficiency = dashboard.getCostPerformanceAnalysis();
// [{ model: 'GPT-4', cost: 0.15, performance: 75, efficiency: 500 }]
```

**Read this** if you want to compare multiple models.

### CLI Interface (Milestone AD)

**File**: `cli-interface.ts`

Command-line tools and configuration.

```typescript
// Parse arguments
const config = CLIInterface.parseArgs([
  '--format', 'round-robin',
  '--models', 'gpt4,claude',
  '--ticks', '20'
]);

// Validate
const { valid, errors } = CLIInterface.validateConfig(config);

// Format output
const message = CLIInterface.formatOutput({ success: true, ... });

// Format table
const table = CLIInterface.formatTable([...], ['Model', 'WinRate', 'Cost']);
```

**Read this** if you want to build CLI tools.

---

## Part 6: Testing Strategy

### Test Organization

```
tests/
├── gemini-brain.test.ts              (22 tests)
├── brain-manager.test.ts             (32 tests)
├── match-runner.test.ts              (20 tests)
├── tournament-engine.test.ts         (20 tests)
├── rating-system.test.ts             (32 tests)
├── benchmark-reports.test.ts         (30 tests)
├── replay-comparator.test.ts         (27 tests)
├── strategy-analytics.test.ts        (26 tests)
├── game-validator.test.ts            (30 tests)
├── experiment-runner.test.ts         (24 tests)
├── research-dashboard.test.ts        (27 tests)
└── cli-interface.test.ts             (35 tests)
```

**Total**: 2707 tests, 100% pass rate

### Test Patterns

#### Unit Tests (Per Component)
```typescript
describe('ComponentName', () => {
  it('does X under condition Y', () => {
    const component = new Component(config);
    const result = component.method();
    expect(result).toBe(expected);
  });
});
```

#### Integration Tests (Multiple Components)
```typescript
it('tournament with multiple providers', async () => {
  const engine = new TournamentEngine({...});
  const result = await engine.runTournament();
  
  expect(result.standings.length).toBe(competitors.length);
  expect(result.matches.length).toBeGreaterThan(0);
});
```

#### Edge Cases
- Empty inputs (no competitors)
- Single item (one competitor)
- Extreme values (0 ticks, temperature out of bounds)
- Error conditions (API timeout, parse failure)

**Read relevant test file** to understand expected behavior of any component.

---

## Part 7: Data Flow Example

Walk through a complete tournament:

### 1. Create Brains (Brain SDK)
```typescript
const brain1 = new ClaudeBrain({...});
const brain2 = new OpenAIBrain({...});
```

### 2. Create Tournament (Tournament Engine)
```typescript
const engine = new TournamentEngine({
  format: 'best-of',
  competitors: [
    { id: 'claude', name: 'Claude', brain: brain1 },
    { id: 'gpt4', name: 'GPT-4', brain: brain2 },
  ],
  matchMaxTicks: 20,
  bestOfN: 1,
});
```

### 3. Run Tournament
```typescript
const result = await engine.runTournament();
```

**What happens inside**:
1. For each match:
   a. Create `MatchRunner` with both brains
   b. For each tick:
      - Get observation (Observation Protocol)
      - Call brain1.decide() (brain-sdk.ts)
      - Call brain2.decide() (brain-sdk.ts)
      - Advance world
   c. Collect decisions and calculate metrics (match-runner.ts)
   d. Determine winner by confidence

2. Create `TournamentStanding` for each competitor

3. Sort by wins/draws

### 4. Generate Report (Benchmark Reports)
```typescript
const generator = new BenchmarkReportGenerator(result);
const html = generator.generate('html');
```

### 5. Analyze Strategies (Strategy Analytics)
```typescript
for (const match of result.matches) {
  const analyzer = new StrategyAnalyzer(match.replay);
  const strategies = analyzer.analyzeStrategies();
}
```

### 6. Aggregate Results (Research Dashboard)
```typescript
const dashboard = new ResearchDashboard();
dashboard.addTournament(result);

const data = dashboard.generateDashboard();
const rankings = dashboard.getRankings('winRate');
```

---

## Part 8: Adding a New Provider

To add a new LLM provider:

### 1. Create Class
```typescript
// src/world/new-brain.ts

import type { Brain, BrainInput, BrainOutput } from './brain-sdk.js';

export class NewBrain implements Brain {
  readonly name: string;
  readonly version = '1.0';
  
  constructor(config: NewConfig) {
    this.name = `new-brain-${config.model}`;
  }
  
  async decide(input: BrainInput): Promise<BrainOutput> {
    // 1. Create observation
    const observation = createObservation(input.world, 'match', 'player1');
    
    // 2. Build prompt
    const prompt = this.buildPrompt(input, observation.prompt);
    
    // 3. Call API with retry
    const response = await this.callNewAPIWithRetry(prompt);
    
    // 4. Parse response
    const decision = this.parseResponse(response, input);
    
    // 5. Return with metadata
    return {
      ...decision,
      metadata: {
        thinkingTimeMs: latency,
        modelUsed: this.name,
        confidence: output.confidence,
      },
    };
  }
  
  updateMemory(): void {}
  reset(): void {}
  
  getStats() { return { ... }; }
}
```

### 2. Add to Brain Manager
```typescript
// In brain-manager.ts

case 'new-provider':
  return new NewBrain({
    apiKey: config.apiKey,
    model: config.model || 'default-model',
  });
```

### 3. Write Tests
```typescript
// tests/new-brain.test.ts

describe('NewBrain', () => {
  it('implements Brain interface', () => {
    const brain = new NewBrain({...});
    expect(brain.decide).toBeDefined();
  });
  
  it('returns valid BrainOutput', async () => {
    const output = await brain.decide(input);
    expect(output.reasoning).toBeDefined();
    expect(output.selectedGoal).toBeDefined();
  });
});
```

**That's all!** Everything else (tournaments, reports, analysis) works unchanged.

---

## Learning Path

### For Users
1. Read QUICK-START-ARENA.md
2. Run a tournament with CLI
3. View HTML report
4. Experiment with different models

### For Developers
1. Read this walkthrough (Part 1-3)
2. Read brain-sdk.ts
3. Read one provider implementation (e.g., claude-brain.ts)
4. Read brain-manager.ts
5. Run tests: `pnpm test --run`

### For Architects
1. Read IMPLEMENTATION-SUMMARY.md
2. Review frozen v1.0 (fake-world-state.ts, goal-system.ts)
3. Review Brain SDK architecture (brain-sdk.ts, observation-protocol.ts)
4. Review provider implementations
5. Review tournament engine
6. Review analysis pipeline

### For Contributors
1. Complete developer path above
2. Pick an extension (new provider, new analysis, new game type)
3. Follow "Adding a New Provider" pattern
4. Write tests
5. Submit PR

---

## Key Files Summary

| File | Purpose | Lines | Tests |
|------|---------|-------|-------|
| brain-sdk.ts | Universal Brain interface | 250 | (implicit) |
| observation-protocol.ts | Canonical world format | 300 | (implicit) |
| openai-brain.ts | GPT provider | 250 | 30 |
| claude-brain.ts | Claude provider | 250 | 30 |
| gemini-brain.ts | Gemini provider | 250 | 22 |
| ollama-brain.ts | Local Ollama | 300 | 30 |
| brain-manager.ts | Runtime switching | 150 | 32 |
| match-runner.ts | Single match | 200 | 20 |
| tournament-engine.ts | Tournament formats | 350 | 20 |
| rating-system.ts | ELO + ratings | 250 | 32 |
| benchmark-reports.ts | Multi-format reports | 300 | 30 |
| replay-comparator.ts | Match analysis | 250 | 27 |
| strategy-analytics.ts | Strategy classification | 350 | 26 |
| game-validator.ts | Multi-game testing | 200 | 30 |
| experiment-runner.ts | Hyperparameter tuning | 250 | 24 |
| research-dashboard.ts | Results aggregation | 300 | 27 |
| cli-interface.ts | Command-line tools | 300 | 35 |

**Total**: ~4500 lines of implementation, ~3500 lines of tests

---

**Ready to dive in?** Start with the file that matches your interest, then read the tests to see expected behavior.
