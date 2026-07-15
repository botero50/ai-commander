# @ai-commander/contracts

Core interfaces and contracts for the AI Commander framework.

## Purpose

Defines the contracts that enable:
- **AI Brains**: Pluggable decision-making engines (Ollama, Claude, OpenAI, Gemini, Stockfish, etc.)
- **Game Adapters**: Pluggable games (Chess, Checkers, RTS games, etc.)
- **Tournament System**: Match scheduling and rating
- **Event System**: Real-time event broadcasting

## Key Interfaces

### AIBrain
```typescript
interface AIBrain {
  readonly providerId: string;
  readonly modelName: string;
  decide(worldState: WorldState): Promise<BrainDecision>;
}
```

Implement to add new AI engines:
- `OllamaAIBrain` — Local LLM inference
- `ClaudeBrain` — Claude API
- `OpenAIBrain` — OpenAI API
- `StockfishBrain` — Chess engine

### GameAdapter
```typescript
interface GameAdapter {
  readonly gameId: string;
  launchGame(config: GameConfig): Promise<GameProcess>;
  executeCommands(commands: GameCommand[]): Promise<void>;
  getGameState(): Promise<GameState>;
  isGameOver(state: GameState): boolean;
}
```

Implement to add new games:
- `ChessAdapter` — Chess (UCI protocol)
- `CheckersAdapter` — Checkers
- `OpenRAAdapter` — OpenRA RTS
- Custom games

### Match & Tournament
```typescript
interface Match {
  start(): Promise<void>;
  run(): Promise<MatchResult>;
  getResult(): MatchResult;
}

interface Tournament {
  addMatch(match: Match): void;
  start(): Promise<void>;
  getResults(): Promise<TournamentResults>;
}
```

### Observer
```typescript
interface Observer {
  onGameStarted(data: MatchEventData): Promise<void>;
  onDecision(event: DecisionEvent): Promise<void>;
  onGameEnded(result: MatchResult): Promise<void>;
}
```

Subscribe to real-time events for broadcasting, analytics, logging.

## Usage

### Create a new AI brain:
```typescript
import type { AIBrain, BrainDecision, WorldState } from '@ai-commander/contracts';

export class MyBrain implements AIBrain {
  readonly providerId = 'my-provider';
  readonly modelName = 'my-model';

  async decide(worldState: WorldState): Promise<BrainDecision> {
    // Implement decision logic
    return {
      playerID: 1,
      commands: [],
      confidence: 0.95,
      timestamp: Date.now(),
    };
  }
}
```

### Create a new game adapter:
```typescript
import type { GameAdapter, GameCommand, GameState } from '@ai-commander/contracts';

export class MyGameAdapter implements GameAdapter {
  readonly gameId = 'my-game';

  async launchGame(config) { /* ... */ }
  async executeCommands(commands: GameCommand[]) { /* ... */ }
  async getGameState(): Promise<GameState> { /* ... */ }
  isGameOver(state: GameState): boolean { /* ... */ }
}
```

### Subscribe to events:
```typescript
import type { Observer, DecisionEvent } from '@ai-commander/contracts';

export class MyObserver implements Observer {
  async onDecision(event: DecisionEvent) {
    console.log('Decision made:', event.decision);
  }

  // Other event handlers...
}
```

## Structure

- `brain.ts` — AI decision engine interface
- `game-adapter.ts` — Game integration interface
- `match.ts` — Match and tournament interfaces
- `observer.ts` — Event subscription interface

## See Also

- [ChessAdapter](../chess-adapter/README.md) — Example game adapter
- [Ollama Brain](../core/README.md#ollama-ai-brain) — Example AI brain
