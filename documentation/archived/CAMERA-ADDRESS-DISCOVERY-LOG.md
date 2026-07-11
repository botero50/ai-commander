# Camera Address Discovery Log

## Addresses Found So Far

### ✅ Found Addresses (Current Session)

```
X Position:  0x21FEB86F73C
Y Position:  0x1BFE8EAD6CC
Z Position:  SEARCHING...
Zoom:        SEARCHING...
```

## 🚨 IMPORTANT: Address Stability Issue

Your X and Y addresses are NOT sequential:
```
X: 0x21FEB86F73C
Y: 0x1BFE8EAD6CC   ← These don't follow a pattern!
```

**This means:**
1. ❌ They're stored in different memory regions
2. ❌ They likely change every time you restart 0 A.D.
3. ⚠️ We need to find a **base pointer** for permanent solution

## Finding Zoom Level

### Quick Search Strategy

**In Cheat Engine:**

1. **Note your current zoom level**
   - Default zoom is usually around 150.0
   - Look at the camera distance

2. **Search for the zoom value:**
   - Value Type: `Float`
   - Search for: `150.0` (or your actual zoom)
   - Click "First Scan"

3. **Narrow down by changing zoom:**
   - Scroll mouse wheel to zoom in/out
   - Note the new zoom value
   - Enter new value in Cheat Engine
   - Click "Next Scan"
   - Keep narrowing until you find it

4. **Record the address**
   - Format should be: `0x????????`
   - Example: `0x1BFE8EAD6D0`

### Zoom Value Range

0 A.D. camera zoom typically ranges:
- **Minimum:** 0.0 (fully zoomed out)
- **Default:** 150.0 (normal view)
- **Maximum:** 300.0 (fully zoomed in)

So search for a float between 0.0 and 300.0

## Finding Z Position (Height)

If you want to control camera height:

1. **Note your current camera height**
   - Move camera up/down
   - Try to estimate the Z coordinate

2. **Search in Cheat Engine for that value**
   - It's usually between 0 and 500 or higher

3. **Or skip it** if you only need X, Y, and zoom

## Permanent Solution: Pointer-Based Addressing

Once you find the addresses, we can make them permanent by finding the **base pointer**:

```
In Cheat Engine:
1. Right-click the X address (0x21FEB86F73C)
2. Select "Pointer" → "Scan for this address"
3. This finds what POINTS to this address
4. Repeat until you find a stable base pointer
5. This base pointer + offset works every session
```

**Example:**
```
Base Pointer: 0x12345678
X Offset: 0x100
Y Offset: 0x104
Zoom Offset: 0x108

Instead of hard-coded addresses:
X = Read(0x21FEB86F73C)

Use base pointer + offset:
X = Read(0x12345678 + 0x100)
Y = Read(0x12345678 + 0x104)
Zoom = Read(0x12345678 + 0x108)
```

This makes addresses **persistent** across game sessions!

## Session Notes

**Game Session: 1**
- X Address: 0x21FEB86F73C ✓
- Y Address: 0x1BFE8EAD6CC ✓
- Z Address: SEARCHING
- Zoom Address: SEARCHING
- Base Pointer: NOT FOUND YET

## Next Steps

1. ✅ Continue searching for **Zoom** address
2. ✅ Try to find **Z** address (optional)
3. ⚠️ Test if addresses persist after:
   - Moving to different map
   - Pausing/resuming game
   - Restarting match
4. 🔍 Find base pointer for permanent solution

## Quick Test Commands

Once you have zoom address, test with:

```bash
# Read all positions
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --read

# Move to specific location with zoom
python packages/zeroad-adapter/src/camera/camera-memory-injector.py \
  --x 100 --y 200 --zoom 200 --verify
```

## Important Notes

- ⚠️ Addresses change between sessions (this is normal)
- 🔍 We need pointer-based addressing for permanent solution
- 📝 Keep this log updated as you find new addresses
- ✅ Test each address in-game to verify it works

---

**Current Status:** 2 addresses found, need zoom + base pointer
