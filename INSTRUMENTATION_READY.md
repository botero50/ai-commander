# Chess AI Investigation - Instrumentation Ready

**Status:** ✅ Ready to collect evidence  
**Approach:** Engineering investigation (not intuition)  
**Code changes:** ZERO (purely observational)

---

## What's Been Set Up

You now have a complete instrumentation layer that records the **entire decision pipeline** for every move in actual AI vs AI games.

### Instrumentation Files Created

**1. `chess-move-instrumentation.js`** (400 lines)
- Records complete pipeline for every move
- Analyzes patterns across all moves
- Identifies bottlenecks ranked by severity
- Exports data for analysis

**2. `chess-game-instrumented.js`** (200 lines)
- Wrapper around RealChessGame
- Hooks into getOllamaMove() to capture data
- Zero modifications to core logic
- Transparent instrumentation

**3. `run-instrumented-chess.js`** (200 lines)
- Test harness to play instrumented games
- Generates analysis reports
- Creates JSON exports
- Aggregates results across multiple games

**4. `INVESTIGATION_GUIDE.md`**
- Framework for identifying actual bottleneck
- Lists 6 possible failure modes
- What to look for in the data
- How to interpret results

---

## What Gets Recorded (Per Move)

For every single move, the instrumentation captures:

### Position State
- `fen` — Exact board state
- `ascii_board` — Visual representation
- `side_to_move` — White/Black
- `legal_moves` — Complete list of legal moves
- `game_phase` — Opening/Middlegame/Endgame

### Prompt Generation
- `full_prompt` — Exact text sent to LLM
- `prompt_length_chars` — Character count
- `prompt_length_tokens` — Token count estimate

### Ollama Parameters
- `model` — Which model (mistral, tinyllama, etc.)
- `temperature` — Randomness setting
- `top_p`, `top_k` — Sampling parameters
- `num_predict` — Token limit
- `sampling_strategy` — How sampling works

### LLM Response
- `raw_response` — Complete output text
- `response_length` — Character/token count
- `latency_ms` — Time to respond

### Move Extraction
- `extraction_strategy` — Which pattern worked (structured/token/pattern/ranked)
- `extraction_confidence` — 0-1 confidence score
- `extraction_errors` — Any parsing errors
- `extracted_move` — What we parsed

### Validation & Quality
- `is_legal` — Is the move legal?
- `move_quality` — excellent/good/neutral/bad
- `quality_notes` — Why this assessment

---

## How to Run Investigation

### Step 1: Run Instrumented Games

```bash
# Play 3 complete games with full instrumentation
node run-instrumented-chess.js 3 ./chess-analysis

# This will:
# - Play 3 AI vs AI games
# - Record every move's complete pipeline
# - Generate detailed analysis
# - Identify bottlenecks
# - Save everything to chess-analysis/ directory
```

### Step 2: Review Reports

```
chess-analysis/
├── game-1/
│   ├── report.txt          ← Start here (human-readable)
│   ├── analysis.json       ← Raw metrics
│   ├── bottlenecks.json    ← Identified issues
│   └── game.pgn            ← Full game
├── game-2/
│   └── [same structure]
└── game-3/
    └── [same structure]
```

### Step 3: Look for Patterns

**Read the reports in this order:**
1. `game-1/report.txt` — See what's failing
2. `game-2/report.txt` — Check if same issues appear
3. `game-3/report.txt` — Confirm patterns

**Look for:**
- High/low legality percentage (95% = good, 90% = problem)
- Extraction strategy distribution (which ones are used?)
- Temperature correlation (does lower temp = better legality?)
- Error patterns (same errors every time?)
- Model accuracy by model type

### Step 4: Analyze JSON Data

For deeper analysis, use the JSON files:

```bash
# View game 1 analysis
cat chess-analysis/game-1/analysis.json | jq '.analysis'

# View identified bottlenecks
cat chess-analysis/game-1/bottlenecks.json | jq '.'

# Count specific errors
cat chess-analysis/game-1/analysis.json | jq '.analysis.errorPatterns'
```

---

## Example Report Structure

### In report.txt, you'll see:

```
SUMMARY
─────────────────────────────────────────
Total moves analyzed: 42
Legal moves: 95%
Illegal moves: 5%
Average latency: 850ms

MODEL ACCURACY
─────────────────────────────────────────
mistral: 98% legal (41/42)

EXTRACTION STRATEGY USAGE
─────────────────────────────────────────
structured: 88% (37 moves)
token: 10% (4 moves)
pattern: 2% (1 move)

TEMPERATURE CORRELATION
─────────────────────────────────────────
Temp 0.15: 100% legal (20/20 moves)
Temp 0.20: 96% legal (22/23 moves)

IDENTIFIED BOTTLENECKS (Ranked by Severity)
─────────────────────────────────────────
1. Model Playing Strength [UNKNOWN]
   Evidence: All moves legal but poor strategy
   Investigation: Analyze move quality vs alternatives

2. Prompt Design [UNKNOWN]
   Evidence: Prompt length 400-500 chars
   Investigation: Check if adding context helps
```

---

## The 6 Failure Modes to Investigate

Based on data, you'll identify which one is the actual bottleneck:

### 1. **Extraction Failures** (Easy to detect)
- High error rate in extraction?
- Response contains valid moves but we don't parse them?
- Certain models/strategies fail more?

### 2. **Illegal Move Generation** (Easy to detect)
- High illegal move rate (>5%)?
- LLM suggesting moves that don't exist?
- Varies by temperature/prompt?

### 3. **Model Playing Strength** (Medium difficulty)
- All moves legal and extracted, but quality poor?
- Move quality plateau at 30-40% strategic?
- Larger models better than smaller?

### 4. **Prompt Design Issues** (Medium difficulty)
- Move quality improves with different prompts?
- Legal move list in prompt helps?
- Position context improves accuracy?

### 5. **Ollama Parameters** (Medium difficulty)
- Temperature clearly impacts legality?
- Token limits cause truncation?
- Latency correlates with quality?

### 6. **Board Representation** (Medium difficulty)
- Model misreading board state?
- ASCII vs FEN makes a difference?
- Piece position errors?

---

## What You'll Know After Investigation

### Hard Data (From Reports)
- ✅ Exact legal move percentage
- ✅ Which extraction strategies are used
- ✅ Temperature correlation with legality
- ✅ Model accuracy by model type
- ✅ Error patterns and frequency
- ✅ Response latency distribution
- ✅ Illegal move examples

### Ranked Bottlenecks (From Analysis)
- ✅ #1 Most likely issue (with evidence)
- ✅ #2 Secondary issue (with evidence)
- ✅ #3-6 Other issues (with evidence)
- ✅ Impact estimate for each

### Clear Next Steps
- ✅ What to investigate further (if needed)
- ✅ What to change first (if ready)
- ✅ How to measure improvement

---

## Code Integrity

**ZERO modifications to:**
- `real-chess-game.js` — Original logic untouched
- `chess-arena-config.json` — Untouched
- Game playing logic — 100% original

**Only additions:**
- `chess-move-instrumentation.js` — Observational recording
- `chess-game-instrumented.js` — Transparent wrapper
- `run-instrumented-chess.js` — Test harness

**Key principle:** Instrumentation is purely observational. We record what happens without changing why it happens.

---

## No Assumptions

After investigation, **every recommendation will be backed by evidence from actual games.**

For example, if we recommend "use Mistral instead of TinyLlama":
- Evidence: Game data shows Mistral achieved 98% legal moves, TinyLlama 85%
- Impact: 13 percentage point improvement in legality

Or if we recommend "lower temperature from 0.5 to 0.2":
- Evidence: Game data shows temp 0.2 → 100% legal, temp 0.5 → 85% legal
- Impact: Eliminates ~6-7 illegal moves per 100 moves

---

## Ready to Go

Everything is set up. To start investigation:

```bash
node run-instrumented-chess.js 3 ./chess-analysis
```

This will:
1. Play 3 complete AI vs AI games
2. Record every move's complete pipeline
3. Generate analysis reports
4. Show you the actual bottleneck (with evidence)
5. Suggest next steps based on data

**Time required:** ~15-30 minutes per game (depending on model speed)

**Output:** Complete evidence of what's limiting AI play strength

---

## Investigation Checklist

- [ ] Created chess-move-instrumentation.js
- [ ] Created chess-game-instrumented.js
- [ ] Created run-instrumented-chess.js
- [ ] Read INVESTIGATION_GUIDE.md
- [ ] Ready to run investigation
- [ ] Run: `node run-instrumented-chess.js 3 ./chess-analysis`
- [ ] Review chess-analysis/game-*/report.txt
- [ ] Identify which of 6 failure modes is actual bottleneck
- [ ] Propose changes backed by evidence
- [ ] Test proposed changes (re-run investigation)
- [ ] Measure improvement with data

---

## Next Action

Ready to start collecting evidence?

```bash
node run-instrumented-chess.js 3 ./chess-analysis
```

This is the first step in actual engineering investigation. After these games run, you'll have real data about what's limiting the AI's play strength.

No more assumptions. Only evidence.
