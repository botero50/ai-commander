# CheatEngine Guide - Finding Camera Address (Working Method)

## The Problem

0 A.D. uses ASLR (Address Space Layout Randomization), which means the memory addresses change **every time you start the game**. This is why static addresses like `0x04A5C8B0` don't work.

## The Solution

We need to find the camera address **for your current game session** using CheatEngine.

## Step-by-Step Guide

### Step 1: Start the Game
```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

The game will pause immediately. Leave it running.

### Step 2: Open CheatEngine

1. Download from https://www.cheatengine.org/ if you don't have it
2. Open CheatEngine
3. Click "Open Process" (or Ctrl+Alt+P)
4. Find and select `pyrogenesis.exe` 
5. Click "Open"

### Step 3: Move Camera to a Known Position

1. In your 0 A.D. game, **manually move the camera** to a specific corner or position
2. Make note of the exact position. You can estimate based on map borders.
3. Use a round number if possible, like (100, 100) or (200, 200)

**Example:** Pan camera to the **TOP-LEFT corner** of the map

### Step 4: First Scan in CheatEngine

1. In CheatEngine, make sure these settings are correct:
   - **Scan Type**: Exact Value
   - **Value Type**: Float
   - **Hex**: Unchecked

2. In the search box, enter your camera X coordinate (e.g., `100`)

3. Click "First Scan"

   You'll get many results (hundreds or thousands). This is normal.

### Step 5: Narrow Down Results

1. **In the game**, move your camera to a **DIFFERENT position**
   - Example: If you were at TOP-LEFT (100,100), move to **BOTTOM-RIGHT** (500,500)
   
2. **In CheatEngine**, search for the new X value (e.g., `500`)
   - Click "Next Scan" (NOT "First Scan")
   - Keep "Exact Value" checked
   
   This will filter down to only addresses that **changed** to your new value.

3. Repeat this process 2-3 more times:
   - Move camera in game
   - Search for new value in CheatEngine
   - This narrows down the results significantly

### Step 6: Find the Exact Address

After narrowing down to a few results (hopefully < 20):

1. In CheatEngine, double-click each address to add it to the "Address List" at the bottom
2. For each address:
   - Write down the address (e.g., `0x7FF608F5C8B0`)
   - **In the game, move the camera and watch the value in CheatEngine**
   - If the value **changes as you move the camera**, that's your X address!

3. Once you find the X address, the Z address is usually **8 bytes later**
   - If X is at `0x7FF608F5C8B0`, then Z is at `0x7FF608F5C8B8`

### Step 7: Verify the Addresses

To make absolutely sure:

1. In CheatEngine, select the X address in your address list
2. Change "Value" to something like `250`
3. Click "Poke" (inject the value)
4. **Look at your game** - did the camera jump?
5. If YES - you found it! ✓
6. If NO - try the next address

### Step 8: Extract the Relative Address

The addresses you find will be **absolute** (they include ASLR randomization):
- Example: `0x7FF608F5C8B0`

To make this work in our tools, we need the **relative offset** from the base address:

```python
# What CheatEngine shows
ABSOLUTE_ADDRESS = 0x7FF608F5C8B0

# Base address (from find-camera-base.py)
BASE_ADDRESS = 0x7ff608f30000

# Relative offset (stays the same each game restart)
RELATIVE_OFFSET = ABSOLUTE_ADDRESS - BASE_ADDRESS
# = 0x7FF608F5C8B0 - 0x7ff608f30000 = 0x2C8B0
```

### Step 9: Update the Camera Injector

Update `packages/zeroad-adapter/tools/camera-injector.py`:

```python
# Replace these with YOUR addresses
CAMERA_X_ADDRESS = 0x7FF608F5C8B0  # Your absolute address from CheatEngine
CAMERA_Z_ADDRESS = 0x7FF608F5C8B8  # Usually X + 8

# Or use relative offset (recommended for restarts)
BASE_ADDRESS = 0x7ff608f30000
CAMERA_X_OFFSET = 0x2C8B0
CAMERA_X_ADDRESS = BASE_ADDRESS + CAMERA_X_OFFSET
```

## Quick Summary

1. **Start game** with arena loop
2. **Open CheatEngine**, attach to pyrogenesis.exe
3. **Move camera** to position, scan for X value in CheatEngine
4. **Move camera** again, narrow down with "Next Scan"
5. **Repeat** 2-3 times until few results remain
6. **Verify** each address by watching if value changes
7. **Copy address** when you find the right one
8. **Update camera-injector.py** with that address
9. **Restart game** and test the injector

## If You Get Stuck

- Make sure camera actually moves when you pan in the game
- Try using round numbers (100, 200, 300) instead of decimals
- Search for Z coordinate to double-check (should be nearby the X)
- If too many results, move camera further between scans
- Make sure "Exact Value" is selected in CheatEngine, not "Increased/Decreased"

## Report Back When Done

Once you find the address, let me know:
```
CAMERA_X_ADDRESS = 0x7FF608F5C8B0
CAMERA_Z_ADDRESS = 0x7FF608F5C8B8
```

And I can update the injector and test it!
