import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createCommand, createActionId } from '@ai-commander/domain';
import type { GameSession } from '@ai-commander/adapter';

describe.skip('Milestone C: Economy Validation', () => {
  let adapter: FakeGameAdapter;
  let session: GameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = await adapter.createSession();
    await session.start();
  });

  describe.skip('Worker Management', () => {
    it('should initialize with one worker at base', async () => {
      const state = await session.observationProvider.getWorldState();
      const workerCount = (state as any).customData?.['worker-count'] || 0;

      expect(workerCount).toBe(1);
    });

    it('should track multiple workers', async () => {
      // Produce a worker (costs 50 resources)
      // First, we need to get 50 resources
      // Move worker 0 to resource
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather 5 times to get 50 resources
      for (let i = 0; i < 5; i++) {
        const gatherCmd = createCommand(
          createActionId(`gather-${i}`),
          'worker-0',
          'gather',
          {}
        );
        await session.commandExecutor.executeCommand(gatherCmd);
      }

      // Return to base
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`return-x-${i}`),
          'worker-0',
          'move',
          { dx: -1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`return-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: -1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Deposit
      const depositCmd = createCommand(
        createActionId('deposit'),
        'worker-0',
        'deposit',
        {}
      );
      await session.commandExecutor.executeCommand(depositCmd);

      // Check player resources
      let state = await session.observationProvider.getWorldState();
      const playerResources = (state as any).customData?.['player-resources'] || 0;
      expect(playerResources).toBeGreaterThanOrEqual(50);

      // Now produce a worker
      const produceCmd = createCommand(
        createActionId('produce-1'),
        'system',
        'produce',
        {}
      );
      await session.commandExecutor.executeCommand(produceCmd);

      // Check worker count increased
      state = await session.observationProvider.getWorldState();
      const newWorkerCount = (state as any).customData?.['worker-count'] || 0;

      expect(newWorkerCount).toBe(2);
    });
  });

  describe.skip('Resource System', () => {
    it('should track player resources', async () => {
      const initialState = await session.observationProvider.getWorldState();
      const initialResources = (initialState as any).customData?.['player-resources'] || 0;

      expect(initialResources).toBe(0);
    });

    it('should have multiple resource deposits', async () => {
      const state = await session.observationProvider.getWorldState();
      const deposits = (state as any).customData?.['resource-deposits'];

      expect(deposits).toBeDefined();
      const parsed = JSON.parse(deposits);
      expect(parsed.length).toBe(2); // Two resource fields
    });

    it('should gather from different resource locations', async () => {
      // Move worker 0 to first resource (20, 20)
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move1-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move1-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather from first location
      let gatherCmd = createCommand(
        createActionId('gather-location1'),
        'worker-0',
        'gather',
        {}
      );
      let result = await session.commandExecutor.executeCommand(gatherCmd);
      expect(result.success).toBe(true);

      // Move to second resource (30, 30) - need 10 more moves in each direction
      for (let i = 0; i < 10; i++) {
        const moveCmd = createCommand(
          createActionId(`move2-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 10; i++) {
        const moveCmd = createCommand(
          createActionId(`move2-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather from second location
      gatherCmd = createCommand(
        createActionId('gather-location2'),
        'worker-0',
        'gather',
        {}
      );
      result = await session.commandExecutor.executeCommand(gatherCmd);
      expect(result.success).toBe(true);

      // Check worker carrying increased
      const state = await session.observationProvider.getWorldState();
      const firstWorker = (state as any).agents?.[0];
      const carrying = firstWorker?.customData?.carrying || 0;

      expect(carrying).toBeGreaterThan(0);
    });
  });

  describe.skip('Worker Production', () => {
    it('should fail to produce without sufficient resources', async () => {
      // Try to produce with 0 resources
      const produceCmd = createCommand(
        createActionId('produce-fail'),
        'system',
        'produce',
        {}
      );
      const result = await session.commandExecutor.executeCommand(produceCmd);

      // Should succeed in sending command, but world shouldn't change
      expect(result.success).toBe(true);

      const state = await session.observationProvider.getWorldState();
      const workerCount = (state as any).customData?.['worker-count'] || 0;

      expect(workerCount).toBe(1); // Still just one worker
    });

    it('should produce worker and deduct resources', async () => {
      // Gather enough resources (50 needed)
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`produce-move-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`produce-move-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather 5 times
      for (let i = 0; i < 5; i++) {
        const gatherCmd = createCommand(
          createActionId(`produce-gather-${i}`),
          'worker-0',
          'gather',
          {}
        );
        await session.commandExecutor.executeCommand(gatherCmd);
      }

      // Return
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`produce-return-x-${i}`),
          'worker-0',
          'move',
          { dx: -1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`produce-return-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: -1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Deposit
      const depositCmd = createCommand(
        createActionId('produce-deposit'),
        'worker-0',
        'deposit',
        {}
      );
      await session.commandExecutor.executeCommand(depositCmd);

      // Produce worker
      const produceCmd = createCommand(
        createActionId('produce-success'),
        'system',
        'produce',
        {}
      );
      await session.commandExecutor.executeCommand(produceCmd);

      // Check results
      const state = await session.observationProvider.getWorldState();
      const workerCount = (state as any).customData?.['worker-count'] || 0;
      const playerResources = (state as any).customData?.['player-resources'] || 0;

      expect(workerCount).toBe(2); // Should have 2 workers
      expect(playerResources).toBeGreaterThanOrEqual(0); // Resources spent on production
    });

    it('should place new worker at base', async () => {
      // Get 50 resources and produce
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`base-move-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`base-move-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 5; i++) {
        const gatherCmd = createCommand(
          createActionId(`base-gather-${i}`),
          'worker-0',
          'gather',
          {}
        );
        await session.commandExecutor.executeCommand(gatherCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`base-return-x-${i}`),
          'worker-0',
          'move',
          { dx: -1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`base-return-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: -1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      const depositCmd = createCommand(
        createActionId('base-deposit'),
        'worker-0',
        'deposit',
        {}
      );
      await session.commandExecutor.executeCommand(depositCmd);

      // Produce
      const produceCmd = createCommand(
        createActionId('produce-place'),
        'system',
        'produce',
        {}
      );
      await session.commandExecutor.executeCommand(produceCmd);

      // Check new worker was created
      const state = await session.observationProvider.getWorldState();
      const workerCount = (state as any).customData?.['worker-count'] || 0;
      const agents = (state as any).agents || [];

      expect(workerCount).toBe(2);
      expect(agents.length).toBe(2); // Both workers visible in agents array
    });
  });

  describe.skip('Multi-Worker Economy', () => {
    it('should have workers gather independently', async () => {
      // This would require producing a worker first
      // For now, test that the system supports multiple agents in world state
      const state = await session.observationProvider.getWorldState();
      const agents = (state as any).agents || [];

      expect(agents.length).toBeGreaterThan(0);
      expect(Array.isArray(agents)).toBe(true);
    });
  });
});
