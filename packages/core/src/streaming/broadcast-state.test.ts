import { describe, it, expect, beforeEach } from 'vitest';
import { BroadcastState, type ArenaMatchContext } from './broadcast-state.js';
import { Logger } from '../config/logger.js';
import type { WorldState } from '../rl-interface/world-state-mapper.js';

describe('BroadcastState', () => {
  let broadcastState: BroadcastState;
  let mockWorldState: WorldState;
  let mockContext: ArenaMatchContext;

  beforeEach(() => {
    broadcastState = new BroadcastState(new Logger('error', 'BroadcastState'));

    // Mock WorldState
    mockWorldState = {
      agents: [
        // Player 1 units
        {
          id: '1',
          controlledByPlayerId: 1,
          customData: { type: 'unit', entityId: '1' },
        } as any,
        {
          id: '2',
          controlledByPlayerId: 1,
          customData: { type: 'unit', entityId: '2' },
        } as any,
        // Player 1 building
        {
          id: '10',
          controlledByPlayerId: 1,
          customData: { type: 'building', entityId: '10' },
        } as any,
        // Player 2 units
        {
          id: '3',
          controlledByPlayerId: 2,
          customData: { type: 'unit', entityId: '3' },
        } as any,
        // Player 2 building
        {
          id: '11',
          controlledByPlayerId: 2,
          customData: { type: 'building', entityId: '11' },
        } as any,
      ],
      players: [
        {
          id: '1' as any,
          name: 'Player 1',
          customData: {
            resources: {
              wood: 500,
              stone: 400,
              food: 600,
              metal: 100,
            },
            population: 45,
          },
        } as any,
        {
          id: '2' as any,
          name: 'Player 2',
          customData: {
            resources: {
              wood: 300,
              stone: 200,
              food: 350,
              metal: 50,
            },
            population: 30,
          },
        } as any,
      ],
      time: {
        currentTick: { number: 1000 },
      } as any,
    } as any;

    mockContext = {
      matchId: 'match-123',
      matchNumber: 1,
      map: 'acropolis_bay_2p',
      mapDisplayName: 'Acropolis Bay',
      worldState: mockWorldState,
      player1: {
        name: 'Ollama AI',
        model: 'mistral:latest',
        civilization: 'athenians',
      },
      player2: {
        name: 'Petra AI',
        model: 'petra',
        civilization: 'persians',
      },
      tick: 1000,
      isRunning: true,
    };
  });

  describe('buildState', () => {
    it('builds broadcast state from arena context', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state).toBeDefined();
      expect(state.match.matchId).toBe('match-123');
      expect(state.match.map.displayName).toBe('Acropolis Bay');
      expect(state.match.currentTick).toBe(1000);
    });

    it('includes both players with real data', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players).toHaveLength(2);
      expect(state.match.players[0].name).toBe('Ollama AI');
      expect(state.match.players[1].name).toBe('Petra AI');
    });

    it('extracts player resources from WorldState', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].resources).toEqual({
        wood: 500,
        stone: 400,
        food: 600,
        metal: 100,
      });

      expect(state.match.players[1].resources).toEqual({
        wood: 300,
        stone: 200,
        food: 350,
        metal: 50,
      });
    });

    it('counts units and buildings correctly', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].units).toBe(2);
      expect(state.match.players[0].buildings).toBe(1);

      expect(state.match.players[1].units).toBe(1);
      expect(state.match.players[1].buildings).toBe(1);
    });

    it('gets population from WorldState', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].population).toBe(45);
      expect(state.match.players[1].population).toBe(30);
    });

    it('calculates military value based on units', () => {
      const state = broadcastState.buildState(mockContext);

      // Player 1 has 2 units: floor(2 * 0.3) * 10 = 0
      expect(state.match.players[0].militaryValue).toBe(0);

      // Player 2 has 1 unit: floor(1 * 0.3) * 10 = 0
      expect(state.match.players[1].militaryValue).toBe(0);
    });

    it('includes civilization and faction', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].civilization).toBe('athenians');
      expect(state.match.players[0].faction).toBe('greek');

      expect(state.match.players[1].civilization).toBe('persians');
      expect(state.match.players[1].faction).toBe('persian');
    });

    it('includes model and provider', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].model).toBe('mistral:latest');
      expect(state.match.players[0].provider).toBe('mistral:latest');

      expect(state.match.players[1].model).toBe('petra');
      expect(state.match.players[1].provider).toBe('petra');
    });

    it('includes timestamp', () => {
      const state = broadcastState.buildState(mockContext);

      expect(state.timestamp).toBeDefined();
      expect(new Date(state.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('match state determination', () => {
    it('returns intro state for early ticks', () => {
      mockContext.tick = 0;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.state).toBe('intro');
    });

    it('returns running state during match', () => {
      mockContext.tick = 1000;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.state).toBe('running');
    });

    it('returns conclusion state near end', () => {
      mockContext.tick = 1750;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.state).toBe('conclusion');
    });

    it('returns ended state when match is not running', () => {
      mockContext.isRunning = false;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.state).toBe('ended');
    });
  });

  describe('match result', () => {
    it('includes result when player 1 wins', () => {
      mockContext.winner = 'player1';
      mockContext.reason = 'Military dominance';

      const state = broadcastState.buildState(mockContext);

      expect(state.match.result).toBeDefined();
      expect(state.match.result!.winner.id).toBe(1);
      expect(state.match.result!.winner.name).toBe('Ollama AI');
      expect(state.match.result!.losers[0].id).toBe(2);
      expect(state.match.result!.reason).toBe('Military dominance');
    });

    it('includes result when player 2 wins', () => {
      mockContext.winner = 'player2';
      mockContext.reason = 'All opponents defeated';

      const state = broadcastState.buildState(mockContext);

      expect(state.match.result).toBeDefined();
      expect(state.match.result!.winner.id).toBe(2);
      expect(state.match.result!.winner.name).toBe('Petra AI');
      expect(state.match.result!.losers[0].id).toBe(1);
    });

    it('has no result when match is running', () => {
      mockContext.winner = undefined;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.result).toBeUndefined();
    });
  });

  describe('faction mapping', () => {
    it('maps all civilizations to correct factions', () => {
      const civFactionPairs: Array<[string, string]> = [
        ['athenians', 'greek'],
        ['britons', 'celtic'],
        ['carthaginians', 'punic'],
        ['gauls', 'celtic'],
        ['germans', 'germanic'],
        ['han', 'chinese'],
        ['iberians', 'iberian'],
        ['kushites', 'african'],
        ['macedonians', 'greek'],
        ['mauryas', 'indian'],
        ['persians', 'persian'],
        ['ptolemies', 'greek'],
        ['romans', 'italic'],
        ['seleucids', 'hellenistic'],
        ['spartans', 'greek'],
      ];

      for (const [civ, expectedFaction] of civFactionPairs) {
        mockContext.player1.civilization = civ;

        const state = broadcastState.buildState(mockContext);

        expect(state.match.players[0].faction).toBe(expectedFaction);
      }
    });
  });

  describe('edge cases', () => {
    it('handles missing resources', () => {
      mockWorldState.players![0].customData = {};

      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].resources).toEqual({
        wood: 0,
        stone: 0,
        food: 0,
        metal: 0,
      });
    });

    it('handles missing agents', () => {
      mockWorldState.agents = undefined;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].units).toBe(0);
      expect(state.match.players[0].buildings).toBe(0);
    });

    it('handles missing players', () => {
      mockWorldState.players = undefined;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].resources).toEqual({
        wood: 0,
        stone: 0,
        food: 0,
        metal: 0,
      });
      expect(state.match.players[0].population).toBe(0);
    });

    it('handles unknown civilization', () => {
      mockContext.player1.civilization = undefined;

      const state = broadcastState.buildState(mockContext);

      expect(state.match.players[0].civilization).toBe('Unknown');
      expect(state.match.players[0].faction).toBe('unknown');
    });
  });
});
