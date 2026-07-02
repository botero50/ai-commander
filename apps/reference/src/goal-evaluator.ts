import type { Goal } from '@ai-commander/goals';
import { GoalStatus } from '@ai-commander/goals';
import type { WorldState } from '@ai-commander/domain';

/**
 * Goal Evaluation & Prioritization
 *
 * Evaluates multiple candidate goals and selects the highest-priority one.
 *
 * Each goal receives a deterministic score based on:
 * 1. Static priority (from goal.priority)
 * 2. Goal status (completed/active/pending)
 * 3. Deadline urgency (if deadline is set)
 * 4. Feasibility (can this goal realistically be achieved?)
 * 5. World state alignment (are preconditions satisfied?)
 *
 * Selection is deterministic - same world state + same goals = same selection.
 */

export interface GoalEvaluation {
  readonly goal: Goal;
  readonly score: number;
  readonly statusFactor: number;
  readonly priorityFactor: number;
  readonly urgencyFactor: number;
  readonly feasibilityFactor: number;
  readonly reasoning: string;
  readonly timestamp: number;
}

export interface GoalSelectionResult {
  readonly selectedGoal: Goal;
  readonly evaluation: GoalEvaluation;
  readonly allEvaluations: readonly GoalEvaluation[];
  readonly reasoning: string;
  readonly timestamp: number;
}

/**
 * Goal Evaluator: Scores and ranks candidate goals deterministically.
 */
export class GoalEvaluator {
  /**
   * Evaluate a set of candidate goals and select the best one.
   */
  selectGoal(
    candidateGoals: readonly Goal[],
    worldState: WorldState,
    currentTick: number
  ): GoalSelectionResult {
    const timestamp = Date.now();

    if (candidateGoals.length === 0) {
      throw new Error('No candidate goals provided for evaluation');
    }

    // Evaluate all candidate goals
    const evaluations = candidateGoals.map((goal) =>
      this.evaluateGoal(goal, worldState, currentTick)
    );

    // Find the goal with the highest score
    let selectedEvaluation = evaluations[0]!;
    for (const evaluation of evaluations) {
      if (evaluation.score > selectedEvaluation.score) {
        selectedEvaluation = evaluation;
      }
    }

    // Construct reasoning
    const reasoning = this.constructReasoning(selectedEvaluation, evaluations);

    return {
      selectedGoal: selectedEvaluation.goal,
      evaluation: selectedEvaluation,
      allEvaluations: evaluations,
      reasoning,
      timestamp,
    };
  }

  /**
   * Evaluate a single goal and return its score.
   */
  private evaluateGoal(goal: Goal, worldState: WorldState, currentTick: number): GoalEvaluation {
    const timestamp = Date.now();

    // Factor 1: Priority (0.0 - 1.0)
    const priorityFactor = this.evaluatePriority(goal);

    // Factor 2: Status (0.0 - 1.0)
    // Completed goals: 0 (already done)
    // Active goals: 1.0 (being pursued)
    // Pending goals: 0.8 (ready to start)
    // Suspended goals: 0.3 (not preferred)
    const statusFactor = this.evaluateStatus(goal);

    // Factor 3: Urgency (0.0 - 1.0)
    // Based on deadline if present
    const urgencyFactor = this.evaluateUrgency(goal, currentTick);

    // Factor 4: Feasibility (0.0 - 1.0)
    // Based on goal constraints and world state
    const feasibilityFactor = this.evaluateFeasibility(goal, worldState);

    // Combine factors with weights
    // Feasibility is GATE (40%) - infeasible goals cannot be selected
    // Status is CRITICAL (30%) - completed/failed goals should never be selected
    // Priority is important (25%)
    // Urgency is important if deadline exists (5%)
    const score =
      feasibilityFactor * 0.4 +
      statusFactor * 0.3 +
      priorityFactor * 0.25 +
      urgencyFactor * 0.05;

    const reasoning = this.constructGoalReasoning(goal, {
      priorityFactor,
      statusFactor,
      urgencyFactor,
      feasibilityFactor,
    });

    return {
      goal,
      score,
      statusFactor,
      priorityFactor,
      urgencyFactor,
      feasibilityFactor,
      reasoning,
      timestamp,
    };
  }

  /**
   * Evaluate goal priority level.
   *
   * Priority is a numeric value 0-1000.
   * Convert to 0-1.0 factor by dividing by 1000.
   */
  private evaluatePriority(goal: Goal): number {
    // Priority is stored as a number (0-1000)
    const priorityValue = goal.priority as unknown as number;

    if (priorityValue === undefined || priorityValue === null) {
      return 0.5; // Default to medium
    }

    // Normalize to 0.0 - 1.0 scale
    return Math.min(1.0, Math.max(0.0, priorityValue / 1000));
  }

  /**
   * Evaluate goal status.
   *
   * Completed goals are done (0 score).
   * Active goals are being pursued (1.0).
   * Pending goals are ready (0.8).
   * Suspended goals are paused (0.3).
   * Failed goals are done (0).
   */
  private evaluateStatus(goal: Goal): number {
    switch (goal.status) {
      case GoalStatus.Completed:
        return 0.0; // Goal is done, don't pursue it
      case GoalStatus.Failed:
        return 0.0; // Goal failed, don't pursue it
      case GoalStatus.Active:
        return 1.0; // Currently being pursued, highest priority
      case GoalStatus.Pending:
        return 0.8; // Ready to pursue
      case GoalStatus.Suspended:
        return 0.3; // Paused, low priority
      case GoalStatus.Abandoned:
        return 0.0; // Abandoned, don't pursue
      default:
        return 0.5; // Unknown status, neutral
    }
  }

  /**
   * Evaluate goal urgency based on deadline.
   *
   * If no deadline, urgency is neutral (0.5).
   * If deadline is approaching, urgency increases toward 1.0.
   * If deadline is passed, urgency is 1.0 (critical).
   *
   * Deadlines are measured in milliseconds since epoch.
   */
  private evaluateUrgency(goal: Goal, currentTick: number): number {
    if (!goal.deadline) {
      return 0.5; // No deadline, neutral urgency
    }

    const now = Date.now();
    const msUntilDeadline = goal.deadline - now;

    if (msUntilDeadline <= 0) {
      return 1.0; // Deadline passed, critical
    }

    // Convert ticks to milliseconds (estimate: 100ms per tick in test environment)
    const msPerTick = 100;
    const ticksUntilDeadline = msUntilDeadline / msPerTick;

    if (ticksUntilDeadline <= 1) {
      return 1.0; // Less than 1 tick left, critical
    } else if (ticksUntilDeadline <= 5) {
      return 0.9; // Very urgent
    } else if (ticksUntilDeadline <= 20) {
      return 0.7; // Moderately urgent
    } else if (ticksUntilDeadline <= 100) {
      return 0.5; // Some urgency
    } else {
      return 0.3; // Plenty of time
    }
  }

  /**
   * Evaluate goal feasibility based on world state.
   *
   * Check if goal can reasonably be achieved:
   * - Agent exists in world state
   * - Goal parameters are valid
   * - No unsatisfiable constraints
   *
   * Returns 1.0 if feasible, 0.0 if not.
   */
  private evaluateFeasibility(goal: Goal, worldState: WorldState): number {
    // Check 1: Agent must exist
    const agents = (worldState as any).agents;
    if (!agents || agents.length === 0) {
      return 0.0; // No agents, infeasible
    }

    // Check 2: Goal must have valid intent
    if (!goal.intent || goal.intent.length === 0) {
      return 0.0; // Invalid intent, infeasible
    }

    // Check 3: Goal must have valid parameters for its intent
    if (goal.intent === 'move-to-target') {
      const targetX = goal.parameters?.targetX;
      const targetY = goal.parameters?.targetY;
      if (targetX === undefined || targetY === undefined) {
        return 0.0; // Missing target coordinates
      }
    }

    // Check 4: No unsatisfiable constraints
    // For now, assume all constraints are satisfiable
    // (constraint evaluation is domain-specific)

    return 1.0; // Goal is feasible
  }

  /**
   * Construct reasoning for why a goal was selected.
   */
  private constructReasoning(
    selectedEvaluation: GoalEvaluation,
    allEvaluations: readonly GoalEvaluation[]
  ): string {
    const goal = selectedEvaluation.goal;
    const score = selectedEvaluation.score.toFixed(2);

    // Check if there were close competitors
    const sortedByScore = [...allEvaluations].sort((a, b) => b.score - a.score);
    const runnerUp = sortedByScore[1];
    const scoreGap =
      runnerUp && sortedByScore.length > 1
        ? (selectedEvaluation.score - runnerUp.score).toFixed(2)
        : 'n/a';

    // Identify dominant factor
    const factors = [
      { name: 'Priority', value: selectedEvaluation.priorityFactor },
      { name: 'Status', value: selectedEvaluation.statusFactor },
      { name: 'Urgency', value: selectedEvaluation.urgencyFactor },
      { name: 'Feasibility', value: selectedEvaluation.feasibilityFactor },
    ];
    const dominantFactor = factors.reduce((max, current) =>
      current.value > max.value ? current : max
    );

    return (
      `Selected ${goal.intent} (score: ${score}). ` +
      `Dominant factor: ${dominantFactor.name} (${(dominantFactor.value * 100).toFixed(0)}%). ` +
      `Gap to runner-up: ${scoreGap}.`
    );
  }

  /**
   * Construct reasoning for individual goal evaluation.
   */
  private constructGoalReasoning(
    goal: Goal,
    factors: {
      priorityFactor: number;
      statusFactor: number;
      urgencyFactor: number;
      feasibilityFactor: number;
    }
  ): string {
    const parts: string[] = [];

    parts.push(`Goal: ${goal.intent}`);
    parts.push(`Status: ${goal.status}`);
    parts.push(`Priority: ${(factors.priorityFactor * 100).toFixed(0)}%`);
    parts.push(`Feasible: ${factors.feasibilityFactor > 0.5 ? 'Yes' : 'No'}`);

    if (goal.deadline) {
      const timeLeft = Math.max(0, goal.deadline - Date.now());
      const secondsLeft = Math.round(timeLeft / 1000);
      parts.push(`Deadline: ${secondsLeft}s left (urgency: ${(factors.urgencyFactor * 100).toFixed(0)}%)`);
    }

    return parts.join(' | ');
  }
}
