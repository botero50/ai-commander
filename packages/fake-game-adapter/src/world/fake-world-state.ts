import type { AgentState } from '@ai-commander/domain';
import { AgentState as AgentStateEnum } from '@ai-commander/domain';

/**
 * Worker unit in the economy.
 */
export interface Worker {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly carrying: number;
  readonly busy: boolean;
}

/**
 * Fake world state for the in-memory game adapter.
 *
 * Supports economy simulation:
 * - Multiple workers (agents)
 * - Resource deposits at locations
 * - Worker carrying capacity
 * - Player resource pool
 * - Immutable snapshots
 */
export interface FakeWorldSnapshot {
  readonly tick: number;
  readonly workers: ReadonlyArray<Worker>;
  readonly playerResources: number;
  readonly resourceDeposits: ReadonlyMap<string, number>; // location -> amount
  readonly baseX: number;
  readonly baseY: number;
  readonly commandsExecuted: number;
}

/**
 * Creates an initial fake world state.
 *
 * Starting condition:
 * - Tick 0
 * - One worker at base (0, 0)
 * - Base at (0, 0)
 * - Resource deposits at (20, 20) and (30, 30) with 1000 units each
 * - Player has 0 resources
 * - No commands executed
 */
export function createInitialWorld(): FakeWorldSnapshot {
  const deposits = new Map<string, number>();
  deposits.set('20,20', 1000); // First resource field
  deposits.set('30,30', 1000); // Second resource field

  const workers: Worker[] = [
    { id: 0, x: 0, y: 0, carrying: 0, busy: false },
  ];

  return Object.freeze({
    tick: 0,
    workers: Object.freeze(workers),
    playerResources: 0,
    resourceDeposits: deposits,
    baseX: 0,
    baseY: 0,
    commandsExecuted: 0,
  });
}

/**
 * Create a new world state with updated tick.
 */
export function progressTick(world: FakeWorldSnapshot): FakeWorldSnapshot {
  return Object.freeze({
    ...world,
    tick: world.tick + 1,
  });
}

/**
 * Move a worker by (dx, dy).
 */
export function moveWorker(
  world: FakeWorldSnapshot,
  workerId: number,
  dx: number,
  dy: number
): FakeWorldSnapshot {
  const workers = Array.from(world.workers);
  const workerIndex = workers.findIndex((w) => w.id === workerId);

  if (workerIndex === -1) {
    return world; // Worker not found
  }

  const worker = workers[workerIndex];
  workers[workerIndex] = Object.freeze({
    ...worker,
    x: worker.x + dx,
    y: worker.y + dy,
  });

  return Object.freeze({
    ...world,
    workers: Object.freeze(workers),
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Worker waits (no action).
 */
export function waitWorker(world: FakeWorldSnapshot, _workerId: number): FakeWorldSnapshot {
  return Object.freeze({
    ...world,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Worker gathers resources from current location.
 * Gains 10 units per gather, max 50 carrying.
 */
export function gatherWorker(world: FakeWorldSnapshot, workerId: number): FakeWorldSnapshot {
  const workers = Array.from(world.workers);
  const workerIndex = workers.findIndex((w) => w.id === workerId);

  if (workerIndex === -1) {
    return world;
  }

  const worker = workers[workerIndex];
  const locationKey = `${worker.x},${worker.y}`;
  const deposit = world.resourceDeposits.get(locationKey);

  if (!deposit || deposit <= 0) {
    return Object.freeze({
      ...world,
      commandsExecuted: world.commandsExecuted + 1,
    });
  }

  const gatherAmount = Math.min(10, deposit, 50 - worker.carrying);
  const remainingDeposit = deposit - gatherAmount;

  const newDeposits = new Map(world.resourceDeposits);
  if (remainingDeposit > 0) {
    newDeposits.set(locationKey, remainingDeposit);
  } else {
    newDeposits.delete(locationKey);
  }

  workers[workerIndex] = Object.freeze({
    ...worker,
    carrying: worker.carrying + gatherAmount,
  });

  return Object.freeze({
    ...world,
    workers: Object.freeze(workers),
    resourceDeposits: newDeposits,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Worker deposits resources at base.
 */
export function depositWorker(world: FakeWorldSnapshot, workerId: number): FakeWorldSnapshot {
  const workers = Array.from(world.workers);
  const workerIndex = workers.findIndex((w) => w.id === workerId);

  if (workerIndex === -1) {
    return world;
  }

  const worker = workers[workerIndex];
  const atBase = worker.x === world.baseX && worker.y === world.baseY;

  if (!atBase || worker.carrying === 0) {
    return Object.freeze({
      ...world,
      commandsExecuted: world.commandsExecuted + 1,
    });
  }

  workers[workerIndex] = Object.freeze({
    ...worker,
    carrying: 0,
  });

  return Object.freeze({
    ...world,
    workers: Object.freeze(workers),
    playerResources: world.playerResources + worker.carrying,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Produce a new worker at the base.
 * Costs 50 resources.
 */
export function produceWorker(world: FakeWorldSnapshot): FakeWorldSnapshot {
  const workerCost = 50;

  if (world.playerResources < workerCost) {
    return world; // Not enough resources
  }

  const workers = Array.from(world.workers);
  const nextId = Math.max(...workers.map((w) => w.id), -1) + 1;

  const newWorker: Worker = Object.freeze({
    id: nextId,
    x: world.baseX,
    y: world.baseY,
    carrying: 0,
    busy: false,
  });

  workers.push(newWorker);

  return Object.freeze({
    ...world,
    workers: Object.freeze(workers),
    playerResources: world.playerResources - workerCost,
    commandsExecuted: world.commandsExecuted + 1,
  });
}
