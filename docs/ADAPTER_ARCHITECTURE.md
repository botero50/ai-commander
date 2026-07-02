# Game Adapter Architecture

## Overview

The Game Adapter layer is the abstraction boundary between AI Commander and any external game.

The framework never knows how observations are obtained or how commands are executed.

All game-specific logic lives in the Adapter layer.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI COMMANDER RUNTIME                      │
│                                                               │
│  Strategy → Planner → Decision → Engine                      │
│                                                               │
│  (Game-agnostic, reusable across all games)                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   ADAPTER LAYER     │
                    │                     │
                    │  GameAdapter        │
                    │  GameSession        │
                    │  ObservationProvider│
                    │  CommandExecutor    │
                    └─────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     EXTERNAL GAME                            │
│                                                               │
│  Game State → (Observation) → WorldState                     │
│  Command → (Execution) → Game Action                         │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### GameAdapter

High-level entry point for the adapter.

Responsibilities:

- Identify the adapter (`adapterId`, `displayName`)
- Expose game capabilities (what the game supports)
- Initialize the adapter (validate game is available and compatible)
- Create game sessions (start new games or connect to running games)
- Shutdown the adapter (cleanup resources)

```typescript
const adapter = new MyGameAdapter();

await adapter.initialize({ gameInstallPath: '/path/to/game' });

const session = await adapter.createSession({
  mapName: 'Egypt',
  difficulty: 'Hard',
});

try {
  // Use session for observation and command execution
} finally {
  await session.stop();
  await adapter.shutdown();
}
```

### GameSession

Represents one running game instance.

Owns:

- `ObservationProvider`: Get world state snapshots
- `CommandExecutor`: Execute framework commands
- Lifecycle: Start, pause, resume, save, restore, stop

```typescript
// Start the game
const initialState = await session.start();

// Observation: get current state
const worldState = await session.observationProvider.getWorldState();

// Execution: run commands
const result = await session.commandExecutor.executeCommand(command);

// Optional: save/restore state
const saveId = await session.saveState?.();
await session.restoreState?.(saveId);

// Stop the game
await session.stop();
```

### ObservationProvider

Produces immutable `WorldState` snapshots from the external game.

Responsibilities:

- Translate game state into framework `WorldState`
- Ensure all observations are immutable
- Handle observation failures gracefully
- Support replay (if game supports it)

Must never expose mutable game state.

```typescript
// Get current world state
const worldState = await provider.getWorldState();
// Returns: immutable snapshot of game state

// Check if observation is possible
const available = await provider.isObservationAvailable();

// Optionally: get state from historical tick (if supported)
const historicalState = await provider.getWorldStateAt?.(tick);
```

### CommandExecutor

Executes framework `Command` objects against the external game.

Responsibilities:

- Translate framework Command into game-specific action
- Execute the command (or fail gracefully)
- Return execution result (success or failure)
- Validate commands before execution
- Handle execution failures

Must not contain game logic.

```typescript
// Check if command can be executed
const canExecute = await executor.canExecuteCommand(command);

// Execute single command
const result = await executor.executeCommand(command);
// Returns: success/failure with detailed message

// Optionally: batch execute multiple commands
const results = await executor.executeCommands?.([cmd1, cmd2]);

// Check if executor is still available
const available = await executor.isExecutionAvailable();
```

### GameCapabilities

Describes what the game adapter supports.

Flags:

- `supportsPause`: Game can pause/resume
- `supportsSaveState`: Game supports checkpoints
- `supportsDeterministicMode`: Game is deterministic
- `supportsReplay`: Game can replay command sequences
- `supportsCompleteWorldState`: Game provides full state (not partial observations)
- `supportsMultipleAgents`: Game can handle multiple agents
- `maxTicksPerSecond`: Maximum tick rate

Adapters expose capabilities to help the framework adapt its behavior:

```typescript
if (session.capabilities.supportsSaveState) {
  // Can safely save and restore to replay decisions
  const save = await session.saveState?.();
  // ...experiment...
  await session.restoreState?.(save);
} else {
  // Cannot save state, must run live
}

if (session.capabilities.supportsDeterministicMode) {
  // Framework can rely on deterministic behavior
  // Perfect for testing and replay
}
```

## Dependency Direction

**Critical**: Adapter depends on Framework, never the reverse.

```
Framework ← Adapter ← Game
```

- Framework depends on: Domain, Core, Engine, Decision, Planner
- Adapter depends on: Framework + Game-specific libraries
- Game: not aware of Framework

This ensures:

- Framework stays game-agnostic
- Adapters are completely replaceable
- New games don't require framework changes

## Observation Flow

```
External Game
     ↓
ObservationProvider.getWorldState()
     ↓
Game state → Framework WorldState
(translate, transform, immutablize)
     ↓
Framework receives immutable WorldState
(safe to use, no mutations possible)
     ↓
Planner, Decision, Engine use WorldState
(readonly access only)
```

## Command Execution Flow

```
Framework Command
(id, agentId, actionType, parameters)
     ↓
CommandExecutor.executeCommand()
     ↓
Translate to game-specific action
     ↓
Execute in game
     ↓
Capture result (success/failure)
     ↓
Framework receives CommandExecutionResult
(immutable outcome)
```

## Error Handling

All errors are typed with `AdapterErrorCode`:

- `GameNotFound`: Game executable not found
- `GameIncompatible`: Game version not compatible
- `InitializationFailed`: Cannot initialize
- `SessionStartFailed`: Cannot start game
- `ObservationFailed`: Cannot observe state
- `CommandFailed`: Command execution failed
- `ConnectionLost`: Lost connection to game
- `GameCrashed`: Game crashed or hung

```typescript
import { AdapterError, AdapterErrorCode } from '@ai-commander/adapter';

try {
  await adapter.initialize();
} catch (err) {
  if (err instanceof AdapterError) {
    switch (err.code) {
      case AdapterErrorCode.GameNotFound:
        // Handle missing game
        break;
      case AdapterErrorCode.GameIncompatible:
        // Handle version mismatch
        break;
      default:
      // Handle other errors
    }
  }
}
```

## Implementation Examples

### Minimal Adapter

What's the absolute minimum to implement?

1. `GameAdapter`: Initialize, create session, expose capabilities
2. `GameSession`: Implement start/stop
3. `ObservationProvider`: Get current state
4. `CommandExecutor`: Execute command

```typescript
class MinimalAdapter implements GameAdapter {
  async initialize() {
    // Validate game is available
  }

  async createSession() {
    // Start game, return session
    return new MinimalSession();
  }

  async shutdown() {
    // Cleanup
  }

  getAdapterInfo() {
    return { version: '1.0.0' };
  }
}

class MinimalSession implements GameSession {
  async start() {
    // Start game, return initial WorldState
  }

  async stop() {
    // Stop game
  }

  // Implement observation and execution...
}
```

### Full-Featured Adapter

What if you want all features?

1. All of the above
2. Add: `saveState`, `restoreState`, `pause`, `resume`
3. Add: `getWorldStateAt` for replay
4. Add: `executeCommands` for batching
5. Set all capability flags to `true`

## Integration Points

### With Framework

The Framework calls:

- `adapter.initialize()` - startup
- `adapter.createSession()` - when ready to play
- `session.observationProvider.getWorldState()` - every tick
- `session.commandExecutor.executeCommand()` - when decision made
- `session.stop()` - cleanup

### With Game

The Adapter calls game-specific:

- DLL hooks (Windows API, direct library calls)
- Network protocols (RPC, REST, WebSocket, gRPC)
- File I/O (configuration, save files, logs)
- Screen capture + OCR (if game has no API)
- Emulator interface (if targeting retro games)
- Or any other mechanism to observe and control

## Type Safety

All contracts are TypeScript interfaces with `readonly` properties:

- `GameCapabilities` is `readonly`
- `CommandExecutionResult` is `readonly`
- `WorldState` (from Domain) is `readonly`
- `Command` (from Domain) is `readonly`

This enforces immutability at compile-time.

Implementations can add runtime immutability with `Object.freeze()` if desired.

## Scalability

The adapter can handle:

### Single-Agent

- One agent per game session
- Framework controls one agent at a time

### Multi-Agent

- Multiple agents in same game
- Framework can control multiple agents simultaneously

### Custom Worlds

- Extend `WorldState` with game-specific fields
- Extend `Command` with game-specific actions
- Adapter translates everything correctly

### Real-Time vs Turn-Based

- Tick-based framework works with both
- Adapter can match game's native timing

## Summary

The Game Adapter is:

- **Minimal**: Just the contracts, no implementation
- **Flexible**: Adapts to any game mechanism
- **Isolated**: Game-specific code stays in adapter
- **Type-Safe**: Readonly properties enforce immutability
- **Composable**: Easy to test each piece independently
- **Replaceable**: One game per adapter, adapters can be swapped

It is the bridge between framework (game-agnostic) and game (game-specific).
