# AI Commander Public Stream — Quick Start Guide

**Status:** ✅ Ready to Launch  
**Command:** `npm run stream:launch`

---

## 🚀 Launch in 3 Steps

### 1. Navigate to Project Root
```bash
cd C:\Users\boter\ai-commander
```

### 2. Run the Stream
```bash
npm run stream:launch
```

This command:
- ✅ Builds TypeScript
- ✅ Starts PublicStreamLauncher
- ✅ Begins infinite match rotation
- ✅ Opens REST API on http://localhost:3000

### 3. Open Broadcast Overlay
```
Visit: http://localhost:3000
```

Or embed the React component in your streaming software:
```typescript
<BroadcastOverlay apiUrl="http://localhost:3000" />
```

---

## 📊 What You'll See

### Console Output
```
╔════════════════════════════════════════════╗
║   🎬 AI COMMANDER PUBLIC STREAM LAUNCH     ║
╚════════════════════════════════════════════╝

Configuration:
  statusPort: 3000
  maxMatches: ∞ (infinite)
  logInterval: 300s

Starting components...
✅ Stream launched successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 BROADCAST OVERLAY
   URL: http://localhost:3000
   Endpoints:
   - /stream/status (stream state)
   - /arena/stats (arena statistics)
   - /metrics/current (real-time player stats)
   - /metrics/history (historical data)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STREAM RUNNING
   Monitor: logs below
   Ctrl+C to stop
```

### Broadcast Overlay
```
🟢 CONNECTED (top-right)
┌────────────────────────────────────┐
│ UPTIME          MATCHES    MATCH #1│
├────────────────────────────────────┤
│                                    │
│  AI Player 1        VS   AI Player 2
│  ─────────────────────────────────┤
│  Resources: 500W 300S 250F         │
│  Units: 25 | Buildings: 8         │
│  Population: 45/300                │
│                                    │
├────────────────────────────────────┤
│ ARENA ✅ BROADCAST ✅ METRICS ✅  │
└────────────────────────────────────┘
```

---

## ⚙️ Configuration Options

### Custom Port
```bash
STREAM_PORT=5000 npm run stream:launch
```
→ Broadcast overlay at http://localhost:5000

### Tournament Mode (Limited Matches)
```bash
STREAM_MATCHES=16 npm run stream:launch
```
→ Runs 16 matches then stops

### Logging Interval
```bash
STREAM_LOG_INTERVAL=60 npm run stream:launch
```
→ Status logs every 60 seconds (default 300)

### Combined Configuration
```bash
STREAM_PORT=4000 STREAM_MATCHES=50 STREAM_LOG_INTERVAL=120 npm run stream:launch
```

---

## 🎮 What's Happening

### Behind the Scenes

1. **Arena Controller**
   - Selects random map (9 available)
   - Selects random civilizations (12 available)
   - Launches real 0 A.D. game process
   - Monitors game state

2. **AI Brains**
   - Claude LLM decision-making
   - Ollama local AI
   - Real strategy execution
   - Observable actions

3. **Broadcast Pipeline**
   - Real game events stream
   - Converted to broadcast format
   - Metrics computed in real-time
   - Data exposed via REST API

4. **Metrics HUD**
   - 500ms update polling
   - Real-time player statistics
   - Resource tracking
   - Military value calculation

5. **Auto-Recovery**
   - Monitors for crashes
   - Detects timeouts
   - Automatic restart
   - No manual intervention

---

## 📡 REST API

All endpoints return JSON. Base URL: `http://localhost:3000`

### Stream Status
```bash
curl http://localhost:3000/stream/status | jq
```

### Real-Time Metrics
```bash
curl http://localhost:3000/metrics/current | jq
```

### Health Check
```bash
curl http://localhost:3000/health | jq
```

### Player Comparison
```bash
curl "http://localhost:3000/metrics/comparison?p1=1&p2=2" | jq
```

---

## 🛑 Stop the Stream

### Graceful Shutdown
```bash
Ctrl+C
```

The stream will:
- ✅ Stop accepting new matches
- ✅ Shut down current match
- ✅ Close all connections
- ✅ Exit cleanly

---

## ✅ Verification Checklist

When the stream starts, verify:

- [ ] Startup banner displays
- [ ] "✅ Stream launched successfully" message shows
- [ ] Broadcast URL displayed (http://localhost:3000)
- [ ] No error messages in logs
- [ ] Can access http://localhost:3000 in browser
- [ ] Broadcast overlay shows "CONNECTED" (green dot)
- [ ] Player stats displaying
- [ ] Health indicators showing green
- [ ] Uptime counter incrementing
- [ ] Logs show "📊 Stream Status" every 5 minutes

---

## 🐛 Troubleshooting

### "npm error: Missing script"
**Solution:** Run from project root (`C:\Users\boter\ai-commander`)

### Port 3000 already in use
**Solution:** Use different port
```bash
STREAM_PORT=4000 npm run stream:launch
```

### Broadcast overlay shows "OFFLINE"
**Solution:** 
1. Verify stream is running
2. Check http://localhost:3000/health
3. Refresh browser (F5)
4. Stream will reconnect automatically

### High CPU usage
**Normal** — 0 A.D. uses significant CPU. Expected behavior.

### No metrics updating
**Solution:**
1. Wait 10 seconds (first match initialization)
2. Check browser console for errors
3. Verify /metrics/current endpoint returns data

---

## 🎬 Integration with Streaming Software

### OBS (Open Broadcaster Software)

1. Add new **Browser Source**
2. Set URL: `http://localhost:3000`
3. Width: 1920px
4. Height: 1080px
5. Start the stream

### XSplit

1. Add **Web Source**
2. URL: `http://localhost:3000`
3. Resolution: 1920x1080
4. Enable

### Streamlabs

1. Add **Website Source**
2. URL: `http://localhost:3000`
3. Dimensions: 1920x1080

---

## 📊 Status Logs

Every 5 minutes (by default), you'll see:
```
📊 Stream Status
  matches: 15
  uptime: 75m30s
  broadcast: ✅
  metrics: ✅
```

This confirms:
- ✅ Matches are rotating
- ✅ Uptime is tracking
- ✅ Broadcast is active
- ✅ Metrics are flowing

---

## 🔍 Monitoring

### Watch Real-Time Status
```bash
# Update every 1 second
watch -n 1 "curl -s http://localhost:3000/stream/status | jq '.uptime'"
```

### Watch Metrics Updates
```bash
# Update every 0.5 seconds
watch -n 0.5 "curl -s http://localhost:3000/metrics/current | jq '.players[0].resources.wood'"
```

### Tail Logs
```bash
tail -f logs/stream.log | grep -E "error|Error|ERROR|Match|Metrics"
```

---

## 📚 Full Documentation

For more details, see:
- **DEPLOYMENT.md** — Complete deployment guide
- **EPIC-59-COMPLETE.md** — Stream system architecture
- **PROJECT-COMPLETE.md** — Full project summary

---

## 🎯 Success = Running Forever

The stream is working correctly when:

✅ Matches keep rotating  
✅ Uptime counter incrementing  
✅ Broadcast overlay shows live stats  
✅ No error messages  
✅ Ctrl+C stops gracefully  

**Congratulations!** 🎬 Your AI Commander public stream is live!

---

**Ready to launch?**
```bash
npm run stream:launch
```

🎬 **Let the games begin!**
