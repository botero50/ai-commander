# OpenRA Architecture Discovery

**Date:** 2026-07-01  
**Purpose:** Complete architectural documentation of OpenRA for AI Commander integration  
**Status:** Architecture analysis only (no implementation)

---

## Executive Summary

OpenRA is a clean, well-architected real-time strategy game with strong separation of concerns between rendering, networking, simulation, and gameplay logic.

**Key Architectural Insights:**

1. **Deterministic By Design** — Network protocol forces determinism at every level
2. **Actor/Trait Pattern** — Flexible component-based entity system for units/buildings
3. **Order-Based Command System** — All player actions flow through Orders for networking
4. **Tick-Based Simulation** — Fixed timestep (40ms) ensures reproducibility
5. **Clear Integration Points** — OrderManager and World are natural boundaries

**Recommended Integration Strategy:**

- Intercept Orders (player input → game actions)
- Query World state (observation)
- Inject Orders (AI decisions → game actions)
- Monitor tick lifecycle (synchronization)

---

## Architecture Overview

### Project Structure

OpenRA is organized as a multi-project C# solution:

```
OpenRA.sln
├── OpenRA.Game/           # Core engine (13 core systems)
│   ├── Game.cs           # Main game loop & lifecycle
│   ├── World.cs          # Game world & simulation
│   ├── Traits/           # Component system
│   ├── Orders/           # Command system
│   ├── Network/          # Networking & sync
│   ├── Map/              # Map representation
│   ├── Graphics/         # Rendering system
│   └── Primitives/       # Coordinate systems
│
├── OpenRA.Mods.Common/    # Shared gameplay logic
│   ├── Traits/           # Units, buildings, abilities
│   ├── Orders/           # Game-specific orders
│   └── Activities/       # Unit behaviors
│
├── OpenRA.Mods.Cnc/       # C&C game mode
├── OpenRA.Mods.D2k/       # Dune2k game mode
├── OpenRA.Server/         # Headless server
├── OpenRA.Launcher/       # Game launcher
└── OpenRA.Utility/        # Development tools
```

### 13 Core Systems

| System         | Responsibility           | Integration Point |
| -------------- | ------------------------ | ----------------- |
| **Game**       | Main loop, lifecycle     | Program entry     |
| **World**      | Simulation, tick updates | State observation |
| **Traits**     | Entity components        | Gameplay          |
| **Orders**     | Command execution        | Action injection  |
| **Network**    | Synchronization, replays | Determinism       |
| **Map**        | World geometry           | Navigation        |
| **Graphics**   | Rendering                | (Not needed)      |
| **Players**    | Player state, teams      | Observation       |
| **Shroud**     | Fog of war               | Observation       |
| **Activities** | Unit behaviors           | Decision input    |
| **Widgets**    | UI system                | (Not needed)      |
| **Sound**      | Audio                    | (Not needed)      |
| **Server**     | Headless hosting         | Could extend      |

---

## Runtime Lifecycle

### Startup Flow

```
Program.Main()
    └─ Game.Run()
        ├─ Initialize Game Engine
        │   ├─ ModData.Load()        # Load game rules, traits
        │   ├─ Map.Load()            # Load map geometry
        │   └─ Game.Initialize()     # Initialize graphics, audio
        │
        ├─ Load or Create Server
        │   ├─ Server.Create()       # Start dedicated server (optional)
        │   └─ OrderManager.Create() # Network management
        │
        ├─ Create World
        │   ├─ World()              # Initialize simulation
        │   ├─ SpawnActors()        # Create units/buildings
        │   └─ SetPlayers()         # Assign players
        │
        └─ Enter Main Game Loop
            ├─ OrderManager.Tick()   # Process network orders
            ├─ World.Tick()          # Simulate world
            └─ Renderer.Render()     # Draw frame
```

### Game Loop (Per Frame)

```
Frame N:
├─ OrderManager.Tick()
│   ├─ ReceiveOrders()       # Network input
│   ├─ ProcessOrders()       # Order validation
│   └─ QueueOrders()         # Add to tick queue
│
├─ World.Tick()              # [MAIN SIMULATION]
│   ├─ ExecuteOrders()       # Apply queued orders
│   │   ├─ OrderManager.IssueOrders()
│   │   └─ Order.Execute()   # Trait methods called
│   │
│   ├─ UpdateActors()        # Activity ticks
│   │   ├─ Actor.Tick()
│   │   └─ Trait.Tick()      # All traits update
│   │
│   ├─ UpdateEffects()       # Particle effects
│   └─ SyncState()           # Prepare for network
│
├─ Game.Renderer.Render()
│   ├─ UpdateViewport()      # Camera position
│   ├─ DrawLayers()          # Render actors
│   └─ SwapBuffers()         # Display
│
└─ Sleep(frametime - elapsed)
```

**Key Synchronization Points:**

- `OrderManager.QueueFrame` — Orders executed this tick
- `WorldTick` — Number of ticks completed
- `SyncHash` — Cryptographic state hash (ensures determinism)

---

## World Model

### Actor/Trait Architecture

OpenRA uses composition over inheritance:

```
Actor
├─ ActorInfo           # Static definition (loaded from YAML)
│   └─ Traits[]        # List of trait definitions
│
├─ TraitDictionary     # Runtime trait instances
│   ├─ trait instances
│   └─ Fast indexed lookup by type
│
└─ Position, Health, Owner, etc.
    (stored as traits, not properties)
```

### Core Traits (Types of Gameplay)

```
Unit Traits:
├─ IMove           # Movement logic (walk, fly, teleport)
├─ IActivity       # Current activity (move, attack, construct)
├─ IHealth         # Health & damage
├─ ISelectable     # Selection UI
└─ IAttack         # Attack capability

Building Traits:
├─ IBuilding       # Structure placement
├─ IHealth         # Destructibility
├─ IRepair         # Repair capability
└─ IPower          # Power grid connectivity

Actor Lifecycle:
├─ INotifyCreated  # Called when actor spawned
├─ ITick           # Called each tick
├─ INotifyKilled   # Called when destroyed
└─ IDispose        # Cleanup
```

### State Representation

**World State Contains:**

- Actor list (units, buildings, effects)
- Player states (resources, tech, shroud)
- Map state (shroud, ore fields)
- Orders queued for execution
- Network synchronization data

**Immutable Elements:**

- Map geometry (cannot change)
- Trait definitions (cannot change)
- Player count and teams (set at game start)

**Mutable Elements:**

- Actor positions and orientations
- Actor health and status
- Resource counts
- Completed technology research
- Explored/visible shroud cells

### Player Model

```
Player
├─ PlayerReference    # Connection/network identity
├─ Client / IsBot     # Human or AI
├─ Team               # Allied teams
├─ Color              # Team color
├─ Faction            # Unit set (e.g., GDI, Nod)
├─ Shroud             # Fog of war state
├─ Resources          # Cash, power, etc.
└─ Traits[]           # Player abilities (tech, traits)
    ├─ INotifyResourceCollection  # Income
    ├─ INotifyTechTreeChanged     # Researched
    └─ INotifyUnitBuilt           # Unit complete
```

### Map Representation

```
Map
├─ Title, Author, Description
├─ CustomRules        # Map-specific settings
├─ Bounds             # Playable area (WPos: world position)
│   └─ Width x Height (in cells)
│
├─ TileSet            # Terrain textures
│   └─ Tiles[x, y]    # Terrain at each cell
│
├─ ProjectileHeight[] # Air height restrictions
└─ Resources
    ├─ Ore / Gems  # Gatherable resources
    └─ Fog        # Shroud/unexplored areas
```

**Coordinate Systems:**

- `CPos` — Cell position (integer grid)
- `MPos` — Map position (for rendering)
- `WPos` — World position (1/1024 cell precision)
- `PPos` — Projection position (for visibility)

---

## Command Pipeline: Orders

### What Is an Order?

An Order is a command from a player to perform an action. All player input flows through Orders for:

- Network transmission (multiplayer sync)
- Replay recording (determinism)
- Validation (cheating prevention)
- Execution (trait methods invoked)

### Order Lifecycle

```
User Input (keyboard/mouse)
    ↓
OrderInputHandler (converts input to Order)
    ↓
Order Object Created
├─ OrderName     # "Move", "Attack", "Build", etc.
├─ PlayerIndex   # Which player issued it
├─ TargetActor   # Actor being affected (if any)
├─ TargetPos     # Position (if relevant)
└─ ExtraData     # Type-specific parameters
    ↓
OrderManager.QueueOrder()
├─ ValidateOrder()      # Check if legal
├─ SendOnNetwork()      # Send to other players
└─ AddToTickQueue()     # Execute this tick
    ↓
World.Tick() → ExecuteOrders()
├─ For each Order:
│   └─ Order.Execute(World)  # Call trait methods
│       ├─ Invoke IResolveOrder handlers
│       ├─ Modify actor state
│       └─ Queue activities
    ↓
Actor State Updated
├─ Position changed
├─ Health modified
├─ New activity queued
└─ Events fired
```

### Order Types

**Movement:**

- Move: Walk to position
- EnterUnit: Board transport
- ExitUnit: Exit transport

**Combat:**

- Attack: Attack unit/building
- AttackGround: Attack position
- AutoTarget: Toggle auto-attack

**Construction:**

- Build: Construct building
- Cancel: Abort construction
- Sell: Demolish building

**Economy:**

- Repair: Repair unit
- Guard: Guard position

### Validation Flow

```
OrderManager.ValidateOrder(Order)
    ├─ Check if player owns actor
    ├─ Check if actor alive
    ├─ Check if order legal for actor type
    ├─ Check if player has resources
    ├─ Check if target valid
    └─ Reject if any check fails
        → Order not executed
```

---

## Tick Lifecycle: Synchronization

### Why Ticks?

OpenRA uses a fixed tick rate (40ms = 25 ticks/second):

- Ensures determinism (same input = same output)
- Enables replays (record tick number + order)
- Enables networking (sync state at tick boundaries)
- Enables benchmarking (compare ticks exactly)

### Tick Flow

```
Tick N-1 Complete
    ↓
OrderManager.Tick()
├─ Receive network orders from other players
├─ Process orders (validation, etc.)
└─ Queue for execution

World.Tick()
├─ Execute all orders queued for Tick N
├─ Update all actor positions
├─ Update all actor health
├─ Fire tick events
├─ Calculate visibility (shroud)
└─ Calculate sync hash (verify determinism)

Game.Tick()
├─ Update UI
├─ Check win/lose conditions
└─ Queue next frame

Renderer.Render()
├─ Draw world
├─ Draw UI
└─ Display frame

[Sleep until next tick time]

Tick N Complete → Tick N+1 Begins
```

### Determinism Verification

```
After each tick:
├─ Calculate SyncHash
│   └─ Hash of world state (positions, health, etc.)
│
├─ Send to other players
└─ Compare received SyncHash
    ├─ Match → Deterministic, continue
    └─ Mismatch → Desync detected, disconnect
```

---

## AI Integration Points

### Existing AI Implementation

OpenRA includes:

- `BotAI` class for autonomous unit control
- Activity system (queuing unit behaviors)
- Trait methods for behavior hooks
- No central "decision engine" (traits are decentralized)

### Current Bot Architecture

```
BotAI (Player)
├─ BotBehavior traits
│   ├─ SquadManager     # Squad composition
│   ├─ BuildingPlacement # Building strategy
│   └─ EconomyAI        # Resource management
│
└─ Issues Orders
    └─ Orders executed by traits
```

### Activity System: Where Decisions Execute

```
Actor.CurrentActivity
├─ Move to position
├─ Attack target
├─ Construct building
└─ Wait / Idle

Activities Queue
├─ Move to location
├─ Attack enemy
├─ Return to base
└─ Loop

Each Tick:
├─ Activity.Tick(world)
├─ Possibly issue Order
└─ Queue next activity
```

---

## Integration Points for AI Commander

### 1. World State Observation

**Where to Read:**

```
World
├─ Players[]          # All players, resources, tech
├─ Actors[]           # All units and buildings
├─ Map                # Terrain and shroud
└─ OrderManager.NetFrameNumber  # Current tick
```

**What to Query:**

- Actor positions: `actor.CenterPosition` (WPos)
- Actor type: `actor.Info.Name`
- Actor owner: `actor.Owner`
- Actor health: `actor.TraitOrDefault<IHealth>()`
- Unit type: `actor.Info.Traits.WithInterface<IMove>()`
- Building type: `actor.Info.Traits.WithInterface<IBuilding>()`

**Integration Point:** Observer should hold reference to `World`, query freely

### 2. Command Execution (Order Injection)

**Where to Issue Orders:**

```
OrderManager.IssueOrders(List<Order>)
```

**How to Create Orders:**

```
// Example: Move unit to position
new Order("Move", actor)
{
    TargetLocation = targetPosition,
    SuppressVisualFeedback = true
}

// Example: Attack enemy unit
new Order("Attack", actor)
{
    Target = enemyActor
}

// Example: Build structure
new Order("Build", player)
{
    ExtraData = buildingType,
    TargetLocation = buildPosition
}
```

**Integration Point:** Planner issues Orders to OrderManager during its turn

### 3. Agent Lifecycle

**Where to Hook:**

```
Game.Run()
    ├─ Create World
    ├─ Create AI Agent           ← Hook here
    └─ Main loop
        ├─ OrderManager.Tick()
        ├─ World.Tick()
        ├─ Agent.Decide()        ← Hook here (planning phase)
        └─ Agent.ExecuteOrders() ← Hook here (issue orders)
```

**Lifecycle Methods Needed:**

- `Agent.Initialize(World)` — Called when world created
- `Agent.Observe()` — Read world state
- `Agent.Decide()` — Planning phase
- `Agent.ExecuteOrders()` — Issue orders to OrderManager

### 4. Game Events

OpenRA broadcasts events via trait methods:

```
INotifyUnitBuilt        # Unit completed
INotifyKilled           # Unit destroyed
INotifyAttack           # Unit attacked
INotifyObjectiveStatus  # Objective changed
INotifyResourceCollection # Collected resource
IGameOver               # Game ended
```

**Integration Point:** Can subscribe to these to update execution trace

### 5. Mission Boundaries

**Game Start:**

```
OrderManager.LobbyInfo
├─ Players[]
├─ Map name
└─ Game rules
```

**Game End:**

```
World.IsGameOver       # True if game ended
World.GameOver event   # Fired when game ends
```

---

## Determinism & Reproducibility

### How OpenRA Ensures Determinism

1. **Fixed Timestep**
   - Always 40ms (25 ticks/second)
   - No variable delta time

2. **Synchronized Random Number Generator**
   - `World.SharedRandom` — Same seed for all players
   - Used for unit abilities, effects, AI decisions
   - Ensures randomness doesn't break determinism

3. **Order-Based Execution**
   - All changes via Orders
   - Orders queued at tick number
   - Replay recording captures (tick, order) pairs

4. **Sync Hash Verification**
   - After each tick, world state hashed
   - Hash compared across network
   - Desync = instant disconnect

### Replay System

```
Record:
├─ Record(filename)
├─ On each Order:
│   └─ Write (tick, order) to file
└─ On game end:
    └─ Write final tick number

Replay:
├─ Load(replayfile)
├─ For each (tick, order):
│   └─ Execute order at tick
└─ World state matches original exactly
    (if game logic unchanged)
```

**Important:** Determinism requires:

- Same code (code must not change between sessions)
- Same random seed
- Same order execution sequence

---

## Risks & Constraints

### Technical Risks

**Risk: Rendering System Tightly Coupled**

- Graphics used for state observation in UI
- Solution: Query World directly, not Renderer

**Risk: Network Desync with Custom Code**

- If AI modifies world directly → desync
- Solution: Only issue Orders, never modify actors

**Risk: Shared Random Stream Consumed**

- `World.SharedRandom` shared with game logic
- Solution: Use separate random for planning decisions

**Risk: Order Validation May Reject Decisions**

- OrderManager validates all orders
- Solution: Follow order format exactly, validate decisions upfront

### Architectural Constraints

**Single-Threaded:**

- All simulation on main thread
- Can't parallelize decision-making
- Must complete within 40ms

**No Direct Actor Modification:**

- Can't directly change actor properties
- Must issue Orders for all changes
- Orders queue and execute at specific ticks

**No Game Logic Modification:**

- Can't change trait behavior
- Can't add new trait types
- Must work with existing order system

---

## Recommended Adapter Strategy

### Minimal Integration Architecture

```
┌─────────────────────────────────────┐
│      OpenRA Game Engine             │
│  ┌─────────────────────────────┐    │
│  │ World.Tick()               │    │
│  │ ├─ ExecuteOrders()         │    │
│  │ ├─ UpdateActors()          │    │
│  │ └─ SyncHash()              │    │
│  └─────────────────────────────┘    │
│         ▲          ▼                 │
└─────────┼──────────┼─────────────────┘
          │          │
     ┌────┴──────────┴────┐
     │  AI Commander      │
     │  Adapter Interface │
     ├────────────────────┤
     │ • GameAdapter      │
     │ • ObservationProv. │
     │ • CommandExecutor  │
     └────────────────────┘
          ▲          ▼
     ┌────────────────────┐
     │ AI Commander       │
     │ Framework          │
     │ (Planning, Replay) │
     └────────────────────┘
```

### Adapter Components

**1. GameAdapter Implementation**

```csharp
class OpenRAGameAdapter : GameAdapter
{
    private OrderManager orderManager;
    private World world;

    public async Task Initialize(Map map, Players[] players)
    {
        // Load OpenRA game
        // Set up world
        // Configure players
    }

    public async Task ExecuteTick()
    {
        // world.Tick()
        // Wait for next tick (40ms)
    }

    public async Task Shutdown()
    {
        // Cleanup
    }
}
```

**2. ObservationProvider Implementation**

```csharp
class OpenRAObservationProvider : ObservationProvider
{
    public WorldState GetWorldState()
    {
        // Query world for:
        // - Actor positions
        // - Actor types
        // - Player resources
        // - Visibility
    }
}
```

**3. CommandExecutor Implementation**

```csharp
class OpenRACommandExecutor : CommandExecutor
{
    public bool ExecuteCommand(Command cmd)
    {
        // Validate command
        // Create Order
        // Issue to OrderManager
        // Verify execution
    }
}
```

### Integration Timeline

```
Phase 1: Foundation (1 week)
├─ Study OpenRA codebase (4 days)
├─ Create adapter skeleton (2 days)
└─ Load simple map (1 day)

Phase 2: Observation (1 week)
├─ Query world state (2 days)
├─ Map coordinates systems (2 days)
├─ Test observation accuracy (2 days)
└─ Verify determinism (1 day)

Phase 3: Commands (2 weeks)
├─ Create movement orders (3 days)
├─ Create attack orders (3 days)
├─ Create build orders (3 days)
├─ Validate order format (2 days)
└─ Test command execution (2 days)

Phase 4: Integration (1 week)
├─ Connect framework to adapter (2 days)
├─ Run reference planner (2 days)
├─ Test decision execution (2 days)
└─ Verify determinism replay (1 day)

Phase 5: Optimization (1 week)
├─ Benchmark performance (2 days)
├─ Optimize observation (2 days)
├─ Profile command execution (1 day)
└─ Documentation (1 day)
```

---

## Story Breakdown

### Story 4.2: Architecture Discovery ✅ DONE

- Understand OpenRA architecture
- Document integration points
- Identify constraints

### Story 4.3: World State Observation (Estimated 3-5 days)

- Implement ObservationProvider
- Query actor positions and types
- Query player states
- Test observation accuracy

### Story 4.4: Command Pipeline (Estimated 5-7 days)

- Understand order creation
- Create movement orders
- Create attack orders
- Create build orders
- Test command execution

### Story 4.5: Adapter Foundation (Estimated 3-5 days)

- Create GameAdapter skeleton
- Load OpenRA game
- Execute ticks
- Handle lifecycle

### Story 4.6: Framework Integration (Estimated 5-7 days)

- Connect to ReferencePlanner
- Connect to DecisionEngine
- Test autonomous execution
- Verify determinism

### Story 4.7: Optimization & Polish (Estimated 3-5 days)

- Performance tuning
- Documentation
- Demo scenarios
- Production readiness

**Total Estimated Effort: 220-340 hours (~6 weeks)**

---

## Conclusion

OpenRA's architecture is well-suited for AI Commander integration:

✅ **Strengths:**

- Clean separation (rendering, simulation, networking)
- Order-based system (perfect for injection)
- Deterministic (perfect for benchmarking)
- Tick-based (perfect for sync)
- Well-documented code

⚠️ **Constraints:**

- Single-threaded execution
- No direct state modification (orders only)
- 40ms tick budget
- Network desync detection

**Integration Approach:**

1. Observe world state via World queries
2. Inject decisions via OrderManager.IssueOrders()
3. Monitor tick lifecycle for synchronization
4. Verify determinism via replay system

**Next Steps:**
Proceed to Story 4.3 (Observation) with this architecture understanding.
