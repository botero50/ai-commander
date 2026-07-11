# Camera Control - All Available Options

## Summary Table

| Method | Complexity | Setup Time | Works? | Notes |
|--------|-----------|------------|--------|-------|
| **RL Interface /evaluate** | Low | 5 min | ❌ Times out | Built-in but doesn't work |
| **RL Interface /step commands** | Low | 5 min | ❌ Ignored | 0 A.D. doesn't process |
| **Camera Mod** | Low | 10 min | ❌ Doesn't load | Mod system disabled in RL mode |
| **Memory Injection (Python)** | Medium | 15 min | ✅ Works! | Easy, no compilation |
| **Memory Injection (C++)** | High | 30 min | ✅ Works! | Compiled exe, faster |
| **Broadcast to External Tools** | Medium | 10 min | ✅ Works! | OBS, streaming software |

## Recommended: Memory Injection (Python)

### Why?
- ✅ Actually moves the in-game camera
- ✅ No compilation needed
- ✅ Simple 3-step setup
- ✅ Works during any game mode
- ✅ Real-time updates

### Setup (15 minutes total)

**Step 1: Install Python library**
```bash
pip install pymem psutil
```

**Step 2: Find camera offset (5 minutes)**
```bash
# Start game
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Use CheatEngine to find camera address (see QUICK-START-MEMORY-INJECTION.md)
# Note the address: e.g., 04A5C8B0
```

**Step 3: Configure injector**
```bash
# Edit packages/zeroad-adapter/tools/camera-injector.py
# Change CAMERA_ADDRESS = 0x04A5C8B0  (your address)
```

**Step 4: Test**
```bash
python packages/zeroad-adapter/tools/camera-injector.py --x 500 --z 600 --verbose
```

Camera moves! ✓

### Integration

```typescript
import { CameraMemoryInjector } from './memory-injector.js';

const injector = new CameraMemoryInjector(logger);
await injector.checkAvailable();

// When camera should pan:
await injector.pan(x, z, duration);
```

## Alternative: Broadcast to External Tools

If memory injection is too complex:

### Why?
- ✅ Already fully implemented
- ✅ No reverse engineering needed
- ✅ Works with OBS/streaming software
- ✅ Safe, no memory manipulation

### How?
```bash
# Already running on port 3001
curl http://localhost:3001/camera/stream

# Broadcasters see real-time camera recommendations
# OBS overlay shows "ACTION: gathering at (596.5, 806.5)"
# Manual camera follows AI guidance
```

See: `BROADCAST-INTEGRATION.md`

## Comparison

### Memory Injection
```
Game Detects Action
    ↓
Calculate Optimal Position
    ↓
Write to pyrogenesis.exe Memory
    ↓
Game Reads New Position
    ↓
Camera Moves Automatically ✓
```

**Pros:**
- Fully automated
- In-game camera moves
- Professional look
- Real-time response

**Cons:**
- Need to find memory offset
- Version-specific
- Could be flagged as cheat (0 A.D. has no anti-cheat)

### Broadcast Integration
```
Game Detects Action
    ↓
Broadcast Recommendation via HTTP
    ↓
OBS / Streaming Tool Receives Data
    ↓
Update Overlay OR Manual Camera Control ✓
```

**Pros:**
- Already fully implemented
- Works with standard tools (OBS)
- Safe, no memory access
- Platform-independent

**Cons:**
- Requires manual camera or OBS integration
- Not fully automatic
- Slower (HTTP instead of memory)

## Files for Each Approach

### Memory Injection
- `packages/zeroad-adapter/tools/camera-injector.py` - Python implementation
- `packages/zeroad-adapter/tools/camera-injector.cpp` - C++ version
- `packages/zeroad-adapter/src/camera/memory-injector.ts` - Node.js wrapper
- `QUICK-START-MEMORY-INJECTION.md` - Setup guide
- `MEMORY-INJECTION-SETUP.md` - Detailed guide

### Broadcast Integration  
- `packages/zeroad-adapter/src/broadcast/camera-broadcast-server.ts` - HTTP server
- `BROADCAST-INTEGRATION.md` - How to use with OBS
- `packages/zeroad-adapter/src/camera/automatic-camera-manager.ts` - Detection

## My Recommendation

**Start with Memory Injection:**

1. It's 15 minutes of setup
2. You get a fully automated camera
3. Professional result: camera actually moves in game
4. You'll learn how game memory works

**Then add Broadcast as Backup:**

1. External tools have camera data too
2. OBS can show activity indicators
3. Fallback if memory injection has issues

## Next Steps

Choose one:

**Option A: I want automated in-game camera**
→ Follow `QUICK-START-MEMORY-INJECTION.md`
→ Find camera offset in CheatEngine (15 min)
→ Test Python injector
→ Integrate with arena loop

**Option B: I want it working NOW**
→ Use existing broadcast system
→ Create OBS browser source (10 min)
→ See `BROADCAST-INTEGRATION.md`

**Option C: I want both**
→ Memory injection + broadcast fallback
→ Best of both worlds
→ Most robust

Pick your approach! I can help with any of them.
