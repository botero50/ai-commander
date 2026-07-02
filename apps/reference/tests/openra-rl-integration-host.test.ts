import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  OpenRAIntegrationHost,
  createOpenRAIntegrationHost,
} from '../src/openra-rl-integration-host.js';

describe('OpenRA Integration Host', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockGameState = {
    status: 'ok',
    state: {
      world: {
        tick: 0,
        frameNumber: 0,
        actors: [
          {
            actorID: 1,
            owner: {
              index: 0,
              clientIndex: 0,
              playerName: 'Player',
              color: 0xff00ff00,
              faction: 'gdi',
              isBot: false,
              isObserver: false,
              isAlive: true,
              teamId: -1,
              cash: 5000,
              resources: 2500,
            },
            info: {
              name: 'Infantry',
              traits: ['Buildable', 'Selectable', 'Health'],
            },
            location: { x: 512, y: 512 },
            centerLocation: { x: 1024, y: 1024 },
            health: 100,
            maxHealth: 100,
            isIdle: false,
          },
        ],
        players: [
          {
            index: 0,
            clientIndex: 0,
            playerName: 'Player',
            color: 0xff00ff00,
            faction: 'gdi',
            isBot: false,
            isObserver: false,
            isAlive: true,
            teamId: -1,
            cash: 5000,
            resources: 2500,
          },
        ],
        map: {
          name: 'TestMap',
          bounds: {
            left: 0,
            top: 0,
            width: 1024,
            height: 1024,
          },
          terrain: {
            tileset: 'DESERT',
          },
        },
      },
      orderManager: {
        orderQueue: [],
        localFrameNumber: 0,
      },
      modData: {
        tileset: new Map([['DESERT', { id: 'DESERT', name: 'Desert' }]]),
      },
    },
  };

  describe('initialization', () => {
    it('connects to service successfully', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      await expect(host.initialize()).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/status',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('throws when service is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      await expect(host.initialize()).rejects.toThrow('OpenRA-RL service not reachable');
    });

    it('throws when service returns error status', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 }));

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      await expect(host.initialize()).rejects.toThrow('OpenRA-RL service not reachable');
    });

    it('uses default timeout of 5000ms', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      await host.initialize();
      expect(host).toBeDefined();
    });

    it('uses custom timeout when provided', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        timeout: 10000,
        verbose: false,
      });

      await host.initialize();
      expect(host).toBeDefined();
    });
  });

  describe('callbacks', () => {
    let host: OpenRAIntegrationHost;

    beforeEach(async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      await host.initialize();
    });

    describe('gameStateAccessor', () => {
      it('fetches game state successfully', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(mockGameState), { status: 200 }));

        const callbacks = host.createCallbacks();
        const state = await callbacks.gameStateAccessor();

        expect(state.world.tick).toBe(0);
        expect(state.world.actors).toHaveLength(1);
        expect(state.world.actors[0].actorID).toBe(1);
      });

      it('converts OpenRA-RL format to OpenRAGameState', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify(mockGameState), { status: 200 }));

        const callbacks = host.createCallbacks();
        const state = await callbacks.gameStateAccessor();

        expect(state.world).toBeDefined();
        expect(state.world.tick).toBe(0);
        expect(state.world.frameNumber).toBe(0);
        expect(state.world.actors).toBeDefined();
        expect(state.world.players).toBeDefined();
        expect(state.world.map).toBeDefined();
        expect(state.orderManager).toBeDefined();
        expect(state.modData).toBeDefined();
      });

      it('throws on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const callbacks = host.createCallbacks();

        await expect(callbacks.gameStateAccessor()).rejects.toThrow('Network error');
      });

      it('throws on HTTP error', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));

        const callbacks = host.createCallbacks();

        await expect(callbacks.gameStateAccessor()).rejects.toThrow('Failed to fetch game state');
      });
    });

    describe('orderSubmitter', () => {
      it('submits order successfully', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ success: true, timestamp: Date.now() }), { status: 200 })
          );

        const callbacks = host.createCallbacks();
        const order = { orderName: 'Move', targetPosition: { x: 600, y: 600 } };

        const result = await callbacks.orderSubmitter(order);

        expect(result).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/step',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: order }),
          })
        );
      });

      it('returns false on submission failure', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ success: false, timestamp: Date.now() }), { status: 200 })
          );

        const callbacks = host.createCallbacks();
        const order = { orderName: 'Move', targetPosition: { x: 600, y: 600 } };

        const result = await callbacks.orderSubmitter(order);

        expect(result).toBe(false);
      });

      it('returns false on HTTP error', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));

        const callbacks = host.createCallbacks();
        const order = { orderName: 'Move', targetPosition: { x: 600, y: 600 } };

        const result = await callbacks.orderSubmitter(order);

        expect(result).toBe(false);
      });

      it('returns false on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const callbacks = host.createCallbacks();
        const order = { orderName: 'Move', targetPosition: { x: 600, y: 600 } };

        const result = await callbacks.orderSubmitter(order);

        expect(result).toBe(false);
      });
    });

    describe('stateChecker', () => {
      it('returns true when service is available', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), {
              status: 200,
            })
          );

        const callbacks = host.createCallbacks();
        const available = await callbacks.stateChecker();

        expect(available).toBe(true);
      });

      it('returns false when service is unavailable', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 503 }));

        const callbacks = host.createCallbacks();
        const available = await callbacks.stateChecker();

        expect(available).toBe(false);
      });

      it('returns false on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

        const callbacks = host.createCallbacks();
        const available = await callbacks.stateChecker();

        expect(available).toBe(false);
      });
    });
  });

  describe('retry logic', () => {
    it('retries on network error', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );
      });

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        retries: 3,
        verbose: false,
      });

      await host.initialize();
      expect(callCount).toBe(3);
    });

    it('respects max retries limit', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        retries: 2,
        verbose: false,
      });

      await expect(host.initialize()).rejects.toThrow('OpenRA-RL service not reachable');
      expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('factory function', () => {
    it('creates and initializes host', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = await createOpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: false,
      });

      expect(host).toBeInstanceOf(OpenRAIntegrationHost);
    });

    it('propagates initialization errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(
        createOpenRAIntegrationHost({
          baseUrl: 'http://localhost:8000',
          verbose: false,
        })
      ).rejects.toThrow('OpenRA-RL service not reachable');
    });
  });

  describe('configuration', () => {
    it('uses custom base URL', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://custom.host:9000',
        verbose: false,
      });

      await host.initialize();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom.host:9000/status',
        expect.anything()
      );
    });

    it('supports verbose logging', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ status: 'ready', timestamp: Date.now() }), { status: 200 })
        );

      const host = new OpenRAIntegrationHost({
        baseUrl: 'http://localhost:8000',
        verbose: true,
      });

      await host.initialize();
      host.logCallbackRegistration();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Initializing'));

      consoleSpy.mockRestore();
    });
  });
});
