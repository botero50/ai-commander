# CheatEngine - Visual Guide with Screenshots

This is what you'll see at each step.

## Download CheatEngine

### Step 1: Get CheatEngine

Go to: https://www.cheatengine.org/downloads.php

Download "CheatEngine 7.x" (any recent version)

Install and run it.

## Running CheatEngine

### What the window looks like:

```
╔════════════════════════════════════════════════╗
║  CheatEngine 7.5 - No process selected        ║
╠════════════════════════════════════════════════╣
║                                                ║
║  [Open Process]  [Scan]  [Next Scan]  [Undo]  ║
║                                                ║
║  Value:     [________________]                 ║
║                                                ║
║  Value Type: [Float ▼]                         ║
║                                                ║
║  Scan Type:  [Exact value ▼]                   ║
║                                                ║
║  ────────────────────────────────────────────  ║
║                                                ║
║  Results:                                      ║
║  ┌────────────────────────────────────────────┐║
║  │ (no results - attach to process first)     │║
║  └────────────────────────────────────────────┘║
║                                                ║
╚════════════════════════════════════════════════╝
```

## Step 1: Click "Open Process"

Click the button labeled **"Open Process"**

```
╔════════════════════════════════════════════════╗
║  CheatEngine - Select Process                  ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Process:                                      ║
║  ┌────────────────────────────────────────────┐║
║  │ chrome.exe        (PID: 5432)               │║
║  │ notepad.exe       (PID: 7652)               │║
║  │ pyrogenesis.exe   (PID: 9876) ◄── CLICK   │║
║  │ explorer.exe      (PID: 3210)               │║
║  │ svchost.exe       (PID: 1234)               │║
║  │                                              │║
║  └────────────────────────────────────────────┘║
║                                                ║
║               [Open]  [Cancel]                 ║
║                                                ║
╚════════════════════════════════════════════════╝
```

## Step 2: Select pyrogenesis.exe

Look for **pyrogenesis.exe** in the process list.

It should be there if your game is running.

Click it to select it (it will highlight).

## Step 3: Click Open

Click the **"Open"** button.

CheatEngine will attach to the game process.

Now it looks like:

```
╔════════════════════════════════════════════════╗
║  CheatEngine - pyrogenesis.exe (PID: 9876)    ║
╠════════════════════════════════════════════════╣
║                                                ║
║  [Open Process]  [Scan]  [Next Scan]  [Undo]  ║
║                                                ║
║  Value:     [595.5____________]  ◄── ENTER   ║
║                                      YOUR VALUE║
║  Value Type: [Float ▼]                         ║
║                                                ║
║  Scan Type:  [Exact value ▼]                   ║
║                                                ║
║  ────────────────────────────────────────────  ║
║                                                ║
║  Results: 0 (waiting for scan)                 ║
║                                                ║
╚════════════════════════════════════════════════╝
```

## Step 4: Get Camera X Value

**IN YOUR GAME:**

Press backtick **`** (usually top-left key, below ESC)

Game console opens:

```
0 A.D. Game Window
┌───────────────────────────────────────────┐
│ [Console]                                  │
│ > /pos                                    │
│ Camera position: X=595.5 Y=0 Z=804.2     │
│                         ▲
│                   THIS VALUE
│ ___________________________________|_____ │
│                                          │
│ (game view below)                        │
└───────────────────────────────────────────┘
```

**Example camera positions you might see:**
- X = 595.5
- X = 723.2
- X = 401.8
- X = 150.0

Write down the **X value** you see.

## Step 5: Enter Value in CheatEngine

In CheatEngine, click the **"Value"** field and type your X coordinate:

```
╔════════════════════════════════════════════════╗
║  CheatEngine - pyrogenesis.exe                 ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Value:     [595.5____________] ◄── TYPE HERE║
║                  ▲
║            YOUR CAMERA X
║  Value Type: [Float ▼]                         ║
║                                                ║
║  [First Scan]                                  ║
║                                                ║
║  Results: (waiting...)                         ║
║                                                ║
╚════════════════════════════════════════════════╝
```

Make sure **Value Type** is set to **"Float"** (click dropdown if needed).

## Step 6: Click "First Scan"

Click the **"First Scan"** button.

CheatEngine scans the entire game memory for values matching your number.

This takes a few seconds...

Results appear:

```
╔════════════════════════════════════════════════╗
║  CheatEngine - pyrogenesis.exe                 ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Value:     [595.5]                            ║
║  Value Type: [Float ▼]                         ║
║                                                ║
║  [First Scan]  [Next Scan]  [Undo]             ║
║                                                ║
║  Results: 523 found  ◄── MANY RESULTS!        ║
║                          (This is normal)     ║
║  ┌────────────────────────────────────────────┐║
║  │ Address            Value                   │║
║  │ ──────────────────────────────────          │║
║  │ 04A5C8B0          595.5 ◄── MIGHT BE IT?  │║
║  │ 04A5C9C4          595.5                    │║
║  │ 04A5CAD8          595.5                    │║
║  │ 04A5CDF4          595.5                    │║
║  │ 04A5CEA8          595.5                    │║
║  │ 04A5D1C4          595.5                    │║
║  │ 04A5D2B8          595.5                    │║
║  │ ... (513 more)                            │║
║  └────────────────────────────────────────────┘║
║                                                ║
╚════════════════════════════════════════════════╝
```

Don't worry! 523 results is normal. We'll narrow it down.

## Step 7: Move Camera in Game

**IN YOUR GAME:**

Use WASD or mouse to **move camera to a different position**.

Move it noticeably (not just 1 unit).

Example: If you were at X=595.5, move to X=723.2

Check the new value in console (press ` again):

```
Game console:
> /pos
Camera position: X=723.2 Y=0 Z=804.2
                 ▲
            NEW VALUE
```

## Step 8: Enter New Value and "Next Scan"

**IN CHEATENGINE:**

1. Clear the **Value** field
2. Type the **new X value** (723.2)
3. Click **"Next Scan"**

```
╔════════════════════════════════════════════════╗
║  CheatEngine                                   ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Value:     [723.2____________] ◄── NEW VALUE ║
║  Value Type: [Float ▼]                         ║
║                                                ║
║  [First Scan]  [Next Scan]  [Undo]             ║
║       ◄── CLICK HERE
║                                                ║
║  Results: 47 found  ◄── MUCH FEWER!           ║
║                                                ║
║  ┌────────────────────────────────────────────┐║
║  │ Address            Value                   │║
║  │ ──────────────────────────────────          │║
║  │ 04A5C8B0          723.2 ◄── LIKELY ONE!   │║
║  │ 04A5C9C4          723.2                    │║
║  │ 04A5CAD8          595.5 ◄── WRONG         │║
║  │ 04A5CDF4          723.2                    │║
║  │ 04A5CEA8          723.2                    │║
║  │ ... (42 more)                             │║
║  └────────────────────────────────────────────┘║
║                                                ║
╚════════════════════════════════════════════════╝
```

Great! Down to 47 results. Repeat this process again.

## Step 9: Repeat Until 1-2 Results

Do steps 7-8 again:

1. Move camera again in game
2. Check new X value
3. Enter new value in CheatEngine
4. Click "Next Scan"

**Second iteration:**

Game: X = 401.8 (moved left)

CheatEngine:
```
Value: [401.8]
Next Scan

Results: 5 found  ◄── GETTING CLOSE!
┌──────────────────────────────┐
│ 04A5C8B0    401.8 ◄── LIKELY │
│ 04A5C9C4    401.8            │
│ 04A5CDF4    401.8            │
│ 04A5CEA8    723.2 ◄── WRONG  │
│ 04A5D2B8    401.8            │
└──────────────────────────────┘
```

**Third iteration:**

Game: X = 150.0 (moved more left)

CheatEngine:
```
Value: [150.0]
Next Scan

Results: 1 found  ◄── PERFECT!
┌──────────────────────────────┐
│ 04A5C8B0    150.0 ✓ FOUND!  │
└──────────────────────────────┘
```

## Step 10: Double-Click to Add to List

Once you have **1 or 2 results**, double-click the address to add it to the tracking list at the bottom.

```
╔════════════════════════════════════════════════╗
║  CheatEngine                                   ║
╠════════════════════════════════════════════════╣
║                                                ║
║  (Scan controls at top...)                     ║
║                                                ║
║  Results: 1 found                              ║
║  ┌────────────────────────────────────────────┐║
║  │ 04A5C8B0    150.0                           │║
║  └────────────────────────────────────────────┘║
║              ▲
║        DOUBLE CLICK THIS
║                                                ║
║  ════════════════════════════════════════════  ║
║                                                ║
║  Address List (at bottom):                     ║
║  ┌────────────────────────────────────────────┐║
║  │ Address        Value                       │║
║  │ ─────────────────────────────────          │║
║  │ 04A5C8B0       150.0 ◄── ADDED!            │║
║  │                                             │║
║  └────────────────────────────────────────────┘║
║                                                ║
╚════════════════════════════════════════════════╝
```

## Step 11: Verify Z Coordinate

Right-click on the address you added:

```
Context Menu:
├─ Add address to list
├─ Disassemble this address
├─ View in hex editor
├─ Investigate this address  ◄── CLICK
└─ Remove
```

The address layout is usually:
```
Offset +0:   Camera X ✓ (this is 150.0)
Offset +4:   Camera Y  (usually not needed)
Offset +8:   Camera Z  ◄── Should be here!
Offset +12:  Camera Zoom
```

You can view nearby memory to confirm offset +8 contains the Z value.

## Verification Test

In game:
1. Move camera **LEFT/RIGHT ONLY** (change X, not Z)
   - Value at offset +0 should change
   - Value at offset +8 should STAY SAME

2. Move camera **FORWARD/BACKWARD** (change Z, not X)
   - Value at offset +0 should STAY SAME
   - Value at offset +8 should change

If this matches → You found it! ✓

## Step 12: Write Down Your Address

You now have:

```
Base Address: 0x04A5C8B0
```

Or with offsets:
```
Camera X: 0x04A5C8B0 + 0 = 0x04A5C8B0
Camera Z: 0x04A5C8B0 + 8 = 0x04A5C8B8
```

## Update camera-injector.py

Edit the file:
```
packages/zeroad-adapter/tools/camera-injector.py
```

Find line around 95:
```python
CAMERA_ADDRESS = 0x0
```

Change to your address:
```python
CAMERA_ADDRESS = 0x04A5C8B0
```

## Test It!

```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 500 --z 600 --verbose
```

**Expected output:**
```
[Camera] Found pyrogenesis.exe (PID: 9876)
[Camera] Attached to process 9876
[Camera] Injecting camera position
    Base address: 0x4A5C8B0
    X: 500
    Z: 600
[Camera] Wrote X: 500.0
[Camera] Wrote Z: 600.0
[Camera] ✓ Camera position updated: (500, 600)
```

**In game:** Camera should jump to position (500, 600)!

## Success! 🎉

You've found the camera memory address and moved the camera!

Next: Integrate with activity detection for fully automated camera.

---

## Quick Summary

| Step | What | Result |
|------|------|--------|
| 1 | Start game | Game running |
| 2 | Open CheatEngine | CheatEngine window open |
| 3 | Attach to pyrogenesis.exe | Connected to game |
| 4 | Get camera X from console | Have X value |
| 5 | Scan for X value | 523 results |
| 6 | Move camera, scan again | 47 results |
| 7 | Move camera, scan again | 5 results |
| 8 | Move camera, scan again | 1 result ✓ |
| 9 | Write down address | Have 0x04A5C8B0 |
| 10 | Update camera-injector.py | Script configured |
| 11 | Test | Camera moves! 🎉 |

That's it!
