# EPIC R0 Investigation Protocol

**Objective:** Determine the minimum upstream-compatible component required for AI Commander to Observe → Decide → Execute inside real 0 A.D.

**Scope:** Investigation only. NO implementation, NO prototypes, NO production code.

**Constraints:**
- AI Commander architecture is frozen
- 0 A.D. engine should remain as close to upstream as possible
- Forking the engine is the LAST resort

**Deliverable:** One architectural decision backed by evidence from source code.

---

## Central Question

**"What is the smallest upstream-compatible component required to allow AI Commander to Observe → Decide → Execute inside a real running 0 A.D. match?"**

---

## Investigation Stories

### Story R0.1: JavaScript Runtime Investigation

**Goal:** Understand the actual JavaScript capabilities in 0 A.D.

**Source-Code Evidence Required:**

1. **JavaScript Engine**
   - Which engine? (name, version)
   - Source file location
   - Integration approach

2. **Available APIs**
   - Standard JavaScript objects
   - Custom 0 A.D. APIs
   - Restrictions/sandbox

3. **Simulation Scripting**
   - Can subscribe to simulation ticks?
   - Can access simulation state?
   - Can write to simulation?
   - Which subsystems exposed?

4. **AI Scripting**
   - Existing AI system (Petra)
   - Can hook into AI decision-making?
   - State available to AI?
   - Command execution mechanism?

5. **GUI Scripting**
   - Can JavaScript interact with GUI?
   - Can hook into events?
   - Can read/write GUI state?

**Specific Questions to Answer:**

- [ ] Can JavaScript read files from disk? (Source: which API? Which files?)
- [ ] Can JavaScript write files to disk? (Source: which API? Restrictions?)
- [ ] Can JavaScript communicate with C++ engine code? (Source: mechanism?)
- [ ] Can JavaScript schedule timers? (Source: API examples?)
- [ ] Can JavaScript serialize game state? (Source: existing serialization?)
- [ ] Can JavaScript receive callbacks every simulation tick? (Source: callback mechanism?)

**Verification:** Every answer must cite source files and code examples.

---

### Story R0.2: Engine Communication Investigation

**Goal:** Identify ALL existing mechanisms that can transport observations or commands.

**Mechanisms to Investigate:**

1. **Simulation Callbacks**
   - What callbacks exist?
   - What data do they provide?
   - Can they be extended?

2. **GUI Callbacks**
   - What events exist?
   - Can they transport data?
   - Can they be extended?

3. **AI Interfaces**
   - How does Petra AI work?
   - What APIs does it use?
   - Can external code integrate at that level?

4. **Replay System**
   - How are replays generated?
   - What data is captured?
   - Can we intercept this data?

5. **Command System**
   - How are commands queued and executed?
   - Can we inject into this system?
   - What permissions/restrictions?

6. **Network Layer**
   - Is there network code?
   - Is it exposed to mods?
   - Can it be used for external communication?

7. **Serialization**
   - How is game state serialized?
   - For saves? For replays? For network?
   - Can we use existing serialization?

8. **Debug Facilities**
   - What debugging tools exist?
   - Can they be accessed from mods?
   - Can they transport data?

9. **Profiling Interfaces**
   - Any performance monitoring?
   - Can it be extended?

10. **Developer Tools**
    - What exists for modders?
    - What APIs are documented?

**Key Question:** Can ANY of these subsystems transport observations and commands without modifying the 0 A.D. engine?

**Verification:** Document source files and existing usage for each mechanism.

---

### Story R0.3: Ecosystem Investigation

**Goal:** Identify whether the problem is already solved in the 0 A.D. ecosystem.

**Search Areas:**

1. **Official Mods**
   - What shipped with 0 A.D.?
   - Do any expose external APIs?

2. **Community Mods**
   - Remote control mods?
   - HTTP/TCP interface mods?
   - WebSocket implementations?
   - Bot framework mods?

3. **AI Projects**
   - Petra AI source
   - Hannibal AI (GitHub search)
   - Other community AIs
   - Do any communicate externally?

4. **Research Projects**
   - Academic work on 0 A.D.?
   - Bot research?
   - AI research?

5. **Debugging Tools**
   - Tools built by community?
   - Tools built by developers?
   - Remote debugging capabilities?

6. **Multiplayer Tooling**
   - Do multiplayer tools provide APIs?
   - Any external communication?

7. **Replay Tooling**
   - Replay analysis tools?
   - Replay extraction tools?
   - Any state exposure?

**Search Strategy:**
- GitHub: "0ad" + "API", "0ad" + "bot", "0ad" + "network", "0ad" + "remote"
- 0 A.D. mod repository: All mods, filter by description
- 0 A.D. forum: Search "API", "bot", "network", "external"
- 0 A.D. source: Look for example mods, community contributions

**Decision Points:**
- Does something already exist that solves this?
- Can we build on top of it?
- Is it maintained/compatible with current 0 A.D.?
- Would using it commit us to a specific dependency?

**Verification:** Document findings with links and descriptions.

---

### Story R0.4: Architecture Recommendation

**Goal:** Evaluate options and recommend ONE approach for 10-year sustainability.

**Options to Evaluate:**

#### Option A: Pure JavaScript Mod

**Definition:** 
- Only JavaScript code
- Uses 0 A.D.'s built-in JavaScript runtime
- No engine changes
- No native code
- Distributed as standard mod

**Evaluation Criteria:**

- **Implementation Effort:** How many days of work?
- **Maintenance Cost:** Annual cost to keep compatible?
- **Compatibility:** Will it work with 0 A.D. v0.27, v0.28, v0.29?
- **Debugging Complexity:** How hard to debug issues?
- **Performance:** Overhead vs. native code?
- **Long-term Sustainability:** Can it be maintained indefinitely?

**Key Questions:**
- Can JavaScript alone achieve Observe → Decide → Execute?
- What are the limitations?
- What breaks if 0 A.D. changes its JavaScript engine?

#### Option B: JavaScript Mod + Very Small Native Bridge

**Definition:**
- JavaScript frontends the mod
- Minimal C++ extension for specific capabilities
- Part of mod, not core engine
- Requires recompiling 0 A.D. to build mod
- Distributed as compiled mod + source

**Evaluation Criteria:**

- **Implementation Effort:** How many days of C++ work?
- **Maintenance Cost:** Annual cost to keep compatible?
- **Compatibility:** Will it work across versions?
- **Debugging Complexity:** C++ adds complexity?
- **Performance:** Any gains from native code?
- **Long-term Sustainability:** Requires C++ expertise?

**Key Questions:**
- What capabilities require C++?
- How much C++ code minimum?
- What breaks if 0 A.D. changes its scripting API?

#### Option C: Engine Patch

**Definition:**
- New 0 A.D. subsystem (part of core engine)
- Implements observation/command transport
- Full C++ implementation
- Requires maintaining against future releases
- Would need to contribute upstream or maintain fork

**Evaluation Criteria:**

- **Implementation Effort:** Weeks of work?
- **Maintenance Cost:** Annual cost to rebase on new 0 A.D. versions?
- **Compatibility:** Can we stay with upstream?
- **Debugging Complexity:** Deep integration with engine?
- **Performance:** Optimizable since in core?
- **Long-term Sustainability:** Fork or upstream maintenance?

**Key Questions:**
- Would 0 A.D. maintainers accept this?
- What happens if they reject it?
- Are we creating a fork?
- Who maintains it in 5 years?

#### Option D: Existing Community Project

**Definition:**
- Build on top of proven project
- Integrate with existing ecosystem
- Share maintenance responsibility
- Leverage existing expertise

**Evaluation Criteria:**

- **Implementation Effort:** Integration work only?
- **Maintenance Cost:** Depends on project health?
- **Compatibility:** Project-dependent?
- **Debugging Complexity:** Project-dependent?
- **Performance:** Project-dependent?
- **Long-term Sustainability:** Is project sustainable?

**Key Questions:**
- What project(s) qualify?
- Are they maintained?
- Would they accept AI Commander integration?
- Are we tied to their roadmap?

---

## Scoring Framework

For each option, evaluate across these dimensions:

| Dimension | Weight | Option A | Option B | Option C | Option D |
|-----------|--------|----------|----------|----------|----------|
| **Implementation Effort (days)** | — | ? | ? | ? | ? |
| **Maintenance Burden (hours/year)** | HIGH | ? | ? | ? | ? |
| **Upstream Compatibility** | HIGH | ? | ? | ? | ? |
| **Minimal Engine Divergence** | HIGH | ? | ? | ? | ? |
| **Long-term Sustainability** | CRITICAL | ? | ? | ? | ? |
| **Debugging Complexity** | MEDIUM | ? | ? | ? | ? |
| **Performance Impact** | MEDIUM | ? | ? | ? | ? |
| **Deployment Simplicity** | MEDIUM | ? | ? | ? | ? |
| **Community Support** | MEDIUM | ? | ? | ? | ? |

---

## Final Recommendation Format

**The CTO Decision:**

**Option X: [Name]**

**Rationale:**

[2-3 paragraphs explaining why this option best serves AI Commander over 10 years]

**Evidence:**

- Implementation effort: X days
- Annual maintenance: X hours
- Upstream compatibility: [assessment]
- Engine divergence: [assessment]
- Long-term sustainability: [assessment]

**Trade-offs Accepted:**

[What we're sacrificing and why it's worth it]

**Risk Assessment:**

- Primary risk: [what could go wrong]
- Mitigation: [how we mitigate it]
- Fallback: [if primary approach fails]

**Next Steps:**

[What happens if recommendation is approved]

---

## Investigation Verification Checklist

- [ ] R0.1: JavaScript runtime documented with source references
- [ ] R0.2: All communication mechanisms identified and evaluated
- [ ] R0.3: Ecosystem search complete, all findings documented
- [ ] R0.4: One option recommended with detailed evaluation
- [ ] All findings backed by source code or documented evidence
- [ ] No speculation; all claims verifiable
- [ ] Recommendation defensible for 10-year horizon

---

## Success Criteria

Investigation is complete when we can answer:

1. **"What can JavaScript in 0 A.D. actually do?"** — With specific examples from source code
2. **"What communication mechanisms exist?"** — With specific subsystems documented
3. **"Has this been solved before?"** — With specific projects or counterexamples
4. **"What's the minimum viable solution?"** — With one clear recommendation
5. **"Why is this the right choice for 10 years?"** — With detailed rationale

---

**Status:** Investigation Framework Established  
**Next Step:** Execute Story R0.1  
**Timeline:** Evidence-based, thorough, unrushed
