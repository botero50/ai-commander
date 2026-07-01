# Story 4.2 Completion Report: OpenRA Architecture Discovery

**Date:** 2026-07-01  
**Story:** 4.2 - OpenRA Architecture Discovery  
**Status:** ✅ COMPLETE  
**Type:** Research & Analysis (No Implementation)

---

## Executive Summary

A complete architectural discovery of OpenRA has been performed by studying the source code. The analysis documents OpenRA's 13 core systems, runtime lifecycle, world model, command pipeline, tick synchronization, and identifies 5 key integration points for AI Commander.

**Key Finding:** OpenRA is ideally suited for AI Commander integration with a deterministic, order-based architecture and clear system boundaries.

---

## Deliverable

**`/.foundation/research/OPENRA_ARCHITECTURE.md`** (Comprehensive)
- Architecture overview (13 core systems)
- Runtime lifecycle (startup flow, game loop)
- World model (Actor/Trait pattern, coordinates)
- Command pipeline (Order system, validation, execution)
- Tick lifecycle (synchronization, determinism, replay)
- AI integration points (5 key points identified)
- Determinism & reproducibility (how it works)
- Risks & constraints (technical limitations)
- Recommended adapter strategy (minimal integration design)
- Story breakdown (Stories 4.3-4.7 with effort estimates)

---

## Architecture Overview

### 13 Core Systems

| System | Purpose | Integration |
|--------|---------|-------------|
| **Game** | Main loop & lifecycle | Entry point |
| **World** | Simulation & ticks | State observation |
| **Traits** | Entity components | Gameplay logic |
| **Orders** | Command execution | Action injection |
| **Network** | Synchronization | Determinism |
| **Map** | Geometry & terrain | Navigation |
| **Graphics** | Rendering | (Not needed) |
| **Players** | Player state | Observation |
| **Shroud** | Fog of war | Visibility |
| **Activities** | Unit behaviors | Decision input |
| **Widgets** | UI system | (Not needed) |
| **Sound** | Audio | (Not needed) |
| **Server** | Headless host | Could extend |

### Key Architectural Properties

**Deterministic by Design:**
- Fixed 40ms ticks (25 ticks/second)
- Sync hash verification (detects desyncs)
- Replay system (record and replay deterministically)

**Order-Based Command System:**
- All changes via Orders (no direct state modification)
- Orders queue and execute at tick boundaries
- Network transmission for multiplayer sync
- Perfect for decision injection

**Actor/Trait Pattern:**
- Flexible component-based entity system
- Traits provide gameplay logic
- Extensible without modifying core

---

## Integration Points

### 1. World State Observation
**Where:** `World` class  
**What to Query:**
- Actor positions, types, ownership
- Player resources and technology
- Map terrain and visibility
- Tick number and game state

### 2. Command Execution
**Where:** `OrderManager.IssueOrders()`  
**How:**
- Create Order objects
- Specify target, position, action type
- OrderManager validates and executes

### 3. Agent Lifecycle
**Where:** Main game loop hooks  
**Methods Needed:**
- Initialize(World)
- Observe()
- Decide()
- ExecuteOrders()

### 4. Game Events
**Where:** Trait event methods  
**Events Available:**
- INotifyUnitBuilt (unit complete)
- INotifyKilled (unit destroyed)
- INotifyAttack (unit attacked)
- IGameOver (game ended)

### 5. Mission Boundaries
**Where:** LobbyInfo and World state  
**Data:**
- Players and teams
- Map name and rules
- Game start/end events

---

## Recommended Adapter Strategy

### 3-Component Design

```
┌─────────────────────────────┐
│     OpenRA Game Engine      │
└─────────┬─────────────────┬─┘
          │                 │
          ▼                 ▼
    ┌──────────────────────────┐
    │   AI Commander Adapter   │
    ├──────────────────────────┤
    │ • GameAdapter            │
    │ • ObservationProvider    │
    │ • CommandExecutor        │
    └──────────────────────────┘
          ▲                 │
          │                 ▼
    ┌──────────────────────────┐
    │   AI Commander Framework │
    │ (Planning, Replay, Etc)  │
    └──────────────────────────┘
```

### Component Responsibilities

**GameAdapter:**
- Load OpenRA game
- Execute ticks (40ms boundary)
- Manage lifecycle

**ObservationProvider:**
- Query World for current state
- Extract actor positions, types, ownership
- Build WorldState for framework

**CommandExecutor:**
- Validate AI decisions
- Create Order objects
- Issue to OrderManager
- Verify execution

---

## Implementation Roadmap

### Story 4.3: World State Observation (3-5 days)
- Implement ObservationProvider
- Query actor positions and types
- Query player states and resources
- Test observation accuracy against replay

### Story 4.4: Command Pipeline (5-7 days)
- Understand Order creation format
- Implement movement orders
- Implement attack orders
- Implement build/construction orders
- Test command execution and validation

### Story 4.5: Adapter Foundation (3-5 days)
- Create GameAdapter skeleton
- Load and initialize OpenRA game
- Implement tick execution (40ms)
- Handle game lifecycle (start/end)

### Story 4.6: Framework Integration (5-7 days)
- Connect to ReferencePlanner
- Connect to DecisionEngine
- Test autonomous mission execution
- Verify determinism via replay

### Story 4.7: Optimization & Polish (3-5 days)
- Performance profiling and tuning
- Comprehensive documentation
- Demo scenarios creation
- Production readiness review

**Total: 220-340 hours (~6 weeks)**

---

## Technical Constraints

### Single-Threaded Execution
- All simulation on main thread
- Decision-making must complete within 40ms
- No parallel planning possible

### Order-Based Changes Only
- Cannot directly modify actor properties
- Must issue Orders for all changes
- Orders validate against game rules

### Determinism Requirements
- Shared random seed with game logic
- No external state modifications
- Tick boundary synchronization

### Sync Hash Verification
- World state hashed after each tick
- Hash compared across network
- Desync triggers immediate disconnect
- Custom code must maintain invariants

---

## Risks & Mitigation

### Risk: Rendering System Tightly Coupled
- **Impact:** State observation confused with UI rendering
- **Mitigation:** Query World directly, not Renderer

### Risk: Network Desync from Custom Code
- **Impact:** AI modifications break multiplayer sync
- **Mitigation:** Only issue Orders, never modify world directly

### Risk: Shared Random Stream Consumed
- **Impact:** Planner decisions conflict with game logic
- **Mitigation:** Use separate random for planning, not SharedRandom

### Risk: Order Validation Rejects Decisions
- **Impact:** Commands fail with no feedback
- **Mitigation:** Validate decisions upfront, follow order format exactly

### Risk: 40ms Tick Budget Exceeded
- **Impact:** Frames dropped, game stutters
- **Mitigation:** Profile early, limit planning complexity

---

## Success Criteria Met

✅ **OpenRA architecture understood**
- 13 core systems documented
- Startup flow explained
- Game loop flow explained
- Tick lifecycle explained

✅ **Integration points documented**
- 5 key points identified
- Query methods shown
- Order format documented
- Lifecycle hooks identified

✅ **Adapter boundaries identified**
- 3-component design proposed
- Responsibilities clear
- Interaction patterns documented

✅ **Technical risks documented**
- Constraints identified
- Mitigation strategies provided
- Effort implications explained

✅ **Implementation plan produced**
- 5 stories defined (4.3-4.7)
- Effort estimated (220-340 hours)
- Dependencies ordered
- Success criteria per story

✅ **PROJECT_STATE.md updated**
- Story 4.2 marked complete
- Key findings summarized
- Effort estimate included

---

## Key Insights

**Why OpenRA Works:**
1. **Deterministic by Design** — Fixed ticks + sync hash
2. **Order-Based** — Perfect for decision injection
3. **Clean Separation** — Rendering, network, simulation independent
4. **Extensible** — Trait system allows customization
5. **Proven** — Multiplayer competitive scene validates architecture

**Why It's Hard:**
1. **Single-Threaded** — Decision-making must fit in 40ms
2. **Order Validation** — Must follow exact format
3. **Desync Sensitive** — One mistake breaks multiplayer
4. **No Direct Mutation** — Can't modify actors directly

**Bottom Line:**
OpenRA is ideal for first production integration. Architecture is proven, integration points are clear, and no framework modifications needed.

---

## Next Step

Begin Story 4.3: World State Observation (estimated 3-5 days)
- Implement ObservationProvider
- Query actor positions and types
- Validate observation accuracy

---

**Completed by:** Claude Haiku 4.5  
**Date:** 2026-07-01  
**Story:** 4.2 - OpenRA Architecture Discovery  
**Status:** ✅ COMPLETE (Research & Analysis)

**Next Story:** 4.3 - World State Observation (Implementation begins)
