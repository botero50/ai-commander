# @ai-commander/domain

Game-agnostic domain model for AI Commander framework.

This package defines the fundamental, immutable data structures that represent strategy game concepts. It provides interfaces and value objects for building AI agents that work across multiple game genres without modification.

## Overview

The domain model is **game-agnostic** and **implementation-free**. It defines:

- What a game world contains (entities, agents, resources, state)
- How agents perceive the world (observations, visibility, fog of war)
- What agents can do (commands, actions, results)
- What happens (events, state changes)
- What agents need to succeed (capabilities, goals, objectives)

**What it does NOT contain:**

- Game-specific logic or rules
- AI decision-making or planning algorithms
- Engine implementation details
- Player-facing features (UI, graphics, sound)

## Core Concepts

### Identity Types

Branded string types for type safety:

```typescript
import {
  EntityId,
  ComponentId,
  PlayerId,
  TeamId,
  GameId,
  createEntityId,
  createPlayerId,
} from '@ai-commander/domain';

const playerId = createPlayerId('player-1');
const agent = createAgent('agent-100');
```

### Spatial Concepts

Flexible position and map abstractions supporting any world layout:

```typescript
import { createPosition, createGameMap, createRegion } from '@ai-commander/domain';

const position = createPosition('row:5,col:10', 'North Wall');
const map = createGameMap('forest-1', 'Dark Forest', [position1, position2]);
const region = createRegion('region-1', 'Northern Territory', [position1]);
```

**Supports:**

- Grid coordinates: `row:5,col:10`
- Continuous coordinates: `100.5,200.3`
- Hex grids: `hex-15-20`
- Graph nodes: `node-42`
- Custom positioning schemes

### Temporal Concepts

Abstract time representation:

```typescript
import { createTick, createPhase, createGameTime } from '@ai-commander/domain';

const tick = createTick(42); // Discrete time step
const phase = createPhase('perception', 'Perception', 0, tick); // Turn phases
const time = createGameTime(tick, phase, 'Day 5, Morning'); // Human-readable
```

**Supports:**

- Turn-based games (1 tick = 1 turn)
- Real-time games (1 tick = 1 frame)
- Simulation games (1 tick = 1 step)
- Multi-phase turns

### Resource System

Flexible economy for any game type:

```typescript
import { createResourceType, createResource, createResourcePool } from '@ai-commander/domain';

const gold = createResourceType('gold', 'Gold', 'economy', 0, 1000);
const wood = createResourceType('wood', 'Wood', 'economy', 0, 500);

const resources = createResourcePool(
  [createResource(gold, 100), createResource(wood, 50)],
  [gold, wood]
);

// Query and validate
resources.getAmount('gold'); // 100
resources.hasEnough('gold', 50); // true
resources.hasEnough('gold', 150); // false
```

**Supports:**

- Economy resources (gold, wood, stone)
- Combat resources (health, energy, mana)
- Action resources (action points, command points)
- Custom resources (cards, tokens, population)

### Agents and Players

```typescript
import {
  createPlayer,
  createTeam,
  createAgent,
  createAgentSnapshot,
  AgentState,
} from '@ai-commander/domain';

const player = createPlayer(playerId, 'Alice', teamId);
const team = createTeam(teamId, 'Team A', [playerId]);

const agent = createAgent('agent-1');
const snapshot = createAgentSnapshot(
  agent,
  playerId, // Controlled by this player (null = NPC)
  AgentState.Idle,
  resourcePool
);
```

**Agent States:**

- `Idle` — Not active
- `Perceiving` — Gathering information
- `Deciding` — Making decisions
- `Acting` — Executing actions
- `Waiting` — Blocked/waiting
- `Defeated` — Out of game
- `Unknown` — Undefined

### Game State

Complete, immutable snapshot:

```typescript
import { createWorldState, getAgent, getPlayerAgents } from '@ai-commander/domain';

const world = createWorldState(
  gameTime,
  map,
  [player1, player2],
  [team1, team2],
  [agentSnapshot1, agentSnapshot2]
);

// Query
const agent = getAgent(world, agentId);
const myAgents = getPlayerAgents(world, playerId);
```

### Actions and Commands

Discriminated unions for type-safe action handling:

```typescript
import {
  createCommand,
  createActionSuccess,
  createActionFailure,
  isActionSuccess,
} from '@ai-commander/domain';

const command = createCommand(
  actionId,
  agentId,
  'move', // Action type
  { targetPosition: '5,10' }, // Game-specific params
  tick,
  priority
);

const result = isActionSuccess(result) ? result.effects : `Failed: ${result.reason}`;
```

### Events

Discriminated unions for public vs. private events:

```typescript
import {
  createEventType,
  createPublicEvent,
  createPrivateEvent,
  canObserveEvent,
} from '@ai-commander/domain';

const eventType = createEventType('agent-moved', 'Agent Moved', 'movement');

const publicEvent = createPublicEvent(
  eventId,
  eventType,
  agentId,
  tick,
  { from: '0,0', to: '0,1' } // Game-specific
);

const privateEvent = createPrivateEvent(
  eventId,
  eventType,
  agentId,
  tick,
  ['player-1', 'player-2'], // Only visible to these
  { secret: true }
);

if (canObserveEvent(privateEvent, playerId)) {
  // Player can see event
}
```

### Perception and Fog of War

Vision and visibility tracking:

```typescript
import {
  VisibilityState,
  createPositionVisibility,
  createFogOfWar,
  createObservation,
} from '@ai-commander/domain';

const visibility = createPositionVisibility(
  position,
  VisibilityState.Visible, // Visible, FogOfWar, or Unexplored
  occupiedByAgentId,
  lastSeenTick
);

const fog = createFogOfWar(
  agentId,
  [visibility1, visibility2],
  visionRange, // null for custom visibility
  affectedByLighting
);

const observation = createObservation(agentId, visibleAgents, fog, visibleEvents);
```

### Capabilities

What agents can do:

```typescript
import { createCapability, isCapabilityReady, canUseCapability } from '@ai-commander/domain';

const moveCapability = createCapability(
  'move',
  'Move',
  'movement',
  true, // Enabled?
  { energy: 1 }, // Resource cost
  0, // Cooldown remaining
  0, // Max cooldown
  { range: 1 } // Game-specific properties
);

if (isCapabilityReady(moveCapability)) {
  // Can be used now
}

if (canUseCapability(moveCapability, { energy: 100 })) {
  // Has enough resources
}
```

### Goals and Objectives

Multi-level goal decomposition:

```typescript
import { createGoal, createObjective, isObjectiveOverdue } from '@ai-commander/domain';

const goal = createGoal('goal-1', 'Defeat the enemy commander', 'combat', priority, active, {
  targetAgentId: 'enemy-1',
});

const objective = createObjective(
  'obj-1',
  'Move to enemy position',
  'move-to-position',
  'goal-1',
  completed,
  deadline // tick when due (null = no deadline)
);

if (isObjectiveOverdue(objective, currentTick)) {
  // Overdue
}
```

## Design Principles

### 1. Immutability

All domain objects are immutable (frozen). Create new instances for state changes:

```typescript
const agent1 = createAgentSnapshot(agentId, playerId, AgentState.Idle, resources);
// To change state:
const agent2 = createAgentSnapshot(agentId, playerId, AgentState.Acting, resources);
```

### 2. Pure Value Objects

No logic, no side effects. Just data:

```typescript
const position = createPosition('5,10', 'River Crossing');
// position is just data - no methods that do things
```

### 3. Discriminated Unions

Exhaustive pattern matching with TypeScript:

```typescript
const handleResult = (result: ActionResult) => {
  if (isActionSuccess(result)) {
    console.log('Effects:', result.effects);
  } else {
    console.log('Failed:', result.reason);
  }
};
```

### 4. Game-Agnostic Design

No game-specific terminology. Use `customData` for game types:

```typescript
// Doesn't mention RTS, fantasy, card game, etc.
// Just generic structures

const agentData = createAgentSnapshot(agent, player, state, resources, {
  // Game-specific properties go in customData
  unitType: 'soldier', // RTS-specific
  spellsKnown: ['fireball'], // Fantasy-specific
  cardsInHand: ['attack'], // Card game-specific
});
```

## Testing

33 comprehensive tests covering:

- Identity type creation and validation
- Spatial concepts (positions, maps, regions)
- Temporal concepts (ticks, phases, time)
- Resources and pools
- Players and teams
- Agents and snapshots
- World state integration
- Commands and action results
- Events (public, private, visibility)
- Perception and fog of war
- Capabilities and readiness
- Goals and objectives
- Immutability guarantees

Run tests:

```bash
npm test -- domain
```

## Usage Examples

### Complete Game Tick

```typescript
import {
  createWorldState,
  createGameTime,
  createTick,
  createCommand,
  createActionSuccess,
  createPublicEvent,
  createEventType,
} from '@ai-commander/domain';

// Start of tick
const tick = createTick(5);
const time = createGameTime(tick, null, 'Turn 5');

// Agents perceive
const observation = getObservation(world, agentId);

// Agents decide
const command = createCommand(actionId, agentId, 'move', { target: targetPosition }, tick);

// Engine executes
const result = executeCommand(command);
if (isActionSuccess(result)) {
  // Record event
  const eventType = createEventType('moved', 'Agent Moved', 'movement');
  const event = createPublicEvent(eventId, eventType, agentId, tick);

  // Update world state
  const newWorld = createWorldState(
    time,
    map,
    players,
    teams,
    updatedAgents // Updated snapshot with new position
  );
}
```

## No Logic in Domain

This package contains **NO**:

- AI algorithms
- Game rules
- Action validation (that's Engine layer)
- Planning
- Decision-making
- Physics simulation
- Network code
- UI code

These belong in higher layers that depend on Domain.

## Dependency Rules

The Domain package:

- ✅ Can depend on Shared utilities only
- ❌ Cannot depend on Core (ECS)
- ❌ Cannot depend on Engine
- ❌ Cannot depend on higher layers

All other packages depend on Domain.

## Versioning

Domain is Public API - semantic versioning applies:

- Adding fields to types → MINOR (backward compatible)
- Removing fields → MAJOR (breaking)
- Changing field types → MAJOR (breaking)
- Adding new types → MINOR
- Removing types → MAJOR

## Related Documentation

- `.foundation/docs/ARCHITECTURE.md` — Full architecture specification
- `.foundation/adr/ADR-0003-MODULE_BOUNDARIES.md` — Public API policy
- Root `README.md` — Framework overview
