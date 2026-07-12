# EPIC 62 — Streaming Pipeline: EXACT Step-by-Step Instructions

**Status:** Copy-paste ready implementation  
**Time per step:** 5-10 minutes  
**Total time:** 1-2 hours

---

## STEP 1: Import BroadcastServer

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

**Location:** Line 40 (after other imports)

**FIND THIS:**
```typescript
import { BroadcastState, type ArenaMatchContext } from '../broadcast/broadcast-state.js';
```

**ADD THIS AFTER:**
```typescript
import { BroadcastServer } from '../tournament/broadcast-server.js';
```

**Full context (lines 30-42):**
```typescript
import { Logger } from '../config/logger.js';
import { MapDiscovery } from '../match/map-discovery.js';
import { MatchRotation } from '../match/match-rotation.js';
import { CivilizationRotation } from '../match/civilization-rotation.js';
import { TrashTalkGenerator, type GameContext } from '../match/trash-talk-generator.js';
import { EventBasedCamera } from '../camera/event-based-camera.js';
import { BroadcastState, type ArenaMatchContext } from '../broadcast/broadcast-state.js';
import { BroadcastServer } from '../tournament/broadcast-server.js';  // ← ADD THIS
```

---

## STEP 2: Initialize BroadcastServer (in runMatch function)

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

**Location:** Line ~370 (after cameraBroadcast.start())

**FIND THIS:**
```typescript
    // Initialize camera broadcast server for external tools
    const cameraBroadcast = new CameraBroadcastServer(logger, 3001);
    await cameraBroadcast.start();

    // Initialize Ollama brains for BOTH players
```

**ADD THIS BETWEEN:**
```typescript
    // Initialize camera broadcast server for external tools
    const cameraBroadcast = new CameraBroadcastServer(logger, 3001);
    await cameraBroadcast.start();

    // ✅ NEW: Initialize broadcast server for streaming trash talk + game data
    const broadcastServer = new BroadcastServer({
      port: 8765,
      maxConnections: 100,
      heartbeatInterval: 1000,
      messageBufferSize: 5000,
      enableCompression: true,
    });
    broadcastServer.start();
    logger.info(`🎬 Broadcast server started on port 8765`);

    // Initialize Ollama brains for BOTH players
```

---

## STEP 3: Stream Trash Talk Messages

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

**Location:** Find where trash talk is generated (around line 520)

**SEARCH FOR:**
```
const trashTalk = await trashTalkGenerator.generateTrashTalk(gameContext);
if (trashTalk) {
  logger.info
```

**FIND THIS CODE:**
```typescript
        // Generate trash talk
        const trashTalkContext: GameContext = {
          player1: {
            name: brainP1 ? 'Ollama AI' : 'Petra AI',
            resources: worldState.players[0]?.resources || { food: 0, wood: 0, stone: 0, metal: 0 },
            unitCount: worldState.players[0]?.units.length || 0,
            buildingCount: worldState.players[0]?.buildings.length || 0,
          },
          player2: {
            name: brainP2 ? 'Ollama AI' : 'Petra AI',
            resources: worldState.players[1]?.resources || { food: 0, wood: 0, stone: 0, metal: 0 },
            unitCount: worldState.players[1]?.units.length || 0,
            buildingCount: worldState.players[1]?.buildings.length || 0,
          },
          tick,
        };

        const trashTalk = await trashTalkGenerator.generateTrashTalk(trashTalkContext);
        if (trashTalk) {
          logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);
        }
```

**REPLACE WITH THIS:**
```typescript
        // Generate trash talk
        const trashTalkContext: GameContext = {
          player1: {
            name: brainP1 ? 'Ollama AI' : 'Petra AI',
            resources: worldState.players[0]?.resources || { food: 0, wood: 0, stone: 0, metal: 0 },
            unitCount: worldState.players[0]?.units.length || 0,
            buildingCount: worldState.players[0]?.buildings.length || 0,
          },
          player2: {
            name: brainP2 ? 'Ollama AI' : 'Petra AI',
            resources: worldState.players[1]?.resources || { food: 0, wood: 0, stone: 0, metal: 0 },
            unitCount: worldState.players[1]?.units.length || 0,
            buildingCount: worldState.players[1]?.buildings.length || 0,
          },
          tick,
        };

        const trashTalk = await trashTalkGenerator.generateTrashTalk(trashTalkContext);
        if (trashTalk) {
          logger.info(`🗣️  ${trashTalk.speaker}: ${trashTalk.message}`);
          
          // ✅ NEW: Broadcast trash talk to WebSocket clients
          broadcastServer.broadcastMessage({
            type: 'chat',
            timestamp: new Date().toISOString(),
            payload: {
              speaker: trashTalk.speaker,
              message: trashTalk.message,
              tick: tick,
              matchId: matchId,
            },
          });
        }
```

---

## STEP 4: Stream Game Data (BroadcastState)

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

**Location:** Find broadcast state sampling (around line 720)

**SEARCH FOR:**
```
BROADCAST_SAMPLE_INTERVAL
const broadcastState = BroadcastState.buildState
logger.info('📺 BROADCAST STATE SAMPLE'
```

**FIND THIS CODE:**
```typescript
      if (tick % BROADCAST_SAMPLE_INTERVAL === 0 && tick > 0) {
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
      }
```

**REPLACE WITH THIS:**
```typescript
      if (tick % BROADCAST_SAMPLE_INTERVAL === 0 && tick > 0) {
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
        
        // ✅ NEW: Broadcast game state to WebSocket clients
        broadcastServer.broadcastMessage({
          type: 'state_update',
          timestamp: new Date().toISOString(),
          payload: {
            matchId: matchId,
            tick: tick,
            players: [
              {
                id: 1,
                name: broadcastState.players[0].name,
                model: broadcastState.players[0].model || 'unknown',
                units: broadcastState.players[0].units,
                buildings: broadcastState.players[0].buildings,
                population: broadcastState.players[0].population,
                resources: broadcastState.players[0].resources,
                militaryValue: broadcastState.players[0].militaryValue,
              },
              {
                id: 2,
                name: broadcastState.players[1].name,
                model: broadcastState.players[1].model || 'unknown',
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

---

## STEP 5: Stream Metrics (Trends, Economy, Winner)

### File: `packages/zeroad-adapter/src/arena/run-arena-loop.ts`

**Location:** Add after the broadcast state code (around line 750)

**FIND THIS LOCATION:**
```typescript
      if (tick % BROADCAST_SAMPLE_INTERVAL === 0 && tick > 0) {
        // ... broadcast state code ...
      }

      // Process camera events ← Find this comment or similar
```

**ADD THIS BEFORE "Process camera events":**
```typescript
      // ✅ NEW: Calculate and emit metrics every 100 ticks
      if (tick % 100 === 0 && tick > 0) {
        const units = worldState.players.flatMap(p => p.units || []);
        const p1Units = units.filter(u => u.owner === '1').length;
        const p2Units = units.filter(u => u.owner === '2').length;
        
        // Calculate trends (simple: compare to previous reading)
        // In production, you'd track historical data
        const p1Trend = p1Units > (lastP1Count || 0) ? 'up' : p1Units < (lastP1Count || 0) ? 'down' : 'stable';
        const p2Trend = p2Units > (lastP2Count || 0) ? 'up' : p2Units < (lastP2Count || 0) ? 'down' : 'stable';
        
        lastP1Count = p1Units;
        lastP2Count = p2Units;
        
        // Get current broadcast state for resources
        const broadcastState = BroadcastState.buildState(
          matchId,
          worldState,
          gameState,
          brainP1,
          brainP2,
          map,
          tick
        );
        
        const p1Resources = broadcastState.players[0].resources;
        const p2Resources = broadcastState.players[1].resources;
        const p1Total = Object.values(p1Resources).reduce((a, b) => a + b, 0);
        const p2Total = Object.values(p2Resources).reduce((a, b) => a + b, 0);
        
        // Broadcast metrics
        broadcastServer.broadcastMessage({
          type: 'event',
          timestamp: new Date().toISOString(),
          payload: {
            eventType: 'metrics_update',
            tick: tick,
            matchId: matchId,
            metrics: {
              player1: {
                unitCount: p1Units,
                totalResources: p1Total,
                economyValue: p1Resources.wood + p1Resources.stone + p1Resources.food,
                militaryValue: broadcastState.players[0].militaryValue,
                trend: p1Trend,
              },
              player2: {
                unitCount: p2Units,
                totalResources: p2Total,
                economyValue: p2Resources.wood + p2Resources.stone + p2Resources.food,
                militaryValue: broadcastState.players[1].militaryValue,
                trend: p2Trend,
              },
              gameProgress: {
                elapsedSeconds: tick / 30, // Assuming 30 ticks/second
                estimatedTimeRemaining: Math.max(0, (maxTicks - tick) / 30),
                provisionalWinner: p1Units > p2Units ? 'player1' : p2Units > p1Units ? 'player2' : 'tied',
              },
            },
          },
        });
      }
```

**ADD THESE VARIABLES AT THE TOP OF runMatch() function (after `let brainP2` declaration):**
```typescript
    // ✅ NEW: Track unit counts for metrics trends
    let lastP1Count = 0;
    let lastP2Count = 0;
    const maxTicks = 30 * 60 * 10; // Estimate 10 minutes max (30 ticks/sec)
```

---

## STEP 6: Test the Streaming (Run the Arena Loop)

### Command to Run:

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

### What You Should See in Logs:

```
✓ Ollama brain P1 initialized (tinyllama:latest)
✓ Ollama brain P2 initialized (tinyllama:latest)
🎬 Broadcast server started on port 8765
[... game starting ...]
🗣️ player1: Your economy is crumbling!
📺 BROADCAST STATE SAMPLE
[... every 100 ticks ...]
```

---

## STEP 7: Verify WebSocket Connection

### In PowerShell (Terminal 2), while game is running:

```powershell
# Connect to WebSocket
$ws = New-Object Net.WebSockets.ClientWebSocket
$ct = New-CancellationTokenSource(5000).Token
$ws.ConnectAsync('ws://localhost:8765', $ct).Wait()

if ($ws.State -eq 'Open') {
  Write-Host "✅ Connected to broadcast stream!"
  
  # Listen for 10 seconds
  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($stopwatch.ElapsedMilliseconds -lt 10000 -and $ws.State -eq 'Open') {
    $buffer = New-Object Byte[] 4096
    $task = $ws.ReceiveAsync($buffer, $ct)
    if ($task.Wait(1000)) {
      $received = $task.Result
      if ($received.Count -gt 0) {
        $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count)
        Write-Host "📨 Received: $(($message | ConvertFrom-Json).type)"
      }
    }
  }
  
  $ws.CloseAsync('Normal', 'Done', $ct).Wait()
} else {
  Write-Host "❌ Failed to connect"
}
```

### Expected Output:

```
✅ Connected to broadcast stream!
📨 Received: chat
📨 Received: state_update
📨 Received: event
📨 Received: chat
```

---

## STEP 8: Check What Data is Being Sent

### In PowerShell, run this to see full message content:

```powershell
$ws = New-Object Net.WebSockets.ClientWebSocket
$ct = New-CancellationTokenSource(10000).Token
$ws.ConnectAsync('ws://localhost:8765', $ct).Wait()

Write-Host "Listening for messages (10 seconds)..."

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
while ($stopwatch.ElapsedMilliseconds -lt 10000 -and $ws.State -eq 'Open') {
  $buffer = New-Object Byte[] 4096
  $task = $ws.ReceiveAsync($buffer, $ct)
  if ($task.Wait(500)) {
    $received = $task.Result
    if ($received.Count -gt 0) {
      $message = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $received.Count)
      $json = $message | ConvertFrom-Json
      Write-Host ""
      Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      Write-Host "Type: $($json.type)"
      Write-Host "Payload: $(($json.payload | ConvertTo-Json -Depth 3))"
      Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    }
  }
}

$ws.CloseAsync('Normal', 'Done', $ct).Wait()
```

### Expected Output Example:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: chat
Payload: {
  "speaker": "player1",
  "message": "Your economy is crumbling!",
  "tick": 5200,
  "matchId": "match-20260711-001"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: state_update
Payload: {
  "matchId": "match-20260711-001",
  "tick": 5500,
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Troubleshooting

### Problem: "BroadcastServer not found"
**Solution:** Make sure you added the import on line 40:
```typescript
import { BroadcastServer } from '../tournament/broadcast-server.js';
```

### Problem: "broadcastServer is not defined"
**Solution:** Make sure you initialized it in runMatch() function (around line 370):
```typescript
const broadcastServer = new BroadcastServer({ ... });
broadcastServer.start();
```

### Problem: WebSocket won't connect
**Solution:** 
1. Make sure game is running: `npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`
2. Check port 8765 is not in use: `netstat -an | grep 8765`
3. Try from Windows PowerShell (not bash)

### Problem: No messages coming through
**Solution:**
1. Check game is actually running (should see unit movements)
2. Check logs for "Broadcast server started on port 8765"
3. Make sure trash talk is being generated: grep for "🗣️" in logs
4. Wait 500+ ticks for first trash talk message

---

## Summary: What Was Added

✅ **Step 1:** Import BroadcastServer  
✅ **Step 2:** Initialize server on port 8765  
✅ **Step 3:** Send trash talk messages via WebSocket  
✅ **Step 4:** Send game state (units, resources) via WebSocket  
✅ **Step 5:** Send metrics (trends, economy) via WebSocket  
✅ **Step 6:** Test with arena loop  
✅ **Step 7:** Verify WebSocket connection  
✅ **Step 8:** View message content  

**Next Steps:**
1. Commit this code: `git add packages/zeroad-adapter/src/arena/run-arena-loop.ts && git commit -m "..."`
2. Run a test match and verify streaming works
3. Then build React dashboard to display the data (Phase 2)

---

## Quick Reference: Message Types

### Chat Message (Trash Talk)
```json
{
  "type": "chat",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "speaker": "player1",
    "message": "Your economy is crumbling!",
    "tick": 5200,
    "matchId": "match-001"
  }
}
```

### State Update (Game Data)
```json
{
  "type": "state_update",
  "timestamp": "2026-07-11T14:32:10.123Z",
  "payload": {
    "matchId": "match-001",
    "tick": 5500,
    "players": [
      {
        "id": 1,
        "name": "Ollama AI",
        "units": 22,
        "resources": { "wood": 580, "stone": 420 }
      }
    ]
  }
}
```

### Metrics Event
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
        "trend": "up",
        "totalResources": 1770
      }
    }
  }
}
```

---

Done! You now have a complete streaming pipeline. 🎉
