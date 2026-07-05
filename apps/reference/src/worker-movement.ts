/**
 * Worker Movement: Track real pathfinding from worker to resource field.
 *
 * Story 104: Real Worker Pathfinding
 *
 * Tracks worker movement through phases:
 * - idle: not moving toward any resource
 * - traveling: moving toward resource field
 * - arrived: at resource field, ready to gather
 * - gathering: currently gathering resources
 * - returning: returning with gathered resources (future)
 *
 * Uses Manhattan distance pathfinding to calculate path,
 * detects arrival from observable world state position.
 */

import type { WorldState } from '@ai-commander/domain';

export type MovementPhase = 'idle' | 'traveling' | 'arrived' | 'gathering' | 'returning' | 'complete';

export interface WorkerPosition {
  readonly x: number;
  readonly y: number;
}

export interface ResourceFieldTarget {
  readonly fieldId: string;
  readonly position: WorkerPosition;
  readonly resourceType: string;
}

export interface MovementProgress {
  readonly phase: MovementPhase;
  readonly currentPosition: WorkerPosition;
  readonly targetPosition: WorkerPosition;
  readonly distanceRemaining: number;
  readonly pathLength: number;
  readonly pathTraveled: number;
  readonly percentComplete: number;
  readonly ticksElapsed: number;
  readonly arrivalTick: number | undefined;
}

export class WorkerMovement {
  /**
   * Calculate Manhattan distance between two positions.
   */
  calculateDistance(from: WorkerPosition, to: WorkerPosition): number {
    return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  }

  /**
   * Generate movement path from current position to target using Manhattan distance.
   * Returns array of waypoints (position + direction).
   */
  generatePath(from: WorkerPosition, to: WorkerPosition): WorkerPosition[] {
    const path: WorkerPosition[] = [];

    // Move along X axis
    if (to.x !== from.x) {
      const dx = to.x > from.x ? 1 : -1;
      for (let x = from.x + dx; x !== to.x + dx; x += dx) {
        path.push({ x, y: from.y });
      }
    }

    // Move along Y axis
    if (to.y !== from.y) {
      const dy = to.y > from.y ? 1 : -1;
      const startX = to.x;
      for (let y = from.y + dy; y !== to.y + dy; y += dy) {
        path.push({ x: startX, y });
      }
    }

    // If no movement needed, return target position
    if (path.length === 0) {
      path.push(to);
    }

    return path;
  }

  /**
   * Extract worker position from world state.
   */
  extractWorkerPosition(worldState: WorldState): WorkerPosition | null {
    try {
      if (!worldState || !worldState.agents || worldState.agents.length === 0) {
        return null;
      }

      const agent = worldState.agents[0];
      if (!agent || !agent.customData || agent.customData.position === undefined) {
        return null;
      }

      const positionStr = agent.customData.position as string;
      const match = positionStr.match(/^(\d+),(\d+)$/);
      if (match && match[1] && match[2]) {
        return {
          x: parseInt(match[1], 10),
          y: parseInt(match[2], 10),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Detect arrival at target position using world state.
   */
  detectArrival(currentPosition: WorkerPosition, targetPosition: WorkerPosition): boolean {
    return currentPosition.x === targetPosition.x && currentPosition.y === targetPosition.y;
  }

  /**
   * Calculate movement progress toward target.
   */
  calculateProgress(
    currentPosition: WorkerPosition,
    targetPosition: WorkerPosition,
    phase: MovementPhase,
    startTick: number,
    currentTick: number,
    arrivalTick?: number
  ): MovementProgress {
    const pathLength = this.calculateDistance({ x: 0, y: 0 }, targetPosition);
    const distanceRemaining = this.calculateDistance(currentPosition, targetPosition);
    const pathTraveled = Math.max(0, pathLength - distanceRemaining);
    const percentComplete = pathLength > 0 ? (pathTraveled / pathLength) * 100 : 100;
    const ticksElapsed = currentTick - startTick;

    return {
      phase,
      currentPosition,
      targetPosition,
      distanceRemaining,
      pathLength,
      pathTraveled,
      percentComplete: Math.floor(percentComplete),
      ticksElapsed,
      arrivalTick: arrivalTick || undefined,
    };
  }

  /**
   * Determine movement phase based on position and arrival.
   */
  determinePhase(
    currentPosition: WorkerPosition,
    targetPosition: WorkerPosition,
    isGathering: boolean,
    isReturning: boolean
  ): MovementPhase {
    if (isReturning) {
      return 'returning';
    }

    if (isGathering) {
      return 'gathering';
    }

    const hasArrived = this.detectArrival(currentPosition, targetPosition);
    if (hasArrived) {
      return 'arrived';
    }

    const distanceRemaining = this.calculateDistance(currentPosition, targetPosition);
    if (distanceRemaining > 0) {
      return 'traveling';
    }

    return 'idle';
  }
}
