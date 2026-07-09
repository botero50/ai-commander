# EPIC R0 Investigation — IPC Feasibility

**Status:** 🔬 In Progress  
**Goal:** Determine minimum viable integration with 0 A.D.  
**Approach:** Evidence-based investigation from source code  

---

## Story R0.1 — JavaScript Runtime Investigation

### Question 1: JavaScript Engine Type

**Status:** ⏳ Investigating

**Sources to check:**
- https://gitea.wildfiregames.com/0ad/0ad/src/branch/master/source/scriptinterface
- https://gitea.wildfiregames.com/0ad/0ad/src/branch/master/source/ps/Scripting

**Expected findings:**
- Engine: SpiderMonkey (Mozilla's JS engine)
- Version: Likely 1.8.5 or similar
- Integration: Wrapped with custom C++ bindings

### Question 2: Available JavaScript APIs

**Status:** ⏳ Investigating

**Standard JS APIs:**
- [ ] Object, Array, String (standard objects)
- [ ] Function, RegExp
- [ ] Math, JSON
- [ ] setTimeout, setInterval
- [ ] console.log

**Custom 0 A.D. APIs:**
- [ ] Engine calls (draw, update, etc.)
- [ ] Game state access
- [ ] Command execution
- [ ] Event system

### Question 3: Network Capabilities

**Status:** ⏳ Investigating

**Possible mechanisms:**
- [ ] XMLHttpRequest (HTTP)
- [ ] WebSocket
- [ ] Native socket API
- [ ] File-based IPC (write/read files)
- [ ] Message passing

**Expected:** File-based IPC most likely (HTTP/sockets unlikely in game context)

### Question 4: File System Access

**Status:** ⏳ Investigating

**Capabilities needed:**
- [ ] Read files from disk
- [ ] Write files to disk
- [ ] Restrictions (sandbox, path limits)
- [ ] Access to /tmp or working directory

**Expected:** Should have file access for mod data, saves, replays

### Question 5: Native Code Access (JS to C++)

**Status:** ⏳ Investigating

**Integration mechanisms:**
- [ ] Direct C++ function calls from JS
- [ ] Callback registration
- [ ] Event handlers
- [ ] Class bindings

**Sources:**
- Look for ScriptInterface classes
- Check for js::Class definitions
- Review native function bindings

### Question 6: Module System

**Status:** ⏳ Investigating

**Mod loading:**
- [ ] How are mods discovered?
- [ ] How are JS files loaded?
- [ ] Mod lifecycle hooks?
- [ ] Mod directories structure?

**Sources:**
- /binaries/data/mods/mod.json format
- Mod loading code in engine

---

## Story R0.2 — Communication Mechanisms

### Mechanism 1: GUI Messaging

**Status:** ⏳ Investigating

- Purpose: ?
- How it works: ?
- Usable for state/commands: ?
- Feasibility: ?

### Mechanism 2: Simulation Messaging

**Status:** ⏳ Investigating

- Purpose: ?
- How it works: ?
- Usable for state/commands: ?
- Feasibility: ?

### Mechanism 3: Command Queues

**Status:** ⏳ Investigating

- Purpose: ?
- How it works: ?
- Usable for state/commands: ?
- Feasibility: ?

### Mechanism 4: Scripting Callbacks

**Status:** ⏳ Investigating

- Purpose: ?
- How it works: ?
- Usable for state/commands: ?
- Feasibility: ?

### Mechanism 5: File IO

**Status:** ⏳ Investigating

- Purpose: Saves, replays, mod data
- How it works: Standard filesystem API
- Usable for state/commands: **YES** - most promising
- Feasibility: **HIGH** - if JS can write files, we can use file-based IPC

### Mechanism 6: Replay Logging

**Status:** ⏳ Investigating

- Purpose: Record matches for playback
- How it works: ?
- Usable for state/commands: Maybe (one-way, post-match)
- Feasibility: ?

### Mechanism 7: AI Scripting

**Status:** ⏳ Investigating

- Purpose: AI players (Petra)
- How it works: JS callbacks for decisions
- Usable for state/commands: **MAYBE** - if we can integrate as AI
- Feasibility: **MEDIUM** - existing system, but designed for different purpose

### Mechanism 8: Mod APIs

**Status:** ⏳ Investigating

- Purpose: Mod functionality
- How it works: ?
- Usable for state/commands: **YES** - if APIs sufficient
- Feasibility: **HIGH** - mods designed to extend functionality

### Mechanism 9: Network Code (Multiplayer)

**Status:** ⏳ Investigating

- Purpose: Multiplayer synchronization
- How it works: Network messages between players
- Usable for state/commands: **MAYBE** - if we can tap into message system
- Feasibility: **LOW** - likely not exposed to mods, complex protocol

### Mechanism 10: Debug/Console Interface

**Status:** ⏳ Investigating

- Purpose: Developer console
- How it works: Commands executed from console
- Usable for state/commands: **MAYBE** - if accessible from mods
- Feasibility: **MEDIUM** - if we can hook console

---

## Story R0.3 — Existing Mods Investigation

### Project 1: Petra AI

**Status:** ⏳ Investigating

- Project: Built-in AI (repository included)
- Approach: JavaScript-based AI scripting
- Findings:
  - [ ] What APIs does it use?
  - [ ] How does it access game state?
  - [ ] Can we extend it for network integration?
  - [ ] Active/maintained?

### Project 2: Community Bot Projects

**Status:** ⏳ Investigating

- Search: GitHub, mod repository, forum
- Look for: remote control, bot, network, API projects
- Expected: May find existing solutions to learn from

### Project 3: Streaming/Recording Mods

**Status:** ⏳ Investigating

- Look for: Projects that interact with engine output
- May reveal: File-based communication patterns

---

## Story R0.4 — Integration Recommendation

### Option A: Pure JavaScript Mod

**Status:** Awaiting R0.1-R0.3 completion

**Characteristics:**
- Only JavaScript code
- Uses 0 A.D.'s built-in JavaScript runtime
- No engine changes required
- No recompilation needed

**Viability:** Depends on JavaScript capabilities (file I/O, etc.)

**Effort estimate:** TBD  
**Maintenance:** TBD  
**Stability:** TBD  
**Compatibility:** TBD  

### Option B: JavaScript Mod + Small C++ Extension

**Characteristics:**
- JavaScript frontend
- Minimal C++ to expose specific capabilities
- Requires recompiling 0 A.D.
- Part of mod distribution

**Viability:** Depends on whether pure JS insufficient

**Effort estimate:** TBD  
**Maintenance:** TBD  
**Stability:** TBD  
**Compatibility:** TBD  

### Option C: Dedicated Engine Patch

**Characteristics:**
- New 0 A.D. subsystem
- Full C++ implementation
- Requires significant engine changes
- Needs to be maintained across versions

**Viability:** Last resort if other options impossible

**Effort estimate:** TBD  
**Maintenance:** TBD  
**Stability:** TBD  
**Compatibility:** TBD  

### Option D: Existing Community Solution

**Characteristics:**
- Build on proven project
- Integrate with existing ecosystem
- Leverage maintained code
- Reduce custom development

**Viability:** Depends on what exists

**Effort estimate:** TBD  
**Maintenance:** TBD  
**Stability:** TBD  
**Compatibility:** TBD  

---

## Final Recommendation

**Status:** Awaiting R0.1-R0.3 completion

**CTO Decision:**

*To be completed after investigation*

---

## Investigation Progress

| Story | Status | Key Finding |
|-------|--------|-------------|
| R0.1 | 🔬 In Progress | Investigating JS runtime |
| R0.2 | ⏳ Pending | Awaiting R0.1 baseline |
| R0.3 | ⏳ Pending | Awaiting R0.1 baseline |
| R0.4 | ⏳ Pending | Synthesizing R0.1-R0.3 |

---

## References

**0 A.D. Source:**
- Main: https://gitea.wildfiregames.com/0ad/0ad
- JavaScript interface: /source/scriptinterface
- Scripting system: /source/ps/Scripting
- Mods: /binaries/data/mods

**0 A.D. Community:**
- Website: https://play0ad.com/
- Forum: https://wildfiregames.com/forum/
- Mod repository: Check mod.json format
- Petra AI: Built-in, JavaScript-based

---

**Last Updated:** July 9, 2026  
**Investigation Initiated:** EPIC R0  
**Goal:** Determine minimum viable 0 A.D. integration
