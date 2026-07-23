# Initial Observations from Game 1 (TinyLlama vs TinyLlama)

**In Progress** - Game is still running, but patterns are emerging...

---

## Early Evidence

### 1. **Extraction Failures are Real**

**Moves 1, 6, 18, 28** show extraction failures:
```
❌ Ollama request failed: Could not extract valid move from response
⏱️  Ollama (a4) - Ollama error, using random legal move
```

**Rate observed so far:** 4 failures in 35 moves = **11.4% extraction failure rate**

This is the FIRST BOTTLENECK - more severe than expected.

---

### 2. **But...Move Extraction Works 88% of the Time**

The other 31 moves were successfully extracted with strategy distribution:
- **Token strategy:** ~90% of successful extractions
- **Regex strategy:** ~10% of successful extractions  
- **Structured strategy:** ~0% (no structured patterns working)

This suggests:
- Model doesn't format with explicit "Best move:" markers
- Model just says the move somewhere in response
- Token-matching strategy is actually the right choice for this model

---

### 3. **All Executed Moves are Legal**

Despite extraction failures and fallbacks to random moves, **100% of executed moves are legal**.

This means:
- Fallback strategy (random legal move) works
- Move validation is working correctly
- No illegal moves have made it through

---

### 4. **Response Latency is Highly Variable**

Latencies observed:
- Min: 221ms (move 13)
- Max: 56,507ms (move 7) ← **56 seconds!**
- Median: ~2-3 seconds
- Most: 0.3-5 seconds

The 56-second outlier suggests:
- Model might have hung or was waiting for GPU
- Inconsistent performance not typical

---

### 5. **Temperature Setting: 0.5 (as configured)**

All moves show same 85% confidence (structured extraction) or token-based extraction.

Temperature is set to 0.5 (relatively high) - this might affect quality.

---

## What This Tells Us

### Bottleneck #1: Move Extraction Failures (11.4% rate)

**Evidence:**
- 4 extraction failures in 35 moves
- Model produces response but we can't parse it
- Random fallback to valid moves

**Impact:**
- Game continues but loses decision quality
- Some positions get random moves instead of LLM decisions

**Next Investigation:**
- What do the failing responses look like?
- Why can't we parse them?
- Can we improve extraction patterns?

---

### Bottleneck #2: Move Format Inconsistency

**Evidence:**
- "Structured" pattern (e.g., "Best move: e4") not matching
- "Token" pattern (move appears anywhere) working 90% of time
- Model not using consistent format

**Implication:**
- Model doesn't follow instruction for structured output
- Random token matching is actually the best strategy here
- Need to improve extraction patterns or change prompt format

---

### Bottleneck #3: Response Latency Variability

**Evidence:**
- 56-second outlier (move 7)
- Generally 0.3-5 seconds, occasionally 10-30 seconds
- Latency doesn't correlate with move quality

**Implication:**
- Some responses take way too long
- Possible GPU scheduling or model initialization issues
- Not necessarily a logic problem

---

## Not Problems (So Far)

✅ **Move Legality:** 100% legal moves executed (not a bottleneck)

✅ **Model Availability:** Both players responding (model is running)

✅ **Fallback Strategy:** Works - provides legal moves when extraction fails

---

## What We Still Need to See

After both games complete:
- Complete extraction failure rate (Game 1)
- Mistral 7B extraction rate (Game 2)
- Move quality distribution (are legal moves any good?)
- Temperature correlation (if both use same 0.5)
- Error pattern summary

---

## Key Finding So Far

**Extraction failures at 11.4% is the BIGGEST IMMEDIATE BOTTLENECK**

This is preventing 1 in ~9 moves from being decided by the LLM.

---

## Next Steps

1. Wait for Game 1 to complete
2. Get full extraction failure report
3. Run Game 2 (Mistral) for comparison
4. Compare extraction rates between models
5. Analyze failed response examples
6. Propose extraction improvements

---

Still running... checking back soon for complete analysis.
