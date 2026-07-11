# Automatic Camera Address Finder

I've created an automatic tool that will find the camera memory address for you. No CheatEngine needed!

## How It Works

The script will:
1. Attach to the running 0 A.D. process
2. Ask you for the current camera position
3. Scan memory to find that position
4. Watch for changes as you move the camera
5. Identify which address is the camera
6. Give you the final address

## Setup (2 minutes)

```bash
# Install Python library (Windows PowerShell or CMD)
pip install pymem psutil
```

## Usage (5 minutes)

### Option 1: Simple Command (Windows)
```bash
cd packages\zeroad-adapter\tools
python find-camera-address.py
```

### Option 2: With npm script
```bash
npm run find-camera
```

## Step-by-Step

1. **Start 0 A.D. with a game in progress:**
   ```bash
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
   ```

2. **In another terminal, run the finder:**
   ```bash
   python packages/zeroad-adapter/tools/find-camera-address.py
   ```

3. **When prompted, enter your camera position:**
   - Look at the game map
   - Find a reference point (like your town center or a unique landmark)
   - Note the X and Z coordinates (usually you can see these on the map)
   - Example: X=128, Z=128 for center of a small map
   - If you don't know, just use 128, 128

4. **Move your camera around when the script says to:**
   - The script will say "MOVE YOUR CAMERA NOW"
   - Pan the camera left/right, up/down in the game
   - This helps the script identify which memory addresses are the camera

5. **Script will find the address and print it:**
   ```
   ✅ CAMERA ADDRESS FOUND!
   
   📸 Camera X Address: 0x04A5C8B0
   📸 Camera Z Address: 0x04A5C8B8
   ```

## What to Do With the Address

Once you have the address, update the Python injector:

```python
# packages/zeroad-adapter/tools/camera-injector.py
CAMERA_X_ADDRESS = 0x04A5C8B0  # Replace with your address
CAMERA_Z_ADDRESS = 0x04A5C8B8  # Replace with your address
```

Then test it:
```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 300 --z 300 --verbose
```

You should see the camera move in the game!

## If It Doesn't Work

**"pyrogenesis.exe not found"**
- Make sure 0 A.D. is running a game (not just the menu)
- Check Task Manager that pyrogenesis.exe is there

**"Could not find initial camera position"**
- The coordinates you entered might be wrong
- Try center coordinates: X=128, Z=128
- Or try a different range like X=64, Z=64

**"Values didn't change"**
- You might not have moved the camera enough
- Try larger camera movements (drag far across the map)
- Try running again

## Technical Details

The script performs these steps:

1. **Attach to Process** - Connects to pyrogenesis.exe using pymem
2. **Scan Memory** - Searches for floating-point values matching your camera position
3. **Fuzzy Match** - If exact match fails, looks for nearby values (within 0.5 units)
4. **Filter by Z** - Checks if addresses near the X coordinate also have matching Z values
5. **Watch for Changes** - Records memory values, waits 10 seconds, detects what changed
6. **Verify** - Confirms the address still changes when you move camera again

All of this happens automatically - you just need to move the camera when prompted!

## Performance

- Scanning: 30-60 seconds (first time, depends on map size in memory)
- Watching: 10 seconds (while you move camera)
- Total time: ~2 minutes
