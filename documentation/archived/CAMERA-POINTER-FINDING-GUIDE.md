# Finding Camera Pointer (Permanent Base Address)

## Problem: Addresses Change Every Session

You've discovered that addresses change between game sessions:
- Session 1: X at `0x21FEB86F73C`, Y at `0x1BFE8EAD6CC`
- Session 2: May be at completely different addresses!

**Solution: Find the base POINTER that points to these addresses**

---

## What is a Pointer?

A pointer is a memory address that **contains another memory address**.

```
Base Pointer (stable):     0x140ABC123
    └─ Points to:          0x1BFE8EAD6CC (current X value)
                           
This way, we find ONCE and reuse every session
```

---

## Step 1: Get Your Current Address Again

1. **Start 0 A.D. in a match**
2. **Open Cheat Engine**
3. **Find your X position value again**
   - Note the address (e.g., `0x21FEB86F73C`)
   - Right-click the address
   - Select "Pointer" or "Scan for Pointers"

## Step 2: Find What Points to Your Address

### In Cheat Engine:

1. **Right-click your found X address**
2. **Select "Pointer" → "Scan for pointer"**
3. **A new window opens**
   - Scope: Keep default or set reasonable limits
   - Click "OK"

4. **Wait for scan to complete**
   - This may take 30 seconds to several minutes
   - Cheat Engine searches all memory for pointers

## Step 3: Identify the Stable Pointer

When scan completes, you'll see a list of potential pointers:

```
[+] 0x140A1A2C -> 0x1BFE8EAD6CC
[+] 0x140A1A30 -> 0x1BFE8EAD6CC
[+] 0x12345678 -> 0x1BFE8EAD6CC
... many more ...
```

**To find the STABLE one:**

1. **Restart the game** (or go to a different map)
2. **Re-scan with Cheat Engine**
3. **See which addresses stay the same**
   - If `0x140A1A2C` appears again = probably stable
   - If it's different = probably not stable

## Step 4: Find Offsets

Once you have a stable base pointer (e.g., `0x140A1A2C`):

1. **Calculate the offset for X:**
   ```
   Offset = Actual Address - Base Pointer
   Offset = 0x21FEB86F73C - 0x140A1A2C
   ```

2. **Do the same for Y address**
3. **Do the same for Zoom address**

### Example Result

```
Base Pointer: 0x140A1A2C (stable)
X Offset:     0x100
Y Offset:     0x104
Zoom Offset:  0x108
```

Then every session:
```
X Address =    Base Pointer + 0x100
Y Address =    Base Pointer + 0x104
Zoom Address = Base Pointer + 0x108
```

---

## Step 5: Update the Python Script

Once you have base pointer + offsets:

```python
# In camera-memory-injector.py

# Base pointer (must be found in Cheat Engine)
BASE_POINTER = 0x140A1A2C

# Offsets (calculated from multiple addresses)
OFFSETS = {
    'x_position': 0x100,
    'y_position': 0x104,
    'zoom': 0x108,
}

# Function to resolve address
def resolve_address(base_ptr, offset):
    """Read pointer and add offset"""
    ptr_value = read_int64(base_ptr)  # Read what base pointer points to
    return ptr_value + offset
```

---

## Alternative: Trace Back the Pointer Chain

If simple pointer scan doesn't work:

1. **Find your X address** (e.g., `0x21FEB86F73C`)
2. **In Cheat Engine: Pointer → Scan for pointer**
3. **Get results** (e.g., `0x140A1A2C`)
4. **Right-click that result**
5. **Select "Pointer" → "Scan for pointer"**
6. **Repeat** until you find a stable base

This gives you a **pointer chain**:
```
0x140ABC123 → 0x140A1A2C → 0x21FEB86F73C
              (pointer 1)    (pointer 2)    (actual value)
```

---

## Quick Test After Finding Pointer

Once you have base pointer + offsets, test with this formula:

```python
import struct

def read_memory_chain(pm, base_ptr, offset):
    """Read through pointer chain to get actual address"""
    # Read what base pointer points to
    data = pm.read_bytes(base_ptr, 8)  # 8 bytes for 64-bit pointer
    ptr = struct.unpack('Q', data)[0]  # Unpack as unsigned long long
    
    # Add offset to get final address
    final_addr = ptr + offset
    
    # Read float at final address
    data = pm.read_bytes(final_addr, 4)
    value = struct.unpack('f', data)[0]
    
    return value

# Usage
x_value = read_memory_chain(pm, 0x140A1A2C, 0x100)
print(f"X Position: {x_value}")
```

---

## Why This Matters

**Without pointer:**
- Addresses change every session
- Have to re-find them every time
- Script breaks when game restarts

**With pointer:**
- Base pointer stays same forever
- Offsets are calculated once
- Script works every session automatically

---

## Next Steps

1. **Find your X address in current game session**
2. **Use Cheat Engine pointer scan**
3. **Identify stable base pointer**
4. **Calculate offsets for X, Y, Zoom**
5. **Update Python script with base pointer + offsets**
6. **Test across multiple game sessions**

---

## Commands to Test Current Addresses (Before Finding Pointer)

If addresses work right now:

```bash
# Read current position
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --read

# Try to set position
python packages/zeroad-adapter/src/camera/camera-memory-injector.py --x 100 --y 200

# Watch if camera moves in-game
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not read memory" | Address changed - re-scan in Cheat Engine |
| "Pointer scan takes too long" | Reduce scope in Cheat Engine or restart game |
| "Found thousands of pointers" | Narrow down by restarting game and checking which persist |
| "Offsets don't work" | Recalculate - check your math on hex addresses |

---

## Resources

- **Cheat Engine Wiki:** https://github.com/cheat-engine/cheat-engine/wiki
- **Pointer Scanning Guide:** Google "Cheat Engine pointer scan tutorial"
- **0 A.D. Modding:** Check 0 A.D. wiki for memory structure info

---

## Status

Once you have:
- ✓ Base pointer (stable across sessions)
- ✓ Offsets for X, Y, Zoom
- ✓ Updated Python script

You'll have a **permanent solution** that works every time! 🎯
