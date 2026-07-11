# Camera Control Test - Windows Command Prompt

## Quick Test (Windows)

### Step 1: Start Arena (Command Prompt 1)
```
cd C:\Users\boter\ai-commander
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait for:
```
✓ RL Interface is ready
```

### Step 2: Run Test (Command Prompt 2)

**Option A: Run batch script (Recommended)**
```
cd C:\Users\boter\ai-commander
Mods\test-camera-quick.bat
```

**Option B: Copy-paste individual commands**

#### Test 1: Get camera position
```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"JSON.stringify(Engine.GetCameraData())\"}"
```

Expected output (JSON):
```
{"x":512,"y":100,"z":512,"rotX":45,"rotY":0,"rotZ":0}
```

#### Test 2: Move to center
```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"Engine.SetCameraData(256, 120, 256, 45, 0, 0); 'moved'\"}"
```

Expected output:
```
"moved"
```

Watch the game camera move!

#### Test 3: Move to corner
```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"Engine.SetCameraData(50, 100, 50, 30, 0, 0); 'corner'\"}"
```

Camera should move to corner (left side).

#### Test 4: High altitude view
```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"Engine.SetCameraData(256, 200, 256, 70, 0, 0); 'high'\"}"
```

Camera should zoom out to bird's-eye view.

#### Test 5: Rotate camera
```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"Engine.SetCameraData(256, 100, 256, 45, 0, 90); 'rotate'\"}"
```

Camera should rotate 90 degrees.

---

## What to Watch For

✓ Camera moves smoothly in game window
✓ Each curl command returns output (e.g., "moved")
✓ Camera responds to position changes
✓ No errors in Command Prompt or game

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Make sure arena is running and shows "✓ RL Interface is ready" |
| curl not found | Install curl: `choco install curl` or use `Invoke-WebRequest` in PowerShell |
| Camera doesn't move | Verify game window is visible and not minimized |
| JSON error in output | Normal - game is responding |

---

## Alternative: Use PowerShell

If curl doesn't work in Command Prompt, try PowerShell:

```powershell
Invoke-WebRequest -Uri "http://localhost:6000/evaluate" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"code": "Engine.SetCameraData(256, 120, 256, 45, 0, 0); '\''moved'\''"}'
```

---

## If You Want a Simpler Test

Just use **one** curl command to verify it's working:

```
curl -X POST http://localhost:6000/evaluate -H "Content-Type: application/json" -d "{\"code\": \"JSON.stringify(Engine.GetCameraData())\"}"
```

If you see camera position JSON back, **it's working!** ✅
