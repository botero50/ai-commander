# CheatEngine Camera Address Guide - Step by Step

## What You Need

1. **CheatEngine** - Download from: https://www.cheatengine.org/downloads.php
2. **0 A.D. running** with a game in progress
3. **5 minutes of time**

## How to Find Camera Address

### Step 1: Start a Game

```bash
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait until the game is running and playable (you should see the map with units).

### Step 2: Open CheatEngine

1. Download CheatEngine from: https://www.cheatengine.org/downloads.php
2. Install it
3. Run CheatEngine.exe

You should see a window like this:
```
┌─────────────────────────────────────┐
│ CheatEngine v7.x                    │
├─────────────────────────────────────┤
│ [Open Process] [Scan] [Next Scan]   │
│                                     │
│ Process List...                     │
│ (empty - no process attached)       │
└─────────────────────────────────────┘
```

### Step 3: Attach to pyrogenesis.exe

**In CheatEngine:**

1. Click **"Open Process"** button (or File → Open Process)
   - A list of running processes appears
   
2. Look for **"pyrogenesis.exe"** in the list
   - Scroll down if needed
   - It should show as `pyrogenesis.exe` (0 A.D. game)
   
3. Click on it to select it
   
4. Click **"Open"** button

**Expected result:**
```
┌─────────────────────────────────────┐
│ CheatEngine - pyrogenesis.exe       │
│ (Process ID: 12345)                 │
├─────────────────────────────────────┤
│ [Scan] [Next Scan] [Undo] [Clear]   │
│                                     │
│ Value:  ____________                │
│ Type:   Float                       │
│                                     │
│ Addresses:                          │
│ (none yet)                          │
└─────────────────────────────────────┘
```

**Troubleshooting:**
- If you don't see pyrogenesis.exe, make sure game is running
- You may need to run CheatEngine as Administrator
- If game closed, restart it and try again

### Step 4: Get Camera X Coordinate from Game

This is the key step. You need to find what the current camera X coordinate is.

**Method A: Check Game Console (Easiest)**

1. In 0 A.D. game, press **`** (backtick/grave key, usually top-left of keyboard)
2. Game console opens at top
3. Type: `/pos` or similar command (check 0 A.D. wiki)
4. Look for camera position
5. Write down the **X value** (just the number)

**Method B: Manual Observation**

If console doesn't show position:

1. Look at the game map
2. Estimate a position (e.g., "camera is viewing at around X=500")
3. Note this rough value

**Method C: Use Overlay**

1. Some 0 A.D. installations show FPS + position overlay
2. Press F11 or similar (check settings)
3. Look for position display

**Example values:**
- Camera X: `595.5`
- Camera X: `723.2`
- Camera X: `401.8`

Write down your value! We'll use it next.

### Step 5: Scan for Camera X in CheatEngine

**In CheatEngine:**

1. In the **"Value"** field, enter your camera X coordinate
   - Example: if camera X is `595.5`, type: `595.5`
   
2. Set **"Value Type"** to **"Float"**
   - Click dropdown, select "Float"
   - This is important! Camera uses floating point numbers
   
3. Click **"First Scan"** button

**Expected result:**
```
Addresses found: 427 (or some large number)

Address            Value
─────────────────────────
04A5C8B0          595.5
04A5C9C4          595.5
04A5CAD8          595.5
... (many more)
```

**Important:** You'll get many results. This is normal. We'll narrow it down next.

### Step 6: Narrow Down Results by Moving Camera

Now we filter the results by moving camera in game.

**In 0 A.D. game:**

1. Pan camera to a **different position**
   - Use WASD or mouse to move camera
   - Move it noticeably (not just tiny amount)
   
2. Check new X coordinate (if you can see it)
   - Or just remember you moved it different direction

**Back in CheatEngine:**

1. Enter the **new X value** in the Value field
   - Or just a different value if you can't check exact

2. Click **"Next Scan"** button
   - This filters to only addresses that changed

**Expected result:**
```
Addresses found: 12 (much fewer than before!)

Address            Value
─────────────────────────
04A5C8B0          641.3
04A5C9C4          595.5  (didn't change)
... (few more)
```

### Step 7: Repeat Filter Until You Have 1-2 Results

1. **In game:** Move camera again to another position

2. **Check value:** If possible, note new X coordinate

3. **In CheatEngine:** 
   - Enter new value
   - Click "Next Scan"

4. **Repeat 2-3 times** until you see only **1 or 2 addresses** in results

**Example progression:**
- After scan 1: 427 results
- After scan 2: 43 results
- After scan 3: 5 results
- After scan 4: 2 results ✓
- After scan 5: 1 result ✓✓ PERFECT!

### Step 8: Verify with Z Coordinate

You now have 1-2 candidate addresses for camera X. Let's verify by checking Z coordinate.

**The layout is typically:**
```
Address:  Offset:  Value:
04A5C8B0  +0       Camera X (float)
04A5C8B4  +4       Camera Y (float, usually not used)
04A5C8B8  +8       Camera Z (float) ◄── THIS!
04A5C8BC  +12      Camera Zoom (float)
```

**In CheatEngine:**

1. Double-click your address candidate to add to list at bottom
   - It should show address and current value
   - Example: `04A5C8B0 = 641.3`

2. **Right-click** the address
3. Select **"Disassemble this address"** or view in memory viewer
4. Look at nearby addresses:
   - +0: Your X value ✓
   - +4: Some other value (Y)
   - +8: Should be Z value

**To verify Z:**

1. In game, **only move camera left/right** (X direction)
   - Don't move forward/backward
   
2. Watch address +0 change (X changes) ✓
3. Watch address +8 (should NOT change since you moved X-only)

Then:

1. In game, **move camera forward/backward** (Z direction)
2. Watch address +0 (should NOT change)
3. Watch address +8 (should change) ✓

If this matches, you found it!

### Step 9: Write Down Your Address

**You now have:**

```
Camera X address: 04A5C8B0
Camera Z address: 04A5C8B8 (= Camera X + 8)
Camera Zoom address: 04A5C8BC (= Camera X + 12)
```

**Write this down!** Or take a screenshot.

## Quick Reference

| Value | Offset | Type |
|-------|--------|------|
| Camera X | Base + 0 | Float |
| Camera Y | Base + 4 | Float (ignore) |
| Camera Z | Base + 8 | Float |
| Camera Zoom | Base + 12 | Float |

## Common Issues & Fixes

### "Can't find pyrogenesis.exe in process list"
- Make sure game is running
- Run CheatEngine as Administrator
- Check taskbar to confirm game is open

### "Got 1000+ results and can't narrow down"
- Move camera more drastically (bigger pan)
- Try different initial value (maybe your estimate was off)
- Move camera multiple times between scans
- Use "Undo" and "First Scan" again with better value

### "Address keeps changing"
- This is normal if ASLR is enabled
- Just find it each time (5 minutes)
- Or use relative offsets if you know game base address

### "Value doesn't match camera position"
- You might have the wrong address
- Try the other addresses from the scan results
- Double-check offset +8 is actually Z

## Example Walkthrough

Let's say you do this:

**Initial state:**
- Camera at position (600, 0, 800) - you see this in console
- You want to find address of X=600

**Step 1: First Scan**
```
Value: 600
Type: Float
First Scan → 523 results
```

**Step 2: Move camera right to (750, 0, 800)**
```
Value: 750
Type: Float
Next Scan → 47 results
```

**Step 3: Move camera left to (400, 0, 800)**
```
Value: 400
Type: Float
Next Scan → 3 results
```

**Results:**
```
Address            Value
─────────────────────────
04A5C8B0          400.0  ✓ This one!
7FA12C48          400.0
8BC34E20          400.0
```

**Step 4: Add first one to list**
```
Double-click: 04A5C8B0
```

**Step 5: Verify Z**
```
View address 04A5C8B8 (= 04A5C8B0 + 8)

Move camera X only:
- 04A5C8B0 changes ✓
- 04A5C8B8 stays same ✓

Move camera Z only:
- 04A5C8B0 stays same ✓
- 04A5C8B8 changes ✓

Perfect! Found it!
```

**Your answer:**
```
Base address: 0x04A5C8B0
Camera X: 0x04A5C8B0
Camera Z: 0x04A5C8B8
```

## Next: Update camera-injector.py

Once you have your address:

```python
# Edit: packages/zeroad-adapter/tools/camera-injector.py
# Find line ~95:

CAMERA_ADDRESS = 0x0  # ← Change this

# To your address (without quotes):

CAMERA_ADDRESS = 0x04A5C8B0  # Your address here!
```

Then test:

```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 500 --z 600 --verbose
```

Camera should move in game!

## Troubleshooting Tips

1. **Can't get console to show position?**
   - Check 0 A.D. console commands (press backtick)
   - Or estimate from game coordinates

2. **Results changing each time?**
   - ASLR (Address Space Layout Randomization)
   - Normal on Windows
   - Just re-find it (takes 5 min each time)
   - Or use relative offset from module base

3. **Multiple addresses with same value?**
   - Use Z verification to confirm
   - Only one should correspond to actual camera

4. **Still stuck?**
   - Take a screenshot of CheatEngine results
   - Show what you're seeing
   - We can help narrow down

## Success Checklist

- [ ] CheatEngine installed
- [ ] pyrogenesis.exe attached to CheatEngine
- [ ] Did first scan with camera X value
- [ ] Moved camera and did next scan
- [ ] Narrowed down to 1-2 addresses
- [ ] Verified with Z coordinate
- [ ] Wrote down address: 0x________
- [ ] Updated camera-injector.py
- [ ] Tested with: `python camera-injector.py --x 500 --z 600`
- [ ] Camera moved in game! ✓

Once you complete these steps, you're done with the hard part!
