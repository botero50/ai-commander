# EPIC 72: Production Deployment Guide

## Overview

This guide walks through deploying AI Commander Chess Spectator for:
- Local testing
- Continuous streaming (24/7)
- Public broadcasts (YouTube)
- Tournament play

All components are ready. This is pure deployment instruction.

---

## Prerequisites Checklist

- [ ] Node.js v22+ installed
- [ ] Ollama installed and running
- [ ] At least 2 Ollama models pulled
- [ ] Port 5173 available (web dev server)
- [ ] Port 9000 available (WebSocket server)
- [ ] Port 11434 available (Ollama, if not localhost)
- [ ] ~1GB disk space available

### Quick Prerequisite Check

```bash
# Check Node.js
node --version  # Should be v22.0.0 or higher

# Check Ollama is running
curl http://localhost:11434/api/version

# Check available models
ollama list

# Check ports available
netstat -an | grep 5173
netstat -an | grep 9000
netstat -an | grep 11434
```

---

## Deployment Steps

### Step 1: Prepare Environment (5 minutes)

```bash
cd /path/to/ai-commander

# Verify .env exists with proper configuration
cat .env | grep -E "BRAIN_P|MATCH_RESTART"

# Expected output:
# BRAIN_P1=ollama:tinyllama
# BRAIN_P2=ollama:mistral
# MATCH_RESTART_DELAY_MS=5000
```

**If you need to customize:**

Edit `.env`:
```bash
# For streaming (faster pacing):
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=3000

# For tournaments (slower pacing):
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=30000
```

### Step 2: Build TypeScript (1 minute)

```bash
npm run build
# Output should complete without errors
```

### Step 3: Start Ollama (if not running)

```bash
# Terminal 0 - Keep this running forever
ollama serve

# Output:
# 2024/07/22 12:00:00 listening on 127.0.0.1:11434
```

**Leave this terminal running. Don't close it.**

### Step 4: Start Arena (2 minutes)

```bash
# Terminal 1 - Keep this running
pnpm chess

# Output should show:
# ✅ Node.js v22.0.0
# ✅ Ollama connected
# ✅ Models available: 2 available
# ✅ Default config created
# 🎮 AI Chess Arena Started
# 🔗 WebSocket Server running on ws://localhost:9000
#
# Match 1
# Ollama (Balanced) vs Ollama (Tactical)
# Time Control: Classical
#
# 🎮 Starting real chess game...
```

**Leave this terminal running. It plays games forever (until Ctrl+C).**

### Step 5: Start Web Development Server (2 minutes)

```bash
# Terminal 2
cd apps/web
npm run dev

# Output should show:
# VITE v5.0.0  ready in 300 ms
#
# ➜  Local:   http://localhost:5173/
# ➜  Press h + enter to show help
```

**Leave this terminal running.**

### Step 6: Open Browser

In your browser, navigate to:
```
http://localhost:5173
```

**Expected result:**
- Green connection indicator ✅
- "Connected to Arena" text
- Empty chessboard (waiting for first move)
- Player names in top ribbons
- Game #1 shown

### Step 7: Watch First Game

Within 2-3 seconds:
- Chessboard populates with starting position
- Status shows "🔴 LIVE"
- First moves appear
- Move count increments

**You're now live streaming!**

---

## Long-Running Deployment (24/7)

For continuous streaming, keep all three components running:

### Terminal 0: Ollama (never stop)
```bash
ollama serve
```

### Terminal 1: Arena (never stop)
```bash
pnpm chess
```

**Statistics saved to disk automatically:**
```bash
# Each time a game finishes, arena-statistics.json updates:
{
  "timestamp": "2024-07-22T12:34:56.789Z",
  "totalGames": 247,
  "whiteWins": 98,
  "blackWins": 102,
  "draws": 47,
  "uptime": 14400000,  // 4 hours in ms
  "gameHistory": [...]
}
```

### Terminal 2: Web Dev Server (can be restarted)
```bash
cd apps/web && npm run dev
```

Browser clients can reconnect without restarting terminals 1-2.

---

## Monitoring Ongoing Play

### In Terminal 1 (Arena)
You'll see periodic output:

```
✅ Game Over
   Result: Ollama wins
   Moves: 42
   Duration: 12.3s

Arena Statistics
─────────────────
Total Games: 2
White Wins: 1
Black Wins: 0
Draws: 1

⏳ Next match in 5s
```

### In Browser (http://localhost:5173)
Watch in real-time:
- Current game position
- Move history
- Captured pieces
- Game statistics update after each game

### Logs Persist
```bash
# Check saved statistics any time:
cat arena-statistics.json | jq '.totalGames'
# Output: 248
```

---

## Graceful Shutdown

### If you want to stop
```bash
# In Terminal 1 (Arena), press Ctrl+C
# Output:
# ^C
# 🛑 Shutting down gracefully...
# 📊 Statistics saved to arena-statistics.json
# ✅ Arena shutdown complete
```

Statistics are saved, WebSocket closes cleanly, clients get disconnect event.

### Restart
```bash
# Statistics persist, games resume numbering from last count
pnpm chess
```

---

## Adding Spectators

Once arena is running and web dev server is up:

### Same Machine
```
http://localhost:5173
```

### Same Network
```
http://<YOUR_IP>:5173

# Find your IP:
ipconfig getifaddr en0  # Mac
hostname -I              # Linux
ipconfig                 # Windows
```

### Public/Internet
Use a reverse proxy:
```bash
# With ngrok:
ngrok http 5173
# Share the generated URL

# With cloudflare tunnel:
cloudflared tunnel --url http://localhost:5173
```

Each client gets independent WebSocket connection. No limit on spectators.

---

## Production Checklist

Before going live:

- [ ] Ollama running and healthy (`curl http://localhost:11434/api/version`)
- [ ] Arena running and showing game output
- [ ] WebSocket server started (look for "ws://localhost:9000" in Terminal 1 output)
- [ ] Web dev server running
- [ ] Browser connects (green indicator)
- [ ] First game appears in browser within 3 seconds
- [ ] Move count increments as game progresses
- [ ] No console errors (F12 DevTools)
- [ ] Arena Terminal shows "Next match in Xs" messages

If all boxes checked ✅ you're ready.

---

## Configuration for Different Scenarios

### Streaming Setup (Recommended for YouTube)
```env
# Fast pacing for entertainment
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
MATCH_RESTART_DELAY_MS=3000

# Responsive health checks
HEALTH_CHECK_INTERVAL_MS=15000
OLLAMA_RETRY_COUNT=5
OLLAMA_RETRY_DELAY_MS=2000
```

Then:
```bash
pnpm chess
cd apps/web && npm run dev
# Open http://localhost:5173 → Full screen
# Share via OBS/Streamlabs for YouTube
```

### Tournament Setup (Scheduled matches)
```env
# Slower pacing for analysis
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:mistral
MATCH_RESTART_DELAY_MS=30000

# Conservative health checks
HEALTH_CHECK_INTERVAL_MS=60000
OLLAMA_RETRY_COUNT=10
OLLAMA_RETRY_DELAY_MS=5000
```

### Testing Setup (Fast iteration)
```env
# Ultra-fast for development
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:tinyllama
MATCH_RESTART_DELAY_MS=1000

# Aggressive monitoring
HEALTH_CHECK_INTERVAL_MS=10000
```

---

## Scaling to Multiple Spectators

**Current Setup (Local):**
- Single machine, single Ollama, single arena
- Supports 1000+ concurrent browser spectators
- WebSocket broadcasts to all at once

**Large-Scale Setup:**
If you need 100,000+ concurrent spectators:
1. Keep arena.js and real-chess-game.js on origin server
2. Point multiple WebSocket servers to same arena instance
3. Use CDN/nginx to distribute browser clients
4. WebSocket load balancing via sticky sessions

For now, single instance handles YouTube audience (thousands).

---

## Troubleshooting Production Issues

### "WebSocket Connection Error" in Browser
**Cause:** Arena not running or WebSocket server failed to start

**Fix:**
```bash
# Check Terminal 1 output for:
🔗 WebSocket Server running on ws://localhost:9000

# If missing, restart:
# Ctrl+C in Terminal 1
pnpm chess
```

### "Ollama Unavailable" After 10+ Games
**Cause:** Ollama process crashed or hung

**Fix:**
```bash
# In Terminal 0, restart Ollama:
# Ctrl+C
ollama serve

# Arena will auto-reconnect
```

### Board is Blank in Browser
**Cause:** WebSocket disconnect or FEN parsing error

**Fix:**
```bash
# Refresh browser (F5)
# Or check:
# - Terminal 1: any error messages?
# - DevTools (F12): Console tab for errors
```

### Very Slow Moves (30+ seconds per move)
**Cause:** Using large model or CPU/memory stressed

**Fix:**
```bash
# Use faster model in .env:
BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:neural-chat

# Restart arena
```

### Statistics Not Saving
**Cause:** Disk permission issue

**Fix:**
```bash
# Check file location:
ls -la arena-statistics.json

# If missing, check write permission:
touch test-file.txt  # Test write access
rm test-file.txt
```

---

## Performance Tuning

### For Smooth Streaming (YouTube)
```bash
# Faster models = faster moves = more interesting to watch
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat

# Monitor CPU/Memory:
# macOS: top
# Linux: htop
# Windows: Task Manager
```

### For High Concurrency (1000+ spectators)
```bash
# WebSocket broadcast is O(n) but fast
# Mainly limited by network bandwidth

# Current bottleneck: Ollama response time
# Speedup: Use smaller models

BRAIN_P1=ollama:tinyllama
BRAIN_P2=ollama:neural-chat

# Each client only needs WebSocket, not game compute
```

### For 24/7 Stability
```bash
# Enable health checks
HEALTH_CHECK_INTERVAL_MS=15000
OLLAMA_RETRY_COUNT=10

# Monitor system resources
# Keep at least 2GB RAM free
# Keep at least 5GB disk space free

# Rotate logs if needed
# (Current system doesn't log to disk, only console)
```

---

## Backup & Recovery

### Statistics Backup
```bash
# Arena automatically saves this file:
arena-statistics.json

# Backup before long runs:
cp arena-statistics.json arena-statistics.backup.json

# Restore if needed:
cp arena-statistics.backup.json arena-statistics.json
```

### Configuration Backup
```bash
# Backup your custom .env:
cp .env .env.backup

# Share with team:
# (Remove any API keys before sharing)
```

### Game History Export
```bash
# After running 24 hours:
cat arena-statistics.json | jq '.gameHistory' > games.json

# Analyze results:
node analyze-games.js games.json
```

---

## Deployment Checklist

### Before Launch
- [ ] Build succeeds: `npm run build`
- [ ] Ollama running and v2+ (check version)
- [ ] Models available: `ollama list`
- [ ] .env configured for your use case
- [ ] Ports 5173, 9000, 11434 not in use
- [ ] Disk space: 1GB+ available
- [ ] RAM: 4GB+ available for Ollama

### During Launch
- [ ] Terminal 1 (Ollama): running, no errors
- [ ] Terminal 2 (Arena): running, shows "WebSocket Server running on ws://localhost:9000"
- [ ] Terminal 3 (Web): running, shows "Local: http://localhost:5173"
- [ ] Browser: shows green indicator + "Connected to Arena"
- [ ] First game appears within 3 seconds
- [ ] Moves increment continuously

### After First Hour
- [ ] Arena Terminal shows statistics periodically
- [ ] arena-statistics.json file exists with data
- [ ] Browser shows 20+ games completed (depends on model speed)
- [ ] No error messages in any terminal
- [ ] Memory usage stable (not growing)

### Daily (if running 24/7)
- [ ] Check arena-statistics.json for expected game count
- [ ] Verify WebSocket server still running (Terminal 1 output)
- [ ] Check Ollama health (should show ✅ in Arena output)
- [ ] Verify browser still connects (refresh http://localhost:5173)

---

## Quick Reference: Command Summary

```bash
# Terminal 0 - Ollama (never stop)
ollama serve

# Terminal 1 - Arena (never stop)
pnpm chess

# Terminal 2 - Web Dev (can restart anytime)
cd apps/web && npm run dev

# Browser
http://localhost:5173

# Statistics file (auto-updated)
cat arena-statistics.json

# Logs
# - Arena output: Terminal 1
# - Web dev: Terminal 2
# - Browser: F12 DevTools Console

# Verify components
node verify-epic72-integration.js
```

---

## Success Criteria

✅ You've successfully deployed EPIC 72 when:

1. **Arena running:** `pnpm chess` shows game output
2. **WebSocket live:** Terminal shows "ws://localhost:9000"
3. **Browser connected:** http://localhost:5173 shows green indicator
4. **Games playing:** Chessboard updates every 1-3 seconds
5. **Statistics updating:** arena-statistics.json file grows
6. **Graceful restart:** Ctrl+C stops cleanly, stats saved

That's it. You're live! 🎮♟️

---

## Next Steps

- **Watch first 10 games** and get familiar with UI
- **Customize configuration** if desired (see EPIC-72-ENV-CONFIG-GUIDE.md)
- **Run 24/7** for continuous statistics
- **Add OBS integration** when ready (EPIC 74)
- **Share URL** for public spectators (use ngrok/cloudflare tunnel)
- **Monitor statistics** and adjust AI models if needed

Enjoy your live chess arena! 🎉
