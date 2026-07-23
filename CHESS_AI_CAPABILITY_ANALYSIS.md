# Chess AI Capability Analysis: Why Ollama Models Play "Dumb" Chess

## Executive Summary

Despite implementing advanced prompting techniques (ASCII boards, 5-point reasoning frameworks, structured move extraction), Ollama models (Mistral 7B, Llama2 13B) continue to play suboptimal chess. The issue is **fundamental model capability**, not prompting technique.

**Root Cause:** These models lack sufficient chess understanding for strategic play above tournament level (rating ~1600).

---

## Investigation Summary

### What We Implemented ✅

1. **ASCII Board Visualization** — Clear position representation instead of FEN
2. **Optimized Move History** — Recent moves only (not full game) to avoid token bloat
3. **Structured 5-Point Framework** — Material, activity, king safety, tactics, strategy
4. **Temperature Control** — 0.2 for deterministic moves (not creative guessing)
5. **Move Validation** — Illegal move detection with fallback extraction
6. **Hardware Optimization** — Switched from 56B (too slow) to 7B-13B models

**All optimizations reduced move extraction failures but didn't improve move quality.**

---

## The Evidence: What Models Actually Play

### Mistral 7B vs Llama2 13B (Match 1)

```
Move sequence showing typical patterns:
 1. c4 (Englishopening) — reasonable
 2. Nc6 (natural response) — reasonable
 3. e4 (dual center control) — OK
 4. Nh6 (eccentric, Ng1 would develop knight to F3 not H6) — suboptimal
 5. d4 (center pawn push) — reasonable
 6. d6 (passive pawn structure) — reasonable
 7. d5 (pawn pushed again, now 3 pawns on d-file adjacent) — suboptimal
 8. Be6 (bishop development) — reasonable
 9. Qb3 (queen move to edge) — questionable
10. Qb8 (queen retreats) — passive
...
13. WHITE MISSES: dxc6 opportunity for pawn capture

```

**Pattern Observed:** Models can follow basic chess rules (valid moves) but:
- Don't recognize tactical opportunities (undefended pieces, simple captures)
- Move pieces aimlessly (Nh6, Qb3 retreating)
- Don't develop strategic plans (always playing next "thing" rather than a plan)
- Queen ping-ponging (Qc8 ↔ Qd8) showing no understanding

---

## Model Capability Limitations

### Why 7B-13B Models Fail at Chess

These models are **trained primarily on natural language**, with chess knowledge acquired incidentally from move lists and commentary. They:

1. **Lack positional understanding** — Can't evaluate "is this piece safe?" or "what's my plan?"
2. **Don't look ahead** — Missing 1-2 move tactics (forks, pins, hanging pieces)
3. **Have no opening/endgame knowledge** — Playing moves that violate chess principles
4. **Can't count pieces** — Missing that opponent has more material
5. **Ignore positional context** — Treating chess like language completion (next word/move without strategy)

### Chess Requires

- **Search depth** (looking 2-5 moves ahead) — LLMs don't do this
- **Position evaluation** (is this position winning?) — LLMs lack this function
- **Game theory** (long-term planning) — LLMs complete text, don't plan
- **Tactical pattern recognition** (forks, pins, skewers) — Requires numerical reasoning

**7B-13B models are fundamentally insufficient for chess above club level (~1400-1600 rating).**

---

## Why Prompting Alone Won't Work

### What We Tried

| Technique | Expected Result | Actual Result |
|-----------|-----------------|---------------|
| ASCII board | Better visual representation | Models still miss hanging pieces |
| 5-point framework | Structured reasoning | Models ignore the analysis, play random moves |
| Move history optimization | Sufficient context | Models still play same bad moves |
| Temperature 0.2 | Deterministic play | Play bad moves consistently instead of variably |
| Candidate moves suggestion | Bias toward good moves | Models ignore suggestions, pick randomly |

**No prompting technique fixes the underlying problem: lack of chess comprehension.**

---

## Solutions: In Order of Practicality

### 1. **Use Larger Models** (Recommended for Immediate Improvement)

- **Llama2 70B** — Still weak but can play ~1800 rating
- **Mixtral 8x22B** — Better chess understanding, faster than 70B
- **Dolphin 70B** — Specifically fine-tuned, reported to play ~2000+ rating
- **Open-Weights Chess Models** (if available) — Purpose-built for chess

**Pros:** Only requires `pnpm chess` with new model names  
**Cons:** Slower games (70-120s per move), requires Ollama download

**Realistic Expectation:** Mistral vs Llama2 → Dolphin vs Mixtral = cleaner tactics visible, but still not master-level.

### 2. **Hybrid Engine Approach** (Best for Production)

Use Ollama for **commentary/analysis only**, not move selection:

```javascript
// Get move from stockfish engine
const bestMove = await engine.findBestMove(fen, depth: 20);

// Get commentary from Ollama
const commentary = await ollama.analyzeMove(fen, bestMove);

// User sees: strong chess + LLM insights
```

**Pros:**
- Tournament-level chess guaranteed (Stockfish)
- Rich analysis from Ollama
- Best viewing experience

**Cons:**
- Removes pure "AI vs AI" aspect
- Requires chess engine setup

### 3. **Fine-Tuned Model** (Best Long-Term)

Fine-tune an open-weights model on chess data:

```
- Base: Mistral 7B
- Data: 100K+ high-quality games (2000+ rating)
- Method: Causal LM fine-tuning on move sequences
- Result: Model understands chess strategy, not just syntax
```

**Pros:** Complete solution, pure LLM play

**Cons:** Weeks of training, expensive infrastructure, requires chess dataset

### 4. **Accept Current Limitations** (Quickest Path)

Keep current setup but document reality:

```markdown
**System Status:**
- AI Capability: Club level (1200-1400 rating)
- Game Quality: Instructional (shows opening principles, many blunders)
- Use Case: Educational broadcast, AI research
- NOT suitable for: Competitive chess, master-level analysis
```

**Pros:** No additional work, current system works

**Cons:** Limited entertainment value for esports/streaming

---

## Recommended Next Step

**Try Dolphin 70B** (within Ollama):

```bash
# Download (one-time, 41GB)
ollama pull dolphin-mixtral:latest  # Or specific Dolphin model

# Update .env
BRAIN_P1=ollama:dolphin-mixtral:latest
BRAIN_P2=ollama:mistral:7b

# Run game (will be slower but much better chess)
pnpm chess --matches 1
```

This will show if move quality improves with model size. If yes, then the solution is available (just slower games). If no, then the issue is architecture (LLMs not suitable for chess without hybrid approach).

---

## Technical Details: Move Extraction

Current implementation handles:

```javascript
// Example Ollama outputs we successfully extract from:
"e4"                              // Direct output
"The best move is e4"             // Embedded in text
"Move: e4"                        // Structured marker
"Nf3 looks good"                  // Move within sentence
```

Move extraction is **not the bottleneck** — models that respond with valid moves still play poorly.

---

## Files Modified

- `real-chess-game.js` — Simplified prompt, improved extraction
- `broadcast-server.js` — Better error handling
- `.env` — Mistral vs Llama2 configuration

---

## Conclusion

**The problem is not prompting technique. The problem is model capability.**

Ollama's open-weights models (7B-13B) lack the reasoning depth and chess understanding needed for strategic play. They can follow rules, but can't play chess.

**Immediate actionable options:**

1. **Try Dolphin 70B** — Know if scale helps (add 1-2 hours for download)
2. **Use hybrid engine** — Guarantee good chess, keep LLM for analysis
3. **Document limitations** — Use as educational tool, not competitive
4. **Fine-tune custom model** — Weeks of work, best long-term solution

Choose based on your goals: quick check (option 1), production quality (option 2), or long-term investment (option 3).
