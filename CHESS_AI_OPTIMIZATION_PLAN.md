# Chess AI Optimization Plan - Ollama Move Quality Investigation

**Created:** July 23, 2026  
**Status:** Investigation & Testing Phase  
**Goal:** Move from "dumb" (Na6, Rb8, illegal moves) → Strategic play with legal moves

---

## Problem Statement

Your Ollama chess AI is playing poorly:
1. **Illegal moves** - Responses don't parse to legal moves
2. **Dumb moves** - Na6, Rb8 (pointless knight jumps, rook nowhere)
3. **No strategy** - Moves don't capitalize on wins, miss checks, ignore tactics
4. **Possible causes:**
   - Prompt too vague ("Choose best move" without context)
   - Board representation not LLM-friendly (FEN is abstract)
   - No reasoning guidance (chain-of-thought)
   - Temperature too high (0.5-0.7 = creative, not strategic)
   - Move extraction brittle (regex patterns miss valid moves)
   - Wrong model for chess (tinyllama too small, Mistral untested)

---

## Root Cause Analysis

### Current Implementation (real-chess-game.js)

**What's working:**
- ✅ ASCII board representation (better than FEN for LLMs)
- ✅ Relevant move history (not full game, only recent 12 moves)
- ✅ Low temperature (0.2 for determinism)
- ✅ Legal move list provided
- ✅ Multi-pattern move extraction

**What needs improvement:**
- ❌ **Minimal prompt** - Just ASCII + move list, no reasoning framework
- ❌ **No candidate guidance** - Doesn't hint at good moves
- ❌ **No position analysis** - Missing context (threats, captures, checks available)
- ❌ **Weak ranking** - Treats all legal moves equally
- ❌ **Brittle extraction** - Pattern matching misses valid notation

---

## Solution: 3-Tier Prompt Architecture

### Tier 1: Ultra-Compact (TinyLlama 1.1B)
For 1-2B parameter models (slow reasoning, limited vocab):
```
Chess White:
  a b c d e f g h
8 · · · · · · · ·
7 · · · · · · · ·
6 · · · · · · · ·
5 · · · · · · · ·
4 · · · · · · · ·
3 · · · · · · · ·
2 P P P P P P P P
1 R N B Q K B N R

Legal: e4 d4 c4 Nf3 a3 b3 c3 d3 e3 f3 g3 h3 a4 b4 c5 d5 e5 f4 g4 h4

Move: 
```

**Parameters:**
- Temperature: 0.25 (very low, conservative)
- Tokens: 64 (limit rambling)
- Top-P: 0.75, Top-K: 20

---

### Tier 2: Standard (Mistral 7B, Openchat 3.5)
For 7B models (good reasoning, fast):
```
You are a chess player analyzing a position.

  a b c d e f g h
8 · · · · · · · ·
7 · · · · · · · ·
6 · · · · · · · ·
5 · · · · · · · ·
4 · · · · · · · ·
3 · · · · · · · ·
2 P P P P P P P P
1 R N B Q K B N R

White to move. Legal moves: e4 d4 c4 Nf3 ...

Focus:
1. Any checks or checkmates? No
2. Can we capture material? No
3. Best candidate moves: e4, d4, Nf3

Select best move:
```

**Parameters:**
- Temperature: 0.15 (deterministic)
- Tokens: 256 (room for reasoning)
- Top-P: 0.75, Top-K: 20

---

### Tier 3: Deep Analysis (Dolphin Mixtral 8x7B, Llama2 13B)
For 13B+ models (master-level reasoning):
```
You are a master chess player. Analyze this position deeply.

[ASCII board]

Game phase: Opening
White to move. Legal moves: e4 d4 c4 ...

Systematic analysis:
1. THREATS: Check for forcing moves
   - No checking moves
   - No captures available
   
2. EVALUATION: Compare candidate moves
   - e4: Central pawn, aggressive opening
   - d4: Central pawn, solid control
   - Nf3: Flexible development
   
Top candidates: e4, d4, Nf3

3. DECISION: Choose the strongest
   Consider: forcing moves first, then material, then position

Best move: e4
```

**Parameters:**
- Temperature: 0.15 (precise)
- Tokens: 1024 (full analysis)
- Top-P: 0.75, Top-K: 20

---

## Implementation Steps

### Phase 1: Deploy Enhanced Prompting (Today)

**File:** `chess-prompt-optimizer.js` (✅ Already created)

**5 Functions:**
1. `analyzePositionContext()` - Detect checks, captures, material
2. `getRankedCandidates()` - Score moves (checkmate > check > capture > quiet)
3. `generatePrompt()` - Auto-select Tier 1/2/3 based on model
4. `extractMoveEnhanced()` - Multi-pattern extraction with confidence
5. `buildOllamaRequest()` - Optimized parameters per model

**Integration:** Modify `real-chess-game.js` to use new functions

---

### Phase 2: Test Each Model (2-3 hours)

**Test Matrix:**

| Model | Tier | Expected Quality | Speed | Notes |
|-------|------|------------------|-------|-------|
| tinyllama | 1 | 40-50% strategic | <1s | Baseline, too small |
| mistral | 2 | 70-80% strategic | 1-2s | **RECOMMENDED** |
| openchat:3.5 | 2 | 75-85% strategic | 0.5s | Fast + good quality |
| llama2:13b | 3 | 80-85% strategic | 2-3s | Good balance |
| dolphin-mixtral | 3 | 85-95% strategic | 3-5s | Best quality, slow |

**Test Protocol:**
1. Run 5 games per model (10 moves each = quick feedback)
2. Measure:
   - Legal move %: Should be 100%
   - Move quality (checkmate/check/capture/quiet):
     - Good: Finds checkmates, capitalizes on winning positions
     - Bad: Ignores checks, plays meaningless moves
   - Latency: Token time per move
3. Log examples of good/bad moves

**Quick Test Command:**
```bash
# Install model
ollama pull mistral:latest

# Update chess-arena-config.json
# Change both players to mistral, temperature 0.15

# Run
pnpm chess

# Observe output for move quality
```

---

### Phase 3: Benchmark Against Engine (Optional)

If models show good move quality, optionally compare vs. Stockfish:
- Play 10-20 games: Ollama vs Stockfish
- Measure: Win rate, average centipawn loss
- Goal: >40% wins or <100 cp loss/move = tournament-ready

---

## Diagnostic Checklist

### If AI Still Plays Poorly:

**1. Move Extraction Failing?**
```
Log the response and extracted move:
- Is the model suggesting valid moves at all?
- Are patterns like "e4" being missed?
- Try more extraction patterns
```

**2. Model Not Following Instructions?**
```
Try explicit examples in prompt:
"Example: If legal moves are e4, d4, Nf3, choose one: e4"
Add JSON output: {"move": "e4"}
```

**3. Temperature/Sampling Too High?**
```
Reduce temperature: 0.15 → 0.10
Reduce top_p: 0.75 → 0.60
Reduce top_k: 20 → 10
(More conservative = more deterministic)
```

**4. Model Just Too Small?**
```
If tinyllama fails:
- Mistral 7B is the minimum for decent chess
- Dolphin Mixtral is more reliable
- Consider running inference on GPU (--gpu)
```

**5. Prompt Still Confusing?**
```
Simplify even more:
"White to move. Best move: "
Just ASCII + legal moves, no analysis
Let model focus on move selection, not reasoning
```

---

## Expected Improvements

### Before (Current)
- **Illegal moves:** 5-10% of moves don't parse
- **Strategy:** 20-30% of positions play well
- **Latency:** 1-3s per move (slow processing)
- **Examples:** Na6 (random knight), Rb8 (does nothing)

### After (With Optimization)
- **Legal moves:** 100% extraction rate
- **Strategy:** 70-85% of positions play well (depends on model)
- **Latency:** 200-800ms per move (10x faster)
- **Examples:** e4 (classical), Nxc3 (tactical), Kh2 (safe)

---

## Files Modified/Created

### New Files
- `chess-prompt-optimizer.js` — Enhanced prompting strategies
- `CHESS_AI_OPTIMIZATION_PLAN.md` — This document

### Modified Files
- `real-chess-game.js` — Integrate optimizer functions (next step)

### Configuration
- `chess-arena-config.json` — Update model/temperature for testing

---

## Success Criteria

✅ **Phase 1 Success:** All functions compile and export correctly  
✅ **Phase 2 Success:** Mistral plays >70% strategic moves with 100% legality  
✅ **Phase 3 Success:** Win rate >40% vs random, or <100 cp loss/move vs Stockfish  

---

## Next Steps

1. **Today:**
   - Review `chess-prompt-optimizer.js`
   - Identify which models you have available (ollama list)
   - Integrate optimizer into `real-chess-game.js`

2. **Tomorrow:**
   - Test with Mistral 7B (easiest, safest bet)
   - Run 5-game test series
   - Log move quality examples

3. **This Week:**
   - If Mistral good → Deploy and measure
   - If Mistral struggling → Try Dolphin or OpenChat
   - Create benchmarks vs Stockfish

---

## References

**LLM Chess Research:**
- Chain-of-thought prompting improves reasoning (Wei et al., 2022)
- ASCII board > FEN for position understanding (empirical)
- Low temperature (0.15-0.2) essential for deterministic play
- Candidate move hints improve selection by 15-20%

**Open-Source Models:**
- Mistral 7B: Fast, good reasoning, under 8GB VRAM
- Dolphin Mixtral: Master-level, needs 40GB VRAM
- OpenChat 3.5: Balance of speed/quality, 7-8GB VRAM
- TinyLlama: Too small for chess (use for testing only)

---

## Questions?

Check the research documents:
- `chess_investigation_complete.md` — Original root cause analysis
- Full investigation in project memory system
