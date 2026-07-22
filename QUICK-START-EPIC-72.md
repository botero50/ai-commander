# 🚀 Quick Start: EPIC 72 - Live Chess Spectator

Get live chess games streaming to your browser in 2 terminals.

## Prerequisites

- Node.js 22+
- Ollama running with `mistral` model
- pnpm installed

## Start in 3 Steps

### Step 1: Terminal 1 - Start the Arena
```bash
npm run chess
```

**Expected Output:**
```
🔗 WebSocket Server running on ws://localhost:9000
🌐 Spectator UI: http://localhost:5173
🚀 Launching continuous arena...

Match #1
[Board positions will display here]
```

**The arena will now play games forever.**

### Step 2: Terminal 2 - Start the Web UI
```bash
cd apps/web
pnpm run dev
```

**Expected Output:**
```
  VITE v5.4.21  ready in 145 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 3: Browser
**Open:** http://localhost:5173

**You should see:**
- ✅ Connection status: "Connected to Arena"
- ✅ Live chessboard with pieces
- ✅ Player names and models
- ✅ Move count and game duration
- ✅ Recent moves with latency
- ✅ Captured pieces
- ✅ Commentary

**Watch real-time moves appear as the arena plays!**

---

## What's Happening

```
Terminal 1 (Arena)              Terminal 2 (Web)
├─ Ollama API                   ├─ React Dev Server
├─ Chess Game                   ├─ WebSocket Client
├─ Broadcast Service            ├─ Chessboard Display
└─ WebSocket Server ────────────┘ └─ Live Updates
    (port 9000)
```

**Data Flow:**
1. Arena executes move in chess.js
2. Broadcast service detects events
3. WebSocket server sends move to all browsers
4. React component updates chessboard
5. All in < 100ms

---

## Verification Checklist

After both terminals are running:

- [ ] Browser shows "Connected to Arena" (green indicator)
- [ ] Player names appear (e.g., "Ollama-1 vs Ollama-2")
- [ ] Moves appear in real-time on the board
- [ ] Move history shows last few moves
- [ ] Captured pieces list updates
- [ ] No errors in browser console (F12)
- [ ] No errors in terminal

**If any check fails:** See troubleshooting below

---

## Troubleshooting

### "Cannot connect to WebSocket"
```
1. Check arena is running: npm run chess should be in Terminal 1
2. Check port 9000 is free: lsof -ti:9000 | xargs kill -9
3. Reload browser
```

### "Chessboard not updating"
```
1. Wait 3 seconds for first game to start
2. Reload the page
3. Check browser console (F12) for errors
```

### "Moves are slow (>500ms)"
```
Ollama is taking time to generate moves.
This is normal for first move - it warms up.
Subsequent moves should be <300ms.
```

### "Port already in use"
```
Kill existing process:
  lsof -ti:5173 | xargs kill -9   # Web UI port
  lsof -ti:9000 | xargs kill -9   # WebSocket port
  lsof -ti:11434 | xargs kill -9  # Ollama port (if needed)
```

---

## Next Steps

After confirming everything works:

1. **Keep both running** - The arena will play games forever
2. **Open multiple browser tabs** - Each gets a real-time feed
3. **EPIC 73** - Set up continuous arena with statistics
4. **EPIC 74** - Add streaming overlays for YouTube
5. **EPIC 75** - Production polish and validation

---

## Architecture Summary

```
┌─ Browser http://localhost:5173 ─────┐
│  React ChessSpectator Component      │
│  ├─ Chessboard (react-chessboard)    │
│  ├─ Move History                     │
│  ├─ Captured Pieces                  │
│  ├─ Commentary                       │
│  └─ Game Stats                       │
└────────┬────────────────────────────┘
         │ WebSocket ws://localhost:9000
         │ (events: GameStarted, MovePlayed,
         │  CommentaryGenerated, GameFinished)
┌────────▼────────────────────────────┐
│ Node.js Arena (npm run chess)        │
│ ├─ Chess Games (chess.js)            │
│ ├─ WebSocket Server                  │
│ ├─ Broadcast Service                 │
│ └─ Event Detection                   │
└────────┬────────────────────────────┘
         │ HTTP localhost:11434
         │ (move decisions)
┌────────▼────────────────────────────┐
│ Ollama                               │
│ └─ mistral (chess decisions)         │
└─────────────────────────────────────┘
```

---

## Example Output

### Terminal 1 (Arena)
```
🏛️   Arena Started
   Press Ctrl+C to stop

────────────────────────────────────────────────────
  Match #1
────────────────────────────────────────────────────

Ollama-1 (Aggressive) vs Ollama-2 (Defensive)
Time Control: Blitz
White Temperature: 0.90
Black Temperature: 0.30

🎮 Starting real chess game...

  1. e4 (white)
   ⏱️  Ollama-1 (e4) - Ollama latency: 245ms
  
  1... e5 (black)
   ⏱️  Ollama-2 (e5) - Ollama latency: 187ms

  2. Nf3 (white)
   ⏱️  Ollama-1 (Nf3) - Ollama latency: 156ms

...

✅ Game Over
   Result: White wins
   Moves: 42
   Duration: 45.3s
```

### Browser (http://localhost:5173)
```
✅ Connected to Arena

┌────────────────────────────────────────────┐
│                                            │
│ White: Ollama-1 (Aggressive)              │
│ Temp: 0.90 | Model: mistral              │
│                                            │
│  ┌──────────────────────────┐             │
│  │ ♖ ♘ ♗ ♕ ♔ ♗ ♘ ♖  8      │             │
│  │ ♙ ♙ ♙ ♙ . ♙ ♙ ♙  7      │             │
│  │ . . . . . . . .  6      │             │
│  │ . . . . . . . .  5      │             │
│  │ . . . . ♟ . . .  4      │             │
│  │ . . . . . . . .  3      │             │
│  │ ♟ ♟ ♟ ♟ . ♟ ♟ ♟  2      │             │
│  │ ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜  1      │             │
│  │ a  b  c  d  e  f  g  h  0             │
│  └──────────────────────────┘             │
│                                            │
│ Black: Ollama-2 (Defensive)              │
│ Temp: 0.30 | Model: mistral             │
│                                            │
└────────────────────────────────────────────┘

Game #1                  Recent Moves:
Status: 🔴 LIVE         1. e4 (245ms)
Moves: 4                2. e5 (187ms)
Duration: 18s           3. Nf3 (156ms)
                        4. Nc6 (143ms)

Captured:
White: (none)
Black: (none)

Commentary:
  Opening: Classic Italian setup
  Nf3 develops toward f5
  Standard defense
```

---

## Useful Commands

```bash
# Stop arena
Ctrl+C (in Terminal 1)

# Stop web UI
Ctrl+C (in Terminal 2)

# Check Ollama is running
curl http://localhost:11434/api/version

# View WebSocket messages (in new terminal)
websocat ws://localhost:9000

# Build web app for production
cd apps/web && pnpm run build

# Stream output to file
npm run chess 2>&1 | tee arena.log
```

---

## Performance Expectations

| Metric | Target | Typical |
|--------|--------|---------|
| Move latency | <100ms | 50-250ms |
| Ollama response | <1s | 0.2-0.5s |
| WebSocket delivery | <50ms | 10-30ms |
| UI update | <16ms | 5-12ms |
| Memory (browser) | <100MB | 40-60MB |
| Memory (server) | <200MB | 80-120MB |
| Browser CPU | <30% | 5-15% |
| Node.js CPU | <50% | 10-25% |

---

## What's Running

### Terminal 1 (Arena)
- **Process:** Node.js
- **Role:** Game execution, WebSocket server
- **Ports:** 9000 (WebSocket), 11434 (Ollama client)
- **Lifetime:** Forever (until Ctrl+C)

### Terminal 2 (Web)
- **Process:** Vite dev server
- **Role:** React development server
- **Ports:** 5173 (HTTP), 9000 (WebSocket client)
- **Lifetime:** Until Ctrl+C or build completes

### Ollama
- **Process:** External service
- **Role:** AI model inference
- **Port:** 11434
- **Models:** mistral

---

## Common Issues & Solutions

| Issue | Cause | Fix |
|-------|-------|-----|
| WebSocket connection fails | Arena not running | Start arena first |
| Chessboard blank | No game started yet | Wait 2-3 seconds |
| Moves delayed | Ollama slow | Normal on first move |
| Port 5173 taken | Previous session | `lsof -ti:5173 \| xargs kill -9` |
| Port 9000 taken | Arena not cleaned up | `lsof -ti:9000 \| xargs kill -9` |
| Blank page | Build failed | Check terminal output |
| Browser console errors | TypeScript issue | Reload page, check network tab |

---

## Success Criteria

You've completed EPIC 72 when:

1. ✅ Arena starts with `npm run chess`
2. ✅ WebSocket server listens on port 9000
3. ✅ Web UI starts with `pnpm run dev`
4. ✅ Browser shows "Connected to Arena"
5. ✅ Chessboard updates with each move
6. ✅ Move history shows last 10 moves
7. ✅ Captured pieces update correctly
8. ✅ Commentary appears for events
9. ✅ No console errors in browser
10. ✅ Can watch multiple games continuously

---

## Next: EPIC 73

Once this works, EPIC 73 adds:
- **Continuous match restart** (configurable delay)
- **Statistics tracking** (wins/losses/draws)
- **Random player assignment**
- **24/7 streaming mode**

See `EPIC-73-PLAN.md` for details.

---

**Status:** ✅ Ready to Stream

Your chess arena is now visible to the world. Open http://localhost:5173 and watch AI vs AI live!
