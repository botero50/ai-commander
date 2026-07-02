import type { Goal } from '@ai-commander/goals';
import type { WorldState } from '@ai-commander/domain';

/**
 * Goal Progress Evaluation
 *
 * Measures progress toward goal achievement using observable world state.
 * Does NOT estimate progress from executed commands.
 * Uses measurable evidence: distance, counts, resources, structure completion.
 *
 * Progress is deterministic based on world state only.
 */

export type ProgressTrend = 'improving' | 'stable' | 'regressing';

export interface GoalProgress {
  readonly goalId: string;
  readonly goalIntent: string;
  readonly progressPercent: number; // 0-100%
  readonly progressReason: string;
  readonly trend: ProgressTrend;
  readonly lastUpdateTick: number;
  readonly lastProgressTick: number | null;
  readonly evidence: Record<string, unknown>;
  readonly timestamp: number;
}

/**
 * Progress Evaluator: Measures goal progress from world state.
 *
 * Calculates progress percentage (0-100) based on:
 * 1. Goal intent (determines measurement type)
 * 2. World state (provides observable evidence)
 * 3. Previous progress (tracks trend)
 */
export class GoalProgressEvaluator {
  private progressHistory: Map<string, GoalProgress[]> = new Map();

  /**
   * Evaluate progress toward a goal.
   */
  evaluateProgress(
    goal: Goal,
    worldState: WorldState,
    currentTick: number
  ): GoalProgress {
    const timestamp = Date.now();

    // Determine progress based on goal intent
    let progressPercent = 0;
    let progressReason = '';
    let evidence: Record<string, unknown> = {};

    if (goal.intent === 'move-to-target') {
      const result = this.evaluateMoveToTargetProgress(goal, worldState);
      progressPercent = result.percent;
      progressReason = result.reason;
      evidence = result.evidence;
    } else {
      // Unknown goal type - cannot measure progress
      progressPercent = 0;
      progressReason = `Unknown goal intent: ${goal.intent}`;
      evidence = { intent: goal.intent };
    }

    // Determine trend from history
    const trend = this.calculateTrend(goal.id, progressPercent, currentTick);

    // Get previous progress tick
    const history = this.progressHistory.get(goal.id) || [];
    const lastProgressTick = this.getLastProgressTick(progressPercent, history);

    // Create progress record
    const progress: GoalProgress = {
      goalId: goal.id,
      goalIntent: goal.intent,
      progressPercent,
      progressReason,
      trend,
      lastUpdateTick: currentTick,
      lastProgressTick,
      evidence,
      timestamp,
    };

    // Store in history for trend calculation
    if (!this.progressHistory.has(goal.id)) {
      this.progressHistory.set(goal.id, []);
    }
    this.progressHistory.get(goal.id)!.push(progress);

    // Keep only recent history (last 20 records)
    const goalHistory = this.progressHistory.get(goal.id)!;
    if (goalHistory.length > 20) {
      goalHistory.shift();
    }

    return progress;
  }

  /**
   * Evaluate progress for move-to-target goals.
   *
   * Measures: distance from current position to target
   * Progress = (initial_distance - current_distance) / initial_distance * 100%
   */
  private evaluateMoveToTargetProgress(
    goal: Goal,
    worldState: WorldState
  ): {
    percent: number;
    reason: string;
    evidence: Record<string, unknown>;
  } {
    const targetX = goal.parameters?.targetX as number | undefined;
    const targetY = goal.parameters?.targetY as number | undefined;

    if (targetX === undefined || targetY === undefined) {
      return {
        percent: 0,
        reason: 'Goal missing target coordinates',
        evidence: { targetX, targetY },
      };
    }

    // Get agent position from world state
    const agents = (worldState as any).agents;
    if (!agents || agents.length === 0) {
      return {
        percent: 0,
        reason: 'No agent in world state',
        evidence: { agentCount: 0 },
      };
    }

    const agent = agents[0];
    if (!agent || !agent.customData?.position) {
      return {
        percent: 0,
        reason: 'Agent position unknown in world state',
        evidence: { agent: agent?.id },
      };
    }

    // Parse current position
    const positionStr = String(agent.customData.position);
    const match = positionStr.match(/^(\d+),(\d+)$/);
    if (!match) {
      return {
        percent: 0,
        reason: 'Agent position format invalid',
        evidence: { position: positionStr },
      };
    }

    const currentX = parseInt(match[1] || '0', 10);
    const currentY = parseInt(match[2] || '0', 10);

    // Check if goal is achieved
    if (currentX === targetX && currentY === targetY) {
      return {
        percent: 100,
        reason: `Agent reached target (${targetX}, ${targetY})`,
        evidence: { currentX, currentY, targetX, targetY, distance: 0 },
      };
    }

    // Calculate distance using Manhattan distance
    const currentDistance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);

    // Initial distance (from origin)
    const initialDistance = Math.abs(targetX - 0) + Math.abs(targetY - 0);

    // Calculate progress as percentage
    // progress = (distance_covered / total_distance) * 100
    // distance_covered = initial_distance - current_distance
    const distanceCovered = initialDistance - currentDistance;
    const progressPercent = initialDistance > 0 ? (distanceCovered / initialDistance) * 100 : 0;

    // Clamp to 0-100
    const clampedPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));

    return {
      percent: clampedPercent,
      reason: `Agent at (${currentX}, ${currentY}), target (${targetX}, ${targetY}), ${currentDistance} units away`,
      evidence: {
        currentX,
        currentY,
        targetX,
        targetY,
        currentDistance,
        initialDistance,
        distanceCovered,
      },
    };
  }

  /**
   * Calculate trend by comparing recent progress.
   *
   * Improving: progress increased in last update
   * Stable: progress unchanged in last 3 updates
   * Regressing: progress decreased in last update
   */
  private calculateTrend(
    goalId: string,
    currentProgress: number,
    currentTick: number
  ): ProgressTrend {
    const history = this.progressHistory.get(goalId) || [];

    if (history.length === 0) {
      return 'stable'; // First evaluation
    }

    const lastProgress = history[history.length - 1]!;
    const lastProgressPercent = lastProgress.progressPercent;

    // Check trend
    if (currentProgress > lastProgressPercent) {
      return 'improving';
    } else if (currentProgress < lastProgressPercent) {
      return 'regressing';
    } else {
      return 'stable';
    }
  }

  /**
   * Get tick when progress last changed (improved or regressed).
   */
  private getLastProgressTick(
    currentProgress: number,
    history: GoalProgress[]
  ): number | null {
    if (history.length === 0) {
      return null;
    }

    // Work backwards through history
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]!.progressPercent !== currentProgress) {
        return history[i]!.lastUpdateTick;
      }
    }

    // No change in history
    return null;
  }

  /**
   * Get progress history for a goal.
   */
  getProgressHistory(goalId: string): readonly GoalProgress[] {
    return this.progressHistory.get(goalId) || [];
  }

  /**
   * Clear history (useful for tests or new missions).
   */
  clearHistory(): void {
    this.progressHistory.clear();
  }
}
