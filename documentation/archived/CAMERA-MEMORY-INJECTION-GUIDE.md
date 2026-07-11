# Camera Memory Injection Guide — Find & Inject Addresses

## Overview

This guide helps you find the camera Y position and zoom addresses using Cheat Engine, then inject them via Python.

You already have:
- ✓ X Position: `0x21FEB86F73C`
- ❌ Y Position: NEED TO FIND
- ❌ Zoom: NEED TO FIND

---

## Step 1: Find Y Position Address

### Using Cheat Engine

1. **Start 0 A.D. and get in-game**
   - Start a match
   - Note your camera's Y position (forward/backward movement)

2. **Open Cheat Engine**
   - Run Cheat Engine
   - Click "Select a process to open"
   - Find and select `pyrogenesis.exe`

3. **Find Y Position**
   - Note your exact camera Y position
   - In Cheat Engine:
     - Value Type: `Float`
     - Enter the Y position value
     - Click "First Scan"
   
4. **Narrow Down Results**
   - Move camera forward/backward (change Y)
   - Enter new Y value in Cheat Engine
   - Click "Next Scan"
   - Keep narrowing until you find the address

5. **Record the Address**
   - Once found, note the address (format: `XXXXXXXX`)
   - The address will be in hex format
   - Example: If you find it at `21FEB86F740`, that's Y position

### Expected Pattern

Camera addresses are usually sequential in memory:
```
X Position:    0x21FEB86F73C  (YOUR KNOWN ADDRESS)
Y Position:    0x21FEB86F740  (Usually +4 bytes from X)
Z Position:    0x21FEB86F744  (Usually +8 bytes from X)
Zoom:          0x21FEB86F748  (Usually +12 bytes from X)
```

Try these offsets first:
- Y: X_Address + 4 bytes
- Z: X_Address + 8 bytes  
- Zoom: X_Address + 12 bytes

---

## Step 2: Find Zoom Address

### Using Cheat Engine

1. **In-Game**
   - Note your current camera zoom level
   - 0 A.D. zoom ranges typically: 0.0 to 300.0

2. **In Cheat Engine**
   - Value Type: `Float`
   - Enter your zoom value (e.g., 150.0 if you're at default zoom)
   - Click "First Scan"

3. **Narrow Down**
   - Zoom in (scroll mouse wheel up)
   - Enter new zoom value
   - Click "Next Scan"
   - Repeat until you narrow down

4. **Record Address**
   - Note the address when you find it
   - Example: `21FEB86F748`

### Tips for Finding Zoom

- Zoom values are typically floats between 0.0 and 300.0
- It's often near the camera position addresses
- Look for values changing when you zoom (Ctrl + scroll or mouse wheel)

---

## Step 3: Verify Addresses

Once you have all three addresses, verify them:

1. **In Cheat Engine**
   - Right-click the address
   - Select "Add to the cheat table"
   - This adds it to your table for verification

2. **Move Camera**
   - Manually move camera
   - Watch if the values in Cheat Engine change
   - If yes, you have the right address!

3. **Write Test**
   - In Cheat Engine, try to write a new value
   - Example: Change zoom to 200.0
   - See if camera zoom changes in-game

---

## Step 4: Update Python Script

Once you have all addresses:

1. **Edit camera-memory-injector.py**
   ```python
   CAMERA_ADDRESSES = {
       'x_position': 0x21FEB86F73C,  # Your known address
       'y_position': 0x????????,     # Replace with your Y address
       'z_position': 0x????????,     # Replace with your Z address
       'zoom': 0x????????,           # Replace with your zoom address
   }
   ```

2. **Convert to Hex**
   - If Cheat Engine shows: `21FEB86F740`
   - Use in Python as: `0x21FEB86F740`

---

## Step 5: Install Python Requirements

```bash
pip install pymem
```

---

## Step 6: Test the Script

```bash
# Run the script while 0 A.D. is running
python packages/zeroad-adapter/src/camera/camera-memory-injector.py
```

**Expected output:**
```
[INFO] Connecting to pyrogenesis.exe...
[INFO] Successfully connected to pyrogenesis.exe
[INFO] Process ID: 12345
[INFO] Current X: 150.5
[INFO] Current Y: 200.3
[INFO] Current Z: 75.0
[INFO] Current Zoom: 150.0
[INFO] Setting X position to 150.0
[INFO] Wrote 150.0 to 0x21FEB86F73C
```

---

## Step 7: Integrate with TypeScript

Once working, create a TypeScript wrapper:

```typescript
// packages/zeroad-adapter/src/camera/camera-memory-controller.ts

import { spawn } from 'child_process';
import { Logger } from '../config/logger.js';

export class CameraMemoryController {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('info', 'CameraMemoryController');
  }

  async setCameraPosition(
    x: number,
    y: number,
    z?: number,
    zoom?: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn('python', [
        'packages/zeroad-adapter/src/camera/camera-memory-injector.py',
        '--x', x.toString(),
        '--y', y.toString(),
        ...(z ? ['--z', z.toString()] : []),
        ...(zoom ? ['--zoom', zoom.toString()] : []),
      ]);

      python.on('close', (code) => {
        resolve(code === 0);
      });

      python.on('error', (err) => {
        this.logger.error('Camera memory injection failed', { error: err.message });
        resolve(false);
      });
    });
  }
}
```

---

## Cheat Engine Tips

### Finding Addresses Efficiently

1. **Start with a known value**
   - Position camera at specific location
   - Note the X, Y coordinates
   - Search for these exact values

2. **Filter by type**
   - Always use `Float` type (4 bytes)
   - Not `Double` (8 bytes) or other types

3. **Look for patterns**
   - Sequential addresses (often offset by 4 bytes)
   - Compare with your X address

4. **Verify with pointers**
   - Right-click address → "Pointer"
   - See the offset from base address
   - Helps find related addresses

5. **Export the table**
   - File → Export CheatTable
   - Save as `.ct` file
   - Can reload later

---

## Address Format Reference

| Component | Type | Size | Example |
|-----------|------|------|---------|
| X Position | Float | 4 bytes | 0x21FEB86F73C |
| Y Position | Float | 4 bytes | 0x21FEB86F740 |
| Z Position | Float | 4 bytes | 0x21FEB86F744 |
| Zoom | Float | 4 bytes | 0x21FEB86F748 |

---

## Troubleshooting

### "Process not found"
- Make sure 0 A.D. is running
- Check process name: `pyrogenesis.exe`

### "Address not found"
- Your 0 A.D. version might be different
- Re-scan with Cheat Engine
- Check offset isn't off by 4 bytes

### "Permission denied"
- Run as Administrator
- Check antivirus isn't blocking pymem

### "Value doesn't change"
- Make sure address is correct
- Verify it's `Float` type, not `Double`
- Check offset (try +4, +8, +12 from X)

---

## Next Steps

1. ✅ Find Y position with Cheat Engine
2. ✅ Find Zoom with Cheat Engine
3. ✅ Update addresses in Python script
4. ✅ Test with `camera-memory-injector.py`
5. ✅ Integrate with TypeScript code
6. ✅ Hook into arena camera controller

---

## Example: Complete Address List

Once you have everything:

```python
CAMERA_ADDRESSES = {
    'x_position': 0x21FEB86F73C,    # X coordinate
    'y_position': 0x21FEB86F740,    # Y coordinate
    'z_position': 0x21FEB86F744,    # Z coordinate (height)
    'zoom': 0x21FEB86F748,          # Camera zoom level
}
```

Then you can:
```bash
python camera-memory-injector.py --x 100 --y 200 --zoom 150
```

---

**Happy address hunting!** 🎯
