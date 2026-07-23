# EPIC 72: Configuration Guide

## Current Configuration

Your `.env` file is already set up with production-ready defaults:

```
BRAIN_P1=ollama:tinyllama          # Player 1 (White)
BRAIN_P2=ollama:mistral            # Player 2 (Black)
OLLAMA_BASE_URL=http://localhost:11434
MATCH_RESTART_DELAY_MS=5000        # 5 seconds between games
HEALTH_CHECK_INTERVAL_MS=30000     # Health check every 30 seconds
```

## Running Your First Match

With current config, when you run `pnpm chess`:

1. **tinyllama** plays White (smaller, faster model)
2. **mistral** plays Black (larger, stronger model)
3. Games restart automatically every 5 seconds
4. Ollama health checked every 30 seconds

This is a good balanced setup for testing.

---

## Configuration Options

### Brain Selection

Change which models play by editing `.env`:

**Fastest Games (weak AI, real-time):**
```env
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=2000    # 2 seconds
```

**Balanced (medium strength, smooth streaming):**
```env
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=5000    # 5 seconds
```

**Strongest Games (powerful AI, slower moves):**
```env
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:llama2
MATCH_RESTART_DELAY_MS=10000   # 10 seconds
```

**Same Model (deterministic testing):**
```env
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=5000
```

### Game Pacing

Control how fast games restart:

```env
# Fast Pacing (rapid streaming)
MATCH_RESTART_DELAY_MS=1000     # 1 second between games

# Normal Pacing (comfortable watching)
MATCH_RESTART_DELAY_MS=5000     # 5 seconds (DEFAULT)

# Slow Pacing (time to read commentary)
MATCH_RESTART_DELAY_MS=15000    # 15 seconds

# Tournament Pacing (scheduled events)
MATCH_RESTART_DELAY_MS=30000    # 30 seconds
```

### Health Monitoring (EPIC 73)

Control how often system checks if Ollama is healthy:

```env
# Responsive Monitoring (aggressive)
HEALTH_CHECK_INTERVAL_MS=10000   # Check every 10 seconds

# Normal Monitoring (balanced)
HEALTH_CHECK_INTERVAL_MS=30000   # Check every 30 seconds (DEFAULT)

# Conservative Monitoring (minimal overhead)
HEALTH_CHECK_INTERVAL_MS=60000   # Check every 60 seconds
```

### Connection Resilience (EPIC 73)

Control recovery from Ollama disconnects:

```env
# Fast Recovery (for local/LAN)
OLLAMA_RETRY_COUNT=5            # 5 attempts
OLLAMA_RETRY_DELAY_MS=2000      # 2 seconds between retries (10s total)

# Normal Recovery (balanced, DEFAULT)
OLLAMA_RETRY_COUNT=5            # 5 attempts
OLLAMA_RETRY_DELAY_MS=5000      # 5 seconds between retries (25s total)

# Aggressive Recovery (for unreliable networks)
OLLAMA_RETRY_COUNT=10           # 10 attempts
OLLAMA_RETRY_DELAY_MS=5000      # 5 seconds between retries (50s total)
```

---

## Recommended Profiles

### Profile 1: TESTING (Default)
```env
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=5000
HEALTH_CHECK_INTERVAL_MS=30000
OLLAMA_RETRY_COUNT=5
OLLAMA_RETRY_DELAY_MS=5000
```
**Use for:** Initial setup, feature testing, development

### Profile 2: STREAMING
```env
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=3000
HEALTH_CHECK_INTERVAL_MS=15000
OLLAMA_RETRY_COUNT=5
OLLAMA_RETRY_DELAY_MS=2000
```
**Use for:** Live YouTube streaming, content creation
**Why:** Balanced AI strength, faster pacing, responsive health checks

### Profile 3: TOURNAMENT
```env
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=30000
HEALTH_CHECK_INTERVAL_MS=60000
OLLAMA_RETRY_COUNT=10
OLLAMA_RETRY_DELAY_MS=5000
```
**Use for:** Scheduled matches, statistics gathering
**Why:** Deterministic AI, slow pacing for analysis, robust recovery

### Profile 4: PERFORMANCE
```env
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:tinyllama
MATCH_RESTART_DELAY_MS=1000
HEALTH_CHECK_INTERVAL_MS=60000
OLLAMA_RETRY_COUNT=3
OLLAMA_RETRY_DELAY_MS=1000
```
**Use for:** Stress testing, load generation, benchmarking
**Why:** Fastest models, rapid restarts, minimal overhead

---

## How to Apply Configuration Changes

### 1. Edit `.env`
```bash
# Edit the file directly
# Or use this command to change one setting:
sed -i 's/BRAIN_P1=.*/BRAIN_P1=ollama:llama2/' .env
```

### 2. Restart Arena
The new config is read when `pnpm chess` starts:
```bash
# Terminal 1: Stop current run (Ctrl+C)
# Then restart:
pnpm chess
```

### 3. Watch for Changes
In browser (http://localhost:5173), you'll see:
- New player names in ribbons
- Game stats reset (new match #1)
- WebSocket reconnect animation

No need to restart the web dev server!

---

## Monitoring Configuration Impact

### Move Time (depends on model)
```
tinyllama:     ~0.5-1.5 seconds per move (fast)
neural-chat:   ~1-3 seconds per move (medium)
mistral:       ~2-5 seconds per move (slower)
llama2:        ~3-8 seconds per move (slowest)
```

### Game Length (average moves per game)
```
Typical chess game:  35-50 moves
Recorded range:      20-80 moves
Quick match:         ~10-15 minutes (tinyllama)
Regular match:       ~15-25 minutes (mistral)
Slow match:          ~25-40 minutes (llama2)
```

### Total Game Time
```
Game length + restart delay = total cycle time

Example (mistral vs neural-chat):
  ~3 minutes average game
  + 5 seconds restart delay
  = ~3 min 5 sec per cycle
  = ~20 games per hour
```

---

## Troubleshooting Configuration

### Games are too slow
```bash
# Use faster models
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:neural-chat
```

### Games are too weak/boring
```bash
# Use stronger models
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
```

### Ollama keeps disconnecting
```bash
# Increase retry attempts and frequency
OLLAMA_RETRY_COUNT=10
OLLAMA_RETRY_DELAY_MS=2000
HEALTH_CHECK_INTERVAL_MS=15000
```

### High CPU usage
```bash
# Increase time between health checks
HEALTH_CHECK_INTERVAL_MS=60000

# Use faster models
BRAIN_P1=ollama:tinyllama
```

### Want to change models without restarting web dev
```bash
# Edit .env
BRAIN_P1=ollama:neural-chat

# Restart arena only (Terminal 1: Ctrl+C, then pnpm chess)
# Web dev stays running
# Browser automatically reconnects
```

---

## What Each Setting Does

| Setting | Purpose | Impact |
|---------|---------|--------|
| BRAIN_P1 | Player 1 (White) model | Move quality, speed |
| BRAIN_P2 | Player 2 (Black) model | Move quality, speed |
| BRAIN_TIMEOUT | Max time per move | Game speed ceiling |
| OLLAMA_BASE_URL | Ollama server location | Must be reachable |
| MATCH_RESTART_DELAY_MS | Pause between games | Pacing, viewability |
| HEALTH_CHECK_INTERVAL_MS | Ollama health check frequency | Detection speed |
| OLLAMA_RETRY_COUNT | Connection retry attempts | Recovery robustness |
| OLLAMA_RETRY_DELAY_MS | Delay between retries | Recovery speed |
| STATISTICS_PERSIST_FILE | Stats save location | Data persistence |

---

## Environment Variables Passed to Arena

When you run `pnpm chess`, these are read from `.env`:

```javascript
// In arena.js:
BRAIN_P1 = process.env.BRAIN_P1 || 'ollama:tinyllama'
BRAIN_P2 = process.env.BRAIN_P2 || 'ollama:mistral'
MATCH_RESTART_DELAY_MS = parseInt(process.env.MATCH_RESTART_DELAY_MS) || 5000
HEALTH_CHECK_INTERVAL_MS = parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 30000
OLLAMA_RETRY_COUNT = parseInt(process.env.OLLAMA_RETRY_COUNT) || 5
OLLAMA_RETRY_DELAY_MS = parseInt(process.env.OLLAMA_RETRY_DELAY_MS) || 5000
```

Defaults are baked in, so `.env` is optional. Defaults are sensible for testing.

---

## Quick Config Changes

### For Streaming
```bash
# Copy this to .env:
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=3000
HEALTH_CHECK_INTERVAL_MS=15000
```

### For Tournaments
```bash
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=30000
HEALTH_CHECK_INTERVAL_MS=60000
```

### For Load Testing
```bash
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:tinyllama
MATCH_RESTART_DELAY_MS=1000
HEALTH_CHECK_INTERVAL_MS=60000
```

---

## Next: Start with Current Config

Your current `.env` is good to go:

```bash
pnpm chess
```

Expected output:
```
✅ tinyllama vs mistral
🎮 Starting real chess game...
⏳ Next match in 5s
```

Then in browser: http://localhost:5173

Watch the first game play out, then customize from there if needed!
