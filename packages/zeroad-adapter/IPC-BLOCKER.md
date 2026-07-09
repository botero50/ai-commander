# CRITICAL BLOCKER: 0 A.D. IPC Protocol Not Available

**Date:** July 9, 2026  
**Status:** 🚨 **BLOCKS ENTIRE PROJECT**  
**Test Result:** ❌ FAILED  

---

## The Problem

The zeroad-adapter assumes 0 A.D. will:
- Listen on TCP port 9090
- Accept JSON commands like `{"command": "get_state"}`
- Return game state as JSON

**Testing Result:**
```
[4:50:27 PM] 🔌 Attempting to connect to 127.0.0.1:9090...
[4:50:27 PM] ❌ Failed to connect: connect ECONNREFUSED 127.0.0.1:9090
```

**Conclusion:** Standard 0 A.D. does NOT support this protocol.

---

## What We Know

✅ **What Works:**
- We CAN launch 0 A.D.
- Game window opens
- Process runs cleanly
- We can spawn and manage the process

❌ **What's Missing:**
- 0 A.D. does NOT listen on port 9090
- 0 A.D. does NOT accept external JSON commands
- 0 A.D. does NOT expose game state via IPC
- Standard 0 A.D. has NO documented external API

---

## Why This Matters

Without IPC protocol, we cannot:

1. **Story R1.3** — Read game state
   - No way to observe units, resources, buildings
   - No way to track game progress
   - No observation loop possible

2. **Story R1.4** — Execute commands
   - No way to inject actions
   - No way to control players
   - No command pipeline possible

3. **Story R2.1** — Ollama integration
   - No way to feed state to LLM
   - No way to execute LLM decisions
   - Complete integration impossible

**The entire EPIC R1 and R2 pipelines depend on this.**

---

## Possible Solutions

### Option 1: Use 0 A.D.'s JavaScript Engine

**Status:** ✅ Possible (0 A.D. has JS scripting for AI)

0 A.D. has a built-in JavaScript engine for AI scripting. We could:
1. Write a JavaScript mod for 0 A.D.
2. Mod runs inside the game
3. Mod exposes game state to external process
4. Mod accepts commands from external process

**Advantage:** Uses built-in 0 A.D. infrastructure  
**Disadvantage:** Must write/maintain a 0 A.D. mod  
**Effort:** Medium (2-5 days)

**Example:**
- Mod runs in 0 A.D. JavaScript context
- Exports state to a file or socket
- Node.js adapter reads from file/socket
- Node.js sends commands to mod via similar mechanism

### Option 2: Find Existing Community Mod

**Status:** ❓ Unknown (may exist)

0 A.D. community projects (Petra AI, etc.) may have:
- Network capabilities
- State exposure mechanisms
- Command injection support

**Advantage:** May already exist, save development  
**Disadvantage:** May not have exactly what we need  
**Effort:** 1-3 days (research + integration)

**Research:**
- Check 0 A.D. mod repository
- Search GitHub for 0ad-*-network or *-api projects
- Contact community (forum, Discord)

### Option 3: Use 0 A.D.'s Replay/Recording System

**Status:** ⚠️ Partial solution

0 A.D. records all matches as replay files (.ogv). We could:
1. Run a match to completion
2. Parse the replay file for state
3. Extract unit positions, resources, etc.

**Advantage:** No mod required, uses existing system  
**Disadvantage:** Delayed observation (post-match, not real-time)  
**Effort:** Low (replay parsing already exists)

**Limitation:** Cannot give real-time control to LLM. Only works for:
- Replaying matches
- Analyzing completed games
- Post-match decision extraction

**Does NOT solve:** Live Ollama control of players

### Option 4: Write Minimal 0 A.D. Mod

**Status:** ✅ Possible (0 A.D. modding documented)

Write a minimal mod that:
1. Hooks into game simulation
2. Writes state to a local file (JSON)
3. Watches a command file for incoming actions
4. Executes commands as they arrive

**Advantage:** Simple, self-contained, custom protocol  
**Disadvantage:** Must maintain mod, update with 0 A.D. versions  
**Effort:** 3-7 days (mod development + testing)

**Implementation Sketch:**
```javascript
// In 0 A.D. mod (runs inside game)
function onGameTick() {
  // Write state to: C:\temp\0ad-state.json
  writeStateFile(getGameState());
  
  // Read commands from: C:\temp\0ad-commands.json
  const commands = readCommandFile();
  for (const cmd of commands) {
    executeCommand(cmd);
  }
}
```

```javascript
// In Node.js adapter
setInterval(() => {
  const state = JSON.parse(fs.readFileSync('C:\\temp\\0ad-state.json'));
  observationLoop.update(state);
  
  const commands = getNextCommands();
  fs.writeFileSync('C:\\temp\\0ad-commands.json', JSON.stringify(commands));
}, 100);
```

---

## Recommended Path Forward

### Immediate (Next 1-2 days):

1. **Research:**
   - Check 0 A.D. documentation for external APIs
   - Search community projects (GitHub, mod repository)
   - Contact 0 A.D. developers or community

2. **Decision Point:**
   - Does an existing mod do what we need? → Use it
   - Is there documented protocol? → Implement against it
   - Must write a mod? → Proceed with Option 4

### Medium-term (3-7 days):

Implement the chosen solution:
- Option 2: Integrate existing mod
- Option 4: Write custom mod
- Option 1: Use JavaScript engine scripting

### Fallback (if no solution exists):

Use Option 3 (replay-based analysis):
- Lose real-time Ollama control
- Can still analyze and demonstrate AI decision-making
- Useful for research but not for live gameplay

---

## Impact Assessment

**If we find a solution:** 
- ✅ Can proceed with Story R1.3-R1.4
- ✅ Can implement full Ollama integration
- ✅ Can achieve the goal: real Ollama-controlled players

**If no solution exists:**
- ❌ Cannot read real game state in real-time
- ❌ Cannot control players in real-time
- ❌ Project becomes demonstration-only (replay analysis)
- ⚠️ Major pivot required

---

## Key References

**0 A.D. Resources:**
- Website: https://play0ad.com/
- Source: https://gitea.wildfiregames.com/0ad/0ad
- Modding: https://trac.wildfiregames.com/wiki/Modding
- Community: https://wildfiregames.com/forum/

**Relevant Projects:**
- Petra AI: Built-in AI (JavaScript-based)
- 0 A.D. Mod Repository: May have network mods

---

## Next Action

**BLOCKED UNTIL:**
One of the following is resolved:
1. ✅ Existing mod found that exposes state + accepts commands
2. ✅ 0 A.D. documented protocol discovered
3. ✅ Custom mod written that solves the IPC problem
4. ✅ Explicit decision to use replay-based analysis instead

**Assigned to:** Research & Investigation  
**Timeline:** 1-2 days for research decision  

---

## Escalation

This is a **critical blocker** that determines the entire project's feasibility.

**If 0 A.D. genuinely cannot be externally controlled in real-time:**
- We need a different game
- Or a different approach (simulation, cloud API, etc.)
- This should be decided ASAP

**Current status:** Under investigation

---

**Report created:** July 9, 2026, 4:50 PM  
**Test result:** IPC connection refused on port 9090  
**Severity:** 🚨 CRITICAL — Blocks all further integration work
