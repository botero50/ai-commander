# Chess AI Investigation - Engineering Approach

**Purpose:** Identify actual bottleneck in AI decision making through instrumentation and evidence

**Status:** Ready for investigation (no code changes yet)

---

## Investigation Framework

Instead of guessing about what's wrong, we'll instrument the complete decision pipeline and collect real data from actual AI vs AI games.

### The Decision Pipeline

```
1. Chess Position
   └─ FEN representation
   └─ ASCII board display
   └─ Available legal moves

2. Prompt Generation
   └─ Full prompt text
   └─ Prompt length
   └─ Context included

3. Ollama Request
   └─ Model selection
   └─ Temperature setting
   └─ Token limits
   └─ Sampling parameters

4. LLM Response
   └─ Raw response text
   └─ Response latency
   └─ Token usage

5. Move Extraction
   └─ Extraction strategy used
   └─ Confidence level
   └─ Any parsing errors

6. Move Validation
   └─ Move legality check
   └─ Is extracted move in legal move list?

7. Move Execution
   └─ Actual move played
   └─ Quality assessment
```

---

## What We'll Measure

For every move, we record:

### Position Context
- `fen` — Exact board state (Forsyth-Edwards Notation)
- `ascii_board` — Visual board representation
- `side_to_move` — White or Black
- `legal_moves` — Complete list of legal moves available
- `game_phase` — Opening/Middlegame/Endgame

### Prompt Information
- `full_prompt` — Exact text sent to LLM
- `prompt_length_chars` — Character count
- `prompt_length_tokens` — Approximate token count

### Ollama Request Parameters
- `model` — Which model (mistral, tinyllama, etc.)
- `temperature` — Randomness setting (0.0-1.0)
- `top_p` — Nucleus sampling parameter
- `top_k` — Top-K sampling parameter
- `num_predict` — Token limit
- `stop_tokens` — Stop sequences
- `sampling_strategy` — Description of sampling approach

### Response Data
- `raw_response` — Complete LLM output
- `response_length_chars` — Character count
- `response_tokens` — Token count in response
- `latency_ms` — Time to get response

### Extraction Results
- `extraction_strategy` — Which pattern matched (structured/token/pattern/ranked)
- `extraction_confidence` — Confidence level (0-1)
- `extraction_errors` — Any errors during extraction
- `extracted_move` — What we parsed from response

### Move Validation
- `is_legal` — Is extracted move in legal_moves list?
- `validation_errors` — If illegal, why?

### Move Quality
- `executed_move` — What was actually played
- `move_quality` — excellent/good/neutral/bad
- `quality_notes` — Why this assessment

---

## Failure Modes to Investigate

### 1. **Extraction Failures**
**Question:** Is the LLM generating valid moves, but we're not parsing them correctly?

**Evidence to look for:**
- High extraction error rate (>5%)
- Response contains valid moves that weren't extracted
- Certain strategies (pattern, ranked) fail more than others
- Specific models produce responses that are harder to parse

**If this is the bottleneck:**
- Extract strategy breakdown shows consistent failures
- Moving to 4+ extraction strategies increases success rate
- Response format varies by model

### 2. **Illegal Move Generation**
**Question:** Is the LLM generating moves outside the legal move list?

**Evidence to look for:**
- High illegal move rate (>5%)
- LLM suggests moves that don't exist in the position
- Illegal rate varies by:
  - Model (some models more careful than others)
  - Temperature (higher temp = more illegal moves)
  - Prompt style (legal move list in prompt helps?)

**If this is the bottleneck:**
- Legal move list is not in prompt, or unclear
- Model is not constrained by available moves
- Lower temperature reduces illegal moves
- Providing candidates helps focus model

### 3. **Model Playing Strength**
**Question:** Is the LLM simply not strong enough at chess?

**Evidence to look for:**
- All moves are legal, extracted correctly, but play quality is poor
- Missing obvious tactics (ignoring checks, missing captures)
- Moving differently under same position vs similar positions
- Larger models (13B) produce better moves than smaller (7B)

**If this is the bottleneck:**
- Legal moves: 100%
- Extraction: 100%
- But move quality: 30-40% strategic vs 70% optimal
- Smaller models plateau at ~40% strategy accuracy
- Only way to improve: use larger models or fine-tune

### 4. **Prompt Design Issues**
**Question:** Is the prompt confusing the model or missing important context?

**Evidence to look for:**
- Move quality improves with longer/more detailed prompts
- Certain prompt formats work better for certain models
- Legal move accuracy improves when moves are explicitly listed
- Quality degrades with minimal prompts
- Position context (forcing moves, material balance) helps

**If this is the bottleneck:**
- Current minimal prompt doesn't provide enough guidance
- Adding candidate moves improves accuracy
- Structured analysis framework increases move quality
- Position assessment helps focus model

### 5. **Ollama Parameter Suboptimality**
**Question:** Are Ollama inference parameters preventing good play?

**Evidence to look for:**
- Temperature 0.5 produces 85% legal, temp 0.2 produces 100% legal
- Top_p sampling helps vs hurts
- Token limit restrictions cause truncation
- Latency correlates with move quality (slower = better thinking?)

**If this is the bottleneck:**
- Temperature is the biggest lever
- Lower temperature = better legality but maybe worse creativity
- Larger token budgets = better moves
- Different models need different parameters

### 6. **Board Representation Confusion**
**Question:** Is FEN/ASCII representation confusing the model?

**Evidence to look for:**
- Model consistently misreads piece positions
- Illegal moves suggest misunderstanding of board state
- ASCII board helps vs FEN
- Model performs better with explicit piece lists

**If this is the bottleneck:**
- Switch to ASCII if using FEN
- Add explicit piece lists
- Use visual formatting to clarify position
- Test with multiple representations

---

## Investigation Process

### Step 1: Set Up Instrumentation (Now)
✅ Create instrumentation layer that records decision pipeline
✅ Create test harness to play instrumented games
✅ No modifications to core chess logic

### Step 2: Collect Evidence (Run Games)
1. Run 3-5 complete AI vs AI games
2. Each game records every move's complete pipeline
3. Generates analysis reports and JSON exports
4. Identifies most likely bottlenecks per game

### Step 3: Analyze Patterns
1. Review reports for each game
2. Look for consistent patterns across games
3. Identify which bottleneck appears most frequently
4. Check if specific models, temperatures, or prompts are problematic

### Step 4: Rank Bottlenecks by Evidence
1. Creation ranked list of most likely issues
2. For each, show specific evidence from the data
3. Estimate impact if fixed
4. Propose next investigation or fix

### Step 5: Propose Changes with Evidence
Only recommend changes if supported by data:
- "Temperature 0.5 produces 85% legal moves, 0.2 produces 100%" (backed by data)
- "Mistral 7B is 20% more accurate than TinyLlama" (backed by data)
- "Legality improves from 92% to 98% when legal moves are in prompt" (backed by data)

---

## Running the Investigation

### Quick Start

```bash
# Generate instrumentation files (already done)
# Files created:
# - chess-move-instrumentation.js (records every move)
# - chess-game-instrumented.js (wrapper)
# - run-instrumented-chess.js (test harness)

# Run 3 instrumented games
node run-instrumented-chess.js 3 ./chess-analysis

# This will:
# 1. Play 3 complete games with instrumentation
# 2. Generate detailed reports for each game
# 3. Export JSON data for analysis
# 4. Identify most likely bottlenecks
```

### Output Structure

```
chess-analysis/
├── game-1/
│   ├── report.txt          (Detailed text analysis)
│   ├── analysis.json       (Raw metrics)
│   ├── bottlenecks.json    (Identified issues)
│   └── game.pgn            (Complete game)
├── game-2/
│   └── ...
└── game-3/
    └── ...
```

### Reading the Reports

**report.txt** contains:
- Move count and legality percentage
- Model accuracy breakdown
- Extraction strategy usage distribution
- Temperature correlation with legality
- Identified bottlenecks ranked by severity
- Illegal move examples
- Error pattern frequency

**analysis.json** contains raw data for external analysis:
- Every move's complete pipeline
- Detailed metrics
- Statistical analysis
- Bottleneck assessment

**bottlenecks.json** contains:
- Ranked list of likely issues
- Severity assessment
- Supporting evidence
- What to investigate next

---

## What Not to Do

❌ **Don't assume** the prompt is the problem  
❌ **Don't try** multiple fixes at once  
❌ **Don't generate** synthetic test cases  
❌ **Don't modify** core chess logic  
❌ **Don't recommend** changes without evidence

## What To Do

✅ **Collect** real data from actual games  
✅ **Measure** complete decision pipeline  
✅ **Analyze** patterns across multiple games  
✅ **Rank** bottlenecks by likelihood and impact  
✅ **Propose** changes only where supported by data

---

## Expected Outcomes

After running investigation, you'll have:

1. **Specific evidence** of what's actually failing
   - "Extraction succeeds 98% of the time"
   - "Illegal moves are only 2% of moves"
   - "Average latency is 850ms"

2. **Ranked bottleneck list**
   - #1 bottleneck with evidence
   - #2 bottleneck with evidence
   - Impact estimate for each

3. **Data-driven recommendations**
   - "Switch to Mistral 7B (20% higher accuracy than TinyLlama)"
   - "Lower temperature to 0.15 (eliminates illegal moves)"
   - "Add candidate moves to prompt (improves legality from 92% to 98%)"

4. **Clear path forward**
   - What to fix first (biggest impact)
   - How to measure improvement
   - Whether to re-run investigation after changes

---

## Success Criteria

Investigation is complete when you have:

- [ ] 3+ complete instrumented games played
- [ ] Detailed reports generated for each game
- [ ] Patterns identified across games
- [ ] Bottlenecks ranked by severity
- [ ] Each bottleneck has supporting evidence
- [ ] Clear recommendation for next steps (investigation or fix)

---

## Files Created

| File | Purpose |
|------|---------|
| `chess-move-instrumentation.js` | Records every move's pipeline |
| `chess-game-instrumented.js` | Wrapper around RealChessGame |
| `run-instrumented-chess.js` | Test harness to play games |
| `INVESTIGATION_GUIDE.md` | This file |

**No changes to core code:**
- `real-chess-game.js` — untouched
- `chess-arena-config.json` — untouched
- Game logic — 100% original

---

## Next Step

Ready to investigate? Run:

```bash
node run-instrumented-chess.js 3 ./chess-analysis
```

Then read the reports in `chess-analysis/game-*/report.txt`

The data will tell us what's actually failing.
