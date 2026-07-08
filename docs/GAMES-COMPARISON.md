# AI Commander: Game Candidates Comparison & Analysis

**Status**: Research in Progress  
**Date**: 2026-07-07  
**Purpose**: Evaluate alternative RTS/strategy games for integration into AI Commander framework

---

## Executive Summary

This document compares 11 candidate games for integration into AI Commander, evaluating them on integration complexity, framework fit, AI capabilities, and overall suitability as reference implementations.

---

## Candidate Games Overview

| Game | Type | Language | Open Source | License | Maturity |
|------|------|----------|-------------|---------|----------|
| **0 A.D.** | Real-time RTS | C++/JavaScript | ✅ Full | GPL 2 | Mature |
| **OpenSpiel** | Board/Turn-based | C++/Python | ✅ Full | Apache 2.0 | Mature |
| **MicroRTS** | Simplified RTS | Java | ✅ Full | GPL 2 | Mature |
| **OpenRA** | RTS (C&C clone) | C# | ✅ Full | GPL 3 | Mature |
| **Battle for Wesnoth** | Turn-based fantasy | C++ | ✅ Full | GPL 2+ | Mature |
| **StarCraft II** | Professional RTS | Proprietary | ❌ No | Proprietary | Mature |
| **Mindustry** | Tower Defense/RTS | Java | ✅ Full | GPL 3 | Mature |
| **Veloren** | Voxel RPG/MMO | Rust | ✅ Full | GPL 3 | Early |
| **Spring RTS** | Powerful 3D RTS | C++ | ✅ Full | GPL 2.1+ | Mature |
| **Godot-RTS** | RTS Template | GDScript | ✅ Full | Custom | Template |
| **Civilization VI** | Turn-based 4X | Proprietary | ❌ No | Proprietary | Mature |
| **Colobot** | Educational RTS/Programming | C++ | ✅ Full | GPL 3 | Mature |

---

## Detailed Game Profiles

### 1. OpenSpiel (DeepMind)

**Type**: Turn-based strategy and board games research platform  
**Repository**: https://github.com/google-deepmind/open_spiel  
**License**: Apache 2.0

**Architecture**:
- C++ core with Python bindings
- Supports 80+ games (chess, Go, Poker, etc.)
- NOT primarily an RTS engine
- Research-focused, not gameplay-focused

**AI/Bot Integration**:
- Designed for RL agent training
- Built-in algorithms (minimax, MCTS, etc.)
- Python RL environment API

**Strengths**:
- ✅ Excellent for benchmarking AI algorithms
- ✅ Academic rigor and documentation
- ✅ Proven RL training framework
- ✅ Deterministic simulations

**Weaknesses**:
- ❌ NOT an RTS engine (turn-based only)
- ❌ Limited gameplay depth
- ❌ Simplified game mechanics
- ❌ Not suitable for real-time strategy

**Integration Complexity**: 🔴 Very High (not an RTS)

**Verdict**: ❌ **Not suitable for RTS benchmarking**. Better for turn-based games.

---

### 2. MicroRTS (Farama Foundation)

**Type**: Simplified RTS game and RL environment  
**Repository**: https://github.com/Farama-Foundation/MicroRTS  
**License**: GPL 2

**Architecture**:
- Java original, Python wrapper (MicroRTS-Py)
- Minimalist RTS gameplay
- RL environment (Gym-compatible)
- Fixed map sizes (16x16 typical)

**AI/Bot Integration**:
- Native Java bot interface
- Python RL agent interface (Gym)
- Many community bots
- Annual competition (IEEE, CoG)

**Game Mechanics**:
- Unit types: Worker, Light, Heavy, Ranged
- Resources: single unified resource
- Deterministic tick-based simulation
- Tournament scoring available

**Strengths**:
- ✅ Specifically designed for RTS research
- ✅ Simple and fast to simulate
- ✅ Established bot community
- ✅ Perfect for RL training
- ✅ Deterministic and reproducible

**Weaknesses**:
- ❌ Very simplified gameplay
- ❌ Minimal economic system
- ❌ Limited map sizes
- ❌ Not as engaging as full RTS

**Integration Complexity**: 🟢 Low (designed for research)

**Verdict**: ✅ **Excellent choice for research/benchmarking**, but limited gameplay depth. Good as secondary platform.

---

### 3. OpenRA (C#)

**Type**: Real-time strategy game engine (Command & Conquer clone)  
**Repository**: https://github.com/OpenRA/OpenRA  
**License**: GPL 3

**Architecture**:
- C# cross-platform engine
- Runs on Windows, Linux, macOS
- Modular game data system
- SDL/OpenGL rendering

**AI/Bot Integration**:
- Lua scripting for AI
- Built-in replay system
- Mod system for custom AI
- No native remote API

**Game Mechanics**:
- Classic RTS gameplay
- Multiple game modes
- Terrain and building management
- Unit production and tech trees

**Strengths**:
- ✅ Mature RTS game engine
- ✅ Excellent modding system (Lua)
- ✅ Cross-platform
- ✅ Native replay support
- ✅ Active community
- ✅ C# matches framework language (TypeScript → JavaScript)

**Weaknesses**:
- ❌ Command & Conquer focused (limited depth)
- ❌ No remote control API
- ❌ File-based IPC required
- ❌ Less complex than modern RTS

**Integration Complexity**: 🟡 Medium (similar to 0 A.D., but C#)

**Verdict**: ✅ **Good alternative to 0 A.D.**, slightly less complex gameplay. Good secondary option.

---

### 4. Battle for Wesnoth

**Type**: Turn-based tactical fantasy strategy  
**Repository**: https://github.com/wesnoth/wesnoth  
**License**: GPL 2+

**Architecture**:
- C++ engine
- Turn-based gameplay (not real-time)
- Multiplayer support (hotseat, network)
- Campaign-based scenarios

**AI/Bot Integration**:
- Lua scripting for unit AI
- Configurable difficulty levels
- No native remote API
- Community AI mods available

**Game Mechanics**:
- Turn-based grid warfare
- Faction system with unique units
- Technology and experience progression
- Campaign narratives

**Strengths**:
- ✅ Mature and well-documented
- ✅ Strong community
- ✅ Lua scripting support
- ✅ Excellent for turn-based research
- ✅ Cross-platform

**Weaknesses**:
- ❌ Turn-based, NOT real-time
- ❌ Limited economic system
- ❌ Less suitable for RTS benchmarking
- ❌ Smaller scope than full RTS

**Integration Complexity**: 🟡 Medium (turn-based, not RTS)

**Verdict**: ✅ **Good for turn-based strategy research**, not ideal for RTS. Alternative for different game type.

---

### 5. StarCraft II (Blizzard)

**Type**: Professional real-time strategy game  
**Repository**: Proprietary (game only)  
**API**: https://github.com/google-deepmind/pysc2  
**License**: Proprietary

**Architecture**:
- C++ game engine
- Python API (PySC2) by DeepMind
- C++ client library available
- Requires game license (free via Blizzard)

**AI/Bot Integration**:
- PySC2 RL environment
- C++ bot API
- Hundreds of thousands of replays available
- AlphaStar demonstrates capabilities

**Game Mechanics**:
- Complex real-time strategy
- 3 distinct civilizations (races)
- Economic and military systems
- Competitive professional esports

**Strengths**:
- ✅ Industry-leading RTS game
- ✅ Excellent API documentation
- ✅ Large replay dataset available
- ✅ Professional ecosystem
- ✅ DeepMind proven (AlphaStar)

**Weaknesses**:
- ❌ Proprietary (requires game license)
- ❌ Expensive to modify
- ❌ Blizzard controls updates
- ❌ No engine source code
- ❌ Cannot build our own game variant
- ❌ Licensing restrictions for commercial use

**Integration Complexity**: 🟡 Medium (good API, but proprietary)

**Verdict**: ✅ **Excellent for research**, but ❌ **poor for long-term strategy** (proprietary control, licensing risk).

---

### 6. Mindustry

**Type**: Tower defense / Real-time factory + strategy hybrid  
**Repository**: https://github.com/Anuken/Mindustry  
**License**: GPL 3

**Architecture**:
- Java game engine
- Real-time automation gameplay
- Wave-based enemy system
- Multiplayer support

**AI/Bot Integration**:
- Modding via Java
- Custom unit AI possible
- No built-in remote API
- Community mods available

**Game Mechanics**:
- Tower defense (waves of enemies)
- Factory automation (production chains)
- Unit control (direct or scriptable)
- Resource management

**Strengths**:
- ✅ Unique gameplay (RTS + tower defense)
- ✅ Active community
- ✅ Java-based (good for bots)
- ✅ Cross-platform

**Weaknesses**:
- ❌ Hybrid game type (not pure RTS)
- ❌ Limited multiplayer RTS scenarios
- ❌ More tower defense than RTS
- ❌ Not traditional RTS strategy

**Integration Complexity**: 🟡 Medium (hybrid gameplay)

**Verdict**: ✅ **Interesting for hybrid strategy research**, but not ideal for pure RTS benchmarking.

---

### 7. Veloren

**Type**: Multiplayer voxel RPG (similar to Minecraft/Dwarf Fortress)  
**Repository**: https://gitlab.com/veloren/veloren (GitHub mirror)  
**License**: GPL 3

**Architecture**:
- Rust-based
- Voxel world generation
- Multiplayer servers
- Early development stage

**AI/Bot Integration**:
- NPC AI systems (Rust)
- Plugin system (Rust)
- No RTS-style gameplay
- Not designed for AI research

**Game Mechanics**:
- Exploration and adventure
- Combat mechanics
- Crafting and building
- Multiplayer world

**Strengths**:
- ✅ Interesting technology (Rust)
- ✅ Open-source and active development
- ✅ Good for networked games research

**Weaknesses**:
- ❌ NOT an RTS game at all
- ❌ RPG-focused, not strategy
- ❌ No economic/resource system
- ❌ Early development
- ❌ Completely unsuitable for RTS research

**Integration Complexity**: 🔴 Very High (not an RTS)

**Verdict**: ❌ **Not suitable for RTS benchmarking**. Different game genre entirely.

---

### 8. Spring RTS Engine

**Type**: Powerful 3D RTS engine  
**Repository**: https://github.com/spring/spring  
**License**: GPL 2.1+

**Architecture**:
- C++ engine designed for RTS
- Lua scripting for gameplay
- Support for massive battles (5000+ units)
- Deformable 3D terrain

**AI/Bot Integration**:
- Lua scripting for unit AI
- C++ bot API available
- Established bot community
- Multiple games built on engine

**Games Built on Spring**:
- Beyond All Reason (active, sci-fi)
- Spring: 1944 (WWII)
- Zero-K (freely available)

**Strengths**:
- ✅ Powerful and flexible RTS engine
- ✅ Mature and well-documented
- ✅ Large-scale battle capability
- ✅ Lua scripting flexibility
- ✅ Multiple proven game implementations
- ✅ Active community (especially Zero-K)

**Weaknesses**:
- ❌ Steep learning curve
- ❌ Documentation can be fragmented
- ❌ Less beginner-friendly than 0 A.D.
- ❌ Smaller community than 0 A.D.
- ❌ Less established AI community

**Integration Complexity**: 🟡 Medium-High (powerful but complex)

**Verdict**: ✅ **Very good RTS engine choice**, potentially better than 0 A.D. for large-scale battles. Advanced option.

---

### 9. Godot-RTS (Template)

**Type**: RTS game template/example in Godot 4  
**Repository**: https://github.com/lampe-games/godot-open-rts  
**License**: Custom (permissive)

**Architecture**:
- GDScript (Godot's scripting language)
- Godot 4 game engine
- Educational template
- Not a standalone game

**AI/Bot Integration**:
- GDScript for unit AI
- Godot's modding/extension system
- Limited established bot ecosystem
- Good for custom development

**Strengths**:
- ✅ Clean, educational code
- ✅ Modern Godot 4 engine
- ✅ Easy to understand and modify
- ✅ Good for learning RTS development

**Weaknesses**:
- ❌ Template only (not a full game)
- ❌ Limited gameplay depth
- ❌ No established community
- ❌ Smaller map/scale assumptions
- ❌ Not proven in competition/research

**Integration Complexity**: 🟢 Low (but needs more development)

**Verdict**: ❌ **Not recommended as-is** (template, not full game). Could be foundation for custom development.

---

### 10. Civilization VI

**Type**: Turn-based 4X strategy game  
**Repository**: Proprietary  
**License**: Proprietary

**Architecture**:
- C++ engine
- Lua modding support
- Turn-based gameplay
- Multiplayer support

**AI/Bot Integration**:
- Lua scripting for AI personalities
- No remote API
- Modding restrictions
- Community AI mods available

**Game Mechanics**:
- 4X gameplay (Explore, Expand, Exploit, Exterminate)
- Technology trees
- Diplomacy systems
- Cultural and scientific progression

**Strengths**:
- ✅ Deep and complex strategy
- ✅ Established modding community
- ✅ Turn-based (deterministic)
- ✅ Professional quality

**Weaknesses**:
- ❌ Proprietary (licensing issues)
- ❌ Cannot modify engine
- ❌ Turn-based (not RTS)
- ❌ Expensive modding limitations
- ❌ Blizzard-controlled updates

**Integration Complexity**: 🔴 Very High (proprietary, closed)

**Verdict**: ❌ **Not recommended** (proprietary licensing, turn-based not RTS).

---

### 11. Colobot (Educational Programming RTS)

**Type**: Educational RTS with programming component  
**Repository**: https://github.com/colobot/colobot  
**License**: GPL 3

**Architecture**:
- C++ engine
- CBOT language (C++-like scripting)
- 3D graphics
- Single-player focused

**AI/Bot Integration**:
- CBOT programming language for unit AI
- Learning-focused
- No competitive bot ecosystem
- Educational design

**Game Mechanics**:
- Objective-based missions
- Bot programming challenges
- Resource gathering
- Exploration and combat

**Strengths**:
- ✅ Unique educational angle
- ✅ Open-source and well-maintained
- ✅ Interesting gameplay mechanics
- ✅ Good for teaching algorithms

**Weaknesses**:
- ❌ Single-player focused (not multiplayer)
- ❌ Limited competitive ecosystem
- ❌ Niche gameplay (programming-focused)
- ❌ Smaller community than other options
- ❌ Not designed for AI research

**Integration Complexity**: 🟡 Medium (educational focus)

**Verdict**: ✅ **Interesting educational option**, but not ideal for competitive AI benchmarking.

---

## Comparative Scoring Matrix

| Game | RTS Gameplay | AI Capability | Integration Ease | Framework Fit | Community | Overall |
|------|:----:|:----:|:----:|:----:|:----:|:----:|
| **0 A.D.** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **4.4/5** |
| **OpenSpiel** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 3.2/5 |
| **MicroRTS** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 3.4/5 |
| **OpenRA** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.4/5 |
| **Wesnoth** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 3.4/5 |
| **StarCraft II** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 3.8/5 |
| **Mindustry** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 3.0/5 |
| **Veloren** | ⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | 1.4/5 |
| **Spring RTS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 3.8/5 |
| **Godot-RTS** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | 3.2/5 |
| **Civ VI** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐ | 2.6/5 |
| **Colobot** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 2.4/5 |

---

## Integration Complexity Ranking

### 🟢 Low Complexity (Easy to integrate)
1. **MicroRTS** - Purpose-built for AI research
2. **Godot-RTS** - Clean template with extensible design

### 🟡 Medium Complexity (Moderate effort)
1. **0 A.D.** - Mature codebase, good documentation
2. **OpenRA** - Similar architecture to 0 A.D.
3. **Battle for Wesnoth** - Turn-based simplifies some aspects
4. **Spring RTS** - Powerful but steeper learning curve
5. **Mindustry** - Hybrid gameplay adds complexity

### 🔴 High Complexity (Difficult)
1. **StarCraft II** - Proprietary API limitations
2. **Civilization VI** - Proprietary with modding limitations
3. **Colobot** - Educational focus, less standard API
4. **OpenSpiel** - Not an RTS engine at all
5. **Veloren** - RPG, not RTS

---

## Recommendations by Use Case

### Use Case 1: Best Overall RTS Reference

**Winner**: **0 A.D.** (Current choice, well-justified)

**Why**:
- ✅ Mature RTS with good depth
- ✅ Strong open-source community
- ✅ Excellent for AI strategy research
- ✅ Good balance of complexity and accessibility
- ✅ Established AI implementations (Petra, Arch)

**Alternative**: **Spring RTS** (More powerful, steeper learning curve)

---

### Use Case 2: Quickest Integration (MVP)

**Winner**: **MicroRTS**

**Why**:
- ✅ Specifically designed for AI research
- ✅ Simple and fast
- ✅ Low integration effort
- ✅ Proven competition framework

**Trade-off**: Much simpler gameplay than full RTS

---

### Use Case 3: Most Complex Strategy Gameplay

**Winner**: **Spring RTS**

**Why**:
- ✅ Supports 5000+ unit battles
- ✅ Complex terrain and tactics
- ✅ Powerful scripting (Lua)
- ✅ Mature ecosystem

**Trade-off**: Steeper learning curve, less documentation

---

### Use Case 4: Turn-Based Alternative

**Winner**: **Battle for Wesnoth**

**Why**:
- ✅ Mature turn-based strategy
- ✅ Good for different game type
- ✅ Strong community
- ✅ Excellent documentation

**Caveat**: Different game class (turn-based, not RTS)

---

### Use Case 5: Build-Your-Own Foundation

**Winner**: **Godot-RTS** (template) + **Spring RTS** (engine)

**Why**:
- Godot-RTS: Clean starting point for custom game
- Spring RTS: Powerful engine for advanced features

**Trade-off**: More development effort required

---

## Secondary Candidates to Support

| Game | Reason | Priority |
|------|--------|----------|
| **MicroRTS** | Quick benchmark platform, research-focused | High |
| **OpenRA** | C# alternative to 0 A.D., similar gameplay | Medium |
| **Battle for Wesnoth** | Turn-based strategy alternative | Medium |
| **Spring RTS** | Advanced RTS with large-scale battles | Medium |

---

## Games NOT Recommended

| Game | Reason |
|------|--------|
| **StarCraft II** | Proprietary licensing, Blizzard control |
| **Civilization VI** | Proprietary, turn-based not RTS |
| **Veloren** | RPG not RTS, wrong game type |
| **OpenSpiel** | Board games not RTS |
| **Colobot** | Educational niche, limited ecosystem |

---

## Implementation Strategy Recommendation

### Phase 1: Primary Platform (Weeks 1-10)
**Game**: **0 A.D.** (already designed, begin implementation)
- Implement adapter (22 stories from design)
- Establish as reference RTS
- Build tournament framework around it

### Phase 2: Secondary Platform (Weeks 11-14)
**Game**: **MicroRTS**
- Add MicroRTS adapter for comparison
- Useful for quick research iterations
- Different complexity profile

### Phase 3: Advanced Option (Weeks 15+)
**Game**: **Spring RTS** (optional)
- More powerful RTS engine
- For advanced large-scale battle scenarios
- Optional based on team capacity

### Phase 4: Turn-Based Alternative (Weeks 15+)
**Game**: **Battle for Wesnoth** (optional)
- Different game class
- Enables different AI research areas
- Optional based on scope

---

## Technology Stack Alignment

**AI Commander Framework**:
- Language: TypeScript/Node.js
- Architecture: Modular, adapter-based

**Best Fit Games**:
1. **0 A.D.** - JavaScript AI (natural fit)
2. **MicroRTS** - Java API (good fit)
3. **OpenRA** - C# (different stack, manageable)
4. **Spring RTS** - Lua scripting (indirect fit)

---

## Final Verdict

### PRIMARY RECOMMENDATION: **0 A.D.** ✅

**Rationale**:
- ✅ RTS gameplay depth matches ambitious framework goals
- ✅ Mature and stable
- ✅ Strong open-source community
- ✅ JavaScript integration (natural fit)
- ✅ Existing AI research community (Petra, Arch, Hannibal)
- ✅ Good balance of complexity and implementation effort
- ✅ Deterministic for reproducible benchmarking

**Design already completed** - proceed with implementation.

### SECONDARY RECOMMENDATION: **MicroRTS** ⭐

**Rationale**:
- Simple and fast (good for quick iterations)
- Specifically designed for AI/RL research
- Proven competition framework
- Can be added after 0 A.D. MVP

### TERTIARY RECOMMENDATION: **Spring RTS** ⭐

**Rationale**:
- Most powerful RTS engine available
- Supports massive battles
- Mature ecosystem with active community
- For future advanced scenarios

---

## Conclusion

**0 A.D.** remains the best choice for AI Commander's reference RTS implementation. The architecture has been thoroughly designed and is ready for implementation. The framework-agnostic adapter design means secondary platforms (MicroRTS, Spring RTS) can be added without framework modifications.

The multi-platform strategy provides:
- **Depth** (0 A.D.) for engaging RTS scenarios
- **Speed** (MicroRTS) for rapid experimentation
- **Power** (Spring RTS) for advanced features
- **Variety** (Wesnoth) for different game types

---

**Recommendation**: Begin 0 A.D. adapter implementation immediately. Plan MicroRTS as Phase 2 (post-MVP). Reserve Spring RTS and Wesnoth for Phase 3+ (optional expansion).

---

*Document will be updated as agent research completes.*
