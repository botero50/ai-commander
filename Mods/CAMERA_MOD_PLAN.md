# 0 A.D. Camera Control Mod - Development Plan

## Objective
Create a 0 A.D. mod that allows remote camera control via HTTP requests (curl/fetch).

## Mod Architecture

### 1. Mod Structure
```
camera_control/
├── mod.json                 # Mod metadata
├── gui/
│   └── session/
│       └── camera_api.xml   # GUI component for HTTP server
├── simulation/
│   ├── components/
│   │   └── CameraRemote.js  # Main camera control logic
│   ├── messages/
│   │   └── SetCameraPosition.js
│   └── data/
│       └── camera_config.json
└── README.md
```

### 2. How It Works

**Option A: RL Interface Integration (Recommended)**
- Use existing RL Interface mechanism (`/evaluate` endpoint)
- Send JavaScript code to control camera through `Engine.SetCameraData()`
- No need for separate HTTP server in the mod itself

**Option B: Built-in HTTP Server (Standalone)**
- Create HTTP server inside the mod
- Listen on custom port (e.g., 8765)
- Receive camera position commands as JSON
- Execute camera movement JavaScript

### 3. Implementation Steps

1. **Create mod.json**
   - Define mod name, version, dependencies
   - Register as loadable mod

2. **Create simulation component**
   - Listen for camera position messages
   - Execute camera movement commands
   - Handle validation and bounds checking

3. **Create GUI/API endpoint**
   - Optional: Create in-game UI for testing
   - Or rely entirely on external API

4. **Integration with Arena Loop**
   - Extend existing `CameraBroadcastServer` or `GameCheats` class
   - Add method to send camera commands via RL Interface
   - Call from automatic camera manager

### 4. Camera Movement API

**Input Format (JSON via curl):**
```json
{
  "command": "move_camera",
  "x": 512.5,
  "z": 512.5,
  "height": 100,
  "pitch": 45,
  "yaw": 0,
  "duration_ms": 1000
}
```

**0 A.D. Camera Data Structure:**
```javascript
{
  x: number,        // Position X
  y: number,        // Height (Z in world coords)
  z: number,        // Position Z
  rotX: number,     // Pitch (0-360)
  rotY: number,     // Roll (usually 0)
  rotZ: number      // Yaw (0-360)
}
```

### 5. Usage Example

```bash
# Via RL Interface (easier)
curl -X POST http://localhost:6000/evaluate \
  -d '{"code": "Engine.SetCameraData(512, 100, 512, 45, 0, 0); \"camera moved\";"}'

# Via direct mod API (if implemented)
curl -X POST http://localhost:8765/camera/move \
  -H "Content-Type: application/json" \
  -d '{"x": 512, "z": 512, "height": 100}'
```

### 6. Integration Points

- **CameraBroadcastServer**: Extend to accept incoming commands
- **GameCheats**: Add camera movement methods
- **RL Interface HTTP Client**: Use existing endpoint
- **AutomaticCameraManager**: Coordinate with mod commands

## Technical Notes

- 0 A.D. uses JavaScript for game logic (SpiderMonkey engine)
- RL Interface already has code evaluation capability
- Camera system uses `Engine.GetCameraData()` and `Engine.SetCameraData()`
- Simulation components receive messages synchronously in game ticks

## Dependencies
- 0 A.D. version 0.28.0+ (has RL Interface)
- No external libraries required (mod sandbox)

## Testing Strategy
1. Create simple test that moves camera to fixed position
2. Test via RL Interface `/evaluate` endpoint
3. Integrate with AutomaticCameraManager
4. Test with actual game running
