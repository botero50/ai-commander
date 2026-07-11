# 🎬 Camera Control Mod - Complete Package

A production-ready remote camera control system for 0 A.D. that enables programmatic camera positioning for broadcasting and AI match analysis.

## 📚 Documentation Overview

### Quick Start (5 minutes)
1. **[TEST_QUICK_START.md](TEST_QUICK_START.md)** ⭐ **START HERE**
   - 3-minute test to verify everything works
   - Step-by-step instructions
   - Troubleshooting for common issues

### Implementation
2. **[SUMMARY.md](SUMMARY.md)** - Project overview
   - What was built
   - Key features
   - File locations
   - Quick usage examples

3. **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - How to use in code
   - Complete API reference
   - Code examples
   - Coordinate system explanation
   - Next steps for integration

### Advanced Testing
4. **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing
   - Manual curl testing
   - Unit test examples
   - Integration tests
   - Performance testing
   - Test scripts

### Architecture
5. **[CAMERA_MOD_PLAN.md](CAMERA_MOD_PLAN.md)** - Deep technical dive
   - Mod architecture
   - RL Interface integration
   - Implementation options
   - How it works under the hood

## 🚀 Quick Test (Right Now!)

```bash
# Terminal 1: Start arena
npm run build
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Terminal 2: Run quick test
bash Mods/test-camera-quick.sh
```

Watch the camera move in the game window!

## 📦 What's Included

### Code
- ✅ `camera_control/` - Reference mod structure
- ✅ `packages/zeroad-adapter/src/rl-interface/camera-controller.ts` - TypeScript API
- ✅ Arena integration in `run-arena-loop.ts`

### Documentation (8 files)
- ✅ TEST_QUICK_START.md - Quick test (this is where to start!)
- ✅ SUMMARY.md - Project overview
- ✅ INTEGRATION_GUIDE.md - How to use in code
- ✅ TESTING_GUIDE.md - Comprehensive testing
- ✅ CAMERA_MOD_PLAN.md - Architecture deep-dive
- ✅ test-camera-quick.sh - Automated test script
- ✅ camera_control/README.md - Mod documentation
- ✅ This README.md

## 🎯 Features

✅ **Remote camera control** - Move camera via HTTP API  
✅ **Smooth transitions** - Automatic animation/easing  
✅ **No external server** - Uses existing RL Interface  
✅ **Type-safe** - Full TypeScript support  
✅ **Error handling** - Graceful failures with logging  
✅ **Production ready** - Tested and documented  
✅ **Well documented** - 8 comprehensive guides  

## 💻 Usage Example

```typescript
const cameraCtrl = new CameraController(client, logger);

// Move to position
await cameraCtrl.moveToTarget({ x: 300, z: 400, height: 150, pitch: 45 });

// Get current position
const pos = await cameraCtrl.getPosition();

// Move relative
await cameraCtrl.moveRelative(100, 50, 20);

// Look at target
await cameraCtrl.lookAt(500, 500);

// Reset to default
await cameraCtrl.reset();
```

## 🧪 Testing Options

### Quick Test (3 minutes)
```bash
bash Mods/test-camera-quick.sh
```
See: [TEST_QUICK_START.md](TEST_QUICK_START.md)

### Manual Testing (curl)
```bash
curl -X POST http://localhost:6000/evaluate \
  -d '{"code": "Engine.SetCameraData(300, 100, 300, 45, 0, 0)"}'
```
See: [TESTING_GUIDE.md](TESTING_GUIDE.md)

### Unit Tests
```bash
npm test -- camera-controller.test.ts
```
See: [TESTING_GUIDE.md](TESTING_GUIDE.md)

### Integration Tests
```bash
# Terminal 1: Start arena
npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1

# Terminal 2: Run tests
npm test -- arena-camera.test.ts
```
See: [TESTING_GUIDE.md](TESTING_GUIDE.md)

## 📋 Reading Order

1. **Want to test now?** → [TEST_QUICK_START.md](TEST_QUICK_START.md)
2. **Want to use in code?** → [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
3. **Want full details?** → [TESTING_GUIDE.md](TESTING_GUIDE.md)
4. **Want architecture?** → [CAMERA_MOD_PLAN.md](CAMERA_MOD_PLAN.md)
5. **Want summary?** → [SUMMARY.md](SUMMARY.md)

## 🔧 File Structure

```
Mods/
├── README.md                          ← You are here
├── TEST_QUICK_START.md                ← Start here to test
├── SUMMARY.md                         ← Quick overview
├── INTEGRATION_GUIDE.md               ← How to use in code
├── TESTING_GUIDE.md                   ← Complete testing guide
├── CAMERA_MOD_PLAN.md                 ← Architecture details
├── test-camera-quick.sh               ← Automated test script
└── camera_control/
    ├── mod.json                       ← Mod metadata
    └── README.md                      ← Mod documentation

packages/zeroad-adapter/src/rl-interface/
└── camera-controller.ts               ← Main TypeScript API

packages/zeroad-adapter/src/arena/
└── run-arena-loop.ts                  ← Arena integration (camera_commander enabled)
```

## ✨ Key Technologies

- **0 A.D.** - Real-time strategy game
- **RL Interface** - HTTP API for game control (port 6000)
- **camera_commander mod** - In-game camera control system
- **TypeScript** - Type-safe camera API
- **curl/fetch** - HTTP client for camera commands

## 🎬 Use Cases

1. **Automated Broadcasting** - Control camera during live matches
2. **Analysis Replays** - Follow interesting game moments
3. **Streaming Overlays** - Synchronized camera for OBS
4. **Bot Testing** - Position camera for unit testing
5. **Cinematics** - Create pre-scripted camera sequences

## 🚀 Next Steps

After testing:

1. **Integrate with AutomaticCameraManager**
   - Use `CameraController` for smooth transitions
   - Coordinate with broadcast server

2. **Create camera presets**
   - Top-down views
   - Corner watches
   - Unit tracking

3. **Connect to streaming**
   - Send camera position to OBS
   - Sync multiple broadcast tools

4. **Advanced features**
   - Orbital camera movements
   - Automated scene switching
   - Replay analysis modes

## 📞 Support

### It's not working?
1. Check [TEST_QUICK_START.md](TEST_QUICK_START.md) troubleshooting
2. Read [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed debugging
3. Verify arena is running: `npm run build && npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts --matches 1`

### How do I use this?
1. Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for code examples
2. Check [SUMMARY.md](SUMMARY.md) for quick reference
3. See [CAMERA_MOD_PLAN.md](CAMERA_MOD_PLAN.md) for how it works

## 📝 License

Same as 0 A.D. (GPL 2.0)

---

**Ready to test?** → [TEST_QUICK_START.md](TEST_QUICK_START.md)  
**Want code examples?** → [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)  
**Need architecture details?** → [CAMERA_MOD_PLAN.md](CAMERA_MOD_PLAN.md)
