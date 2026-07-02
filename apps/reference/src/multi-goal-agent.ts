import type { Goal } from '@ai-commander/goals';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel, createGoalPriority } from '@ai-commander/goals';
import { MissionAgent } from './mission-agent.js';
import { GoalEvaluator } from './goal-evaluator.js';
import { ExecutionTracer } from './execution-trace.js';
import type { WorldState } from '@ai-commander/domain';

/**
 * Multi-Goal Agent: Autonomously selects goals based on priority and world state.
 *
 * Unlike MissionAgent which executes a single hardcoded goal,
 * MultiGoalAgent:
 * 1. Maintains multiple candidate goals
 * 2. Evaluates them deterministically each cycle
 * 3. Selects the highest-priority one
 * 4. Switches goals if priorities change
 * 5. Records all goal evaluation and selection events
 *
 * This demonstrates strategic decision-making rather than scripted execution.
 */
export class MultiGoalAgent {
  private candidateGoals: Goal[];
  private currentGoal: Goal | null = null;
  private currentTick: number = 0;
  private goalEvaluator = new GoalEvaluator();
  private missionAgent: MissionAgent | null = null;
  private tracer: ExecutionTracer;

  constructor(candidateGoalTargets: Array<{ x: number; y: number; priority: string }>) {
    // Create candidate goals from targets
    this.candidateGoals = candidateGoalTargets.map((target, index) =>
      createGoal({
        id: createGoalId(`goal-target-${target.x}-${target.y}`),
        intent: 'move-to-target',
        status: GoalStatus.Pending,
        priority: createGoalPriority(this.toPriorityLevel(target.priority)),
        parameters: {
          targetX: target.x,
          targetY: target.y,
        },
      })
    );

    this.tracer = new ExecutionTracer(`multi-goal-mission`, -1, -1);
  }

  /**
   * Convert priority string to numeric GoalPriorityLevel.
   */
  private toPriorityLevel(priority: string): number {
    const priorityMap: Record<string, number> = {
      'CRITICAL': 1000,
      'HIGH': 750,
      'NORMAL': 500,
      'LOW': 250,
      'TRIVIAL': 100,
    };

    return priorityMap[priority.toUpperCase()] || 500; // Default to NORMAL
  }

  /**
   * Run the multi-goal mission.
   *
   * 1. Evaluate all candidate goals
   * 2. Select the highest-priority one
   * 3. Execute a mission toward that goal
   * 4. Record all goal evaluations and selections
   */
  async run(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Multi-Goal Agent: Strategic Goal Selection                     ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Initial goal evaluation and selection
    await this.evaluateAndSelectGoal();

    if (!this.currentGoal) {
      console.log('No valid goals to execute');
      return;
    }

    // Execute mission toward selected goal
    console.log(`\nExecuting mission toward: ${this.currentGoal.intent}`);
    console.log(`Target: (${this.currentGoal.parameters.targetX}, ${this.currentGoal.parameters.targetY})\n`);

    const targetX = this.currentGoal.parameters.targetX as number;
    const targetY = this.currentGoal.parameters.targetY as number;

    this.missionAgent = new MissionAgent(targetX, targetY);
    await this.missionAgent.initialize();

    // Run mission with periodic goal re-evaluation
    await this.runWithGoalReevaluation();

    await this.missionAgent.shutdown();

    // Report results
    this.reportResults();
  }

  /**
   * Run mission with periodic goal re-evaluation.
   *
   * Every 10 ticks, re-evaluate all goals and switch if priorities change.
   */
  private async runWithGoalReevaluation(): Promise<void> {
    if (!this.missionAgent) return;

    // For this demonstration, we execute the mission without interruption
    // In a real system, we would re-evaluate goals during mission execution
    await this.missionAgent.run();
  }

  /**
   * Evaluate all candidate goals and select the highest-priority one.
   */
  private async evaluateAndSelectGoal(): Promise<void> {
    const worldState = await this.getWorldState();

    console.log('Evaluating candidate goals...\n');

    const selectionResult = this.goalEvaluator.selectGoal(
      this.candidateGoals,
      worldState,
      this.currentTick
    );

    // Record all evaluations in trace
    for (const evaluation of selectionResult.allEvaluations) {
      this.tracer.recordGoalEvaluated(evaluation.goal, evaluation);
    }

    // Check if goal is changing
    const previousGoal = this.currentGoal;
    this.currentGoal = selectionResult.selectedGoal;

    if (previousGoal && previousGoal.id !== this.currentGoal.id) {
      this.tracer.recordGoalChanged(
        previousGoal,
        this.currentGoal,
        `Priority changed: ${selectionResult.reasoning}`
      );
      console.log(`🔄 Goal changed from ${previousGoal.intent} to ${this.currentGoal.intent}`);
    } else {
      this.tracer.recordGoalSelected(this.currentGoal, selectionResult.reasoning);
    }

    // Display evaluation results
    console.log('Goal Evaluation Results:');
    console.log('═'.repeat(64));
    for (const evaluation of selectionResult.allEvaluations) {
      const indicator = evaluation.goal.id === this.currentGoal.id ? '⭐' : '  ';
      const score = (evaluation.score * 100).toFixed(1);
      console.log(`${indicator} ${evaluation.goal.intent}`);
      console.log(`   Score: ${score}% | Priority: ${(evaluation.priorityFactor * 100).toFixed(0)}% | Status: ${(evaluation.statusFactor * 100).toFixed(0)}%`);
      console.log(`   ${evaluation.reasoning}`);
      console.log('');
    }

    console.log('═'.repeat(64));
    console.log(`\n✓ Selected Goal: ${this.currentGoal.intent}`);
    console.log(`  ${selectionResult.reasoning}\n`);
  }

  /**
   * Get world state from mission agent.
   */
  private async getWorldState(): Promise<WorldState> {
    // For now, return a mock world state
    // In a real system, this would come from the game adapter
    return {
      agents: [
        {
          id: 'agent-0',
          customData: {
            position: '0,0',
          },
        },
      ],
    } as any;
  }

  /**
   * Report final results.
   */
  private reportResults(): void {
    if (!this.missionAgent) return;

    const trace = this.missionAgent.getTrace();
    const metrics = this.missionAgent.getMetrics();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Mission Results                                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Status: ${trace.status === 'completed' ? '✓ COMPLETED' : '✗ FAILED'}`);
    console.log(`Goal: ${this.currentGoal?.intent}`);
    console.log(`Target: (${this.currentGoal?.parameters.targetX}, ${this.currentGoal?.parameters.targetY})`);

    if (metrics) {
      const goalEvals = trace.events.filter((e) => e.eventType === 'goal_evaluated').length;
      const goalSelections = trace.events.filter((e) => e.eventType === 'goal_selected').length;
      const goalChanges = trace.events.filter((e) => e.eventType === 'goal_changed').length;

      console.log(`\nGoal Evaluation Metrics:`);
      console.log(`  Evaluations: ${goalEvals}`);
      console.log(`  Selections: ${goalSelections}`);
      console.log(`  Changes: ${goalChanges}`);
      console.log(`  Total Ticks: ${metrics.totalTicks}`);
      console.log(`  Commands Executed: ${metrics.commandsExecuted}`);
    }

    console.log('');
  }

  /**
   * Get the execution trace.
   */
  getTrace() {
    return this.tracer.getTrace();
  }
}
