# Camera Control Test - Windows Step-by-Step

## The Issue

The game needs time to fully initialize. The `null` response means:
- RL Interface is listening ✓
- But game hasn't fully initialized yet

## Solution: Wait for Game to Start

### Step 1: Start Arena in Command Prompt 1
```
cd C:\Users\boter\ai-commander
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

**IMPORTANT: Wait for these messages:**
```
✓ RL Interface is ready
✓ Automatic camera manager started
🎮 Match started - Initial game tick: 8000
```

This usually takes **15-30 seconds** after the game window opens.

### Step 2: Open NEW Command Prompt 2
Don't close Command Prompt 1! Open a new one.

### Step 3: Wait Additional 10 Seconds
Give the game time to fully initialize.

### Step 4: Copy-Paste Test Command

Copy this exact line into Command Prompt 2:

```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"JSON.stringify(Engine.GetCameraData())\"}"
```

### Step 5: Expected Results

**Good response (camera control ready):**
```json
{"x":512,"y":100,"z":512,"rotX":45,"rotY":0,"rotZ":0}
```

**Null response (game still initializing):**
```
null
```
→ Wait another 5 seconds and try again

---

## Simple Test - Just Move Camera

If you get JSON response, try moving the camera:

```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"Engine.SetCameraData(300, 100, 300, 45, 0, 0); 'moved'\"}"
```

Expected response:
```
"moved"
```

Watch the game window - camera should move!

---

## Timing Guide

| Time | What's Happening | What to Do |
|------|-----------------|-----------|
| 0-5s | Game launching | Wait |
| 5-10s | Game window opening | Wait |
| 10-15s | Game loading map | Wait |
| 15-30s | RL Interface initializing | Check logs for "RL Interface is ready" |
| 30s+ | Game fully ready | **NOW you can test camera** |

---

## Batch Script for Windows

If you prefer automated testing, run this:

```
Mods\test-camera-quick.bat
```

But you still need to wait for "Match started" message first.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Get `null` repeatedly | Game not fully initialized yet. Wait longer and try again. |
| Connection refused | Arena not running. Check Command Prompt 1. |
| `curl` not found | Install from https://curl.se/windows/ or use `Invoke-WebRequest` in PowerShell |
| Camera doesn't move | Normal - still initializing. Wait 10 more seconds. |

---

## Timeline Example

```
C:\Users\boter\ai-commander> npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
[0s] 🟢 Starting fresh 0 A.D. instance...
[5s] ⏳ Waiting 5s for game to start...
[10s] 📡 Waiting for RL Interface to be ready...
[15s] ✓ RL Interface is ready ← It's listening now
[20s] ✓ Automatic camera manager started
[25s] 🎮 Match started - Initial game tick: 8000 ← NOW test camera
```

After "Match started", open another Command Prompt and test:

```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"JSON.stringify(Engine.GetCameraData())\"}"
```

You should get JSON back! ✅

---

## If Still Having Issues

1. Make sure 0 A.D. game window is visible
2. Check that the game isn't paused or in a menu
3. Wait at least 30 seconds from "Match started"
4. Try the command again

The game takes time to fully initialize all systems. Patience is key! 🎮
