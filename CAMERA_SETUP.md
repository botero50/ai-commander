# 🎥 Automatic Camera Following - Setup Guide

The arena automatically moves the camera to follow battles using WASD keyboard input.

## Prerequisites

### Python 3.8+
```bash
# Check if Python is installed
python --version
```

### Required Python Packages
```bash
# Install camera control dependencies
pip install pynput pywin32
```

### Windows-Only Setup
After installing pywin32, you must run the post-install script:
```bash
python -m pip install --upgrade pywin32
python Scripts/pywin32_postinstall.py -install
```

If you get "Scripts folder not found", try:
```bash
python -c "import pywin32_postinstall; pywin32_postinstall.install()"
```

## Configuration

Edit `.env` file:
```env
# Enable automatic camera following battles
ENABLE_AUTO_CAMERA=true

# Enable automatic zoom out when moving to battles (optional)
ENABLE_AUTO_ZOOM=true

# How much to zoom out (0-5, higher = more zoom levels)
AUTO_ZOOM_AMOUNT=2

# How often camera can move (in milliseconds)
CAMERA_EVENT_DEBOUNCE_MS=2000
```

### Zoom Control

When the camera moves to a battle:
1. **Move to battle location** (via WASD)
2. **Zoom out** automatically (mouse wheel down)
3. This gives you a wider view of the battle

You can adjust zoom aggressiveness:
- `AUTO_ZOOM_AMOUNT=0` - No zoom (just movement)
- `AUTO_ZOOM_AMOUNT=1` - Light zoom out
- `AUTO_ZOOM_AMOUNT=2` - Medium zoom out (default)
- `AUTO_ZOOM_AMOUNT=3` - Heavy zoom out
- `AUTO_ZOOM_AMOUNT=5` - Maximum zoom out

## How It Works

1. **Battle Detection**: The game monitors unit positions
2. **Event Triggered**: When units cluster (3+ units close together), a battle event is fired
3. **Camera Movement**: WASD keys are sent to 0 A.D. to move camera
4. **Position Tracking**: Camera position is tracked and updated as events occur

## Testing the Camera

### Automatic Camera Test

The arena automatically tests the camera system:

**Timeline:**
- **5 seconds**: Game initializes, camera zooms out
- **10 seconds (Tick 300)**: Camera pans from **Player 1 base** → **Player 2 base**
  - Watch the logs for: `🎬 CAMERA TEST: Panning between town centers...`
  - You should see the camera move to each player's position
  - This confirms the Python script and WASD commands are working

**Example output:**
```
[ArenaLoop:INFO] 🎬 CAMERA TEST: Panning between town centers...
[ArenaLoop:INFO] 📍 Player 1 building at (234, 128)
[ArenaLoop:INFO] 📍 Player 2 building at (876, 945)
[ArenaLoop:INFO] 🎥 Panning to Player 1 base...
[ArenaLoop:INFO] 🎥 Panning to Player 2 base...
```

### Manual Testing

To test the camera controller manually:
```bash
# Move camera right (D key)
python camera-controller.py d 2000

# Move camera left (A key)
python camera-controller.py a 2000

# Zoom out
python camera-controller.py scroll_down 500

# Zoom in
python camera-controller.py scroll_up 500
```

If the camera doesn't move:
1. Click on the 0 A.D. window to focus it
2. Run the command again
3. Check the console output for errors

## Keyboard Mapping

| Key | Direction |
|-----|-----------|
| W   | Up (forward) |
| S   | Down (backward) |
| A   | Left |
| D   | Right |

## Troubleshooting

### Camera not moving?

**Check 1: Is Python script being called?**
```bash
# Manually test the camera controller
python camera-controller.py w 2000
```

**Check 2: Is 0 A.D. window focused?**
The game window must be active for keyboard input to work. The script tries to auto-focus it, but you can manually click on the game window.

**Check 3: Are dependencies installed?**
```bash
pip list | grep pynput
pip list | grep pywin32
```

**Check 4: Look at the logs**
Watch the arena output for messages like:
```
[ArenaLoop:INFO] 🎬 Moving camera: battle
[ArenaLoop:INFO] 🎥 Moving camera from (X,Y) to (X,Y)
[ArenaLoop:INFO] 🎮 Camera movement: dx=100, dz=50
```

### "pynput" module not found
```bash
pip install pynput --upgrade
```

### "pywin32" module not found
```bash
pip install pywin32 --upgrade
python -m pip install --upgrade pywin32
python Scripts/pywin32_postinstall.py -install
```

### Camera moves but position is wrong
- Battle detection might be detecting wrong locations
- Camera tracking might be off
- Check logs for "Camera event" messages

## Advanced Configuration

Edit `packages/zeroad-adapter/src/camera/event-based-camera.ts`:

- **Battle cluster size**: Line 113 - change `>= 3` units
- **Cluster radius**: Line 191 - change `50` pixel radius
- **Movement scaling**: Line 298 - change `* 3` duration multiplier
- **Max movement duration**: Line 302 - change `3000` ms max

## Example Output

```
[ArenaLoop:INFO] 🎬 Camera event: Battle detected: 5 units engaged
[ArenaLoop:INFO] type: 'battle', severity: 'high', location: '(345, 523)'
[ArenaLoop:INFO] 🎥 Moving camera
from: '(512, 512)', to: '(345, 523)', distance: '236'
[ArenaLoop:INFO] 🎮 Camera movement: dx=-167, dz=11 | sending 501ms + 33ms
```

## Disable Camera

If the camera movement is annoying, disable it:

```env
ENABLE_AUTO_CAMERA=false
```

Or remove the event listeners in the arena loop around line 810-830.
