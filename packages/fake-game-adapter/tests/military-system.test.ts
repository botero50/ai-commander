import { describe, it, expect } from 'vitest';
import { createInitialWorld, trainMilitaryUnit, scoutArea, moveMilitaryUnit, attackUnit } from '../src/world/fake-world-state.js';

describe('Military System', () => {
  describe('Unit Production', () => {
    it('creates a military unit when resources available', () => {
      const world = createInitialWorld();
      // Produce workers to get resources
      let w = world;
      for (let i = 0; i < 2; i++) {
        w = { ...w, playerResources: w.playerResources + 100 };
      }

      const trained = trainMilitaryUnit(w, 'infantry');

      expect(trained.militaryUnits.length).toBe(1);
      expect(trained.militaryUnits[0].type).toBe('infantry');
      expect(trained.militaryUnits[0].health).toBe(100);
      expect(trained.militaryUnits[0].x).toBe(0);
      expect(trained.militaryUnits[0].y).toBe(0);
    });

    it('deducts resources when training unit', () => {
      const world = { ...createInitialWorld(), playerResources: 200 };
      const trained = trainMilitaryUnit(world, 'ranged');

      expect(trained.playerResources).toBe(100);
      expect(trained.militaryUnits.length).toBe(1);
    });

    it('creates unit with correct type', () => {
      const world = { ...createInitialWorld(), playerResources: 200 };

      const infantry = trainMilitaryUnit(world, 'infantry');
      expect(infantry.militaryUnits[0].type).toBe('infantry');

      const ranged = trainMilitaryUnit({ ...world, militaryUnits: [] }, 'ranged');
      expect(ranged.militaryUnits[0].type).toBe('ranged');

      const tank = trainMilitaryUnit({ ...world, militaryUnits: [] }, 'tank');
      expect(tank.militaryUnits[0].type).toBe('tank');
    });

    it('fails gracefully with insufficient resources', () => {
      const world = { ...createInitialWorld(), playerResources: 50 };
      const trained = trainMilitaryUnit(world, 'infantry');

      expect(trained.militaryUnits.length).toBe(0);
      expect(trained.playerResources).toBe(50);
    });

    it('increments unit ID correctly', () => {
      let world = { ...createInitialWorld(), playerResources: 500 };

      world = trainMilitaryUnit(world, 'infantry');
      const id1 = world.militaryUnits[0].id;

      world = trainMilitaryUnit(world, 'ranged');
      const id2 = world.militaryUnits[1].id;

      expect(id2).toBe(id1 + 1);
    });
  });

  describe('Scouting', () => {
    it('detects enemy units in range', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      const scouted = scoutArea(world, world.militaryUnits[0].id);

      expect(scouted.knownEnemies.length).toBeGreaterThan(0);
      expect(scouted.knownEnemies[0].unitId).toBe(100);
    });

    it('tracks last seen tick', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200, tick: 42 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      const scouted = scoutArea(world, world.militaryUnits[0].id);

      expect(scouted.knownEnemies[0].lastSeen).toBe(42);
    });

    it('does not detect enemies outside range', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 0, y: 0 }] };

      const scouted = scoutArea(world, world.militaryUnits[0].id);

      expect(scouted.knownEnemies.length).toBe(0);
    });

    it('remembers previously spotted units', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      world = scoutArea(world, world.militaryUnits[0].id);
      const firstSpot = world.knownEnemies.length;

      world = scoutArea(world, world.militaryUnits[0].id);
      const secondSpot = world.knownEnemies.length;

      expect(secondSpot).toBe(firstSpot);
    });

    it('increments scout commands', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      const scouted = scoutArea(world, world.militaryUnits[0].id);

      expect(scouted.commandsExecuted).toBe(world.commandsExecuted + 1);
    });
  });

  describe('Unit Movement', () => {
    it('moves military unit by offset', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      const moved = moveMilitaryUnit(world, world.militaryUnits[0].id, 5, 10);

      expect(moved.militaryUnits[0].x).toBe(5);
      expect(moved.militaryUnits[0].y).toBe(10);
    });

    it('moves multiple units independently', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 400 };
      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');

      world = moveMilitaryUnit(world, world.militaryUnits[0].id, 5, 0);
      world = moveMilitaryUnit(world, world.militaryUnits[1].id, 0, 5);

      expect(world.militaryUnits[0].x).toBe(5);
      expect(world.militaryUnits[0].y).toBe(0);
      expect(world.militaryUnits[1].x).toBe(0);
      expect(world.militaryUnits[1].y).toBe(5);
    });

    it('allows negative movement', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 10, y: 10 }] };

      const moved = moveMilitaryUnit(world, world.militaryUnits[0].id, -5, -5);

      expect(moved.militaryUnits[0].x).toBe(5);
      expect(moved.militaryUnits[0].y).toBe(5);
    });
  });

  describe('Combat', () => {
    it('damages enemy unit on attack', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      const targetId = world.enemyUnits[0].id;
      const originalHealth = world.enemyUnits[0].health;

      const attacked = attackUnit(world, world.militaryUnits[0].id, targetId);

      expect(attacked.enemyUnits[0].health).toBeLessThan(originalHealth);
    });

    it('deals different damage by unit type', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 600 };

      // Test infantry
      world = trainMilitaryUnit(world, 'infantry');
      let infantryWorld = { ...world, enemyUnits: [{ ...world.enemyUnits[0], health: 100 }] };
      infantryWorld = attackUnit(infantryWorld, world.militaryUnits[0].id, infantryWorld.enemyUnits[0].id);
      const infantryDamage = 100 - infantryWorld.enemyUnits[0].health;

      // Test ranged
      world = trainMilitaryUnit(world, 'ranged');
      let rangedWorld = { ...world, enemyUnits: [{ ...world.enemyUnits[0], health: 100 }] };
      rangedWorld = attackUnit(rangedWorld, world.militaryUnits[1].id, rangedWorld.enemyUnits[0].id);
      const rangedDamage = 100 - rangedWorld.enemyUnits[0].health;

      expect(rangedDamage).toBeGreaterThan(infantryDamage);
    });

    it('destroys unit at 0 health', () => {
      let world = createInitialWorld();
      // Create enemy with low health (10 < infantry damage 10)
      const lowHealthEnemy = { ...world.enemyUnits[0], health: 8 };
      world = { ...world, playerResources: 200, enemyUnits: Object.freeze([lowHealthEnemy, world.enemyUnits[1]]) };
      world = trainMilitaryUnit(world, 'infantry');

      const targetId = world.enemyUnits[0].id;
      const attacked = attackUnit(world, world.militaryUnits[0].id, targetId);

      expect(attacked.enemyUnits.length).toBe(1); // destroyed unit removed
      expect(attacked.enemyUnits[0].id).toBe(world.enemyUnits[1].id);
    });

    it('tank deals more damage than ranged', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };

      // Ranged damage test
      world = trainMilitaryUnit(world, 'ranged');
      const rangedId = world.militaryUnits[0].id;
      let testWorld = { ...world, enemyUnits: [{ ...world.enemyUnits[0], health: 100 }] };
      testWorld = attackUnit(testWorld, rangedId, testWorld.enemyUnits[0].id);
      const rangedDamage = 100 - testWorld.enemyUnits[0].health;

      // Tank damage test
      world = trainMilitaryUnit(world, 'tank');
      const tankId = world.militaryUnits[1].id;
      testWorld = { ...world, enemyUnits: [{ ...world.enemyUnits[0], health: 100 }] };
      testWorld = attackUnit(testWorld, tankId, testWorld.enemyUnits[0].id);
      const tankDamage = 100 - testWorld.enemyUnits[0].health;

      expect(tankDamage).toBeGreaterThan(rangedDamage);
    });
  });

  describe('Army Coordination', () => {
    it('coordinates multiple units attacking same target', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };
      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');

      const targetId = world.enemyUnits[0].id;
      const originalHealth = world.enemyUnits[0].health;

      world = attackUnit(world, world.militaryUnits[0].id, targetId);
      world = attackUnit(world, world.militaryUnits[1].id, targetId);

      const finalHealth = world.enemyUnits[0].health;
      expect(finalHealth).toBeLessThan(originalHealth - 10);
    });

    it('coordinates units in formation', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 400 };
      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');

      // Move both units in a formation
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, 10, 10);
      world = moveMilitaryUnit(world, world.militaryUnits[1].id, 12, 10);

      expect(world.militaryUnits[0].x).toBe(10);
      expect(world.militaryUnits[0].y).toBe(10);
      expect(world.militaryUnits[1].x).toBe(12);
      expect(world.militaryUnits[1].y).toBe(10);
    });

    it('tracks both player and enemy units in world', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      expect(world.militaryUnits.length).toBe(1);
      expect(world.enemyUnits.length).toBe(2);
    });
  });

  describe('Fog of War', () => {
    it('maintains known enemies list separately from visible', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      world = scoutArea(world, world.militaryUnits[0].id);

      expect(world.knownEnemies.length).toBeGreaterThan(0);
      expect(world.knownEnemies[0].unitId).toBe(world.enemyUnits[0].id);
    });

    it('tracks last seen tick for fog of war', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200, tick: 50 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      world = scoutArea(world, world.militaryUnits[0].id);

      expect(world.knownEnemies[0].lastSeen).toBe(50);
    });
  });

  describe('Tactical Positioning', () => {
    it('units can move to attack range', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      // Move from (0,0) towards enemy at (80,80)
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, 20, 20);
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, 20, 20);
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, 20, 20);

      expect(world.militaryUnits[0].x).toBe(60);
      expect(world.militaryUnits[0].y).toBe(60);
    });

    it('coordinates retreat movements', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60, health: 30 }] };

      // Retreat towards base
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, -20, -20);
      world = moveMilitaryUnit(world, world.militaryUnits[0].id, -20, -20);

      expect(world.militaryUnits[0].x).toBe(20);
      expect(world.militaryUnits[0].y).toBe(20);
      expect(world.militaryUnits[0].health).toBe(30);
    });
  });

  describe('Attack Timing and Reinforcement', () => {
    it('queues multiple attacks in sequence', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 300 };
      world = trainMilitaryUnit(world, 'infantry');
      world = trainMilitaryUnit(world, 'ranged');

      const targetId = world.enemyUnits[0].id;

      // First attack
      world = attackUnit(world, world.militaryUnits[0].id, targetId);
      const healthAfterFirst = world.enemyUnits[0].health;

      // Second attack
      world = attackUnit(world, world.militaryUnits[1].id, targetId);
      const healthAfterSecond = world.enemyUnits[0].health;

      expect(healthAfterFirst).toBeLessThan(100);
      expect(healthAfterSecond).toBeLessThan(healthAfterFirst);
    });

    it('produces reinforcement units while attacking', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 400 };
      world = trainMilitaryUnit(world, 'infantry');

      const defendingCount = world.militaryUnits.length;

      // While defending, produce more units
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'ranged');

      expect(world.militaryUnits.length).toBe(defendingCount + 1);
    });
  });

  describe('Command Execution Tracking', () => {
    it('increments command counter on train', () => {
      const world = { ...createInitialWorld(), playerResources: 200 };
      const trained = trainMilitaryUnit(world, 'infantry');

      expect(trained.commandsExecuted).toBe(world.commandsExecuted + 1);
    });

    it('increments counter on scout', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');
      world = { ...world, militaryUnits: [{ ...world.militaryUnits[0], x: 60, y: 60 }] };

      const scouted = scoutArea(world, world.militaryUnits[0].id);
      expect(scouted.commandsExecuted).toBe(world.commandsExecuted + 1);
    });

    it('increments counter on move', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      const moved = moveMilitaryUnit(world, world.militaryUnits[0].id, 5, 5);
      expect(moved.commandsExecuted).toBe(world.commandsExecuted + 1);
    });

    it('increments counter on attack', () => {
      let world = createInitialWorld();
      world = { ...world, playerResources: 200 };
      world = trainMilitaryUnit(world, 'infantry');

      const attacked = attackUnit(world, world.militaryUnits[0].id, world.enemyUnits[0].id);
      expect(attacked.commandsExecuted).toBe(world.commandsExecuted + 1);
    });
  });
});
