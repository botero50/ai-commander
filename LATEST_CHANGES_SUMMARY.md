# Latest Changes Summary (July 15, 2026)

## Two Major Fixes Applied

### 1. Architectural Fix: RL Interface Limitation (Commit 1543cf1)

**Problem**: Commands from both P1 and P2 were being sent to RL Interface, but RL Interface can only control ONE player (the human slot).

**Solution**:
- Changed game startup to: P1=`null` (RL Interface controls), P2=`petra` (built-in AI)
- Command buffer now sends ONLY P1 commands to RL Interface
- P2 commands are logged but NOT sent (Petra plays autonomously)

**Files Modified**:
- `packages/zeroad-adapter/src/arena/run-arena-loop.ts`
  - Lines 623-627: Game startup parameters
  - Lines 1297-1306: Command buffer (only P1 commands)

**Documentation**:
- `RL_INTERFACE_FIX.md` - Comprehensive explanation

### 2. Strategic Enhancements: Ollama AI (Commit 421c851)

**Problem**: Ollama was making trivial decisions (just gathering repeatedly) while Petra grew exponentially. P1 stayed at 10 units, P2 grew to 26+.

**Root Cause**: 
- Prompt only asked for MOVE commands
- BUILD command disabled (returned null)
- TRAIN command not implemented
- No strategic reasoning in game state description

**Solutions Applied**:

#### a. Enhanced Decision Prompt
- Now asks for 5 action types: **TRAIN, BUILD, MOVE, GATHER, ATTACK**
- TRAIN highlighted as "BEST WAY TO WIN - more units = victory"
- Provides strategic decision criteria based on unit count, building count
- Teaches RTS strategy in the prompt itself

#### b. Richer Game State Description
- Shows unit differential (not just counts)
- Labels situation as STRONGER/WEAKER/EQUAL
- Includes resource availability
- Provides strategy priorities tailored to game situation

#### c. Enabled BUILD Command
- Implemented `createBuildCommand()` (was returning null)
- Builds barracks, houses, storage buildings near town center
- Supports economic expansion

#### d. Implemented TRAIN Command
- New `createTrainCommand()` method
- Orders barracks to produce infantry, cavalry, ranged units
- Queues production (allows continuous training)

#### e. Better Command Routing
```
Before: All non-move → GATHER
After:  BUILD → createBuildCommand()
        TRAIN → createTrainCommand()
        GATHER → createGatherCommand()
```

#### f. Increased Diversity
- Command limit raised from 2 to 3 per tick
- Allows more varied actions each decision cycle

**Files Modified**:
- `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts`
  - `buildPrompt()` - New strategic framework
  - `describeGameState()` - Strategic context
  - `createBuildCommand()` - Full implementation
  - `createTrainCommand()` - New method
  - `parseCommands()` - Proper routing
  - Command limit: 2 → 3

**Configuration**:
- Uses Mistral model (better reasoning than tinyllama)
- Temperature: 0.7 (balanced strategy)
- Supports up to 3 actions per tick

**Documentation**:
- `OLLAMA_STRATEGIC_IMPROVEMENTS.md` - Detailed change guide
- `DIAGNOSTICS.md` - Why P1 wasn't moving before

## Expected Results

### Before All Changes
```
P1 (Ollama):  10 units, stuck, just gathering
P2 (Petra):   10 → 26 units, building, training, expanding
Outcome:      Petra wins decisively
```

### After All Changes (Expected)
```
P1 (Ollama):  10 → 15+ units (TRAIN works)
              1 → 3+ buildings (BUILD works)
              More diverse actions (TRAIN, BUILD, MOVE, GATHER)
              Competitive matches against Petra

P2 (Petra):   Still plays normally
              Still strong but not overwhelming

Outcome:      Closer matches, Ollama has real chance to win
```

## Files to Review

### Core Changes
1. `packages/zeroad-adapter/src/arena/run-arena-loop.ts` - Architectural fix (RL Interface limitation)
2. `packages/zeroad-adapter/src/rl-interface/ollama-brain.ts` - Strategic AI improvements

### Documentation
1. `RL_INTERFACE_FIX.md` - Why P1 uses RL Interface, P2 uses Petra
2. `OLLAMA_STRATEGIC_IMPROVEMENTS.md` - What changed in AI prompts/commands
3. `DIAGNOSTICS.md` - Why P1 wasn't moving (before fixes)

### Configuration
- `run-arena-loop.ts` line 135: `BRAIN_P1_ID = 'ollama:mistral'` (good model)
- `run-arena-loop.ts` line 136: `BRAIN_P2_ID = 'ollama:llama2'` (for future when RL Interface supports dual control)

## Testing

To verify improvements:
```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Watch logs for:
```
✓ Parsed BUILD command from Ollama
✓ Parsed TRAIN command from Ollama
P1 decision buffered: [commands]
Sending commands to RL Interface
```

Watch game for:
- P1 units moving/gathering (not frozen)
- P1 building new structures
- P1 unit count increasing
- Match becoming competitive vs Petra

## Known Limitations

1. **BUILD/TRAIN Format**: If 0 A.D. doesn't recognize these command types or templates don't match, they fail silently
2. **Ollama Reasoning**: Still limited vs specialized RTS engines, may need prompt tuning
3. **Template Mismatch**: Building/unit template names must match 0 A.D. civilization exactly
4. **Throttling**: Requests limited to 1 per 3 seconds per brain (prevents Ollama overload)

## Next Steps If Still Issues

1. Check logs for command failures
2. Verify 0 A.D. actually accepts BUILD/TRAIN command types
3. May need to adjust template names to match actual civilizations
4. Could implement fallback strategies if commands fail
5. Consider trying larger models (neural-chat, llama2) if mistral still doesn't strategize well

## Commits

1. `1543cf1` - "FIX: RL Interface can only control Player 1 - send only P1 commands, use Petra for P2"
2. `421c851` - "IMPROVE: Enhanced Ollama AI strategy - enable BUILD and TRAIN commands, improve decision prompt"
3. `e91c134` - "DOC: Add comprehensive guide to Ollama strategic AI improvements"

## Summary

✅ **Fixed architectural issue**: P2 commands no longer sent to RL Interface (Petra controls P2)
✅ **Enhanced AI strategy**: Ollama can now BUILD and TRAIN, not just GATHER
✅ **Improved prompts**: Asks for strategic decisions, not just movement
✅ **Better game state**: Provides strategic context for decision-making
✅ **More diverse actions**: 3 actions per tick instead of 2

**Result**: P1 (Ollama) should now be competitive with P2 (Petra) instead of always losing.
