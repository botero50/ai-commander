# AI Commander Research Platform - Quick Start

**AI Commander is now an autonomous AI experimentation platform.**

Not a streaming platform. Not a broadcast tool. A research platform for making AI stronger through systematic experimentation.

---

## 30-Second Start

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start arena
pnpm chess

# Watch: Games play forever, stats accumulate
```

Open another terminal to analyze:

```bash
# See which prompts are winning
node analyze-prompts.js

# See opening diversity
cat arena-statistics.json | jq
```

---

## What Happens

1. **Arena starts** - Two Ollama models play continuously
2. **Games play** - Real chess with chain-of-thought reasoning
3. **Prompts vary** - Different strategies each game
4. **Stats accumulate** - Win rates tracked per prompt
5. **You iterate** - See what works, improve

---

## Configuration

**.env file (defaults work):**
```env
BRAIN_P1=ollama:tinyllama        # White player
BRAIN_P2=ollama:mistral          # Black player
MATCH_RESTART_DELAY_MS=2000      # 2 sec between games
OLLAMA_RETRY_COUNT=5             # Retry attempts
OLLAMA_RETRY_DELAY_MS=2000       # Delay between retries
```

---

## Key Commands

### Run Arena
```bash
pnpm chess                       # Play forever
```

### Analyze Results
```bash
node analyze-prompts.js          # Rank prompts by win rate
cat arena-statistics.json | jq   # Raw statistics
```

### Run Tournaments
```bash
node brain-benchmarker.js 10     # Test tournament
```

---

## The 7 Chess Prompts (Auto-Tested)

1. **Classic** - Systematic analysis (balanced)
2. **Aggressive** - Forcing moves (tactical)
3. **Defensive** - Safety first (solid)
4. **Positional** - Long-term structure (strategic)
5. **Balanced** - Versatile (adaptive)
6. **Minimal** - Quick moves (fast)
7. **Verbose** - Deep analysis (slow)

Each game randomly pairs prompts. Win rates show which are strongest.

---

## Understanding Output

### After Each Game:
```
Match 47: tinyllama vs mistral
Prompts: aggressive vs positional
═════════════════════════════════════════════════════════════

✅ Game finished: tinyllama wins
   Moves: 34 | Duration: 12.5s
   Opening: Sicilian Defense

📊 Arena Statistics
   Total Games: 47
   Results: W:24 B:18 D:5
   Avg Moves: 32 | Avg Duration: 11s | Rate: 240/hour
   Openings: 8 unique | Diversity: 17.0%
```

### Prompt Analysis (node analyze-prompts.js):
```
Prompt Rankings (by win rate):
Rank | Prompt      | Games | Wins | W:%  | Avg Moves
──────────────────────────────────────────────────────
1    | aggressive  | 12    | 8    | 66.7% |   31
2    | positional  | 11    | 7    | 63.6% |   33
3    | classic     | 10    | 6    | 60.0% |   32
...
```

---

## Experimentation Workflow

### Phase 1: Baseline (Run 50 games)
```bash
# Start arena
pnpm chess

# Wait for 50+ games to complete
# Monitor progress: watch 'cat arena-statistics.json | jq'

# After 50 games, analyze:
node analyze-prompts.js
```

### Phase 2: Identify Winners
```bash
# See which prompts won most
# Note the top 3 prompts

# See which models performed best
# Note the strongest player
```

### Phase 3: Iteration
1. Identify strongest prompt (e.g., "aggressive")
2. Modify chess-prompts.js to improve it
3. Run next batch of games
4. Compare results

### Phase 4: Benchmarking
```bash
# Run controlled tournament
node brain-benchmarker.js 20

# Analyze tournament results
node brain-benchmarker.js analyze
```

---

## Understanding Statistics

**arena-statistics.json** contains:

```json
{
  "timestamp": "2026-07-22T14:30:00Z",
  "gamesPlayed": 47,
  "whiteWins": 24,
  "blackWins": 18,
  "draws": 5,
  "averageMoves": 32,
  "averageDurationSec": 11,
  "gamesPerHour": 240,
  "illegalMoveRetries": 0,
  "openings": 8,
  "recentGames": [
    {
      "gameNumber": 47,
      "white": "tinyllama",
      "black": "mistral",
      "whitePrompt": "aggressive",
      "blackPrompt": "positional",
      "result": "white-win",
      "moves": 34,
      "durationSec": 12,
      "timestamp": 1721673000000
    }
  ]
}
```

**Key metrics:**
- **gamesPerHour** - Arena throughput
- **illegalMoveRetries** - AI accuracy (should be 0)
- **openings** - Diversity (higher = better)
- **averageMoves** - Game length
- **whiteWins / blackWins / draws** - Prompt effectiveness

---

## Expected Performance

**Baseline (first 50 games):**
- Games per hour: 200-300 (depends on model)
- Illegal moves: 0 (automatic fallback)
- Opening variety: 5-10 different openings
- Win distribution: ~40-50% each + draws

**Good sign:**
- All metrics stable
- No errors in logs
- Consistent game length
- Variety in openings

**Bad sign:**
- Illegal move rate > 1%
- Same opening every game
- Games always < 10 moves
- Errors/crashes

---

## Troubleshooting

### Arena won't start
```
Error: Ollama unavailable
→ Make sure 'ollama serve' is running first
```

### No games playing
```
Error: Models not found
→ Run: ollama pull tinyllama && ollama pull mistral
```

### Stats file not updating
```
Arena still running but no new stats
→ Check file permissions: ls -la arena-statistics.json
→ Check disk space: df -h
```

### Games too slow
```
Taking 30+ seconds per move
→ Using large model? Try: BRAIN_P1=ollama:tinyllama
→ Check CPU: top (should be high)
```

---

## Next: Custom Prompts

Want to test your own chess strategy?

1. Open `chess-prompts.js`
2. Add new prompt function
3. Update export list
4. Run arena again

Example:
```javascript
myCustom: (boardState, gameHistory, candidateMoves, color) => `
Your custom prompt here...
---FINAL ANSWER---
Best move: [move]
Confidence: [0-100]%
---END---
`
```

---

## Research Goals

Use AI Commander to:

✅ **Find strongest prompt** - Which reasoning style wins?
✅ **Benchmark models** - Which Ollama model is best?
✅ **Measure improvement** - Track win rates over iterations
✅ **Detect patterns** - When does each prompt succeed?
✅ **Optimize temperature** - What setting works best?
✅ **Test variations** - Try new ideas and measure impact

---

## Files You Need to Know

| File | Purpose |
|------|---------|
| `arena.js` | Main arena loop |
| `chess-prompts.js` | 7 chess prompts |
| `analyze-prompts.js` | Prompt ranking tool |
| `brain-benchmarker.js` | Tournament runner |
| `opening-tracker.js` | Opening diversity tracker |
| `move-quality-analyzer.js` | Move quality metrics |
| `arena-statistics.json` | Game statistics (auto-generated) |

---

## Typical Session

```bash
# Start arena (keep running)
pnpm chess

# In another terminal, monitor progress
watch 'cat arena-statistics.json | jq .gamesPerHour'

# After 50+ games, analyze
node analyze-prompts.js

# See something interesting? Modify chess-prompts.js
# and run arena again to test

# Want detailed analysis?
cat arena-statistics.json | jq '.recentGames[] | {white, black, whitePrompt, blackPrompt, result}'
```

---

## Remember

- **Real games only** - No simulations, no fake data
- **Autonomous operation** - No manual intervention needed
- **Continuous improvement** - Run longer, get more data
- **Measurable results** - All improvements backed by statistics
- **Research focused** - Not streaming, not UI, not spectators

---

**You now have an autonomous AI research platform.**

Run it, analyze the data, iterate, repeat.

Good luck with your experiments! 🚀♟️
