import { describe, it, expect } from 'vitest';
import { OpenRAObservationMapper } from '../src/observation/openra-observation-mapper.js';
import {
  createTestOpenRAGameState,
  createTestGameStateWithUnits,
  createTestGameStateMultiplePlayers,
  createTestOpenRAPlayer,
  createTestOpenRAActor,
} from './fixtures/openra-test-state.js';

describe('OpenRAObservationMapper', () => {
  describe('mapGameState', () => {
    it('maps complete game state to WorldState', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState).toBeDefined();
      expect(worldState.time).toBeDefined();
      expect(worldState.map).toBeDefined();
      expect(worldState.players).toBeDefined();
      expect(worldState.teams).toBeDefined();
      expect(worldState.agents).toBeDefined();
    });

    it('preserves tick information', () => {
      const ticks = [0, 25, 100, 1000];

      for (const tick of ticks) {
        // Create game state with at least one actor for valid WorldState
        const gameState = createTestOpenRAGameState(tick, [createTestOpenRAPlayer(0, 'Human')], [
          createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Human')),
        ]);
        const mapper = new OpenRAObservationMapper();

        const worldState = mapper.mapGameState(gameState);

        expect(worldState.time.currentTick.number).toBe(tick);
        expect(worldState.time.elapsedTicks).toBe(tick);
      }
    });

    it('maps players correctly', () => {
      const gameState = createTestGameStateMultiplePlayers();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState.players).toHaveLength(4);
      expect(worldState.players[0].name).toMatch(/GDI Alpha/);
      expect(worldState.players[1].name).toMatch(/GDI Beta/);
      expect(worldState.players[2].name).toMatch(/NOD Prime/);
      expect(worldState.players[3].name).toMatch(/NOD Cyborg/);
    });

    it('maps teams correctly', () => {
      const gameState = createTestGameStateMultiplePlayers();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState.teams).toHaveLength(2);

      const team0 = worldState.teams.find((t) => t.id === 'team-0');
      const team1 = worldState.teams.find((t) => t.id === 'team-1');

      expect(team0).toBeDefined();
      expect(team1).toBeDefined();
      expect(team0?.playerIds).toHaveLength(2);
      expect(team1?.playerIds).toHaveLength(2);
    });

    it('maps map information', () => {
      // Create game state with at least one actor
      const gameState = createTestOpenRAGameState(0, [createTestOpenRAPlayer(0, 'Human')], [
        createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Human')),
      ], 'Custom.mpr', 200, 150);
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState.map.id).toBe('Custom.mpr');
      expect(worldState.map.name).toBe('Custom.mpr');
      expect(worldState.map.width).toBe(200);
      expect(worldState.map.height).toBe(150);
      // Map contains key positions (corners + center), not full grid
      expect(worldState.map.positions.length).toBe(5);
    });

    it('maps actors as agents', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState.agents).toHaveLength(5);

      const gdiUnits = worldState.agents.filter((a) => a.customData.openraFaction === 'gdi');
      const nodUnits = worldState.agents.filter((a) => a.customData.openraFaction === 'nod');

      expect(gdiUnits.length).toBe(3);
      expect(nodUnits.length).toBe(2);
    });
  });

  describe('player mapping', () => {
    it('creates unique player IDs', () => {
      const gameState = createTestGameStateMultiplePlayers();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const playerIds = new Set(worldState.players.map((p) => p.id));
      expect(playerIds.size).toBe(4);
    });

    it('preserves player properties', () => {
      const gameState = createTestGameStateMultiplePlayers();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const gdiAlpha = worldState.players[0];
      expect(gdiAlpha.name).toBe('GDI Alpha');
      expect(gdiAlpha.teamId).toBe('team-0');
      expect(gdiAlpha.isHuman).toBe(true);
      expect(gdiAlpha.customData.openraFaction).toBe('gdi');
    });

    it('marks bots correctly', () => {
      const botPlayer = createTestOpenRAPlayer(0, 'AI', 'gdi', -1, true);
      const gameState = createTestOpenRAGameState(0, [botPlayer], [
        createTestOpenRAActor(1, 'test', botPlayer),
      ]);
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(worldState.players[0].isHuman).toBe(false);
      expect(worldState.players[0].customData.openraIsBot).toBe(true);
    });

    it('stores OpenRA-specific player data', () => {
      const testPlayer = createTestOpenRAPlayer(0, 'Human');
      const gameState = createTestOpenRAGameState(0, [testPlayer], [
        createTestOpenRAActor(1, 'test', testPlayer),
      ]);
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const player = worldState.players[0];
      expect(player.customData.openraIndex).toBe(0);
      expect(player.customData.openraCash).toBe(5000);
      expect(player.customData.openraResources).toBe(2500);
    });
  });

  describe('agent mapping', () => {
    it('creates unique agent IDs', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const agentIds = new Set(worldState.agents.map((a) => a.agentId));
      expect(agentIds.size).toBe(5);
    });

    it('preserves agent ownership', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const gdiAgents = worldState.agents.filter((a) => a.controlledByPlayerId === 'player-0');
      expect(gdiAgents).toHaveLength(3);
    });

    it('maps agent health resources', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const healthyAgent = worldState.agents[0];
      expect(healthyAgent.resources.getAmount('health')).toBe(100);
    });

    it('maps agent positions', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const agent = worldState.agents[0];
      expect(agent.customData.openraLocation).toEqual({ x: 0, y: 0 });
    });

    it('stores OpenRA-specific agent data', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const agent = worldState.agents[0];
      expect(agent.customData.openraActorId).toBe(1);
      expect(agent.customData.openraActorType).toBe('mcv');
      expect(agent.customData.openraIsIdle).toBe(false);
    });
  });

  describe('time mapping', () => {
    it('formats game time display correctly', () => {
      const testCases = [
        { tick: 0, expectedDisplay: '00:00:00' },
        { tick: 25, expectedDisplay: '00:00:01' }, // 1 second
        { tick: 150, expectedDisplay: '00:00:06' }, // 6 seconds
        { tick: 1500, expectedDisplay: '00:01:00' }, // 1 minute
        { tick: 90000, expectedDisplay: '01:00:00' }, // 1 hour
      ];

      for (const { tick, expectedDisplay } of testCases) {
        // Create game state with at least one actor
        const player = createTestOpenRAPlayer(0, 'Human');
        const gameState = createTestOpenRAGameState(tick, [player], [
          createTestOpenRAActor(1, 'test', player),
        ]);
        const mapper = new OpenRAObservationMapper();

        const worldState = mapper.mapGameState(gameState);

        expect(worldState.time.displayTime).toBe(expectedDisplay);
      }
    });
  });

  describe('map mapping', () => {
    it('generates key positions (corners and center) for map', () => {
      const widths = [64, 128, 256];
      const heights = [64, 128, 256];

      for (const width of widths) {
        for (const height of heights) {
          // Need at least one actor for WorldState to be valid
          const gameState = createTestOpenRAGameState(0, [createTestOpenRAPlayer(0, 'Test')], [
            createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Test')),
          ], 'test', width, height);
          const mapper = new OpenRAObservationMapper();

          const worldState = mapper.mapGameState(gameState);

          // Key positions: 4 corners + 1 center = 5 positions minimum
          expect(worldState.map.positions.length).toBe(5);
        }
      }
    });

    it('positions have unique IDs', () => {
      // Need at least one actor for WorldState to be valid
      const gameState = createTestOpenRAGameState(0, [createTestOpenRAPlayer(0, 'Test')], [
        createTestOpenRAActor(1, 'test', createTestOpenRAPlayer(0, 'Test')),
      ], 'test', 32, 32);
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      const posIds = new Set(worldState.map.positions.map((p) => p.id));
      expect(posIds.size).toBe(worldState.map.positions.length);
    });
  });

  describe('determinism', () => {
    it('produces consistent output for same input', () => {
      const gameState = createTestGameStateWithUnits(100);
      const mapper1 = new OpenRAObservationMapper();
      const mapper2 = new OpenRAObservationMapper();

      const worldState1 = mapper1.mapGameState(gameState);
      const worldState2 = mapper2.mapGameState(gameState);

      expect(worldState1.time.currentTick.number).toBe(worldState2.time.currentTick.number);
      expect(worldState1.players.length).toBe(worldState2.players.length);
      expect(worldState1.agents.length).toBe(worldState2.agents.length);

      for (let i = 0; i < worldState1.agents.length; i++) {
        expect(worldState1.agents[i].agentId).toBe(worldState2.agents[i].agentId);
        expect(worldState1.agents[i].resources.getAmount('health')).toBe(
          worldState2.agents[i].resources.getAmount('health')
        );
      }
    });

    it('different ticks produce different snapshots', () => {
      const mapper = new OpenRAObservationMapper();

      const gameState0 = createTestGameStateWithUnits(0);
      const gameState100 = createTestGameStateWithUnits(100);

      const worldState0 = mapper.mapGameState(gameState0);
      const worldState100 = mapper.mapGameState(gameState100);

      expect(worldState0.time.currentTick.number).not.toBe(worldState100.time.currentTick.number);
    });
  });

  describe('immutability', () => {
    it('frozen players array', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(() => {
        (worldState.players as any)[0] = null;
      }).toThrow();

      expect(() => {
        (worldState.players as any).push(null);
      }).toThrow();
    });

    it('frozen teams array', () => {
      const gameState = createTestGameStateMultiplePlayers();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(() => {
        (worldState.teams as any)[0] = null;
      }).toThrow();
    });

    it('frozen agents array', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(() => {
        (worldState.agents as any)[0] = null;
      }).toThrow();
    });

    it('frozen customData', () => {
      const gameState = createTestGameStateWithUnits();
      const mapper = new OpenRAObservationMapper();

      const worldState = mapper.mapGameState(gameState);

      expect(() => {
        (worldState.customData as any).newProperty = 'value';
      }).toThrow();
    });
  });
});
