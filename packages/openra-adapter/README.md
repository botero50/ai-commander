# OpenRA Adapter

Read-only world state observation for OpenRA games.

## Overview

This package provides the `ObservationProvider` implementation for OpenRA integration. It observes the OpenRA game world and produces immutable `WorldState` snapshots compatible with the AI Commander framework.

**Key Characteristics:**

- **Read-only** — never mutates OpenRA state
- **Deterministic** — same game state → identical snapshot
- **Immutable** — all returned objects are frozen
- **Observable** — caches historical snapshots for replay analysis
- **Resilient** — handles partial or incomplete game data gracefully

## Architecture

### Components

**OpenRAObservationProvider**

- Implements the `ObservationProvider` contract
- Translates OpenRA game state to AI Commander domain models
- Manages snapshot caching and historical queries
- Validates observation availability

**OpenRAObservationMapper**

- Maps OpenRA-specific types to AI Commander types
- Preserves game-specific metadata in `customData` fields
- Generates placeholder agents when no real units exist (required by framework)
- Ensures deterministic output

## Usage

```typescript
import { OpenRAObservationProvider } from '@ai-commander/openra-adapter';
import type { OpenRAGameState } from '@ai-commander/openra-adapter';

// Create a state accessor (how to read OpenRA game state)
const stateAccessor = async (): Promise<OpenRAGameState> => {
  return {
    world: openraGame.world,
    orderManager: openraGame.orderManager,
    modData: openraGame.modData,
  };
};

// Create the provider
const observer = new OpenRAObservationProvider(stateAccessor);

// Observe current state
const worldState = await observer.getWorldState();
console.log(`Tick: ${worldState.time.currentTick.number}`);
console.log(`Players: ${worldState.players.length}`);
console.log(`Units: ${worldState.agents.length}`);

// Check if observation is available
const available = await observer.isObservationAvailable();

// Retrieve historical snapshots
const previousState = await observer.getWorldStateAt(100);
```

## Mapping Strategy

### OpenRA → AI Commander

| OpenRA       | AI Commander                              | Notes                                       |
| ------------ | ----------------------------------------- | ------------------------------------------- |
| `World.tick` | `WorldState.time.currentTick.number`      | Tick counter                                |
| `Map`        | `WorldState.map`                          | Map dimensions and terrain                  |
| `Player`     | `WorldState.players`                      | Player list with factions, teams, resources |
| `Actor`      | `WorldState.agents`                       | Units and buildings                         |
| `Health`     | `AgentSnapshot.resources['health']`       | Unit health as resource                     |
| `Location`   | `AgentSnapshot.customData.openraLocation` | Actor world position                        |

### Preserved Metadata

OpenRA-specific properties are preserved in `customData` fields:

**Player customData:**

- `openraIndex` — player index
- `openraFaction` — faction name (gdi, nod, etc.)
- `openraCash` — current cash reserves
- `openraResources` — current resources

**Agent customData:**

- `openraActorId` — unique actor ID
- `openraActorType` — unit/building type
- `openraActorTraits` — trait list
- `openraLocation` — world position
- `openraHealth` — current health points
- `openraIsIdle` — activity state

**WorldState customData:**

- `openraWorldTick` — raw tick number
- `openraMapName` — map identifier

## Observation Behavior

### Snapshot Immutability

All returned objects are frozen at creation:

```typescript
const snapshot = await observer.getWorldState();

// These throw errors
snapshot.players[0].name = 'Hacked';
snapshot.agents.push(fakeAgent);
snapshot.customData.modifiedField = 'value';
```

### Determinism

Identical game state always produces identical snapshots:

```typescript
const snap1 = await observer.getWorldState();
const snap2 = await observer.getWorldState();

// Same agent IDs, positions, health, etc.
expect(snap1.agents[0].agentId).toBe(snap2.agents[0].agentId);
```

### Caching & History

The provider caches up to 100 historical snapshots:

```typescript
// Observe tick 0
let state = gameState0;
const snap0 = await observer.getWorldState();

// Observe tick 50
state = gameState50;
const snap50 = await observer.getWorldState();

// Retrieve historical snapshots
const retrieved0 = await observer.getWorldStateAt(0); // Cached
const retrieved50 = await observer.getWorldStateAt(50); // Cached
const missing = await observer.getWorldStateAt(25); // undefined
```

## Resilience

The provider handles incomplete or partial game data gracefully:

### Missing Unit Positions

Units without location data are observed with `openraLocation: null`.

### Missing Health

Units without health traits get health resource value of 0.

### Empty Unit List

When no units exist, a placeholder "neutral" agent is created (framework requires at least one agent). This placeholder is marked with `isPlaceholder: true`.

### Invalid Game State

`isObservationAvailable()` returns false if:

- Game state is null/undefined
- World is missing
- Actors array is missing
- Players array is missing

## Testing

Run the test suite:

```bash
npm test -- packages/openra-adapter
```

Test coverage includes:

- **Integration tests** — full observation pipeline with realistic game states
- **Unit tests** — mapper logic with various input scenarios
- **Immutability tests** — frozen objects cannot be modified
- **Determinism tests** — identical inputs produce identical outputs
- **Resilience tests** — partial/invalid data handled gracefully
- **Cache tests** — historical snapshot retrieval

## Known Limitations

### 1. Placeholder Agent Requirement

When no real units exist on the map, a placeholder "neutral" agent is created to satisfy the framework requirement that WorldState must have at least one agent. This placeholder has `isPlaceholder: true` and should be filtered out by decision engines.

```typescript
const realAgents = worldState.agents.filter((a) => !a.customData.isPlaceholder);
```

### 2. Map Position Count

The observation generates one position per map tile. For large maps (512×512), this creates 262,144 positions. This is correct but may impact memory usage for very large maps. Consider spatial indexing in future versions.

### 3. Health Only Resource

Only health is currently mapped as a resource. Other OpenRA resources (cash, power, oil) are stored in customData. Future versions could expand resource mapping.

### 4. No Visibility/Fog of War

The observation captures all world state without fog-of-war filtering. This is correct for server-side observation but requires careful filtering in agent perception layers.

## Future Extensions

Possible future enhancements:

1. **Selective Visibility** — Filter observation by player shroud
2. **Resource Mapping** — Map cash/power to resource pools
3. **Spatial Indexing** — Optimize position storage for large maps
4. **Event Streaming** — Notify on unit destruction, building completion
5. **Order History** — Track order execution for replay analysis

## Integration Points

This package is part of the OpenRA integration strategy:

- **Story 4.3** — World State Observation (current)
- **Story 4.4** — Command Pipeline (issues orders to game)
- **Story 4.5** — Adapter Foundation (game lifecycle management)
- **Story 4.6** — Framework Integration (connects planner and engine)
- **Story 4.7** — Optimization & Polish (performance tuning)

See `.foundation/research/OPENRA_ARCHITECTURE.md` for complete integration strategy.

## API Reference

### ObservationProvider Interface

```typescript
async getWorldState(): Promise<WorldState>
```

Get current world state. Returns immutable snapshot of complete game world.

```typescript
async getWorldStateAt(tick: number): Promise<WorldState | undefined>
```

Get world state at a specific tick. Returns undefined if not cached.

```typescript
async isObservationAvailable(): Promise<boolean>
```

Check if game is observable. Returns false if game has crashed or is disconnected.

## Contributing

When extending this adapter:

1. **Preserve Immutability** — Always freeze new objects
2. **Maintain Determinism** — Same input must always produce same output
3. **Document Limits** — Explicitly document any constraints or limitations
4. **Add Tests** — Write integration tests for new observation features
5. **Track Metadata** — Preserve game-specific data in customData fields

## References

- Architecture Discovery: `.foundation/research/OPENRA_ARCHITECTURE.md`
- Domain Types: `@ai-commander/domain`
- Adapter Contract: `@ai-commander/adapter`
