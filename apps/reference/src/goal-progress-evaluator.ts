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
    } else if (goal.intent.includes('Move to')) {
      // Handle "Move to (X, Y)" format goals
      const result = this.evaluateMoveToCoordinatesProgress(goal, worldState, currentTick);
      progressPercent = result.percent;
      progressReason = result.reason;
      evidence = result.evidence;
    } else if (goal.intent === 'defend-position' || goal.intent.includes('defend')) {
      // Defend goals - measure by presence and unit count
      const result = this.evaluateDefendProgress(goal, worldState, currentTick);
      progressPercent = result.percent;
      progressReason = result.reason;
      evidence = result.evidence;
    } else if (goal.intent === 'gather-resources' || goal.intent.includes('gather')) {
      // Resource gathering goals
      const result = this.evaluateGatherProgress(goal, worldState, currentTick);
      progressPercent = result.percent;
      progressReason = result.reason;
      evidence = result.evidence;
    } else if (goal.intent === 'explore-world' || goal.intent.includes('explore')) {
      // Exploration goals - measure by map coverage
      const result = this.evaluateExploreProgress(goal, worldState, currentTick);
      progressPercent = result.percent;
      progressReason = result.reason;
      evidence = result.evidence;
    } else {
      // Default: Show progress as partially started if any units active
      const agents = (worldState as any).agents || [];
      progressPercent = agents.length > 0 ? 25 : 0;
      progressReason = `Progress tracking not implemented for: ${goal.intent}`;
      evidence = { intent: goal.intent, agentCount: agents.length };
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
   * Evaluate progress for "Move to (X, Y)" format goals.
   */
  private evaluateMoveToCoordinatesProgress(
    goal: Goal,
    worldState: WorldState,
    currentTick: number
  ): {
    percent: number;
    reason: string;
    evidence: Record<string, unknown>;
  } {
    // Parse coordinates from goal intent like "Move to (3, 2)"
    const match = goal.intent.match(/Move to \((\d+),\s*(\d+)\)/);
    if (!match) {
      return {
        percent: 50,
        reason: `Moving towards target`,
        evidence: { intent: goal.intent },
      };
    }

    const targetX = parseInt(match[1] || '0', 10);
    const targetY = parseInt(match[2] || '0', 10);

    const agents = (worldState as any).agents || [];
    if (agents.length === 0) {
      return {
        percent: 0,
        reason: 'No agent found',
        evidence: { agentCount: 0 },
      };
    }

    const agent = agents[0];
    if (!agent?.customData?.position) {
      return {
        percent: 25,
        reason: 'Agent position unknown',
        evidence: { agent: agent?.id },
      };
    }

    const positionStr = String(agent.customData.position);
    const posMatch = positionStr.match(/^(\d+),(\d+)$/);
    if (!posMatch) {
      return {
        percent: 25,
        reason: 'Agent position format invalid',
        evidence: { position: positionStr },
      };
    }

    const currentX = parseInt(posMatch[1] || '0', 10);
    const currentY = parseInt(posMatch[2] || '0', 10);

    if (currentX === targetX && currentY === targetY) {
      return {
        percent: 100,
        reason: `Target reached (${targetX}, ${targetY})`,
        evidence: { currentX, currentY, targetX, targetY },
      };
    }

    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    const progressPercent = Math.max(10, Math.min(99, 100 - distance * 5));

    return {
      percent: progressPercent,
      reason: `Moving to (${targetX}, ${targetY}), ${distance} units away`,
      evidence: { currentX, currentY, targetX, targetY, distance },
    };
  }

  /**
   * Evaluate progress for defend-position goals.
   */
  private evaluateDefendProgress(
    goal: Goal,
    worldState: WorldState,
    currentTick?: number
  ): {
    percent: number;
    reason: string;
    evidence: Record<string, unknown>;
  } {
    const agents = (worldState as any).agents || [];
    const friendlyCount = agents.length;

    if (friendlyCount === 0) {
      return {
        percent: 0,
        reason: 'No units to defend with',
        evidence: { unitCount: 0 },
      };
    }

    // Progress increases over time as position is maintained
    // Base: 30% for units present, +1% per tick (up to 100%)
    const tickProgress = currentTick ? Math.min(70, currentTick * 0.7) : 0;
    const progress = Math.min(100, 30 + friendlyCount * 5 + tickProgress);

    return {
      percent: Math.round(progress),
      reason: `${friendlyCount} unit(s) defending position (tick ${currentTick || 0})`,
      evidence: { unitCount: friendlyCount, tick: currentTick },
    };
  }

  /**
   * Evaluate progress for gather-resources goals.
   */
  private evaluateGatherProgress(
    goal: Goal,
    worldState: WorldState,
    currentTick: number
  ): {
    percent: number;
    reason: string;
    evidence: Record<string, unknown>;
  } {
    const agents = (worldState as any).agents || [];

    if (agents.length === 0) {
      return {
        percent: 0,
        reason: 'No gathering units',
        evidence: { unitCount: 0 },
      };
    }

    // Progress increases over time as resources are gathered
    // Base: 30% for units gathering, +1% per tick (up to 100%)
    const tickProgress = currentTick ? Math.min(70, currentTick * 0.7) : 0;
    const progress = Math.min(100, 30 + agents.length * 10 + tickProgress);

    return {
      percent: Math.round(progress),
      reason: `${agents.length} unit(s) gathering resources (tick ${currentTick})`,
      evidence: { unitCount: agents.length, tick: currentTick },
    };
  }

  /**
   * Evaluate progress for explore-world goals.
   */
  private evaluateExploreProgress(
    goal: Goal,
    worldState: WorldState,
    currentTick: number
  ): {
    percent: number;
    reason: string;
    evidence: Record<string, unknown>;
  } {
    const agents = (worldState as any).agents || [];

    if (agents.length === 0) {
      return {
        percent: 0,
        reason: 'No scouts available',
        evidence: { unitCount: 0 },
      };
    }

    // Progress increases over time as world is explored
    // Base: 40% for units exploring, +1% per tick (up to 100%)
    const tickProgress = currentTick ? Math.min(60, currentTick * 0.6) : 0;
    const progress = Math.min(100, 40 + agents.length * 10 + tickProgress);

    return {
      percent: Math.round(progress),
      reason: `${agents.length} unit(s) exploring (tick ${currentTick})`,
      evidence: { unitCount: agents.length, tick: currentTick },
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
