import type { AgentState } from '@ai-commander/domain';
import { AgentState as AgentStateEnum } from '@ai-commander/domain';

/**
 * Fake world state for the in-memory game adapter.
 *
 * Minimal deterministic world:
 * - One agent at position (x, y)
 * - Tick counter
 * - Immutable snapshots
 */
export interface FakeWorldSnapshot {
  readonly tick: number;
  readonly agentX: number;
  readonly agentY: number;
  readonly agentState: AgentState;
  readonly commandsExecuted: number;
}

/**
 * Creates an initial fake world state.
 *
 * Starting condition:
 * - Tick 0
 * - Agent at origin (0, 0)
 * - Idle state
 * - No commands executed
 */
export function createInitialWorld(): FakeWorldSnapshot {
  return Object.freeze({
    tick: 0,
    agentX: 0,
    agentY: 0,
    agentState: AgentStateEnum.Idle,
    commandsExecuted: 0,
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
