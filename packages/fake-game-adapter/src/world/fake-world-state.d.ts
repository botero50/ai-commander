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
    readonly type: 'infantry' | 'ranged' | 'tank';
    readonly x: number;
    readonly y: number;
    readonly health: number;
    readonly isEnemyUnit?: boolean;
}
/**
 * Enemy position tracked by scouting.
 */
export interface EnemyPosition {
    readonly unitId: number;
    readonly x: number;
    readonly y: number;
    readonly lastSeen: number;
}
/**
 * Game state: idle, playing, won, lost
 */
export type GameState = 'idle' | 'playing' | 'won' | 'lost';
/**
 * Failure reason for diagnostic reporting
 */
export type FailureReason = 'no-workers-no-military' | 'army-defeated' | 'no-resource-access' | 'economy-failed' | 'unknown';
/**
 * Fake world state for the in-memory game adapter.
 *
 * Supports full RTS simulation:
 * - Economy: workers, resources
 * - Military: units, health, combat
 * - Fog of war: known enemies, scouting
 * - Victory/defeat conditions
 * - Immutable snapshots
 */
export interface MatchDiagnostics {
    readonly failureReason?: FailureReason;
    readonly failureTick?: number;
    readonly resourcesEverGathered: number;
    readonly workersProduced: number;
    readonly militaryTrained: number;
    readonly enemiesKilled: number;
    readonly maxResources: number;
    readonly peakWorkerCount: number;
    readonly peakMilitaryCount: number;
}
export interface FakeWorldSnapshot {
    readonly tick: number;
    readonly gameState: GameState;
    readonly workers: ReadonlyArray<Worker>;
    readonly militaryUnits: ReadonlyArray<MilitaryUnit>;
    readonly enemyUnits: ReadonlyArray<MilitaryUnit>;
    readonly knownEnemies: ReadonlyArray<EnemyPosition>;
    readonly playerResources: number;
    readonly resourceDeposits: ReadonlyMap<string, number>;
    readonly baseX: number;
    readonly baseY: number;
    readonly commandsExecuted: number;
    readonly diagnostics: MatchDiagnostics;
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
export declare function createInitialWorld(): FakeWorldSnapshot;
/**
 * Create a new world state with updated tick.
 */
export declare function progressTick(world: FakeWorldSnapshot): FakeWorldSnapshot;
/**
 * Move a worker by (dx, dy).
 */
export declare function moveWorker(world: FakeWorldSnapshot, workerId: number, dx: number, dy: number): FakeWorldSnapshot;
/**
 * Worker waits (no action).
 */
export declare function waitWorker(world: FakeWorldSnapshot, _workerId: number): FakeWorldSnapshot;
/**
 * Worker gathers resources from current location.
 * Gains 10 units per gather, max 50 carrying.
 */
export declare function gatherWorker(world: FakeWorldSnapshot, workerId: number): FakeWorldSnapshot;
/**
 * Worker deposits resources at base.
 */
export declare function depositWorker(world: FakeWorldSnapshot, workerId: number): FakeWorldSnapshot;
/**
 * Produce a new worker at the base.
 * Costs 50 resources.
 */
export declare function produceWorker(world: FakeWorldSnapshot): FakeWorldSnapshot;
/**
 * Train a military unit at the base.
 * Costs 100 resources. Creates infantry by default.
 */
export declare function trainMilitaryUnit(world: FakeWorldSnapshot, unitType?: 'infantry' | 'ranged' | 'tank'): FakeWorldSnapshot;
/**
 * Scout an area to detect enemy units.
 * Scanning from a unit's position with range 30.
 */
export declare function scoutArea(world: FakeWorldSnapshot, unitId: number): FakeWorldSnapshot;
/**
 * Move a military unit to a target position.
 */
export declare function moveMilitaryUnit(world: FakeWorldSnapshot, unitId: number, dx: number, dy: number): FakeWorldSnapshot;
/**
 * Attack an enemy unit.
 * Deals damage (10-20) based on attacker type and defender health.
 */
export declare function attackUnit(world: FakeWorldSnapshot, attackerId: number, targetId: number): FakeWorldSnapshot;
/**
 * Check victory condition: all enemy units destroyed.
 */
export declare function checkVictory(world: FakeWorldSnapshot): FakeWorldSnapshot;
/**
 * Check defeat condition: player has no workers and no military units.
 */
export declare function checkDefeat(world: FakeWorldSnapshot): FakeWorldSnapshot;
//# sourceMappingURL=fake-world-state.d.ts.map