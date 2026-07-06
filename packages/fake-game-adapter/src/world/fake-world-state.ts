import type { AgentState } from '@ai-commander/domain';
import { AgentState as AgentStateEnum } from '@ai-commander/domain';

/**
 * Fake world state for the in-memory game adapter.
 *
 * Minimal deterministic world:
 * - One agent at position (x, y)
 * - Tick counter
 * - Resource deposits at fixed locations
 * - Agent carrying resources
 * - Player resources collected
 * - Immutable snapshots
 */
export interface FakeWorldSnapshot {
  readonly tick: number;
  readonly agentX: number;
  readonly agentY: number;
  readonly agentState: AgentState;
  readonly commandsExecuted: number;
  readonly playerResources: number;
  readonly agentCarrying: number;
  readonly resourceDeposits: ReadonlyMap<string, number>; // location -> amount
  readonly baseX: number;
  readonly baseY: number;
}

/**
 * Creates an initial fake world state.
 *
 * Starting condition:
 * - Tick 0
 * - Agent at origin (0, 0)
 * - Base at (0, 0)
 * - Idle state
 * - Resource deposit at (20, 20) with 1000 units
 * - Player has 0 resources
 * - Agent carrying 0 resources
 * - No commands executed
 */
export function createInitialWorld(): FakeWorldSnapshot {
  const deposits = new Map<string, number>();
  deposits.set('20,20', 1000); // Resource field with 1000 units

  return Object.freeze({
    tick: 0,
    agentX: 0,
    agentY: 0,
    agentState: AgentStateEnum.Idle,
    commandsExecuted: 0,
    playerResources: 0,
    agentCarrying: 0,
    resourceDeposits: deposits,
    baseX: 0,
    baseY: 0,
  });
}

/**
 * Create a new world state with updated tick.
 *
 * Immutable: returns new object, never modifies input.
 */
export function progressTick(world: FakeWorldSnapshot): FakeWorldSnapshot {
  return Object.freeze({
    ...world,
    tick: world.tick + 1,
  });
}

/**
 * Create a new world state with agent moved.
 *
 * Deterministic: (x, y) + (dx, dy) = (x+dx, y+dy)
 * Immutable: returns new object, never modifies input.
 */
export function moveAgent(world: FakeWorldSnapshot, dx: number, dy: number): FakeWorldSnapshot {
  return Object.freeze({
    ...world,
    agentX: world.agentX + dx,
    agentY: world.agentY + dy,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Create a new world state with agent waiting.
 *
 * No position change, just increment command count.
 */
export function waitAgent(world: FakeWorldSnapshot): FakeWorldSnapshot {
  return Object.freeze({
    ...world,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Agent gathers resources from current location.
 *
 * If at a resource deposit, gain 10 units (max 50 total carrying).
 * Otherwise, gain 0.
 */
export function gatherAgent(world: FakeWorldSnapshot): FakeWorldSnapshot {
  const locationKey = `${world.agentX},${world.agentY}`;
  const deposit = world.resourceDeposits.get(locationKey);

  if (!deposit || deposit <= 0) {
    // No resources at this location
    return Object.freeze({
      ...world,
      commandsExecuted: world.commandsExecuted + 1,
    });
  }

  // Gather 10 units per gather command
  const gatherAmount = Math.min(10, deposit, 50 - world.agentCarrying);
  const remainingDeposit = deposit - gatherAmount;

  const newDeposits = new Map(world.resourceDeposits);
  if (remainingDeposit > 0) {
    newDeposits.set(locationKey, remainingDeposit);
  } else {
    newDeposits.delete(locationKey);
  }

  return Object.freeze({
    ...world,
    commandsExecuted: world.commandsExecuted + 1,
    agentCarrying: world.agentCarrying + gatherAmount,
    resourceDeposits: newDeposits,
  });
}

/**
 * Agent deposits resources at base.
 *
 * If at base (0, 0), deposit all carrying resources.
 * Otherwise, do nothing.
 */
export function depositAgent(world: FakeWorldSnapshot): FakeWorldSnapshot {
  const atBase = world.agentX === world.baseX && world.agentY === world.baseY;

  if (!atBase || world.agentCarrying === 0) {
    // Not at base or nothing to deposit
    return Object.freeze({
      ...world,
      commandsExecuted: world.commandsExecuted + 1,
    });
  }

  // Deposit all carrying resources
  return Object.freeze({
    ...world,
    commandsExecuted: world.commandsExecuted + 1,
    playerResources: world.playerResources + world.agentCarrying,
    agentCarrying: 0,
  });
}
