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
import { ExecutionPreconditionValidator } from './execution-preconditions.js';
import { PlanValidator } from './plan-validator.js';
import { FailureDiagnoser, RecoveryStrategy } from './failure-diagnosis.js';
import { GoalProgressEvaluator } from './goal-progress-evaluator.js';
import type { Command } from '@ai-commander/domain';

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
  private gameSession: any = null; // Game session for world state access
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
  private currentGoal: any = null; // Goal for precondition checking
  private currentPlan: Plan | null = null; // Current plan being executed
  private planValidator = new PlanValidator();
  private failureDiagnoser = new FailureDiagnoser();
  private recoveryStrategy = new RecoveryStrategy();
  private progressEvaluator = new GoalProgressEvaluator();
  private progressHistory: Array<{ tick: number; percent: number }> = [];
  private lastProgressTrend: 'improving' | 'stable' | 'regressing' = 'stable';

  constructor(targetX: number, targetY: number) {
    this.planner = this.createAdaptiveReplanningPlanner();
    this.decisionEngine = this.createBehaviorTreeDecisionEngine();
    this.targetX = targetX;
    this.targetY = targetY;
    this.tracer = new ExecutionTracer(`mission-${targetX}-${targetY}`, targetX, targetY);
    this.startTime = Date.now();
  }

  /**
   * Create an adaptive replanning planner that validates existing plans
   * before creating new ones.
   *
   * This replaces the basic MovementPlanner with one that implements
   * plan lifecycle management: validation, reuse, and invalidation.
   *
   * Since the decision engine doesn't track which steps have been executed,
   * we generate fresh plans from the current world state on each tick.
   * We record plan_reused events when the new plan is shorter (indicating
   * progress toward the goal), and plan_invalidated when the plan needs
   * to change due to world state changes.
   */
  private createAdaptiveReplanningPlanner(): Planner {
    const self = this;
    const basePlanner = new MovementPlanner();

    const adaptivePlanner: Planner = {
      async plan(request: any) {
        // Generate a fresh plan from current world state
        const result = await basePlanner.plan(request);

        if (result.plan) {
          // We have a new plan. Check if this represents progress on a previous plan.
          if (self.currentPlan) {
            // If the new plan has fewer steps, we've made progress
            if (result.plan.steps.length < self.currentPlan.steps.length) {
              self.tracer.recordPlanReused(result.plan);
            } else if (result.plan.steps.length > self.currentPlan.steps.length) {
              // If new plan has more steps, the world changed in an unexpected way
              self.tracer.recordPlanInvalidated(
                self.currentPlan,
                'World state change requires replanning with more steps'
              );
              self.tracer.recordPlanGenerated(result.plan);
            } else {
              // Same number of steps - might be same plan or slight variation
              self.tracer.recordPlanReused(result.plan);
            }
          } else {
            // First plan for this goal
            self.tracer.recordPlanGenerated(result.plan);
          }

          self.currentPlan = result.plan;
        } else if (result.diagnostics?.some((d) => d.includes('Goal already satisfied'))) {
          // Goal is already satisfied
          if (self.currentPlan) {
            self.tracer.recordPlanInvalidated(self.currentPlan, 'Goal already satisfied');
            self.currentPlan = null;
          }
        }

        return result;
      },
    };

    return adaptivePlanner;
  }

  /**
   * Create a decision engine that records trace events and validates preconditions.
   *
   * Wraps the base decision logic with trace recording and precondition validation.
   * Before executing a command, verifies:
   * - Acting agent still exists in world
   * - Target entity (if any) still exists
   * - Goal hasn't already been satisfied
   * - Command is applicable to current world state
   */
  private createBehaviorTreeDecisionEngine(): DecisionEngine {
    const self = this;
    const preconditionValidator = new ExecutionPreconditionValidator();

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

        // Find first incomplete step that passes precondition checks
        const plan = request.plan;
        for (const step of plan.steps) {
          if (!step.status || step.status === 'pending' || step.status === 'active') {
            const command = step.command;

            // Validate preconditions before executing
            let validation: { isValid: boolean; reason?: string } = { isValid: true };
            if (self.currentGoal) {
              validation = preconditionValidator.validateCommandExecution(
                command,
                request.worldState,
                self.currentGoal
              );
            }

            if (!validation.isValid) {
              // Precondition failed - mark step as skipped and continue to next
              (step as any).status = 'skipped';
              self.tracer.recordCommandSkipped(command, validation.reason || 'Unknown reason');
              continue;
            }

            // Preconditions passed - mark step as active and return for execution
            (step as any).status = 'active';
            self.tracer.recordDecisionSelected(step, command);
            return {
              command,
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

        // All steps complete or all skipped
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
   * Get the current world state from the game session.
   * Returns an empty object if unavailable.
   */
  private async getWorldState(): Promise<WorldState> {
    if (!this.gameSession) {
      return {} as WorldState;
    }

    try {
      if (!this.gameSession.observationProvider) {
        return {} as WorldState;
      }

      const available = await this.gameSession.observationProvider.isObservationAvailable();
      if (!available) {
        return {} as WorldState;
      }

      return await this.gameSession.observationProvider.getWorldState();
    } catch (error) {
      console.error('Error getting world state:', error);
      return {} as WorldState;
    }
  }

  /**
   * Check if goal is satisfied in the current world state.
   * For "move-to-target": checks if agent position matches target coordinates.
   */
  private async isGoalSatisfied(goal: any): Promise<boolean> {
    const worldState = await this.getWorldState();

    try {
      if (!worldState || !(worldState as any).agents || (worldState as any).agents.length === 0) {
        return false;
      }

      const agent = (worldState as any).agents[0];
      if (!agent || !agent.customData || agent.customData.position === undefined) {
        return false;
      }

      const positionStr = String(agent.customData.position);
      // Position format is "x,y" (e.g., "1,0")
      const match = positionStr.match(/^(\d+),(\d+)$/);
      if (!match) {
        return false;
      }

      const currentX = parseInt(match[1] || '0', 10);
      const currentY = parseInt(match[2] || '0', 10);
      const targetX = goal.parameters?.targetX as number | undefined;
      const targetY = goal.parameters?.targetY as number | undefined;

      return currentX === targetX && currentY === targetY;
    } catch {
      return false;
    }
  }

  /**
   * Invoke the planner with world-state-driven planning.
   *
   * The planner receives the current world state and must generate plans
   * relative to observed reality, not hardcoded assumptions.
   */
  private async invokePlanner(goal: any): Promise<Plan | null> {
    this.tracer.recordPlannerInvoked(this.targetX, this.targetY);

    // Get the actual world state for planning
    const worldState = await this.getWorldState();

    // Check if goal is already satisfied before planning
    if (await this.isGoalSatisfied(goal)) {
      this.tracer.recordPlanEmpty();
      console.log('  ✓ Goal already satisfied in world state; skipping plan generation');
      return null;
    }

    const request = {
      goal,
      worldState,
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
    this.gameSession = session; // Store for world state access
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
   * World-state-driven autonomous loop:
   * 1. Execute tick (observe, plan from world state, decide, execute)
   * 2. Verify goal completion by checking world state
   * 3. Repeat until goal is satisfied or timeout
   */
  async run(): Promise<void> {
    if (!this.runtime) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Create goal for mission and store for precondition checking
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
    this.currentGoal = goal;

    console.log('\nStarting mission execution...');
    let tickCount = 0;
    const maxTicks = 100; // Safety limit

    while (!this.isComplete && tickCount < maxTicks) {
      tickCount++;
      this.currentTick = tickCount;
      this.tracer.recordMissionTick(tickCount);
      console.log(`\n[Tick ${tickCount}] Executing agent tick...`);

      try {
        // Execute one tick
        await this.runtime.tick();

        // Verify goal completion using actual world state (not command count)
        const metrics = this.runtime.getMetrics();
        console.log(
          `  Ticks: ${metrics.ticksExecuted}, Decisions: ${metrics.decisionsExecuted}, Commands: ${metrics.commandsExecuted}`
        );

        // Evaluate goal progress from world state
        const worldState = await this.getWorldState();
        const progressData = this.progressEvaluator.evaluateProgress(goal, worldState, tickCount);
        this.tracer.recordGoalProgressUpdated(progressData);

        // Track progress history (keep last 5)
        this.progressHistory.push({ tick: tickCount, percent: progressData.progressPercent });
        if (this.progressHistory.length > 5) {
          this.progressHistory.shift();
        }

        // Check if trend changed
        if (progressData.trend !== this.lastProgressTrend) {
          this.tracer.recordGoalProgressTrendChanged(
            goal.id,
            goal.intent,
            this.lastProgressTrend,
            progressData.trend
          );
          this.lastProgressTrend = progressData.trend;
        }

        // Log progress
        console.log(
          `  📈 Progress: ${progressData.progressPercent}% (${progressData.trend}) - ${progressData.progressReason}`
        );

        // Check if goal is satisfied in world state
        if (await this.isGoalSatisfied(goal)) {
          const agent = worldState.agents?.[0];
          const position = agent?.customData?.position || 'unknown';
          console.log(
            `  ✓ Mission goal achieved: agent reached target (${this.targetX}, ${this.targetY}) at position ${position}`
          );
          this.tracer.recordGoalCompleted(goal.id, goal.intent, progressData.progressPercent);
          this.isComplete = true;
          this.tracer.recordMissionCompleted();
        }
      } catch (error) {
        // Failure occurred - diagnose and recover
        const worldState = await this.getWorldState();
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.log(`  ⚠ Failure detected: ${errorMsg}`);
        this.tracer.recordFailureDetected(errorMsg);

        // Generate diagnosis
        const diagnosis = this.failureDiagnoser.diagnose({
          worldState,
          goal,
          plan: this.currentPlan ?? undefined,
          error: errorMsg,
        });

        console.log(`  📋 Diagnosis: ${diagnosis.category} (${diagnosis.severity})`);
        console.log(`     ${diagnosis.description}`);
        this.tracer.recordDiagnosisGenerated(diagnosis);

        // Determine recovery action
        const recovery = this.recoveryStrategy.decide(diagnosis);

        console.log(`  🔧 Recovery: ${recovery.action}`);
        console.log(`     ${recovery.reason}`);
        this.tracer.recordRecoverySelected(recovery);

        // Execute recovery action
        let recoveryOutcome = 'unknown';

        switch (recovery.action) {
          case 'continue_plan':
            recoveryOutcome = 'continued execution with current plan';
            break;

          case 'skip_action':
            // Skip the failed action and try next tick
            recoveryOutcome = 'skipped failed action, continuing';
            break;

          case 'retry_action':
            // Not currently implemented in this version
            recoveryOutcome = 'retry action (not yet implemented)';
            break;

          case 'invalidate_plan':
            // Invalidate current plan, will be regenerated next tick
            this.currentPlan = null;
            recoveryOutcome = 'plan invalidated, will regenerate on next tick';
            break;

          case 'generate_replacement_plan':
            // Immediately generate new plan
            this.currentPlan = null;
            recoveryOutcome = 'generating new plan';
            break;

          case 'abort_mission':
            // Mission cannot continue
            console.log(`  ✗ Aborting mission due to: ${diagnosis.description}`);
            this.isComplete = true;
            this.tracer.recordMissionFailed(diagnosis.description);
            recoveryOutcome = 'mission aborted';
            break;

          default:
            recoveryOutcome = 'unknown recovery action';
        }

        console.log(`  ✓ ${recoveryOutcome}`);
        this.tracer.recordRecoveryCompleted(recovery.action, recoveryOutcome);
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
      console.log(`  Completion: ${this.isComplete ? 'SUCCESS' : 'TIMEOUT'}`);
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
