# Chess AI Investigation - Next Steps

**Based on:** Real game evidence (not assumptions)  
**Current bottleneck:** Extraction failures (11.4%) + weak move quality  
**Ready to test:** 3 evidence-backed fixes

---

## The 3 Fixes We're Ready to Test (Ranked by Impact)

### Fix #1: Force Structured Output in Prompt

**Problem:** Model doesn't format with "Best move: e4". Falls back to random matching 90% of time. 11.4% of moves fail extraction entirely.

**Solution:** Make prompt explicit about format.

**Change required:** Modify the prompt in `real-chess-game.js` getOllamaMove()

```javascript
// OLD:
const prompt = `${boardASCII}

${playerColor} moves: ${legalMoves.map(m => m.san).join(' ')}

Choose: `;

// NEW:
const prompt = `${boardASCII}

${playerColor} to move.
Legal moves: ${legalMoves.map(m => m.san).join(', ')}

Respond ONLY with the move in this format:
MOVE: e4

Best move: `;
```

**Expected outcome:** 
- Extraction success rate: 88.6% → 95%+ (reduce failures from 11% to <5%)
- Fewer fallbacks to random moves
- More LLM decisions executed

**Test plan:**
1. Make change
2. Run one game
3. Count extraction failures
4. Compare vs baseline (11.4%)

**Time:** 5 minutes to implement, 15 minutes to test

---

### Fix #2: Lower Temperature for Deterministic Play

**Problem:** Temperature 0.5 produces creative/random moves. Model plays weak moves like a4, g4, h3.

**Solution:** Reduce temperature to 0.2 for more focused, strategic responses.

**Change required:** Modify chess-arena-config.json

```json
{
  "players": [
    {
      "model": "tinyllama",
      "temperature": 0.2  // was 0.5
    },
    {
      "model": "tinyllama", 
      "temperature": 0.2  // was 0.5
    }
  ]
}
```

**Expected outcome:**
- More deterministic play
- Fewer random-looking moves
- Possibly improved extraction success (model follows format better)

**Test plan:**
1. Make change
2. Run one game
3. Observe move quality
4. Compare vs baseline

**Time:** <1 minute to change, 15 minutes to test

---

### Fix #3: Test Mistral 7B (Larger Model)

**Problem:** TinyLlama (1.1B) produces weak play. Maybe too small to understand chess.

**Solution:** Compare against Mistral 7B (6x larger).

**Change required:** Modify chess-arena-config.json

```json
{
  "players": [
    {
      "model": "mistral:latest",
      "temperature": 0.2
    },
    {
      "model": "mistral:latest",
      "temperature": 0.2
    }
  ]
}
```

**Expected outcome:**
- See if larger model has better extraction rate
- See if move quality improves
- Compare latency vs TinyLlama

**Test plan:**
1. Change model
2. Run one game
3. Compare extraction rate vs TinyLlama
4. Compare move quality vs TinyLlama
5. Profile latency

**Time:** <1 minute to change, 15 minutes to test

---

## Testing Protocol

For each fix:

```
1. Make ONE change
2. Run ONE game
3. Record metrics:
   - Extraction success rate
   - Number of fallbacks to random
   - Move latency (min/max/avg)
   - Move quality observations
4. Compare vs baseline (current game output)
5. Decide: Keep change? Try next fix? Combine?
```

---

## The Metrics to Track

For each game, record:

```
Extraction Quality:
- Total moves: ___
- Extraction failures: ___ (should be <4)
- Extraction success rate: ___% (should be >95%)
- Extraction strategies:
  - Structured: ___ (should be >50% if we fix prompt)
  - Token: ___ (should be <40%)
  - Regex: ___ (should be <10%)

Move Quality:
- Observation: (describe move quality)
- Examples of good moves: ___
- Examples of weak moves: ___

Latency:
- Min: ___ ms
- Max: ___ ms
- Avg: ___ ms
- Any 10+ second moves? ___

Comparison to baseline:
- Better/Same/Worse on extraction? ___
- Better/Same/Worse on quality? ___
- Better/Same/Worse on latency? ___
```

---

## Recommended Test Sequence

### Test 1: Temperature Reduction (Easiest)
```
Current: temperature 0.5
Test: temperature 0.2
Expected impact: Slightly better move quality
Risk: Very low
Time: <20 minutes
Decision rule: If moves look better, keep it. Otherwise revert.
```

### Test 2: Prompt Improvement (Medium Effort)
```
Current: Minimal prompt with "Choose: "
Test: Explicit format request "MOVE: e4"
Expected impact: Higher extraction success (reduce 11.4% failures)
Risk: Low (just text change)
Time: 20 minutes
Decision rule: If extraction failures drop below 5%, keep it
```

### Test 3: Model Upgrade (if needed)
```
Current: TinyLlama 1.1B
Test: Mistral 7B
Expected impact: Better move quality if model size is limiting factor
Risk: Low (just config change)
Time: 20 minutes
Decision rule: If quality improves >20%, switch permanently
```

---

## How to Implement

### For Temperature Fix:

1. Open: `C:\Users\boter\ai-commander\chess-arena-config.json`

2. Find:
```json
"temperature": 0.5,
```

3. Change to:
```json
"temperature": 0.2,
```

4. Save and run:
```bash
node run-instrumented-chess.js 1 chess-test
```

---

### For Prompt Fix:

1. Open: `C:\Users\boter\ai-commander\real-chess-game.js`

2. Find the getOllamaMove function (around line 302)

3. Find:
```javascript
prompt = `${boardASCII}

${playerColor} moves: ${legalMoves.map(m => m.san).join(' ')}

Choose: `;
```

4. Change to:
```javascript
prompt = `${boardASCII}

${playerColor} to move.
Legal moves: ${legalMoves.map(m => m.san).join(', ')}

Format your response as: MOVE: e4

Best move: `;
```

5. Save and run:
```bash
node run-instrumented-chess.js 1 chess-test
```

---

### For Model Upgrade:

1. Open: `C:\Users\boter\ai-commander\chess-arena-config.json`

2. Change both:
```json
"model": "mistral:latest"  // was "tinyllama"
```

3. Save and run:
```bash
node run-instrumented-chess.js 1 chess-test
```

---

## Success Criteria

You'll know each fix is working if:

### Temperature Reduction:
- ✅ Move quality noticeably improves
- ✅ No random-looking moves (a4, h3 style)
- ✅ More tactical moves visible

### Prompt Improvement:
- ✅ Extraction failures drop from 11% to <5%
- ✅ "Structured" extraction strategy usage increases
- ✅ Fewer fallbacks to random moves

### Model Upgrade:
- ✅ Extraction success rate matches or improves
- ✅ Move quality significantly better than TinyLlama
- ✅ Latency reasonable (<10s typical moves)

---

## Red Flags to Watch For

⚠️ **If extraction failures increase** → Prompt change made it worse. Revert.  
⚠️ **If latency becomes >30s typical** → Model too slow. Try smaller model.  
⚠️ **If moves become identical every game** → Temperature too low. Increase to 0.3.  
⚠️ **If Mistral is slower than TinyLlama** → Not viable for real-time play. Keep TinyLlama.

---

## Timeline

```
Now: 15 minutes - Test temperature reduction
Then: 15 minutes - Test prompt improvement
Then: 15 minutes - Test Mistral 7B (if other fixes help)
Then: 10 minutes - Decide which to keep

Total: 55 minutes for complete testing
```

---

## Ready to Go

All three fixes are:
- ✅ Evidence-backed (based on actual game data)
- ✅ Low risk (simple text/config changes)
- ✅ Quick to implement (5 minutes each)
- ✅ Easy to test (run one game)
- ✅ Easy to revert (original values saved)

**No more investigation needed. Time to test and measure.**

Start with Fix #1 (lowest effort, high impact).
