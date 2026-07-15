# Diagnostic Report: Player 1 Units Not Moving

## Observations from Logs

### Player Movement
- **Player 1**: Sample unit stuck at (339, 476) for 200+ ticks
- **Player 2 (Petra)**: Units move around: (833, 565) → (969, 700) → (926, 741) → (897, 756) → (898, 759)

### Unit Counts  
- **Player 1**: Stuck at 10 units (no growth)
- **Player 2**: Growing from 10 → 15 → 18 → 20 → 22 → 24 → 26 units

### Commands Being Sent
```
P1 commands: gather to entity 241, entities [5840,5841]
P2 commands: move to various positions
```

## Root Cause Analysis

### What's Working
✅ Game is stepping (ticks advancing)
✅ Petra AI is controlling P2 and it's playing the game (units moving, units growing)
✅ Commands are being sent to RL Interface (logs show "Sending commands")
✅ Architecture fix is correct (only P1 commands going to RL Interface)

### What's NOT Working
❌ Player 1 units not responding to gather commands
❌ Player 1 units not building new structures
❌ Player 1 units not training new units
❌ Player 1 units staying stationary

## Hypothesis

### Possibility 1: Resource Entity 241 Doesn't Exist
- `createGatherCommand()` picks first resource in world state
- But if world state has NO resources, entity 241 might be invalid
- **Check**: Log all available resources in world state

### Possibility 2: Resource Entity 241 is Unreachable
- Gather commands sent but units can't pathfind to it
- Units get stuck instead of moving
- **Check**: Compare resource location vs unit location

### Possibility 3: Build/Train Commands Disabled
- `createBuildCommand()` returns null (line 509) - **disabled!**
- So Player 1 can only gather, never builds
- Player 2 (Petra) builds internally
- **Check**: Re-enable build commands or implement them

### Possibility 4: Ollama Prompt is Too Simple
- Ollama is told to gather, so it tries gather every time
- Ollama doesn't understand RTS macro-strategy
- tinyllama (small model) can't reason about multi-step strategy
- **Check**: Use larger model like mistral, or improve the prompt

## Next Steps

1. **Debug logging**: Add what resources exist in world state each tick
2. **Build commands**: Implement proper build command generation (currently disabled)
3. **Better AI**: Use mistral or better prompt that teaches strategy
4. **Test move commands**: Create isolated test of move commands (not gather)
5. **Check RL Interface**: Verify 0 A.D. is actually receiving/executing gather commands

## Key Files
- `ollama-brain.ts` - `createGatherCommand()` (line 467), `createBuildCommand()` returns null (line 509)
- `run-arena-loop.ts` - Logs showing commands sent and unit positions
- World state mapper - May not be including all resource details needed
