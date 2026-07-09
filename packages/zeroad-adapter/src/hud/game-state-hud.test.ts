import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameState } from '../state/state-types.js';
import { GameStateHUD, type HUDState } from './game-state-hud.js';

// Mock ObservationLoop
class MockObservationLoop {
  private lastState: GameState | null = null;

  setLastState(state: GameState) {
    this.lastState = state;
  }

  getLastState(): GameState | null {
    return this.lastState;
  }
}

function createGameState(tick: number, overrides?: Partial<GameState>): GameState {
  return {
    tick,
    timestamp: Date.now(),
    players: [
      {
        id: 1,
        name: 'Player 1',
        civ: 'britons',
        color: '#0000ff',
        resources: { food: 500, wood: 400, stone: 200, metal: 100 },
        populationCurrent: 45,
        populationMax: 50,
        diplomacy: {},
      },
      {
        id: 2,
        name: 'Player 2',
        civ: 'gauls',
        color: '#ff0000',
        resources: { food: 600, wood: 350, stone: 150, metal: 80 },
        populationCurrent: 50,
        populationMax: 50,
        diplomacy: {},
      },
    ],
    units: [
      // Player 1 units
      { id: 1, owner: 1, type: 'infantry_swordsman', position: { x: 0, z: 0 }, health: 50, maxHealth: 50 },
      { id: 2, owner: 1, type: 'worker', position: { x: 1, z: 1 }, health: 30, maxHealth: 30 },
      { id: 3, owner: 1, type: 'worker', position: { x: 2, z: 2 }, health: 30, maxHealth: 30 },
      { id: 4, owner: 1, type: 'cavalry_archer', position: { x: 3, z: 3 }, health: 60, maxHealth: 60 },
      // Player 2 units
      { id: 5, owner: 2, type: 'infantry_spearman', position: { x: 10, z: 10 }, health: 50, maxHealth: 50 },
      { id: 6, owner: 2, type: 'cavalry_knight', position: { x: 11, z: 11 }, health: 80, maxHealth: 80 },
      { id: 7, owner: 2, type: 'worker', position: { x: 12, z: 12 }, health: 30, maxHealth: 30 },
    ],
    buildings: [
      // Player 1 buildings
      { id: 101, owner: 1, type: 'civil_centre', position: { x: 5, z: 5 }, health: 500, maxHealth: 500 },
      { id: 102, owner: 1, type: 'barracks', position: { x: 6, z: 6 }, health: 300, maxHealth: 300 },
      { id: 103, owner: 1, type: 'house', position: { x: 7, z: 7 }, health: 100, maxHealth: 100 },
      // Player 2 buildings
      { id: 201, owner: 2, type: 'civil_centre', position: { x: 15, z: 15 }, health: 500, maxHealth: 500 },
      { id: 202, owner: 2, type: 'blacksmith', position: { x: 16, z: 16 }, health: 300, maxHealth: 300 },
    ],
    map: { width: 100, height: 100, terrain: 'grass' },
    ...overrides,
  };
}

describe('GameStateHUD', () => {
  let mockObservationLoop: MockObservationLoop;
  let hud: GameStateHUD;

  beforeEach(() => {
    mockObservationLoop = new MockObservationLoop();
    hud = new GameStateHUD(mockObservationLoop as unknown as any);
  });

  afterEach(() => {
    hud.destroy();
  });

  describe('Initialization', () => {
    it('should create an instance', () => {
      expect(hud).toBeDefined();
    });

    it('should have no last state initially', () => {
      expect(hud.getLastState()).toBeNull();
    });
  });

  describe('Subscription', () => {
    it('should allow subscribing to HUD state updates', () => {
      const callback = vi.fn();
      const unsubscribe = hud.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should emit current state to new subscriber if available', (done) => {
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      // Trigger the HUD to process the state
      setTimeout(() => {
        const callback = vi.fn();
        hud.subscribe(callback);

        setTimeout(() => {
          expect(callback).toHaveBeenCalled();
          done();
        }, 100);
      }, 100);
    });

    it('should unsubscribe callback', () => {
      const callback = vi.fn();
      const unsubscribe = hud.subscribe(callback);

      unsubscribe();

      // After unsubscribe, callback should not be called
      const gameState = createGameState(60);
      mockObservationLoop.setLastState(gameState);

      // Wait for polling interval
      setTimeout(() => {
        expect(callback.mock.calls.length).toBe(0);
      }, 150);
    });
  });

  describe('Game Time Formatting', () => {
    it('should format game time correctly (30 ticks = 1 second)', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.gameTime).toBe('0:01');
        done();
      });

      hud.subscribe(callback);

      const gameState = createGameState(30); // 1 second
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Callback should be called by polling interval
      }, 150);
    });

    it('should format game time MM:SS correctly for longer times', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.gameTime).toBe('5:30');
        done();
      });

      hud.subscribe(callback);

      const gameState = createGameState(30 * 330); // 5:30
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Callback should be called by polling interval
      }, 150);
    });

    it('should pad seconds with leading zero', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.gameTime).toBe('2:03');
        done();
      });

      hud.subscribe(callback);

      const gameState = createGameState(30 * 123); // 2:03
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Callback should be called by polling interval
      }, 150);
    });
  });

  describe('Player Data Processing', () => {
    it('should extract player resources correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].food).toBe(500);
        expect(state.players[0].wood).toBe(400);
        expect(state.players[0].stone).toBe(200);
        expect(state.players[0].metal).toBe(100);

        expect(state.players[1].food).toBe(600);
        expect(state.players[1].wood).toBe(350);
        expect(state.players[1].stone).toBe(150);
        expect(state.players[1].metal).toBe(80);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should extract player names and civilizations', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].name).toBe('Player 1');
        expect(state.players[0].civ).toBe('britons');
        expect(state.players[0].color).toBe('#0000ff');

        expect(state.players[1].name).toBe('Player 2');
        expect(state.players[1].civ).toBe('gauls');
        expect(state.players[1].color).toBe('#ff0000');
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should extract population correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].populationCurrent).toBe(45);
        expect(state.players[0].populationMax).toBe(50);

        expect(state.players[1].populationCurrent).toBe(50);
        expect(state.players[1].populationMax).toBe(50);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });
  });

  describe('Unit Counting', () => {
    it('should count workers correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].workerCount).toBe(2); // Player 1 has 2 workers
        expect(state.players[1].workerCount).toBe(1); // Player 2 has 1 worker
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should count military units correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].militaryCount).toBe(2); // infantry_swordsman + cavalry_archer
        expect(state.players[1].militaryCount).toBe(2); // infantry_spearman + cavalry_knight
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should calculate army value correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        // Player 1: infantry_swordsman (60) + cavalry_archer (100) = 160
        expect(state.players[0].armyValue).toBe(160);
        // Player 2: infantry_spearman (55) + cavalry_knight (150) = 205
        expect(state.players[1].armyValue).toBe(205);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });
  });

  describe('Building Counting', () => {
    it('should count technology buildings correctly', (done) => {
      const callback = vi.fn((state: HUDState) => {
        // Player 1: civil_centre + barracks = 2
        expect(state.players[0].technologyCount).toBe(2);
        // Player 2: civil_centre + blacksmith = 2
        expect(state.players[1].technologyCount).toBe(2);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should not count non-tech buildings in technology count', (done) => {
      const callback = vi.fn((state: HUDState) => {
        // Player 1 buildings include one house (non-tech), should not count it
        expect(state.players[0].technologyCount).toBe(2); // Only civil_centre + barracks
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });
  });

  describe('State Updates', () => {
    it('should emit new HUD state when game state changes', (done) => {
      const callback = vi.fn();
      hud.subscribe(callback);

      // Set initial state
      const gameState1 = createGameState(30);
      mockObservationLoop.setLastState(gameState1);

      setTimeout(() => {
        const firstCallCount = callback.mock.calls.length;

        // Change game state
        const gameState2 = createGameState(60);
        mockObservationLoop.setLastState(gameState2);

        setTimeout(() => {
          expect(callback.mock.calls.length).toBeGreaterThan(firstCallCount);
          done();
        }, 150);
      }, 150);
    });

    it('should not emit duplicate states', (done) => {
      const callback = vi.fn();
      hud.subscribe(callback);

      // Set initial state
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        const firstCallCount = callback.mock.calls.length;

        // Same state again
        mockObservationLoop.setLastState(gameState);

        setTimeout(() => {
          // Should not emit again if state is identical
          expect(callback.mock.calls.length).toBe(firstCallCount);
          done();
        }, 150);
      }, 150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero units', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].workerCount).toBe(0);
        expect(state.players[0].militaryCount).toBe(0);
        expect(state.players[0].armyValue).toBe(0);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30, { units: [] });
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should handle zero buildings', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].technologyCount).toBe(0);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30, { buildings: [] });
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should handle full population', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].populationCurrent).toBe(50);
        expect(state.players[0].populationMax).toBe(50);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30);
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });

    it('should handle empty resource values', (done) => {
      const callback = vi.fn((state: HUDState) => {
        expect(state.players[0].food).toBe(0);
        expect(state.players[0].wood).toBe(0);
        expect(state.players[0].stone).toBe(0);
        expect(state.players[0].metal).toBe(0);
        done();
      });

      hud.subscribe(callback);
      const gameState = createGameState(30, {
        players: [
          {
            ...createGameState(30).players[0],
            resources: { food: 0, wood: 0, stone: 0, metal: 0 },
          },
          createGameState(30).players[1],
        ],
      });
      mockObservationLoop.setLastState(gameState);

      setTimeout(() => {
        // Polling should trigger callback
      }, 150);
    });
  });
});
