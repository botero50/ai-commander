# Camera Memory Injection - Setup & Usage Guide

## Overview

This guide explains how to set up and use **memory injection** to move the camera directly, bypassing 0 A.D.'s RL Interface limitations.

The approach is similar to using CheatEngine but fully automated.

## How It Works

```
Game State (RL Interface)
    ↓
Activity Detection
    ↓
Camera Memory Injector
    ↓
Direct Memory Write to pyrogenesis.exe
    ↓
Camera Position Updated in Game Memory
    ↓
Game Reads New Position Next Frame
    ↓
Camera Moves In-Game
```

## Step 1: Compile the Injector

### Prerequisites
- Visual Studio or MinGW (C++ compiler)
- Windows SDK

### Option A: Using Visual Studio

```bash
cd packages/zeroad-adapter/tools
cl /EHsc camera-injector.cpp /link user32.lib kernel32.lib
```

This creates `camera-injector.exe` in the same directory.

### Option B: Using MinGW

```bash
cd packages/zeroad-adapter/tools
g++ -o camera-injector.exe camera-injector.cpp -luser32 -lkernel32
```

### Option C: Pre-compiled Binary

If you don't have a C++ compiler:
1. Use online compiler service (compile.cmd, codepad.io)
2. Or download pre-built camera-injector.exe
3. Place in `packages/zeroad-adapter/tools/`

## Step 2: Find Camera Memory Address

The injector needs to know where the camera struct is in memory. This requires finding the correct offset.

### Method A: Using CheatEngine (Recommended)

1. **Start a 0 A.D. match:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
   ```

2. **Open CheatEngine**
   - Download from: https://www.cheatengine.org
   - Run CheatEngine

3. **Attach to pyrogenesis**
   - Click "File" → "Open Process"
   - Find and select "pyrogenesis.exe"
   - Click "Open"

4. **Find Camera X Position**
   - In 0 A.D., note the camera position (or use console)
   - In CheatEngine, enter the X coordinate in "Value" field
   - Set "Value Type" to "Float"
   - Click "First Scan"

5. **Narrow down results**
   - In 0 A.D., pan camera to different position
   - Enter new X value in CheatEngine
   - Click "Next Scan"
   - Repeat until you have few results (usually 1-2)

6. **Found It!**
   - Click on the address in the results
   - In bottom panel, note the address (e.g., `04A5C8B0`)
   - This is your camera X offset

7. **Verify with Z coordinate**
   - Look at address + 8 bytes (Z is usually 8 bytes after X)
   - Change Z in game, confirm it updates in CheatEngine

8. **Record the offset:**
   - Base address: `04A5C8B0` (example)
   - X offset: `0`
   - Y offset: `4` (usually skipped)
   - Z offset: `8`
   - Zoom offset: `12` (optional)

### Method B: Using 0 A.D. Source Code

1. Download 0 A.D. source from: https://github.com/0ad/0ad

2. Find camera source:
   ```
   source/simulation/components/Camera.h
   source/graphics/Camera.cpp
   ```

3. Look for camera struct:
   ```cpp
   struct CCamera {
       float m_X, m_Y, m_Z;      // Position
       float m_Zoom;
       // ...
   };
   ```

4. Calculate offsets based on data layout

## Step 3: Configure Memory Injector with Found Offset

Once you've found the camera address, you need to tell the injector where it is.

### Current Limitation

The injector in `camera-injector.cpp` currently:
- ✓ Can attach to process
- ✓ Can write to memory
- ✗ Cannot automatically find camera address (needs offset provided)

### To Enable It:

Edit `camera-injector.cpp`:

```cpp
// Around line 90, modify FindCameraAddress()
DWORD_PTR FindCameraAddress(HANDLE process_handle) {
    // EXAMPLE: If CheatEngine found camera at 04A5C8B0
    // And base executable is at 400000, offset would be:
    DWORD_PTR offset = 0x0A5C8B0;  // YOUR OFFSET HERE
    
    HMODULE mod = GetModuleHandle("pyrogenesis.exe");
    DWORD_PTR base = (DWORD_PTR)mod;
    
    return base + offset;
}
```

Then recompile:
```bash
cl /EHsc camera-injector.cpp /link user32.lib kernel32.lib
```

## Step 4: Test the Injector

```bash
# Find pyrogenesis PID
tasklist | find "pyrogenesis.exe"

# Test injection (replace PID)
camera-injector.exe --pid 12345 --x 400 --z 400 --verbose
```

Expected output:
```
0 A.D. Camera Memory Injector v1.0
==================================

[*] Successfully opened process 12345
[*] Injecting camera position
    Base address: 0x400A5C8B0
    X: 400
    Z: 400
[*] Camera position injected successfully
```

Camera in game should jump to (400, 400)!

## Step 5: Integrate with Arena Loop

Once injector is working, modify camera controller to use it:

```typescript
// In camera-mod-controller.ts
import { CameraMemoryInjector } from './memory-injector.js';

const memoryInjector = new CameraMemoryInjector(logger);
await memoryInjector.checkAvailable();

// In panTo():
async panTo(x: number, z: number, duration: number = 1000) {
  const success = await memoryInjector.pan(x, z, duration);
  if (success) {
    this.logger.info(`🎥 Camera moved to (${x}, ${z})`);
  }
}
```

## Advantages of Memory Injection

✅ **Works during gameplay** - No special game modes needed  
✅ **Real-time camera movement** - Updates every frame  
✅ **No mod loading required** - Bypasses mod system entirely  
✅ **Works in RL Interface mode** - Doesn't interfere with AI  
✅ **Instant response** - No network delays  

## Disadvantages

❌ **Version-specific** - Offsets change per 0 A.D. version  
❌ **Requires reverse engineering** - Need to find offsets  
❌ **Windows only** - Uses Windows APIs (could port to Linux/Mac)  
❌ **Could be flagged as cheat** - If game has anti-cheat (0 A.D. doesn't currently)  

## Troubleshooting

### "Could not open process"
- Make sure pyrogenesis.exe is running
- Run as Administrator (right-click cmd.exe)
- Check PID with `tasklist`

### "Permission denied"
- Run Command Prompt as Administrator
- Try again with `--pid <pid>`

### Camera doesn't move
- Offset might be wrong
- Try different offset values (offset +/- 4, 8, 12, etc.)
- Use CheatEngine to reverify

### Crash
- Offset is pointing to invalid memory
- Write value is corrupting other data
- Reduce coordinate values to test safely

## Building Camera Smooth Panning

Once basic injection works, enhance with smooth motion:

```typescript
async pan(x: number, z: number, duration: number = 1000) {
  const frames = Math.ceil(duration / 33);  // ~30 FPS
  const startX = await this.getCurrentX();  // Would need to read memory too
  const startZ = await this.getCurrentZ();
  
  for (let i = 0; i <= frames; i++) {
    const t = i / frames;  // 0 to 1
    const interpX = startX + (x - startX) * t;
    const interpZ = startZ + (z - startZ) * t;
    
    await this.memoryInjector.setPosition(interpX, interpZ);
    await sleep(33);  // 30 FPS
  }
}
```

## Alternative: Use Python for Memory Access

If C++ is too complex, use Python with `pymem`:

```python
import pymem
import time

# Find process
pm = pymem.Pymem("pyrogenesis.exe")

# Write camera position
camera_address = 0x...  # From CheatEngine
pm.write_float(camera_address + 0, 400.0)  # X
pm.write_float(camera_address + 8, 400.0)  # Z
```

Call from Node.js:
```bash
python camera-injector.py --x 400 --z 400
```

## Next Steps

1. **Compile camera-injector.exe** - Use Visual Studio or MinGW
2. **Find camera offset** - Use CheatEngine method
3. **Update camera-injector.cpp** with offset
4. **Test manually** - Verify camera moves
5. **Integrate with arena loop** - Use CameraMemoryInjector class
6. **Test with automated system** - Full camera detection + injection

Should we implement this? I can help with any of these steps!
