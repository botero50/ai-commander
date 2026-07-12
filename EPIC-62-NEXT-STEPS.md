# EPIC 62 — Next Steps: Implementing the Streaming Pipeline

**Date:** 2026-07-11  
**Status:** Documentation Complete ✅ → Ready for Implementation

---

## What's Been Documented

You now have 4 comprehensive guides:

1. **EPIC-62-STREAMING-PIPELINE.md** — Complete 6-step implementation guide
2. **HOW-TO-VERIFY-OLLAMA-CONTROL.md** — How to confirm both Ollama players
3. **EPIC-62-PURE-OLLAMA-VS-OLLAMA.md** — Architecture (sync dual-brain decisions)
4. **check-ollama-control.bat/sh** — Diagnostic scripts

---

## Implementation Timeline: 6 Days

### **Day 1-2: Phase 1 — Core Streaming** 
**Goal:** Get trash talk and game data flowing to WebSocket clients

**Tasks:**
1. Initialize `BroadcastServer` in `run-arena-loop.ts` on port 8765
2. Wire `TrashTalkGenerator` output to `broadcastServer.broadcastMessage()`
3. Wire `BroadcastState` samples to streaming (every 500 ticks)
4. Test WebSocket client connects and receives messages

**Expected Result:** Real-time trash talk + game data on any WebSocket client

---

### **Day 2-3: Phase 2 — Metrics & Events**
**Goal:** Stream metric indicators (unit trends, economy, military value)

**Tasks:**
1. Add metrics calculation (unit counts, resource totals, trends)
2. Emit metric events every 100 ticks
3. Calculate win conditions (economic advantage, military lead)
4. Estimate match duration remaining

**Expected Result:** Client receives metrics every ~6 seconds with trend indicators

---

### **Day 3-4: Phase 3 — HTTP REST API**
**Goal:** Add query endpoints for dashboards

**Tasks:**
1. Add `/api/broadcast/state` endpoint
2. Add `/api/broadcast/players` endpoint  
3. Add `/api/match/metrics` endpoint
4. Add `/api/broadcast/chat` endpoint (trash talk history)

**Expected Result:** Dashboard can query current state via HTTP

---

### **Day 4-5: Phase 4 — Client Integration**
**Goal:** Build React components for live broadcast dashboard

**Tasks:**
1. Create `useBroadcastStream` hook
   - Connect to WebSocket
   - Parse message types (chat, state_update, event)
   - Update React state
2. Build `BroadcastDashboard` component
   - Display trash talk feed
   - Show player stats (units, resources)
   - Visualize metric trends
3. Add styles and animations

**Expected Result:** Live dashboard showing all broadcast data

---

### **Day 5-6: Phase 5 — Testing & Documentation**
**Goal:** Verify end-to-end and create broadcaster guide

**Tasks:**
1. Run arena loop with Ollama vs Ollama
2. Connect WebSocket client and verify all messages flow
3. Test HTTP API endpoints
4. Create broadcaster guide (how to connect, what data to expect)
5. Create troubleshooting guide

**Expected Result:** Production-ready streaming experience

---

## What to Do Now

### **Option A: I Implement Everything** (Recommended for speed)
I can implement all 5 phases in one session. You'll have:
- ✅ BroadcastServer wired to arena loop
- ✅ All messages flowing to WebSocket
- ✅ HTTP REST API endpoints
- ✅ React components for broadcast dashboard
- ✅ Full end-to-end testing

**Estimated Time:** 2-3 hours  
**Effort:** Complete implementation ready to deploy

### **Option B: You Implement + I Review**
You follow the EPIC-62-STREAMING-PIPELINE.md guide step-by-step.

**Estimated Time:** 1-2 days  
**Effort:** Learning + hands-on implementation

### **Option C: I Implement in Phases**
We break it into 5 pull requests, one per day.

**Estimated Time:** 5 days  
**Effort:** Reviewable, testable increments

---

## Before Implementation

### Verify Your Setup

```bash
# 1. Check Ollama is running
ollama serve

# 2. Check models exist
ollama list
# Should see: tinyllama:latest, mistral:latest, etc.

# 3. Check ports are available
netstat -an | grep LISTEN | grep -E "8765|8080"
# 8765 = WebSocket, 8080 = HTTP API

# 4. Test Ollama API
curl http://localhost:11434/api/tags
```

### Code Structure

The implementation will touch these files:

```
packages/zeroad-adapter/src/
  ├── arena/
  │   └── run-arena-loop.ts          ← Wire BroadcastServer + emit messages
  ├── tournament/
  │   └── broadcast-server.ts        ← Already exists, just configure
  ├── match/
  │   └── trash-talk-generator.ts   ← Already exists, already working
  ├── broadcast/
  │   └── broadcast-state.ts         ← Already exists, just stream samples
  └── web/
      └── express-integration.ts     ← Add HTTP endpoints

apps/web/src/
  ├── hooks/
  │   └── useBroadcastStream.ts      ← NEW: WebSocket hook
  └── components/
      └── BroadcastDashboard/        ← NEW: Dashboard component
          ├── BroadcastDashboard.tsx
          ├── TrashTalkFeed.tsx
          ├── PlayerStats.tsx
          ├── MetricsDisplay.tsx
          └── BroadcastDashboard.module.css
```

---

## Key Integration Points

### 1. **Arena Loop** (run-arena-loop.ts)

**Current:**
```typescript
const broadcastState = BroadcastState.buildState(...);
logger.info('📺 BROADCAST STATE SAMPLE', { broadcastState });
// Message goes to logs only
```

**After:**
```typescript
const broadcastState = BroadcastState.buildState(...);
logger.info('📺 BROADCAST STATE SAMPLE', { broadcastState });

// NEW: Send to all WebSocket clients
broadcastServer.broadcastMessage({
  type: 'state_update',
  payload: { /* data */ }
});
```

### 2. **Trash Talk** (run-arena-loop.ts)

**Current:**
```typescript
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);
  // Message goes to logs only
}
```

**After:**
```typescript
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);

  // NEW: Broadcast to clients
  broadcastServer.broadcastMessage({
    type: 'chat',
    payload: trashTalk
  });
}
```

### 3. **Metrics** (run-arena-loop.ts)

**New:**
```typescript
// Every 100 ticks, calculate and emit metrics
if (tick % 100 === 0) {
  const p1Units = units.filter(u => u.owner === '1').length;
  const p2Units = units.filter(u => u.owner === '2').length;
  
  broadcastServer.broadcastMessage({
    type: 'event',
    payload: {
      eventType: 'metrics_update',
      metrics: { /* calculation */ }
    }
  });
}
```

---

## Success Criteria

After implementation:

- ✅ WebSocket connects on port 8765
- ✅ Trash talk messages appear in real-time (~every 30s)
- ✅ Game state updates appear (~every 30s)
- ✅ Metrics update every ~6s
- ✅ HTTP API endpoints return valid JSON
- ✅ React dashboard displays all data
- ✅ Connection status indicator shows "Connected"
- ✅ Dashboard works during live Ollama vs Ollama match

---

## What Happens After

Once streaming is working:

1. **OBS Integration** — Connect OBS to WebSocket, overlay trash talk + metrics on stream
2. **Twitch/YouTube** — Stream broadcasts with real-time AI banter
3. **Esports Dashboard** — Public-facing dashboard showing tournament progress
4. **Mobile Spectating** — Mobile app to watch matches on phone

---

## Questions?

**Q: Will this slow down the game?**  
A: No. Streaming happens asynchronously. Game ticks continue independently.

**Q: What if Ollama is unavailable?**  
A: Trash talk falls back to hardcoded taunts. Game data still streams.

**Q: Can I stream to Twitch now?**  
A: Not yet. Phase 1 gets data flowing. OBS integration comes next.

**Q: How much bandwidth?**  
A: ~2.5 MB/minute (trash talk + game data + metrics). Compressible to ~500 KB/min with gzip.

---

## Recommendation

Implement **Option A: I do all 5 phases now** because:
1. ✅ You already have verified Ollama vs Ollama working
2. ✅ Documentation is complete and detailed
3. ✅ All code patterns are already in the codebase
4. ✅ Integration points are well-defined
5. ✅ Full implementation takes 2-3 hours max

**Then:** Start streaming within hours, not days.

Let me know if you want to proceed! 🚀
