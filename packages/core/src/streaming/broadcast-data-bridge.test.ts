/**
 * Story 57.1 — Broadcast Data Bridge Tests
 *
 * Validates that real SessionEventBus events are correctly
 * transformed into broadcast-ready format.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BroadcastDataBridge, createBroadcastDataBridge } from './broadcast-data-bridge.js';
import { Logger } from '../config/logger.js';

describe('Broadcast Data Bridge (Story 57.1)', () => {
  let bridge: BroadcastDataBridge;
  const logger = new Logger('error', 'BridgeTest');

  beforeEach(() => {
    bridge = new BroadcastDataBridge(logger);
  });

  describe('bridge initialization', () => {
    it('should initialize without event bus', () => {
      expect(bridge).toBeDefined();
    });

    it('should start with no observations', () => {
      const obs = bridge.getLastObservation();
      expect(obs).toBeNull();
    });

    it('should export JSON representation', () => {
      const json = bridge.toJSON();
      expect(json).toHaveProperty('matchId');
      expect(json).toHaveProperty('connected');
    });

    it('should create via factory function', () => {
      const factoryBridge = createBroadcastDataBridge(logger);
      expect(factoryBridge).toBeDefined();
    });
  });

  describe('event subscription', () => {
    it('should allow data subscription', () => {
      return new Promise<void>((resolve) => {
        let received = false;

        bridge.onBroadcastData((data) => {
          received = true;
        });

        // After subscribing, we can emit
        expect(bridge.listenerCount('data')).toBeGreaterThan(0);
        resolve();
      });
    });

    it('should support multiple subscribers', () => {
      const sub1 = (data: any) => {};
      const sub2 = (data: any) => {};

      bridge.onBroadcastData(sub1);
      bridge.onBroadcastData(sub2);

      expect(bridge.listenerCount('data')).toBe(2);
    });
  });

  describe('observation transformation', () => {
    it('should transform observation events', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'observation') {
            expect(data).toHaveProperty('matchId');
            expect(data).toHaveProperty('timestamp');
            expect(data.data).toHaveProperty('players');
            resolve();
          }
        });

        // Simulate event (would come from real SessionEventBus)
        bridge.emit('observation:received', {
          tick: 100,
          playerId: 1,
          playerName: 'Player1',
          observation: {
            resources: { wood: 500, stone: 300 },
            units: 25,
            buildings: 8,
          },
        });
      });
    });

    it('should include player stats in observation', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'observation') {
            const obs = data.data as any;
            expect(obs.players).toBeDefined();
            expect(obs.players[0]).toHaveProperty('resources');
            expect(obs.players[0]).toHaveProperty('units');
            expect(obs.players[0]).toHaveProperty('buildings');
            resolve();
          }
        });

        bridge.emit('observation:received', {
          tick: 50,
          playerId: 1,
          playerName: 'Player1',
          observation: {
            resources: { wood: 400, stone: 250 },
            units: 20,
            buildings: 6,
          },
        });
      });
    });

    it('should cache last observation', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'observation') {
            const cached = bridge.getLastObservation();
            expect(cached).toBeDefined();
            expect(cached?.tick).toBe(75);
            resolve();
          }
        });

        bridge.emit('observation:received', {
          tick: 75,
          playerId: 1,
          playerName: 'Player1',
          observation: {
            resources: { wood: 600, stone: 400 },
            units: 30,
            buildings: 10,
          },
        });
      });
    });
  });

  describe('decision transformation', () => {
    it('should transform decision events', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'decision') {
            expect(data).toHaveProperty('matchId');
            expect(data.data).toHaveProperty('playerId');
            expect(data.data).toHaveProperty('decision');
            resolve();
          }
        });

        bridge.emit('decision:completed', {
          tick: 100,
          playerId: 1,
          playerName: 'Player1',
          decision: {
            objective: 'Build economy',
            confidence: 0.85,
          },
          latency: 1200,
        });
      });
    });

    it('should include decision confidence', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'decision') {
            const dec = data.data as any;
            expect(dec.decision.confidence).toBeGreaterThanOrEqual(0);
            expect(dec.decision.confidence).toBeLessThanOrEqual(1);
            resolve();
          }
        });

        bridge.emit('decision:completed', {
          tick: 100,
          playerId: 1,
          playerName: 'Player1',
          decision: {
            confidence: 0.75,
          },
        });
      });
    });
  });

  describe('command transformation', () => {
    it('should transform command events', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'command') {
            expect(data.data).toHaveProperty('action');
            expect(data.data).toHaveProperty('playerId');
            resolve();
          }
        });

        bridge.emit('command:executed', {
          tick: 100,
          playerId: 1,
          playerName: 'Player1',
          command: {
            action: 'build',
            target: 'barracks',
          },
        });
      });
    });
  });

  describe('match lifecycle', () => {
    it('should emit match-start event', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'match-start') {
            expect(data.data).toHaveProperty('players');
            expect(data.data).toHaveProperty('map');
            resolve();
          }
        });

        bridge.emit('match:started', {
          matchId: 'test-match-1',
          map: 'setons_2p',
          players: [
            { id: 1, name: 'P1', civilization: 'romans' },
            { id: 2, name: 'P2', civilization: 'persians' },
          ],
        });
      });
    });

    it('should emit victory event on match end', () => {
      return new Promise<void>((resolve) => {
        let victoryReceived = false;

        bridge.onBroadcastData((data) => {
          if (data.type === 'victory') {
            victoryReceived = true;
            expect(data.data).toHaveProperty('winner');
            expect(data.data).toHaveProperty('duration');
            if (victoryReceived) {
              resolve();
            }
          }
        });

        bridge.emit('match:ended', {
          winner: {
            id: 1,
            name: 'Player 1',
          },
          runners: [
            {
              id: 2,
              name: 'Player 2',
            },
          ],
          duration: {
            seconds: 1800,
          },
          statistics: {
            militaryValue: 150,
            totalCommands: 250,
          },
        });
      });
    });
  });

  describe('broadcast data format', () => {
    it('should include timestamp in broadcast data', () => {
      return new Promise<void>((resolve) => {
        bridge.onBroadcastData((data) => {
          if (data.type === 'observation') {
            expect(data.timestamp).toBeDefined();
            // Should be valid ISO format
            expect(() => new Date(data.timestamp)).not.toThrow();
            resolve();
          }
        });

        bridge.emit('observation:received', {
          tick: 50,
          playerId: 1,
          playerName: 'Player1',
          observation: {
            resources: { wood: 400 },
          },
        });
      });
    });

    it('should include matchId in broadcast data', () => {
      return new Promise<void>((resolve) => {
        bridge.connectEventBus(
          {
            on: () => {},
            emit: () => {},
          } as any,
          'test-match-123',
          2
        );

        bridge.onBroadcastData((data) => {
          if (data.type === 'observation') {
            expect(data.matchId).toBe('test-match-123');
            resolve();
          }
        });

        bridge.emit('observation:received', {
          tick: 50,
          playerId: 1,
          playerName: 'Player1',
          observation: {},
        });
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect from event bus', () => {
      bridge.connectEventBus(
        {
          on: () => {},
          removeAllListeners: () => {},
        } as any,
        'test-match',
        2
      );

      bridge.disconnect();
      expect(bridge.getLastObservation()).toBeNull();
    });
  });

  describe('realistic streaming scenario', () => {
    it('should handle continuous event stream', () => {
      return new Promise<void>((resolve) => {
        let eventCount = 0;

        bridge.onBroadcastData((data) => {
          eventCount++;
        });

        // Simulate 5 events in quick succession
        bridge.emit('observation:received', {
          tick: 100,
          playerId: 1,
          playerName: 'P1',
          observation: { resources: { wood: 500 } },
        });

        bridge.emit('decision:completed', {
          tick: 100,
          playerId: 1,
          playerName: 'P1',
          decision: { confidence: 0.8 },
        });

        bridge.emit('command:executed', {
          tick: 100,
          playerId: 1,
          playerName: 'P1',
          command: { action: 'build' },
        });

        bridge.emit('observation:received', {
          tick: 101,
          playerId: 2,
          playerName: 'P2',
          observation: { resources: { wood: 450 } },
        });

        bridge.emit('decision:completed', {
          tick: 101,
          playerId: 2,
          playerName: 'P2',
          decision: { confidence: 0.75 },
        });

        setTimeout(() => {
          expect(eventCount).toBe(5);
          resolve();
        }, 100);
      });
    });

    it('should provide broadcast-ready data for overlay consumption', () => {
      return new Promise<void>((resolve) => {
        const receivedData: any[] = [];

        bridge.onBroadcastData((data) => {
          receivedData.push(data);
        });

        // Simulate match
        bridge.emit('match:started', {
          map: 'setons_2p',
          players: [
            { name: 'AI1', civilization: 'romans' },
            { name: 'AI2', civilization: 'persians' },
          ],
        });

        bridge.emit('observation:received', {
          tick: 10,
          playerId: 1,
          playerName: 'AI1',
          observation: {
            resources: { wood: 500, stone: 300 },
            units: 20,
            buildings: 5,
          },
        });

        bridge.emit('decision:completed', {
          tick: 10,
          playerId: 1,
          playerName: 'AI1',
          decision: { objective: 'Expand', confidence: 0.85 },
        });

        setTimeout(() => {
          // Verify data is in correct format for overlay
          expect(receivedData.length).toBeGreaterThanOrEqual(2);

          const obsData = receivedData.find((d) => d.type === 'observation');
          expect(obsData?.data?.players?.[0]?.resources).toBeDefined();

          const decData = receivedData.find((d) => d.type === 'decision');
          expect(decData?.data?.decision?.confidence).toBeDefined();

          resolve();
        }, 100);
      });
    });
  });
});
