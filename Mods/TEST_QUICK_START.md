# Camera Control - Quick Test Start

## 3-Minute Test

### Step 1: Start the Arena (Terminal 1)
```bash
cd C:\Users\boter\ai-commander
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait for this message:
```
✓ RL Interface is ready
```

### Step 2: Run Quick Test (Terminal 2)
```bash
cd C:\Users\boter\ai-commander
bash Mods/test-camera-quick.sh
```

You should see:
```
✅ ALL TESTS PASSED!
```

And in the game window, you should see the camera move to different positions!

---

## What the Test Does

1. ✅ Checks RL Interface is running
2. ✅ Gets current camera position
3. ✅ Moves camera to center
4. ✅ Moves camera to corner
5. ✅ Verifies position changed
6. ✅ Moves to high altitude
7. ✅ Rotates camera

---

## Manual Test (If Script Doesn't Work)

### Terminal 2: Test one command at a time

**Get camera position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "JSON.stringify(Engine.GetCameraData())"}'
```

Expected output:
```json
{"x":512,"y":100,"z":512,"rotX":45,"rotY":0,"rotZ":0}
```

**Move camera:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(300, 100, 300, 45, 0, 0); \"moved\""}'
```

Expected output:
```
"moved"
```

Watch the game camera move in the window!

---

## Verify It's Working

You should observe in the game window:

1. **First move:** Camera transitions smoothly to center of map
2. **Second move:** Camera moves to corner (left side)
3. **High altitude:** Camera zooms out to bird's-eye view
4. **Rotation:** Camera view rotates 90 degrees

If you see the camera move, **it's working! ✅**

---

## Troubleshooting

**"Connection refused"**
- Make sure Terminal 1 shows `✓ RL Interface is ready`
- If not, wait another 10 seconds and try again

**"mod not loaded"**
- This is OK - the mod is still enabled
- Camera control still works via RL Interface

**Camera doesn't move**
- Verify game window is visible and responsive
- Check Terminal 1 logs for errors
- Try moving manually in-game with mouse to verify game isn't frozen

**Script fails**
- Make sure you're in the correct directory
- Try running a single curl command instead

---

## Next Steps

Once basic test works:

1. **Read full testing guide:** `Mods/TESTING_GUIDE.md`
2. **Run unit tests:** `npm test -- camera-controller.test.ts`
3. **Integrate with AutomaticCameraManager** for in-match usage
4. **Create custom camera movements** for your broadcasts

---

## File Locations

- **Quick test script:** `Mods/test-camera-quick.sh`
- **Full testing guide:** `Mods/TESTING_GUIDE.md`
- **Controller code:** `packages/zeroad-adapter/src/rl-interface/camera-controller.ts`
- **Arena integration:** `packages/zeroad-adapter/src/arena/run-arena-loop.ts`
