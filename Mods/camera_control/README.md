# Camera Control Mod for 0 A.D.

A lightweight mod that enables remote camera control through the RL Interface HTTP API.

## Features

- Move camera to specific coordinates
- Smooth camera transitions
- Bounds checking to prevent invalid positions
- Integration with RL Interface for remote control

## Installation

1. Copy the `camera_control` folder to your 0 A.D. mods directory:
   - Windows: `%USERPROFILE%\AppData\Local\0 A.D. Empires Ascendant\binaries\data\mods\`
   - Linux: `~/.local/share/0ad/mods/`
   - macOS: `~/Library/Application Support/0ad/mods/`

2. Enable the mod when starting the game with `-mod=camera_control`

## Usage

### Via RL Interface (Recommended)

The mod doesn't require a separate HTTP server - it works with the existing RL Interface HTTP API.

**Move camera to position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(512, 100, 512, 45, 0, 0); \"camera moved to (512, 512)\";"}'
```

**Get current camera position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "JSON.stringify(Engine.GetCameraData());"}'
```

### Parameters

**SetCameraData(x, y, z, rotX, rotY, rotZ)**
- `x` (number): X coordinate in world space
- `y` (number): Height/elevation 
- `z` (number): Z coordinate in world space
- `rotX` (number): Pitch rotation (0-360 degrees)
- `rotY` (number): Roll rotation (usually 0)
- `rotZ` (number): Yaw/heading rotation (0-360 degrees)

### Example Camera Positions

```javascript
// Centered view at ground level
Engine.SetCameraData(512, 50, 512, 45, 0, 0);

// Higher elevation overview
Engine.SetCameraData(512, 200, 512, 70, 0, 0);

// Side angle view
Engine.SetCameraData(200, 100, 512, 45, 0, 90);
```

## Integration with AI Commander

The mod is designed to work with the AI Commander framework:

1. Enable in `run-arena-loop.ts` with `--mod=camera_control`
2. Use `GameCheats.setCameraPosition()` to control camera
3. Integrate with `AutomaticCameraManager` for smooth transitions

## API Reference

### JavaScript Methods Available

```javascript
// Get current camera data
let camera = Engine.GetCameraData();
console.log(camera.x, camera.y, camera.z, camera.rotX, camera.rotY, camera.rotZ);

// Set new camera position
Engine.SetCameraData(x, y, z, rotX, rotY, rotZ);

// Get viewport size
let vp = Engine.GetViewport();

// Get map bounds
let mapSize = Engine.GetMapSize(); // [width, height]
```

## Technical Details

- **No external dependencies** - uses 0 A.D. built-in JavaScript engine
- **No GUI changes** - mod works entirely through API
- **Thread-safe** - camera updates happen in game tick cycle
- **Version compatible** - works with 0 A.D. 0.28.0+

## Development

This mod is minimal intentionally to avoid conflicts with other mods. For advanced camera control features:

1. Add animation/easing functions
2. Implement camera follow targets
3. Add collision detection
4. Create GUI for manual camera control

## License

Same as 0 A.D. (GPL 2.0)
