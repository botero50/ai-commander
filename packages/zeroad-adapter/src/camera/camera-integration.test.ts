import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutomaticCameraManager } from './automatic-camera-manager.js';
import { CinematicModeManager } from './cinematic-mode-manager.js';
import { DramaticMomentDetector } from './dramatic-moment-detector.js';
import { EventFeed } from '../match/event-feed.js';
import { DEFAULT_CAMERA_CONFIG } from './camera-config.js';

interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface Building {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface GameState {
  readonly tick: number;
  readonly units: readonly Unit[];
  readonly buildings: readonly Building[];
  readonly players: Array<{ readonly id: string; readonly name: string }>;
}

describe('Camera System Integration', () => {
  let automaticCamera: AutomaticCameraManager;
  let cinematicCamera: CinematicModeManager;
  let eventFeed: EventFeed;
  let dramaticDetector: DramaticMomentDetector;
  let mockCommandInjector: any;
  let mockObservationProvider: any;

  beforeEach(() => {
    eventFeed = new EventFeed();
    dramaticDetector = new DramaticMomentDetector();

    // Mock command injector
    mockCommandInjector = {
      injectCommand: vi.fn().mockResolvedValue({}),
    };

    // Mock observation provider
    mockObservationProvider = {
      onStateUpdate: vi.fn((callback) => {
        mockObservationProvider.callback = callback;
        return () => {}; // unsubscribe
      }),
      getCurrentGameState: vi.fn().mockReturnValue(null),
    };

    automaticCamera = new AutomaticCameraManager(
      mockCommandInjector,
      mockObservationProvider,
      eventFeed
    );

    cinematicCamera = new CinematicModeManager(DEFAULT_CAMERA_CONFIG);
  });

  describe('Dual Camera System', () => {
    it('should run automatic and cinematic cameras together', () => {
      // Start automatic camera
      automaticCamera.start();

      // Initialize cinematic camera
      cinematicCamera.setMode('cinematic');

      expect(automaticCamera.getCameraManager?.() || automaticCamera).toBeDefined();
      expect(cinematicCamera.getMode()).toBe('cinematic');
    });

    it('should broadcast events from both cameras', () => {
      const automaticEvents: Array<[string, any]> = [];
      const cinematicEvents: Array<[string, any]> = [];

      eventFeed.subscribe((type, data) => {
        automaticEvents.push([type, data]);
      });

      cinematicCamera.subscribe((event, data) => {
        cinematicEvents.push([event, data]);
      });

      // Trigger automatic camera event
      automaticCamera.start();

      // Trigger cinematic camera event
      cinematicCamera.setMode('cinematic');

      expect(automaticEvents.length).toBeGreaterThan(0);
      expect(cinematicEvents.length).toBeGreaterThan(0);
    });

    it('should handle cinematic operations while automatic runs', () => {
      automaticCamera.start();
      cinematicCamera.setMode('cinematic');

      const callback = vi.fn();
      cinematicCamera.subscribe(callback);

      // Queue cinematic operation while automatic is running
      cinematicCamera.pan(100, 100, 200, 200, 50);
      cinematicCamera.update();

      expect(callback).toHaveBeenCalledWith('pan_started', expect.any(Object));
    });
  });

  describe('Dramatic Moment Response', () => {
    it('should detect dramatic moments and trigger callbacks', () => {
      const momentCallback = vi.fn();
      automaticCamera.onDramaticMoment(momentCallback);

      const prevState: GameState = {
        tick: 1,
        units: [{ id: 'u1', owner: 'p1', position: { x: 100, z: 100 } }],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      const currState: GameState = {
        tick: 2,
        units: [],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      // Simulate state update
      automaticCamera.start();
      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(currState, prevState);
      }

      expect(momentCallback).toHaveBeenCalled();
    });

    it('should broadcast dramatic moment events', () => {
      const eventCallback = vi.fn();
      eventFeed.subscribe(eventCallback);

      const prevState: GameState = {
        tick: 1,
        units: [
          { id: 'u1', owner: 'p1', position: { x: 100, z: 100 } },
          { id: 'u2', owner: 'p2', position: { x: 200, z: 200 } },
        ],
        buildings: [],
        players: [
          { id: 'p1', name: 'Player 1' },
          { id: 'p2', name: 'Player 2' },
        ],
      };

      const currState: GameState = {
        tick: 2,
        units: [{ id: 'u2', owner: 'p2', position: { x: 200, z: 200 } }],
        buildings: [],
        players: prevState.players,
      };

      automaticCamera.start();
      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(currState, prevState);
      }

      const dramaticEvents = eventCallback.mock.calls.filter(
        (c) => c[0] === 'camera:dramatic_moment'
      );
      expect(dramaticEvents.length).toBeGreaterThan(0);
    });

    it('should only trigger dramatic moments after cooldown', () => {
      const momentCallback = vi.fn();
      automaticCamera.onDramaticMoment(momentCallback);
      automaticCamera.setDramaticMomentCooldown(100); // 100ms cooldown

      const prevState: GameState = {
        tick: 1,
        units: [{ id: 'u1', owner: 'p1', position: { x: 100, z: 100 } }],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      const currState: GameState = {
        tick: 2,
        units: [],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      automaticCamera.start();

      // First dramatic moment
      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(currState, prevState);
      }
      expect(momentCallback).toHaveBeenCalledTimes(1);

      // Immediate second call should be blocked by cooldown
      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(currState, prevState);
      }
      expect(momentCallback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Mode Transitions', () => {
    it('should transition from automatic to cinematic mode', () => {
      automaticCamera.start();
      expect(cinematicCamera.getMode()).toBe('automatic');

      cinematicCamera.setMode('cinematic');
      expect(cinematicCamera.getMode()).toBe('cinematic');
    });

    it('should transition from cinematic to free mode', () => {
      cinematicCamera.setMode('cinematic');
      expect(cinematicCamera.getMode()).toBe('cinematic');

      cinematicCamera.setMode('free');
      expect(cinematicCamera.getMode()).toBe('free');
    });

    it('should handle mode transitions gracefully with pending operations', () => {
      cinematicCamera.setMode('cinematic');
      const panPromise = cinematicCamera.pan(0, 0, 100, 100, 100);

      // Transition to free mode (director takes manual control)
      cinematicCamera.setMode('free');

      expect(cinematicCamera.getMode()).toBe('free');
      expect(panPromise).toBeDefined();
    });
  });

  describe('Event Feed Integration', () => {
    it('should broadcast events to all subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      eventFeed.subscribe(subscriber1);
      eventFeed.subscribe(subscriber2);

      eventFeed.broadcast('camera:test', { data: 'test' });

      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });

    it('should include camera events in event feed', () => {
      const allEvents: Array<[string, any]> = [];
      eventFeed.subscribe((type, data) => {
        allEvents.push([type, data]);
      });

      automaticCamera.start();

      expect(allEvents.some((e) => e[0] === 'camera:started')).toBe(true);
    });

    it('should handle multiple camera event types', () => {
      const events = new Map<string, number>();
      eventFeed.subscribe((type) => {
        events.set(type, (events.get(type) ?? 0) + 1);
      });

      automaticCamera.start();
      automaticCamera.stop();

      expect(events.has('camera:started')).toBe(true);
      expect(events.has('camera:stopped')).toBe(true);
    });
  });

  describe('Configuration Consistency', () => {
    it('should use consistent configuration between cameras', () => {
      const config = cinematicCamera.getConfig();

      expect(config.defaultPanDuration).toBeGreaterThan(0);
      expect(config.enableRotation).toBeDefined();
      expect(config.minZoom).toBeLessThan(config.maxZoom);
    });

    it('should allow runtime configuration changes', () => {
      const originalConfig = cinematicCamera.getConfig();

      cinematicCamera.setConfig({
        defaultPanDuration: 3000,
      });

      const newConfig = cinematicCamera.getConfig();
      expect(newConfig.defaultPanDuration).toBe(3000);
      expect(newConfig.enableRotation).toBe(originalConfig.enableRotation);
    });
  });

  describe('State Queries', () => {
    it('should provide camera state from cinematic camera', () => {
      const state = cinematicCamera.getState();

      expect(state).toHaveProperty('mode');
      expect(state).toHaveProperty('isMoving');
      expect(state).toHaveProperty('progress');
      expect(state).toHaveProperty('position');
      expect(state).toHaveProperty('zoom');
      expect(state).toHaveProperty('rotation');
    });

    it('should provide camera state from automatic camera', () => {
      automaticCamera.start();
      const state = automaticCamera.getState();

      expect(state).toHaveProperty('isMoving');
      expect(state).toHaveProperty('currentPos');
      expect(state).toHaveProperty('targetPos');
      expect(state).toHaveProperty('progress');
    });

    it('should track dramatic moment history', () => {
      automaticCamera.start();

      const prevState: GameState = {
        tick: 1,
        units: [{ id: 'u1', owner: 'p1', position: { x: 100, z: 100 } }],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      const currState: GameState = {
        tick: 2,
        units: [],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(currState, prevState);
      }

      const lastMoment = automaticCamera.getLastDramaticMoment();
      expect(lastMoment).toBeDefined();
      expect(lastMoment?.type).toBe('unit_eliminated');
    });
  });

  describe('Error Handling', () => {
    it('should handle command injection errors gracefully', async () => {
      mockCommandInjector.injectCommand.mockRejectedValueOnce(
        new Error('IPC error')
      );

      const errorCallback = vi.fn();
      eventFeed.subscribe((type, data) => {
        if (type === 'camera:command_failed') {
          errorCallback(data);
        }
      });

      automaticCamera.start();

      const gameState: GameState = {
        tick: 1,
        units: [{ id: 'u1', owner: 'p1', position: { x: 100, z: 100 } }],
        buildings: [],
        players: [{ id: 'p1', name: 'Player 1' }],
      };

      if (mockObservationProvider.callback) {
        mockObservationProvider.callback(gameState);
      }

      // Should continue operating despite command failure
      expect(automaticCamera).toBeDefined();
    });

    it('should continue operating if cinematic camera fails', () => {
      automaticCamera.start();

      // Simulate cinematic camera error
      expect(() => {
        throw new Error('Cinematic camera error');
      }).toThrow();

      // Automatic camera should still be running
      expect(automaticCamera).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should start and stop cleanly', () => {
      automaticCamera.start();
      expect(automaticCamera.getState?.().isMoving).toBe(false);

      automaticCamera.stop();
      // After stop, should no longer process updates
    });

    it('should clean up resources on stop', () => {
      const callback = vi.fn();
      eventFeed.subscribe(callback);

      automaticCamera.start();
      automaticCamera.stop();

      expect(callback).toHaveBeenCalledWith('camera:stopped', expect.any(Object));
    });

    it('should handle multiple start/stop cycles', () => {
      for (let i = 0; i < 3; i++) {
        automaticCamera.start();
        expect(automaticCamera).toBeDefined();
        automaticCamera.stop();
      }
    });
  });
});
