import type { AgentRuntime } from '@ai-commander/agent-runtime';
import { createAgentRuntime } from '@ai-commander/agent-runtime';
import type { GameAdapter } from '@ai-commander/adapter';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import type { Planner } from '@ai-commander/planner';
import type { DecisionEngine } from '@ai-commander/decision';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel, createGoalPriority } from '@ai-commander/goals';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import type { ExecutionContext } from '@ai-commander/engine';

/**
 * Reference Application
 *
 * Demonstrates minimal framework usage:
 * 1. Initialize game adapter
 * 2. Create agent runtime
 * 3. Execute one agent tick
 * 4. Shut down cleanly
 *
 * Note: Planner and DecisionEngine must be provided by the caller.
 * This demonstrates that the framework is algorithm-agnostic.
 */
export class ReferenceApp {
  private adapter: GameAdapter | null = null;
  private runtime: AgentRuntime | null = null;
  private readonly planner: Planner;
  private readonly decisionEngine: DecisionEngine;

  constructor(planner: Planner, decisionEngine: DecisionEngine) {
    this.planner = planner;
    this.decisionEngine = decisionEngine;
  }

  async initialize(): Promise<void> {
    console.log('Initializing reference application...');

    // Step 1: Initialize the game adapter
    console.log('  Initializing game adapter...');
    this.adapter = new FakeGameAdapter();
    await this.adapter.initialize();
    console.log('  ✓ Game adapter initialized');

    // Step 2: Create a game session
    console.log('  Creating game session...');
    const session = await this.adapter.createSession();
    console.log('  ✓ Game session created');

    // Step 3: Create execution context
    console.log('  Creating execution context...');
    const executionContext: ExecutionContext = {
      eventBus: createEventBus(),
      scheduler: undefined as any,
      clock: createRealtimeClock(),
      serviceRegistry: createServiceRegistry(),
      tick: {
        number: 0,
      },
    };
    console.log('  ✓ Execution context created');

    // Step 4: Create agent runtime
    console.log('  Creating agent runtime...');
    this.runtime = createAgentRuntime({
      agentId: 'agent-0' as any,
      goal: createGoal({
        id: createGoalId('bootstrap'),
        intent: 'bootstrap-test',
        status: GoalStatus.Pending,
        priority: createGoalPriority(GoalPriorityLevel.NORMAL),
        parameters: {},
      }),
      gameSession: session,
      planner: this.planner,
      decisionEngine: this.decisionEngine,
      executionContext,
    });
    console.log('  ✓ Agent runtime created');

    // Step 5: Initialize the agent runtime
    console.log('  Initializing agent runtime...');
    await this.runtime.initialize();
    console.log('  ✓ Agent runtime initialized');
  }

  async run(): Promise<void> {
    if (!this.runtime) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    console.log('Executing agent tick...');
    console.log(`  Agent status: ${this.runtime.getStatus()}`);

    // Execute one tick
    await this.runtime.tick();
    console.log('  ✓ Agent tick executed');

    // Report metrics
    const metrics = this.runtime.getMetrics();
    console.log('Agent metrics:');
    console.log(`  Ticks executed: ${metrics.ticksExecuted}`);
    console.log(`  Decisions made: ${metrics.decisionsExecuted}`);
    console.log(`  Commands executed: ${metrics.commandsExecuted}`);
    console.log(`  Errors: ${metrics.errorsEncountered}`);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down...');

    if (this.runtime) {
      console.log('  Stopping agent runtime...');
      await this.runtime.shutdown();
      console.log(`  ✓ Agent status: ${this.runtime.getStatus()}`);
    }

    if (this.adapter) {
      console.log('  Shutting down game adapter...');
      await this.adapter.shutdown();
      console.log('  ✓ Game adapter shutdown');
    }

    console.log('✓ Shutdown complete');
  }
}

/**
 * Bootstrap and run the reference application.
 *
 * Note: In a real application, you would provide a real Planner and DecisionEngine
 * implementation appropriate to your game and AI requirements.
 *
 * For demonstration purposes, this main() function requires external implementations
 * to be provided (typically via test doubles or framework implementations).
 */
export async function createAndRunApp(
  planner: Planner,
  decisionEngine: DecisionEngine
): Promise<number> {
  const app = new ReferenceApp(planner, decisionEngine);

  try {
    await app.initialize();
    await app.run();
    await app.shutdown();

    console.log('\n✓ Reference application completed successfully');
    return 0;
  } catch (error) {
    console.error('\n✗ Reference application failed:');
    console.error(error);
    return 1;
  }
}
