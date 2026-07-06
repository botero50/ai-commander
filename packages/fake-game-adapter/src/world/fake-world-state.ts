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
 * Military unit for combat.
 */
export interface MilitaryUnit {
  readonly id: number;
  readonly type: 'infantry' | 'ranged' | 'tank'; // Different unit types
  readonly x: number;
  readonly y: number;
  readonly health: number; // 0-100
  readonly isEnemyUnit?: boolean; // Is this an enemy unit?
}

/**
 * Enemy position tracked by scouting.
 */
export interface EnemyPosition {
  readonly unitId: number;
  readonly x: number;
  readonly y: number;
  readonly lastSeen: number; // Tick when last spotted
}

/**
 * Fake world state for the in-memory game adapter.
 *
 * Supports full RTS simulation:
 * - Economy: workers, resources
 * - Military: units, health, combat
 * - Fog of war: known enemies, scouting
 * - Immutable snapshots
 */
export interface FakeWorldSnapshot {
  readonly tick: number;
  readonly workers: ReadonlyArray<Worker>;
  readonly militaryUnits: ReadonlyArray<MilitaryUnit>; // Player's military
  readonly enemyUnits: ReadonlyArray<MilitaryUnit>; // Enemy military
  readonly knownEnemies: ReadonlyArray<EnemyPosition>; // Scouted positions
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
 * - Two resource deposits at (20, 20) and (30, 30)
 * - Enemy base at (80, 80) with 2 units
 * - Player has 0 resources, 0 military units
 * - No commands executed
 */
export function createInitialWorld(): FakeWorldSnapshot {
  const deposits = new Map<string, number>();
  deposits.set('20,20', 1000); // First resource field
  deposits.set('30,30', 1000); // Second resource field

  const workers: Worker[] = [
    { id: 0, x: 0, y: 0, carrying: 0, busy: false },
  ];

  // Enemy units at their base (80, 80) - unknown to player initially
  const enemyUnits: MilitaryUnit[] = [
    { id: 100, type: 'infantry', x: 80, y: 80, health: 100, isEnemyUnit: true },
    { id: 101, type: 'ranged', x: 82, y: 80, health: 100, isEnemyUnit: true },
  ];

  return Object.freeze({
    tick: 0,
    workers: Object.freeze(workers),
    militaryUnits: Object.freeze([]),
    enemyUnits: Object.freeze(enemyUnits),
    knownEnemies: Object.freeze([]),
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

/**
 * Train a military unit at the base.
 * Costs 100 resources. Creates infantry by default.
 */
export function trainMilitaryUnit(world: FakeWorldSnapshot, unitType: 'infantry' | 'ranged' | 'tank' = 'infantry'): FakeWorldSnapshot {
  const trainingCost = 100;

  if (world.playerResources < trainingCost) {
    return world; // Not enough resources
  }

  const units = Array.from(world.militaryUnits);
  const nextId = Math.max(...units.map((u) => u.id), 0) + 1;

  const newUnit: MilitaryUnit = Object.freeze({
    id: nextId,
    type: unitType,
    x: world.baseX,
    y: world.baseY,
    health: 100,
  });

  units.push(newUnit);

  return Object.freeze({
    ...world,
    militaryUnits: Object.freeze(units),
    playerResources: world.playerResources - trainingCost,
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Scout an area to detect enemy units.
 * Scanning from a unit's position with range 30.
 */
export function scoutArea(world: FakeWorldSnapshot, unitId: number): FakeWorldSnapshot {
  const unit = world.militaryUnits.find((u) => u.id === unitId);

  if (!unit) {
    return world; // Unit not found
  }

  const scoutRange = 30;
  const knownEnemies = Array.from(world.knownEnemies);

  // Detect enemy units within range
  const newDetections = world.enemyUnits.filter((enemy) => {
    const distance = Math.sqrt(
      Math.pow(unit.x - enemy.x, 2) + Math.pow(unit.y - enemy.y, 2)
    );
    return distance <= scoutRange;
  });

  for (const enemy of newDetections) {
    const existing = knownEnemies.find((k) => k.unitId === enemy.id);

    if (!existing) {
      knownEnemies.push(
        Object.freeze({
          unitId: enemy.id,
          x: enemy.x,
          y: enemy.y,
          lastSeen: world.tick,
        })
      );
    }
  }

  return Object.freeze({
    ...world,
    knownEnemies: Object.freeze(knownEnemies),
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Move a military unit to a target position.
 */
export function moveMilitaryUnit(
  world: FakeWorldSnapshot,
  unitId: number,
  dx: number,
  dy: number
): FakeWorldSnapshot {
  const units = Array.from(world.militaryUnits);
  const unitIndex = units.findIndex((u) => u.id === unitId);

  if (unitIndex === -1) {
    return world;
  }

  const unit = units[unitIndex];
  units[unitIndex] = Object.freeze({
    ...unit,
    x: unit.x + dx,
    y: unit.y + dy,
  });

  return Object.freeze({
    ...world,
    militaryUnits: Object.freeze(units),
    commandsExecuted: world.commandsExecuted + 1,
  });
}

/**
 * Attack an enemy unit.
 * Deals damage (10-20) based on attacker type and defender health.
 */
export function attackUnit(
  world: FakeWorldSnapshot,
  attackerId: number,
  targetId: number
): FakeWorldSnapshot {
  const attacker = world.militaryUnits.find((u) => u.id === attackerId);
  const target = world.enemyUnits.find((u) => u.id === targetId);

  if (!attacker || !target) {
    return world; // Unit or target not found
  }

  // Damage varies by unit type
  let baseDamage = 10;
  if (attacker.type === 'ranged') baseDamage = 15;
  if (attacker.type === 'tank') baseDamage = 20;

  const damage = Math.min(baseDamage, target.health);
  const newHealth = target.health - damage;

  const enemyUnits = Array.from(world.enemyUnits);
  const targetIndex = enemyUnits.findIndex((u) => u.id === targetId);

  if (newHealth > 0) {
    enemyUnits[targetIndex] = Object.freeze({
      ...target,
      health: newHealth,
    });
  } else {
    // Enemy unit destroyed
    enemyUnits.splice(targetIndex, 1);
  }

  return Object.freeze({
    ...world,
    enemyUnits: Object.freeze(enemyUnits),
    commandsExecuted: world.commandsExecuted + 1,
  });
}
