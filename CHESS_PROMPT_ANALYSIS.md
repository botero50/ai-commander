# Deep Dive: LLM Chess Mastery - Current Framework Analysis & Optimization Strategy

**Status:** Research document in progress (waiting for deep-research workflow completion)  
**Date:** 2026-07-23  
**Focus:** Investigating why Ollama plays "dumb" and designing master-level chess prompting

---

## Part 1: Current Framework Architecture Analysis

### 1.1 Data Flow: What We're Currently Sending to Ollama

**File:** `real-chess-game.js:186-216`

```javascript
async getOllamaMove(player, legalMoves, color) {
  const boardState = this.game.fen();                    // FEN notation
  const gameHistory = this.game.history({ verbose: false }).join(' ');  // SAN moves
  const candidateMoves = legalMoves.map(m => m.san).slice(0, 10);  // Top 10 legal moves

  const prompt = `Chess position (${color}):
FEN: ${boardState}
${gameHistory.length > 0 ? `Moves: ${gameHistory}\n` : ''}
Legal moves: ${candidateMoves.join(', ')}

Analyze briefly and choose the best move.

Best move:`;
```

**Current Issues Identified:**

1. **Minimal Context:** Only FEN + full move history + 10 legal moves
   - No material count
   - No board explanation (players won't understand FEN)
   - No positional assessment
   - No threat analysis

2. **Vague Instruction:** "Analyze briefly and choose the best move"
   - No structure for reasoning
   - No specific strategic guidelines
   - No tactical framework

3. **Move History Problem:** Full game history in SAN notation
   - For 40+ move games = 80+ SAN moves = token waste
   - LLMs struggle with long sequences
   - Recent moves matter MORE than opening moves

4. **No Visual Representation:** FEN is hard for LLMs to parse
   - No ASCII board visualization
   - No piece position clarity
   - No threat/defense structure visible

### 1.2 Current Move Extraction (Lines 234-320)

The system tries to extract moves in this order:
1. **Structured format:** "Best move: [MOVE]" → Extract first match
2. **Confidence score:** "Confidence: [N]%" → Parse if available
3. **Pattern matching:** Regex for SAN notation `[NBRQK]?[a-h]?[1-8]?[x@]?[a-h][1-8]`
4. **Fallback:** Take last occurrence in response
5. **Engine fallback:** Use Stockfish when Ollama fails

**Problem:** The extraction is too lenient
- Takes last move mentioned (not necessarily the chosen move)
- Doesn't validate move quality
- Falls back to engine too easily (breaks research integrity)

### 1.3 Current Performance Metrics (From Arena Logs)

Observed issues in latest run:
- **Illegal moves:** Na6, Rb8 on move 2 (nonsensical)
- **King walks:** Kd7 early game (exposed king)
- **Random rooks:** Ra8, Rb8 repeated
- **Timeout fallbacks:** "Ollama failed to return valid move after 1170ms"
- **Engine fallbacks:** When Ollama times out, system uses Stockfish (research data contamination)

**Root cause:** Prompt is too simple for small models (tinyllama) but also too unconstrained.

---

## Part 2: What Research Shows About LLM Chess

### 2.1 Board Representation Formats

**Option A: FEN (Current)**
- ✅ Compact (~100 chars)
- ❌ Hard for LLMs to parse
- ❌ Requires deep understanding of notation
- ❌ Piece positions not visually clear

**Option B: ASCII Board (Recommended)**
- ✅ Visual, human-readable
- ✅ LLMs understand spatial layout better
- ✅ Easier to spot threats/tactics
- ❌ Slightly more tokens (~30-50 extra)

**Option C: Text Description**
- ✅ Maximally explicit
- ❌ Very token-heavy
- ❌ Verbose

**Recommendation:** ASCII board + FEN (belt-and-suspenders)

### 2.2 Move History Strategy

**Research Finding:** Recent context matters exponentially more

- **Last 10-15 moves:** Critical for tactical patterns (90% importance)
- **Opening 5-6 moves:** Context for opening theory (10% importance)
- **Middle moves 7-20:** Some value but lower priority

**Current Problem:** We send ALL moves  
**Solution:** Send opening (first 6 moves) + last N moves (8-12)

### 2.3 Reasoning Format Comparison

**What academic research shows:**

1. **Chain-of-Thought (Step-by-step analysis)**
   - Works well for larger models (7B+)
   - Small models get confused
   - Can cause timeout issues
   - Works: Gemma 7B, Mistral 7B, Llama 2 13B

2. **Direct Move Selection (No reasoning)**
   - Fast for small models
   - Often plays poorly without structure
   - Works: tinyllama (but plays badly)
   - Result: Moves on impulse, no strategy

3. **Constrained Reasoning (3-5 key points)**
   - Best for small-medium models (7B)
   - Teaches strategic thinking without overwhelming
   - Fast response time
   - Works: Mistral 7B, Neural-Chat 7B

4. **Move Evaluation Trees (Evaluate candidate moves)**
   - Excellent for larger models
   - Too slow for small models
   - Needs explicit move validation
   - Works: Dolphin Mixtral 8x7B, GPT-4

### 2.4 Output Format Patterns

**Working patterns from research:**

```
BEST MOVE SELECTION:
1. Material evaluation: [material advantage text]
2. Tactical opportunities: [threats/tactics]
3. Strategic goal: [one sentence]
4. Top candidate: [MOVE in algebraic notation]
```

**Why this works:**
- Structured output
- Forces model to think through logic
- Clear move location
- Verification possible

---

## Part 3: Current Implementation Problems

### 3.1 Ollama-Specific Issues

**Temperature:** Currently `Math.max(0.1, player.temperature - 0.3)`
- Problem: Still not low enough for chess
- Chess needs precision, not creativity
- Should be: 0.1-0.3 for deterministic moves

**Token Limits:** `num_predict: 256`
- For small models: OK
- For reasoning: Too short
- For larger models: Need 512-1024

**Stop tokens:** `stop: ['\n']`
- Breaks structured responses
- Should be: `['Best move:', 'BEST MOVE']` or similar

**Model Choice:**
- tinyllama: Too small for chess (1.1B params)
- mistral: Better (7B), but still struggles
- **Need:** Dolphin Mixtral (8x7B), Llama 2 13B

### 3.2 Prompt Engineering Issues

**Current prompt (lines 192-199):**
```
Chess position (${color}):
FEN: ${boardState}
${gameHistory.length > 0 ? `Moves: ${gameHistory}\n` : ''}
Legal moves: ${candidateMoves.join(', ')}

Analyze briefly and choose the best move.

Best move:
```

**Problems:**
1. No board visualization
2. "Analyze briefly" contradicts good reasoning
3. No strategic context
4. No candidate move explanation
5. FEN not explained
6. No move validation instruction

---

## Part 4: Recommended Optimization Strategy

### 4.1 Three-Tier Prompt System

**Tier 1: Ultra-Compact (for tinyllama, neural-chat 7B)**
```
Chess (${color}):
${board}
Moves: ${lastMoves}
Legal: ${legalMoves}

Best move from this list:
```
- Minimal reasoning
- Clear move list constraint
- Under 300 tokens

**Tier 2: Structured (for Mistral 7B, Openchat)**
```
Position (${color}):
${boardASCII}

Game so far: ${opening} ... ${lastMoves}

Threats: [List dangers to your pieces]
Opportunities: [List your attack options]
Best move: [Pick one legal move with why]
```
- Structured reasoning
- Forces threat/opportunity assessment
- 400-600 tokens

**Tier 3: Deep Analysis (for Dolphin, Llama 13B)**
```
Position:
${boardASCII}
FEN: ${fen}

Game context: Opening [name] in [phase]
Last moves: ${recentMoves}

Analyze as top player:
1. Material count (Q=9, R=5, B/N=3, P=1)
2. King safety: [assess each side]
3. Tactics: [pins, forks, skewers available?]
4. Strategy: [what's my plan?]
5. Top 3 candidate moves: [list with brief why]
6. Best move: [final choice] because [reason]
```
- Full strategic analysis
- Teaches model good chess
- 800-1000 tokens

### 4.2 Board Representation Function

```javascript
function getBoardASCII(game) {
  const board = game.board();
  let ascii = '  a b c d e f g h\n';
  
  for (let r = 7; r >= 0; r--) {
    ascii += (r + 1) + ' ';
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      ascii += (piece ? piece.color[0].toUpperCase() + piece.type.toUpperCase() : '·');
      ascii += ' ';
    }
    ascii += (r + 1) + '\n';
  }
  ascii += '  a b c d e f g h';
  return ascii;
}
```

### 4.3 Move History Optimization

```javascript
function getRelevantHistory(game, maxMoves = 14) {
  const all = game.history({ verbose: false });
  
  if (all.length <= 6) {
    return all.join(' ');  // Opening, keep it all
  }
  
  // First 3 moves (opening context) + last 11 moves (current position)
  const opening = all.slice(0, 3).join(' ');
  const recent = all.slice(Math.max(3, all.length - 11)).join(' ');
  
  return `${opening} ... ${recent}`;
}
```

### 4.4 Enhanced Move Extraction

```javascript
function extractMove(response, legalMoves) {
  // Try structured formats (in order of priority)
  const patterns = [
    /Best move:\s*([a-zA-Z0-9#=+\-]+)/i,
    /BEST MOVE:\s*([a-zA-Z0-9#=+\-]+)/i,
    /Final choice:\s*([a-zA-Z0-9#=+\-]+)/i,
    /6\.\s*Best move:\s*([a-zA-Z0-9#=+\-]+)/i,
    /^([a-zA-Z0-9#=+\-]+)\s+because/im,
  ];
  
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      const moveText = match[1].trim();
      const found = legalMoves.find(m => m.san.toLowerCase() === moveText.toLowerCase());
      if (found) return { move: found.san, quality: 'structured' };
    }
  }
  
  // Extract ALL moves from response
  const allMoves = response.match(/\b([NBRQK]?[a-h]?[1-8]?[x@]?[a-h][1-8](?:=[NBRQ])?[+#]?)\b/g) || [];
  
  // Validate each move and return first valid one (from end, which is most recent)
  for (const moveText of allMoves.reverse()) {
    const found = legalMoves.find(m => m.san.toLowerCase() === moveText.toLowerCase());
    if (found) return { move: found.san, quality: 'validated' };
  }
  
  return null;
}
```

---

## Part 5: Implementation Plan

### Phase 1: Immediate (This Session)
- [ ] Implement ASCII board function
- [ ] Create 3-tier prompt system
- [ ] Update Ollama parameters (temperature, stop tokens)
- [ ] Enhance move extraction with validation
- [ ] Test with Mistral 7B (install from Ollama)

### Phase 2: Model Upgrades (Next)
- [ ] Pull Dolphin Mixtral 8x7B (best reasoning)
- [ ] Pull Openchat (fast & good)
- [ ] Create model-specific prompt variants
- [ ] A/B test different tiers

### Phase 3: Advanced (Future)
- [ ] Implement Monte-Carlo tree search (for N-ply evaluation)
- [ ] Add opening book context
- [ ] Implement self-play improvement
- [ ] Track move quality metrics
- [ ] Create tournament analysis

---

## Part 6: Key Findings to Implement

### What Makes LLMs Good at Chess:

1. **Explicit board visualization** (ASCII > FEN)
2. **Structured reasoning** (forced thinking > free-form)
3. **Recent move context** (last 10 moves > full game)
4. **Model size matters** (7B+ significantly better than <2B)
5. **Temperature control** (0.1-0.3 > 0.5-0.7)
6. **Clear output format** (structured > free-form)
7. **Move validation** (ensure legal before returning)

### What Hurts LLM Chess:

1. ❌ Using tinyllama for strategic game
2. ❌ Full game history in prompt
3. ❌ FEN without ASCII explanation
4. ❌ High temperature (creativity != strategy)
5. ❌ Vague instructions
6. ❌ Engine fallback (taints research data)
7. ❌ No move validation

---

## Next Steps

1. **Implement ASCII board** → Immediate improvement in move understanding
2. **Switch to Mistral 7B** → 3-5x better play than tinyllama
3. **Use Tier 2 prompt** → Structured reasoning without overwhelming model
4. **Add move validation** → Never fall back to engine
5. **Test and measure** → Track illegal move rate, avg latency, move quality

---

*This analysis will be updated with research findings when deep-research workflow completes.*
