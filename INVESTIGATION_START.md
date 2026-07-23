# Chess AI Investigation - Starting Now

**Date:** July 23, 2026, 11:45 UTC  
**Status:** Instrumentation ready, models loading, investigation beginning

---

## What We're About to Do

We will run real AI vs AI chess games with complete instrumentation that captures:

1. **Every move's complete decision pipeline:**
   - Position (FEN)
   - Prompt sent to LLM
   - Ollama parameters (model, temperature, sampling)
   - Raw LLM response
   - Move extraction process
   - Move legality check
   - Actual move played

2. **Zero code modifications:**
   - Original `real-chess-game.js` ✅ Reverted to baseline
   - Using wrapper instrumentation layer (non-invasive)
   - Core game logic 100% unchanged

3. **Real data collection:**
   - Not synthetic test cases
   - Not simulated results
   - Actual AI vs AI gameplay

---

## Models Being Tested

**TinyLlama 1.1B** ✅ Available now
- Ultra-small model
- Fast inference
- Baseline for comparison
- Expected: ~85-90% legal moves

**Mistral 7B** ⏳ Downloading now
- Medium-sized model  
- Faster than large models
- Better reasoning than TinyLlama
- Expected: ~95-98% legal moves

---

## Investigation Process

### Game 1: TinyLlama Only
- Both players: TinyLlama 1.1B
- Temperature: 0.5 (as configured)
- Duration: ~10-20 minutes
- Captures baseline performance

### Game 2: Mistral Only (after download)
- Both players: Mistral 7B
- Temperature: 0.5 (same as TinyLlama)
- Duration: ~5-15 minutes (faster model)
- Compares against larger model

### Game 3: Mixed (if time permits)
- White: TinyLlama 1.1B
- Black: Mistral 7B
- Shows head-to-head performance

---

## What We're Looking For

### Extraction Failures
- Can we parse the LLM responses?
- Do responses contain valid moves that we don't extract?
- Extraction error rate >5% = problem

### Illegal Moves
- Is the LLM generating moves outside legal move list?
- Illegal move rate >5% = problem
- Does temperature affect this?

### Move Quality
- Are all moves legal but play quality poor?
- Does model miss obvious tactics (checks, captures)?
- Is model simply too weak?

### Prompt Effectiveness
- Do longer/more detailed prompts help?
- Is legal move list in prompt necessary?
- Does position context improve accuracy?

### Ollama Parameters
- Does temperature matter?
- Are token limits causing truncation?
- Does latency correlate with quality?

---

## Evidence We'll Collect

For each game, we'll generate:

**report.txt** — Human-readable analysis:
- Move legality percentage
- Extraction strategy distribution
- Temperature correlation
- Error patterns
- Ranked bottlenecks

**analysis.json** — Raw metrics:
- Every move's complete pipeline
- Statistical analysis
- Bottleneck assessment

**bottlenecks.json** — Ranked issues:
- #1 most likely problem (with evidence)
- #2-6 secondary issues (with evidence)
- What to investigate next

**game.pgn** — Complete game notation:
- Moves played
- Who won
- How long it took

---

## Timeline

**Now (11:45 UTC):**
- ✅ Ollama running
- ✅ TinyLlama loaded
- ⏳ Mistral downloading

**~12:00-12:25 UTC:**
- Run Game 1: TinyLlama vs TinyLlama
- Generate analysis reports

**~12:25-12:40 UTC (if Mistral ready):**
- Run Game 2: Mistral vs Mistral
- Generate analysis reports

**~12:40-12:45 UTC:**
- Review all reports
- Identify patterns
- Rank bottlenecks
- Propose next steps

---

## Expected Outcomes

**Minimum:** Complete data on what's failing
- Extraction success rate
- Legality percentage
- Error patterns

**Likely:** Clear identification of bottleneck
- #1 issue: "Illegal moves at 15% rate when temp=0.5"
- #2 issue: "Mistral 20% better legality than TinyLlama"
- #3 issue: "Extraction succeeds 98% of time"

**Maximum:** Actionable recommendations with evidence
- "Switch to Mistral 7B: 98% vs 85% legality"
- "Lower temperature to 0.15: improves legality from 85% to 100%"
- "Add legal move list to prompt: improves from 92% to 98%"

---

## No Assumptions

Every recommendation will be backed by actual game data:

❌ "Prompts should be more detailed" (assumption)  
✅ "Game 1 shows adding context improved moves from good to excellent" (evidence)

❌ "Temperature is the problem" (assumption)  
✅ "Game 1: temp 0.5 → 85% legal, Game 2: temp 0.2 → 100% legal" (evidence)

❌ "Mistral is better" (assumption)  
✅ "Game 1: TinyLlama 85% legal moves, Game 2: Mistral 98% legal moves" (evidence)

---

## Files Involved

**Instrumentation (No Code Changes):**
- `chess-move-instrumentation.js` — Records every move
- `chess-game-instrumented.js` — Wrapper
- `run-instrumented-chess.js` — Test harness

**Original Code (Unchanged):**
- `real-chess-game.js` — ✅ Back to baseline
- `chess-arena-config.json` — Unchanged

**Output:**
- `chess-analysis/game-1/` — First game analysis
- `chess-analysis/game-2/` — Second game analysis
- `chess-analysis/game-3/` — Third game analysis (if run)

---

## Next Steps

**When Mistral finishes downloading (check progress):**

```bash
# Start investigation
node run-instrumented-chess.js 2 ./chess-analysis

# This runs Game 1 (TinyLlama) and Game 2 (Mistral)
# Generates complete analysis
```

**After games complete:**

```bash
# Review reports
cat chess-analysis/game-1/report.txt
cat chess-analysis/game-2/report.txt

# Look for patterns
# Identify #1 bottleneck
# Propose evidence-backed changes
```

---

## Remember

- **Zero code changes** — Instrumentation is non-invasive
- **Real data only** — No synthetic games
- **Evidence-driven** — Every claim backed by data
- **Engineering approach** — No assumptions

We're going to measure what's actually failing, then fix only what needs to be fixed.

Let's get the data.
