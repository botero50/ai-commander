# 0 A.D. Adapter for AI Commander

**Status**: Architecture Design Complete ✅  
**Next Phase**: Implementation Ready  
**Reference Game**: [0 A.D. - Empires Ascendant](https://play0ad.com/)

---

## Quick Navigation

This directory contains comprehensive documentation for integrating 0 A.D. as the reference RTS implementation for AI Commander.

### For Different Roles

**📋 Project Manager / Team Lead**:
- Start with [0ad-DESIGN-SUMMARY.md](0ad-DESIGN-SUMMARY.md)
- Review implementation phases and timeline
- Check risk assessment and success criteria

**🏗️ Architect / Tech Lead**:
- Read [0ad-INTEGRATION-ARCHITECTURE.md](0ad-INTEGRATION-ARCHITECTURE.md)
- Review communication mechanism and design decisions
- Check package structure and API design

**👨‍💻 Developer (Starting Implementation)**:
- Read [0ad-IMPLEMENTATION-ROADMAP.md](0ad-IMPLEMENTATION-ROADMAP.md)
- Start with EPIC 1 (Foundation)
- Use story descriptions as implementation guides

**🔬 Researcher / Game Designer**:
- Consult [0ad-INVESTIGATION.md](0ad-INVESTIGATION.md)
- Deep dive into specific subsystems (engine, AI, simulation)
- Reference game mechanics and capabilities

---

## Document Structure

### 1. **0ad-INVESTIGATION.md** (Complete Analysis)
Comprehensive technical investigation of 0 A.D. covering 25 subsystem areas:
- Overall engine architecture (Pyrogenesis)
- Simulation system (component-based ECS)
- AI scripting (JavaScript with SpiderMonkey)
- Modding system and capabilities
- Replay and save game systems
- Networking and multiplayer
- Command model and resources
- Existing community projects

**Use When**: You need deep technical details about specific 0 A.D. subsystems

### 2. **0ad-INTEGRATION-ARCHITECTURE.md** (Design Decisions)
Technical architecture and design decisions covering:
- Communication mechanism (Process IPC + file-based)
- Recommended integration strategy
- Adapter package structure
- Runtime and match lifecycles
- Observation models
- Command execution approach
- Replay and result handling
- Error handling strategy
- Capability matrix and risk assessment

**Use When**: Implementing components or making integration decisions

### 3. **0ad-IMPLEMENTATION-ROADMAP.md** (Epic Breakdown)
Complete implementation backlog with 22 stories across 7 epics:
- Epic 1: Foundation (process management)
- Epic 2: Configuration (match setup)
- Epic 3: Execution (match running)
- Epic 4: Replay (parsing .ogv files)
- Epic 5: State (observation)
- Epic 6: Results (outcome determination)
- Epic 7: Testing & documentation

Each story includes:
- Effort estimate
- Acceptance criteria
- Technical details
- Code examples
- Dependencies and risks

**Use When**: Planning sprints or implementing specific stories

### 4. **0ad-DESIGN-SUMMARY.md** (Executive Overview)
High-level summary of architecture design:
- Key design decisions
- Architecture layers
- Data flows
- Public API
- Integration points
- Limitations and future work
- Success criteria

**Use When**: You need a quick overview of the whole design

---

## Key Design Decisions

### 1. Process-Based IPC (vs. Shared Memory)
**Decision**: CLI arguments + file-based observation  
**Why**: 0 A.D. has no remote API; file-based is simple and reliable  

### 2. Custom AI Bots (vs. External Control)
**Decision**: JavaScript mod implementing AI logic  
**Why**: 0 A.D. doesn't support command injection; mods are standard  

### 3. Batch Analysis (vs. Real-Time)
**Decision**: Analyze completed matches via replay file  
**Why**: MVP doesn't need real-time; replay provides complete history  

### 4. Version Pinning (vs. Latest)
**Decision**: Lock to specific 0 A.D. release  
**Why**: Determinism not guaranteed across versions  

---

## Implementation Timeline

| Phase | Duration | Goal | Stories |
|-------|----------|------|---------|
| **1: MVP** | 4 weeks | Execute and parse matches | 1.1-3.3, 4.1-4.5, 6.1-6.2 |
| **2: Analysis** | 2 weeks | Extract statistics | 5.1-5.2 |
| **3: Polish** | 2 weeks | Testing and docs | 7.1-7.3 |
| **Total** | **~8 weeks** | **Fully functional** | **22 stories** |

**Critical Path**: Foundation (Week 1-2) → Execution (Week 2-3) → Parsing (Week 3-5) → Results (Week 5-6)

---

## What's Already Done

✅ **Completed during design phase:**
- 25 subsystems investigated (engine, AI, simulation, networking, etc.)
- Communication mechanism selected and documented
- Integration architecture designed
- Package structure defined
- API design documented
- 22 implementation stories written with details
- Test strategy outlined
- Risk assessment completed

❌ **Not Yet Done** (Implementation Phase):
- No code written
- No parsing libraries integrated
- No 0 A.D. executable detection
- No replay file decompression
- No command parsing logic

---

## Getting Started with Implementation

### Prerequisites
- Node.js 18+ and TypeScript
- 0 A.D. installed (for integration testing)
- Understanding of the framework (review `@ai-commander/adapter` and `@ai-commander/core`)

### Setup Steps
1. Create `packages/adapter-0ad/` directory (Story 1.1)
2. Copy TypeScript config from existing packages
3. Start with Story 1.1 (scaffolding)
4. Follow implementation order in roadmap

### Helpful Resources
- **0 A.D. Source**: https://gitea.wildfiregames.com/0ad/0ad
- **Entity Docs**: https://docs.wildfiregames.com/entity-docs/
- **Community**: https://wildfiregames.com/forum/
- **AI Examples**: 
  - Petra: https://github.com/0ADMods (built-in)
  - Arch AI: https://github.com/eserlxl/Arch-AI
  - Hannibal: https://github.com/agentx-cgn/Hannibal

---

## Architecture at a Glance

```
[AI Commander Framework]
        |
        v
[Adapter Package]
    ├── Config Builder
    ├── Launcher (spawn process)
    ├── Replay Parser
    ├── Save Parser
    ├── Outcome Analyzer
    └── Stats Extractor
        |
        v
[0 A.D. Process]
    ├── Simulation (deterministic)
    ├── AI Bot (JavaScript mod)
    ├── Replay Recording
    └── Save State Output
        |
        v
[Result Files]
    ├── Replay (.ogv)
    ├── Save (JSON)
    └── Logs (stdout)
```

---

## Key Interfaces

### Configuration
```typescript
interface Match0ADConfig {
  players: PlayerConfig[];
  map: { name: string; seed?: number };
  settings: { difficulty: number; cheatsEnabled: boolean };
}
```

### Result
```typescript
interface Match0ADResult {
  outcome: { winner: number; condition: VictoryCondition };
  replay: { metadata: ReplayMetadata; commands: Command[] };
  statistics: MatchStatistics;
  executionTime: number;
}
```

### Main API
```typescript
class Match0ADAdapter {
  async executeMatch(config: Match0ADConfig): Promise<Match0ADResult>;
}
```

---

## Common Questions

### Q: Will this work with the existing AI Commander framework?
**A**: Yes. The adapter implements the standard Adapter interface and integrates with Brain, Tournament, and Analysis packages.

### Q: What if 0 A.D. is not installed?
**A**: The launcher detects the installation path. If not found, tests are skipped or user is prompted.

### Q: Can we observe matches in real-time?
**A**: MVP only supports end-of-match analysis. Real-time observation is Phase 4 (future) via custom JavaScript mod.

### Q: How deterministic is 0 A.D.?
**A**: Very. Same seed + configuration always produces identical game. This is critical for replay functionality.

### Q: Can we run multiple matches in parallel?
**A**: Yes. Each match spawns its own process in its own temp directory. System limits (CPU, memory) apply.

### Q: What about network multiplayer?
**A**: Out of scope for MVP. Current design supports local 2-8 player matches. Remote play would require separate solution.

---

## Success Criteria Checklist

**Functional**:
- [ ] Execute 0 A.D. matches from config
- [ ] Parse replay files (command sequences)
- [ ] Determine winner and victory condition
- [ ] Calculate statistics (resources, units, timing)
- [ ] Integrate with AI Commander framework

**Quality**:
- [ ] >80% test coverage
- [ ] No flaky tests
- [ ] Cross-platform (Windows, Mac, Linux)
- [ ] Handles errors gracefully

**Documentation**:
- [ ] JSDoc for all public APIs
- [ ] Usage examples
- [ ] Architecture docs
- [ ] Troubleshooting guide

---

## Next Steps

1. **Read the docs** (start with 0ad-DESIGN-SUMMARY.md)
2. **Review the roadmap** (0ad-IMPLEMENTATION-ROADMAP.md)
3. **Begin Epic 1** (Package setup and scaffolding)
4. **Set up CI/CD** (tests, linting, builds)
5. **Implementation** (follow story-by-story plan)

---

## Key Contacts

- **AI Commander Framework**: Core package maintainers
- **0 A.D. Community**: #0ad-dev on QuakeNet IRC
- **Research**: Check original design docs for investigation decisions

---

## Revision History

| Date | Status | Notes |
|------|--------|-------|
| 2026-07-07 | Design Complete | Initial architecture design and investigation complete. Ready for implementation. |

---

**Last Updated**: 2026-07-07  
**Design Phase**: ✅ Complete  
**Implementation Phase**: 🚀 Ready to Begin
