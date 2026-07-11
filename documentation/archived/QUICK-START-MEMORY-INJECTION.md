# Quick Start: Memory Injection Camera Control

## What You Need

1. **Python 3.6+** (already have)
2. **pymem library** (install with pip)
3. **CheatEngine** (download free)
4. **0 A.D.** running

## Step 1: Install Python Dependencies

```bash
pip install pymem psutil
```

## Step 2: Find Camera Memory Offset (5 minutes)

### Start 0 A.D. Match

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait for game to start and be playable.

### Use CheatEngine to Find Offset

1. **Download CheatEngine**: https://www.cheatengine.org/downloads.php
2. **Run CheatEngine**
3. **File → Open Process** → Select `pyrogenesis.exe` → Open
4. **In the game:**
   - Look at camera position (try `/help` or check overlay)
   - Or just remember current position
5. **In CheatEngine:**
   - Enter current camera X value in "Value" box
   - Set "Value Type" to `Float`
   - Click `First Scan`
6. **Narrow down:**
   - Move camera in game to different position
   - Enter new X value in CheatEngine
   - Click `Next Scan`
   - Repeat 2-3 times until you see 1-2 results
7. **Double-click the result** to add to list at bottom
8. **Note the address** (e.g., `04A5C8B0`)

### Verify Z Coordinate

1. In the list at bottom, note address of X coordinate
2. Click it to highlight (address should be like `04A5C8B0`)
3. Look 8 bytes ahead in memory: `04A5C8B8` (usually this is Z)
4. Change camera Z in game
5. Verify value at `04A5C8B8` changes

## Step 3: Update Camera Injector

Edit `packages/zeroad-adapter/tools/camera-injector.py`:

Find this line (around 95):
```python
CAMERA_ADDRESS = 0x0  # Set this using CheatEngine results
```

Replace with your address from CheatEngine:
```python
CAMERA_ADDRESS = 0x04A5C8B0  # Your actual address
```

## Step 4: Test Memory Injection

```bash
# Find pyrogenesis PID
tasklist | find "pyrogenesis.exe"

# Test injection (replace PID)
python packages/zeroad-adapter/tools/camera-injector.py --pid 12345 --x 400 --z 400 --verbose
```

**Expected result:** Camera in game should jump to (400, 400)!

## Step 5: Integrate with Arena Loop

Once you've verified it works:

1. Update `camera-mod-controller.ts` to use memory injector
2. Or create new controller that uses `memory-injector.ts`
3. Call on each camera pan recommendation

## One-Minute Summary

```bash
# 1. Start game
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# 2. Use CheatEngine to find camera address
#    (see details above)

# 3. Update camera-injector.py with address

# 4. Test
python packages/zeroad-adapter/tools/camera-injector.py --x 500 --z 600

# Done! Camera moved!
```

## Troubleshooting

**"pymem.process.ProcessNotFound"**
- Make sure pyrogenesis.exe is running
- Run Command Prompt as Administrator
- Try with explicit `--pid` value

**"Address seems wrong - camera doesn't move"**
- Offset changes between 0 A.D. versions
- Use CheatEngine again to find new offset
- Or try offset ± 4, 8, 12 to scan nearby

**"Camera moved to wrong position"**
- Offset might be pointing to different struct
- Verify Z coordinate location first
- Check if X and Z are swapped

**Stuck?**
- See full guide: `MEMORY-INJECTION-SETUP.md`
- See C++ version: `camera-injector.cpp`
- See Node.js wrapper: `memory-injector.ts`

## Why Memory Injection Works

```
0 A.D. Game Loop:
1. Read game state
2. Update camera position (reads from memory)
3. Render frame
4. Repeat
```

When we inject memory, we modify step 2 directly!

The camera has no idea the data came from CheatEngine/injector - it just reads
the values and uses them. Game engine is designed this way, so it works perfectly.

## Next: Automate It

Once this works, integrate with camera detection:

```typescript
// In arena loop
const memoryInjector = new CameraMemoryInjector(logger);
await memoryInjector.checkAvailable();

// When camera should pan:
await memoryInjector.pan(x, z, duration);
```

Done! Fully automated camera!
