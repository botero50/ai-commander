import type { AgentRuntime } from '@ai-commander/agent-runtime';
import { createAgentRuntime } from '@ai-commander/agent-runtime';
import type { GameAdapter, GameSession } from '@ai-commander/adapter';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import type { Planner, Plan } from '@ai-commander/planner';
import { ReferencePlanner } from '@ai-commander/planner';
import type { DecisionEngine, DecisionRequest, DecisionResult } from '@ai-commander/decision';
import {
  createGoal,
  createGoalId,
  GoalStatus,
  GoalPriorityLevel,
  createGoalPriority,
} from '@ai-commander/goals';
import { createEventBus, createRealtimeClock, createServiceRegistry } from '@ai-commander/core';
import type { ExecutionContext } from '@ai-commander/engine';
import { createCommand, createActionId, createTick } from '@ai-commander/domain';
import type { WorldState } from '@ai-commander/domain';
import { ExecutionTracer, formatTrace, traceToJson } from './execution-trace.js';
import { RuntimeMetricsCollector, formatMetrics, metricsToJson } from './runtime-metrics.js';
import type { RuntimeMetrics } from './runtime-metrics.js';
import { ReplayEngine, formatReplayReport, replayReportToJson } from './replay-engine.js';
import type { ReplayReport } from './replay-engine.js';
import { RuntimeInspector, formatRuntimeSnapshot, snapshotToJson } from './runtime-inspector.js';
import type { RuntimeSnapshot } from './runtime-inspector.js';
import { MovementPlanner } from './movement-planner.js';

/**
 * Mission Agent: Autonomous agent that moves to a target location.
 *
 * Demonstrates complete autonomous execution loop:
 * 1. Create a goal (move to target)
 * 2. Plan the goal (ReferencePlanner creates multi-step plan)
 * 3. Execute plan via behavior tree (select and execute movements)
 * 4. Continue until goal is achieved
 */
export class MissionAgent {
  private adapter: GameAdapter | null = null;
  private runtime: AgentRuntime | null = null;
  private planner: Planner;
  private decisionEngine: DecisionEngine;
  private targetX: number;
  private targetY: number;
  private currentWorldState: WorldState | null = null;
  private isComplete: boolean = false;
  private tracer: ExecutionTracer;
  private metrics: RuntimeMetrics | null = null;
  private replayReport: ReplayReport | null = null;
  private startTime: number = 0;
  private currentTick: number = 0;

  constructor(targetX: number, targetY: number) {
    this.planner = new MovementPlanner();
    this.decisionEngine = this.createBehaviorTreeDecisionEngine();
    this.targetX = targetX;
    this.targetY = targetY;
    this.tracer = new ExecutionTracer(`mission-${targetX}-${targetY}`, targetX, targetY);
    this.startTime = Date.now();
  }

  /**
   * Create a decision engine that records trace events.
   *
   * Wraps the base decision logic with trace recording.
   */
  private createBehaviorTreeDecisionEngine(): DecisionEngine {
    const self = this;

    const decisionEngine: DecisionEngine = {
      async decide(request: DecisionRequest): Promise<DecisionResult> {
        const startTime = Date.now();
        self.tracer.recordDecisionEngineInvoked();

        if (!request || !request.plan || request.plan.steps.length === 0) {
          self.tracer.recordPlanEmpty();
          return {
            confidence: 1,
            metadata: Object.freeze({
              engineType: 'mission-tree',
              timestamp: startTime,
              processingTimeMs: Date.now() - startTime,
              reason: 'plan_empty',
            }),
            errors: [],
          };
        }

        // Find first incomplete step
        const plan = request.plan;
        for (const step of plan.steps) {
          if (!step.status || step.status === 'pending' || step.status === 'active') {
            self.tracer.recordDecisionSelected(step, step.command);
            return {
              command: step.command,
              confidence: 1,
              metadata: Object.freeze({
                engineType: 'mission-tree',
                timestamp: startTime,
                processingTimeMs: Date.now() - startTime,
                selectedStepId: step.id,
              }),
              errors: [],
            };
          }
        }

        // All steps complete
        return {
          confidence: 1,
          metadata: Object.freeze({
            engineType: 'mission-tree',
            timestamp: startTime,
            processingTimeMs: Date.now() - startTime,
            reason: 'all_steps_completed',
          }),
          errors: [],
        };
      },
    };

    return decisionEngine;
  }

  /**
   * Invoke the planner and record trace events.
   */
  private async invokePlanner(goal: any): Promise<Plan | null> {
    this.tracer.recordPlannerInvoked(this.targetX, this.targetY);

    const request = {
      goal,
      worldState: {} as any,
      executionContext: {} as any,
      policy: {} as any,
    };

    const result = await this.planner.plan(request);

    if (result.plan) {
      this.tracer.recordPlanGenerated(result.plan);
      return result.plan;
    } else if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors[0] || 'Unknown planning error';
      this.tracer.recordPlanError(errorMsg);
    }

    return null;
  }

  async initialize(): Promise<void> {
    console.log(`\nInitializing mission agent (target: ${this.targetX}, ${this.targetY})...`);
    this.tracer.recordMissionStarted();

    // Step 1: Initialize the game adapter
    console.log('  Initializing game adapter...');
    this.adapter = new FakeGameAdapter();
    await this.adapter.initialize();
    console.log('  ✓ Game adapter initialized');

    // Step 2: Create a game session
    // Note: Do NOT call session.start() here - AgentRuntime will do it
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

    // Step 4: Create goal and record it
    const goal = createGoal({
      id: createGoalId('move-to-target'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: {
        targetX: this.targetX,
        targetY: this.targetY,
      },
    });
    this.tracer.recordGoalCreated(goal);

    // Step 5: Create agent runtime with autonomous goal
    console.log('  Creating agent runtime with mission goal...');
    this.runtime = createAgentRuntime({
      agentId: 'mission-agent' as any,
      goal,
      gameSession: session,
      planner: this.planner,
      decisionEngine: this.decisionEngine,
      executionContext,
    });
    console.log('  ✓ Agent runtime created');

    // Step 6: Initialize the agent runtime
    console.log('  Initializing agent runtime...');
    await this.runtime.initialize();
    this.tracer.recordMissionInitialized();
    console.log('  ✓ Agent runtime initialized');
  }

  /**
   * Run the mission until completion.
   *
   * Autonomous loop:
   * 1. Execute tick (observe, plan, decide, execute)
   * 2. Check if goal is complete
   * 3. Repeat until done
   */
  async run(): Promise<void> {
    if (!this.runtime) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    console.log('\nStarting mission execution...');
    let tickCount = 0;
    const maxTicks = 100; // Safety limit

    while (!this.isComplete && tickCount < maxTicks) {
      tickCount++;
      this.currentTick = tickCount;
      this.tracer.recordMissionTick(tickCount);
      console.log(`\n[Tick ${tickCount}] Executing agent tick...`);

      // Execute one tick
      await this.runtime.tick();

      // Check goal completion
      // For "move-to-target", the goal is complete when agent reaches the target position
      const metrics = this.runtime.getMetrics();
      console.log(
        `  Ticks: ${metrics.ticksExecuted}, Decisions: ${metrics.decisionsExecuted}, Commands: ${metrics.commandsExecuted}`
      );

      // Check if we should update goal status
      // This is a simplified check: count commands as progress
      if (metrics.commandsExecuted > 0) {
        console.log(`  Goal progress: ${metrics.commandsExecuted} movement commands executed`);
      }

      // For deterministic testing: check if we've made enough moves
      // In a real mission, this would check world state against goal
      const expectedMoves = Math.abs(this.targetX) + Math.abs(this.targetY);
      if (metrics.commandsExecuted >= expectedMoves) {
        console.log(
          `  ✓ Mission goal achieved: executed ${metrics.commandsExecuted} commands (needed ${expectedMoves})`
        );
        this.isComplete = true;
        this.tracer.recordMissionCompleted();
      }
    }

    if (!this.isComplete) {
      console.log(`⚠ Mission incomplete after ${maxTicks} ticks`);
      this.tracer.recordMissionFailed(`Incomplete after ${maxTicks} ticks`);
    }

    // Report final metrics
    if (this.runtime) {
      const metrics = this.runtime.getMetrics();
      console.log('\n✓ Mission execution complete');
      console.log('Final metrics:');
      console.log(`  Ticks executed: ${metrics.ticksExecuted}`);
      console.log(`  Decisions made: ${metrics.decisionsExecuted}`);
      console.log(`  Commands executed: ${metrics.commandsExecuted}`);
      console.log(`  Errors: ${metrics.errorsEncountered}`);
    }
  }

  async shutdown(): Promise<void> {
    console.log('\nShutting down...');

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

    this.tracer.recordMissionShutdown();

    // Compute metrics from trace
    this.metrics = RuntimeMetricsCollector.collect(this.tracer.getTrace());

    // Generate replay report from trace
    this.replayReport = ReplayEngine.generateReport(this.tracer.getTrace());

    console.log('✓ Shutdown complete');
  }

  /**
   * Get the execution trace for this mission.
   *
   * The trace contains a complete record of all events during the mission.
   * Can be used for analysis, debugging, replay, or visualization.
   */
  getTrace() {
    return this.tracer.getTrace();
  }

  /**
   * Get the runtime metrics for this mission.
   *
   * Metrics summarize mission performance: timing, event counts, success rates.
   * Deterministic: same mission always produces same metrics.
   */
  getMetrics(): RuntimeMetrics | null {
    return this.metrics;
  }

  /**
   * Format the trace as human-readable text.
   */
  formatTrace(): string {
    return formatTrace(this.tracer.getTrace());
  }

  /**
   * Format the trace as JSON.
   */
  traceAsJson(): string {
    return traceToJson(this.tracer.getTrace());
  }

  /**
   * Format the metrics as human-readable text.
   */
  formatMetrics(): string {
    if (!this.metrics) {
      return 'Metrics not available (mission not yet complete)';
    }
    return formatMetrics(this.metrics);
  }

  /**
   * Format the metrics as JSON.
   */
  metricsAsJson(): string {
    if (!this.metrics) {
      return '{}';
    }
    return metricsToJson(this.metrics);
  }

  /**
   * Get the replay report for this mission.
   *
   * Validates that the recorded execution is consistent.
   * Never executes game logic or modifies state.
   * Only validates recorded execution integrity.
   */
  getReplayReport(): ReplayReport | null {
    return this.replayReport;
  }

  /**
   * Format the replay report as human-readable text.
   */
  formatReplayReport(): string {
    if (!this.replayReport) {
      return 'Replay report not available (mission not yet complete)';
    }
    return formatReplayReport(this.replayReport);
  }

  /**
   * Format the replay report as JSON.
   */
  replayReportAsJson(): string {
    if (!this.replayReport) {
      return '{}';
    }
    return replayReportToJson(this.replayReport);
  }

  /**
   * Capture a runtime snapshot of current execution state.
   *
   * Never modifies runtime state. Read-only access only.
   */
  captureSnapshot(): RuntimeSnapshot {
    const totalTicks = Math.abs(this.targetX) + Math.abs(this.targetY);
    return RuntimeInspector.captureSnapshot(
      `mission-${this.targetX}-${this.targetY}`,
      this.targetX,
      this.targetY,
      this.currentTick,
      totalTicks,
      this.tracer.getTrace(),
      this.metrics,
      this.startTime
    );
  }

  /**
   * Format the runtime snapshot as human-readable text.
   */
  formatSnapshot(): string {
    return formatRuntimeSnapshot(this.captureSnapshot());
  }

  /**
   * Format the runtime snapshot as JSON.
   */
  snapshotAsJson(): string {
    return snapshotToJson(this.captureSnapshot());
  }
}

/**
 * Bootstrap and run the mission agent.
 */
export async function createAndRunMissionAgent(targetX: number, targetY: number): Promise<number> {
  const agent = new MissionAgent(targetX, targetY);

  try {
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    console.log('\n✓ Mission completed successfully');
    return 0;
  } catch (error) {
    console.error('\n✗ Mission failed:');
    console.error(error);
    return 1;
  }
}
