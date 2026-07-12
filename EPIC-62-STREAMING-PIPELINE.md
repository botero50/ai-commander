# EPIC 62 — Streaming Data Pipeline for AI Trash Talk Broadcast

**Date:** 2026-07-11

**Status:** Implementation Guide

---

## Overview

This guide covers setting up a complete streaming data pipeline to broadcast:
1. **Trash Talk Messages** — Ollama-generated contextual taunts
2. **Game Data** — Real-time unit counts, resources, positions
3. **Important Metrics** — Win conditions, strategy indicators, match progression

---

## Architecture: Stream Sources & Sinks

```
Arena Loop (run-arena-loop.ts)
  │
  ├─→ Game State (WorldState)
  │     └─→ BroadcastState (view layer)
  │           └─→ HTTP /api/broadcast/state
  │
  ├─→ Trash Talk Generator
  │     └─→ BroadcastMessage (chat type)
  │           └─→ WebSocket /ws/broadcast
  │
  ├─→ Unit/Resource Tracking
  │     └─→ Broadcast Player Stats
  │           └─→ HTTP /api/broadcast/players
  │           └─→ SSE /api/events/stream
  │
  └─→ Match Metrics
        └─→ Stream Analytics
              └─→ HTTP /api/analytics/match
```

---

## Step 1: Enable WebSocket Server

The broadcast server exists but needs to be wired into the arena loop.

### File: `packages/zeroad-adapter/src/tournament/broadcast-server.ts`

**Current State:** Server has WebSocket infrastructure but isn't connected to arena.

**What to Add:**

```typescript
// In arena loop initialization
import { BroadcastServer } from './tournament/broadcast-server.js';

// Create server (once at startup)
const broadcastServer = new BroadcastServer({
  port: 8765,  // WebSocket port
  maxConnections: 100,
  heartbeatInterval: 1000,  // 1 second between updates
  messageBufferSize: 5000,
  enableCompression: true,
});

broadcastServer.start();
```

**Key Ports:**
- `8765` — WebSocket (live data streaming)
- `8080` — HTTP REST API (query data)

---

## Step 2: Stream Trash Talk Messages

Trash talk generates periodically. Each message needs to be broadcast to connected clients.

### Integration Point: `run-arena-loop.ts` (around line 520)

**Current Flow:**
```typescript
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);
  // → Message is logged but NOT broadcasted
}
```

**New Flow:**
```typescript
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);
  
  // ✅ NEW: Broadcast to all connected clients
  broadcastServer.broadcastMessage({
    type: 'chat',
    payload: {
      speaker: trashTalk.speaker,
      message: trashTalk.message,
      tick: tick,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Client Receives (WebSocket):**
```json
{
  "type": "chat",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "speaker": "player1",
    "message": "Your economy is crumbling!",
    "tick": 5200,
    "timestamp": "2026-07-11T14:32:10.123Z"
  }
}
```

---

## Step 3: Stream Game Data (Units, Resources, Positions)

Sample broadcast state every N ticks and push to connected clients.

### Integration Point: `run-arena-loop.ts` (around line 720)

**Current Code (exists but not streamed):**
```typescript
if (tick % BROADCAST_SAMPLE_INTERVAL === 0) {
  const broadcastState = BroadcastState.buildState(
    matchId,
    worldState,
    gameState,
    brainP1,
    brainP2,
    map,
    tick
  );
  // → Only logged, not sent to clients
}
```

**New Code (with streaming):**
```typescript
if (tick % BROADCAST_SAMPLE_INTERVAL === 0) {
  const broadcastState = BroadcastState.buildState(
    matchId,
    worldState,
    gameState,
    brainP1,
    brainP2,
    map,
    tick
  );
  
  logger.info('📺 BROADCAST STATE SAMPLE', { broadcastState });

  // ✅ NEW: Send to all clients
  broadcastServer.broadcastMessage({
    type: 'state_update',
    payload: {
      matchId: matchId,
      tick: tick,
      timestamp: new Date().toISOString(),
      
      // Player stats
      players: [
        {
          id: 1,
          name: broadcastState.players[0].name,
          model: broadcastState.players[0].model,
          units: broadcastState.players[0].units,
          buildings: broadcastState.players[0].buildings,
          population: broadcastState.players[0].population,
          resources: broadcastState.players[0].resources,
          militaryValue: broadcastState.players[0].militaryValue,
        },
        {
          id: 2,
          name: broadcastState.players[1].name,
          model: broadcastState.players[1].model,
          units: broadcastState.players[1].units,
          buildings: broadcastState.players[1].buildings,
          population: broadcastState.players[1].population,
          resources: broadcastState.players[1].resources,
          militaryValue: broadcastState.players[1].militaryValue,
        },
      ],
    },
  });
}
```

**Client Receives (WebSocket, every 500 ticks ~every 30s at normal speed):**
```json
{
  "type": "state_update",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "matchId": "match-20260711-001",
    "tick": 5200,
    "players": [
      {
        "id": 1,
        "name": "Ollama AI",
        "model": "tinyllama:latest",
        "units": 22,
        "buildings": 8,
        "population": 45,
        "resources": { "wood": 580, "stone": 420, "food": 650, "metal": 120 },
        "militaryValue": 450
      },
      {
        "id": 2,
        "name": "Ollama AI",
        "model": "mistral:latest",
        "units": 15,
        "buildings": 6,
        "population": 32,
        "resources": { "wood": 420, "stone": 310, "food": 480, "metal": 80 },
        "militaryValue": 280
      }
    ]
  }
}
```

---

## Step 4: Stream Important Metrics

Key match progression indicators that viewers/broadcasters care about.

### New Stream Events (every 100 ticks ~every 6s):

**File:** Add to `run-arena-loop.ts`

```typescript
// Track important metrics
const metricsEmitter = new EventEmitter();

// Every 100 ticks, send metric update
if (tick % 100 === 0 && tick > 0) {
  const p1Units = units.filter(u => u.owner === '1').length;
  const p2Units = units.filter(u => u.owner === '2').length;
  
  // Determine who's winning
  const p1Resources = broadcastState.players[0].resources;
  const p2Resources = broadcastState.players[1].resources;
  
  const p1Total = Object.values(p1Resources).reduce((a, b) => a + b, 0);
  const p2Total = Object.values(p2Resources).reduce((a, b) => a + b, 0);
  
  // ✅ NEW: Send metrics
  broadcastServer.broadcastMessage({
    type: 'event',
    payload: {
      eventType: 'metrics_update',
      tick: tick,
      metrics: {
        player1: {
          unitCount: p1Units,
          totalResources: p1Total,
          economyValue: p1Resources.wood + p1Resources.stone + p1Resources.food,
          militaryValue: broadcastState.players[0].militaryValue,
          trend: calculateTrend(p1Prev, p1Units), // 'up', 'down', 'stable'
        },
        player2: {
          unitCount: p2Units,
          totalResources: p2Total,
          economyValue: p2Resources.wood + p2Resources.stone + p2Resources.food,
          militaryValue: broadcastState.players[1].militaryValue,
          trend: calculateTrend(p2Prev, p2Units),
        },
        gameProgress: {
          elapsedSeconds: tick / 30, // Assuming 30 ticks/second
          estimatedTimeRemaining: (maxTicks - tick) / 30,
          winner: p1Units > p2Units ? 'player1' : 'player2', // provisional
        },
      },
    },
  });
  
  p1Prev = p1Units;
  p2Prev = p2Units;
}
```

**Client Receives (WebSocket, every 100 ticks):**
```json
{
  "type": "event",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "eventType": "metrics_update",
    "tick": 5200,
    "metrics": {
      "player1": {
        "unitCount": 22,
        "totalResources": 1770,
        "economyValue": 1650,
        "militaryValue": 450,
        "trend": "up"
      },
      "player2": {
        "unitCount": 15,
        "totalResources": 1290,
        "economyValue": 1210,
        "militaryValue": 280,
        "trend": "stable"
      },
      "gameProgress": {
        "elapsedSeconds": 173,
        "estimatedTimeRemaining": 427,
        "winner": "player1"
      }
    }
  }
}
```

---

## Step 5: HTTP REST API Endpoints

For non-real-time queries or dashboard access.

### File: `packages/zeroad-adapter/src/web/express-integration.ts`

Add these endpoints:

```typescript
// GET /api/broadcast/state - Current game state
app.get('/api/broadcast/state', (req, res) => {
  const lastBroadcastState = broadcastServer.getLastState();
  res.json(lastBroadcastState);
});

// GET /api/broadcast/players - Player stats only
app.get('/api/broadcast/players', (req, res) => {
  const state = broadcastServer.getLastState();
  res.json(state.match.players);
});

// GET /api/match/metrics - Current match metrics
app.get('/api/match/metrics', (req, res) => {
  const state = broadcastServer.getLastState();
  res.json({
    matchId: state.match.matchId,
    tick: state.match.currentTick,
    players: state.match.players.map(p => ({
      id: p.id,
      name: p.name,
      units: p.units,
      resources: p.resources,
      militaryValue: p.militaryValue,
    })),
  });
});

// GET /api/broadcast/chat - Last N trash talk messages
app.get('/api/broadcast/chat', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const messages = broadcastServer.getLastMessages('chat', limit);
  res.json(messages);
});

// WebSocket: /ws/broadcast
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8765 });

wss.on('connection', (ws) => {
  const clientId = `client-${Date.now()}`;
  broadcastServer.registerClient(clientId, 'viewer');
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    broadcastServer.queueMessage(message);
  });
  
  ws.on('close', () => {
    broadcastServer.disconnectClient(clientId);
  });
});
```

---

## Step 6: Client-Side Integration (Web UI)

### File: `apps/web/src/hooks/useBroadcastStream.ts`

```typescript
import { useEffect, useState, useCallback } from 'react';

interface StreamMessage {
  type: 'state_update' | 'chat' | 'event' | 'heartbeat';
  timestamp: string;
  payload: any;
}

export const useBroadcastStream = () => {
  const [connected, setConnected] = useState(false);
  const [trashTalk, setTrashTalk] = useState<any[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8765');

    ws.onopen = () => {
      console.log('Connected to broadcast stream');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message: StreamMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'chat':
          setTrashTalk(prev => [...prev.slice(-10), message.payload]);
          break;
        case 'state_update':
          setGameState(message.payload);
          break;
        case 'event':
          if (message.payload.eventType === 'metrics_update') {
            setMetrics(message.payload.metrics);
          }
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => ws.close();
  }, []);

  return {
    connected,
    trashTalk,
    gameState,
    metrics,
  };
};
```

### Usage in React Component:

```typescript
export const BroadcastDashboard = () => {
  const { connected, trashTalk, gameState, metrics } = useBroadcastStream();

  return (
    <div className="broadcast-dashboard">
      {/* Connection Status */}
      <div className="status">
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Trash Talk Feed */}
      <div className="trash-talk-feed">
        <h3>Trash Talk</h3>
        {trashTalk.map((msg, i) => (
          <div key={i} className="trash-talk-msg">
            <strong>{msg.speaker}:</strong> {msg.message}
          </div>
        ))}
      </div>

      {/* Game State */}
      {gameState && (
        <div className="game-state">
          <h3>Game State (Tick {gameState.tick})</h3>
          {gameState.players.map((p: any) => (
            <div key={p.id} className="player-stats">
              <h4>{p.name}</h4>
              <p>Units: {p.units}</p>
              <p>Resources: {Object.entries(p.resources)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="metrics">
          <h3>Match Metrics</h3>
          <p>Player 1: {metrics.player1.unitCount} units (trend: {metrics.player1.trend})</p>
          <p>Player 2: {metrics.player2.unitCount} units (trend: {metrics.player2.trend})</p>
        </div>
      )}
    </div>
  );
};
```

---

## Implementation Checklist

### Phase 1: Core Streaming (Days 1-2)

- [ ] Enable BroadcastServer in arena loop
  - [ ] Initialize server on startup
  - [ ] Add port configuration
  - [ ] Handle server shutdown cleanly

- [ ] Stream trash talk messages
  - [ ] Integrate TrashTalkGenerator output
  - [ ] Send via broadcastServer.broadcastMessage()
  - [ ] Test message format on WebSocket

- [ ] Stream game state
  - [ ] Wire BroadcastState to streaming
  - [ ] Sample every 500 ticks
  - [ ] Include unit/resource data

### Phase 2: Metrics & Events (Days 2-3)

- [ ] Add metrics collection
  - [ ] Track unit count trends
  - [ ] Calculate economic value
  - [ ] Estimate time remaining

- [ ] Emit metric events every 100 ticks
  - [ ] Format as JSON event messages
  - [ ] Calculate trend indicators

### Phase 3: HTTP API (Days 3-4)

- [ ] Expose REST endpoints
  - [ ] `/api/broadcast/state`
  - [ ] `/api/broadcast/players`
  - [ ] `/api/match/metrics`
  - [ ] `/api/broadcast/chat`

- [ ] Add WebSocket connection management
  - [ ] Register/disconnect clients
  - [ ] Queue and deliver messages
  - [ ] Handle connection errors

### Phase 4: Client Integration (Days 4-5)

- [ ] Create useBroadcastStream hook
  - [ ] Connect to WebSocket
  - [ ] Parse incoming messages
  - [ ] Update state appropriately

- [ ] Build BroadcastDashboard component
  - [ ] Display trash talk feed
  - [ ] Show game state metrics
  - [ ] Visualize unit/resource trends

### Phase 5: Testing & Documentation (Days 5-6)

- [ ] Run integration tests
  - [ ] Start arena loop with 2 Ollama players
  - [ ] Verify WebSocket messages on client
  - [ ] Confirm all data types flowing

- [ ] Create broadcaster guide
  - [ ] How to connect
  - [ ] Message format reference
  - [ ] Troubleshooting guide

---

## Testing: Verify Streaming

### Command 1: Start Arena with Streaming

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Expected logs:
```
[info] BroadcastServer starting on port 8765
[info] Ollama brain P1 initialized (tinyllama:latest)
[info] Ollama brain P2 initialized (mistral:latest)
[info] 🗣️ player1: Your economy is crumbling!
[info] 📺 BROADCAST STATE SAMPLE { ... }
```

### Command 2: Connect WebSocket Client (Terminal 2)

```bash
# Windows PowerShell
$ws = New-Object Net.WebSockets.ClientWebSocket
$ct = New-CancellationTokenSource(5000).Token
$ws.ConnectAsync('ws://localhost:8765', $ct).Wait()
Write-Host "Connected"

# Listen for messages
while ($ws.State -eq 'Open') {
  $buffer = New-Object Byte[] 1024
  $received = $ws.ReceiveAsync($buffer, $ct).Result
  $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count)
  Write-Host "Received: $message"
}
```

### Command 3: Query HTTP API (Terminal 3)

```bash
# Get current game state
curl http://localhost:8080/api/broadcast/state | jq

# Get player stats
curl http://localhost:8080/api/broadcast/players | jq

# Get match metrics
curl http://localhost:8080/api/match/metrics | jq

# Get trash talk feed
curl http://localhost:8080/api/broadcast/chat | jq
```

---

## Stream Data Format Reference

### Message Types

#### 1. **Chat Message** (Trash Talk)
```json
{
  "type": "chat",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "speaker": "player1",
    "message": "Your economy is crumbling!",
    "tick": 5200
  }
}
```

#### 2. **State Update** (Game Data)
```json
{
  "type": "state_update",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "matchId": "match-20260711-001",
    "tick": 5200,
    "players": [
      {
        "id": 1,
        "name": "Ollama AI",
        "model": "tinyllama:latest",
        "units": 22,
        "buildings": 8,
        "population": 45,
        "resources": {
          "wood": 580,
          "stone": 420,
          "food": 650,
          "metal": 120
        },
        "militaryValue": 450
      }
    ]
  }
}
```

#### 3. **Event** (Metrics Update)
```json
{
  "type": "event",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "eventType": "metrics_update",
    "tick": 5200,
    "metrics": {
      "player1": {
        "unitCount": 22,
        "totalResources": 1770,
        "economyValue": 1650,
        "militaryValue": 450,
        "trend": "up"
      },
      "player2": {
        "unitCount": 15,
        "totalResources": 1290,
        "economyValue": 1210,
        "militaryValue": 280,
        "trend": "stable"
      },
      "gameProgress": {
        "elapsedSeconds": 173,
        "estimatedTimeRemaining": 427,
        "winner": "player1"
      }
    }
  }
}
```

#### 4. **Heartbeat** (Connection Keep-Alive)
```json
{
  "type": "heartbeat",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "connectedClients": 3,
    "messagesPerSecond": 2.5
  }
}
```

---

## Performance Considerations

### Message Frequency

| Data Type | Frequency | Bytes/Msg | Total/Min |
|-----------|-----------|-----------|-----------|
| Trash Talk | Every 500 ticks | ~200 | ~50 KB |
| State Update | Every 500 ticks | ~400 | ~100 KB |
| Metrics | Every 100 ticks | ~300 | ~150 KB |
| Heartbeat | Every 5s | ~100 | ~1.2 MB |
| **Total** | — | — | **~2.5 MB/min** |

### Optimization Tips

1. **Compress messages** — Use gzip on WebSocket
2. **Sample less frequently** — Reduce BROADCAST_SAMPLE_INTERVAL if needed
3. **Client-side filtering** — Only update UI for changes
4. **Message batching** — Group multiple updates into single message

---

## Troubleshooting

### Issue: WebSocket Not Connecting
```
Error: ECONNREFUSED 127.0.0.1:8765
```
**Solution:**
- Check arena loop is running
- Verify port 8765 is not in use
- Check firewall allows local connections

### Issue: No Trash Talk Messages
```
Trash talk captured - 0 messages
```
**Solution:**
- Check Ollama is running: `ollama serve`
- Check model exists: `ollama list`
- Increase TRASH_TALK_FREQUENCY in arena loop

### Issue: Game State All Zeros
```
resources: { wood: 0, stone: 0, food: 0, metal: 0 }
```
**Solution:**
- Game might be in initialization phase
- Check RL Interface is returning proper data
- Wait first 100 ticks for resources to accumulate

---

## Summary

**Steps to Stream Trash Talk, Game Data & Metrics:**

1. ✅ Enable BroadcastServer in arena loop
2. ✅ Wire TrashTalkGenerator output to broadcastServer.broadcastMessage()
3. ✅ Send BroadcastState every 500 ticks via WebSocket
4. ✅ Calculate and emit metrics every 100 ticks
5. ✅ Expose HTTP REST API endpoints
6. ✅ Create WebSocket client hooks in React
7. ✅ Build broadcast dashboard UI
8. ✅ Test end-to-end with Ollama vs Ollama matches

**Expected Outcome:**
- Real-time trash talk feed on client
- Live game state updates (units, resources)
- Metric trending and victory prediction
- Production-ready broadcast experience

**Next Phase:** Integrate with OBS for streaming to Twitch/YouTube
