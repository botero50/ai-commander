# JSON Debug Data Files

## Summary
These are the data extraction endpoints and files used to analyze camera movement and target detection.

## Files to Review

### 1. **camera-test-data.json** (Camera Targets)
```bash
curl -s http://localhost:8080/api/debug/camera-test > camera-test-data.json
```
**Contains:** The extracted camera targets (P1 and P2 civil centre positions)
- `p1Pos`: Target coordinates for Player 1
- `p2Pos`: Target coordinates for Player 2
- `p1Building`: Details of P1's civil centre structure
- `p2Building`: Details of P2's civil centre structure

**Example:**
```json
{
  "tick": 300,
  "p1Pos": {"x": 625, "z": 356},
  "p2Pos": {"x": 440, "z": 844},
  "p1Building": {"template": "structures/cart/civil_centre", "x": 625, "z": 356},
  "p2Building": {"template": "structures/kush/civil_centre", "x": 440, "z": 844}
}
```

### 2. **world-state-data.json** (All Game Entities)
```bash
curl -s http://localhost:8080/api/debug/world-state > world-state-data.json
```
**Contains:** All units and buildings with their positions at tick 300
- `p1Units[]`: All Player 1 units with x,z coordinates
- `p2Units[]`: All Player 2 units with x,z coordinates
- `p1Buildings[]`: All Player 1 buildings (including civil centre)
- `p2Buildings[]`: All Player 2 buildings (including civil centre)

**Example Structure:**
```json
{
  "p1Units": [
    {"template": "units/cart/infantry_archer_b", "x": 598, "z": 349},
    {"template": "units/cart/support_civilian", "x": 588, "z": 363}
  ],
  "p1Buildings": [
    {"template": "structures/cart/civil_centre", "x": 625, "z": 356}
  ]
}
```

### 3. **camera-position-data.json** (Camera Position)
```bash
curl -s http://localhost:8080/api/debug/camera-position > camera-position-data.json
```
**Contains:** Current camera position and targets
- `p1Target`: P1 camera target coordinates
- `p2Target`: P2 camera target coordinates

**Example:**
```json
{
  "p1Target": {"x": 625, "z": 356},
  "p2Target": {"x": 440, "z": 844},
  "message": "Camera targets from last test run. Check logs for real-time position updates."
}
```

---

## How the Data is Used

### Data Flow Diagram
```
World State (/api/debug/world-state)
    ↓
    Contains: p1Buildings[], p2Buildings[]
    ↓
Extract civil_centre building positions (line ~1010 in run-arena-loop.ts)
    ↓
Camera Test (/api/debug/camera-test)
    ↓
    Contains: p1Pos, p2Pos
    ↓
Send to camera controller: eventCamera.moveToEvent(x: p1Pos.x, z: p1Pos.z)
    ↓
Camera Movement Log Output
    ↓
[CAMERA TEST +0.2s] CURRENT: (512, 512) → TARGET: (625, 356) | Distance: 150
```

---

## Endpoint Summary Table

| Endpoint | File | Purpose | Key Data |
|----------|------|---------|----------|
| `/api/debug/world-state` | world-state-data.json | All game entities | All buildings/units with positions |
| `/api/debug/camera-test` | camera-test-data.json | Extracted targets | P1/P2 civil centre coordinates |
| `/api/debug/camera-position` | camera-position-data.json | Target status | P1/P2 targets from last run |

---

## Real Example Data

### From Latest Run:
- **P1 Civil Centre:** x=625, z=356 (Carthage)
- **P2 Civil Centre:** x=440, z=844 (Kush)
- **Map Center:** x=512, z=512 (camera starts here)
- **P1 Distance:** 186 units from center
- **P2 Distance:** 611 units from center

---

## Fetching the Data

### PowerShell
```powershell
# Fetch all three endpoints
.\get-debug-data.ps1 -Endpoint world-state
.\get-debug-data.ps1 -Endpoint camera-test
.\get-debug-data.ps1 -Endpoint camera-position
```

### Bash
```bash
# Fetch all three endpoints
./get-debug-data.sh world-state
./get-debug-data.sh camera-test
./get-debug-data.sh camera-position
```

### Direct URLs (for browser/Postman)
- World State: `http://localhost:8080/api/debug/world-state`
- Camera Test: `http://localhost:8080/api/debug/camera-test`
- Camera Position: `http://localhost:8080/api/debug/camera-position`

---

## Analyzing the Data

### What to Look For

1. **Are P1 and P2 positions different?**
   - Check `world-state-data.json` p1Buildings vs p2Buildings
   - Check `camera-test-data.json` p1Pos vs p2Pos

2. **Are the units clustered around the civil centre?**
   - Look at unit coordinates in `world-state-data.json`
   - Compare with civil centre position

3. **Is the camera moving in the right direction?**
   - Look at position tracking logs
   - Compare target coordinates with actual camera movement

---

## Debug Checklist

- [ ] Can fetch `/api/debug/world-state` - gets JSON with all entities
- [ ] Can fetch `/api/debug/camera-test` - gets extracted P1/P2 targets
- [ ] P1 and P2 positions are different
- [ ] P1 position is where P1 units cluster
- [ ] P2 position is where P2 units cluster
- [ ] Camera test logs show "CAMERA TEST START"
- [ ] Camera movement logs show position updates
- [ ] Camera reaches target (distance = 0)
