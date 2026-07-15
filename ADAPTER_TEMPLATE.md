# Creating a Game Adapter for AI Commander Framework

This guide explains how to create a new game adapter to work with the @ai-commander/core framework.

## Overview

An adapter bridges your game and the AI tournament framework. It handles:

1. **Launching the game**
2. **Connecting to game state**
3. **Sending commands to the game**
4. **Mapping game state to framework format**
5. **Detecting win conditions**

## Step 1: Create Package Structure

```
packages/my-game-adapter/
├── src/
│   ├── game/
│   │   ├── my-game-adapter.ts      # Main adapter class
│   │   ├── game-interface.ts       # Game-specific interfaces
│   │   └── game-client.ts          # Connection to game
│   ├── brain/
│   │   └── my-game-brain.ts        # AI brain for your game
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Step 2: Implement GameAdapter Interface

```typescript
export interface GameAdapter {
  async launchGame(config: GameConfig): Promise<GameProcess>;
  async connectToGame(): Promise<GameClient>;
  async executeCommands(commands: GameCommand[]): Promise<void>;
  async getGameState(): Promise<GameState>;
  mapToWorldState(rawState: any): WorldState;
  isGameOver(state: GameState): boolean;
}

export interface GameCommand {
  type: string;  // e.g., 'move', 'attack', 'build'
  [key: string]: any;
}
```

## Step 3-6: See full template

For complete implementation details, see the Chess adapter at `/packages/chess-adapter`.

## Key Points

1. **Simple interface** - Only 6 methods to implement
2. **Flexible state** - Map any game state format to WorldState
3. **Extensible** - Add game-specific logic as needed
4. **Testable** - Each method can be tested independently

## Example

See `/packages/chess-adapter` for a complete working reference implementation.

## Pattern: Command Execution

Keep commands simple and format-specific to your game:

```typescript
async executeCommands(commands: GameCommand[]): Promise<void> {
  for (const cmd of commands) {
    await this.game.applyCommand(cmd);
  }
}
```

## Pattern: State Mapping

Extract only what the AI framework needs:

```typescript
mapToWorldState(raw: GameState): WorldState {
  return {
    time: { currentTick: { number: raw.tick } },
    agents: [], // Parse your entities
    players: [{ id: 1, name: 'P1' }],
    map: { name: 'default', width: 100, height: 100 },
  };
}
```

## Testing Checklist

- [ ] Launch game successfully
- [ ] Connect to game
- [ ] Send commands without errors
- [ ] Receive game state
- [ ] Map state correctly
- [ ] Detect game over
- [ ] Handle multiple matches sequentially

## Reference

- Core framework: `@ai-commander/core`
- Chess adapter: `/packages/chess-adapter`
- Domain types: `@ai-commander/domain`

See `/packages/chess-adapter` for complete code examples.
