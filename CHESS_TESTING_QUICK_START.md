# Chess AI Testing - Quick Start Guide

**Created:** July 23, 2026  
**Time to first test:** ~5 minutes

---

## What We've Done

✅ Created `chess-prompt-optimizer.js` with 3-tier prompting system  
✅ Integrated optimizer into `real-chess-game.js`  
✅ Added strategic position analysis (threats, captures, checks)  
✅ Implemented model-adaptive parameters (Tier 1/2/3)  
✅ Enhanced move extraction with 4 pattern strategies  

---

## Quick Test (5 minutes)

### Step 1: Check Available Models
```bash
ollama list
```

You should see something like:
```
mistral:latest        4.1GB
llama2:13b           7.3GB
tinyllama:latest     1.1GB
```

**Recommendation:** Start with `mistral` (fast, good quality)

### Step 2: Update Config
Edit `chess-arena-config.json`:
```json
{
  "players": [
    {
      "id": "player-1",
      "name": "Mistral-White",
      "provider": "ollama",
      "model": "mistral",
      "temperature": 0.15,  // <- Change this (was 0.5)
      "personality": "balanced"
    },
    {
      "id": "player-2",
      "name": "Mistral-Black",
      "provider": "ollama",
      "model": "mistral",
      "temperature": 0.15,  // <- Change this (was 0.5)
      "personality": "competitive"
    }
  ],
  "arena": {
    "maxGamesPerSession": 1,
    "randomizeEachGame": false,
    "defaultTimeControl": "infinite"
  }
}
```

### Step 3: Run a Game
```bash
pnpm chess
```

This will:
1. Start a game with both players using Mistral
2. Play moves until someone wins or stalemate
3. Print detailed move info including:
   - Move notation (e4, Nf3, etc.)
   - Latency (should be 500-1500ms per move)
   - Extraction quality (structured/token/pattern)
   - Response snippets for analysis

### Step 4: Watch for These Signs of Improvement

**Good signs (✅):**
- Legal moves only (no "Na6" nonsense)
- Moves make sense: e4 (center control), Nxc4 (captures), Kh2 (king safety)
- Extraction quality: "structured" or "token" (high confidence)
- Latency: 500-2000ms (reasonable for Ollama)

**Bad signs (❌):**
- Illegal moves (errors in console)
- Random moves: Na6, Rb8, h3 (pointless)
- Extraction quality: "pattern" (low confidence)
- "Could not extract valid move" errors

---

## Testing Different Models

If Mistral isn't working well, try:

### Fast & Decent: OpenChat 3.5
```bash
ollama pull openchat:3.5
```

Update config:
```json
"model": "openchat:3.5",
"temperature": 0.15
```

### Best Quality (Slow): Dolphin Mixtral
```bash
ollama pull dolphin-mixtral:8x7b
```

Update config:
```json
"model": "dolphin-mixtral:8x7b",
"temperature": 0.15
```

---

## Interpreting the Output

### Example Good Game Output
```
  1. e4 (white) - 1.2s, 85% confidence (Opening - Sicilian Defense)
  2. c5 (black) - 1.5s, 80% confidence (Opening - Sicilian Defense)
  3. Nf3 (white) - 0.8s, 90% confidence
     ⏱️  Mistral-White (Nf3) - Ollama latency: 850ms (quality: structured)
  4. d6 (black) - 1.1s, 85% confidence
     ⏱️  Mistral-Black (d6) - Ollama latency: 1100ms (quality: token)
```

**What it means:**
- Move is legal and makes sense
- Latency is reasonable (~1s per move)
- Extraction quality is high
- Confidence reflects how certain the AI was

### Example Bad Game Output
```
  1. e4 (white) - OK
  2. c5 (black) - OK
  3. Nxc5 (white) - ILLEGAL! c5 is not a piece to capture
     ❌ Ollama request failed: Could not extract valid move
     ⏱️  Mistral-White (Rb8) - Ollama error, using random legal move
```

**What it means:**
- Extraction failed (model didn't format move properly)
- Fallback to random move
- This suggests:
  - Temperature too high (try 0.10)
  - Model too small (try Mistral instead of TinyLlama)
  - Prompt unclear (check output in logs)

---

## Debugging Tips

### If you see "Could not extract valid move"

1. **Check the response:**
   - Look for: `response: "..."` in console
   - Is the move mentioned anywhere? ("e4", "Nf3", etc.)
   - Is it buried in explanation text?

2. **Try these fixes:**
   ```json
   "temperature": 0.10,    // Lower = more focused
   "top_p": 0.60,          // (in buildOllamaRequest)
   "top_k": 10             // (in buildOllamaRequest)
   ```

3. **Or switch models:**
   ```json
   "model": "openchat:3.5"  // Faster, more direct
   ```

### If moves are nonsensical (Na6, Rb8)

1. **Check temperature:** Should be ≤ 0.2 (not 0.5+)
2. **Check model size:** TinyLlama (1.1B) too small for chess
3. **Try Mistral (7B):** Better reasoning capability

### If "Ollama is not running"

```bash
# Start Ollama
ollama serve

# Or if you want to run it with GPU:
ollama serve --gpu-count 1
```

---

## What the Optimizer Does

### 1. Position Analysis
```javascript
analyzePositionContext()
// Detects:
// - Checks available
// - Material captures
// - Forcing moves (priorities)
```

### 2. Smart Prompting (3 Tiers)
```
Tier 1 (TinyLlama):    "Chess White: [board]\n\nMove: "
Tier 2 (Mistral):      "[board]\n\nFocus: 1. Checks? 2. Captures? 3. Candidates?\n\nChoose:"
Tier 3 (Dolphin):      "[board]\n\nSystematic: Threats > Candidates > Decision\n\nBest move:"
```

### 3. Better Extraction
```javascript
extractMoveEnhanced()
// Tries 4 strategies:
// 1. Explicit patterns: "Best move: e4"
// 2. First token match: "e4" anywhere
// 3. Regex patterns: Looking for standard notation
// 4. Ranked search: Recent mentions first
```

### 4. Model-Specific Parameters
```javascript
buildOllamaRequest()
// Tiny:  temp=0.25, tokens=64
// Mid:   temp=0.15, tokens=256
// Large: temp=0.15, tokens=1024
```

---

## Success Metrics

After 5-10 games with Mistral 7B at temp=0.15, you should see:

| Metric | Target | Interpretation |
|--------|--------|-----------------|
| Legal moves | 100% | All moves parse correctly |
| "Structured" extractions | >70% | High-confidence move selection |
| Average latency | 500-1500ms | Reasonable performance |
| Move quality | 70%+ strategic | Recognizes checks, captures, tactics |

---

## Next Steps

1. **Today:** Run test with Mistral, document results
2. **This week:** If good, test other models for comparison
3. **Polish:** Once good model found, optimize further:
   - Fine-tune temperature
   - Adjust token limits
   - Experiment with prompt wording

---

## File Reference

**Modified:**
- `real-chess-game.js` — Uses optimizer functions
- `chess-arena-config.json` — Update model/temperature

**New:**
- `chess-prompt-optimizer.js` — Core optimization logic
- `CHESS_AI_OPTIMIZATION_PLAN.md` — Full documentation
- `test-chess-optimization.sh` — Batch testing script

---

## Help & Questions

Check the logs for:
- `⏱️` = Move made successfully
- `❌` = Ollama error, details follow
- `(quality: ...)` = Extraction confidence level

If stuck:
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check model exists: `ollama list | grep mistral`
3. Check temperature: Should be 0.1-0.2, not 0.5+
4. Try switching to `openchat:3.5` (often faster)

Good luck! 🎯
