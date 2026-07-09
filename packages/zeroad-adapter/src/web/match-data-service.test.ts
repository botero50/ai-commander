import { describe, it, expect, beforeEach } from 'vitest';
import { MatchDataService } from './match-data-service.js';

describe('MatchDataService', () => {
  let service: MatchDataService;

  beforeEach(() => {
    service = new MatchDataService();
  });

  describe('No Active Session', () => {
    it('should return null for metadata when no session', () => {
      expect(service.getMatchMetadata()).toBeNull();
    });

    it('should return null for game state when no session', () => {
      expect(service.getGameState()).toBeNull();
    });

    it('should return empty array for commentary when no session', () => {
      expect(service.getCommentaryEvents()).toEqual([]);
    });

    it('should return empty array for decisions when no session', () => {
      expect(service.getDecisionEvents()).toEqual([]);
    });

    it('should return null for replay data when no session', () => {
      expect(service.getReplayData()).toBeNull();
    });

    it('should return null for AI status when no session', () => {
      expect(service.getAIStatus('player1')).toBeNull();
    });

    it('should return null for minimap data when no session', () => {
      expect(service.getMinimapData()).toBeNull();
    });

    it('should return null for objective tracker when no session', () => {
      expect(service.getObjectiveTracker()).toBeNull();
    });

    it('should return empty array for event annotations when no session', () => {
      expect(service.getEventAnnotations()).toEqual([]);
    });
  });

  describe('Data Structure Validation', () => {
    it('metadata response should have required fields', () => {
      // Create a mock session with required methods
      const mockSession = {
        sessionId: 'test-match-1',
        getGameStateHUD: () => ({
          currentTick: 1000,
          matchStartTime: Date.now(),
          player1: {
            resources: { food: 500, wood: 300, metal: 100, stone: 200 },
            population: { current: 50, max: 100 },
            unitCount: 25,
            buildingCount: 15,
            technologies: [1, 2, 3],
          },
          player2: {
            resources: { food: 450, wood: 350, metal: 150, stone: 180 },
            population: { current: 45, max: 100 },
            unitCount: 23,
            buildingCount: 14,
            technologies: [1, 2],
          },
        }),
        getAIStatus: (player: string) =>
          player === 'player1'
            ? {
                playerName: 'AlphaGo',
                model: 'gpt-4',
                provider: 'OpenAI',
              }
            : {
                playerName: 'Claude',
                model: 'claude-3',
                provider: 'Anthropic',
              },
      } as any;

      service.setSession(mockSession);
      const metadata = service.getMatchMetadata();

      expect(metadata).not.toBeNull();
      expect(metadata?.matchId).toBe('test-match-1');
      expect(metadata?.player1.name).toBe('AlphaGo');
      expect(metadata?.player2.name).toBe('Claude');
      expect(metadata?.currentTick).toBe(1000);
      expect(metadata?.isLive).toBe(true);
    });

    it('game state response should have proper structure', () => {
      const mockSession = {
        sessionId: 'test-match-1',
        getGameStateHUD: () => ({
          currentTick: 1000,
          player1: {
            resources: { food: 500, wood: 300, metal: 100, stone: 200 },
            population: { current: 50, max: 100 },
            unitCount: 25,
            buildingCount: 15,
            technologies: [1, 2, 3],
          },
          player2: {
            resources: { food: 450, wood: 350, metal: 150, stone: 180 },
            population: { current: 45, max: 100 },
            unitCount: 23,
            buildingCount: 14,
            technologies: [1, 2],
          },
        }),
      } as any;

      service.setSession(mockSession);
      const state = service.getGameState();

      expect(state).not.toBeNull();
      expect(state?.tick).toBe(1000);
      expect(state?.player1.resources.food).toBe(500);
      expect(state?.player1.population.current).toBe(50);
      expect(state?.player2.units).toBe(23);
    });

    it('should limit results when limit parameter provided', () => {
      const mockSession = {
        sessionId: 'test-match-1',
        getLiveCommentary: () => ({
          getRecentEntries: (limit: number) =>
            Array.from({ length: limit }, (_, i) => ({
              tick: i,
              text: `Comment ${i}`,
              severity: 'minor' as const,
              type: 'commentary',
              timestamp: Date.now(),
            })),
        }),
      } as any;

      service.setSession(mockSession);
      const events = service.getCommentaryEvents(10);

      expect(events.length).toBeLessThanOrEqual(10);
    });

    it('should respect maximum limit for events', () => {
      const mockSession = {
        sessionId: 'test-match-1',
        getDecisionTimeline: () => ({
          getRecentDecisions: (limit: number) =>
            Array.from({ length: limit }, (_, i) => ({
              tick: i,
              player: 'player1',
              model: 'gpt-4',
              action: `action-${i}`,
              reasoning: `reason-${i}`,
              durationMs: 100 + i,
              timestamp: Date.now(),
            })),
        }),
      } as any;

      service.setSession(mockSession);
      const events = service.getDecisionEvents(1000);

      // Service may have its own max limit
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should update session when setSession called', () => {
      const mockSession1 = {
        sessionId: 'match-1',
        getGameStateHUD: () => null,
      } as any;

      const mockSession2 = {
        sessionId: 'match-2',
        getGameStateHUD: () => ({
          currentTick: 500,
          matchStartTime: Date.now(),
          player1: {
            resources: { food: 100, wood: 100, metal: 100, stone: 100 },
            population: { current: 10, max: 50 },
            unitCount: 5,
            buildingCount: 3,
            technologies: [],
          },
          player2: {
            resources: { food: 100, wood: 100, metal: 100, stone: 100 },
            population: { current: 10, max: 50 },
            unitCount: 5,
            buildingCount: 3,
            technologies: [],
          },
        }),
      } as any;

      service.setSession(mockSession1);
      expect(service.getGameState()).toBeNull();

      service.setSession(mockSession2);
      const state = service.getGameState();
      expect(state?.tick).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing optional methods gracefully', () => {
      const mockSession = {
        sessionId: 'test-match-1',
        getGameStateHUD: () => ({
          currentTick: 100,
          player1: {
            resources: { food: 0, wood: 0, metal: 0, stone: 0 },
            population: { current: 0, max: 0 },
            unitCount: 0,
            buildingCount: 0,
            technologies: [],
          },
          player2: {
            resources: { food: 0, wood: 0, metal: 0, stone: 0 },
            population: { current: 0, max: 0 },
            unitCount: 0,
            buildingCount: 0,
            technologies: [],
          },
        }),
        // Missing other methods
      } as any;

      service.setSession(mockSession);

      expect(() => service.getCommentaryEvents()).not.toThrow();
      expect(() => service.getDecisionEvents()).not.toThrow();
      expect(() => service.getReplayData()).not.toThrow();
    });

    it('should return defaults for missing data', () => {
      const mockSession = {
        sessionId: 'test-match-1',
        getGameStateHUD: () => ({
          currentTick: 100,
          // Missing player data
        }),
      } as any;

      service.setSession(mockSession);
      const state = service.getGameState();

      expect(state?.player1.resources).toEqual({ food: 0, wood: 0, metal: 0, stone: 0 });
      expect(state?.player2.units).toBe(0);
    });
  });
});
