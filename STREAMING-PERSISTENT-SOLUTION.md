# EPIC 62: Persistent Streaming Solution (Multiple Matches)

**Problem:** WebSocket dies when game restarts after each match  
**Solution:** Use HTTP API with polling + file-based streaming  

---

## Architecture: Persistent Streaming

```
Arena Loop (Match 1, 2, 3, ...)
  │
  ├─→ Write streaming data to JSON file
  │     /tmp/streaming-data.json (updates every 100 ticks)
  │
  └─→ HTTP Server (port 8080)
        │
        ├─ GET /api/broadcast/current → Current match data
        ├─ GET /api/broadcast/chat → Latest trash talk messages
        ├─ GET /api/broadcast/metrics → Current metrics
        └─ GET /api/broadcast/history → All messages from session

OBS / Broadcaster Client
  │
  └─→ HTTP Poll (every 1-2 seconds)
        └─→ Get latest data from /api/broadcast/current
        └─→ Update text sources
```

**Key Advantage:** No WebSocket reconnection needed - HTTP polling is automatic and simple

---

## Step 1: Add HTTP Endpoints to Arena Loop

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

Add this at the top level (before runMatch function):

```typescript
// ✅ NEW (EPIC 62 - Persistent): In-memory streaming data cache
interface StreamingDataCache {
  currentMatch: {
    matchId: string;
    matchNumber: number;
    tick: number;
    players: Array<{
      id: number;
      name: string;
      model: string;
      units: number;
      resources: { wood: number; stone: number; food: number; metal: number };
      militaryValue: number;
    }>;
  } | null;
  recentTrashTalk: Array<{
    speaker: string;
    message: string;
    tick: number;
    timestamp: number;
  }>;
  recentMetrics: Array<{
    tick: number;
    timestamp: number;
    player1: { unitCount: number; trend: string; totalResources: number };
    player2: { unitCount: number; trend: string; totalResources: number };
  }>;
  matchHistory: Array<{
    matchNumber: number;
    winner: string;
    loser: string;
    duration: number;
  }>;
}

const streamingCache: StreamingDataCache = {
  currentMatch: null,
  recentTrashTalk: [],
  recentMetrics: [],
  matchHistory: [],
};

// Simple HTTP server for broadcasting
import * as http from 'http';

function startStreamingServer(): void {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/api/broadcast/current') {
      res.writeHead(200);
      res.end(JSON.stringify(streamingCache.currentMatch));
    } else if (req.url === '/api/broadcast/chat') {
      res.writeHead(200);
      res.end(JSON.stringify(streamingCache.recentTrashTalk.slice(-10)));
    } else if (req.url === '/api/broadcast/metrics') {
      res.writeHead(200);
      res.end(JSON.stringify(streamingCache.recentMetrics.slice(-5)));
    } else if (req.url === '/api/broadcast/history') {
      res.writeHead(200);
      res.end(JSON.stringify(streamingCache.matchHistory));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(8080, '127.0.0.1', () => {
    logger.info('📡 HTTP Streaming API started on port 8080');
  });
}

// Start server at app startup (before main loop)
startStreamingServer();
```

---

## Step 2: Update Streaming Data Cache

### In the runMatch function, update the cache whenever data changes:

**For trash talk:**
```typescript
// After trash talk is generated:
if (trashTalk) {
  streamingCache.recentTrashTalk.push({
    speaker: trashTalk.speaker,
    message: trashTalk.message,
    tick: tick,
    timestamp: Date.now(),
  });
  // Keep only last 50 messages
  if (streamingCache.recentTrashTalk.length > 50) {
    streamingCache.recentTrashTalk.shift();
  }
}
```

**For game state:**
```typescript
// Every 500 ticks when sampling broadcast state:
streamingCache.currentMatch = {
  matchId: `match-${matchNumber}`,
  matchNumber,
  tick,
  players: [
    {
      id: 1,
      name: currentBroadcastState.match.players[0].name,
      model: currentBroadcastState.match.players[0].provider || 'unknown',
      units: currentBroadcastState.match.players[0].units,
      resources: currentBroadcastState.match.players[0].resources,
      militaryValue: currentBroadcastState.match.players[0].militaryValue,
    },
    {
      id: 2,
      name: currentBroadcastState.match.players[1].name,
      model: currentBroadcastState.match.players[1].provider || 'unknown',
      units: currentBroadcastState.match.players[1].units,
      resources: currentBroadcastState.match.players[1].resources,
      militaryValue: currentBroadcastState.match.players[1].militaryValue,
    },
  ],
};
```

**For metrics:**
```typescript
// Every 100 ticks:
streamingCache.recentMetrics.push({
  tick,
  timestamp: Date.now(),
  player1: {
    unitCount: p1Units,
    trend: p1Trend,
    totalResources: p1Total,
  },
  player2: {
    unitCount: p2Units,
    trend: p2Trend,
    totalResources: p2Total,
  },
});
// Keep only last 100 metric samples
if (streamingCache.recentMetrics.length > 100) {
  streamingCache.recentMetrics.shift();
}
```

**When match ends:**
```typescript
// After match completes:
streamingCache.matchHistory.push({
  matchNumber,
  winner: matchWinner,
  loser: matchWinner === 'player1' ? 'player2' : 'player1',
  duration: (Date.now() - matchStartTime) / 1000,
});
streamingCache.currentMatch = null; // Clear current match
```

---

## Step 3: Create OBS Browser Source

In OBS, instead of using WebSocket:

1. **Add Browser Source**
   - Click **+** next to Sources
   - Select **Browser**
   - Name it: "Streaming Dashboard"
   - Width: 1280, Height: 720

2. **Create HTML file for OBS:**

Create: `packages/zeroad-adapter/src/broadcast/obs-dashboard.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EPIC 62 Streaming Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .metrics {
            font-size: 24px;
            font-weight: bold;
            padding: 10px;
            background: rgba(0, 100, 0, 0.3);
            border: 2px solid lime;
            margin-bottom: 20px;
        }
        .trash-talk {
            font-size: 28px;
            font-weight: bold;
            padding: 15px;
            background: rgba(100, 0, 0, 0.3);
            border: 2px solid red;
            margin-bottom: 20px;
            min-height: 80px;
            display: flex;
            align-items: center;
        }
        .history {
            font-size: 16px;
            max-height: 300px;
            overflow-y: auto;
            padding: 10px;
            background: rgba(0, 0, 100, 0.2);
            border: 1px solid blue;
        }
        .history-item {
            margin: 5px 0;
            padding: 5px;
            border-bottom: 1px solid rgba(100, 100, 255, 0.3);
        }
    </style>
</head>
<body>
    <div class="metrics" id="metrics">P1: 0 units | P2: 0 units</div>
    <div class="trash-talk" id="trash-talk">Waiting for trash talk...</div>
    <div class="history" id="history">Recent messages will appear here...</div>

    <script>
        const API_URL = 'http://localhost:8080';
        let lastTrashTalk = '';

        async function updateDashboard() {
            try {
                // Get current match data
                const current = await fetch(`${API_URL}/api/broadcast/current`).then(r => r.json());
                if (current && current.players) {
                    const p1 = current.players[0];
                    const p2 = current.players[1];
                    document.getElementById('metrics').textContent =
                        `P1 (${p1.name}): ${p1.units} units | P2 (${p2.name}): ${p2.units} units`;
                }

                // Get recent trash talk
                const chat = await fetch(`${API_URL}/api/broadcast/chat`).then(r => r.json());
                if (chat && chat.length > 0) {
                    const latest = chat[chat.length - 1];
                    if (latest.message !== lastTrashTalk) {
                        lastTrashTalk = latest.message;
                        document.getElementById('trash-talk').textContent =
                            `${latest.speaker === 'player1' ? '🔴' : '🔵'} ${latest.message}`;
                    }
                }

                // Get chat history
                const history = await fetch(`${API_URL}/api/broadcast/chat`).then(r => r.json());
                const historyHtml = history.map(msg =>
                    `<div class="history-item">${msg.speaker}: "${msg.message}"</div>`
                ).join('');
                document.getElementById('history').innerHTML = historyHtml || 'No messages yet...';

            } catch (error) {
                console.error('API error:', error);
            }
        }

        // Update every 1 second
        setInterval(updateDashboard, 1000);
        updateDashboard(); // Initial call
    </script>
</body>
</html>
```

3. **Set OBS Browser Source URL:**
   - URL: `file:///C:/Users/boter/ai-commander/packages/zeroad-adapter/src/broadcast/obs-dashboard.html`
   - Width: 1280
   - Height: 720
   - Refresh browser when scene becomes active: ✅ checked

---

## How It Works

```
Match 1 Running:
  Tick 100 → Update HTTP cache (metrics)
  Tick 500 → Update HTTP cache (trash talk + game state)
  Tick 1000 → Update HTTP cache (metrics)
  ...
  Match ends → Clear current match, add to history

Match 2 Starts:
  Tick 100 → Update HTTP cache (metrics)
  Tick 500 → Update HTTP cache (trash talk + game state)
  ...

OBS Browser Source (polling every 1 second):
  1. GET /api/broadcast/current → Show player units/resources
  2. GET /api/broadcast/chat → Show latest trash talk
  3. GET /api/broadcast/history → Show message history
  4. Update OBS text overlays automatically
  5. Connection never breaks (HTTP stateless)
```

---

## Testing

**Start arena loop:**
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 3
```

**Test HTTP API (in PowerShell):**
```powershell
# Get current match
curl http://localhost:8080/api/broadcast/current | ConvertFrom-Json

# Get trash talk history
curl http://localhost:8080/api/broadcast/chat | ConvertFrom-Json

# Get metrics
curl http://localhost:8080/api/broadcast/metrics | ConvertFrom-Json
```

**In OBS:**
- Add Browser Source
- Point to HTML file
- See live updates as match progresses
- Connection persists through match restarts ✅

---

## Advantages of HTTP Polling vs WebSocket

| Feature | WebSocket | HTTP Polling |
|---------|-----------|--------------|
| Connection persistence | ❌ Dies on restart | ✅ Stateless |
| Multiple matches | ❌ Reconnect needed | ✅ Works seamlessly |
| OBS integration | ❌ Requires plugin | ✅ Browser source (built-in) |
| Simplicity | ❌ Complex | ✅ Simple JSON APIs |
| Bandwidth | ✅ Lower | ⚠️ Higher |
| Latency | ✅ Real-time | ~1-2 seconds |

---

## Summary

✅ HTTP API survives game restarts  
✅ OBS Browser Source auto-updates every 1 second  
✅ Works across multiple matches seamlessly  
✅ No WebSocket reconnection needed  
✅ Simple curl commands for testing  

**This is the production-ready solution!**
