# Camera Debug Endpoints

This document describes the API endpoints used to extract camera target values and current camera position.

## Endpoints

### 1. World State Data (All Units & Buildings)
**Endpoint:** `GET http://localhost:8080/api/debug/world-state`

**Purpose:** Contains all game entities (units and buildings) with their exact positions at tick 300 (when camera test runs).

**Used for:** Extracting player civil centre positions (target coordinates for camera movement).

**Data Structure:**
```json
{
  "tick": 300,
  "p1Units": [
    {
      "template": "units/cart/infantry_archer_b",
      "x": 598,
      "z": 349
    },
    ...
  ],
  "p2Units": [
    {
      "template": "units/kush/ship_arrow",
      "x": 587,
      "z": 883
    },
    ...
  ],
  "p1Buildings": [
    {
      "template": "structures/cart/civil_centre",
      "x": 625,
      "z": 356
    }
  ],
  "p2Buildings": [
    {
      "template": "structures/kush/civil_centre",
      "x": 440,
      "z": 844
    }
  ]
}
```

**Key Values:**
- `p1Buildings[0]` - Player 1's civil centre → **Target coordinates (x, z)**
- `p2Buildings[0]` - Player 2's civil centre → **Target coordinates (x, z)**

---

### 2. Camera Test Targets
**Endpoint:** `GET http://localhost:8080/api/debug/camera-test`

**Purpose:** The extracted camera targets that will be used for movement.

**Data Structure:**
```json
{
  "tick": 300,
  "p1Pos": {
    "x": 625,
    "z": 356
  },
  "p2Pos": {
    "x": 440,
    "z": 844
  },
  "p1Building": {
    "template": "structures/cart/civil_centre",
    "x": 625,
    "z": 356
  },
  "p2Building": {
    "template": "structures/kush/civil_centre",
    "x": 440,
    "z": 844
  }
}
```

**Key Values:**
- `p1Pos` - Player 1 target: **{x: 625, z: 356}**
- `p2Pos` - Player 2 target: **{x: 440, z: 844}**

---

### 3. Current Camera Position (Not Yet Implemented)
**Endpoint:** `GET http://localhost:8080/api/debug/camera-position` (TODO)

**Purpose:** Would show the current camera position as it moves.

**Expected Structure:**
```json
{
  "current": {
    "x": 512,
    "z": 512
  },
  "target": {
    "x": 625,
    "z": 356
  },
  "distance": 150.5,
  "isMoving": true
}
```

---

## How to Use

### Save Both Endpoints to Files

**PowerShell:**
```powershell
# World state
(Invoke-WebRequest -Uri 'http://localhost:8080/api/debug/world-state' -UseBasicParsing).Content | Out-File world-state-data.json

# Camera test
(Invoke-WebRequest -Uri 'http://localhost:8080/api/debug/camera-test' -UseBasicParsing).Content | Out-File camera-test-data.json
```

**Bash:**
```bash
# World state
curl -s http://localhost:8080/api/debug/world-state > world-state-data.json

# Camera test
curl -s http://localhost:8080/api/debug/camera-test > camera-test-data.json
```

---

## Data Flow

1. **World State** contains ALL units/buildings from the game
2. **Camera Test** extracts the civil centres from world state
3. Camera moves FROM (512, 512) TO p1Pos, then TO p2Pos
4. Position tracking logs current position every 0.2 seconds

---

## Example Data From Latest Run

**World State at Tick 300:**
- P1 Civil Centre: x=625, z=356 (Carthage)
- P2 Civil Centre: x=440, z=844 (Kush)
- P1 has 16 units clustered around (590-607, 163-363)
- P2 has 16 units clustered around (439-587, 819-883)

**Camera Test Targets:**
- P1 Target: (625, 356)
- P2 Target: (440, 844)
- Distance P1: 186 units from center
- Distance P2: 611 units from center
