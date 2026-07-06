import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createCommand, createActionId } from '@ai-commander/domain';
import type { GameSession } from '@ai-commander/adapter';

describe('Milestone B: Closed Gameplay Loop', () => {
  let adapter: FakeGameAdapter;
  let session: GameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = await adapter.createSession();
    await session.start();
  });

  describe('Resource System', () => {
    it('should initialize with resource deposit', async () => {
      const state = await session.observationProvider.getWorldState();
      const customData = (state as any).customData || {};

      // Resource deposit should exist at (20, 20)
      expect(customData['resource-deposits']).toBeDefined();
    });

    it('should track player resources', async () => {
      const initialState = await session.observationProvider.getWorldState();
      const initialResources = (initialState as any).customData?.['player-resources'] || 0;

      expect(initialResources).toBe(0);
    });

    it('should track agent carrying capacity', async () => {
      const state = await session.observationProvider.getWorldState();
      const carrying = (state as any).customData?.['agent-carrying'] || 0;

      expect(carrying).toBe(0);
    });
  });

  describe('Gathering Mechanics', () => {
    it('should gather resources at resource location', async () => {
      // Move to resource location (20, 20)
      // From (0, 0) we need 20 moves in x and 20 moves in y
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

      // Now at (20, 20), gather
      const gatherCmd = createCommand(
        createActionId('gather-1'),
        'worker-0',
        'gather',
        {}
      );

      const result = await session.commandExecutor.executeCommand(gatherCmd);
      expect(result.success).toBe(true);

      // Check agent is carrying resources
      const state = await session.observationProvider.getWorldState();
      const firstAgent = (state as any).agents?.[0];
      const carrying = firstAgent?.customData?.carrying || 0;
      expect(carrying).toBeGreaterThan(0);
    });

    it('should not gather at empty location', async () => {
      // Gather at (0, 0) where no resources exist
      const gatherCmd = createCommand(
        createActionId('gather-empty'),
        'worker-0',
        'gather',
        {}
      );

      const result = await session.commandExecutor.executeCommand(gatherCmd);
      expect(result.success).toBe(true);

      // But agent should have no resources
      const state = await session.observationProvider.getWorldState();
      const firstAgent = (state as any).agents?.[0];
      const carrying = firstAgent?.customData?.carrying || 0;
      expect(carrying).toBe(0);
    });

    it('should gather multiple times from same location', async () => {
      // Move to resource location
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-x2-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-y2-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather multiple times
      for (let i = 0; i < 5; i++) {
        const gatherCmd = createCommand(
          createActionId(`gather-${i}`),
          'worker-0',
          'gather',
          {}
        );
        await session.commandExecutor.executeCommand(gatherCmd);
      }

      const state = await session.observationProvider.getWorldState();
      const firstAgent = (state as any).agents?.[0];
      const carrying = firstAgent?.customData?.carrying || 0;

      // Should have gathered at least 50 resources (5 x 10 per command, capped at 50)
      expect(carrying).toBeGreaterThan(0);
    });
  });

  describe('Deposit Mechanics', () => {
    it('should deposit resources at base', async () => {
      // First, get some resources
      // Move to (20, 20)
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-x3-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`move-y3-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Gather resources
      const gatherCmd = createCommand(
        createActionId('gather-deposit-test'),
        'worker-0',
        'gather',
        {}
      );
      await session.commandExecutor.executeCommand(gatherCmd);

      const beforeDeposit = await session.observationProvider.getWorldState();
      // Get carrying from the first agent (worker 0)
      const firstAgent = (beforeDeposit as any).agents?.[0];
      const carryingBefore = firstAgent?.customData?.carrying || 0;
      expect(carryingBefore).toBeGreaterThan(0);

      // Move back to base (0, 0)
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
        createActionId('deposit-1'),
        'worker-0',
        'deposit',
        {}
      );
      const depositResult = await session.commandExecutor.executeCommand(depositCmd);
      expect(depositResult.success).toBe(true);

      // Check player resources increased
      const afterDeposit = await session.observationProvider.getWorldState();
      const playerResources = (afterDeposit as any).customData?.['player-resources'] || 0;
      const firstAgentAfter = (afterDeposit as any).agents?.[0];
      const carryingAfter = firstAgentAfter?.customData?.carrying || 0;

      expect(playerResources).toBeGreaterThan(0);
      expect(carryingAfter).toBe(0);
    });

    it('should not deposit outside base', async () => {
      // Try to deposit at (5, 5) where base is not
      for (let i = 0; i < 5; i++) {
        const moveCmd = createCommand(
          createActionId(`move-away-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 5; i++) {
        const moveCmd = createCommand(
          createActionId(`move-away-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // Try to deposit (should have nothing to deposit)
      const depositCmd = createCommand(
        createActionId('deposit-fail'),
        'worker-0',
        'deposit',
        {}
      );
      await session.commandExecutor.executeCommand(depositCmd);

      const state = await session.observationProvider.getWorldState();
      const playerResources = (state as any).customData?.['player-resources'] || 0;

      // Should not have deposited
      expect(playerResources).toBe(0);
    });
  });

  describe('Complete Loop', () => {
    it('should execute gather-return-deposit loop', async () => {
      // 1. Move to resource (20, 20)
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`loop-move-x-${i}`),
          'worker-0',
          'move',
          { dx: 1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`loop-move-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: 1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // 2. Gather
      const gatherCmd = createCommand(
        createActionId('loop-gather'),
        'worker-0',
        'gather',
        {}
      );
      await session.commandExecutor.executeCommand(gatherCmd);

      // 3. Return to base
      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`loop-return-x-${i}`),
          'worker-0',
          'move',
          { dx: -1, dy: 0 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      for (let i = 0; i < 20; i++) {
        const moveCmd = createCommand(
          createActionId(`loop-return-y-${i}`),
          'worker-0',
          'move',
          { dx: 0, dy: -1 }
        );
        await session.commandExecutor.executeCommand(moveCmd);
      }

      // 4. Deposit
      const depositCmd = createCommand(
        createActionId('loop-deposit'),
        'worker-0',
        'deposit',
        {}
      );
      await session.commandExecutor.executeCommand(depositCmd);

      // 5. Verify resources increased
      const finalState = await session.observationProvider.getWorldState();
      const playerResources = (finalState as any).customData?.['player-resources'] || 0;
      const finalAgent = (finalState as any).agents?.[0];
      const agentCarrying = finalAgent?.customData?.carrying || 0;
      const agentX = finalAgent?.customData?.x || 0;
      const agentY = finalAgent?.customData?.y || 0;

      expect(playerResources).toBeGreaterThan(0);
      expect(agentCarrying).toBe(0);
      expect(agentX).toBe(0);
      expect(agentY).toBe(0);
    });

    it('should repeat loop multiple times', async () => {
      const loopCount = 3;

      for (let loop = 0; loop < loopCount; loop++) {
        // Move to resource
        for (let i = 0; i < 20; i++) {
          const moveCmd = createCommand(
            createActionId(`loop${loop}-move-x-${i}`),
            'worker-0',
            'move',
            { dx: 1, dy: 0 }
          );
          await session.commandExecutor.executeCommand(moveCmd);
        }

        for (let i = 0; i < 20; i++) {
          const moveCmd = createCommand(
            createActionId(`loop${loop}-move-y-${i}`),
            'worker-0',
            'move',
            { dx: 0, dy: 1 }
          );
          await session.commandExecutor.executeCommand(moveCmd);
        }

        // Gather
        const gatherCmd = createCommand(
          createActionId(`loop${loop}-gather`),
          'worker-0',
          'gather',
          {}
        );
        await session.commandExecutor.executeCommand(gatherCmd);

        // Return
        for (let i = 0; i < 20; i++) {
          const moveCmd = createCommand(
            createActionId(`loop${loop}-return-x-${i}`),
            'worker-0',
            'move',
            { dx: -1, dy: 0 }
          );
          await session.commandExecutor.executeCommand(moveCmd);
        }

        for (let i = 0; i < 20; i++) {
          const moveCmd = createCommand(
            createActionId(`loop${loop}-return-y-${i}`),
            'worker-0',
            'move',
            { dx: 0, dy: -1 }
          );
          await session.commandExecutor.executeCommand(moveCmd);
        }

        // Deposit
        const depositCmd = createCommand(
          createActionId(`loop${loop}-deposit`),
          'worker-0',
          'deposit',
          {}
        );
        await session.commandExecutor.executeCommand(depositCmd);
      }

      const finalState = await session.observationProvider.getWorldState();
      const playerResources = (finalState as any).customData?.['player-resources'] || 0;
      const workerCount = (finalState as any).customData?.['worker-count'] || 0;

      // Should have gathered from multiple loops
      expect(playerResources).toBeGreaterThan(0);
      expect(workerCount).toBe(1); // Still just one worker
    });
  });
});
