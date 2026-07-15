# RL Interface Architecture Fix

## Problem
The arena loop was trying to send commands from both Player 1 AND Player 2 to the RL Interface. However, **RL Interface can only control ONE player** (the human slot, Player 1).

When both players sent commands to RL Interface:
- Player 1 commands could work (but were delayed waiting for Player 2 Ollama)
- Player 2 commands were sent but ignored (RL Interface can't control P2)
- Result: Neither player moved reliably in-game

## Root Cause
RL Interface is designed to replace human player input. In 0 A.D., there's only ONE human player slot. Therefore:
- **Player 1 (human slot)**: Can be controlled via RL Interface
- **Player 2+ (AI slots)**: Must use 0 A.D.'s built-in AI (Petra)

## Solution
Changed `run-arena-loop.ts` to:

### 1. Game Startup Configuration (Line 623-627)
```typescript
'-autostart-ai=1:null',  // Player 1: No AI - Ollama controls via RL Interface
'-autostart-ai=2:petra', // Player 2: Petra AI (internal 0 A.D. AI)
```

**Before**: Both were `null` (no AI at all) - game had no controller
**After**: P1 `null`, P2 `petra` - P1 waits for commands, P2 plays autonomously

### 2. Command Buffer (Line 1297-1306)
```typescript
// Only send P1 commands to RL Interface
const allCommands: any[] = [...pendingP1Commands];  // Only P1 commands
pendingP1Commands = [];
pendingP2Commands = [];  // P2 commands are NOT sent (Petra controls P2)

gameState = await client.step(allCommands);
```

**Before**: `[...pendingP1Commands, ...pendingP2Commands]`
**After**: Only `[...pendingP1Commands]`

## Architecture
```
Tick N:
  1. Request P1 decision from Ollama (non-blocking, fire-and-forget)
  2. Request P2 decision from Ollama (non-blocking, but won't be used)
  3. Step game with P1 commands from Tick N-1
  4. P2 is controlled by Petra AI (internal game AI)

Tick N+1:
  1. Use P1 buffered commands from Tick N
  2. Petra continues playing as P2
  ...
```

## Framework Flexibility
The framework code keeps BRAIN_P2_ID and initializes both brains:
- **P1 Brain**: Actively controls the game via RL Interface
- **P2 Brain**: Can make decisions, but commands are ignored
  - Logged for analysis
  - Could be used for future features (e.g., predictions, coaching)
  - Future: Replace Petra with Player 2 brain when RL Interface supports it

## Next Steps
When RL Interface is extended to control multiple players:
1. Start game with `-autostart-ai=1:null` and `-autostart-ai=2:null`
2. Send both `pendingP1Commands` and `pendingP2Commands` to `client.step()`
3. No code changes needed - just uncomment the framework already supports it

## Test Reference
`packages/zeroad-adapter/src/test-r3-dual-ollama.ts` demonstrates the correct architecture:
- Only Player 1 Ollama brain is used for decisions
- Player 2 is Petra AI
- Only `decision1.commands` are sent: `await client.step(combinedCommands)`
