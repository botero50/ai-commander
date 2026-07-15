# @ai-commander/core

Game-agnostic AI tournament framework. Reusable across any game with a custom adapter.

## What's Included

### Tournament System
- **EloRating** - Professional chess-style rating system
- **Match Management** - Track matches, winners, ratings
- **Tournament Orchestration** - Round-robin, elimination, Swiss systems

### AI Brain Framework
- **OllamaAIBrain** - LLM-powered decision making
- **BrainFactory** - Create brains for any AI provider (Ollama, OpenAI, Anthropic)
- **Decision Logger** - Track all AI decisions
- **Request Throttler** - Prevent API overload

### Streaming & Broadcasting
- **BroadcastServer** - WebSocket server for real-time game events
- **BroadcastState** - Unified game state for broadcasting

### Analytics
- **Statistics Analyzer** - Match statistics and trends
- **Match Comparison** - Compare performances across matches
- **Prediction System** - Predict match outcomes

### Commentary System
- **Trash Talk Generator** - AI-generated commentary and trash talk
- **Event Tracking** - Track significant game events

## Quick Start

```typescript
import {
  EloRating,
  BrainFactory,
  BroadcastServer,
} from '@ai-commander/core';

// 1. Create tournament system
const rating = new EloRating([
  'ollama:mistral',  // Player 1
  'ollama:llama2',   // Player 2
]);

// 2. Create AI brains
const brainFactory = new BrainFactory();
const player1 = brainFactory.createBrain('ollama:mistral');
const player2 = brainFactory.createBrain('ollama:llama2');

// 3. Create broadcast server
const broadcast = new BroadcastServer(8765);

// 4. Run match
// - Get game state
// - Request decisions from brains
// - Update game
// - Broadcast events
// - Update ratings
```

## Creating a Game Adapter

To use this framework with your game:

```typescript
interface GameAdapter {
  async launchGame(config: GameConfig): Promise<GameProcess>;
  async connectToGame(): Promise<GameClient>;
  async executeCommands(commands: GameCommand[]): Promise<void>;
  async getGameState(): Promise<GameState>;
  mapToWorldState(rawState: any): WorldState;
  isGameOver(state: GameState): boolean;
}
```

See `/packages/chess-adapter` for a complete example with Chess.

## Examples

### Running Ollama vs Ollama Tournament
```bash
npm run tournament --model1=mistral --model2=llama2 --matches=10
```

### Custom AI Provider
```typescript
const customBrain = new CustomAIBrain(config);
// Implement AIBrain interface with your own decision logic
```

### Streaming to WebSocket Clients
```typescript
broadcast.onStateUpdate((state) => {
  broadcast.broadcastMessage({
    type: 'game_state',
    payload: state,
  });
});
```

## File Organization

```
core/
├── src/
│   ├── tournament/      # EloRating, match management
│   ├── brain/          # OllamaAIBrain, factory, throttler
│   ├── streaming/      # BroadcastServer, broadcast state
│   ├── analytics/      # Statistics, prediction
│   ├── commentary/     # Trash talk, events
│   ├── config/         # Logger config
│   ├── utils/          # Utilities
│   └── types/          # TypeScript interfaces
├── tests/              # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Integration Points

1. **Game Adapter** - Implement GameAdapter interface for your game
2. **Brain Factory** - Supported providers: Ollama, OpenAI, Anthropic (extensible)
3. **Broadcast Events** - Subscribe to any game event
4. **Rating System** - Automatic ELO calculation
5. **Analytics** - Access match data and statistics

## Performance

- **Memory**: ~10MB per match in memory
- **Throughput**: 100+ decisions per second (Ollama dependent)
- **Scalability**: Supports concurrent tournaments with separate instances

## Testing

```bash
npm run test
npm run build
npm run lint
```

## License

MIT

## Contributing

See CONTRIBUTING.md for guidelines on extending this framework.
