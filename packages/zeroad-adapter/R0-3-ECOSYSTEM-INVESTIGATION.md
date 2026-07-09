# Story R0.3: Ecosystem Investigation

**Status:** 🔬 In Progress  
**Date Started:** July 9, 2026  
**Objective:** Determine whether any existing community projects or solutions already provide what AI Commander needs.

---

## R0.1 & R0.2 Prerequisite: IN PROGRESS ✅

R0.1-R0.2 established that:
- ✅ Pure JavaScript solution is viable
- ✅ All APIs needed are available
- ✅ File-based IPC is appropriate

**R0.3 Task:** Search for existing solutions that might be more sustainable or mature than building from scratch.

---

## Investigation Scope

**What We're Looking For:**

### Category 1: Existing Mods with Remote Control
- Mods that already expose game state externally
- Mods that accept external commands
- Mods with network/file-based integration

### Category 2: AI Integration Projects
- Community AI projects beyond Petra
- Bot frameworks
- AI research projects using 0 A.D.

### Category 3: Debugging & Analysis Tools
- Tools that read game state
- Replay analysis tools
- State inspection tools

### Category 4: Streaming/Broadcast Tools
- Tools for spectating matches externally
- Broadcast overlays with state access
- Recording/analysis tools

### Category 5: Automation Tools
- Tools for automated match testing
- Tournament automation
- Scripting frameworks

---

## Search Strategy

### Search Locations

1. **GitHub**
   - Search: "0ad" + "bot", "api", "remote", "control", "mod"
   - Look for: Forks, community projects, AI research
   - Evaluate: Maintenance status, code quality, compatibility

2. **0 A.D. Forum**
   - Forum: https://wildfiregames.com/forum/
   - Categories: Modding, AI, Development
   - Look for: Project announcements, mod releases

3. **0 A.D. Mod Repository**
   - Website: https://play0ad.itch.io/ (official mods)
   - Look for: Mods with network/API exposure
   - Evaluate: Downloads, maintenance, rating

4. **Research Communities**
   - Academic papers on 0 A.D. AI
   - GitHub research projects
   - University projects

5. **0 A.D. Official Repository**
   - Gitea: https://gitea.wildfiregames.com/0ad/0ad
   - Look for: Official tools, contrib projects
   - Evaluate: Maintenance by core team

---

## Candidate Projects to Evaluate

### Project 1: Petra AI (Built-in)

**Status:** 🔍 Investigating

**What It Is:**
- Official AI in 0 A.D.
- Pure JavaScript
- Shipped with every release

**Evaluation Questions:**
- [ ] Can we extend Petra instead of replacing it?
- [ ] Is Petra API documented?
- [ ] Can we hook into Petra's decision-making?
- [ ] Would extending Petra be easier than new component?

**Verdict:** (To be filled)

---

### Project 2: Community Remote Control Mods

**Status:** 🔍 Searching

**What We're Looking For:**
- Any existing mod that:
  - Exposes game state externally
  - Accepts commands from outside
  - Uses file-based or socket-based IPC

**Search Queries:**
- GitHub: "0ad" + "remote"
- GitHub: "0ad" + "api"
- Forum: "external control"
- Mod repo: "controller" or "remote"

**Known Projects to Check:**
- [ ] Any multiplayer bots framework?
- [ ] Any tournament automation tools?
- [ ] Any spectator state exposure?

**Verdict:** (To be filled)

---

### Project 3: AI Research Projects

**Status:** 🔍 Searching

**What We're Looking For:**
- Academic or research projects using 0 A.D.
- Might have state access mechanisms
- Might have command execution system
- Could be abandoned but useful reference

**Search Queries:**
- Google Scholar: "0 A.D." + "AI"
- GitHub: "0ad" + "research"
- GitHub: "0ad" + "learning"
- Academic databases

**Known References:**
- [ ] Any university student projects?
- [ ] Any published AI research?
- [ ] Any machine learning frameworks for 0 A.D.?

**Verdict:** (To be filled)

---

### Project 4: Streaming/Broadcast Tools

**Status:** 🔍 Searching

**What We're Looking For:**
- Tools that show game state during broadcast
- Tools that record with state information
- Tools with spectator APIs

**Known Projects to Check:**
- [ ] 0 A.D. in-game spectator features?
- [ ] Any broadcast overlays?
- [ ] Any stream integration tools?

**Verdict:** (To be filled)

---

### Project 5: Testing/Automation Tools

**Status:** 🔍 Searching

**What We're Looking For:**
- Tools for automated match testing
- Tools for running tournaments
- Tools for AI testing and benchmarking

**Search Queries:**
- GitHub: "0ad" + "test"
- GitHub: "0ad" + "automation"
- Forum: "automated" + "testing"

**Verdict:** (To be filled)

---

## Evaluation Criteria

For each project found, evaluate:

### 1. Does It Solve the Six Capabilities?

| Capability | Provided? | How |
|-----------|-----------|-----|
| Launch Match | Yes / No | ... |
| Observe | Yes / No | ... |
| Execute | Yes / No | ... |
| Match Lifecycle | Yes / No | ... |
| Replay | Yes / No | ... |
| Determinism | Yes / No | ... |

### 2. Maintenance & Compatibility

- **Last Updated:** When?
- **0 A.D. Version:** Which versions supported?
- **Active Maintainer:** Still maintained?
- **Code Quality:** Well-written and documented?

### 3. Sustainability for 10 Years

- Would building on this be more stable than starting fresh?
- Is the project likely to be maintained?
- Does it have a community?
- Would it require updates with new 0 A.D. versions?

### 4. Integration Effort

- How much work to integrate with AI Commander?
- Would we need to modify it?
- Could we use it as-is?
- What's the learning curve?

---

## Initial Hypothesis

**Before searching:**

Hypotheses about what we'll find:

1. **Pure File-Based Solution**
   - Unlikely anyone has done exactly this
   - Too specific for AI Commander use case
   - This is why we're building it

2. **Network Socket Solution**
   - Possible someone created HTTP/WebSocket mod
   - Might be abandoned
   - More complex than file-based approach

3. **Petra AI Extension**
   - Possible there are Petra extensions
   - Could be reference for hooking into AI
   - Might not solve Observe/Execute fully

4. **Academic Research Project**
   - Possible university project with state access
   - Might be specific to their research
   - Could provide reference implementation

5. **Most Likely Outcome**
   - No existing solution that solves all six capabilities
   - Multiple partial solutions available as references
   - Pure JavaScript mod is the right approach

---

## Detailed Search Progress

### GitHub Search Results

**Status:** 🔍 Searching

**Queries Executed:**
- [ ] "0ad" + "bot"
- [ ] "0ad" + "remote"
- [ ] "0ad" + "api"
- [ ] "0ad" + "control"
- [ ] "0ad" + "ai"

**Projects Found:** (To be filled)

---

### 0 A.D. Forum Search Results

**Status:** 🔍 Searching

**Categories Checked:**
- [ ] Modding
- [ ] AI
- [ ] Development
- [ ] Help & Tutorials

**Projects Found:** (To be filled)

---

### Mod Repository Search Results

**Status:** 🔍 Searching

**Mods Evaluated:** (To be filled)

---

## Final Ecosystem Assessment

### Projects That Solve All Six Capabilities

(Will be filled as search completes)

### Projects That Solve Some Capabilities

(Will be filled as search completes)

### Projects That Provide Reference Implementation

(Will be filled as search completes)

### Conclusion

(Will be filled after search)

---

## Recommendation

Once R0.3 completes, answer:

**Question:** Should we build our own solution or build on existing project?

**Decision Criteria:**
1. If complete solution exists AND is maintained → Use it
2. If partial solutions exist AND can be extended → Evaluate integration effort
3. If no complete solution exists → Build pure JavaScript mod (Plan A from R0.1)

---

**Status:** 🔍 Awaiting ecosystem search results  
**Next:** Complete searches, evaluate each project, make recommendation
