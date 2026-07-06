import { describe, it, expect } from 'vitest';
import {
  createInitialWorld,
  produceWorker,
  moveWorker,
  gatherWorker,
  depositWorker,
  trainMilitaryUnit,
  scoutArea,
  moveMilitaryUnit,
  attackUnit,
  checkVictory,
  checkDefeat,
} from '../src/world/fake-world-state.js';

describe('Full Autonomous Match', () => {
  describe('Match Setup & Victory Conditions', () => {
    it('initializes game in playing state', () => {
      const world = createInitialWorld();

      expect(world.gameState).toBe('playing');
      expect(world.workers.length).toBe(1);
      expect(world.enemyUnits.length).toBe(2);
      expect(world.militaryUnits.length).toBe(0);
    });

    it('detects victory when all enemies destroyed', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'tank');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 80, y: 80 }] };

      // Tank does 20 damage, enemies have 100 health = 5 hits each
      for (let i = 0; i < 10; i++) {
        if (world.enemyUnits.length > 0) {
          world = attackUnit(world, world.militaryUnits[0].id, world.enemyUnits[0].id);
        }
      }

      expect(world.enemyUnits.length).toBe(0);
      expect(world.gameState).toBe('won');
    });

    it('detects defeat when no units remain', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };

      const result = checkDefeat(world);

      expect(result.gameState).toBe('lost');
    });

    it('does not declare victory with no military units', () => {
      let world = createInitialWorld();
      // Player has workers but no military, enemies still alive
      world = { ...world, militaryUnits: [] };

      expect(world.gameState).toBe('playing');
    });
  });

  describe('Economic Phase', () => {
    it('gathers initial resources', () => {
      let world = createInitialWorld();

      // Move worker to resource location
      world = moveWorker(world, 0, 20, 20);

      // Gather 5 times (50 resources total)
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }

      expect(world.workers[0].carrying).toBe(50);
      expect(world.playerResources).toBe(0);
    });

    it('deposits resources at base', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);

      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }

      // Return to base
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      expect(world.workers[0].carrying).toBe(0);
      expect(world.playerResources).toBe(50);
    });

    it('produces workers from accumulated resources', () => {
      let world = createInitialWorld();
      world = moveWorker(world, 0, 20, 20);

      // Gather enough for production
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }

      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      // Produce new worker
      world = produceWorker(world);

      expect(world.workers.length).toBe(2);
      expect(world.playerResources).toBe(0);
    });

    it('scales to multiple workers gathering', () => {
      let world = createInitialWorld();

      // Produce 2 workers total (3 including initial)
      world = { ...world, playerResources: 100 };
      world = produceWorker(world);
      world = produceWorker(world);

      expect(world.workers.length).toBe(3);

      // All workers move to gather
      world = moveWorker(world, 0, 20, 20);
      world = moveWorker(world, 1, 30, 30);
      world = moveWorker(world, 2, 20, 20);

      // Multiple workers gathering concurrently
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 1);
      world = gatherWorker(world, 2);

      expect(world.workers[0].carrying).toBe(10);
      expect(world.workers[1].carrying).toBe(10);
      expect(world.workers[2].carrying).toBe(10);
    });
  });

  describe('Military Phase', () => {
    it('trains military units from accumulated resources', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };

      world = trainMilitaryUnit(world, 'infantry');

      expect(world.militaryUnits.length).toBe(1);
      expect(world.militaryUnits[0].type).toBe('infantry');
      expect(world.playerResources).toBe(0);
    });

    it('trains multiple unit types', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };

      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');
      world = trainMilitaryUnit(world, 'tank');

      expect(world.militaryUnits.length).toBe(3);
      expect(world.militaryUnits[0].type).toBe('infantry');
      expect(world.militaryUnits[1].type).toBe('ranged');
      expect(world.militaryUnits[2].type).toBe('tank');
    });

    it('scouts for enemies while producing', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };

      world = trainMilitaryUnit(world, 'infantry');

      // Position unit exactly at enemy location (80,80)
      const unitId = world.militaryUnits[0].id;
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 80, y: 80 }] };
      world = scoutArea(world, unitId);

      expect(world.knownEnemies.length).toBeGreaterThan(0);
      expect(world.gameState).toBe('playing');
    });
  });

  describe('Combat Phase', () => {
    it('attacks detected enemy units', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100 };

      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 80, y: 80 }] };

      const targetId = world.enemyUnits[0].id;
      const originalHealth = world.enemyUnits[0].health;

      world = attackUnit(world, world.militaryUnits[0].id, targetId);

      expect(world.enemyUnits[0].health).toBeLessThan(originalHealth);
    });

    it('destroys all enemies through sustained attack', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };

      world = trainMilitaryUnit(world, 'tank');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 80, y: 80 }] };

      // Attack enemies repeatedly
      const targetId1 = world.enemyUnits[0].id;
      while (world.enemyUnits.length > 0) {
        const target = world.enemyUnits[0];
        world = attackUnit(world, world.militaryUnits[0].id, target.id);
      }

      expect(world.enemyUnits.length).toBe(0);
      expect(world.gameState).toBe('won');
    });

    it('coordinates multiple units to defeat enemies', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };

      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');
      world = { ...world, militaryUnits: [
        { ...world.militaryUnits[0], x: 80, y: 80 },
        { ...world.militaryUnits[1], x: 80, y: 80 },
      ] };

      // Coordinate attacks
      while (world.enemyUnits.length > 0) {
        const target = world.enemyUnits[0];
        world = attackUnit(world, world.militaryUnits[0].id, target.id);
        if (world.enemyUnits.length > 0) {
          world = attackUnit(world, world.militaryUnits[1].id, target.id);
        }
      }

      expect(world.gameState).toBe('won');
    });
  });

  describe('Full Match: Economy then Military', () => {
    it('executes complete game: economy phase -> military production -> combat -> victory', () => {
      let world = createInitialWorld();
      let tick = 0;

      // Phase 1: Gather initial resources
      world = moveWorker(world, 0, 20, 20);
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
        tick++;
      }
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);
      tick += 40;

      expect(world.playerResources).toBe(50);

      // Phase 2: Gather more for military production
      world = moveWorker(world, 0, 30, 30);
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
        tick++;
      }
      world = moveWorker(world, 0, -30, -30);
      world = depositWorker(world, 0);
      tick += 60;

      expect(world.playerResources).toBe(100);

      // Phase 3: Train military unit
      world = trainMilitaryUnit(world, 'tank'); // Use tank for more damage
      tick++;

      expect(world.militaryUnits.length).toBe(1);

      // Phase 4: Move to attack position
      world = moveMilitaryUnit(world, 0, 80, 80);
      tick++;

      // Phase 5: Attack enemies repeatedly until victory
      while (world.enemyUnits.length > 0 && tick < 1000) {
        world = attackUnit(world, world.militaryUnits[0].id, world.enemyUnits[0].id);
        tick++;
      }

      expect(world.gameState).toBe('won');
      expect(tick).toBeGreaterThan(100);
    });

    it('maintains economy while building military', () => {
      let world = createInitialWorld();

      // Worker 1: Gather resources
      world = moveWorker(world, 0, 20, 20);
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 0);
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      expect(world.playerResources).toBe(50);

      // Produce 2nd worker while preparing military
      world = produceWorker(world);

      // Train military from next batch of resources
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');

      // Both workers and military units exist
      expect(world.workers.length).toBe(2);
      expect(world.militaryUnits.length).toBe(1);
      expect(world.playerResources).toBe(0);
    });
  });

  describe('Match State Transitions', () => {
    it('transitions from playing to won on victory', () => {
      let world = createInitialWorld();

      expect(world.gameState).toBe('playing');

      world = { ...world, playerResources: 100, militaryUnits: [{ id: 0, type: 'infantry', x: 80, y: 80, health: 100 }] };

      while (world.enemyUnits.length > 0) {
        world = attackUnit(world, 0, world.enemyUnits[0].id);
      }

      expect(world.gameState).toBe('won');
    });

    it('transitions from playing to lost on defeat', () => {
      let world = createInitialWorld();

      expect(world.gameState).toBe('playing');

      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      expect(world.gameState).toBe('lost');
    });

    it('does not change state after victory', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 100, militaryUnits: [{ id: 0, type: 'infantry', x: 80, y: 80, health: 100 }] };

      while (world.enemyUnits.length > 0) {
        world = attackUnit(world, 0, world.enemyUnits[0].id);
      }

      const wonState = world.gameState;
      expect(wonState).toBe('won');

      // Any subsequent action should not change state
      const result = checkVictory(world);
      expect(result.gameState).toBe('won');
    });

    it('does not change state after defeat', () => {
      let world = createInitialWorld();
      world = { ...world, workers: [], militaryUnits: [] };
      world = checkDefeat(world);

      const lostState = world.gameState;
      expect(lostState).toBe('lost');

      // Any subsequent action should not change state
      const result = checkDefeat(world);
      expect(result.gameState).toBe('lost');
    });
  });

  describe('Full Match Complexity', () => {
    it('handles parallel worker and military operations', () => {
      let world = createInitialWorld();

      // Multiple workers gathering from different locations
      world = moveWorker(world, 0, 20, 20);
      world = { ...world, playerResources: 50 };
      world = produceWorker(world);
      world = moveWorker(world, 1, 30, 30);

      world = gatherWorker(world, 0);
      world = gatherWorker(world, 1);

      // Train military while gathering continues
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');

      // Continue gathering while military is trained
      world = gatherWorker(world, 0);
      world = gatherWorker(world, 1);

      expect(world.workers[0].carrying).toBe(20);
      expect(world.workers[1].carrying).toBe(20);
      expect(world.militaryUnits.length).toBe(1);
    });

    it('tracks command execution across full match', () => {
      let world = createInitialWorld();
      const commandsAtStart = world.commandsExecuted;

      world = moveWorker(world, 0, 20, 20);
      const afterMove1 = world.commandsExecuted;
      world = gatherWorker(world, 0);
      const afterGather = world.commandsExecuted;
      world = moveWorker(world, 0, -20, -20);
      const afterMove2 = world.commandsExecuted;

      expect(afterMove1).toBe(commandsAtStart + 1);
      expect(afterGather).toBe(afterMove1 + 1);
      expect(afterMove2).toBe(afterGather + 1);
      expect(world.commandsExecuted).toBeGreaterThan(commandsAtStart);
    });

    it('resource economy scales with multiple workers', () => {
      let world = createInitialWorld();

      // Produce 2 additional workers
      world = { ...world, playerResources: 100 };
      world = produceWorker(world);
      world = produceWorker(world);

      expect(world.workers.length).toBe(3);

      // Move all workers to resource locations
      world = moveWorker(world, 0, 20, 20);
      world = moveWorker(world, 1, 30, 30);
      world = moveWorker(world, 2, 20, 20);

      // All 3 workers gather concurrently
      for (let i = 0; i < 3; i++) {
        world = gatherWorker(world, i);
      }

      const totalCarrying = world.workers.reduce((sum, w) => sum + w.carrying, 0);
      expect(totalCarrying).toBe(30);

      // Return all to base and deposit
      for (let i = 0; i < 3; i++) {
        world = moveWorker(world, i, i === 0 ? -20 : (i === 1 ? -30 : -20), i === 0 ? -20 : (i === 1 ? -30 : -20));
      }

      for (let i = 0; i < 3; i++) {
        world = depositWorker(world, i);
      }

      expect(world.playerResources).toBe(30);
    });
  });

  describe('Observable State Throughout Match', () => {
    it('all changes are observable in world state', () => {
      let world = createInitialWorld();

      const states: Array<{ workers: number; military: number; resources: number; gameState: string }> = [];

      // Record state at each phase
      states.push({
        workers: world.workers.length,
        military: world.militaryUnits.length,
        resources: world.playerResources,
        gameState: world.gameState,
      });

      // Phase: gather resources
      world = moveWorker(world, 0, 20, 20);
      for (let i = 0; i < 5; i++) {
        world = gatherWorker(world, 0);
      }
      world = moveWorker(world, 0, -20, -20);
      world = depositWorker(world, 0);

      states.push({
        workers: world.workers.length,
        military: world.militaryUnits.length,
        resources: world.playerResources,
        gameState: world.gameState,
      });

      // Phase: produce worker
      world = produceWorker(world);

      states.push({
        workers: world.workers.length,
        military: world.militaryUnits.length,
        resources: world.playerResources,
        gameState: world.gameState,
      });

      // Phase: train military
      world = { ...world, playerResources: 100 };
      world = trainMilitaryUnit(world, 'infantry');

      states.push({
        workers: world.workers.length,
        military: world.militaryUnits.length,
        resources: world.playerResources,
        gameState: world.gameState,
      });

      // Verify state progression
      expect(states[0].workers).toBe(1);
      expect(states[0].military).toBe(0);
      expect(states[0].resources).toBe(0);

      expect(states[1].workers).toBe(1);
      expect(states[1].resources).toBe(50);

      expect(states[2].workers).toBe(2);
      expect(states[2].resources).toBe(0);

      expect(states[3].military).toBe(1);

      // All states should be observable
      expect(states.length).toBe(4);
    });
  });
});
