# EPIC 72 Quick Start Guide

## 🚀 Get Live Chess in 3 Steps

### Step 1: Verify Requirements (30 seconds)
```bash
# Check Ollama is running
curl http://localhost:11434/api/version

# Check Node.js
node --version  # Should be v22+

# Check models available
ollama list  # Should see at least 2 models
```

**If Ollama isn't running:**
```bash
ollama serve  # Start in a terminal and leave it running
```

**If you don't have 2 models:**
```bash
ollama pull mistral
ollama pull neural-chat
```

### Step 2: Start the Chess Arena (2 minutes)
Open a terminal and run:
```bash
pnpm chess
```

**Expected output:**
```
✅ Node.js v22.0.0
✅ Ollama connected
✅ Models available: 2 available
✅ Default config created
🎮 AI Chess Arena Started
🔗 WebSocket Server running on ws://localhost:9000

Match 1
Ollama (Aggressive) vs Ollama (Defensive)
Time Control: Rapid

🎮 Starting real chess game...
```

Keep this terminal open. It will continuously play games.

### Step 3: Watch the Games (1 minute)
Open a NEW terminal and run:
```bash
cd apps/web
npm run dev
```

**Expected output:**
```
VITE v5.0.0  ready in 300 ms

➜  Local:   http://localhost:5173/
```

Then open your browser to:
```
http://localhost:5173
```

**You should see:**
1. ✅ "Connected to Arena" (green dot)
2. ✅ Chess board with pieces
3. ✅ Players: "Ollama tinyllama" vs "Ollama mistral"
4. ✅ Status: "🔴 LIVE"
5. ✅ Moves appearing in real-time
6. ✅ Move count incrementing
7. ✅ Captured pieces showing up as they're taken
8. ✅ Game finishing with result

---

## 🎮 What You're Seeing

### The Board (Center)
- Live chess position updated every move
- Real board state from chess.js
- Starting position (white on bottom)

### Players (Top)
- Model names (ollama: mistral, neural-chat, etc)
- Temperature setting (controls randomness)

### Right Panel
- **Game Stats:** Current game number, status, move count
- **Captured Pieces:** What each side has taken
- **Move History:** Last 10 moves with latency (ms)
- **Commentary:** Interesting moves/positions
- **Arena Stats:** Total games, W/B/D wins, games/hour
- **Health:** 🟢 Ollama is healthy

---

## 🔧 Customization

### Change Which Models Play
Edit `.env`:
```bash
BRAIN_P1=ollama:mistral
BRAIN_P2=ollama:neural-chat
```

Then restart: `pnpm chess`

### Change Restart Delay (seconds between games)
```bash
MATCH_RESTART_DELAY_MS=3000  # 3 seconds (default: 5000)
```

### Change Health Check Interval
```bash
HEALTH_CHECK_INTERVAL_MS=30000  # 30 seconds (default)
```

---

## 🆘 Troubleshooting

### "WebSocket error" in browser
**Cause:** Arena not running  
**Fix:** Make sure `pnpm chess` terminal is still active

### "Ollama unavailable"
**Cause:** Ollama service crashed  
**Fix:** Restart Ollama in that terminal: `ollama serve`

### "Could not find available port"
**Cause:** Port 9000-9010 in use  
**Fix:** Kill other services or change WebSocket port in arena.js:58

### Board is blank
**Cause:** FEN parsing error  
**Fix:** Browser console (F12) shows details. Usually WebSocket disconnect

### No moves for 30+ seconds
**Cause:** Ollama is slow or thinking  
**Fix:** Normal for larger models. Wait or use faster model.

---

## 📊 Monitoring

### Check WebSocket Health
Browser DevTools (F12):
```javascript
// In console:
console.log(document.title)  // Should show game number

// WebSocket tab shows real-time events:
// - GameStarted
// - MovePlayed (repeats for each move)
// - GameFinished
// - ArenaStatisticsUpdated
```

### Check Arena Output
Look at Terminal 1 (`pnpm chess`). Should show:
```
✅ Game Over
   Result: [player] wins
   Moves: 42
   Duration: 15.3s

Arena Statistics
─────────────────
Total Games: 5
White Wins: 2
Black Wins: 2
Draws: 1

⏳ Next match in 5s
```

---

## 🎯 What's Working (EPIC 72)

✅ **Live spectating** — Watch games as they happen  
✅ **Multiple clients** — Open in multiple tabs/browsers  
✅ **Real data only** — No mock data, all from actual chess engine  
✅ **WebSocket streaming** — Event-driven, not polling  
✅ **Auto-reconnect** — If WiFi drops, auto-connects <5s  
✅ **Game statistics** — W/B/D, games/hour, captured pieces  
✅ **Health monitoring** — See if Ollama is healthy  
✅ **Continuous play** — Games restart automatically (EPIC 73)  

---

## 🚫 What's NOT Included (Yet)

❌ OBS integration (EPIC 74)  
❌ Fullscreen broadcast mode (EPIC 74)  
❌ Piece move animations  
❌ Replay/seek functionality  

These are in EPIC 74 (Streaming Experience).

---

## ✨ Tips & Tricks

### Run Faster Games
Use faster models like `tinyllama` or `neural-chat`  
Set `MATCH_RESTART_DELAY_MS=1000` for back-to-back games

### Run Stronger Games
Use larger models like `mistral` or `openchat`  
Takes longer per move but more interesting positions

### Open in Multiple Tabs
Each browser tab is a separate WebSocket connection. They don't interfere. Great for:
- Different zoom levels
- Side-by-side comparison
- Full-screen mode on one monitor, stats on another

### Keep It Running 24/7
Once `pnpm chess` starts, it runs forever (until Ctrl+C). Perfect for:
- Continuous streaming to YouTube
- Gathering statistics over time
- Setting up as a server process

---

## 📚 Deep Dives

For more details, see:
- `EPIC-72-COMPLETION-SUMMARY.md` — Full technical summary
- `EPIC-72-INTEGRATION-PLAN.md` — Architecture & component breakdown
- `verify-epic72-integration.js` — Verify all components are connected
- `websocket-server.js` — WebSocket event structure
- `real-chess-game.js` — How moves are made
- `arena.js` — Main game loop

---

## 🎉 Success!

You now have:
1. **AI Chess Arena** — Two models playing continuously
2. **Live Spectator UI** — Watch in your browser
3. **WebSocket Streaming** — Real-time event updates
4. **Production Ready** — No simulations, no mocks, all real data

What's next?
- EPIC 73: 24/7 Continuous Mode (already in progress)
- EPIC 74: Professional Broadcast/OBS (future)
- EPIC 75: Production Polish (future)

Enjoy the games! 🎮♟️
