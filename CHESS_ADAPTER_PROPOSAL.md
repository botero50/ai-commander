# Chess Adapter: Best Starting Point for Game-Agnostic AI Framework

## Why Chess?

✅ **Simple**: Perfect for testing AI tournament framework
✅ **Deterministic**: No RNG, perfect information
✅ **Standard Protocol**: UCI (Universal Chess Interface) - 30+ years old
✅ **Free Engines**: Stockfish, Leela Zero, etc.
✅ **HTTP Wrappers**: Chess.com, Lichess APIs available
✅ **Lightweight**: No game launcher needed, pure protocol
✅ **Perfect Testing**: AI vs AI tournaments are standard

## Implementation Plan

### Step 1: Core Chess Game Interface

```typescript
// packages/chess-adapter/src/chess-game.ts

export interface ChessState extends GameState {
  fen: string;                    // Board state in FEN notation
  legalMoves: string[];           // Available moves (e.g., "e2e4")
  currentPlayer: 'white' | 'black';
  halfMoveClock: number;          // For 50-move rule
  fullMoveNumber: number;
  gameOver: boolean;
  result?: 'white' | 'black' | 'draw';
}

export class ChessAdapter implements GameAdapter {
  private whiteEngine: ChessEngine;
  private blackEngine: ChessEngine;
  private board: Chess;  // Using chess.js library
  
  async launchGame(config: GameConfig): Promise<GameProcess> {
    this.whiteEngine = createEngine(config.white);
    this.blackEngine = createEngine(config.black);
    this.board = new Chess();
    return { pid: 'chess-game', started: Date.now() };
  }
  
  async executeCommands(commands: GameCommand[]): Promise<void> {
    for (const cmd of commands) {
      if (cmd.type === 'move') {
        this.board.move(cmd.move); // e.g., {from: 'e2', to: 'e4'}
      }
    }
  }
  
  async getGameState(): Promise<ChessState> {
    return {
      fen: this.board.fen(),
      legalMoves: this.board.moves({ verbose: true }),
      currentPlayer: this.board.turn() === 'w' ? 'white' : 'black',
      gameOver: this.board.isGameOver(),
      result: this.getResult(),
    };
  }
  
  mapToWorldState(rawState: ChessState): WorldState {
    return {
      time: { currentTick: { number: rawState.fullMoveNumber } },
      agents: this.parseBoard(rawState.fen),
      players: [
        { id: 1, name: 'White', controlledAgents: this.whiteAgents },
        { id: 2, name: 'Black', controlledAgents: this.blackAgents },
      ],
      map: { name: 'standard', width: 8, height: 8 },
    };
  }
  
  isGameOver(state: ChessState): boolean {
    return state.gameOver;
  }
}

// packages/chess-adapter/src/engines/
export interface ChessEngine {
  findBestMove(fen: string): Promise<string>;
  setLevel(depth: number): void;
}

export class UCIEngine implements ChessEngine {
  private process: ChildProcess;
  
  async findBestMove(fen: string): Promise<string> {
    // Send: "position fen [fen] go depth 20"
    // Receive: "bestmove e2e4 ponder d7d5"
    // Return: "e2e4"
  }
}

export class OllamaChessEngine implements ChessEngine {
  async findBestMove(fen: string): Promise<string> {
    const prompt = `Chess position (FEN): ${fen}\n\nBest move in UCI notation:`;
    const move = await this.ollama.generate(prompt);
    return parseMove(move);
  }
}
```

### Step 2: Brain Integration

```typescript
// packages/chess-adapter/src/brain-adapter.ts

export class ChessBrain implements AIBrain {
  private engine: ChessEngine;
  
  async decide(worldState: WorldState): Promise<BrainDecision> {
    const chessState = worldState as ChessState;
    const move = await this.engine.findBestMove(chessState.fen);
    
    return {
      playerID: worldState.currentPlayer === 'white' ? 1 : 2,
      commands: [{
        type: 'move',
        move: move,  // UCI format: e2e4
      }],
      reasoning: `Best move at depth ${this.depth}`,
      confidence: 0.95,
      timestamp: new Date(),
    };
  }
}
```

### Step 3: Tournament Integration

```typescript
// packages/chess-adapter/src/tournament.ts

export class ChessTournament {
  async runMatch(whiteAdapter: string, blackAdapter: string): Promise<MatchResult> {
    const game = new ChessAdapter();
    
    while (!game.isGameOver()) {
      // Get white move
      const whiteState = await game.getGameState();
      const whiteDecision = await whiteBrain.decide(
        game.mapToWorldState(whiteState)
      );
      
      // Execute
      await game.executeCommands(whiteDecision.commands);
      
      // Get black move
      const blackState = await game.getGameState();
      const blackDecision = await blackBrain.decide(
        game.mapToWorldState(blackState)
      );
      
      // Execute
      await game.executeCommands(blackDecision.commands);
      
      // Broadcast
      this.broadcast.emit('move', {
        move: whiteDecision.commands[0].move,
        player: 'white',
        fen: whiteState.fen,
      });
    }
    
    return this.recordResult();
  }
}
```

### Step 4: Streaming Events

```typescript
// Examples of events that work for ANY game

const events = [
  {
    type: 'decision',
    player: 'white',
    move: 'e2e4',
    reasoning: 'Controls center',
    tick: 1,
  },
  {
    type: 'evaluation',
    whiteEval: 0.35,     // Positive = white advantage
    blackEval: -0.35,
    tick: 1,
  },
  {
    type: 'game_over',
    result: 'white_wins',
    reason: 'checkmate',
    tick: 40,
  },
  {
    type: 'trash_talk',
    speaker: 'white',
    message: 'Your king is trapped!',
    tick: 25,
  },
];
```

## Advantages Over 0 A.D.

| Aspect | Chess | 0 A.D. |
|--------|-------|--------|
| **Setup Time** | 2 minutes | 20+ minutes |
| **Game Duration** | 2-10 minutes | 30-60 minutes |
| **State Size** | 64 bytes (FEN) | 10+ MB JSON |
| **Decision Complexity** | Simple (UCI) | Complex (RL Interface) |
| **AI Availability** | 100+ free engines | Only Petra |
| **Testing** | Instant | Slow iteration |
| **Success Rate** | ~100% | ~20% (commands fail) |

## Implementation Timeline

- **Week 1**: Chess adapter core + UCI engine integration
- **Week 2**: Tournament integration + streaming
- **Week 3**: Ollama chess engine + LLM tournaments
- **Week 4**: Comparative testing (Ollama vs Stockfish)

## Code Reuse from Core Framework

✅ From `@ai-commander/core`:
- Tournament system (just reuse EloRating)
- Streaming infrastructure (WebSocket works as-is)
- Brain factory pattern
- Analytics & statistics
- Commentary system
- ELO rating

❌ Not needed:
- Camera controller
- Screen automation
- RL Interface
- Game process management (just use API)

## Success Metrics

1. ✅ AI tournaments run end-to-end (no manual intervention)
2. ✅ Ollama chess engine makes legal moves
3. ✅ Tournaments complete 100% without crashes
4. ✅ Clear winner determination (no bugs)
5. ✅ Streaming works for all moves
6. ✅ Rating system tracks correctly

## Phase 2: Alternative Games (After Chess Works)

Once chess adapter works, similar adapters for:

1. **OpenRA** (if API available)
2. **Board Game Arena** (HTTP API to 50+ games)
3. **Go** (GTP protocol, like UCI)
4. **Poker** (simulator, no GUI needed)

---

## Bottom Line

✅ **Chess is the MVP game for this framework**
✅ **Replaces all 0 A.D. complexity**
✅ **Reuses 80% of core framework**
✅ **Will work 100% reliably**
✅ **Easy to test and iterate on**
