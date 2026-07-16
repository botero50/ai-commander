# Build vs. Use: Custom Game Development Analysis

**Status**: Decision Framework Complete  
**Date**: 2026-07-07  
**Purpose**: Evaluate whether to build a custom RTS game or adapt existing ones

---

## Executive Summary

**Recommendation**: **USE existing games** (particularly 0 A.D.) rather than build from scratch.

**Rationale**: Building a production-quality RTS from scratch would require 6-12 months minimum. Adapting existing mature games provides immediate value while maintaining framework purity.

---

## Option 1: Build Custom Game

### Scenarios Where Building Makes Sense

**Scenario 1**: "We need game mechanics not available in any existing game"
- **Reality**: Most AI/strategy research uses simple mechanics
- **Verdict**: ❌ Not applicable

**Scenario 2**: "We need complete control over determinism"
- **Reality**: 0 A.D., Spring RTS, MicroRTS are already deterministic
- **Verdict**: ❌ Not needed

**Scenario 3**: "We need the game to be TypeScript-based"
- **Reality**: Framework handles process separation well
- **Verdict**: ❌ Not a blocker

**Scenario 4**: "We need sub-millisecond performance"
- **Reality**: AI Commander is batch-oriented, not real-time
- **Verdict**: ❌ Not a constraint

### Build Approach: Technology Stack

If we WERE to build:

**Option A: Godot 4 + GDScript**
```
Godot 4 (open-source game engine)
  ├─ GDScript (Python-like)
  ├─ Built-in RTS systems
  ├─ Cross-platform export
  └─ Active community
```

**Effort**: 
- Core game: 2-3 months
- AI integration: 1-2 months
- Testing/polish: 1-2 months
- **Total: 4-7 months**

**Option B: Custom Rust Engine**
```
Rust (type-safe performance)
  ├─ Custom ECS (entity component system)
  ├─ Deterministic simulation
  ├─ Minimal dependencies
  └─ High performance
```

**Effort**:
- Engine: 3-4 months
- Game systems: 2-3 months
- AI integration: 1-2 months
- **Total: 6-9 months**

**Option C: Extend Spring RTS**
```
Spring RTS (existing engine)
  ├─ Add custom game mod
  ├─ Lua scripting for AI
  ├─ Existing infrastructure
  └─ Proven architecture
```

**Effort**:
- Learning curve: 2-3 weeks
- Game design: 1-2 months
- AI integration: 1-2 months
- **Total: 2-4 months**

### Build Challenges

**Technical**:
- Deterministic floating-point math (hard)
- Pathfinding algorithm optimization (medium)
- Physics simulation (medium)
- Networking/replay system (hard)
- Cross-platform compatibility (medium)

**Project**:
- Scope creep (high risk)
- Gameplay balance (time-consuming)
- Quality assurance (lengthy)
- Documentation effort (often underestimated)

**Time**:
- Minimum viable: 4 months
- Production quality: 8-12 months
- With buffer: 10-16 months

### Build Cost Analysis

**Assuming**:
- 2 developers
- 4-7 month timeline
- $80k/developer/year
- Overhead: 25%

**Cost**:
```
2 developers × $80k/year × (6 months/12) × 1.25 = $100,000
```

**Risk**: High (schedule, quality, scope)

---

## Option 2: Adapt Existing Games

### 0 A.D. Adaptation

**Effort**: ~8 weeks (31 days implementation planned)

**Cost**:
```
2 developers × $80k/year × (2 months/12) = ~$26,700
```

**Advantage**: Design already complete, ready to code.

### MicroRTS Adaptation

**Effort**: ~4 weeks (already research-focused)

**Cost**:
```
1 developer × $80k/year × (1 month/12) = ~$6,700
```

### Spring RTS Adaptation

**Effort**: ~6 weeks (steeper learning curve)

**Cost**:
```
1 developer × $80k/year × (1.5 months/12) = ~$10,000
```

### Total Multi-Platform Approach

**Timeline**: 16 weeks (4 games)
- 0 A.D.: 8 weeks
- MicroRTS: 4 weeks
- Spring RTS: 6 weeks
- Wesnoth: 4 weeks
- Buffer/overlap: -6 weeks
- **Total: ~16 weeks**

**Cost**:
```
16 weeks × 1 developer × $80k/year / 52 weeks = ~$24,600
```

---

## Comparison Matrix

| Aspect | Build Custom | Use 0 A.D. | Use MicroRTS | Multi-Platform |
|--------|:---:|:---:|:---:|:---:|
| **Development Time** | 4-7 months | 8 weeks | 4 weeks | 16 weeks |
| **Implementation Cost** | $100k+ | $27k | $7k | $50k |
| **Time to MVP** | 16 weeks | 8 weeks | 4 weeks | 4 weeks |
| **Design Effort** | High | Done ✅ | Done ✅ | Done ✅ |
| **Learning Curve** | Medium-High | Low (designed) | Low (simple) | Medium |
| **Maturity** | Day 1 = raw | Proven | Proven | Proven |
| **Community Support** | None (new) | Large | Medium | Varies |
| **Gameplay Depth** | TBD | High | Low | Varied |
| **Determinism** | Must implement | Built-in ✅ | Built-in ✅ | Built-in ✅ |
| **Integration Risk** | High | Low | Very Low | Low |
| **Iteration Speed** | Slow | Fast | Very Fast | Fast |

---

## Risk Analysis

### Building from Scratch

**Technical Risks**:
- Determinism bugs in floating-point calculations (70% probability)
- Replay system complexity (60% probability)
- Performance bottlenecks late-game (50% probability)
- **Mitigation**: Extensive testing, established patterns

**Schedule Risks**:
- Scope creep (80% probability)
- Gameplay balance iteration (95% probability)
- Bug fixes in late-stage (70% probability)
- **Impact**: 2-4 week delays likely

**Quality Risks**:
- Insufficient testing (40% probability)
- Missing edge cases (60% probability)
- Poor documentation (50% probability)

**Overall Risk**: 🔴 **HIGH**

### Using 0 A.D.

**Technical Risks**:
- Game updates break compatibility (20% probability)
- Replay format changes (10% probability)
- Performance degradation (15% probability)
- **Mitigation**: Version pinning, careful testing

**Integration Risks**:
- IPC implementation issues (15% probability)
- Process lifecycle bugs (10% probability)
- File I/O race conditions (5% probability)
- **Mitigation**: Established patterns, extensive tests

**Quality Risks**:
- Incomplete game documentation (20% probability)
- Missing edge cases (10% probability)
- **Mitigation**: Source code always available

**Overall Risk**: 🟢 **LOW**

---

## Strategic Implications

### Long-Term Value Creation

**Build Custom**:
- ✅ Complete ownership
- ✅ Perfectly aligned mechanics
- ❌ Ongoing maintenance burden
- ❌ No community ecosystem
- ❌ Single-use game (for us)

**Use Existing**:
- ✅ Community benefits
- ✅ Proven ecosystem
- ✅ Shared infrastructure
- ✅ External contributions
- ❌ Less control over direction

### Community Impact

**Build Custom**:
- Standalone project
- Limited external interest
- Niche use case

**Use 0 A.D. Adapter**:
- Benefits 0 A.D. community
- Potential for external AI research
- Multi-user value
- Spillover benefits to other games

### Technology Leverage

**Build Custom**:
- Framework experience: Medium
- Game architecture: Custom (one-time)
- AI integration: Framework-specific

**Use Existing**:
- Framework experience: High (multiple games)
- Game architecture: Mature (proven patterns)
- AI integration: Reusable (framework interface)

---

## Hybrid Approach (Recommended)

### Phase 1: Integrate Existing Games (Weeks 1-16)

**Goal**: Multi-platform working system

**Games**:
1. **0 A.D.** - Primary (8 weeks)
2. **MicroRTS** - Secondary (4 weeks)
3. **Spring RTS** - Tertiary (6 weeks)

**Deliverable**: Working framework with 3 game adapters

**Cost**: ~$50k

**Timeline**: 16 weeks (Q3-Q4 2026)

### Phase 2: Custom Game Design (Weeks 17-20)

**Goal**: Understand what custom game would look like

**Activities**:
- Document feature gaps in existing games
- Prototype ideal mechanics for AI research
- Design minimalist reference game
- Estimate implementation cost

**Deliverable**: Design document + prototype

**Cost**: ~$10k

**Timeline**: 4 weeks

### Phase 3: Decision Point (Week 20)

**Evaluate**:
- Is custom game worth the development cost?
- Would value added exceed implementation cost?
- Are there feature gaps not covered by existing games?

**Outcomes**:
- ✅ Proceed with custom build (if justified)
- ✅ Enhance adapters instead (lower cost)
- ✅ Continue with existing games (safest)

### Phase 4: Extended Integrations (Weeks 21+)

**Depending on Phase 3 decision**:
- **Custom Game Build**: Requires 6-12 months
- **Adapter Enhancements**: 1-2 month sprints
- **New Game Additions**: 2-4 week sprints

---

## Recommendation Summary

### PRIMARY: Use Existing Games

**0 A.D.** + **MicroRTS** provides:
- ✅ Immediate value (8 weeks to MVP)
- ✅ Proven quality and stability
- ✅ Large research communities
- ✅ Low integration risk
- ✅ Fast iteration cycles
- ✅ Sustainable long-term

**Cost**: ~$30k  
**Timeline**: 8 weeks  
**Risk**: Low  

### SECONDARY: Multi-Platform Support

Add **Spring RTS** + **Battle for Wesnoth** for:
- ✅ Different game mechanics
- ✅ Advanced/alternative scenarios
- ✅ Turn-based research capability
- ✅ Larger battle complexity

**Cost**: +$20k  
**Timeline**: +8 weeks  
**Risk**: Low  

### TERTIARY: Custom Game (Future, Optional)

Build custom game only if:
- Phase 2 analysis reveals critical feature gaps
- ROI analysis justifies development cost
- Team has capacity (post-MVP)
- Clear use case for custom mechanics

**Cost**: $100k+  
**Timeline**: 6-12 months  
**Risk**: High  

---

## Financial Summary

### Scenario 1: Just 0 A.D.

```
Adapter Development:     $27,000
Ongoing Maintenance:     $5,000/year
Total Year 1:           $32,000
```

**Value**: Full production RTS for benchmarking

### Scenario 2: 0 A.D. + MicroRTS

```
Adapter Development:     $35,000
Ongoing Maintenance:     $8,000/year
Total Year 1:           $43,000
```

**Value**: Two research platforms, different complexity profiles

### Scenario 3: Multi-Platform (4 games)

```
Adapter Development:     $50,000
Ongoing Maintenance:     $15,000/year
Total Year 1:           $65,000
```

**Value**: Comprehensive strategy game research platform

### Scenario 4: Custom Game + Adapters

```
Game Development:       $120,000
Adapter Development:     $30,000
Ongoing Maintenance:     $20,000/year
Total Year 1:           $170,000
```

**Value**: Custom game + ecosystem (expensive, not recommended)

---

## Conclusion

### Best Path Forward

**Implement 0 A.D. adapter immediately** (design already complete).

**Add MicroRTS within 3 months** for quick-iteration research.

**Evaluate Spring RTS in 6 months** for advanced scenarios.

**Do NOT build custom game initially** - insufficient ROI and high risk.

### Timeline

- **Week 1-8**: 0 A.D. adapter implementation (primary focus)
- **Week 9-12**: MicroRTS adapter (parallel or sequential)
- **Week 13-16**: Spring RTS adapter (if capacity available)
- **Month 6+**: Evaluate custom game need (unlikely)

### Budget

**Year 1**: $50,000 for multi-platform framework
**Year 2+**: $15,000/year maintenance
**Custom game**: Only if Phase 2 analysis justifies (currently not recommended)

---

## Final Answer to "Should We Build?"

**No.** 

Use existing games:
- ✅ Faster to market
- ✅ Lower cost
- ✅ Proven quality
- ✅ Community ecosystem
- ✅ Lower risk
- ✅ Better use of resources

Build only if:
- Custom mechanics are absolutely required
- Phase 2 analysis shows compelling ROI
- Team has excess capacity
- Timeline is not critical

**Current recommendation**: Begin 0 A.D. implementation. This is the right decision.
