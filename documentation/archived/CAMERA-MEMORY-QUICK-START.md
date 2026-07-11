# Camera Memory Injection — Quick Start

## What You Have

✅ **X Position Address:** `0x21FEB86F73C`

## What You Need to Find

Using Cheat Engine (see full guide: `CAMERA-MEMORY-INJECTION-GUIDE.md`):

1. **Y Position Address** — Forward/backward camera movement
2. **Zoom Address** — Camera zoom level

## Quick Address Finding

### Shortcut Method

Camera addresses are usually sequential. Try these offsets from your X address:

```
X:    0x21FEB86F73C  (Known)
Y:    0x21FEB86F73C + 4  = 0x21FEB86F740  (Try this first)
Z:    0x21FEB86F73C + 8  = 0x21FEB86F744  (Try this second)
Zoom: 0x21FEB86F73C + 12 = 0x21FEB86F748  (Try this third)
```

### Verify in Cheat Engine

```
1. Open Cheat Engine
2. Attach to pyrogenesis.exe
3. Right-click your X address → "Add to list"
4. Try adding: Address + 4, + 8, + 12
5. Move camera - see which ones change
```

## Python Usage

### Install Dependencies

```bash
pip install pymem
```

### Read Current Camera Position

```bash
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --read
```

### Set Camera Position

```bash
# Set X and Y only
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 100 --y 200

# Set X, Y, and zoom
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 100 --y 200 --zoom 150

# Set all including Z
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 100 --y 200 --z 50 --zoom 150

# Set and verify
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 100 --y 200 --verify
```

## Integration with TypeScript

Once you have the addresses, update the Python script:

```python
CAMERA_ADDRESSES = {
    'x_position': 0x21FEB86F73C,    # Your known address
    'y_position': 0x21FEB86F740,    # Your Y address here
    'z_position': 0x21FEB86F744,    # Your Z address here
    'zoom': 0x21FEB86F748,          # Your zoom address here
}
```

Then use from TypeScript:

```typescript
import { spawn } from 'child_process';

async function setCameraPosition(x: number, y: number, zoom: number) {
  return new Promise<boolean>((resolve) => {
    const python = spawn('python', [
      'packages/zeroad-adapter/src/camera/camera-memory-injector.py',
      '--x', x.toString(),
      '--y', y.toString(),
      '--zoom', zoom.toString(),
    ]);

    python.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Usage in camera controller
await setCameraPosition(150, 200, 150);
```

## Testing the Script

1. **Start 0 A.D. in a match**
2. **Run the Python script to read position**
   ```bash
   python packages/zeroad-adapter/src/camera/camera-memory-injector.py --read
   ```
3. **You should see output like:**
   ```
   Current X: 150.5
   Current Y: 200.3
   Current Z: 75.0
   Current Zoom: 150.0
   ```

4. **Try setting a position**
   ```bash
   python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 200 --y 300 --verify
   ```
5. **Watch the camera move in-game!**

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Process not found" | Make sure 0 A.D. is running |
| "Permission denied" | Run as Administrator |
| "pymem not found" | `pip install pymem` |
| "Address returns None" | Address is wrong - find correct one in Cheat Engine |
| "Camera doesn't move" | Z address is wrong offset - try different offset |

## Next: Full Address Discovery

For detailed steps, see: `CAMERA-MEMORY-INJECTION-GUIDE.md`

## Files Created

- `packages/zeroad-adapter/src/camera/camera-memory-injector.py` — Main injection script
- `CAMERA-MEMORY-INJECTION-GUIDE.md` — Detailed guide
- `CAMERA-MEMORY-QUICK-START.md` — This file

---

**Status:** Ready for Y position and zoom address discovery ✅

Once you find those addresses, update the script and you'll be able to control the camera from Python!
