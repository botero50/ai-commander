import { describe, it, expect } from 'vitest';
import { OpenRAObservationProvider } from '../src/observation/openra-observation-provider.js';
import {
  createTestOpenRAGameState,
  createTestGameStateWithUnits,
  createTestGameStateVariousTicks,
  createTestGameStateMultiplePlayers,
  createTestGameStateWithDamagedUnits,
  createTestOpenRAPlayer,
  createTestOpenRAActor,
} from './fixtures/openra-test-state.js';

describe('OpenRAObservationProvider', () => {
  describe('getWorldState', () => {
    it('creates world state snapshot successfully', async () => {
      const gameState = createTestGameStateWithUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot).toBeDefined();
      expect(snapshot.time).toBeDefined();
      expect(snapshot.map).toBeDefined();
      expect(snapshot.players).toBeDefined();
      expect(snapshot.agents).toBeDefined();
    });

    it('produces immutable snapshots', async () => {
      const gameState = createTestGameStateWithUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(() => {
        (snapshot as any).time = null;
      }).toThrow();

      expect(() => {
        (snapshot.players as any)[0] = null;
      }).toThrow();

      expect(() => {
        (snapshot.agents as any).push({});
      }).toThrow();
    });

    it('is deterministic: same state produces same snapshot', async () => {
      const gameState = createTestGameStateWithUnits(100);

      const provider1 = new OpenRAObservationProvider(async () => gameState);
      const provider2 = new OpenRAObservationProvider(async () => gameState);

      const snapshot1 = await provider1.getWorldState();
      const snapshot2 = await provider2.getWorldState();

      expect(snapshot1.time.currentTick.number).toBe(snapshot2.time.currentTick.number);
      expect(snapshot1.map.name).toBe(snapshot2.map.name);
      expect(snapshot1.players.length).toBe(snapshot2.players.length);
      expect(snapshot1.agents.length).toBe(snapshot2.agents.length);

      for (let i = 0; i < snapshot1.agents.length; i++) {
        expect(snapshot1.agents[i].agentId).toBe(snapshot2.agents[i].agentId);
      }
    });

    it('captures tick number correctly', async () => {
      const ticks = [0, 25, 50, 100, 1000];

      for (const tick of ticks) {
        const gameState = createTestGameStateVariousTicks()[0]; // Has units
        const provider = new OpenRAObservationProvider(async () => ({
          ...gameState,
          world: { ...gameState.world, tick },
        }));

        const snapshot = await provider.getWorldState();

        expect(snapshot.time.currentTick.number).toBe(tick);
        expect(snapshot.time.elapsedTicks).toBe(tick);
      }
    });

    it('captures game time with correct display format', async () => {
      const baseState = createTestGameStateWithUnits(150); // 150 ticks = 6 seconds
      const provider = new OpenRAObservationProvider(async () => baseState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.time.displayTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('observes single player scenario', async () => {
      const gameState = createTestOpenRAGameState(
        0,
        [createTestOpenRAPlayer(0, 'Human')],
        [createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Human'))]
      );
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.players).toHaveLength(1);
      expect(snapshot.players[0].name).toBe('Human');
    });

    it('observes multiple players with teams', async () => {
      const gameState = createTestGameStateMultiplePlayers();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.players).toHaveLength(4);
      expect(snapshot.teams).toHaveLength(2);

      // Verify team membership
      const gdiTeam = snapshot.teams.find((t) => t.id === 'team-0');
      expect(gdiTeam).toBeDefined();
      expect(gdiTeam?.playerIds).toHaveLength(2);
    });

    it('observes units with correct properties', async () => {
      const gameState = createTestGameStateWithUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.agents).toHaveLength(5);

      const mcv = snapshot.agents.find((a) => a.customData.openraActorType === 'mcv');
      expect(mcv).toBeDefined();
      expect(mcv?.customData.openraActorId).toBe(1);
    });

    it('captures unit health correctly', async () => {
      const gameState = createTestGameStateWithDamagedUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      const fullHealth = snapshot.agents[0];
      const halfHealth = snapshot.agents[1];
      const criticalHealth = snapshot.agents[2];

      expect(fullHealth.resources.getAmount('health')).toBe(100);
      expect(halfHealth.resources.getAmount('health')).toBe(50);
      expect(criticalHealth.resources.getAmount('health')).toBe(1);
    });

    it('captures unit positions', async () => {
      const gameState = createTestGameStateWithUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      const unit = snapshot.agents[0];
      expect(unit.customData.openraLocation).toEqual({
        x: 0,
        y: 0,
      });
    });

    it('captures map dimensions correctly', async () => {
      // Map with units, so WorldState is valid
      const gameState = createTestOpenRAGameState(
        0,
        [createTestOpenRAPlayer(0, 'Human')],
        [createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Human'))],
        'TestMap',
        256,
        192
      );
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.map.width).toBe(256);
      expect(snapshot.map.height).toBe(192);
      // Map now contains key positions only (corners + center), not full grid
      expect(snapshot.map.positions.length).toBeGreaterThan(0);
      expect(snapshot.map.positions.length).toBeLessThan(10);
    });

    it('handles empty unit list', async () => {
      const gameState = createTestOpenRAGameState(0, [createTestOpenRAPlayer(0, 'Human')], []);
      const provider = new OpenRAObservationProvider(async () => gameState);

      // This will throw because WorldState requires at least one agent.
      // This is a framework limitation, not an adapter issue.
      await expect(provider.getWorldState()).rejects.toThrow(
        'WorldState must have at least one agent'
      );
    });

    it('includes OpenRA-specific metadata in customData', async () => {
      const gameState = createTestGameStateWithUnits();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const snapshot = await provider.getWorldState();

      expect(snapshot.customData).toBeDefined();
      expect(snapshot.customData.openraWorldTick).toBe(gameState.world.tick);
      expect(snapshot.customData.openraMapName).toBe(gameState.world.map.name);
    });
  });

  describe('getWorldStateAt', () => {
    it('retrieves cached world state by tick', async () => {
      const gameState0 = createTestGameStateWithUnits(0);
      const gameState25 = createTestGameStateWithUnits(25);
      const gameState50 = createTestGameStateWithUnits(50);

      let currentState = gameState0;
      const provider = new OpenRAObservationProvider(async () => currentState);

      // Observe at tick 0
      const snap0 = await provider.getWorldState();
      expect(snap0.time.currentTick.number).toBe(0);

      // Observe at tick 25
      currentState = gameState25;
      const snap25 = await provider.getWorldState();
      expect(snap25.time.currentTick.number).toBe(25);

      // Observe at tick 50
      currentState = gameState50;
      const snap50 = await provider.getWorldState();
      expect(snap50.time.currentTick.number).toBe(50);

      // Retrieve historical snapshots
      const retrieved0 = await provider.getWorldStateAt(0);
      const retrieved25 = await provider.getWorldStateAt(25);
      const retrieved50 = await provider.getWorldStateAt(50);

      expect(retrieved0).toBeDefined();
      expect(retrieved25).toBeDefined();
      expect(retrieved50).toBeDefined();
      expect(retrieved0!.time.currentTick.number).toBe(0);
      expect(retrieved25!.time.currentTick.number).toBe(25);
      expect(retrieved50!.time.currentTick.number).toBe(50);
    });

    it('returns undefined for non-cached ticks', async () => {
      const gameState = createTestGameStateWithUnits(100);
      const provider = new OpenRAObservationProvider(async () => gameState);

      await provider.getWorldState();

      const nonCached = await provider.getWorldStateAt(999);
      expect(nonCached).toBeUndefined();
    });

    it('maintains cache across multiple observations', async () => {
      const states = createTestGameStateVariousTicks();
      let currentIndex = 0;

      const provider = new OpenRAObservationProvider(async () => states[currentIndex]);

      // Observe all ticks
      for (let i = 0; i < states.length; i++) {
        currentIndex = i;
        await provider.getWorldState();
      }

      // Verify all are cached
      for (let i = 0; i < states.length; i++) {
        const cached = await provider.getWorldStateAt(states[i].world.tick);
        expect(cached).toBeDefined();
      }
    });
  });

  describe('isObservationAvailable', () => {
    it('returns true for valid game state', async () => {
      const gameState = createTestOpenRAGameState();
      const provider = new OpenRAObservationProvider(async () => gameState);

      const available = await provider.isObservationAvailable();

      expect(available).toBe(true);
    });

    it('returns false when state accessor throws', async () => {
      const provider = new OpenRAObservationProvider(async () => {
        throw new Error('Game disconnected');
      });

      const available = await provider.isObservationAvailable();

      expect(available).toBe(false);
    });

    it('returns false for null state', async () => {
      const provider = new OpenRAObservationProvider(async () => {
        return null as any;
      });

      const available = await provider.isObservationAvailable();

      expect(available).toBe(false);
    });

    it('returns false for incomplete world', async () => {
      const incompleteState = {
        world: {
          tick: 0,
          // missing actors and players
        },
      } as any;

      const provider = new OpenRAObservationProvider(async () => incompleteState);

      const available = await provider.isObservationAvailable();

      expect(available).toBe(false);
    });
  });

  describe('snapshot consistency across ticks', () => {
    it('maintains consistent player IDs across ticks', async () => {
      const states = createTestGameStateVariousTicks();
      let currentIndex = 0;

      const provider = new OpenRAObservationProvider(async () => states[currentIndex]);

      const playerIds: string[] = [];

      for (let i = 0; i < states.length; i++) {
        currentIndex = i;
        const snapshot = await provider.getWorldState();
        const ids = snapshot.players.map((p) => p.id);

        if (i === 0) {
          playerIds.push(...ids);
        } else {
          expect(ids).toEqual(playerIds);
        }
      }
    });

    it('maintains immutability of historical snapshots', async () => {
      let tick = 0;
      const provider = new OpenRAObservationProvider(async () =>
        createTestGameStateWithUnits(tick)
      );

      const snap1 = await provider.getWorldState();
      tick = 50;
      const snap2 = await provider.getWorldState();

      expect(snap1.time.currentTick.number).toBe(0);
      expect(snap2.time.currentTick.number).toBe(50);

      const retrieved = await provider.getWorldStateAt(0);
      expect(retrieved!.time.currentTick.number).toBe(0);
    });
  });

  describe('observation resilience', () => {
    it('handles missing unit positions gracefully', async () => {
      const player = createTestOpenRAPlayer(0, 'Test');
      const actor = createTestOpenRAActor(1, 'unit', player, undefined);
      const gameState = createTestOpenRAGameState(0, [player], [actor]);

      const provider = new OpenRAObservationProvider(async () => gameState);
      const snapshot = await provider.getWorldState();

      expect(snapshot.agents).toHaveLength(1);
      expect(snapshot.agents[0].customData.openraLocation).toBeNull();
    });

    it('handles missing health values gracefully', async () => {
      const player = createTestOpenRAPlayer(0, 'Test');
      const actor: any = createTestOpenRAActor(1, 'building', player);
      actor.health = undefined;
      actor.maxHealth = undefined;

      const gameState = createTestOpenRAGameState(0, [player], [actor]);
      const provider = new OpenRAObservationProvider(async () => gameState);
      const snapshot = await provider.getWorldState();

      expect(snapshot.agents).toHaveLength(1);
      expect(snapshot.agents[0].resources.getAmount('health')).toBe(0);
    });

    it('tolerates partially invalid actor data', async () => {
      const player = createTestOpenRAPlayer(0, 'Test');
      const validActor = createTestOpenRAActor(1, 'unit', player);
      const incompleteActor: any = {
        actorID: 2,
        owner: player,
        info: { name: 'building', traits: [] },
      };

      const gameState = createTestOpenRAGameState(0, [player], [validActor, incompleteActor]);
      const provider = new OpenRAObservationProvider(async () => gameState);
      const snapshot = await provider.getWorldState();

      expect(snapshot.agents).toHaveLength(2);
    });
  });
});
