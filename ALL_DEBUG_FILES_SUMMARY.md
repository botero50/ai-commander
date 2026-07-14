# Complete Debug Data Files Summary

## Raw Data Files Created

You now have **COMPLETE FULL RAW DATA** from all stages of the extraction pipeline:

### 1. **raw-game-state.json** (196 KB)
**Endpoint:** `http://localhost:8080/api/debug/raw-game-state`

**What it is:** The MOST RAW data directly from 0 A.D. RL Interface
- All player states with complete details
- All entities with raw positions
- All metadata about game state

**What it contains:**
- `tick`: Current game tick (2412000)
- `time_elapsed`: Total game time
- `players[]`: All 3 players (Gaia, P1, P2) with complete state
- `entities[]`: ALL units, buildings, resources with positions
- Class counts, resource counts, everything raw

**File size:** 196 KB (Complete raw game state at tick 300)

---

### 2. **world-state-data.json** (2.1 KB)
**Endpoint:** `http://localhost:8080/api/debug/world-state`

**What it is:** Filtered/processed world state from raw game state
- Extracted only units and buildings
- Separated by player

**What it contains:**
```json
{
  "p1Units": [...],           // Player 1 units with template, x, z
  "p2Units": [...],           // Player 2 units with template, x, z
  "p1Buildings": [...],       // Player 1 buildings with template, x, z
  "p2Buildings": [...]        // Player 2 buildings with template, x, z
}
```

**Key data:** The building list with civil centres
```json
"p1Buildings": [
  {"template": "structures/cart/civil_centre", "x": 625, "z": 356}
]
```

---

### 3. **camera-test-data.json** (210 bytes)
**Endpoint:** `http://localhost:8080/api/debug/camera-test`

**What it is:** Extracted camera targets from civil centres

**What it contains:**
```json
{
  "tick": 300,
  "p1Pos": {"x": 625, "z": 356},
  "p2Pos": {"x": 440, "z": 844},
  "p1Building": {"template": "structures/cart/civil_centre", "x": 625, "z": 356},
  "p2Building": {"template": "structures/kush/civil_centre", "x": 440, "z": 844}
}
```

**Key data:** The final x, z values sent to camera controller

---

## Data Extraction Flow

```
Raw Game State (196 KB)
         ↓
    Raw entities[] array with all properties
         ↓
  Filter by type='building', owner=1 or 2
         ↓
  Extract positions: {x, z, template}
         ↓
  Identify civil_centre buildings
         ↓
  World State Data (2.1 KB)
         ↓
  Extract p1Pos and p2Pos
         ↓
  Camera Test Data (210 bytes)
         ↓
  Send to: eventCamera.moveToEvent({x, z})
         ↓
  Python Script: camera-controller.py
         ↓
  WASD keyboard simulation to game
```

---

## How to Download All Files

### Using PowerShell:
```powershell
$endpoints = @(
    @{name='raw-game-state'; url='http://localhost:8080/api/debug/raw-game-state'},
    @{name='world-state-data'; url='http://localhost:8080/api/debug/world-state'},
    @{name='camera-test-data'; url='http://localhost:8080/api/debug/camera-test'}
)

foreach($ep in $endpoints) {
    (Invoke-WebRequest -Uri $ep.url -UseBasicParsing).Content | Out-File "$($ep.name).json" -Encoding UTF8
    Write-Host "Saved: $($ep.name).json"
}
```

### Using Bash:
```bash
curl -s http://localhost:8080/api/debug/raw-game-state > raw-game-state.json
curl -s http://localhost:8080/api/debug/world-state > world-state-data.json
curl -s http://localhost:8080/api/debug/camera-test > camera-test-data.json
```

---

## Raw Data Structure (from raw-game-state.json)

### Top Level
```json
{
  "tick": 2412000,
  "time_elapsed": 120600,
  "players": [...],
  "entities": [...]
}
```

### Player Example
```json
{
  "name": "anonymous",
  "civ": "mace",
  "popCount": 22,
  "popLimit": 30,
  "resourceCounts": {
    "food": 79,
    "wood": 203,
    "stone": 300,
    "metal": 700
  },
  "state": "active",
  ...
}
```

### Entity Example (Building)
```json
{
  "id": 5,
  "type": "building",
  "template": "structures/mace/civil_centre",
  "owner": 1,
  "position": {"x": 625, "z": 356},
  "health": {"current": 500, "max": 500},
  ...
}
```

### Entity Example (Unit)
```json
{
  "id": 127,
  "type": "unit",
  "template": "units/mace/cavalry_spearman_b",
  "owner": 1,
  "position": {"x": 628, "z": 365},
  "stance": "aggressive",
  ...
}
```

---

## Key Coordinates From Raw Game State

Using the raw game state, you can verify:

1. **P1 Civil Centre:**
   - Search raw-game-state.json for `"template": "structures/cart/civil_centre"` with `"owner": 1`
   - Position: `{"x": 625, "z": 356}`

2. **P2 Civil Centre:**
   - Search for `"template": "structures/kush/civil_centre"` with `"owner": 2`
   - Position: `{"x": 440, "z": 844}`

3. **All P1 Units:**
   - Filter entities where `"type": "unit"` and `"owner": 1`
   - Extract all positions

4. **All P2 Units:**
   - Filter entities where `"type": "unit"` and `"owner": 2`
   - Extract all positions

---

## How Camera Targets are Calculated

From raw-game-state.json:
1. Loop through `entities[]`
2. Filter: `type == "building"` AND `owner == 1`
3. Filter further: `template.includes("civil")`
4. Extract: `position.x` and `position.z`
5. Result: Camera target coordinates

**Code location:** `packages/zeroad-adapter/src/arena/run-arena-loop.ts` line ~1005-1025

---

## Files Ready For Analysis

You have:
- ✅ **raw-game-state.json** - COMPLETE raw game data
- ✅ **world-state-data.json** - Filtered entities  
- ✅ **camera-test-data.json** - Final camera targets
- ✅ Documentation files explaining the data flow

**Next step:** Analyze these files to verify if x, z coordinates are correct or need swapping!
