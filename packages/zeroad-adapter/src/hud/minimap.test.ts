import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MinimapService, type MinimapState } from './minimap.js';
import type { ObservationProvider } from '../observation/observation-provider.js';
import type { WorldState, Player, Unit, Building } from '@ai-commander/domain';

describe('Minimap Service', () => {
  let minimapService: MinimapService;
  let mockObservationProvider: ObservationProvider;

  beforeEach(() => {
    // Create mock observation provider
    mockObservationProvider = {
      getWorldState: vi.fn(),
    } as any;

    minimapService = new MinimapService(mockObservationProvider);
  });

  describe('Initialization', () => {
    it('should create minimap service', () => {
      expect(minimapService).toBeDefined();
    });

    it('should have no initial state', () => {
      expect(minimapService['currentState']).toBeNull();
    });

    it('should not auto-update without start()', async () => {
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      // Wait a bit to see if updates happen
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockObservationProvider.getWorldState).not.toHaveBeenCalled();
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', async () => {
      const callback = vi.fn();
      const unsubscribe = minimapService.subscribe(callback);

      // Set initial state
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.start();
      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(callback).toHaveBeenCalled();

      unsubscribe();
      minimapService.stop();
    });

    it('should send current state to new subscribers', async () => {
      const callback1 = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.start();
      minimapService.subscribe(callback1);

      await new Promise((resolve) => setTimeout(resolve, 120));

      // First subscriber called at least once
      expect(callback1).toHaveBeenCalled();

      // Second subscriber should get current state immediately
      const callback2 = vi.fn();
      minimapService.subscribe(callback2);

      expect(callback2).toHaveBeenCalled();

      minimapService.stop();
    });

    it('should support unsubscribe', async () => {
      const callback = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      const unsubscribe = minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));
      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      // Update should still happen, but callback won't be called
      await new Promise((resolve) => setTimeout(resolve, 120));
      expect(callback.mock.calls.length).toBe(callCountBefore);

      minimapService.stop();
    });
  });

  describe('Minimap state building', () => {
    it('should include tick and timestamp', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0]![0]!;
      expect(state.tick).toBe(100);
      expect(state.timestamp).toBeGreaterThan(0);

      minimapService.stop();
    });

    it('should include map bounds', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      expect(state.mapBounds).toBeDefined();
      expect(state.mapBounds.minX).toBeLessThan(state.mapBounds.maxX);
      expect(state.mapBounds.minZ).toBeLessThan(state.mapBounds.maxZ);

      minimapService.stop();
    });

    it('should include map size', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      expect(state.mapSize).toBeDefined();
      expect(state.mapSize.width).toBeGreaterThan(0);
      expect(state.mapSize.height).toBeGreaterThan(0);

      minimapService.stop();
    });

    it('should separate units and buildings by player', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      expect(state.player1Units).toBeDefined();
      expect(state.player1Buildings).toBeDefined();
      expect(state.player2Units).toBeDefined();
      expect(state.player2Buildings).toBeDefined();

      // Should have some units and buildings
      expect(state.player1Units.length).toBeGreaterThan(0);
      expect(state.player1Buildings.length).toBeGreaterThan(0);

      minimapService.stop();
    });

    it('should mark units as type "unit"', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      for (const unit of state.player1Units) {
        expect(unit.type).toBe('unit');
      }

      minimapService.stop();
    });

    it('should mark buildings as type "building"', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      for (const building of state.player1Buildings) {
        expect(building.type).toBe('building');
      }

      minimapService.stop();
    });

    it('should include unit health information', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      for (const unit of state.player1Units) {
        expect(unit.health).toBeGreaterThanOrEqual(0);
        expect(unit.maxHealth).toBeGreaterThan(0);
      }

      minimapService.stop();
    });
  });

  describe('Fog of war', () => {
    it('should generate fog of war for both players', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;
      expect(state.fogOfWar.player1).toBeDefined();
      expect(state.fogOfWar.player2).toBeDefined();

      // Grid should be 2D array of booleans
      expect(Array.isArray(state.fogOfWar.player1)).toBe(true);
      expect(Array.isArray(state.fogOfWar.player1[0])).toBe(true);

      minimapService.stop();
    });

    it('should have all visible tiles in spectator mode', async () => {
      const callback = vi.fn<[MinimapState], void>();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const state = callback.mock.calls[0]![0]!;

      // All tiles should be visible (true) in spectator mode
      for (const row of state.fogOfWar.player1) {
        for (const tile of row) {
          expect(tile).toBe(true);
        }
      }

      minimapService.stop();
    });
  });

  describe('Update lifecycle', () => {
    it('should update on regular intervals', async () => {
      const callback = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      // Should get update immediately
      await new Promise((resolve) => setTimeout(resolve, 50));
      const firstCallCount = callback.mock.calls.length;

      // Wait for another update
      await new Promise((resolve) => setTimeout(resolve, 120));
      const secondCallCount = callback.mock.calls.length;

      expect(secondCallCount).toBeGreaterThan(firstCallCount);

      minimapService.stop();
    });

    it('should stop updating after stop() is called', async () => {
      const callback = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 150));
      const callCountBefore = callback.mock.calls.length;

      minimapService.stop();

      // Wait and verify no new updates
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should handle observation provider errors gracefully', async () => {
      const callback = vi.fn();
      (mockObservationProvider.getWorldState as any).mockRejectedValue(
        new Error('Provider error')
      );

      minimapService.subscribe(callback);
      minimapService.start();

      // Should not crash, just skip this update
      await new Promise((resolve) => setTimeout(resolve, 150));

      minimapService.stop();
    });
  });

  describe('Cleanup', () => {
    it('should clear state on destroy', async () => {
      const callback = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));

      minimapService.destroy();

      expect(minimapService['currentState']).toBeNull();
      expect(minimapService['subscribers'].size).toBe(0);
    });

    it('should stop updates on destroy', async () => {
      const callback = vi.fn();
      const mockWorldState = createMockWorldState();
      (mockObservationProvider.getWorldState as any).mockResolvedValue(mockWorldState);

      minimapService.subscribe(callback);
      minimapService.start();

      await new Promise((resolve) => setTimeout(resolve, 120));
      const callCountBefore = callback.mock.calls.length;

      minimapService.destroy();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(callback.mock.calls.length).toBe(callCountBefore);
    });
  });
});

// Helper function to create mock world state
function createMockWorldState(): WorldState {
  return {
    tick: 100,
    players: [
      {
        id: 'player1',
        food: 500,
        wood: 800,
        stone: 300,
        metal: 200,
        populationCurrent: 20,
        populationMax: 50,
        units: [
          {
            id: 'unit1',
            type: 'infantry',
            position: { x: 100, z: 100 },
            health: 45,
            maxHealth: 50,
          },
          {
            id: 'unit2',
            type: 'cavalry',
            position: { x: 120, z: 110 },
            health: 60,
            maxHealth: 70,
          },
        ] as any,
        buildings: [
          {
            id: 'building1',
            type: 'barracks',
            position: { x: 90, z: 90 },
            health: 200,
            maxHealth: 200,
          },
          {
            id: 'building2',
            type: 'storehouse',
            position: { x: 110, z: 90 },
            health: 180,
            maxHealth: 200,
          },
        ] as any,
      } as Player,
      {
        id: 'player2',
        food: 450,
        wood: 700,
        stone: 250,
        metal: 180,
        populationCurrent: 18,
        populationMax: 50,
        units: [
          {
            id: 'unit3',
            type: 'archer',
            position: { x: 200, z: 200 },
            health: 30,
            maxHealth: 35,
          },
          {
            id: 'unit4',
            type: 'infantry',
            position: { x: 210, z: 190 },
            health: 50,
            maxHealth: 50,
          },
        ] as any,
        buildings: [
          {
            id: 'building3',
            type: 'barracks',
            position: { x: 190, z: 190 },
            health: 200,
            maxHealth: 200,
          },
          {
            id: 'building4',
            type: 'fortress',
            position: { x: 220, z: 190 },
            health: 300,
            maxHealth: 300,
          },
        ] as any,
      } as Player,
    ],
  } as WorldState;
}
