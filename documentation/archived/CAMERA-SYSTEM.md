# Camera System Documentation

## Overview

The AI Commander camera system automatically detects interesting game moments and provides camera recommendations for broadcast viewing. It combines real-time game state analysis with strategic interest detection to provide optimal camera positioning for spectators.

## Architecture

### 1. Automatic Camera Manager
**File:** `packages/zeroad-adapter/src/camera/automatic-camera-manager.ts`

- Monitors game state for interesting moments
- Subscribes to event feed for updates
- Calculates strategic camera positions based on game activity
- Triggers camera movements when significant events occur

**Activity Types Detected:**
- **Combat** (Score: 90) - Armies fighting
- **Expansion** (Score: 80) - New buildings being constructed
- **Gathering** (Score: 60) - Resource gathering operations
- **Movement** (Score: 50) - Army movement and repositioning

### 2. Camera Interest Calculator
**File:** `packages/zeroad-adapter/src/camera/camera-interest-calculator.ts`

Analyzes game state to identify interesting locations:

```typescript
interface CameraInterest {
  x: number;              // World position X
  z: number;              // World position Z (0 A.D. uses X,Z not X,Y)
  score: number;          // 0-100 importance score
  reason: string;         // 'combat' | 'expansion' | 'gathering' | 'movement'
  unitCount?: number;     // Units involved in this activity
  timestamp: number;      // When this interest was detected
}
```

**Detection Algorithms:**
- **Combat Detection:** Groups nearby units from different players (>= 2 players)
- **Expansion Detection:** Compares building sets between ticks
- **Gathering Detection:** Clusters nearby friendly units (>= 3 units within 50px)
- **Movement Detection:** Tracks unit displacement between ticks (>= 4 unit groups)

### 3. Camera Mod Controller
**File:** `packages/zeroad-adapter/src/camera/camera-mod-controller.ts`

Executes camera movement commands:

```typescript
async panTo(x: number, z: number, duration?: number)
async setPosition(x: number, z: number)
async setZoom(distance: number)
```

**Implementation:**
- Sends commands via 0 A.D.'s RL Interface `/evaluate` endpoint
- Executes JavaScript code in game's engine context
- Supports smooth panning and instant jumps
- Queues commands for sequential execution

### 4. Camera Broadcast Server
**File:** `packages/zeroad-adapter/src/broadcast/camera-broadcast-server.ts`

HTTP server for broadcasting camera recommendations to external tools:

```
GET http://localhost:3001/camera/current
→ { x: 619.8, z: 804.2, reason: 'gathering', score: 60, timestamp: 1783730687706 }

GET http://localhost:3001/camera/stream
→ Server-Sent Events stream of camera updates
```

**Usage by External Tools:**
- OBS Studio can fetch current camera position and update overlay
- Streaming software can pan based on game events
- Data visualization tools can track camera behavior

## Integration Flow

```
Game State (0 A.D. RL Interface)
         ↓
World State Mapper (converts to domain format)
         ↓
Automatic Camera Manager (detects interesting moments)
         ↓
Camera Interest Calculator (scores locations)
         ├→ Camera Mod Controller (sends /evaluate commands to game)
         └→ Camera Broadcast Server (streams to external tools)
```

## Real-World Example

During a match:

1. **T=5s**: Gathering detected at (619.8, 804.2) with 5 units
   - Camera pans to position over 1 second
   - Score: 60 (gathering activity)
   - Broadcast: `POST /camera/stream` with coordinates

2. **T=12s**: Combat detected at (641.3, 795.6) with 3+ units from different players
   - Camera pans to combat zone
   - Score: 90 (highest priority)
   - Broadcast updated with new position

3. **T=30s**: No major activity
   - Camera returns to previously detected gathering area
   - Score decays over time (95%, max 500ms age)
   - Broadcast reflects static camera

## Configuration

### Arena Loop Integration

In `packages/zeroad-adapter/src/arena/run-arena-loop.ts`:

```typescript
// Initialize camera systems
const cameraController = new CameraModController(logger, client);
const cameraBroadcast = new CameraBroadcastServer(logger, 3001);

// Subscribe to game state updates
cameraManager.start();

// Broadcast camera events to external tools
eventFeed.subscribe((type: string, data: any) => {
  if (type === 'camera:target_updated') {
    cameraBroadcast.broadcastRecommendation(
      data.x, data.z, data.reason, data.score
    );
  }
});
```

### Environment Variables

```bash
# Override default Ollama model
export OLLAMA_MODEL=mistral:latest

# Set game resolution for camera calculations
export SCREEN_WIDTH=1920 SCREEN_HEIGHT=1080

# Override startup wait time
export STARTUP_WAIT=5000
```

## Testing Camera System

### Run a Single Match with Camera

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Expected output:
```
📡 Camera broadcast server listening on port 3001
🎥 Pan camera to (619.8, 804.2) over 1000ms
🎥 Camera: camera:target_updated { x: 619.8, z: 804.2, reason: 'gathering', score: 60, unitCount: 5 }
```

### Query Camera Position

```bash
# Get current position
curl http://localhost:3001/camera/current

# Subscribe to stream (in another terminal)
curl --no-buffer http://localhost:3001/camera/stream
```

### Monitor Camera Activity

```bash
# Watch camera panning logs
npm run dev 2>&1 | grep "🎥"

# Watch camera events
npm run dev 2>&1 | grep "camera:target_updated"
```

## Known Limitations

1. **RL Interface Evaluate:** JavaScript execution in game engine has limited API access
2. **Position Precision:** 0 A.D. positions are floats, grid-snapped in game rendering
3. **Activity Scoring:** Fixed weights (combat=90, expansion=80, gathering=60) - no learning
4. **Camera Smoothing:** Pan duration is linear, no easing functions yet

## Future Improvements

1. **Machine Learning:** Learn what activities are interesting to viewers
2. **Smooth Motion:** Add easing functions for natural camera movement
3. **Multi-Player Views:** Switch between players based on action hotspots
4. **Replay Integration:** Use camera system for instant replays and highlights
5. **Broadcast Overlays:** Render activity indicators on stream overlay

## File Structure

```
packages/zeroad-adapter/src/
├── camera/
│   ├── automatic-camera-manager.ts    (main manager)
│   ├── camera-interest-calculator.ts   (activity detection)
│   └── camera-mod-controller.ts        (command execution)
├── broadcast/
│   └── camera-broadcast-server.ts      (HTTP server)
└── arena/
    └── run-arena-loop.ts               (integration point)
```

## Debugging

### Camera Not Moving

1. Check RL Interface is running: `curl http://127.0.0.1:6000/get_state`
2. Verify game is running with RL Interface enabled
3. Check arena loop logs for `camera:target_updated` events
4. Verify broadcast server is listening: `curl http://localhost:3001/camera/current`

### Activity Not Detected

1. Check gathering clusters: Need >= 3 units within 50px radius
2. Check combat zones: Need >= 2 different player units close
3. Check building changes: New buildings trigger expansion detection
4. Monitor interest calculator output in console

### Broadcast Server Not Responding

```bash
# Check if server is listening
netstat -an | grep 3001

# Kill any stuck processes
lsof -i :3001
kill -9 <pid>

# Restart arena loop
npm run dev
```

## Related Documentation

- [INSTALLATION.md](./INSTALLATION.md) - Setup instructions
- [RL Interface Protocol](https://github.com/0ad/0ad/tree/master/source/tools/rlinterface)
- [0 A.D. Modding Guide](https://trac.wildfiregames.com/wiki/Modding)
