# CheatEngine - Simplified Guide (Now with Initial Position!)

## The Easy Way - You Now Have Initial Position!

### What's New

The arena loop **now automatically displays the initial camera position** when it detects the first gathering activity:

```
╔════════════════════════════════════════════════════╗
║          📸 FIRST CAMERA POSITION DETECTED          ║
╠════════════════════════════════════════════════════╣
║  X Coordinate: 579.70                              ║
║  Z Coordinate: 814.20                              ║
║                                                    ║
║  USE THESE VALUES IN CHEATENGINE:                  ║
║  1. Open CheatEngine (attach to pyrogenesis.exe)   ║
║  2. Value Type: Float                              ║
║  3. Search for X = 579.70                      ║
║  4. Narrow down, then verify with Z = 814.20       ║
╚════════════════════════════════════════════════════╝
```

You don't need to manually find the initial position anymore!

## Super Simple Steps

### Step 1: Start the Game

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait ~30 seconds for the arena to start and units to gather.

### Step 2: Copy Initial Position

When you see the box:
```
║  X Coordinate: 579.70                              ║
║  Z Coordinate: 814.20                              ║
```

**Write down or screenshot these values!**

Example values you might see:
- X: 579.70
- Z: 814.20

Or:
- X: 623.45
- Z: 801.33

(Each game is different)

### Step 3: Open CheatEngine

1. Download from: https://www.cheatengine.org/downloads.php
2. Run CheatEngine.exe

### Step 4: Attach to Game

1. Click "Open Process"
2. Find "pyrogenesis.exe" in the list
3. Click it
4. Click "Open"

### Step 5: First Scan (Easy!)

In CheatEngine:
1. **Value** field: Type your X value (e.g., `579.70`)
2. **Value Type**: Select "Float" from dropdown
3. Click **"First Scan"**

CheatEngine will find ~400-500 addresses. This is normal!

### Step 6: Narrow Down (Move Camera)

**In your game:**
- Press WASD or mouse to move camera to a different position
- Move it a good distance away

**Back in CheatEngine:**
1. Look at the new X coordinate (you can estimate or check game)
2. Type the new value in **Value** field (e.g., `623.45`)
3. Click **"Next Scan"**

Results go from 500 → 50 addresses. Much better!

### Step 7: Repeat One More Time

Do step 6 again:
1. Move camera again in game
2. Enter new X value
3. Click "Next Scan"

Now you should have **2-5 addresses** remaining.

### Step 8: Verify with Z

The address we want has this layout:
```
Offset +0:  Camera X (579.70)  ← We found this
Offset +4:  Camera Y (not used)
Offset +8:  Camera Z (814.20)  ← Should be here!
```

**In CheatEngine:**
- Double-click your address to add to tracking list
- Look at the address (e.g., `0x04A5C8B0`)

**In Game:**
- Move camera **LEFT/RIGHT ONLY** (change X, not Z)
  - Look at your tracking list
  - Value at +0 should change
  - Value at +8 should STAY SAME ✓

- Move camera **FORWARD/BACKWARD** (change Z, not X)
  - Value at +0 should STAY SAME ✓
  - Value at +8 should change

If both checks pass → **You found it!** 🎉

### Step 9: Write Down Your Address

You now have:
```
Camera X address: 0x04A5C8B0 (example)
```

## That's It!

Now go to **HOW-TO-START-MEMORY-INJECTION.md** Phase 3:

```bash
pip install pymem psutil
```

Edit: `packages/zeroad-adapter/tools/camera-injector.py`

Change:
```python
CAMERA_ADDRESS = 0x04A5C8B0  # Your address here
```

Test:
```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 500 --z 600 --verbose
```

**Camera moves in game! ✓**

## Quick Reference

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start game | See initial position box |
| 2 | Copy X and Z values | Have 579.70 and 814.20 (or your values) |
| 3 | Open CheatEngine | CheatEngine window open |
| 4 | Attach to pyrogenesis.exe | CheatEngine says "connected" |
| 5 | Search X value | 500+ results (normal!) |
| 6 | Move camera, search again | 50 results (much better!) |
| 7 | Move camera, search again | 2-5 results (almost there!) |
| 8 | Verify Z offset | Confirm offset +8 is Z ✓ |
| 9 | Write down address | Have 0x04A5C8B0 (or yours) |
| 10 | Run Python tool | Camera moves! 🎉 |

## Example Walkthrough

**Game output:**
```
║  X Coordinate: 579.70
║  Z Coordinate: 814.20
```

**CheatEngine search 1:**
```
Value: 579.70
Type: Float
First Scan → 487 results
```

**Move camera left in game, now at ~650, 814**

**CheatEngine search 2:**
```
Value: 650
Next Scan → 43 results
```

**Move camera up in game, now at ~650, 900**

**CheatEngine search 3:**
```
Value: 650
Next Scan → 2 results ✓

Results:
0x04A5C8B0 = 650.0 ← This one!
0x07FA12C4 = 650.0
```

**Verify:**
```
Double-click: 0x04A5C8B0 (add to list)

Move camera left only:
- Address +0 (650.0) changes ✓
- Address +8 (900.0) stays same ✓

Move camera up only:
- Address +0 (650.0) stays same ✓
- Address +8 (900.0) changes ✓

Perfect! Found it!
```

**Update script:**
```python
CAMERA_ADDRESS = 0x04A5C8B0
```

**Test:**
```bash
python camera-injector.py --x 500 --z 600 --verbose
```

**Result: Camera moves!** 🎉

## Troubleshooting

**Q: I don't see the initial position box**
A: Wait 30-40 seconds for game to start and units to gather

**Q: Game is running but no box appeared**
A: Check the terminal - scroll up to see if it's there
A: Or run again and wait longer

**Q: CheatEngine showing thousands of results**
A: Move camera more drastically between scans
A: Make sure you're entering the X value correctly (with decimal)

**Q: Can't find pyrogenesis.exe in process list**
A: Run CheatEngine as Administrator
A: Make sure game is running (check taskbar)

**Q: Got 2 addresses, which one?**
A: Test one with Z verification
A: If wrong, undo and try the other

## The New Workflow

**BEFORE:** Had to figure out initial position manually
**NOW:** System tells you exactly what to search for!

```
Game: "X Coordinate: 579.70"
You: Open CheatEngine
You: Search for 579.70
CheatEngine: "Found 487 results"
You: Move camera
You: Search for new X
CheatEngine: "Found 2 results"
You: Verify with Z
You: Found it! ✓
```

Much simpler! You're just following the printed instructions.

---

**Next:** Follow this guide, get your address, then configure camera-injector.py!

Ready? Start the game and look for the box! 🚀
