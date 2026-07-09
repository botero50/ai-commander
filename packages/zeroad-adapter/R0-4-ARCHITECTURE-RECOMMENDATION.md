# Story R0.4: Architecture Recommendation

**Status:** ⏳ Pending R0.1-R0.3 Completion  
**Date Started:** July 9, 2026  
**Objective:** Recommend ONE approach that satisfies all six capabilities with 10-year sustainability.

---

## Prerequisites: R0.1, R0.2, R0.3

**Status of Dependencies:**
- ✅ R0.1: JavaScript Runtime Investigation — COMPLETE
- ✅ R0.2: Communication Mechanisms Investigation — COMPLETE
- ✅ R0.3: Ecosystem Investigation — COMPLETE

**All three investigations complete. Ready for final synthesis.**

---

## Central Decision Question

**"What is the smallest upstream-compatible integration layer that satisfies ALL SIX required capabilities?"**

---

## Four Options Under Evaluation

### Option A: Pure JavaScript Mod

**Architecture:**
- Only JavaScript code
- Uses 0 A.D.'s built-in JavaScript runtime
- File-based IPC with JSON state/commands
- No engine changes
- No native code

**Pros:**
- ✅ No engine modifications (stays with upstream)
- ✅ Minimal code (~300 lines)
- ✅ Simple to test and debug
- ✅ Runs on any 0 A.D. version with JS support
- ✅ Pattern already proven (Petra AI uses identical approach)

**Cons:**
- ⚠️ File I/O latency (vs. memory-based state)
- ⚠️ No optimization opportunities
- ⚠️ Dependent on VFS API stability

**Viability:** HIGH  
**Sustainability:** A+  
**Effort:** 3-5 days  
**Maintenance:** 1-2 hours/year

---

### Option B: JavaScript Mod + Small Native Bridge

**Architecture:**
- JavaScript frontend (state/command handling)
- Minimal C++ extension for performance-critical operations
- Part of mod (not core engine)
- Requires recompiling 0 A.D. for the mod

**Pros:**
- ✅ Better performance than pure JS
- ✅ Still stays with upstream (mod-based)
- ✅ Easier optimization if bottlenecks found

**Cons:**
- ❌ Requires C++ expertise
- ❌ Requires recompilation
- ❌ Breaks binary compatibility
- ❌ More complex to maintain
- ❌ More complex to distribute

**Viability:** MEDIUM  
**Sustainability:** B  
**Effort:** 7-10 days  
**Maintenance:** 5-10 hours/year

---

### Option C: Engine Patch

**Architecture:**
- New subsystem in core 0 A.D. engine
- Full C++ implementation
- Native IPC protocol (TCP, WebSocket, etc.)
- Requires maintaining against future releases

**Pros:**
- ✅ Highest performance
- ✅ Cleanest architecture (in core engine)
- ✅ Can be optimized deeply

**Cons:**
- ❌ Fork risk (will 0 A.D. accept it?)
- ❌ Huge maintenance burden
- ❌ Annual rebasing on new 0 A.D. versions
- ❌ Breaks compatibility with upstream
- ❌ Weeks of development effort
- ❌ Requires contributing to 0 A.D. or forking
- ❌ 10-year maintenance commitment

**Viability:** LOW  
**Sustainability:** C (fork risk)  
**Effort:** 20-30 days  
**Maintenance:** 40-80 hours/year

---

### Option D: Existing Community Project

**Architecture:**
- Build on proven project (if one exists)
- Integrate with existing ecosystem
- Share maintenance

**Pros:**
- ✅ Reduces custom development
- ✅ Leverages existing expertise
- ✅ May have active maintainer

**Cons:**
- ❌ Dependent on project health
- ❌ May be abandoned
- ❌ May not fit exactly
- ❌ Tied to their roadmap
- ❌ *Outcome depends on what we find in R0.3*

**Viability:** UNKNOWN (depends on R0.3 results)  
**Sustainability:** UNKNOWN  
**Effort:** UNKNOWN  
**Maintenance:** UNKNOWN

---

## Scoring Framework

| Dimension | Weight | A | B | C | D |
|-----------|--------|----|----|----|----|
| **Implementation Effort** | — | 3-5 days | 7-10 days | 20-30 days | TBD |
| **Annual Maintenance Burden** | HIGH | ~2 hrs | ~8 hrs | ~60 hrs | TBD |
| **Upstream Compatibility** | HIGH | ✅ Full | ✅ Full | ❌ Fork | TBD |
| **Engine Divergence** | HIGH | ✅ None | ⚠️ Mod | ❌ Major | TBD |
| **Simplicity** | MEDIUM | ✅ Simple | ⚠️ Medium | ❌ Complex | TBD |
| **Sustainability (10yr)** | CRITICAL | ✅ A+ | ✓ B | ❌ C | TBD |
| **Distribution** | MEDIUM | ✅ Easy | ⚠️ Medium | ❌ Hard | TBD |
| **Testing & Debugging** | MEDIUM | ✅ Easy | ⚠️ Medium | ❌ Hard | TBD |
| **Community Support** | LOW | ✓ Good | ⚠️ Fair | ❌ Low | TBD |

---

## Decision Framework

**The recommendation will follow this logic:**

### If R0.3 Finds Complete Solution
**→ Recommendation: Option D (use existing project)**
- Condition: Project must be maintained, must provide all six capabilities
- Alternative: If Option D incomplete, use Option A as fallback

### If R0.3 Finds Partial Solutions
**→ Recommendation: Option A (pure JS mod)**
- Reason: Integration effort of Option B/C exceeds benefit of partial solution
- Reference: Use partial solutions as implementation guides

### If R0.3 Finds Nothing
**→ Recommendation: Option A (pure JavaScript mod)**
- Reason: This is the optimal solution anyway
- Pattern: Matches Petra AI approach (proven architecture)
- Sustainability: Excellent for 10+ years

---

## The CTO Decision: FINAL RECOMMENDATION ✅

---

### **Option D: Official 0 A.D. RL Interface (RECOMMENDED)**

#### Capabilities Satisfied
- [x] Launch Match
- [x] Observe (full world state every tick)
- [x] Execute (all required command types)
- [x] Match Lifecycle (detect events)
- [x] Replay (save and load)
- [x] Determinism (identical results)

**All six required capabilities satisfied. No unnecessary custom development.**

---

#### Rationale

Investigation R0.1-R0.3 revealed a **critical fact:** the 0 A.D. team already built exactly what AI Commander needs. The official RL Interface is not a hidden feature or experimental code — it's a production-ready HTTP API built into pyrogenesis, actively maintained, and used in academic research.

**Why Option D is the right choice:**

1. **Already Exists & Is Maintained**
   - Not a theoretical solution we must build
   - Official feature of 0 A.D. engine
   - Active maintenance in 2024+
   - Used in 0ad4ai research projects

2. **Better Architecture Than Custom Mod**
   - HTTP API is cleaner than file-based IPC
   - Official library support (Python client)
   - Better debuggability (network inspector tools)
   - Scales without file contention

3. **10-Year Sustainability**
   - Maintained by 0 A.D. core team
   - Part of engine core (won't be removed)
   - Academic validation (research projects)
   - Zero risk of being abandoned

4. **Simplifies Implementation**
   - We don't build the IPC layer
   - We wrap the existing HTTP API
   - Focus on decision-making (Ollama integration)
   - Reduce our codebase by 300+ lines

5. **Avoids False Efficiency**
   - Option A looked simpler initially
   - But we'd reinvent what already exists
   - That's not simplicity, that's waste
   - Building on proven infrastructure is smarter

---

#### Evidence

**From R0.1: JavaScript Investigation**
- Confirmed: All APIs work as expected
- Finding: Pure JavaScript mod is technically viable
- BUT: Not necessary if official API exists

**From R0.2: Communication Mechanisms**
- All mechanisms verified (VFS, OnUpdate, PostCommand, JSON)
- Pattern is proven, reliable, sustainable
- File-based IPC works fine technically
- BUT: HTTP API from RL Interface is cleaner architecture

**From R0.3: Ecosystem Investigation**
- Found: Official 0 A.D. RL Interface (production-ready)
- Searched: 20+ projects across GitHub, forums, research
- Result: RL Interface is the only complete external control solution
- Why no competition: Because official solution already exists

---

#### Implementation Approach

**Launch 0 A.D.:**
```bash
pyrogenesis --rl-interface=127.0.0.1:6000 \
  --autostart-nonvisual --mod=public
```

**Integration:**
```javascript
// Node.js/TypeScript adapter
class AICommanderAdapter {
  constructor(port = 6000) {
    this.baseUrl = `http://localhost:${port}`;
  }
  
  async getGameState() {
    // HTTP GET /state
    return fetch(`${this.baseUrl}/state`).then(r => r.json());
  }
  
  async executeCommands(actions) {
    // HTTP POST /step with actions
    return fetch(`${this.baseUrl}/step`, {
      method: 'POST',
      body: JSON.stringify(actions)
    }).then(r => r.json());
  }
}
```

---

#### Trade-offs Accepted

**What We're NOT Building:**
- ✗ Custom JavaScript mod for state/command IPC
  - Reason: Official RL Interface handles this better
- ✗ File-based JSON protocol
  - Reason: HTTP API is superior
- ✗ Modification to 0 A.D. core
  - Reason: Not needed, already supported

**What We ARE Building:**
- ✅ Ollama integration layer (decision-making)
- ✅ Tournament orchestration UI (match browser, results viewer)
- ✅ Replay analysis tools (if needed)
- ✅ Wrapper API for Ollama ↔ RL Interface communication

**Complexity Tradeoff:**
- Lost: 300 lines of custom mod code
- Gained: Focus on AI decision-making instead of IPC
- Net: Simpler, cleaner architecture

---

#### Risk Assessment

**Primary Risk:** RL Interface API changes in future 0 A.D. versions

**Mitigation:**
- Official API is stable (used by research projects)
- Changes would affect academic users too
- If API changes, we just update our wrapper
- Wrapper is thin layer, easy to maintain

**Secondary Risk:** RL Interface doesn't support some edge case we need

**Mitigation:**
- We've verified all six capabilities work
- If edge case found, we can:
  1. First: Request feature from 0 A.D. team
  2. Second: Contribute patch to 0 A.D. (better for ecosystem)
  3. Last: Supplement with custom code (minimal)

**Fallback Plan:**
- If RL Interface becomes unmaintained, Option A (pure JS mod) is viable
- We already validated it technically in R0.1-R0.2
- But this fallback is very unlikely

---

#### Evidence Summary

| Dimension | Assessment |
|-----------|-----------|
| **Implementation Effort** | 5-7 days (HTTP wrapper + Ollama integration) |
| **Annual Maintenance** | <1 hour (just monitoring 0 A.D. releases) |
| **Upstream Compatibility** | ✅ 100% (using official API) |
| **Engine Divergence** | ✅ 0% (no modifications) |
| **Long-term Sustainability** | ✅ A+ (official support) |
| **Simplicity & Maintainability** | ✅ A (clean architecture, thin wrapper) |
| **Community Support** | ✅ A (official feature, research validation) |
| **Risk Level** | ✅ Very Low |

---

#### Next Steps if Approved

**Immediate (Week 1):**
1. Create HTTP wrapper for RL Interface
2. Wire Ollama integration
3. Test with simple decision logic

**Week 2-3:**
1. Build match browser UI
2. Add tournament orchestration
3. Comprehensive testing

**Week 4:**
1. Add replay analysis tools (if needed)
2. Polish and documentation
3. Release v1.0 beta

**After Release:**
1. User testing with broadcasters
2. Performance optimization (if needed)
3. Feature requests from community

---

## Final Summary

**The Investigation is Complete.**

We set out to answer: "What is the smallest upstream-compatible integration layer that allows AI Commander to control real 0 A.D. matches?"

**The Answer:** The 0 A.D. RL Interface.

It's not a custom solution we must build — it's an official feature we must leverage. This is better architecture, better sustainability, and better for the long-term health of the project.

**Recommendation: Approve Option D. Move to EPIC R1 implementation.**

---

**Investigation Completed:** July 9, 2026  
**CTO Decision:** Option D - Official RL Interface  
**Status:** Ready for Implementation Phase (EPIC R1)
