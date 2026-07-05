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
import { GoalEvaluator } from './goal-evaluator.js';
import { GoalLifecycleTracker } from './goal-lifecycle-tracker.js';
import { WorldStateTracker } from './world-state-tracker.js';
import { ResourceGatherer } from './resource-gatherer.js';
import { WorkerMovement, type MovementPhase } from './worker-movement.js';
import { EconomyScaler } from './economy-scaler.js';
import { BaseExpansion } from './base-expansion.js';
import { BuildingConstruction } from './building-construction.js';
import { MilitaryProduction } from './military-production.js';
import { TacticalPositioning } from './tactical-positioning.js';
import { ThreatDetection } from './threat-detection.js';
import { CombatDecisionMaker } from './combat-decision.js';
import { ArmyCoordination } from './army-coordination.js';
import { Scouting } from './scouting.js';
import { FogOfWar } from './fog-of-war.js';
import { BaseDefense } from './base-defense.js';
import { CombatExecution } from './combat-execution.js';
import { UnitMicro } from './unit-micro.js';
import { ArmyReinforcement } from './army-reinforcement.js';
import { ArmyStaging } from './army-staging.js';
import { AttackTiming } from './attack-timing.js';
import { GameplayMetricsCollector } from './gameplay-metrics.js';
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
  private goalEvaluator = new GoalEvaluator();
  private lifecycleTracker = new GoalLifecycleTracker();
  private worldStateTracker = new WorldStateTracker();
  private resourceGatherer = new ResourceGatherer();
  private workerMovement = new WorkerMovement();
  private economyScaler = new EconomyScaler();
  private baseExpansion = new BaseExpansion();
  private buildingConstruction = new BuildingConstruction();
  private militaryProduction = new MilitaryProduction();
  private tacticalPositioning = new TacticalPositioning();
  private threatDetection = new ThreatDetection();
  private combatDecisionMaker = new CombatDecisionMaker();
  private armyCoordination = new ArmyCoordination();
  private scouting = new Scouting();
  private fogOfWar = new FogOfWar();
  private baseDefense = new BaseDefense();
  private combatExecution = new CombatExecution();
  private unitMicro = new UnitMicro();
  private armyReinforcement = new ArmyReinforcement();
  private armyStaging = new ArmyStaging();
  private attackTiming = new AttackTiming();
  private gameplayMetrics = new GameplayMetricsCollector();
  private goalLifecycleStates: Map<string, 'Queued' | 'Candidate' | 'Selected' | 'Executing' | 'Completed'> = new Map();
  private currentGoalScore: number = 0;
  private lastEvaluationScores: Map<string, number> = new Map();
  private resourceFields: Map<string, any> = new Map();
  private gatheringTargetFieldId: string | null = null;
  private gatheringStartTick: number | null = null;
  private gatheringDetectedAtTick: number | null = null;
  private gatheringSelectedAtTick: number | null = null;
  private gatheringMovementStartTick: number | null = null;
  private gatheringArrivalTick: number | null = null;
  private returningStartTick: number | null = null;
  private returningArrivalTick: number | null = null;
  private basePosition: { x: number; y: number } = { x: 20, y: 20 };
  private currentMovementPhase: MovementPhase = 'idle';
  private lastGatheringProgress: number = 0;
  private resourcesCollected: number = 0;
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

  private extractAgentPosition(worldState: WorldState): { x: number; y: number } {
    const agent = (worldState.agents || [])[0];
    if (agent && agent.customData?.position) {
      const pos = agent.customData.position;
      if (typeof pos === 'string') {
        const match = (pos as string).match(/^(\d+),(\d+)$/);
        if (match && match[1] && match[2]) {
          return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
        }
      }
    }
    return { x: 0, y: 0 };
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
   * Create candidate goals for evaluation.
   *
   * The GoalEvaluator supports any number of candidates.
   * This demonstration uses 3 for observability.
   * To add more candidates: create additional goals and push to array.
   * To remove candidates: delete the corresponding goal creation.
   * No changes needed to evaluation pipeline - it handles any count.
   */
  private createCandidateGoals(): any[] {
    // Primary goal (mission objective)
    const primaryGoal = this.currentGoal;

    // Alternative goals (for demonstration - add/remove as needed)
    const exploreGoal = createGoal({
      id: createGoalId('explore'),
      intent: 'explore-world',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.LOW),
      parameters: { radius: 50 },
    });

    const defendGoal = createGoal({
      id: createGoalId('defend'),
      intent: 'defend-position',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.HIGH),
      parameters: { position: { x: this.targetX, y: this.targetY } },
    });

    // Story 101: Economy bootstrapping - resource gathering goal
    const gatherResourcesGoal = createGoal({
      id: createGoalId('gather-resources'),
      intent: 'gather-resources',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: { strategy: 'economy-bootstrap' },
    });

    // Return array of all candidates
    // Pipeline evaluates all of them - order, count, and content are flexible
    return [primaryGoal, exploreGoal, defendGoal, gatherResourcesGoal];
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

    // Initialize goal lifecycle tracking
    this.goalLifecycleStates.set(goal.id, 'Queued');
    this.lifecycleTracker.initialize(this.tracer.getTrace());

    console.log('\nStarting mission execution...');
    let tickCount = 0;
    const maxTicks = 100; // Safety limit

    while (!this.isComplete && tickCount < maxTicks) {
      tickCount++;
      this.currentTick = tickCount;
      this.tracer.recordMissionTick(tickCount);
      console.log(`\n[Tick ${tickCount}] Executing agent tick...`);

      try {
        // Use current goal (may have been adapted from previous tick)
        const activeGoal = this.currentGoal;

        // Execute one tick
        await this.runtime.tick();

        // Verify goal completion using actual world state (not command count)
        const metrics = this.runtime.getMetrics();
        console.log(
          `  Ticks: ${metrics.ticksExecuted}, Decisions: ${metrics.decisionsExecuted}, Commands: ${metrics.commandsExecuted}`
        );

        // Evaluate goal progress from world state
        const worldState = await this.getWorldState();

        // Evaluate multiple candidate goals
        // The evaluator supports any number of candidates - add/remove as needed
        // Currently demonstrating with 3 candidates for observability
        const candidateGoals = this.createCandidateGoals();

        const selectionResult = this.goalEvaluator.selectGoal(candidateGoals, worldState, tickCount);
        this.tracer.recordGoalCandidatesEvaluated(Array.from(selectionResult.allEvaluations));
        this.tracer.recordGoalSelected(selectionResult.selectedGoal, selectionResult.reasoning);

        // Track lifecycle transitions for all candidate goals
        for (const candidateGoal of candidateGoals) {
          const currentState = this.goalLifecycleStates.get(candidateGoal.id) || 'Queued';

          // Transition to Candidate when being evaluated
          if (currentState === 'Queued') {
            this.tracer.recordGoalLifecycleTransitioned(
              candidateGoal.id,
              candidateGoal.intent,
              'Queued',
              'Candidate',
              'Entered evaluation'
            );
            this.goalLifecycleStates.set(candidateGoal.id, 'Candidate');
          }

          // Transition to Selected if this goal was chosen
          if (candidateGoal.id === selectionResult.selectedGoal.id && currentState !== 'Selected') {
            this.tracer.recordGoalLifecycleTransitioned(
              candidateGoal.id,
              candidateGoal.intent,
              'Candidate',
              'Selected',
              selectionResult.reasoning
            );
            this.goalLifecycleStates.set(candidateGoal.id, 'Selected');
          }
        }

        // Log goal evaluation
        console.log(`  🎯 Goal Evaluation:`);
        for (const evaluation of selectionResult.allEvaluations) {
          const marker = evaluation.goal.id === activeGoal.id ? '→' : ' ';
          console.log(
            `    ${marker} ${evaluation.goal.intent}: ${evaluation.score.toFixed(3)} (priority: ${evaluation.priorityFactor.toFixed(2)}, urgency: ${evaluation.urgencyFactor.toFixed(2)}, feasibility: ${evaluation.feasibilityFactor.toFixed(2)})`
          );
        }

        // Store evaluation scores for adaptation comparison
        selectionResult.allEvaluations.forEach(evaluation => {
          this.lastEvaluationScores.set(evaluation.goal.id, evaluation.score);
        });

        // Track world state and detect changes
        const worldSnapshot = this.worldStateTracker.captureSnapshot(worldState, tickCount);
        const worldChange = this.worldStateTracker.detectChanges(worldSnapshot);

        // Check for goal adaptation opportunity
        if (worldChange && worldChange.anyChange && selectionResult.selectedGoal.id !== activeGoal.id) {
          const previousScore = this.lastEvaluationScores.get(activeGoal.id) || 0;
          const newScore = selectionResult.evaluation.score;

          // Only adapt if new goal is objectively better
          const scoreImprovement = newScore - previousScore;
          if (scoreImprovement > 0.05) {
            // Threshold: 5% improvement required
            console.log(
              `  🔄 Goal Adaptation: ${activeGoal.intent} (${previousScore.toFixed(3)}) → ${selectionResult.selectedGoal.intent} (${newScore.toFixed(3)})`
            );
            console.log(`     Reason: ${worldChange.changeDescription}`);

            this.tracer.recordGoalAdapted(
              activeGoal.id,
              activeGoal.intent,
              selectionResult.selectedGoal.id,
              selectionResult.selectedGoal.intent,
              previousScore,
              newScore,
              worldChange.changeDescription,
              `New goal is ${(scoreImprovement * 100).toFixed(1)}% better based on world-state change: ${worldChange.changeDescription}`
            );

            // Update active goal for next tick
            this.currentGoal = selectionResult.selectedGoal;
            this.currentGoalScore = newScore;
          }
        } else if (worldChange === null) {
          // First tick - capture initial score
          this.currentGoalScore = selectionResult.evaluation.score;
        }

        // Story 109: Autonomous Economy Scaling - decide whether to produce workers
        const economySnapshot = this.economyScaler.observeEconomy(worldState);
        this.tracer.recordEconomyObserved(economySnapshot);

        const scalingDecision = this.economyScaler.decideProduction(economySnapshot);
        this.tracer.recordEconomyScalingDecision(scalingDecision);

        if (scalingDecision.shouldProduce && this.gameSession) {
          // Produce a worker
          try {
            const cost = this.economyScaler.getWorkerCost();
            await this.gameSession.commandExecutor.executeCommand({
              type: 'produce',
              unitType: 'worker',
              cost,
            });
            console.log(`  🏭 Produced worker (efficiency: ${(economySnapshot.efficiency * 100).toFixed(1)}%)`);
          } catch (e) {
            console.warn(`  ⚠ Failed to produce worker: ${e}`);
          }
        } else {
          const reason = scalingDecision.reason.split(':')[0];
          console.log(`  ⏸️  Worker production on hold (${reason})`);
        }

        // Story 110: Autonomous Base Expansion
        const dropOffs = this.baseExpansion.observeDropOffs(worldState);
        const fields = this.baseExpansion.observeFields(worldState);
        const avgDist = fields.length > 0
          ? fields.reduce((sum, f) => {
              const dists = dropOffs.map(d => Math.abs(d.position.x - f.position.x) + Math.abs(d.position.y - f.position.y));
              return sum + (dists.length > 0 ? Math.min(...dists) : 50);
            }, 0) / fields.length
          : 0;

        this.tracer.recordExpansionObserved(dropOffs.length, fields.length, avgDist);

        const expansionDecision = this.baseExpansion.decideExpansion(
          dropOffs,
          fields,
          economySnapshot.currentResources
        );
        this.tracer.recordExpansionDecision(expansionDecision);

        if (expansionDecision.shouldExpand && expansionDecision.targetLocation && this.gameSession) {
          try {
            await this.gameSession.commandExecutor.executeCommand({
              type: 'construct',
              buildingType: 'dropoff',
              position: expansionDecision.targetLocation.position,
              cost: this.baseExpansion.getConstructionCost(),
            });
            this.tracer.recordExpansionStarted(
              expansionDecision.targetLocation.position,
              this.baseExpansion.getConstructionCost()
            );
            console.log(`  🏗️  Starting expansion at (${expansionDecision.targetLocation.position.x}, ${expansionDecision.targetLocation.position.y})`);
          } catch (e) {
            console.warn(`  ⚠ Failed to start expansion: ${e}`);
          }
        } else if (!expansionDecision.shouldExpand) {
          const reason = expansionDecision.reason.split(':')[0];
          console.log(`  ⏸️  Expansion on hold (${reason})`);
        }

        // Story 111: Autonomous Building Construction
        const productionBuildings = this.buildingConstruction.observeProductionBuildings(worldState);
        const dropOffsForBuilding = this.buildingConstruction.observeDropOffBuildings(worldState);
        this.tracer.recordBuildingObserved(productionBuildings.length);

        const workerCount = worldState.agents?.length ?? 0;
        const buildingDecision = this.buildingConstruction.decideBuild(
          productionBuildings,
          dropOffsForBuilding,
          economySnapshot.currentResources,
          workerCount
        );
        this.tracer.recordBuildingDecision(buildingDecision);

        if (buildingDecision.shouldBuild && buildingDecision.targetPosition && this.gameSession) {
          try {
            await this.gameSession.commandExecutor.executeCommand({
              type: 'construct',
              buildingType: buildingDecision.buildingType,
              position: buildingDecision.targetPosition,
              cost: this.buildingConstruction.getConstructionCost(),
            });
            this.tracer.recordBuildingStarted(
              buildingDecision.buildingType,
              buildingDecision.targetPosition
            );
            console.log(`  🏗️  Starting construction at (${buildingDecision.targetPosition.x}, ${buildingDecision.targetPosition.y})`);
          } catch (e) {
            console.warn(`  ⚠ Failed to start building construction: ${e}`);
          }
        } else if (!buildingDecision.shouldBuild) {
          const reason = buildingDecision.reason.split(':')[0];
          console.log(`  ⏸️  Building on hold (${reason})`);
        }

        // Story 112: Autonomous Military Unit Production
        const militaryBuildings = this.militaryProduction.observeProductionBuildings(worldState);
        const militaryUnitCount = worldState.agents?.filter((a: any) => a.customData?.isMilitary).length ?? 0;
        this.tracer.recordMilitaryProductionObserved(militaryBuildings.length, militaryUnitCount);

        const militaryDecision = this.militaryProduction.decideMilitaryProduction(
          militaryBuildings,
          economySnapshot.currentResources,
          workerCount,
          militaryUnitCount
        );
        this.tracer.recordMilitaryProductionDecision(militaryDecision);

        if (militaryDecision.shouldProduce && militaryDecision.selectedBuilding && militaryDecision.buildingPosition && this.gameSession) {
          try {
            await this.gameSession.commandExecutor.executeCommand({
              type: 'produce',
              buildingId: militaryDecision.selectedBuilding,
              unitType: militaryDecision.unitType,
              cost: this.militaryProduction.getProductionCost(),
            });
            this.tracer.recordMilitaryProductionStarted(
              militaryDecision.unitType,
              militaryDecision.selectedBuilding,
              militaryDecision.buildingPosition
            );
            console.log(`  🎖️  Starting military production: ${militaryDecision.unitType}`);
          } catch (e) {
            console.warn(`  ⚠ Failed to start military production: ${e}`);
          }
        } else if (!militaryDecision.shouldProduce) {
          const reason = militaryDecision.reason.split(':')[0];
          console.log(`  ⏸️  Military production on hold (${reason})`);
        }

        // Story 113: Autonomous Tactical Positioning
        const tacticallUnits = this.tacticalPositioning.observeMilitaryUnits(worldState);
        this.tracer.recordTacticalPositioningObserved(tacticallUnits.length);

        const friendlyStructures = this.tacticalPositioning.observeFriendlyStructures(worldState);
        const resourceLocations = this.tacticalPositioning.observeResourceLocations(worldState);

        for (const unit of tacticallUnits) {
          const targetPosition = this.tacticalPositioning.determineTacticalPosition(
            unit,
            friendlyStructures,
            resourceLocations,
            tacticallUnits
          );

          const decision = this.tacticalPositioning.decideRepositioning(unit, targetPosition, tacticallUnits);
          this.tracer.recordTacticalPositioningDecision(decision);

          if (decision.shouldMove && this.gameSession) {
            try {
              await this.gameSession.commandExecutor.executeCommand({
                type: 'move',
                unitId: unit.id,
                position: decision.targetPosition,
              });
              this.tracer.recordTacticalMovementStarted(
                unit.id,
                decision.currentPosition,
                decision.targetPosition
              );
              console.log(`  🎯 Unit ${unit.id} repositioning to (${decision.targetPosition.x}, ${decision.targetPosition.y})`);
            } catch (e) {
              console.warn(`  ⚠ Failed to move unit ${unit.id}: ${e}`);
            }
          }
        }

        // Story 114: Autonomous Threat Detection
        const enemyUnits = this.threatDetection.observeEnemyUnits(worldState);
        const enemyStructures = this.threatDetection.observeEnemyStructures(worldState);
        const friendlyAssets = this.threatDetection.observeFriendlyAssets(worldState);

        const threatModel = this.threatDetection.buildThreatModel(
          enemyUnits,
          enemyStructures,
          friendlyAssets
        );

        this.tracer.recordThreatScanCompleted(threatModel.activeThreatCount, threatModel.highestPriority);

        // Record new threats
        const newThreats = this.threatDetection.getNewThreats(threatModel);
        for (const threat of newThreats) {
          this.tracer.recordThreatDetected(threat.id, threat.threatType, threat.position, threat.priority);
          console.log(`  🚨 Threat detected: ${threat.subType} at (${threat.position.x}, ${threat.position.y}), priority: ${(threat.priority * 100).toFixed(0)}%`);
        }

        // Record resolved threats
        const resolvedThreats = this.threatDetection.getResolvedThreats(threatModel);
        for (const threatId of resolvedThreats) {
          this.tracer.recordThreatResolved(threatId);
          console.log(`  ✓ Threat resolved: ${threatId}`);
        }

        this.threatDetection.updateThreatState(threatModel);

        // Story 115: Autonomous Combat Decision Making
        const combatUnits = tacticallUnits.map(u => ({
          id: u.id,
          position: u.position,
          unitType: u.unitType,
          health: 1.0,
        }));

        for (const unit of combatUnits) {
          const combatDecision = this.combatDecisionMaker.decideCombatAction(
            unit,
            threatModel.threats,
            combatUnits.length
          );

          this.tracer.recordCombatDecisionMade(combatDecision);

          if (combatDecision.action === 'attack' && combatDecision.targetPosition && this.gameSession) {
            try {
              await this.gameSession.commandExecutor.executeCommand({
                type: 'attack',
                unitId: unit.id,
                targetId: combatDecision.targetId,
                targetPosition: combatDecision.targetPosition,
              });
              this.tracer.recordCombatAttackIssued(
                unit.id,
                combatDecision.targetId || '',
                combatDecision.targetPosition
              );
              console.log(`  🔥 Unit ${unit.id} attacking target ${combatDecision.targetId}`);
            } catch (e) {
              console.warn(`  ⚠ Failed to issue attack order: ${e}`);
            }
          } else if (combatDecision.action === 'retreat') {
            this.tracer.recordCombatRetreatOrdered(unit.id, combatDecision.reason);
            console.log(`  🏃 Unit ${unit.id} retreating (${combatDecision.reason})`);
          }
        }

        // Story 116: Autonomous Army Coordination
        const armyUnits = combatUnits.map(u => ({
          id: u.id,
          position: u.position,
          unitType: u.unitType,
          health: u.health,
        }));

        const armyGroups = this.armyCoordination.formMilitaryGroups(armyUnits);
        this.tracer.recordArmyGroupsFormed(armyGroups.length, armyUnits.length);

        const unitMap = new Map(armyUnits.map(u => [u.id, u]));
        const armyObjective = threatModel.threats.length > 0
          ? threatModel.threats[0].position
          : null;

        for (const group of armyGroups) {
          const coordDecision = this.armyCoordination.decideGroupAction(
            group,
            unitMap,
            armyObjective
          );

          this.tracer.recordArmyGroupCoordination(coordDecision);

          if (coordDecision.action === 'advance' && armyObjective && this.gameSession) {
            try {
              for (const unitId of coordDecision.unitIds) {
                await this.gameSession.commandExecutor.executeCommand({
                  type: 'move',
                  unitId,
                  position: armyObjective,
                });
              }
              console.log(`  🔗 Group ${group.id} advancing toward objective`);
            } catch (e) {
              console.warn(`  ⚠ Failed to coordinate group movement: ${e}`);
            }
          }
        }

        const newGroups = this.armyCoordination.getNewGroups(armyGroups);
        for (const group of newGroups) {
          console.log(`  🎖️  Army group formed: ${group.id} (${group.unitCount} units)`);
        }

        const disbandedGroups = this.armyCoordination.getDisbandedGroups(armyGroups);
        for (const groupId of disbandedGroups) {
          this.tracer.recordArmyGroupDisbanded(groupId, 'unit_loss');
          console.log(`  💔 Army group disbanded: ${groupId}`);
        }

        this.armyCoordination.updateGroupState(armyGroups);

        // Story 117: Scouting
        const scouts = this.scouting.observeScouts(worldState);
        for (const scout of scouts) {
          this.scouting.recordExploration(scout.position);

          const target = this.scouting.determineScoutTarget(scout.position);
          this.tracer.recordScoutingTargetSelected(scout.id, target.position, target.priority);

          const decision = this.scouting.decideScoutMovement(scout, target);

          if (decision.shouldMove && this.gameSession) {
            try {
              await this.gameSession.commandExecutor.executeCommand({
                type: 'move',
                unitId: scout.id,
                position: decision.targetPosition,
              });
              this.tracer.recordScoutingMovementStarted(
                scout.id,
                decision.currentPosition,
                decision.targetPosition
              );
              console.log(`  🔭 Scout ${scout.id} moving to (${decision.targetPosition.x}, ${decision.targetPosition.y})`);
            } catch (e) {
              console.warn(`  ⚠ Failed to move scout: ${e}`);
            }
          }
        }

        const coverage = this.scouting.getExplorationCoverage();
        if (scouts.length > 0 && coverage > 0) {
          this.tracer.recordRegionExplored(scouts[0].position, coverage);
        }

        // Story 118: Fog of War Reasoning
        for (const threat of threatModel.threats) {
          this.fogOfWar.recordExploration(threat.position);
        }

        const updates = this.fogOfWar.updateEnemyKnowledge(threatModel.threats, this.currentTick);
        for (const update of updates) {
          if (update.eventType === 'enemy_discovered') {
            this.tracer.recordEnemyDiscovered(update.enemyId, update.position, '');
            console.log(`  ⚠️  Enemy discovered at (${update.position.x}, ${update.position.y})`);
          } else if (update.eventType === 'position_updated') {
            this.tracer.recordEnemyPositionUpdated(update.enemyId, update.position);
          } else if (update.eventType === 'enemy_lost') {
            this.tracer.recordEnemyLost(update.enemyId, update.position);
            console.log(`  ❌ Enemy lost: ${update.enemyId}`);
          }
        }

        const fowState = this.fogOfWar.getState(this.currentTick);
        if (fowState.knownEnemies.length > 0) {
          console.log(`  📊 Intelligence: ${(fowState.intelligenceQuality * 100).toFixed(0)}% quality, ${fowState.knownEnemies.length} known enemies`);
        }

        // Story 119: Base Defense
        const structures = this.baseDefense.observeStructures(worldState);
        const availableDefenders = armyUnits.map(u => u.id);

        for (const structure of structures) {
          const assignment = this.baseDefense.assessDefense(structure, threatModel.threats);
          const decision = this.baseDefense.decideDefense(assignment, availableDefenders);

          if (decision.shouldDefend && decision.assignedUnits.length > 0) {
            this.tracer.recordDefenseAssigned(
              decision.structureId,
              decision.assignedUnits,
              decision.defendPosition
            );
            console.log(`  🛡️  Defending structure ${structure.id} with ${decision.assignedUnits.length} unit(s)`);
          }
        }

        // Story 120-124: Combat & Army Systems
        try {
          if (threatModel.threats.length > 0 && armyUnits.length > 0) {
            const threat = threatModel.threats[0];
            const unit = armyUnits[0];
            this.combatExecution.startEngagement(unit.id, threat.id, threat.health || 100);

            const distance = Math.sqrt(Math.pow(unit.position.x - threat.position.x, 2) + Math.pow(unit.position.y - threat.position.y, 2));
            this.unitMicro.decideMicroAction(unit.id, unit.health / 100, unit.position, threat.position, distance);
          }

          for (const group of armyGroups) {
            const need = this.armyReinforcement.assessReinforcement(group.id, group.units.length);
            this.armyReinforcement.shouldReinforce(need, armyUnits.length);

            this.armyStaging.decideStagingReadiness(group.units.length, group.health || 0.5, threatModel.threats.length);
          }

          const economyHealth = economyState.scalingFactor;
          const militaryStrength = armyUnits.length > 0 ? Math.min(1, armyUnits.length / 4) : 0;
          const threatLevel = threatModel.threats.length > 0 ? Math.min(1, threatModel.threats.length / 5) : 0;
          this.attackTiming.decideAttackTiming(economyHealth, militaryStrength, threatLevel);
        } catch (e) {
          console.warn(`⚠️  Combat & Army systems error: ${e}`);
        }

        // Story 102: Handle resource gathering goal with observable events
        let agentPos: { x: number; y: number } | null = null;
        let hasArrived = false;

        if (activeGoal.intent === 'gather-resources') {
          agentPos = this.extractAgentPosition(worldState);
          const availableFields = this.resourceGatherer.detectResourceFields(worldState, agentPos);

          if (availableFields.length > 0) {
            // Record field detection (once per mission)
            if (!this.gatheringDetectedAtTick) {
              availableFields.forEach(field => {
                this.tracer.recordResourceFieldDetected(field.id, field.resourceType, field.amount, field.position);
              });
              this.gatheringDetectedAtTick = tickCount;
            }

            const selection = this.resourceGatherer.selectBestField(availableFields);

            if (selection.selectedField && !this.gatheringTargetFieldId) {
              this.gatheringTargetFieldId = selection.selectedField.id;
              this.gatheringStartTick = tickCount;
              this.gatheringSelectedAtTick = tickCount;

              // Record field selection
              this.tracer.recordResourceFieldSelected(
                selection.selectedField.id,
                selection.selectedField.resourceType,
                selection.evaluations[0]?.score || 0,
                selection.reasoning
              );

              // Record gathering start
              this.tracer.recordGatheringStarted(
                selection.selectedField.id,
                selection.selectedField.resourceType,
                selection.selectedField.amount
              );

              // Store resource fields for progress tracking
              selection.evaluations.forEach(e => {
                this.resourceFields.set(e.field.id, e.field);
              });

              console.log(`  💰 Selected resource field: ${selection.selectedField.resourceType} at (${selection.selectedField.position.x}, ${selection.selectedField.position.y})`);
            }

            // Story 104: Track real worker movement to resource field
            if (this.gatheringTargetFieldId) {
              const targetField = this.resourceFields.get(this.gatheringTargetFieldId);
              if (targetField && agentPos) {
                // Record movement start
                if (!this.gatheringMovementStartTick) {
                  this.gatheringMovementStartTick = tickCount;
                  this.tracer.recordWorkerMovementStarted(
                    this.gatheringTargetFieldId,
                    targetField.position,
                    agentPos
                  );
                }

                // Track movement progress
                const distance = this.workerMovement.calculateDistance(agentPos, targetField.position);
                const initialDistance = this.workerMovement.calculateDistance(
                  { x: agentPos.x, y: agentPos.y },
                  targetField.position
                );
                const pathTraveled = Math.max(0, initialDistance - distance);
                const pathPercent = initialDistance > 0 ? (pathTraveled / initialDistance) * 100 : 100;

                // Detect arrival
                hasArrived = this.workerMovement.detectArrival(agentPos, targetField.position);
                if (hasArrived && !this.gatheringArrivalTick) {
                  this.gatheringArrivalTick = tickCount;
                  this.currentMovementPhase = 'arrived';
                  this.tracer.recordWorkerArrivalDetected(
                    this.gatheringTargetFieldId,
                    agentPos,
                    tickCount - (this.gatheringMovementStartTick || tickCount)
                  );
                  console.log(`  ✓ Worker arrived at ${this.gatheringTargetFieldId}`);
                } else if (!hasArrived) {
                  this.currentMovementPhase = 'traveling';
                  this.tracer.recordWorkerPositionUpdated(
                    this.gatheringTargetFieldId,
                    agentPos,
                    targetField.position,
                    distance,
                    Math.floor(pathPercent)
                  );
                }

                // Begin gathering only after arrival
                if (hasArrived && !this.tracer.getTrace().events.some(e => e.eventType === 'worker_gathering_begun' && (e.data as any).fieldId === this.gatheringTargetFieldId)) {
                  this.currentMovementPhase = 'gathering';
                  this.tracer.recordWorkerGatheringBegun(
                    this.gatheringTargetFieldId,
                    targetField.resourceType,
                    targetField.amount
                  );

                  // Story 105: Issue gather command to game session
                  if (this.gameSession && targetField) {
                    try {
                      await this.gameSession.commandExecutor.executeCommand({
                        type: 'gather',
                        targetId: this.gatheringTargetFieldId,
                        targetPosition: targetField.position,
                      });
                      console.log(`  → Issued gather command for ${this.gatheringTargetFieldId}`);
                    } catch (e) {
                      console.warn(`  ⚠ Failed to issue gather command: ${e}`);
                    }
                  }
                }
              }

              // Track actual resource collection from world state
              if (this.gatheringTargetFieldId && hasArrived) {
                const currentField = this.resourceFields.get(this.gatheringTargetFieldId);
                if (currentField) {
                  const gatheringProgress = this.resourceGatherer.calculateGatheringProgress(
                    this.gatheringTargetFieldId,
                    this.gatheringArrivalTick || tickCount,
                    tickCount,
                    this.resourceFields
                  );

                  if (gatheringProgress) {
                    this.tracer.recordGatheringProgressUpdated(
                      gatheringProgress.targetFieldId,
                      gatheringProgress.resourceType,
                      gatheringProgress.amountCollected,
                      gatheringProgress.amountRemaining,
                      gatheringProgress.percentComplete,
                      gatheringProgress.status
                    );

                    if (gatheringProgress.status === 'complete' && this.lastGatheringProgress < 100) {
                      this.tracer.recordGatheringCompleted(
                        gatheringProgress.targetFieldId,
                        gatheringProgress.resourceType,
                        gatheringProgress.amountCollected
                      );
                      console.log(`  ✓ Gathering complete: ${gatheringProgress.amountCollected} ${gatheringProgress.resourceType}`);

                      // Story 106: Transition to returning resources
                      this.resourcesCollected = gatheringProgress.amountCollected;
                      this.currentMovementPhase = 'returning';
                      this.returningStartTick = tickCount;
                      this.tracer.recordWorkerReturnStarted(
                        gatheringProgress.targetFieldId,
                        gatheringProgress.resourceType,
                        gatheringProgress.amountCollected,
                        this.basePosition
                      );
                      console.log(`  → Starting return to base with ${gatheringProgress.amountCollected} ${gatheringProgress.resourceType}`);

                      this.gatheringTargetFieldId = null;
                    }

                    this.lastGatheringProgress = gatheringProgress.percentComplete;
                  }
                }
              }
            }
          }
        }

        // Story 106: Track return to base
        if (this.currentMovementPhase === 'returning' && agentPos) {
          const hasArrivedAtBase = agentPos.x === this.basePosition.x && agentPos.y === this.basePosition.y;

          if (hasArrivedAtBase) {
            if (!this.returningArrivalTick) {
              this.returningArrivalTick = tickCount;
              this.tracer.recordWorkerReturnComplete(
                this.basePosition,
                this.resourcesCollected,
                tickCount - (this.returningStartTick || tickCount)
              );

              // Issue deposit command
              if (this.gameSession) {
                try {
                  await this.gameSession.commandExecutor.executeCommand({
                    type: 'deposit',
                    targetId: 'base',
                    amount: this.resourcesCollected,
                  });
                  this.tracer.recordResourcesDeposited(this.resourcesCollected);
                  console.log(`  ✓ Deposited ${this.resourcesCollected} resources at base`);

                  // Reset for next gather cycle
                  this.currentMovementPhase = 'idle';
                  this.returningStartTick = null;
                  this.returningArrivalTick = null;
                  this.resourcesCollected = 0;
                } catch (e) {
                  console.warn(`  ⚠ Failed to deposit: ${e}`);
                }
              }
            }
          } else if (this.returningStartTick) {
            // Track return movement
            const distance = this.workerMovement.calculateDistance(agentPos, this.basePosition);
            const startPos = { x: 0, y: 0 };
            const initialDistance = this.workerMovement.calculateDistance(startPos, this.basePosition);
            const pathTraveled = Math.max(0, initialDistance - distance);
            const returnPercent = initialDistance > 0 ? (pathTraveled / initialDistance) * 100 : 100;

            this.tracer.recordWorkerReturnProgress(
              agentPos,
              this.basePosition,
              distance,
              Math.floor(returnPercent)
            );
          }
        }

        // Transition to Executing when we start making progress on the goal
        const currentState = this.goalLifecycleStates.get(activeGoal.id) || 'Queued';
        if (currentState === 'Selected') {
          this.tracer.recordGoalLifecycleTransitioned(
            activeGoal.id,
            activeGoal.intent,
            'Selected',
            'Executing',
            'Plan is being executed'
          );
          this.goalLifecycleStates.set(activeGoal.id, 'Executing');
        }

        const progressData = this.progressEvaluator.evaluateProgress(activeGoal, worldState, tickCount);
        this.tracer.recordGoalProgressUpdated(progressData);

        // Track progress history (keep last 5)
        this.progressHistory.push({ tick: tickCount, percent: progressData.progressPercent });
        if (this.progressHistory.length > 5) {
          this.progressHistory.shift();
        }

        // Check if trend changed
        if (progressData.trend !== this.lastProgressTrend) {
          this.tracer.recordGoalProgressTrendChanged(
            activeGoal.id,
            activeGoal.intent,
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
        if (await this.isGoalSatisfied(activeGoal)) {
          // Transition to Completed
          const execState = this.goalLifecycleStates.get(activeGoal.id) || 'Executing';
          if (execState !== 'Completed') {
            this.tracer.recordGoalLifecycleTransitioned(
              activeGoal.id,
              activeGoal.intent,
              execState,
              'Completed',
              'Goal satisfied'
            );
            this.goalLifecycleStates.set(activeGoal.id, 'Completed');
          }
          const agent = worldState.agents?.[0];
          const position = agent?.customData?.position || 'unknown';
          console.log(
            `  ✓ Mission goal achieved: agent reached target (${this.targetX}, ${this.targetY}) at position ${position}`
          );
          this.tracer.recordGoalCompleted(activeGoal.id, activeGoal.intent, progressData.progressPercent);
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
          goal: this.currentGoal,
          plan: this.currentPlan || undefined,
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

    // Snapshot final gameplay metrics
    this.gameplayMetrics.snapshot(tickCount);

    // Report final metrics
    if (this.runtime) {
      const metrics = this.runtime.getMetrics();
      const gameplayMetrics = this.gameplayMetrics.getLatestMetrics();
      console.log('\n✓ Mission execution complete');
      console.log('Final metrics:');
      console.log(`  Ticks executed: ${metrics.ticksExecuted}`);
      console.log(`  Decisions made: ${metrics.decisionsExecuted}`);
      console.log(`  Commands executed: ${metrics.commandsExecuted}`);
      console.log(`  Errors: ${metrics.errorsEncountered}`);
      console.log(`  Completion: ${this.isComplete ? 'SUCCESS' : 'TIMEOUT'}`);
      console.log('\nGameplay metrics:');
      console.log(`  Economy efficiency: ${gameplayMetrics.economyEfficiency.toFixed(2)}`);
      console.log(`  Worker utilization: ${(gameplayMetrics.workerUtilization * 100).toFixed(1)}%`);
      console.log(`  Military strength: ${(gameplayMetrics.militaryStrength * 100).toFixed(1)}%`);
      console.log(`  APM: ${gameplayMetrics.apm.toFixed(2)}`);
      console.log(`  Combat efficiency: ${(gameplayMetrics.combatEfficiency * 100).toFixed(1)}%`);
      console.log(`  Overall score: ${gameplayMetrics.totalScore.toFixed(3)}`);
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
   * Get gameplay metrics (economy, military, combat efficiency, etc).
   */
  getGameplayMetrics() {
    return this.gameplayMetrics.getLatestMetrics();
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
   * Get the agent runtime for diagnostic purposes.
   */
  getRuntime(): AgentRuntime | null {
    return this.runtime;
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
