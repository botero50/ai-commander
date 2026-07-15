# Ollama Strategic AI Improvements

## Changes Made (Commit 421c851)

### 1. Enhanced Decision Prompt
**File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - `buildPrompt()` method

**Before**: Only asked for MOVE commands
```
IMMEDIATE ACTIONS YOU SHOULD TAKE:
- MOVE your units to good positions
- MOVE to explore the map
- MOVE to defend your base
```

**After**: Comprehensive strategic decision framework
```
AVAILABLE ACTIONS:
1. TRAIN - Order buildings to produce units (BEST WAY TO WIN)
2. BUILD - Construct structures (houses, barracks, workshops)
3. MOVE - Reposition units for defense/gathering/attack
4. GATHER - Collect wood/stone/food from resources
5. ATTACK - Assault enemy units/structures
```

### 2. Richer Game State Description
**File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - `describeGameState()` method

**Before**: Just raw numbers
```
YOUR FORCES: Units: 10, Buildings: 1
ENEMY FORCES: Units: 15, Buildings: 4
```

**After**: Strategic context
```
YOUR FORCES: 10 units, 1 building
ENEMY FORCES: 15 units, 4 buildings
SITUATION: You are WEAKER than the enemy (+5 units deficit)

STRATEGY PRIORITIES:
1. If enemy has more units: DEFEND and BUILD more units
2. If fewer buildings: BUILD structures to produce units
3. If enemy is close: MOVE to defensive positions
4. If resources nearby: MOVE workers to GATHER
5. If ahead: ATTACK to expand

CRITICAL: You must TRAIN new units constantly!
```

### 3. Enabled BUILD Command
**File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - `createBuildCommand()` method

**Before**: Returned null (disabled)
```typescript
private createBuildCommand(worldState: WorldState): GameCommand | null {
  return null; // Disabled for now
}
```

**After**: Fully implemented
```typescript
// Finds friendly buildings and constructs new structures nearby:
// - Barracks (produces military units)
// - Houses (supports population)
// - Storage houses (economic buildings)
// Places construction strategically near existing town center
```

### 4. Implemented TRAIN Command
**File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - `createTrainCommand()` method

**New feature**: Orders barracks/stables/archeries to produce units
```typescript
// Finds production buildings and queues unit production:
// - Infantry swordsmen (melee fighters)
// - Cavalry (mobile combat units)
// - Ranged units (archers)
// Trains units continuously for unit advantage
```

### 5. Updated Command Parser
**File**: `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - `parseCommands()` method

**Change**: Separated BUILD and TRAIN into their own handlers
```typescript
// Before: TRAIN → mapped to GATHER
// After: TRAIN → createTrainCommand()
//        BUILD → createBuildCommand()
```

### 6. Increased Command Diversity
- Changed command limit from 2 to 3 per tick
- Allows Ollama to take more varied actions each decision cycle

## Strategy Logic

The improved prompt teaches Ollama to think strategically:

1. **Unit Advantage Analysis**: Compare unit counts and prioritize TRAIN if behind
2. **Economic Growth**: Build production structures (barracks, houses) if behind on buildings
3. **Defense**: MOVE units to defensive positions if threatened
4. **Resource Gathering**: MOVE workers to GATHER when resources are safe
5. **Aggression**: ATTACK only when unit advantage exists

## Expected Behavior Changes

### Before These Changes
- Player 1 (Ollama): Stuck at 10 units, just gathering repeatedly from same resource
- Player 2 (Petra): Growing from 10 → 26+ units, building structures, training units
- Result: Petra wins handily

### After These Changes (Expected)
- Player 1 (Ollama): Should now:
  - BUILD structures (especially barracks) to enable training
  - TRAIN new units continuously to match/exceed enemy
  - MOVE units defensively when threatened
  - Grow from 10 → 20+ units as barracks produce soldiers
- Player 2 (Petra): Still plays normally
- Result: Much more competitive match, Ollama has a chance to win

## Configuration

All improvements use **Mistral model** (already default in run-arena-loop.ts):
```
BRAIN_P1_ID = 'ollama:mistral'  // Better reasoning than tinyllama
```

Ollama parameters optimized for strategy:
- `temperature: 0.7` - Balanced between deterministic and creative
- `topP: 0.9` - Nucleus sampling for quality responses
- `topK: 40` - Good diversity
- `numPredict: 256` - Enough tokens for multi-action responses

## Testing

To test the improvements:
```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Watch for:
- ✅ P1 building structures (logs: "✓ Parsed BUILD command")
- ✅ P1 training units (logs: "✓ Parsed TRAIN command")
- ✅ P1 unit count increasing over time
- ✅ P1 taking more diverse actions (not just gather)

## Limitations

- BUILD and TRAIN still get converted to appropriate game commands; if 0 A.D. doesn't recognize them, they'll silently fail
- Ollama's strategic reasoning is still limited compared to purpose-built RTS engines
- May need further prompt tuning based on what Ollama actually does
- If Barracks/Houses templates don't match 0 A.D., building will fail (templates may need adjustment)

## Next Steps If Still Not Working

1. Check logs for "Build command failed" or "Train command failed"
2. Verify 0 A.D. actually recognizes BUILD/TRAIN command types
3. May need to adjust template names to match actual 0 A.D. civilizations
4. Could implement fallback: if BUILD/TRAIN fail, revert to MOVE + GATHER strategy
5. Consider using larger models (neural-chat, llama2) if mistral still doesn't strategize well
