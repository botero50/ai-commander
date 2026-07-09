# Story R0.4: Architecture Recommendation

**Status:** ⏳ Pending R0.1-R0.3 Completion  
**Date Started:** July 9, 2026  
**Objective:** Recommend ONE approach that satisfies all six capabilities with 10-year sustainability.

---

## Prerequisites: R0.1, R0.2, R0.3

**Status of Dependencies:**
- ✅ R0.1: JavaScript Runtime Investigation — COMPLETE
- 🔬 R0.2: Communication Mechanisms — IN PROGRESS (Agent working)
- 🔬 R0.3: Ecosystem Investigation — IN PROGRESS (Agent working)

**Awaiting:** Completion of R0.2 and R0.3 before final synthesis.

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

## Final Recommendation Format

**The CTO Decision:**

Once R0.1, R0.2, R0.3 complete, this section will be filled with:

```
Option [A/B/C/D]: [Name]

Capabilities Satisfied:
- [x] Launch Match
- [x] Observe (full world state every tick)
- [x] Execute (all required command types)
- [x] Match Lifecycle (detect events)
- [x] Replay (save and load)
- [x] Determinism (identical results)

All six required capabilities satisfied. No unnecessary features.

Rationale:
[2-3 paragraphs explaining why this option best serves AI Commander 
 over 10 years, considering maintainability, sustainability, and risk]

Evidence:
- Implementation effort: X days
- Annual maintenance: X hours
- Upstream compatibility: [assessment]
- Engine divergence: [assessment]
- Long-term sustainability: [assessment]
- Simplicity & Maintainability: [assessment]

Trade-offs Accepted:
[What we're NOT implementing and why]

Risk Assessment:
- Primary risk: [what could go wrong]
- Mitigation: [how we mitigate it]
- Fallback: [if primary approach fails]

Next Steps:
[What happens if recommendation is approved]
```

---

## When This Will Be Complete

1. **R0.2 Agent completes** → API signatures verified
2. **R0.3 Agent completes** → Ecosystem searched
3. **R0.4 Synthesis** → Final recommendation written
4. **Approval** → EPIC R0 investigation closes

---

**Status:** ⏳ Awaiting R0.1-R0.3 completion  
**Timeline:** Complete by July 10, 2026  
**Next:** Final synthesis once dependencies complete
