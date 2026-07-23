# Chess AI Investigation - Progress Tracking

**Started:** 2026-07-23 ~13:45 UTC  
**Status:** Games running (in background)

---

## Setup Complete ✅

- [x] Ollama running (version 0.32.0)
- [x] TinyLlama 1.1B loaded
- [x] Mistral 7B loaded  
- [x] Instrumentation created (non-invasive)
- [x] Test harness ready
- [x] Original real-chess-game.js reverted to baseline
- [x] Zero code modifications to core logic

---

## Current Status

**Game 1:** TinyLlama 1.1B (both players)
- Status: Running
- Expected duration: 10-20 minutes
- Will show baseline performance

**Game 2:** Mistral 7B (both players)
- Status: Queued
- Expected duration: 5-15 minutes
- Will compare against larger model

---

## What's Being Recorded

For every move in both games:
- ✅ Position (FEN, board state, legal moves)
- ✅ Prompt sent to LLM
- ✅ Ollama parameters
- ✅ Raw LLM response
- ✅ Move extraction details
- ✅ Move legality
- ✅ Response latency
- ✅ Move quality assessment

---

## Expected Output (Per Game)

```
chess-analysis/game-1/
├── report.txt           (Human-readable analysis)
├── analysis.json        (Raw metrics)
├── bottlenecks.json     (Identified issues)
└── game.pgn             (Game notation)
```

---

## What We'll Know After Games Complete

### Hard Data
- [~] Exact legal move percentage for TinyLlama
- [~] Exact legal move percentage for Mistral
- [~] Move extraction success rate
- [~] Temperature impact (if varied)
- [~] Response latency distribution
- [~] Error patterns

### Ranked Bottlenecks
- [~] #1 most likely issue (with evidence)
- [~] #2 secondary issue (with evidence)
- [~] Impact estimate for each

### Next Steps
- [~] What to investigate further
- [~] What to change first (if ready)
- [~] How to measure improvement

---

## Real Data Example

Once games complete, report will show something like:

```
SUMMARY
───────────────────────────────────────
Total moves analyzed: 42
Legal moves: 95%
Illegal moves: 5%
Average latency: 850ms
Latency range: 200ms - 2100ms

MODEL ACCURACY
───────────────────────────────────────
tinyllama: 85% legal (36/42)

EXTRACTION STRATEGY USAGE
───────────────────────────────────────
structured: 88% (37 moves)
token: 10% (4 moves)
pattern: 2% (1 move)

TEMPERATURE CORRELATION
───────────────────────────────────────
Temp 0.50: 85% legal (42/42 moves)

IDENTIFIED BOTTLENECKS (Ranked by Severity)
───────────────────────────────────────
1. Model Playing Strength [UNKNOWN]
   Evidence: All moves legal but play quality poor
   
2. Illegal Move Generation [CRITICAL]
   Rate: 15%
   Evidence: 6 of 42 moves were illegal
```

---

## Next Steps After Games Complete

1. **Review reports** (5 minutes)
   - Read `chess-analysis/game-1/report.txt`
   - Read `chess-analysis/game-2/report.txt`

2. **Compare models** (5 minutes)
   - TinyLlama vs Mistral legality rates
   - Which is more accurate?

3. **Identify bottleneck** (10 minutes)
   - What's the #1 issue from the data?
   - Do both games show same pattern?

4. **Propose evidence-backed fixes** (15 minutes)
   - Based on identified bottleneck
   - Every recommendation supported by data

5. **Plan next investigation** (5 minutes)
   - Further testing if needed
   - Changes to implement and re-test

---

## Monitoring

To check progress while games run:

```bash
# See if game 1 reports exist
ls -la chess-analysis/game-1/

# Peek at analysis as it generates
tail chess-analysis/game-1/report.txt

# Monitor Ollama (see if it's processing)
curl http://localhost:11434/api/tags
```

---

## Timeline

- **13:45 UTC** - Investigation started
- **~14:00 UTC** - Game 1 complete
- **~14:15 UTC** - Game 2 complete
- **~14:30 UTC** - Reports analyzed
- **~14:45 UTC** - Recommendations ready

**Total time:** ~1 hour for complete investigation

---

## Principle

**No assumptions. Only evidence.**

Every finding will be backed by actual game data from real AI vs AI play.

We're going to measure what's failing, then fix only what needs to be fixed.

---

## Files Tracking Investigation

- `INVESTIGATION_GUIDE.md` - Framework for investigation
- `INVESTIGATION_START.md` - Why we're doing this
- `INVESTIGATION_PROGRESS.md` - This file (progress)
- `chess-analysis/` - Output directory (being populated)

---

Check back when games complete to see the evidence.
