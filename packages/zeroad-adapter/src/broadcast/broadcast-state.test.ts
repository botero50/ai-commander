import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BroadcastState } from './broadcast-state.js';
import { Logger } from '../config/logger.js';

describe('BroadcastState', () => {
  let broadcastState: BroadcastState;
  let mockArena: any;
  let mockMatchPersistence: any;
  let mockBrain: any;
  let mockCommentary: any;
  let mockEventBus: any;

  beforeEach(() => {
    broadcastState = new BroadcastState(
      new Logger('error', 'BroadcastState')
    );

    mockArena = {
      getMatch: vi.fn().mockResolvedValue({
        matchId: 'match-1',
        map: {
          name: 'acropolis_bay_2p',
          displayName: 'Acropolis Bay',
          players: 2,
        },
        players: [
          { id: 1, name: 'Player 1', civilization: 'athenians' },
          { id: 2, name: 'Player 2', civilization: 'persians' },
        ],
        startTick: 0,
        currentTick: 1000,
        estimatedDuration: 1200,
      }),
    };

    mockMatchPersistence = {
      getMatchResult: vi.fn().mockResolvedValue(null),
      getMatchHistory: vi.fn().mockResolvedValue({
        matchNumber: 1,
        previousResults: [],
      }),
    };

    mockBrain = {
      getPlayerMetadata: vi.fn().mockResolvedValue(null),
    };

    mockCommentary = {
      getLatestTrashTalk: vi.fn().mockResolvedValue(null),
    };

    mockEventBus = {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    };
  });

  describe('initialization', () => {
    it('initializes with all data sources', async () => {
      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'observation:received',
        expect.any(Function)
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'decision:completed',
        expect.any(Function)
      );
    });

    it('handles partial initialization gracefully', async () => {
      await broadcastState.initialize({
        arena: null,
        matchPersistence: null,
        brain: null,
        commentary: null,
        eventBus: mockEventBus,
      });

      expect(mockEventBus.on).toHaveBeenCalled();
    });
  });

  describe('buildState', () => {
    beforeEach(async () => {
      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });
    });

    it('builds complete broadcast state from all sources', async () => {
      const state = await broadcastState.buildState('match-1');

      expect(state).toBeDefined();
      expect(state.match.matchId).toBe('match-1');
      expect(state.match.map.displayName).toBe('Acropolis Bay');
      expect(state.match.players).toHaveLength(2);
      expect(state.timestamp).toBeDefined();
    });

    it('includes player information with civilizations', async () => {
      const state = await broadcastState.buildState('match-1');

      expect(state.match.players[0]).toMatchObject({
        id: 1,
        name: 'Player 1',
        civilization: 'athenians',
        faction: 'greek',
      });

      expect(state.match.players[1]).toMatchObject({
        id: 2,
        name: 'Player 2',
        civilization: 'persians',
        faction: 'persian',
      });
    });

    it('initializes player stats with defaults', async () => {
      const state = await broadcastState.buildState('match-1');

      expect(state.match.players[0].resources).toEqual({
        wood: 300,
        stone: 200,
        food: 250,
        metal: 0,
      });
      expect(state.match.players[0].units).toBe(0);
      expect(state.match.players[0].buildings).toBe(0);
    });

    it('includes match history when available', async () => {
      mockMatchPersistence.getMatchHistory.mockResolvedValueOnce({
        matchNumber: 5,
        previousResults: [
          {
            winner: 'Player 1',
            loser: 'Player 2',
            duration: 1200,
            date: '2025-01-01',
          },
        ],
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.history?.matchNumber).toBe(5);
      expect(state.match.history?.previousResults).toHaveLength(1);
    });

    it('includes match result when available', async () => {
      mockMatchPersistence.getMatchResult.mockResolvedValueOnce({
        winner: {
          id: 1,
          name: 'Player 1',
          civilization: 'athenians',
        },
        losers: [
          {
            id: 2,
            name: 'Player 2',
            civilization: 'persians',
          },
        ],
        duration: 1200,
        reason: 'Military dominance',
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.result).toBeDefined();
      expect(state.match.result?.winner.name).toBe('Player 1');
      expect(state.match.result?.reason).toBe('Military dominance');
    });

    it('handles missing arena gracefully', async () => {
      await broadcastState.initialize({
        arena: null,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match).toBeDefined();
      expect(state.match.map.displayName).toBe('Unknown Map');
    });
  });

  describe('real-time updates', () => {
    let observationHandler: any;

    beforeEach(async () => {
      mockEventBus.on.mockImplementation((event: string, handler: any) => {
        if (event === 'observation:received') {
          observationHandler = handler;
        }
      });

      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      await broadcastState.buildState('match-1');
    });

    it('updates player stats on observation event', async () => {
      observationHandler({
        playerId: 1,
        playerName: 'Player 1',
        tick: 1000,
        observation: {
          resources: {
            wood: 500,
            stone: 400,
            food: 600,
            metal: 100,
          },
          units: 25,
          buildings: 8,
          population: 45,
          militaryUnits: 15,
        },
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.players[0].resources.wood).toBe(500);
      expect(state.match.players[0].units).toBe(25);
      expect(state.match.players[0].militaryValue).toBe(150); // 15 * 10
    });

    it('calculates military value correctly', async () => {
      observationHandler({
        playerId: 1,
        playerName: 'Player 1',
        tick: 1000,
        observation: {
          resources: {
            wood: 500,
            stone: 400,
            food: 600,
            metal: 100,
          },
          units: 30,
          buildings: 8,
          population: 45,
          militaryUnits: 20,
        },
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.players[0].militaryValue).toBe(200); // 20 * 10
    });

    it('records events in recent event buffer', async () => {
      observationHandler({
        playerId: 1,
        playerName: 'Player 1',
        tick: 1000,
        observation: {
          resources: {
            wood: 500,
            stone: 400,
            food: 600,
            metal: 100,
          },
          units: 25,
          buildings: 8,
          population: 45,
        },
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.recentEvents).toHaveLength(1);
      expect(state.recentEvents?.[0].type).toBe('observation');
      expect(state.recentEvents?.[0].playerId).toBe(1);
    });
  });

  describe('match state determination', () => {
    it('returns intro state for early ticks', async () => {
      mockArena.getMatch.mockResolvedValueOnce({
        matchId: 'match-1',
        map: {
          name: 'acropolis_bay_2p',
          displayName: 'Acropolis Bay',
          players: 2,
        },
        players: [
          { id: 1, name: 'Player 1', civilization: 'athenians' },
          { id: 2, name: 'Player 2', civilization: 'persians' },
        ],
        startTick: 0,
        currentTick: 0,
      });

      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.state).toBe('intro');
    });

    it('returns running state during match', async () => {
      mockArena.getMatch.mockResolvedValueOnce({
        matchId: 'match-1',
        map: {
          name: 'acropolis_bay_2p',
          displayName: 'Acropolis Bay',
          players: 2,
        },
        players: [
          { id: 1, name: 'Player 1', civilization: 'athenians' },
          { id: 2, name: 'Player 2', civilization: 'persians' },
        ],
        startTick: 0,
        currentTick: 5000,
      });

      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.state).toBe('running');
    });

    it('returns conclusion state near end', async () => {
      mockArena.getMatch.mockResolvedValueOnce({
        matchId: 'match-1',
        map: {
          name: 'acropolis_bay_2p',
          displayName: 'Acropolis Bay',
          players: 2,
        },
        players: [
          { id: 1, name: 'Player 1', civilization: 'athenians' },
          { id: 2, name: 'Player 2', civilization: 'persians' },
        ],
        startTick: 0,
        currentTick: 9800, // endTick = 10000, so 10000 - 300 = 9700
        endTick: 10000,
      });

      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.state).toBe('conclusion');
    });

    it('returns ended state after match', async () => {
      mockArena.getMatch.mockResolvedValueOnce({
        matchId: 'match-1',
        map: {
          name: 'acropolis_bay_2p',
          displayName: 'Acropolis Bay',
          players: 2,
        },
        players: [
          { id: 1, name: 'Player 1', civilization: 'athenians' },
          { id: 2, name: 'Player 2', civilization: 'persians' },
        ],
        startTick: 0,
        currentTick: 10000,
        endTick: 10000,
      });

      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      const state = await broadcastState.buildState('match-1');

      expect(state.match.state).toBe('ended');
    });
  });

  describe('faction mapping', () => {
    it('maps all civilizations to correct factions', async () => {
      const civFactionPairs = [
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
        mockArena.getMatch.mockResolvedValueOnce({
          matchId: `match-${civ}`,
          map: {
            name: 'test_map',
            displayName: 'Test Map',
            players: 2,
          },
          players: [
            { id: 1, name: 'Player 1', civilization: civ },
            { id: 2, name: 'Player 2', civilization: 'persians' },
          ],
          startTick: 0,
          currentTick: 1000,
        });

        const freshState = new BroadcastState(new Logger('error', 'BroadcastState'));
        await freshState.initialize({
          arena: mockArena,
          matchPersistence: mockMatchPersistence,
          brain: mockBrain,
          commentary: mockCommentary,
          eventBus: mockEventBus,
        });

        const state = await freshState.buildState(`match-${civ}`);

        expect(state.match.players[0].faction).toBe(expectedFaction);
      }
    });
  });

  describe('state retrieval and subscriptions', () => {
    beforeEach(async () => {
      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });

      await broadcastState.buildState('match-1');
    });

    it('returns current state via getState()', async () => {
      const state = broadcastState.getState();

      expect(state).toBeDefined();
      expect(state?.match.matchId).toBe('match-1');
    });

    it('returns null before building state', () => {
      const freshState = new BroadcastState();

      const state = freshState.getState();

      expect(state).toBeNull();
    });

    it('notifies on state updates', async () => {
      const callback = vi.fn();
      broadcastState.onStateUpdated(callback);

      await broadcastState.buildState('match-1');

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        match: expect.objectContaining({
          matchId: 'match-1',
        }),
      }));
    });
  });

  describe('disconnection', () => {
    beforeEach(async () => {
      await broadcastState.initialize({
        arena: mockArena,
        matchPersistence: mockMatchPersistence,
        brain: mockBrain,
        commentary: mockCommentary,
        eventBus: mockEventBus,
      });
    });

    it('disconnects from event bus on disconnect()', () => {
      broadcastState.disconnect();

      expect(mockEventBus.removeAllListeners).toHaveBeenCalledWith(
        'observation:received'
      );
      expect(mockEventBus.removeAllListeners).toHaveBeenCalledWith(
        'decision:completed'
      );
      expect(mockEventBus.removeAllListeners).toHaveBeenCalledWith(
        'match:started'
      );
      expect(mockEventBus.removeAllListeners).toHaveBeenCalledWith(
        'match:ended'
      );
    });
  });
});
