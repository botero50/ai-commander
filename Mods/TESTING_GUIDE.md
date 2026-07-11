# Camera Control Mod - Testing Guide

## Quick Test (Manual via curl)

### 1. Start the Arena
```bash
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
```

Wait for the log to show:
```
✓ RL Interface is ready
```

### 2. In Another Terminal, Test Camera Movement

**Move camera to position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(300, 100, 300, 45, 0, 0); \"moved\""}'
```

**Get current camera position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "JSON.stringify(Engine.GetCameraData())"}'
```

Expected output:
```json
{"x": 300, "y": 100, "z": 300, "rotX": 45, "rotY": 0, "rotZ": 0}
```

**Smooth pan to new position:**
```bash
curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "if(Engine.GetComponent(SYSTEM_ENTITY,\"CameraControl\")) { Engine.GetComponent(SYSTEM_ENTITY,\"CameraControl\").PanTo(200, 200, 2000); \"panning\" } else { \"mod not loaded\" }"}'
```

---

## Unit Tests

Create test file: `packages/zeroad-adapter/src/rl-interface/camera-controller.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CameraController } from './camera-controller.js';
import { RLHTTPClient } from './http-client.js';
import { Logger } from '../config/logger.js';

describe('CameraController', () => {
  let controller: CameraController;
  let mockClient: RLHTTPClient;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('error', 'TestCamera'); // Suppress logs
    mockClient = {
      evaluate: vi.fn(async (code: string) => {
        // Mock responses based on code
        if (code.includes('GetCameraData')) {
          return '{"x":512,"y":100,"z":512,"rotX":45,"rotY":0,"rotZ":0}';
        }
        return '"success"';
      }),
    } as any;

    controller = new CameraController(mockClient, logger);
  });

  it('should move camera to target position', async () => {
    const result = await controller.moveToTarget({
      x: 300,
      z: 400,
      height: 120,
      pitch: 45,
      yaw: 0,
    });

    expect(result).toBe(true);
    expect(mockClient.evaluate).toHaveBeenCalled();
  });

  it('should get current camera position', async () => {
    const position = await controller.getPosition();

    expect(position).toEqual({
      x: 512,
      y: 100,
      z: 512,
      rotX: 45,
      rotY: 0,
      rotZ: 0,
    });
  });

  it('should move camera relative to current position', async () => {
    // First get position
    await controller.getPosition();

    // Then move relative
    const result = await controller.moveRelative(50, 50, 10);

    expect(result).toBe(true);
  });

  it('should reset camera to default view', async () => {
    const result = await controller.reset();

    expect(result).toBe(true);
    const defaultX = 512;
    const defaultZ = 512;
    // Verify it tried to move to center
  });

  it('should return null position on error', async () => {
    mockClient.evaluate = vi.fn(async () => {
      throw new Error('Connection failed');
    });

    const position = await controller.getPosition();
    expect(position).toBeNull();
  });

  it('should handle invalid JSON response', async () => {
    mockClient.evaluate = vi.fn(async () => 'not json');

    const position = await controller.getPosition();
    expect(position).toBeNull();
  });
});
```

**Run tests:**
```bash
npm test -- packages/zeroad-adapter/src/rl-interface/camera-controller.test.ts
```

---

## Integration Test (Full Arena)

Create test file: `packages/zeroad-adapter/src/arena/arena-camera.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { CameraController } from '../rl-interface/camera-controller.js';
import { Logger } from '../config/logger.js';

describe('Arena Camera Integration', () => {
  let client: RLHTTPClient;
  let controller: CameraController;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('info', 'ArenaCameraTest');
    client = new RLHTTPClient('127.0.0.1', 6000, 10000, logger);
    controller = new CameraController(client, logger);
  });

  it('should connect to running RL Interface', async () => {
    // This test requires RL Interface to be running
    // Run with: npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
    
    const position = await controller.getPosition();
    expect(position).not.toBeNull();
    expect(position?.x).toBeDefined();
    expect(position?.z).toBeDefined();
    expect(position?.y).toBeDefined();
  }, { timeout: 30000 });

  it('should move camera successfully', async () => {
    const result = await controller.moveToTarget({
      x: 300,
      z: 300,
      height: 100,
      pitch: 45,
    });

    expect(result).toBe(true);

    // Verify it moved
    const newPos = await controller.getPosition();
    expect(newPos?.x).toBeLessThan(350);
    expect(newPos?.x).toBeGreaterThan(250);
  }, { timeout: 30000 });

  it('should move relative to current position', async () => {
    const startPos = await controller.getPosition();
    expect(startPos).not.toBeNull();

    const result = await controller.moveRelative(100, 100, 50);
    expect(result).toBe(true);

    const endPos = await controller.getPosition();
    expect(endPos).not.toBeNull();
    expect(endPos?.x).toBeGreaterThan(startPos!.x);
    expect(endPos?.z).toBeGreaterThan(startPos!.z);
  }, { timeout: 30000 });
});
```

**Run integration test:**
```bash
# Terminal 1: Start arena
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Terminal 2: Run tests (wait for "RL Interface is ready" message)
npm test -- packages/zeroad-adapter/src/arena/arena-camera.test.ts
```

---

## Manual Testing Checklist

### ✅ Basic Connectivity
- [ ] Arena starts without errors
- [ ] Log shows "RL Interface is ready"
- [ ] Camera_commander mod loads (no errors about missing mod)

### ✅ Camera Movement
- [ ] Curl command returns valid JSON with camera position
- [ ] Camera position values are reasonable (within map bounds)
- [ ] Multiple curl commands work in sequence
- [ ] Camera visibly moves in-game window

### ✅ Edge Cases
- [ ] Move to map boundaries (0,0) - shouldn't crash
- [ ] Move to center (256,256) - should work smoothly
- [ ] Move to very high altitude (300+) - handle gracefully
- [ ] Move to negative coordinates - should fail gracefully
- [ ] Rapid sequential moves - no queue overflow

### ✅ Error Handling
- [ ] Invalid JSON in curl - returns error, doesn't crash game
- [ ] RL Interface offline - controller returns null, logs error
- [ ] Game crashes - controller detects and handles gracefully

### ✅ Performance
- [ ] Camera movement is smooth (not stuttering)
- [ ] No lag in game during camera control
- [ ] Multiple rapid moves don't slow game down
- [ ] Memory usage stable during repeated moves

---

## Test Scripts

### Test 1: Basic Camera Movement

```bash
#!/bin/bash
# test-camera-basic.sh

echo "Testing basic camera movement..."

# Center map
curl -s -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(256, 100, 256, 45, 0, 0); \"center\""}' | jq .

sleep 1

# Move to corner
curl -s -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(50, 80, 50, 30, 0, 0); \"corner\""}' | jq .

sleep 1

# Get position
curl -s -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "JSON.stringify(Engine.GetCameraData())"}' | jq .

echo "✅ Test complete"
```

### Test 2: Boundary Testing

```bash
#!/bin/bash
# test-camera-boundaries.sh

echo "Testing camera boundary conditions..."

# Test each corner
CORNERS=(
  "10,10"
  "500,10"
  "10,500"
  "500,500"
)

for corner in "${CORNERS[@]}"; do
  IFS=',' read -r x z <<< "$corner"
  echo "Testing corner: ($x, $z)"
  
  curl -s -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"Engine.SetCameraData($x, 100, $z, 45, 0, 0); 'moved to $corner'\"}"
  
  sleep 1
done

echo "✅ Boundary test complete"
```

### Test 3: Stress Test (Rapid Movement)

```bash
#!/bin/bash
# test-camera-stress.sh

echo "Stress testing rapid camera movements..."

for i in {1..20}; do
  x=$((RANDOM % 256))
  z=$((RANDOM % 256))
  
  curl -s -X POST http://localhost:6000/evaluate \
    -H "Content-Type: application/json" \
    -d "{\"code\": \"Engine.SetCameraData($x, 100, $z, 45, 0, 0); 'move $i'\"}" > /dev/null
  
  echo "Move $i: ($x, $z)"
  sleep 0.1
done

echo "✅ Stress test complete"
```

---

## Automated Testing Workflow

### 1. Unit Tests (Fast)
```bash
npm test -- camera-controller.test.ts
```
- No external dependencies
- ~5-10 seconds
- Good for CI/CD

### 2. Integration Tests (Requires Arena)
```bash
# Terminal 1
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Terminal 2
npm test -- arena-camera.test.ts
```
- Tests with real RL Interface
- ~30 seconds
- Validates end-to-end functionality

### 3. Manual Verification (Visual)
```bash
# Start arena
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Watch game window while running curl commands
bash test-camera-basic.sh
```
- Visual confirmation camera moves
- Verify smoothness
- Check for visual glitches

---

## Expected Behavior

### Successful Movement
```bash
$ curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "Engine.SetCameraData(300, 100, 300, 45, 0, 0); \"moved\""}'

"moved"
```

Camera should smoothly transition to position (300, 100, 300) in game.

### Get Position
```bash
$ curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "JSON.stringify(Engine.GetCameraData())"}'

{"x":300,"y":100,"z":300,"rotX":45,"rotY":0,"rotZ":0}
```

### Error Case
```bash
$ curl -X POST http://localhost:6000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code": "invalid javascript !!!"}'

"error: SyntaxError: ..."
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Connection refused" | RL Interface not running | Start arena with `run-arena-loop.ts` |
| "mod not loaded" | camera_commander not enabled | Check `--mod=camera_commander` in spawn |
| Camera doesn't move | Game crashed | Check arena logs for errors |
| Position is null | RL Interface error | Verify game is running, check logs |
| Jerky movement | Network lag | Increase duration parameter |
| Out of bounds error | Invalid coordinates | Keep X,Z between 0-256, Y under 300 |

---

## Next Steps

1. **Run the basic test:**
   ```bash
   npm run build
   npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1
   # (In another terminal)
   bash test-camera-basic.sh
   ```

2. **Watch the camera move in-game** to verify it's working

3. **Run unit tests:**
   ```bash
   npm test -- camera-controller.test.ts
   ```

4. **Create additional test scripts** for your specific use cases

5. **Integrate with AutomaticCameraManager** once confirmed working
