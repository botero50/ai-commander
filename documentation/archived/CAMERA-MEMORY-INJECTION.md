# Camera Control via Memory Injection

## Option 1: Direct Memory Writing (CheatEngine-style)

### How it works:
1. Find camera object in memory
2. Write X,Z coordinates directly
3. Game reads updated coordinates next frame
4. Camera moves

### Process:
1. Use tool like `process-memory` (Node.js) or similar
2. Attach to pyrogenesis.exe process
3. Scan for camera data structure
4. Write new position values
5. Game engine reads and applies

### Requirements:
- Node.js memory reading library
- Know 0 A.D. memory layout
- Pointer offsets for camera position

### Challenges:
- Memory layout changes between 0 A.D. versions
- ASLR (Address Space Layout Randomization) 
- 64-bit vs 32-bit offsets
- Anti-cheat considerations

## Option 2: Process Manipulation via Windows API

### Approach:
1. Use Windows API to inject DLL into pyrogenesis
2. DLL patches camera update function
3. Intercepts and modifies camera coordinates

### Tools:
- `node-ffi` - Call Windows APIs from Node.js
- Direct system calls

### Challenges:
- Requires understanding 0 A.D. internals
- DLL injection often blocked by Windows Defender
- Need C++ knowledge for DLL creation

## Option 3: Game Config File Modification

### How it works:
1. Modify user.cfg before each frame
2. Set camera position via config
3. Game loads from config

### Code:
```
camera.x = 500
camera.z = 800
camera.zoom = 150
```

### Challenges:
- Config only read at startup
- Game caches values in memory
- Runtime changes might not work

## Option 4: Spawning External Helper Process

### Approach:
1. Create small C++ helper app
2. Helper attaches to 0 A.D. process
3. Helper writes to camera memory
4. Node.js calls helper via exec()

### Implementation:
```bash
./camera-injector.exe --pid 1234 --x 500 --z 800
```

### Advantages:
- Isolates memory operations
- Can be language-agnostic
- Easier to debug

## Option 5: Use Cheat Engine from Node.js

### Approach:
1. Launch CheatEngine from command line
2. Provide script/commands
3. CheatEngine modifies memory
4. Repeats as needed

```bash
cheatengine-x86_64 --help  # Check for CLI options
```

### Challenges:
- CheatEngine is primarily GUI
- Limited command-line interface
- Heavy dependencies

## Option 6: Write Debug Port Monitor

### Approach:
1. Connect to 0 A.D.'s debug port (if available)
2. Send debug commands to modify camera
3. Like debugger breakpoint + memory modification

### Requirements:
- 0 A.D. compiled with debug symbols
- Available debug port
- Protocol documentation

## Option 7: Kernel-level injection (Most Powerful but Risky)

### Approach:
1. Write Windows driver to access memory
2. Driver directly modifies camera struct
3. Survives anti-cheat better

### Challenges:
- Requires driver signing
- Very complex
- Can crash system
- Not recommended for game modding

## My Recommendation: Option 4 (C++ Helper + Memory Injection)

This is practical and reliable:

### Steps:
1. **Create camera-injector.exe (C++)**
   - Attaches to pyrogenesis process
   - Finds camera struct in memory
   - Writes X,Z coordinates
   - Returns success/failure

2. **Call from Node.js**
   ```javascript
   const { exec } = require('child_process');
   exec(`camera-injector.exe --pid ${gameProcessId} --x 500 --z 800`);
   ```

3. **Benefits**
   - Works during gameplay
   - Camera updates in real-time
   - No mod loading required
   - Survives in any game mode

4. **Challenges**
   - Need to find memory offsets for 0 A.D.
   - Offsets change per version
   - Requires reverse engineering

## How to Find Camera Memory Address

### Using CheatEngine:
1. Launch 0 A.D. with game running
2. Open CheatEngine
3. Attach to pyrogenesis
4. Use "Scan" for camera X position
5. Filter by changes as you pan camera
6. Find address offset
7. Export address for use in C++ injector

### Or: Static Analysis
1. Download 0 A.D. source
2. Find Camera.cpp / Camera.h
3. Look for position variables
4. Calculate relative offsets
5. Use in injector

## Implementation Path

1. **Quick**: Try Option 5 (CheatEngine integration)
   - Already have memory scanning tools
   - Can test if approach works
   
2. **Medium**: Implement Option 4 (C++ helper)
   - More reliable
   - Better performance
   - Works consistently

3. **Robust**: Option 6 (Debug port)
   - If 0 A.D. supports it
   - Cleanest integration

Should we try any of these?
